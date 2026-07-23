import pg from "pg";

/**
 * Shared server-side Postgres pool. Reads DATABASE_URL at first use so the
 * public product keeps working with no database configured — only the routes
 * that actually query the database will fail, with a clear message.
 *
 * On Vercel, use the Neon POOLED connection string (the "-pooler" host) so
 * concurrent function invocations don't exhaust direct connections.
 */

let pool = null;

export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Add it server-side to enable database-backed features.");
  }

  if (!pool) {
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30_000
    });
  }

  return pool;
}

/**
 * Convenience query helper.
 * @param {string} text SQL with $1-style placeholders
 * @param {Array<unknown>} [params]
 * @returns {Promise<import("pg").QueryResult>}
 */
export function query(text, params) {
  return getDb().query(text, params);
}
