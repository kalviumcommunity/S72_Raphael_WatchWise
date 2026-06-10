/**
 * controller/recommendationsController.js
 *
 * Handles all /api/recommendations/* routes.
 *
 * ── Candidate retrieval strategy ───────────────────────────────────────────
 *
 * getRecommendations uses a two-tier fallback:
 *
 *   1. PRIMARY  — pgvector ANN search (self-hosted, personalised)
 *      Builds a query vector from the user's UserPreferenceProfile and runs
 *      cosine ANN search against the media_items table in PostgreSQL.
 *
 *   2. FALLBACK — TMDB / Jikan API (3rd-party, seed-based)
 *      Used when pgvector is unavailable (PG not configured, table empty,
 *      or connection error). Behaviour is identical to the original system.
 *
 * After candidate retrieval, the shared ranking layer (rerankCandidates in
 * recommendationService.js) is applied in both cases — it is never bypassed.
 *
 * ── What is NOT changed ────────────────────────────────────────────────────
 *
 *   - trackInteraction   — unchanged
 *   - getPreferenceProfile — unchanged
 *   - getInteractionHistory — unchanged
 *   - recommendationService.js — unchanged
 *   - UserPreferenceProfile schema — unchanged
 *   - Interaction schema — unchanged
 *   - routes/recommendations.js — unchanged
 */

const axios = require('axios');
const User  = require('../model/user');
const {
    recordInteraction,
    getUserProfile,
    rerankCandidates,
    getRecentInteractions,
} = require('../services/recommendationService');
const vectorStore = require('../services/vectorStore');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const TMDB_BASE  = 'https://api.themoviedb.org/3';
const TMDB_KEY   = process.env.TMDB_API_KEY;
const JIKAN_BASE = 'https://api.jikan.moe/v4';

const DEFAULT_TOP_N  = 20;
const VECTOR_TOP_K   = 100; // how many ANN candidates to retrieve before re-ranking

// ---------------------------------------------------------------------------
// Fallback helpers (TMDB / Jikan) — used when pgvector is unavailable
// ---------------------------------------------------------------------------

const fetchTmdbCandidates = async (mediaType, seedId) => {
    const endpoint = mediaType === 'movie' ? 'movie' : 'tv';
    try {
        const { data } = await axios.get(
            `${TMDB_BASE}/${endpoint}/${seedId}/recommendations`,
            {
                params: { api_key: TMDB_KEY, include_adult: false, language: 'en-US', page: 1 },
                timeout: 5000,
            }
        );
        return data.results || [];
    } catch (err) {
        console.error(`[TMDB] Failed for ${endpoint}/${seedId}:`, err.message);
        return [];
    }
};

const fetchJikanCandidates = async (seedId) => {
    try {
        const { data } = await axios.get(`${JIKAN_BASE}/anime/${seedId}/recommendations`, {
            timeout: 5000,
        });
        return (data.data || []).map((r) => r.entry);
    } catch (err) {
        console.error(`[Jikan] Failed for anime/${seedId}:`, err.message);
        return [];
    }
};

const deduplicateById = (items, idField) => {
    const seen = new Set();
    return items.filter((item) => {
        const id = String(item[idField]);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
    });
};

// ---------------------------------------------------------------------------
// Primary candidate retrieval — pgvector ANN
// ---------------------------------------------------------------------------

/**
 * fetchVectorCandidates
 *
 * Builds a query vector from the user's preference profile and runs
 * cosine ANN search against the pgvector store.
 *
 * Returns null if pgvector is unavailable or the table is empty,
 * signalling the caller to fall back to TMDB/Jikan.
 *
 * @param {object} profile    UserPreferenceProfile document
 * @param {'movie'|'tvshow'|'anime'} mediaType
 * @param {string[]} excludeIds  IDs to exclude (already seen / disliked)
 * @returns {object[]|null}
 */
