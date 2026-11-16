const Interaction = require('../model/Interaction');
const UserPreferenceProfile = require('../model/UserPreferenceProfile');

// ---------------------------------------------------------------------------
// Signal weights — how much each event type moves the genre score
// ---------------------------------------------------------------------------
const EVENT_WEIGHTS = {
    watched: 3.0,       // Strongest positive signal
    inProgress: 1.5,    // User is actively watching
    planToWatch: 0.5,   // Mild interest
    like: 2.0,          // Explicit like / high rating
    click: 0.3,         // Weak signal — just curiosity
    skip: -1.5,         // Negative signal
    notPlanning: -2.0,  // Strong negative signal
};

// How much a user rating (0-10) modifies the base event weight
// - Rating <= 4 (1-2 stars): Disliked content — inverts to a negative penalty so hated genres drop
// - Rating 5-6 (3 stars): Neutral/mediocre interest
// - Rating >= 7 (4-5 stars): Strong positive affinity amplifier
const ratingMultiplier = (rating) => {
    if (rating == null || rating === 0) return 1.0;
    if (rating <= 4) return -1.0; // Inverts event weight so disliked media penalizes genre weights
    if (rating <= 6) return 0.4;  // Mild positive
    return (rating / 10) * 1.5;   // 8/10 -> 1.2x, 10/10 -> 1.5x
};

// ---------------------------------------------------------------------------
// recordInteraction
//
// Persists a single user interaction and immediately updates the
// preference profile so re-ranking reflects the latest behaviour.
// ---------------------------------------------------------------------------
const recordInteraction = async ({
    userId,
    mediaType,
    mediaId,
    mediaTitle,
    eventType,
    watchStatus,
    rating,
    genreIds,
    metadata,
}) => {
    // 1. Persist the raw interaction event
    const interaction = await Interaction.create({
        userId,
        mediaType,
        mediaId,
        mediaTitle,
        eventType,
        watchStatus: watchStatus || null,
        rating: rating || null,
        genreIds: genreIds || [],
        metadata: metadata || {},
    });

    // 2. Determine the effective signal for profile update
    let signalKey = eventType;
    if (eventType === 'watchStatus' && watchStatus) {
        signalKey = watchStatus; // use the actual status as the key
    }

    const baseWeight = EVENT_WEIGHTS[signalKey] ?? 0;
    if (baseWeight === 0 || !genreIds || genreIds.length === 0) {
        return interaction; // Nothing to update in the profile
    }

    const multiplier = ratingMultiplier(rating);
    const delta = baseWeight * multiplier;

    // 3. Upsert the preference profile for this user+mediaType
    let profile = await UserPreferenceProfile.findOne({ userId, mediaType });
    if (!profile) {
        profile = new UserPreferenceProfile({ userId, mediaType });
    }

    // Update genre weights
    for (const genreId of genreIds) {
        const existing = profile.genreWeights.find((g) => g.genreId === genreId);
        if (existing) {
            existing.score += delta;
            existing.interactionCount += 1;
        } else {
            profile.genreWeights.push({
                genreId,
                score: delta,
                interactionCount: 1,
            });
        }
    }

    // Track seen / disliked IDs for filtering
    if (!profile.seenMediaIds.includes(String(mediaId))) {
        profile.seenMediaIds.push(String(mediaId));
    }

    if (signalKey === 'notPlanning' || signalKey === 'skip') {
        if (!profile.dislikedMediaIds.includes(String(mediaId))) {
            profile.dislikedMediaIds.push(String(mediaId));
        }
    }

    profile.lastUpdated = new Date();
    await profile.save();

    return interaction;
};

// ---------------------------------------------------------------------------
// getUserProfile
//
// Returns the preference profile for a user+mediaType, creating an empty
// one if it doesn't exist yet.
// ---------------------------------------------------------------------------
const getUserProfile = async (userId, mediaType) => {
    let profile = await UserPreferenceProfile.findOne({ userId, mediaType });
    if (!profile) {
        profile = await UserPreferenceProfile.create({ userId, mediaType });
    }
    return profile;
};

