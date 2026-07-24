// One-off backfill: recompute campaigns.incomplete for every campaign using
// the SAME refreshCampaignCompleteness the live discovery/deep-scan paths call,
// so the backfill and the live logic cannot diverge. Safe to re-run anytime.
// Run once after migration 0003. No API calls.

import { loadEnvLocal } from "./envLocal.mjs";

loadEnvLocal();

const { getDb, refreshCampaignCompleteness } = await import("../src/lib/db.mjs");
const db = getDb();

const camps = await db.query("select id, name from campaigns order by name");
const flagged = [];
for (const c of camps.rows) {
  await refreshCampaignCompleteness(db, c.id);
  const { incomplete } = (await db.query("select incomplete from campaigns where id = $1", [c.id])).rows[0];
  if (incomplete) flagged.push(c.name);
}

console.log(`Refreshed ${camps.rows.length} campaigns; ${flagged.length} flagged incomplete:`);
flagged.forEach((name) => console.log("  " + name));
await db.end();
