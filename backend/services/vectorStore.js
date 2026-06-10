/**
 * services/vectorStore.js
 *
 * All pgvector read/write operations live here.
 * The rest of the codebase never imports pg directly.
 *
 * ── Schema (created by initSchema) ─────────────────────────────────────────
 *
 *   CREATE EXTENSION IF NOT EXISTS vector;
 *
 *   CREATE TABLE IF NOT EXISTS media_items (
 *       id          BIGSERIAL PRIMARY KEY,
 *       media_type  TEXT        NOT NULL,          -- 'movie' | 'tvshow' | 'anime'
 *       external_id TEXT        NOT NULL,          -- TMDB id or MAL id (as string)
 *       title       TEXT        NOT NULL DEFAULT '',
 *       embedding   vector(64)  NOT NULL,          -- L2-normalised genre+tag vector
 *       metadata    JSONB       NOT NULL DEFAULT '{}',
 *       updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *       UNIQUE (media_type, external_id)
 *   );
 *
 *   -- IVFFlat index for fast ANN search (cosine distance)
 *   -- lists=100 is a good default for up to ~1M rows.
 *   -- Rebuild with more lists if the table grows significantly.
 *   CREATE INDEX IF NOT EXISTS media_items_embedding_idx
 *       ON media_items
 *       USING ivfflat (embedding vector_cosine_ops)
 *       WITH (lists = 100);
 *
 * ── Cosine distance vs cosine similarity ───────────────────────────────────
 *
 * pgvector's <=> operator returns cosine DISTANCE (1 - similarity).
 * Lower distance = more similar. We ORDER BY distance ASC.
 *
 * Because all vectors are L2-normalised in embeddingService, cosine distance
 * equals Euclidean distance, so the IVFFlat index (which uses L2 internally)
 * gives correct results for cosine queries.
 */

const { query } = require('../db/pgvector');
const { buildItemVector, buildQueryVector, vectorToSql, VECTOR_DIM } = require('./embeddingService');

// ---------------------------------------------------------------------------
// Schema initialisation
// ---------------------------------------------------------------------------

/**
 * initSchema
 *
 * Creates the pgvector extension, the media_items table, and the IVFFlat
 * index if they don't already exist. Safe to call on every server start.
 *
 * Call this once from server.js after the PG pool is ready.
 */
const initSchema = async () => {
    try {
        // Enable the pgvector extension (requires superuser or rds_superuser on RDS)
        await query('CREATE EXTENSION IF NOT EXISTS vector');

        // Main item table
        await query(`
            CREATE TABLE IF NOT EXISTS media_items (
                id          BIGSERIAL PRIMARY KEY,
                media_type  TEXT        NOT NULL,
                external_id TEXT        NOT NULL,
                title       TEXT        NOT NULL DEFAULT '',
                embedding   vector(${VECTOR_DIM}) NOT NULL,
                metadata    JSONB       NOT NULL DEFAULT '{}',
                updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE (media_type, external_id)
            )
        `);

        // IVFFlat ANN index — cosine distance
        // lists=10 is appropriate for tables up to ~10k rows.
        // Increase to 100 once you have 50k+ items (run: REINDEX INDEX media_items_embedding_idx).
        // pgvector falls back to exact scan automatically for very small tables.
        await query(`
            CREATE INDEX IF NOT EXISTS media_items_embedding_idx
                ON media_items
                USING ivfflat (embedding vector_cosine_ops)
                WITH (lists = 10)
        `);

        console.log('[vectorStore] Schema initialised successfully');
    } catch (err) {
        // Non-fatal on startup — the app still works without vector search
        // (the controller falls back to TMDB/Jikan if pgvector is unavailable)
        console.warn('[vectorStore] Schema init failed (pgvector may not be installed):', err.message);
    }
};

// ---------------------------------------------------------------------------
// Upsert
// ---------------------------------------------------------------------------

/**
 * upsertItem
 *
 * Inserts or updates a single media item in the vector store.
 * The embedding is built from the raw item object using embeddingService.
 *
 * @param {object} item        Raw item from TMDB or Jikan
 * @param {'movie'|'tvshow'|'anime'} mediaType
 * @param {object} [extraMeta] Additional metadata to store alongside the item
 */
const upsertItem = async (item, mediaType, extraMeta = {}) => {
    const externalId = String(mediaType === 'anime' ? item.mal_id : item.id);
    const title = item.title || item.name || item.title_english || '';

    const vec = buildItemVector(item, mediaType);
    const embeddingStr = vectorToSql(vec);

    const metadata = {
        poster_path:    item.poster_path || item.images?.jpg?.large_image_url || null,
        vote_average:   item.vote_average || item.score || null,
        popularity:     item.popularity || item.members || null,
        genre_ids:      mediaType === 'anime'
                            ? (item.genres || []).map((g) => g.mal_id)
                            : (item.genre_ids || (item.genres || []).map((g) => g.id)),
        ...extraMeta,
    };

    await query(
        `INSERT INTO media_items (media_type, external_id, title, embedding, metadata, updated_at)
         VALUES ($1, $2, $3, $4::vector, $5, NOW())
         ON CONFLICT (media_type, external_id)
         DO UPDATE SET
             title      = EXCLUDED.title,
             embedding  = EXCLUDED.embedding,
             metadata   = EXCLUDED.metadata,
             updated_at = NOW()`,
        [mediaType, externalId, title, embeddingStr, JSON.stringify(metadata)]
    );
};

/**
 * upsertBatch
 *
 * Upserts multiple items in a single transaction.
 * More efficient than calling upsertItem in a loop for large ingestion jobs.
 *
 * @param {object[]} items
 * @param {'movie'|'tvshow'|'anime'} mediaType
 */
