/**
 * services/embeddingService.js
 *
 * Builds fixed-length float vectors that represent media items and user
 * preference profiles in the same vector space, enabling cosine similarity
 * search between them.
 *
 * ── Vector design ──────────────────────────────────────────────────────────
 *
 * We use a deterministic, genre-based embedding rather than a neural model.
 * This keeps the system self-contained (no external ML API) while still
 * enabling meaningful ANN search.
 *
 * Vector layout (VECTOR_DIM = 64 floats):
 *
 *   [0 .. 29]   Genre presence/weight  (30 slots, one per known genre ID)
 *   [30 .. 49]  Tag/keyword presence   (20 slots, hashed into buckets)
 *   [50]        Normalised popularity  (log-scaled, 0-1)
 *   [51]        Normalised rating      (0-1, from vote_average / score)
 *   [52 .. 63]  Reserved / zero-padded
 *
 * Genre slots are assigned by a stable mapping (GENRE_INDEX below).
 * Tags are hashed into 20 buckets using a simple djb2 hash so that
 * semantically similar tags land in nearby buckets.
 *
 * All vectors are L2-normalised before storage so that cosine distance
 * equals Euclidean distance, letting pgvector's <=> operator work correctly.
 *
 * ── Query vector ───────────────────────────────────────────────────────────
 *
 * The user's query vector is built from their UserPreferenceProfile:
 *   - Genre slots are filled with the user's normalised genre weights
 *   - Tag slots are filled with the user's normalised tag weights
 *   - Popularity / rating slots are left at 0 (we don't bias toward popular)
 * The result is L2-normalised so it lives in the same unit-sphere space.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Total vector dimensionality. Must match the pgvector column definition. */
const VECTOR_DIM = 64;

/**
 * Stable mapping from TMDB/Jikan genre ID → vector slot index (0-29).
 *
 * TMDB genre IDs: https://developer.themoviedb.org/reference/genre-movie-list
 * Jikan genre IDs (MAL): https://api.jikan.moe/v4/genres/anime
 *
 * IDs not in this map are ignored (they don't affect the vector).
 * Add new IDs here as needed — existing vectors remain valid because
 * we only append to the end of the map.
 */
const GENRE_INDEX = {
    // ── TMDB movie / TV genres ──────────────────────────────────────────
    28:    0,   // Action
    12:    1,   // Adventure
    16:    2,   // Animation
    35:    3,   // Comedy
    80:    4,   // Crime
    99:    5,   // Documentary
    18:    6,   // Drama
    10751: 7,   // Family
    14:    8,   // Fantasy
    36:    9,   // History
    27:    10,  // Horror
    10402: 11,  // Music
    9648:  12,  // Mystery
    10749: 13,  // Romance
    878:   14,  // Science Fiction
    10770: 15,  // TV Movie
    53:    16,  // Thriller
    10752: 17,  // War
    37:    18,  // Western
    10759: 19,  // Action & Adventure (TV)
    10762: 20,  // Kids (TV)
    10763: 21,  // News (TV)
    10764: 22,  // Reality (TV)
    10765: 23,  // Sci-Fi & Fantasy (TV)
    10766: 24,  // Soap (TV)
    10767: 25,  // Talk (TV)
    10768: 26,  // War & Politics (TV)
    // ── Jikan / MAL anime genres ────────────────────────────────────────
    1:     0,   // Action          (reuses slot 0 — intentional cross-type alignment)
    2:     3,   // Adventure       → Comedy slot (closest available)
    4:     3,   // Comedy
    8:     6,   // Drama
    10:    8,   // Fantasy
    14:    13,  // Romance
    24:    14,  // Sci-Fi
    37:    18,  // Supernatural → Western slot (least-used, acceptable collision)
    7:     10,  // Mystery
    36:    16,  // Slice of Life → Thriller slot
    // Slots 27-29 are reserved for future genres
};

const GENRE_SLOTS = 30;   // slots 0-29
const TAG_SLOTS   = 20;   // slots 30-49
const TAG_OFFSET  = GENRE_SLOTS;
const POP_SLOT    = 50;
const RATING_SLOT = 51;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * djb2 hash — maps a string to a non-negative integer.
 * Used to assign tag strings to one of TAG_SLOTS buckets.
 */
const djb2 = (str) => {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
        hash = hash & 0x7fffffff; // keep positive 31-bit int
    }
    return hash;
};

/** Maps a tag string to a slot index in [TAG_OFFSET, TAG_OFFSET + TAG_SLOTS). */
const tagSlot = (tag) => TAG_OFFSET + (djb2(tag.toLowerCase().trim()) % TAG_SLOTS);

/**
 * L2-normalise a Float32Array in-place.
 * If the vector is all zeros, it stays all zeros (safe no-op).
 */
