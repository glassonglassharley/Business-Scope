// Discovery run orchestrator (stage 1 only — never deep scans, never scores).
// Tiles the target area, paginates Nearby Search per tile, dedups on place_id
// (in-memory and against businesses) before any write or further API call,
// pre-filters obvious non-candidates, fetches contact fields for survivors,
// and logs per-endpoint request counts to runs — even when a run fails.
//
// Contact-method rule: legacy Nearby Search returns NO phone/website, so a
// business only ever counts as having a contact method after a contacts
// Details call (or later deep-scan extraction) confirmed one. Until then it
// is UNKNOWN — never assumed reachable. The pre-filter and contacts phases
// run DB-driven over every still-'new' pipeline row for the campaign, not
// just this run's finds, so an aborted run leaves no business stranded in an
// assumed state — the next run heals it.

import { getDb } from "./db.mjs";
import { planTiles } from "./discoveryGrid.mjs";
import { fetchContactDetails, geocodeZip, nearbySearchPage } from "./placesDiscovery.mjs";
import { sleep } from "./placesHttp.mjs";
import { discoveryConfig, estimateCostUsd } from "./prospectingConfig.mjs";

class RunAborted extends Error {
  constructor(reason) {
    super(reason);
    this.name = "RunAborted";
  }
}

/** Dry-run: tile plan + request/cost estimate. No API calls, no writes. */
export function planDiscovery(criteria) {
  const resolved = resolveCriteria(criteria);
  if (!resolved.center) {
    throw new Error("Dry-run planning needs center coordinates. Zip-only criteria resolve their center (one geocode request) on the first real run.");
  }

  const tiles = planTiles(resolved);
  const worstCaseSearch = tiles.length * discoveryConfig.maxPagesPerTile;
  const detailsRate = discoveryConfig.costEstimatesUsdPer1000.place_details_contact;
  return {
    criteria: resolved,
    tiles,
    estimate: {
      tileCount: tiles.length,
      nearbySearchRequests: { min: tiles.length, max: worstCaseSearch },
      nearbySearchCostUsd: {
        min: estimateCostUsd({ nearby_search: tiles.length }),
        max: estimateCostUsd({ nearby_search: worstCaseSearch })
      },
      // Nearby Search returns no contact fields, so expect ~1 contacts
      // Details call per NEW business (closed/chain pre-filtered ones are
      // skipped). Unknowable before searching; bounded by the ceiling.
      contactDetailsPerNewBusiness: 1,
      contactDetailsCostUsdPer100New: Math.round(detailsRate * 100) / 1000,
      maxRequestsPerRun: discoveryConfig.maxRequestsPerRun
    }
  };
}

/**
 * @param {{ campaignName: string, resumeRunId?: string, maxRequests?: number }} options
 */