const upsertBatch = async (items, mediaType) => {
    const { getPool } = require('../db/pgvector');
    const client = await getPool().connect();

    try {
        await client.query('BEGIN');

        for (const item of items) {
            const externalId = String(mediaType === 'anime' ? item.mal_id : item.id);
            const title = item.title || item.name || item.title_english || '';
            const vec = buildItemVector(item, mediaType);
            const embeddingStr = vectorToSql(vec);
            const metadata = {
                poster_path:  item.poster_path || item.images?.jpg?.large_image_url || null,
                vote_average: item.vote_average || item.score || null,
                popularity:   item.popularity || item.members || null,
                genre_ids:    mediaType === 'anime'
                                  ? (item.genres || []).map((g) => g.mal_id)
                                  : (item.genre_ids || (item.genres || []).map((g) => g.id)),
            };

            await client.query(
                `INSERT INTO media_items (media_type, external_id, title, embedding, metadata, updated_at)
                 VALUES ($1, $2, $3, $4::vector, $5, NOW())
                 ON CONFLICT (media_type, external_id)
                 DO UPDATE SET
                     title      = EXCLUDED.title,
                     embedding  = EXCLUDED.embedding,
                     metadata   = EXCLUDED.metadata,
                     updated_at = NOW()`,
                [mediaType, externalId, title, embeddingStr, JSON.stringify(metadata)]
            );
        }

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

// ---------------------------------------------------------------------------
// ANN search
// ---------------------------------------------------------------------------

/**
 * findSimilar
 *
 * Runs an Approximate Nearest Neighbor search using cosine distance.
 * Returns the top-K most similar items to the given query vector.
 *
 * The results are shaped to match the format that rerankCandidates expects:
 *   - movies/tvshows: { id, title, genre_ids, popularity, vote_average, poster_path, ... }
 *   - anime:          { mal_id, title, genres, score, members, images, ... }
 *
 * @param {Float32Array} queryVector   L2-normalised query vector
 * @param {'movie'|'tvshow'|'anime'} mediaType
 * @param {number} topK               Number of candidates to return (default 50)
 * @param {string[]} excludeIds       External IDs to exclude from results
 * @returns {object[]}                Array of candidate items
 */
const findSimilar = async (queryVector, mediaType, topK = 50, excludeIds = []) => {
    const embeddingStr = vectorToSql(queryVector);

    // Build the exclusion clause dynamically
    // We pass excluded IDs as a Postgres array literal to avoid N parameters
    let excludeClause = '';
    let params = [embeddingStr, mediaType, topK];

    if (excludeIds.length > 0) {
        // $4 = array of strings
        excludeClause = 'AND external_id != ALL($4::text[])';
        params.push(excludeIds);
    }

    const sql = `
        SELECT
            external_id,
            title,
            metadata,
            embedding <=> $1::vector AS distance
        FROM media_items
        WHERE media_type = $2
        ${excludeClause}
        ORDER BY distance ASC
        LIMIT $3
    `;

    const { rows } = await query(sql, params);

    // Reshape rows into the format rerankCandidates expects
    return rows.map((row) => {
        const meta = row.metadata || {};
        const dist = parseFloat(row.distance);

        if (mediaType === 'anime') {
            return {
                mal_id:   parseInt(row.external_id),
                title:    row.title,
                genres:   (meta.genre_ids || []).map((id) => ({ mal_id: id })),
                score:    meta.vote_average || 0,
                members:  meta.popularity || 0,
                images:   meta.poster_path
                              ? { jpg: { large_image_url: meta.poster_path } }
                              : { jpg: { large_image_url: null } },
                // Attach distance for optional downstream use
                _vectorDistance: dist,
            };
        } else {
            return {
                id:           parseInt(row.external_id),
                title:        row.title,
                name:         row.title, // TV shows use 'name'
                genre_ids:    meta.genre_ids || [],
                popularity:   meta.popularity || 0,
                vote_average: meta.vote_average || 0,
                poster_path:  meta.poster_path || null,
                _vectorDistance: dist,
            };
        }
    });
};

/**
 * findSimilarByProfile
 *
 * High-level convenience function used by the recommendation controller.
 * Builds the query vector from a UserPreferenceProfile and runs findSimilar.
 *
 * @param {object} profile     UserPreferenceProfile document
 * @param {'movie'|'tvshow'|'anime'} mediaType
 * @param {number} topK
 * @param {string[]} excludeIds
 * @returns {object[]}
 */
const findSimilarByProfile = async (profile, mediaType, topK = 50, excludeIds = []) => {
    const queryVector = buildQueryVector(profile);
    return findSimilar(queryVector, mediaType, topK, excludeIds);
};

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/**
 * getItemCount
 *
 * Returns the number of items in the store for a given media type.
 * Useful for health checks and the ingest script.
 */
const getItemCount = async (mediaType) => {
    const { rows } = await query(
        'SELECT COUNT(*) AS count FROM media_items WHERE media_type = $1',
        [mediaType]
    );
    return parseInt(rows[0].count);
};

/**
 * itemExists
 *
 * Returns true if an item with the given external_id already exists.
 * Used by the ingest script to skip already-indexed items.
 */
const itemExists = async (mediaType, externalId) => {
    const { rows } = await query(
        'SELECT 1 FROM media_items WHERE media_type = $1 AND external_id = $2 LIMIT 1',
        [mediaType, String(externalId)]
    );
    return rows.length > 0;
};

module.exports = {
    initSchema,
    upsertItem,
    upsertBatch,
    findSimilar,
    findSimilarByProfile,
    getItemCount,
    itemExists,
};
