# Project State

Pick-up notes for the private prospecting layer. Last updated 2026-07-23.

The **public product** is unchanged in spirit: scan one local business, produce a
public "Presence Score" report. The one public change shipped in this work was a
scoring **bug fix** (see below). Everything else is a new **private, internal-only
prospecting layer** that never touches what a business owner sees.

---

## What the private prospecting layer does

Bulk-discovers local businesses by category + geography, scores them on
**likelihood to buy** (not just weakness), and produces a ranked call sheet.

`prospect_score = weakness(35%) + viability(35%) + momentum(30%)`, multiplied by
a **reachability** factor (phone 1.0 / email·form 0.9 / active social 0.85 /
dormant social 0.6 / nothing 0.0 → drops out).

- **weakness** — how fixable their web presence is. Re-weights the SAME category
  measurements the public score uses, but leans on the website
  (technicalHealth 0.45) instead of Google-listing hygiene, because the broken
  website is what the offer sells. The public presence_score is never modified.
- **viability** — can they pay: review count, rating ≥ 4.0, open, claimed.
- **momentum** — are they trying: review velocity (needs two scans ≥ 7 days
  apart; falls back to latest-review recency), owner-responds (not yet
  measurable), social-active-while-site-weak.

Two-stage and cost-disciplined: a cheap grid-tiled discovery pass populates
`businesses` + `contact_channels`, then a deep scan runs the existing public
scan engine only on the shortlist. Dedup on `place_id` happens before any write
or any paid call, across campaigns. Every run logs per-endpoint request counts
to the `runs` table.

**Public/private separation is enforced and tested.** `src/lib/publicReport.js`
is the only serializer for owner-visible output (explicit field whitelist, no
record dumps). `tests/publicLeak.test.mjs` (run `npm test`) asserts nine private
terms never appear on any public surface — report object, share link, API
bodies/headers, prerendered HTML/RSC, and it proves no public route can import a
private module or the `pg` driver.

---

## CLI commands, in order

All server-side, run locally. They read `DATABASE_URL` + `GOOGLE_PLACES_API_KEY`
(and optionally `GOOGLE_PSI_API_KEY`, `YELP_API_KEY`) from `.env.local`.

```
# 0. one-time: create tables (also run after pulling new migrations)
npm run migrate

# 1. define a target: category + center (lat,lng) or --zip, + radius
node scripts/discover.mjs create-campaign --name "sd-plumbers-8km" \
  --category "plumber" --center "32.7157,-117.1611" --radius-km 8

# (optional) offline cost estimate before spending anything
node scripts/discover.mjs plan --campaign "sd-plumbers-8km"

# 2. discovery: grid search + dedup + pre-filter + contact lookup. SPENDS.
#    resumable with --resume <run-id>; --max-requests overrides the ceiling
node scripts/discover.mjs run --campaign "sd-plumbers-8km"

# 3. deep scan the shortlist: reuses the public scan engine. SPENDS.
#    --limit caps how many (default 20 — raise it), --rescan-days N re-scan window
node scripts/deepscan.mjs run --campaign "sd-plumbers-8km" --limit 100

# 4. score: pure derivation, NO API calls. Run freely while tuning weights.
node scripts/score.mjs recompute --campaign "sd-plumbers-8km"

# 5. inspect
node scripts/score.mjs rank --campaign "sd-plumbers-8km" --limit 20
node scripts/score.mjs needs-lookup --campaign "sd-plumbers-8km"   # unreachable-but-viable

# 6. export the call sheet to outputs/ (gitignored — it's private data)
node scripts/export-prospects.mjs --campaign "sd-plumbers-8km"
```

`recompute` deletes and rebuilds the campaign's `prospect_scores` from
`businesses`/`scans`/`contact_channels` — lossless, free, safe to run anytime.
It's how you re-score after editing any config knob below.

---

## Config knobs — all in `src/lib/prospectingConfig.mjs`

Current values (2026-07-23):

