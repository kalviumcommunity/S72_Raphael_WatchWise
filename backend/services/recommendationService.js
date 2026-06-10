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

// How much a user rating (0-10) amplifies the base event weight
// A rating of 10 doubles the weight; a rating of 0 halves it
const ratingMultiplier = (rating) => {
    if (rating == null || rating === 0) return 1.0;
    return 0.5 + rating / 10;
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
// Formula:
//   score = Σ(genreWeight for each genre in item) + popularityBonus
//
// The popularity bonus is a small nudge so that when two items have
// equal genre overlap, the more popular one wins.
// ---------------------------------------------------------------------------
const scoreCandidate = (candidate, genreWeightMap, mediaType) => {
    let score = 0;

    // Genre IDs differ by source:
    //   TMDB (movies/tvshows): candidate.genre_ids  → array of numbers
    //   Jikan (anime):         candidate.genres      → array of {mal_id, name}
    let genreIds = [];
    if (mediaType === 'anime') {
        genreIds = (candidate.genres || []).map((g) => g.mal_id);
    } else {
        genreIds = candidate.genre_ids || [];
    }

    for (const gid of genreIds) {
        score += genreWeightMap[gid] ?? 0;
    }

    // Small popularity bonus (TMDB: 0-1000+, Jikan: scored 0-10)
    const popularity =
        mediaType === 'anime'
            ? (candidate.score || 0) * 10 // normalise to ~0-100
            : candidate.popularity || 0;

    score += Math.log1p(popularity) * 0.1; // log-scale so it doesn't dominate

    return score;
};

// ---------------------------------------------------------------------------
// rerankCandidates
//
// Takes a flat array of candidate items (from TMDB / Jikan) and returns
// the top-N items sorted by personalisation score.
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

    const scored = filtered.map((c) => ({
        ...c,
        _personalScore: scoreCandidate(c, genreWeightMap, mediaType),
    }));

    // Sort descending by personalisation score
    scored.sort((a, b) => b._personalScore - a._personalScore);

    // Return top-N, stripping the internal score field
    return scored.slice(0, topN).map(({ _personalScore, ...item }) => ({
        ...item,
        _score: _personalScore, // expose for debugging / transparency
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