// ---------------------------------------------------------------------------
// scoreCandidate
//
// Computes a personalisation score for a single candidate item.
// Higher score = better match for this user.
//
// Factors evaluated:
//   1. Preference Profile: Genre weights accumulated from user interactions
//   2. Popularity: Rewards trending and established blockbusters
//   3. Rating & Confidence: Vote average weighted by vote count
//   4. Thematic Archetypes: Rewards strong thematic motif alignment
// ---------------------------------------------------------------------------
const scoreCandidate = (candidate, genreWeightMap, mediaType) => {
    let score = 0;

    // 1. User Genre Preference overlap
    let genreIds = [];
    if (mediaType === 'anime') {
        genreIds = (candidate.genres || []).map((g) => g.mal_id);
    } else {
        genreIds = candidate.genre_ids || [];
    }

    for (const gid of genreIds) {
        score += genreWeightMap[gid] ?? 0;
    }

    // 2. Popularity Bonus (log-scaled)
    const popularity =
        mediaType === 'anime'
            ? (candidate.members ? Math.log10(candidate.members + 1) * 12 : (candidate.score || 0) * 8)
            : Number(candidate.popularity) || 0;
    const popBonus = Math.min(10.0, Math.log1p(popularity) * 1.5);
    score += popBonus;

    // 3. Rating & Confidence Bonus
    const rating = Number(candidate.vote_average || candidate.score || 0);
    const voteCount = Number(candidate.vote_count || candidate.scored_by || 0);
    const voteConfidence = Math.min(1, voteCount / 300);
    const ratingBonus = (rating / 10) * (5.0 * (0.6 + 0.4 * voteConfidence));
    score += ratingBonus;

    // 4. Thematic Archetype Alignment
    const text = `${candidate.title || candidate.name || candidate.title_english || ''} ${candidate.overview || candidate.synopsis || ''}`.toLowerCase();
    const coreThemes = [
        'zombie', 'undead', 'infection', 'virus', 'pandemic',
        'haunted house', 'ghost', 'exorcism', 'demon', 'paranormal',
        'spy', 'secret agent', 'espionage', 'assassin',
        'heist', 'bank robbery', 'con artist', 'caper',
        'slasher', 'serial killer', 'time travel', 'multiverse',
        'cyberpunk', 'artificial intelligence', 'spacecraft', 'superhero'
    ];
    if (coreThemes.some(t => text.includes(t))) {
        score += 3.0; // Thematic presence bonus
    }

    return score;
};

// ---------------------------------------------------------------------------
// rerankCandidates
//
// Takes a flat array of candidate items (from TMDB / Jikan) and returns
// the top-N items.
//
// Mandatory Year Requirement:
//   - Shows movies from year 2000 or later FIRST.
//   - Shows movies before 2000 ONLY when all post-2000 candidates have been loaded.
//
// Filtering applied before scoring:
//   1. Remove items the user has already seen
//   2. Remove items the user explicitly disliked / skipped
// ---------------------------------------------------------------------------
const rerankCandidates = (candidates, profile, mediaType, topN = 20) => {
    const seenSet = new Set(profile.seenMediaIds.map(String));
    const dislikedSet = new Set(profile.dislikedMediaIds.map(String));

    // Build a fast lookup map: genreId → score
    const genreWeightMap = {};
    for (const gw of profile.genreWeights) {
        genreWeightMap[gw.genreId] = gw.score;
    }

    const filtered = candidates.filter((c) => {
        const id = String(mediaType === 'anime' ? c.mal_id : c.id);
        return !seenSet.has(id) && !dislikedSet.has(id);
    });

    // Partition strictly into post-2000 and pre-2000
    const post2000 = [];
    const pre2000 = [];

    for (const c of filtered) {
        const rawDate = c.release_date || c.first_air_date || (c.aired?.prop?.from?.year?.toString());
        const year = rawDate ? parseInt(String(rawDate).split('-')[0], 10) : 2000;
        const scored = {
            ...c,
            _personalScore: scoreCandidate(c, genreWeightMap, mediaType),
        };

        if (year >= 2000) {
            post2000.push(scored);
        } else {
            pre2000.push(scored);
        }
    }

    // Sort descending by personalisation score within each partition
    post2000.sort((a, b) => b._personalScore - a._personalScore);
    pre2000.sort((a, b) => b._personalScore - a._personalScore);

    // Mandatory structural constraint: All post-2000 items appear first, pre-2000 only after
    const ordered = [...post2000, ...pre2000];

    // Return top-N, stripping internal fields
    return ordered.slice(0, topN).map(({ _personalScore, ...item }) => ({
        ...item,
        _score: _personalScore,
    }));
};

// ---------------------------------------------------------------------------
// getRecentInteractions
//
// Returns the N most recent interactions for a user, optionally filtered
// by mediaType. Used by the frontend to show activity history.
// ---------------------------------------------------------------------------
const getRecentInteractions = async (userId, mediaType = null, limit = 50) => {
    const query = { userId };
    if (mediaType) query.mediaType = mediaType;

    return Interaction.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
};

module.exports = {
    recordInteraction,
    getUserProfile,
    rerankCandidates,
    getRecentInteractions,
};