const fetchVectorCandidates = async (profile, mediaType, excludeIds) => {
    try {
        // Quick sanity check — if the table is empty, skip to fallback
        const count = await vectorStore.getItemCount(mediaType);
        if (count === 0) {
            console.info(`[vectorStore] No items indexed for ${mediaType} — using fallback`);
            return null;
        }

        const candidates = await vectorStore.findSimilarByProfile(
            profile,
            mediaType,
            VECTOR_TOP_K,
            excludeIds
        );

        return candidates;
    } catch (err) {
        // pgvector is not configured or the query failed — degrade gracefully
        console.warn('[vectorStore] ANN search failed, falling back to TMDB/Jikan:', err.message);
        return null;
    }
};

// ---------------------------------------------------------------------------
// POST /api/recommendations/interact
// (unchanged from original)
// ---------------------------------------------------------------------------
exports.trackInteraction = async (req, res) => {
    try {
        const {
            mediaType, mediaId, mediaTitle,
            eventType, watchStatus, rating, genreIds, metadata,
        } = req.body;

        if (!mediaType || !mediaId || !eventType) {
            return res.status(400).json({ error: 'mediaType, mediaId, and eventType are required' });
        }

        const validMediaTypes = ['movie', 'tvshow', 'anime'];
        const validEventTypes = ['click', 'like', 'skip', 'watchStatus'];

        if (!validMediaTypes.includes(mediaType)) {
            return res.status(400).json({ error: `mediaType must be one of: ${validMediaTypes.join(', ')}` });
        }
        if (!validEventTypes.includes(eventType)) {
            return res.status(400).json({ error: `eventType must be one of: ${validEventTypes.join(', ')}` });
        }

        const interaction = await recordInteraction({
            userId:      req.user.id,
            mediaType,
            mediaId:     String(mediaId),
            mediaTitle:  mediaTitle || '',
            eventType,
            watchStatus: watchStatus || null,
            rating:      rating != null ? Number(rating) : null,
            genreIds:    Array.isArray(genreIds) ? genreIds : [],
            metadata:    metadata || {},
        });

        res.status(201).json({ message: 'Interaction recorded', interactionId: interaction._id });
    } catch (err) {
        console.error('[trackInteraction] Error:', err);
        res.status(500).json({ error: 'Server error while recording interaction' });
    }
};