export async function runDiscovery({ campaignName, resumeRunId, maxRequests }) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_PLACES_API_KEY is not set.");
  const db = getDb();

  const campaign = await loadCampaign(db, campaignName);
  const run = resumeRunId ? await loadRun(db, resumeRunId, campaign.id) : await createRun(db, campaign.id);

  const state = {
    runId: run.id,
    budget: maxRequests ?? discoveryConfig.maxRequestsPerRun,
    requestCounts: run.request_counts || {},
    stats: {
      tiles: {},
      resultsReturned: 0,
      duplicatesInRun: 0,
      duplicatesInDb: 0,
      newBusinesses: 0,
      contactDetailChecks: 0,
      ...run.stats
    }
  };

  // nameCounts feeds stats.topNames so recurring chains can be hand-added to
  // the config list. Tracked across everything this run saw, dupes included.
  const nameCounts = new Map();
  const seenThisRun = new Set();

  try {
    const criteria = await resolveCenter(db, campaign, state, apiKey);
    const tiles = planTiles(criteria);
    state.stats.tilesPlanned = tiles.length;

    // ---- Phase A: tiled search with pagination, dedup before any write ----
    for (const tile of tiles) {
      if (state.stats.tiles[tile.key]?.status === "done") continue; // resume: already paid for

      const tileResults = await searchTileFully(state, apiKey, tile, criteria);
      const freshResults = [];
      for (const result of tileResults) {
        if (!result.placeId) continue;
        countName(nameCounts, result.name);
        if (seenThisRun.has(result.placeId)) {
          state.stats.duplicatesInRun += 1;
          continue;
        }
        seenThisRun.add(result.placeId);
        freshResults.push(result);
      }

      await absorbResults(db, state, campaign.id, freshResults);

      state.stats.resultsReturned += tileResults.length;
      state.stats.tiles[tile.key] = {
        status: "done",
        results: tileResults.length,
        // A full 60 means the tile likely hit the cap and silently missed
        // businesses — re-run it with a smaller tileRadiusM.
        truncated: tileResults.length >= discoveryConfig.maxPagesPerTile * 20
      };
      await persistRun(db, state);
    }

    // ---- Phase B: pre-filter every still-'new' row for this campaign ------
    // Campaign-wide (not just this run's finds) so rows stranded by an
    // earlier aborted run get classified too. No API calls.
    await applyPrefilter(db, campaign.id, state);

    // ---- Phase C: contacts Details for every 'new' row with NO confirmed
    // contact data. Campaign-wide for the same healing reason. -------------
    await collectContacts(db, state, apiKey, campaign.id);

    state.stats.candidates = await countCandidates(db, campaign.id);
    state.stats.topNames = topNames(nameCounts);
    state.stats.tilesTruncated = Object.entries(state.stats.tiles)
      .filter(([, tileStat]) => tileStat.truncated)
      .map(([key]) => key);
    state.stats.estimatedCostUsd = estimateCostUsd(state.requestCounts);
    await persistRun(db, state, { status: "completed" });
    return { runId: state.runId, requestCounts: state.requestCounts, stats: state.stats };
  } catch (error) {
    // Hard requirement: counts get logged even when the run errors partway.
    state.stats.topNames = topNames(nameCounts);
    state.stats.estimatedCostUsd = estimateCostUsd(state.requestCounts);
    await persistRun(db, state, { status: "failed", error: error.message }).catch(() => {});
    if (error instanceof RunAborted) {
      return { runId: state.runId, aborted: error.message, requestCounts: state.requestCounts, stats: state.stats };
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------

async function searchTileFully(state, apiKey, tile, criteria) {
  const results = [];
  let pageToken = null;

  for (let page = 0; page < discoveryConfig.maxPagesPerTile; page += 1) {
    if (pageToken) await sleep(discoveryConfig.pageTokenDelayMs);
    spend(state, "nearby_search");
    await sleep(discoveryConfig.rateLimitMs);

    let response = await nearbySearchPage({
      apiKey,
      lat: tile.lat,
      lng: tile.lng,
      radiusM: criteria.tileRadiusM,
      keyword: criteria.keyword,
      type: criteria.type,
      pageToken
    });

    if (!response.ok && response.code === "page_token_not_ready") {
      await sleep(discoveryConfig.pageTokenDelayMs);
      spend(state, "nearby_search");
      response = await nearbySearchPage({ apiKey, pageToken });
    }
    if (!response.ok && response.code === "rate_limited") throw new RunAborted("rate_limited");
    if (!response.ok) throw new Error(`Tile ${tile.key}: ${response.message}`);

    results.push(...response.results);
    pageToken = response.nextPageToken;
    if (!pageToken) break;
  }

  return results;
}

/**
 * Dedup against businesses, insert only genuinely new rows, and give every
 * discovered business a pipeline row IMMEDIATELY (status 'new', existing
 * status never touched) so later phases and resumed runs work from the
 * database, not from in-memory state that dies with an aborted run.
 */
async function absorbResults(db, state, campaignId, freshResults) {
  if (!freshResults.length) return;

  const placeIds = freshResults.map((result) => result.placeId);
  const existing = await db.query(
    "select id, place_id from businesses where place_id = any($1)",
    [placeIds]
  );
  const existingByPlaceId = new Map(existing.rows.map((row) => [row.place_id, row.id]));

  for (const result of freshResults) {
    let businessId = existingByPlaceId.get(result.placeId);
    if (businessId) {
      state.stats.duplicatesInDb += 1;
      // Refresh observed fields we already paid for — no new row, no new call.
      await db.query(
        `update businesses set business_status = $2, rating = $3, review_count = $4, last_seen_at = now(), updated_at = now()
         where place_id = $1`,
        [result.placeId, result.businessStatus, result.rating, result.reviewCount]
      );
    } else {
      const inserted = await db.query(
        `insert into businesses (place_id, name, address, city, lat, lng, primary_type, types, business_status, rating, review_count)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         returning id`,
        [result.placeId, result.name, result.address, result.city, result.lat, result.lng,
          result.primaryType, result.types, result.businessStatus, result.rating, result.reviewCount]
      );
      businessId = inserted.rows[0].id;
      state.stats.newBusinesses += 1;
    }

    await db.query(
      `insert into pipeline (business_id, campaign_id, status)
       values ($1, $2, 'new')
       on conflict (business_id, campaign_id) do nothing`,
      [businessId, campaignId]
    );
  }
}

/** Marks obvious non-candidates from stage-1 data only. Never scores. */
async function applyPrefilter(db, campaignId, state) {
  const rows = await db.query(
    `select p.id as pipeline_id, b.name, b.business_status
     from pipeline p join businesses b on b.id = p.business_id
     where p.campaign_id = $1 and p.status = 'new'`,
    [campaignId]
  );
  if (!rows.rows.length) return;

  const frequency = await db.query(
    "select lower(name) as lname, count(*)::int as n from businesses where lower(name) = any($1) group by 1",
    [rows.rows.map((row) => row.name.toLowerCase())]
  );
  const countByName = new Map(frequency.rows.map((row) => [row.lname, row.n]));

  const prefiltered = { permanently_closed: 0, chain_or_franchise: 0 };
  for (const row of rows.rows) {
    let reason = null;
    if (row.business_status === "CLOSED_PERMANENTLY") {
      reason = "permanently_closed";
    } else {
      const normalized = normalizeName(row.name);
      const isListedChain = discoveryConfig.chainNames.some((chain) => normalized.includes(chain));
      const isFrequentName = (countByName.get(row.name.toLowerCase()) || 0) >= discoveryConfig.chainNameFrequencyThreshold;
      if (isListedChain || isFrequentName) reason = "chain_or_franchise";
    }
    if (!reason) continue;

    prefiltered[reason] += 1;
    await db.query(
      "update pipeline set status = 'disqualified', notes = $2, updated_at = now() where id = $1",
      [row.pipeline_id, reason]
    );
  }
  state.stats.prefiltered = prefiltered;
}

/**
 * Contacts Details for every 'new' row with no CONFIRMED contact data:
 * no phone on file, no website on file, no contact_channels row. All three
 * of those only ever come from a previous Details call or deep-scan
 * extraction, so "skip" always means confirmed-reachable, never assumed.
 */
async function collectContacts(db, state, apiKey, campaignId) {
  const unchecked = await db.query(
    `select p.id as pipeline_id, b.place_id
     from pipeline p join businesses b on b.id = p.business_id
     where p.campaign_id = $1 and p.status = 'new'
       and b.phone is null and b.website_url is null
       and not exists (select 1 from contact_channels cc where cc.place_id = b.place_id)`,
    [campaignId]
  );

  for (const row of unchecked.rows) {
    spend(state, "place_details_contact");
    await sleep(discoveryConfig.rateLimitMs);
    const details = await fetchContactDetails({ apiKey, placeId: row.place_id });
    if (!details.ok && details.code === "rate_limited") throw new RunAborted("rate_limited");
    if (!details.ok) throw new Error(`Contact details for ${row.place_id}: ${details.message}`);
    state.stats.contactDetailChecks += 1;

    await db.query(
      "update businesses set phone = $2, website_url = $3, updated_at = now() where place_id = $1",
      [row.place_id, details.phone, details.website]
    );
    if (details.phone) {
      await db.query(
        `insert into contact_channels (place_id, channel_type, value, source, last_verified_at)
         values ($1, 'phone', $2, 'google_places', now())
         on conflict (place_id, channel_type, value) do update set last_verified_at = now()`,
        [row.place_id, details.phone]
      );
    }
    if (!details.phone && !details.website) {
      // Confirmed absent by an actual Details call — only now is it a
      // disqualifier rather than unknown.
      await db.query(
        "update pipeline set status = 'disqualified', notes = 'no_contact_method', updated_at = now() where id = $1",
        [row.pipeline_id]
      );
      state.stats.prefiltered = state.stats.prefiltered || {};
      state.stats.prefiltered.no_contact_method = (state.stats.prefiltered.no_contact_method || 0) + 1;
    }
    await persistRun(db, state);
  }
}

// ---------------------------------------------------------------------------

function spend(state, endpoint) {
  const total = Object.values(state.requestCounts).reduce((sum, count) => sum + count, 0);
  if (total >= state.budget) throw new RunAborted("max_requests_ceiling");
  state.requestCounts[endpoint] = (state.requestCounts[endpoint] || 0) + 1;
}

function countName(nameCounts, name) {
  const normalized = normalizeName(name);
  if (!normalized) return;
  nameCounts.set(normalized, (nameCounts.get(normalized) || 0) + 1);
}

function topNames(nameCounts, limit = 15) {
  return [...nameCounts.entries()]
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

async function countCandidates(db, campaignId) {
  const result = await db.query(
    "select count(*)::int as n from pipeline where campaign_id = $1 and status = 'new'",
    [campaignId]
  );
  return result.rows[0].n;
}

async function resolveCenter(db, campaign, state, apiKey) {
  const criteria = resolveCriteria(campaign.criteria);
  if (criteria.center) return criteria;
  if (!criteria.zip) throw new Error("Campaign criteria need either center {lat,lng} or zip.");

  spend(state, "geocode");
  const geocoded = await geocodeZip({ apiKey, zip: criteria.zip });
  if (!geocoded.ok) throw new Error(geocoded.message);

  criteria.center = { lat: geocoded.lat, lng: geocoded.lng };
  // Persist so the zip is never geocoded (paid for) twice.
  await db.query(
    "update campaigns set criteria = criteria || $2::jsonb, updated_at = now() where id = $1",
    [campaign.id, JSON.stringify({ center: criteria.center })]
  );
  return criteria;
}

function resolveCriteria(raw = {}) {
  return {
    keyword: raw.keyword || raw.category || null,
    type: raw.type || null,
    zip: raw.zip || null,
    center: raw.center || null,
    radiusKm: raw.radiusKm || discoveryConfig.zipDefaultRadiusKm,
    tileRadiusM: raw.tileRadiusM || discoveryConfig.tileRadiusM
  };
}

async function loadCampaign(db, name) {
  const result = await db.query("select id, name, criteria from campaigns where name = $1", [name]);
  if (!result.rows.length) throw new Error(`No campaign named "${name}". Create it first.`);
  return result.rows[0];
}

async function createRun(db, campaignId) {
  const result = await db.query(
    "insert into runs (campaign_id, kind) values ($1, 'discovery') returning id, request_counts, stats",
    [campaignId]
  );
  return result.rows[0];
}

async function loadRun(db, runId, campaignId) {
  const result = await db.query(
    "select id, request_counts, stats from runs where id = $1 and kind = 'discovery' and campaign_id = $2",
    [runId, campaignId]
  );
  if (!result.rows.length) throw new Error(`No discovery run ${runId} for this campaign.`);
  await db.query("update runs set status = 'running', error = null where id = $1", [runId]);
  return result.rows[0];
}

async function persistRun(db, state, { status, error } = {}) {
  await db.query(
    `update runs set request_counts = $2, stats = $3,
       status = coalesce($4, status),
       error = $5,
       finished_at = case when $4 in ('completed', 'failed') then now() else finished_at end
     where id = $1`,
    [state.runId, JSON.stringify(state.requestCounts), JSON.stringify(state.stats), status || null, error || null]
  );
}

function normalizeName(name) {
  return String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
