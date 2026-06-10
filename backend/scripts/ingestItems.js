/**
 * scripts/ingestItems.js
 *
 * One-time (and periodic) script that populates the pgvector media_items
 * table by fetching items from TMDB and Jikan.
 *
 * Run manually:
 *   node scripts/ingestItems.js
 *   node scripts/ingestItems.js --type movie --pages 10
 *   node scripts/ingestItems.js --type anime --pages 5
 *
 * Flags:
 *   --type   movie | tvshow | anime | all   (default: all)
 *   --pages  number of pages to fetch       (default: 20, max 500)
 *   --force  re-index items that already exist in the store
 *
 * The script is intentionally slow (rate-limited) to avoid hitting API
 * rate limits. TMDB allows ~40 req/s; Jikan allows 3 req/s.
 *
 * For production, run this as a scheduled job (e.g. weekly cron) to keep
 * the vector store fresh with newly released titles.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const axios = require('axios');
const { initSchema, upsertBatch, getItemCount, itemExists } = require('../services/vectorStore');

const TMDB_KEY   = process.env.TMDB_API_KEY;
const TMDB_BASE  = 'https://api.themoviedb.org/3';
const JIKAN_BASE = 'https://api.jikan.moe/v4';

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const getArg = (flag, defaultVal) => {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultVal;
};

const TYPE   = getArg('--type', 'all');
const PAGES  = Math.min(parseInt(getArg('--pages', '20')), 500);
const FORCE  = args.includes('--force');

// ---------------------------------------------------------------------------
// Rate-limit helper
// ---------------------------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// TMDB ingestion
// ---------------------------------------------------------------------------

/**
 * Fetches one page of popular/top-rated movies or TV shows from TMDB.
 * Retries once with a backoff on transient errors (ECONNRESET, ETIMEDOUT).
 */
const fetchTmdbPage = async (mediaType, page, attempt = 1) => {
    const endpoint = mediaType === 'movie' ? 'movie' : 'tv';
    try {
        const { data } = await axios.get(`${TMDB_BASE}/${endpoint}/popular`, {
            params: { api_key: TMDB_KEY, language: 'en-US', page },
            timeout: 12000,
            // Force TLS 1.2+ and keep-alive to avoid ECONNRESET on Windows
            httpsAgent: new (require('https').Agent)({
                keepAlive: true,
                rejectUnauthorized: true,
            }),
        });
        return data.results || [];
    } catch (err) {
        if (attempt < 3 && (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED')) {
            const backoff = attempt * 1500;
            console.warn(`[TMDB] Page ${page} failed (${err.code}), retrying in ${backoff}ms...`);
            await sleep(backoff);
            return fetchTmdbPage(mediaType, page, attempt + 1);
        }
        console.warn(`[TMDB] Page ${page} failed:`, err.message);
        return [];
    }
};

const ingestTmdb = async (mediaType) => {
    console.log(`\n[ingest] Starting TMDB ${mediaType} ingestion (${PAGES} pages)...`);
    let total = 0;

    // Brief warm-up pause — avoids ECONNRESET on the very first request
    await sleep(500);

    for (let page = 1; page <= PAGES; page++) {
        const items = await fetchTmdbPage(mediaType, page);
        if (items.length === 0) break;

        // Filter out already-indexed items unless --force
        let toIngest = items;
        if (!FORCE) {
            const checks = await Promise.all(
                items.map((item) => itemExists(mediaType, String(item.id)))
            );
            toIngest = items.filter((_, i) => !checks[i]);
        }

        if (toIngest.length > 0) {
            await upsertBatch(toIngest, mediaType);
            total += toIngest.length;
        }

        process.stdout.write(`\r  Page ${page}/${PAGES} — ${total} items indexed`);

        // TMDB rate limit: ~40 req/s — 100ms delay is safe
        await sleep(100);
    }

    const finalCount = await getItemCount(mediaType);
    console.log(`\n[ingest] ${mediaType}: done. Total in store: ${finalCount}`);
};

// ---------------------------------------------------------------------------
// Jikan ingestion
// ---------------------------------------------------------------------------

/**
 * Fetches one page of top anime from Jikan.
 * Jikan rate limit: 3 req/s (burst), 60 req/min — we use 400ms delay.
 */
const fetchJikanPage = async (page) => {
    try {
        const { data } = await axios.get(`${JIKAN_BASE}/top/anime`, {
            params: { page, limit: 25 },
            timeout: 10000,
        });
        return data.data || [];
    } catch (err) {
        // Jikan returns 429 when rate-limited — back off and retry once
        if (err.response?.status === 429) {
            console.warn('[Jikan] Rate limited — waiting 2s...');
            await sleep(2000);
            try {
                const { data } = await axios.get(`${JIKAN_BASE}/top/anime`, {
                    params: { page, limit: 25 },
                    timeout: 10000,
                });
                return data.data || [];
            } catch {
                return [];
            }
        }
        console.warn(`[Jikan] Page ${page} failed:`, err.message);
        return [];
    }
};

const ingestJikan = async () => {
    console.log(`\n[ingest] Starting Jikan anime ingestion (${PAGES} pages)...`);
    let total = 0;

    for (let page = 1; page <= PAGES; page++) {
        const items = await fetchJikanPage(page);
        if (items.length === 0) break;

        let toIngest = items;
        if (!FORCE) {
            const checks = await Promise.all(
                items.map((item) => itemExists('anime', String(item.mal_id)))
            );
            toIngest = items.filter((_, i) => !checks[i]);
        }

        if (toIngest.length > 0) {
            await upsertBatch(toIngest, 'anime');
            total += toIngest.length;
        }

        process.stdout.write(`\r  Page ${page}/${PAGES} — ${total} items indexed`);

        // Jikan rate limit: 400ms between requests
        await sleep(400);
    }

    const finalCount = await getItemCount('anime');
    console.log(`\n[ingest] anime: done. Total in store: ${finalCount}`);
};

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
(async () => {
    console.log('[ingest] Initialising pgvector schema...');
    await initSchema();

    const runMovie  = TYPE === 'all' || TYPE === 'movie';
    const runTvshow = TYPE === 'all' || TYPE === 'tvshow';
    const runAnime  = TYPE === 'all' || TYPE === 'anime';

    if (runMovie)  await ingestTmdb('movie');
    if (runTvshow) await ingestTmdb('tvshow');
    if (runAnime)  await ingestJikan();

    console.log('\n[ingest] All done.');
    process.exit(0);
})().catch((err) => {
    console.error('[ingest] Fatal error:', err);
    process.exit(1);
});
