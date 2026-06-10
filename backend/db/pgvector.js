/**
 * db/pgvector.js
 *
 * Singleton PostgreSQL connection pool for pgvector operations.
 *
 * All vector store queries go through this pool. The pool is lazy —
 * it only opens connections when the first query is made, so importing
 * this module at startup has zero cost if pgvector is never queried.
 *
 * Environment variables required:
 *   PG_HOST      PostgreSQL host          (default: localhost)
 *   PG_PORT      PostgreSQL port          (default: 5432)
 *   PG_DATABASE  Database name            (default: watchwise)
 *   PG_USER      Database user            (default: postgres)
 *   PG_PASSWORD  Database password        (required)
 *   PG_SSL       'true' to enable SSL     (default: false)
 */

const { Pool } = require('pg');

let pool = null;

/**
 * Returns the shared Pool instance, creating it on first call.
 * Throws if PG_PASSWORD is not set, so misconfiguration is caught early.
 */
const getPool = () => {
    if (pool) return pool;

    if (!process.env.PG_PASSWORD) {
        throw new Error(
            '[pgvector] PG_PASSWORD environment variable is not set. ' +
            'Add it to your .env file before using vector search.'
        );
    }

    pool = new Pool({
        host:     process.env.PG_HOST     || 'localhost',
        port:     parseInt(process.env.PG_PORT || '5432'),
        database: process.env.PG_DATABASE || 'watchwise',
        user:     process.env.PG_USER     || 'postgres',
        password: process.env.PG_PASSWORD,
        ssl:      process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false,
        // Keep a small pool — vector queries are fast but infrequent
        max: 5,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 5_000,
    });

    pool.on('error', (err) => {
        console.error('[pgvector] Unexpected pool error:', err.message);
    });

    return pool;
};

/**
 * Convenience wrapper: run a single parameterised query and return rows.
 * Acquires a client from the pool, runs the query, then releases it.
 */
const query = async (sql, params = []) => {
    const p = getPool();
    return p.query(sql, params);
};

module.exports = { getPool, query };
