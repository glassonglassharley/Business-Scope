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

/**
 * Recompute campaigns.incomplete from run history: true when the most recent
 * FINISHED discovery run, or the most recent finished deep-scan run, ended at
 * the request ceiling. Self-healing — a later full run that finishes under the
 * ceiling flips it back to false. Called at the end of every discovery and
 * deep-scan run so the flag always reflects the latest coverage.
 * @param {import("pg").Pool} db
 * @param {string} campaignId
 */
export function refreshCampaignCompleteness(db, campaignId) {
  return db.query(
    `update campaigns c set incomplete = exists (
       select 1 from runs r
       where r.campaign_id = c.id and r.kind in ('discovery', 'deep_scan')
         and r.error = 'max_requests_ceiling'
         and r.finished_at = (
           select max(r2.finished_at) from runs r2
           where r2.campaign_id = c.id and r2.kind = r.kind and r2.finished_at is not null
         )
     ) where c.id = $1`,
    [campaignId]
  );
}