const l2Normalize = (vec) => {
    let norm = 0;
    for (let i = 0; i < vec.length; i++) norm += vec[i] * vec[i];
    norm = Math.sqrt(norm);
    if (norm === 0) return vec;
    for (let i = 0; i < vec.length; i++) vec[i] /= norm;
    return vec;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * buildItemVector
 *
 * Converts a raw media item (from TMDB or Jikan) into a VECTOR_DIM-length
 * Float32Array suitable for storage in pgvector.
 *
 * @param {object} item        Raw item from TMDB or Jikan API
 * @param {'movie'|'tvshow'|'anime'} mediaType
 * @returns {Float32Array}     L2-normalised embedding vector
 */
const buildItemVector = (item, mediaType) => {
    const vec = new Float32Array(VECTOR_DIM); // initialised to 0

    // ── Genre slots ─────────────────────────────────────────────────────
    let genreIds = [];
    if (mediaType === 'anime') {
        // Jikan: genres is an array of { mal_id, name }
        genreIds = (item.genres || []).map((g) => g.mal_id);
    } else {
        // TMDB: genre_ids (search results) or genres (detail endpoint)
        genreIds = item.genre_ids
            || (item.genres || []).map((g) => g.id)
            || [];
    }

    for (const gid of genreIds) {
        const slot = GENRE_INDEX[gid];
        if (slot !== undefined) {
            vec[slot] = 1.0; // binary presence — genre is either there or not
        }
    }

    // ── Tag / keyword slots ──────────────────────────────────────────────
    // TMDB: keywords array (from /movie/{id}/keywords endpoint, if available)
    // Jikan: themes + demographics arrays
    const tags = [];
    if (mediaType === 'anime') {
        for (const t of (item.themes || [])) tags.push(t.name);
        for (const t of (item.demographics || [])) tags.push(t.name);
    } else {
        for (const t of (item.keywords || [])) {
            tags.push(typeof t === 'string' ? t : t.name || '');
        }
    }

    for (const tag of tags) {
        if (tag) vec[tagSlot(tag)] += 1.0; // accumulate — multiple tags can hit the same bucket
    }

    // ── Popularity slot ──────────────────────────────────────────────────
    // TMDB popularity: 0-1000+, log-scale to 0-1 range (log(1001) ≈ 6.9)
    // Jikan score: 0-10, divide by 10
    if (mediaType === 'anime') {
        vec[POP_SLOT] = Math.min((item.members || 0) / 2_000_000, 1.0);
    } else {
        vec[POP_SLOT] = Math.log1p(item.popularity || 0) / Math.log1p(1000);
    }

    // ── Rating slot ──────────────────────────────────────────────────────
    if (mediaType === 'anime') {
        vec[RATING_SLOT] = (item.score || 0) / 10;
    } else {
        vec[RATING_SLOT] = (item.vote_average || 0) / 10;
    }

    return l2Normalize(vec);
};

/**
 * buildQueryVector
 *
 * Converts a UserPreferenceProfile into a query vector in the same space
 * as item vectors. Used at recommendation time to find the nearest items.
 *
 * Genre weights from the profile are normalised to [0, 1] before being
 * placed into the vector, so a user who loves Action (score=15) and mildly
 * likes Comedy (score=3) will have a vector that reflects that ratio.
 *
 * @param {object} profile   UserPreferenceProfile document (plain object or Mongoose doc)
 * @returns {Float32Array}   L2-normalised query vector
 */
const buildQueryVector = (profile) => {
    const vec = new Float32Array(VECTOR_DIM);

    const weights = profile.genreWeights || [];
    if (weights.length === 0) return vec; // cold-start: zero vector → ANN returns by popularity

    // Find the max positive score for normalisation
    const maxScore = Math.max(...weights.map((w) => w.score), 1);

    for (const gw of weights) {
        const slot = GENRE_INDEX[gw.genreId];
        if (slot !== undefined && gw.score > 0) {
            // Normalise to [0, 1] so the vector stays in a comparable range to item vectors
            vec[slot] = gw.score / maxScore;
        }
        // Negative scores (disliked genres) are intentionally left at 0 —
        // filtering via dislikedMediaIds handles exclusion more precisely.
    }

    // Tag weights (if the profile ever stores them — forward-compatible)
    const tagWeights = profile.tagWeights || [];
    const maxTagScore = Math.max(...tagWeights.map((t) => t.score), 1);
    for (const tw of tagWeights) {
        if (tw.score > 0) {
            vec[tagSlot(tw.tag)] += tw.score / maxTagScore;
        }
    }

    return l2Normalize(vec);
};

/**
 * vectorToSql
 *
 * Converts a Float32Array to the string format pgvector expects:
 *   '[0.1,0.2,...,0.0]'
 */
const vectorToSql = (vec) => '[' + Array.from(vec).join(',') + ']';

/**
 * sqlToVector
 *
 * Parses a pgvector string back into a Float32Array.
 * pgvector returns vectors as strings like '[0.1,0.2,...]'.
 */
const sqlToVector = (str) => {
    const nums = str.replace(/[\[\]]/g, '').split(',').map(Number);
    return new Float32Array(nums);
};

module.exports = {
    VECTOR_DIM,
    GENRE_INDEX,
    buildItemVector,
    buildQueryVector,
    vectorToSql,
    sqlToVector,
};