// ---------------------------------------------------------------------------
// GET /api/recommendations/:mediaType
//
// Flow:
//   1. Load user's watch list → build seed list + exclude list
//   2. Load UserPreferenceProfile
//   3. Try pgvector ANN search (primary)
//      └─ on failure / empty table → fall back to TMDB/Jikan (secondary)
//   4. Deduplicate candidates
//   5. rerankCandidates (shared ranking layer — unchanged)
//   6. Return top-N
// ---------------------------------------------------------------------------
exports.getRecommendations = async (req, res) => {
    try {
        const { mediaType } = req.params;
        const topN = Math.min(parseInt(req.query.topN) || DEFAULT_TOP_N, 50);

        const validMediaTypes = ['movie', 'tvshow', 'anime'];
        if (!validMediaTypes.includes(mediaType)) {
            return res.status(400).json({ error: `mediaType must be one of: ${validMediaTypes.join(', ')}` });
        }

        // ── Step 1: Load user watch list ──────────────────────────────────
        const user = await User.findById(req.user.id).lean();
        if (!user) return res.status(404).json({ error: 'User not found' });

        let seeds = [];
        let allUserIds = []; // all IDs the user has interacted with (for exclusion)

        if (mediaType === 'movie') {
            const movies = user.movies || [];
            seeds = movies
                .filter((m) => m.watchStatus === 'watched' || m.watchStatus === 'inProgress')
                .map((m) => m.movieId);
            allUserIds = movies.map((m) => m.movieId);
        } else if (mediaType === 'tvshow') {
            const shows = user.tvShows || [];
            seeds = shows
                .filter((s) => s.watchStatus === 'watched' || s.watchStatus === 'inProgress')
                .map((s) => s.showId);
            allUserIds = shows.map((s) => s.showId);
        } else {
            const animes = user.anime || [];
            seeds = animes
                .filter((a) => a.watchStatus === 'watched' || a.watchStatus === 'inProgress')
                .map((a) => a.animeId);
            allUserIds = animes.map((a) => a.animeId);
        }

        // ── Step 2: Load preference profile ──────────────────────────────
        const profile = await getUserProfile(req.user.id, mediaType);

        // Build the full exclusion list: user's own items + profile's disliked IDs
        const excludeIds = Array.from(
            new Set([...allUserIds, ...profile.dislikedMediaIds].map(String))
        );

        // ── Step 3: Candidate retrieval ───────────────────────────────────
        let allCandidates = [];
        let candidateSource = 'vector'; // for response metadata

        const vectorCandidates = await fetchVectorCandidates(profile, mediaType, excludeIds);

        if (vectorCandidates !== null) {
            // PRIMARY PATH — pgvector ANN results
            allCandidates = vectorCandidates;
        } else {
            // FALLBACK PATH — TMDB / Jikan seed-based retrieval
            candidateSource = 'fallback';
            const seedsToUse = seeds.slice(0, 10);

            if (seedsToUse.length > 0) {
                const candidateLists = await Promise.all(
                    seedsToUse.map((id) =>
                        mediaType === 'anime'
                            ? fetchJikanCandidates(id)
                            : fetchTmdbCandidates(mediaType, id)
                    )
                );
                allCandidates = candidateLists.flat();
            }
        }

        // ── Step 4: Deduplicate ───────────────────────────────────────────
        const idField = mediaType === 'anime' ? 'mal_id' : 'id';
        const uniqueCandidates = deduplicateById(allCandidates, idField);

        // ── Step 5: Re-rank (shared layer — unchanged) ────────────────────
        const personalised = rerankCandidates(uniqueCandidates, profile, mediaType, topN);

        // ── Step 6: Respond ───────────────────────────────────────────────
        res.json({
            mediaType,
            topN,
            seedCount:      seeds.length,
            candidateCount: uniqueCandidates.length,
            candidateSource,  // 'vector' | 'fallback' — useful for debugging
            results: personalised,
        });
    } catch (err) {
        console.error('[getRecommendations] Error:', err);
        res.status(500).json({ error: 'Server error while fetching recommendations' });
    }
};

// ---------------------------------------------------------------------------
// GET /api/recommendations/profile/:mediaType
// (unchanged from original)
// ---------------------------------------------------------------------------
exports.getPreferenceProfile = async (req, res) => {
    try {
        const { mediaType } = req.params;

        const validMediaTypes = ['movie', 'tvshow', 'anime'];
        if (!validMediaTypes.includes(mediaType)) {
            return res.status(400).json({ error: `mediaType must be one of: ${validMediaTypes.join(', ')}` });
        }

        const profile = await getUserProfile(req.user.id, mediaType);
        const sortedWeights = [...profile.genreWeights].sort((a, b) => b.score - a.score);

        res.json({
            mediaType,
            topGenres:     sortedWeights.slice(0, 10),
            seenCount:     profile.seenMediaIds.length,
            dislikedCount: profile.dislikedMediaIds.length,
            lastUpdated:   profile.lastUpdated,
        });
    } catch (err) {
        console.error('[getPreferenceProfile] Error:', err);
        res.status(500).json({ error: 'Server error while fetching preference profile' });
    }
};

// ---------------------------------------------------------------------------
// GET /api/recommendations/history
// (unchanged from original)
// ---------------------------------------------------------------------------
exports.getInteractionHistory = async (req, res) => {
    try {
        const { mediaType } = req.query;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);

        const validMediaTypes = ['movie', 'tvshow', 'anime'];
        if (mediaType && !validMediaTypes.includes(mediaType)) {
            return res.status(400).json({ error: `mediaType must be one of: ${validMediaTypes.join(', ')}` });
        }

        const history = await getRecentInteractions(req.user.id, mediaType || null, limit);
        res.json({ count: history.length, interactions: history });
    } catch (err) {
        console.error('[getInteractionHistory] Error:', err);
        res.status(500).json({ error: 'Server error while fetching interaction history' });
    }
};