| Knob | Value | Meaning |
|---|---|---|
| `prospectScoringConfig.weightsVersion` | **v2.1** | stamped onto every score row |
| `componentWeights` | weakness .35 / viability .35 / momentum .30 | top-level blend |
| `weakness.categoryWeights` | technicalHealth .45, onlinePresence .20, contentFreshness .15, discoveryStrength .15, dataAccuracy .05 | private re-weighting; `customerSignals` deliberately excluded |
| `disqualifiers.strongPresenceScore` | **90** | high blended score half of the strong-site test |
| `disqualifiers.strongTechnicalHealth` | **90** | website half; BOTH must hold to DQ as `strong_presence` |
| `disqualifiers.weaknessFloor` | **12** | below this, DQ as `below_weakness_floor` (nothing to sell) |
| `needsLookup` | ≥15 reviews & ≥4.0 rating | unreachable business flagged for manual lookup, not dropped |
| `momentum.minVelocityDays` | 7 | snapshots closer than this fall back to review recency |
| `discoveryConfig.tileRadiusM` | 1200 | search-circle radius per tile (spacing = ×√2 ≈ 1697m) |
| `discoveryConfig.maxRequestsPerRun` | 250 | per-run billable-request ceiling; run aborts cleanly, resumable |
| `discoveryConfig.rateLimitMs` | 250 | delay between API calls |
| `discoveryConfig.chainNames` / `chainNameFrequencyThreshold` | list / 4 | chain pre-filter |
| `costEstimatesUsdPer1000` | per-endpoint | estimate-only; verify vs Google's price sheet |

Thresholds calibrated against real San Diego data — re-check `strongPresenceScore`
and `weaknessFloor` whenever the scanner set changes; they describe what the
engine currently measures, not universal constants.

---

## Campaigns run so far

Both: San Diego center `32.7157,-117.1611`, 8 km radius, weights v2.1.

| Campaign | Discovered | Scanned | Qualified | Cost |
|---|---|---|---|---|
| `sd-plumbers-8km` | 65 new (+18 from 2km run) | 79 | 39 | discovery $4.40 + scans $0.43 |
| `sd-hvac-8km` | 29 new (1 already known) | 28 | 19 | discovery $3.68 + scan $0.70 |

(There was also an earlier `sd-plumbers` 2km campaign — 18 businesses — superseded
by the 8km run.)

- **Plumbers top prospect:** SoCal Plumber San Diego — 26 reviews, 5.0★, no
  website, phone-reachable. The archetype: alive, earning, losing online.
- **HVAC** is a sparser, higher-quality pool — 9 of the top 10 have weakness > 77.
- Disqualifier mix (HVAC): 9 `strong_presence`, 10 `below_weakness_floor`,
  1 `no_contact_method`.
- **Cumulative:** 112 businesses, 124 scans, 289 contact channels,
  **~$11.84 total API spend** across all runs.

Call sheets live in `outputs/` (gitignored): `<campaign>-prospects-<date>.csv`.

---

## The public bug that shipped in this work

A business with **no working website** was scored as if the missing website were
*unmeasured* data, so its whole website-dependent weight was renormalized away
and redistributed to categories it passed — showing ~70/100 instead of the low
50s, with its single biggest gap silently excluded. Now a dead/absent site is a
**measured failure** (score 0, kept in the average). Fix was verified to move
only no-website businesses (14 of 17 with sites were byte-identical). This is the
reason the branch was merged to production.

---

## Deliberately NOT built yet

- **Daily-20 view** — no "today's top 20 to call" rollup; use
  `score.mjs rank --limit 20` per campaign for now.
- **Pipeline outreach tracking (CLI)** — BUILT 2026-10-02: `scripts/pipeline.mjs`
  (`queue` / `show` / `contact` / `refer` / `move` / `followups` / `templates`)
  drives the `pipeline` table through the funnel, logs contact attempts and
  follow-ups, and hands warm prospects to the fulfillment partner
  (`refer` prints the attributed partner form URL + copy-paste lead summary,
  marks the row `referred`). New `referred` status added in migration 0005.
  Partner specifics come from env (`PARTNER_NAME` / `PARTNER_FORM_URL` /
  `PARTNER_AM_ID`) so the repo stays partner-agnostic per the leak tests.
  No web UI — CLI-only by design, same as the rest of the private layer.
- **Real review velocity** — every momentum score is currently the
  latest-review-recency fallback because each business has only one scan. A
  **re-scan ~30 days out** (`deepscan.mjs run --rescan-days 30`) creates the
  second snapshot that turns momentum into true review velocity. This is the
  single most valuable next step.
- **owner-responds / claimed** signals — not exposed by the legacy Places API;
  they stay unmeasured and renormalize out.
- **Social dormancy verification** — social channels are captured but their
  `active`/`dormant` status is mostly `unknown` (scored conservatively as
  dormant); no automated last-post check yet.
- **No private web UI / auth** — the whole layer is CLI-only by design.

---

## Known tech debt (pre-existing, not touched here)

- PSI is **blocked in production** — PageSpeed Insights calls fail on the live
  Vercel function, so Technical Health has no real performance sub-score there
  (gracefully skipped). Confirm/fix separately.
- `src/lib/businessHealthScore.ts` — a stray TS file in a JS/JSDoc repo, used
  only by the manual-input fallback path. Convert to JS in an isolated pass.
- `.vercel/` is tracked despite being gitignored — `git rm --cached` sometime.
