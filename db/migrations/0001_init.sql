-- 0001_init.sql
-- Core schema. Table names are generic on purpose; nothing here names a
-- product, brand, or partner. Private prospecting data lives ONLY in
-- prospect_scores / contact_channels / campaigns / pipeline / runs — never
-- as columns on businesses or scans, which back the public report.
--
-- Data lifecycle rules:
--   OBSERVED data (businesses, scans, contact_channels) cost API calls or
--   scraping to collect and are never casually deleted. scans rows are
--   immutable point-in-time measurements — history, not a cache.
--   DERIVED data (prospect_scores) can be truncated and recomputed from
--   observed data at any time with zero loss.

-- ---------------------------------------------------------------------------
-- businesses: one row per real-world business, keyed by Google place_id.
-- Only fields the PUBLIC product is allowed to know. No sales intel here.
-- ---------------------------------------------------------------------------
create table businesses (
  id             uuid primary key default gen_random_uuid(),
  place_id       text not null unique,
  name           text not null,
  address        text,
  city           text,
  postal_code    text,
  lat            double precision,
  lng            double precision,
  phone          text,
  website_url    text,
  primary_type   text,
  types          text[] not null default '{}',
  business_status text,
  rating         numeric(2,1),
  review_count   integer,
  first_seen_at  timestamptz not null default now(),
  last_seen_at   timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- scans: one row per deep scan of a business. Stores COMPUTED score output
-- (presence score + category breakdown), never raw third-party payloads.
--
-- Each row also snapshots rating / review_count / latest_review_at as
-- immutable point-in-time measurements. businesses keeps only the LATEST
-- values for display; review velocity (the heaviest momentum signal) is
-- review_count here minus review_count on the previous scan, so these
-- snapshots must never be overwritten.
-- place_id is denormalized so "previous scan for this place_id" is a single
-- index scan with no join — that query runs for every momentum calculation.
-- ---------------------------------------------------------------------------
create table scans (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references businesses(id) on delete cascade,
  place_id         text not null,
  scanned_at       timestamptz not null default now(),
  presence_score   integer check (presence_score between 0 and 100),
  score_breakdown  jsonb,
  signals          jsonb,
  rating           numeric(2,1),
  review_count     integer,
  latest_review_at timestamptz,
  source           text not null default 'google_places',
  created_at       timestamptz not null default now()
);

create index scans_business_id_scanned_at_idx on scans (business_id, scanned_at desc);
create index scans_place_id_scanned_at_idx on scans (place_id, scanned_at desc);

-- ---------------------------------------------------------------------------
-- campaigns: a targeting configuration (category + geography + filters).
-- criteria is jsonb so this can point at different offers later without
-- schema changes. Scoring weights stay in the config file, not here.
-- ---------------------------------------------------------------------------
create table campaigns (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  criteria   jsonb not null default '{}',
  status     text not null default 'active' check (status in ('active', 'paused', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- contact_channels: PRIVATE. OBSERVED contact methods per business, one row
-- per channel, keyed on place_id (not business_id) so channel intel survives
-- any businesses-row churn. Deliberately no FK: this data cost API calls and
-- scraping to collect and must never be cascade-deleted.
-- status/last_activity_at drive the reachability multiplier (active vs
-- dormant social). ALL channels found are kept, not just the best one.
-- ---------------------------------------------------------------------------
create table contact_channels (
  id               uuid primary key default gen_random_uuid(),
  place_id         text not null,
  channel_type     text not null check (channel_type in ('phone', 'email', 'form', 'social')),
  platform         text,
  value            text not null,
  status           text not null default 'unknown' check (status in ('active', 'dormant', 'invalid', 'unknown')),
  last_activity_at timestamptz,
  source           text,
  discovered_at    timestamptz not null default now(),
  last_verified_at timestamptz,
  unique (place_id, channel_type, value)
);

create index contact_channels_place_id_idx on contact_channels (place_id);

-- ---------------------------------------------------------------------------
-- prospect_scores: PRIVATE. One row per scoring pass per business per
-- campaign. This table must never be joined into anything a business owner
-- sees.
--
-- DERIVED VALUES ONLY: every column here is recomputable from businesses,
-- scans, and contact_channels. This table is safe to TRUNCATE and fully
-- recompute (e.g. after retuning weights — see weights_version) with zero
-- data loss. Never store observed data here.
-- ---------------------------------------------------------------------------
create table prospect_scores (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null references businesses(id) on delete cascade,
  campaign_id         uuid not null references campaigns(id) on delete cascade,
  scan_id             uuid references scans(id) on delete set null,
  computed_at         timestamptz not null default now(),
  weakness            numeric(5,2) check (weakness between 0 and 100),
  viability           numeric(5,2) check (viability between 0 and 100),
  momentum            numeric(5,2) check (momentum between 0 and 100),
  reachability_factor numeric(3,2) check (reachability_factor between 0 and 1),
  prospect_score      numeric(6,2) check (prospect_score between 0 and 100),
  disqualified        boolean not null default false,
  disqualify_reasons  text[] not null default '{}',
  -- Share (0-100) of scoring inputs that were actually measured. A low score
  -- with low completeness is under-observed, not necessarily a bad prospect.
  completeness        numeric(5,2) check (completeness between 0 and 100),
  signals             jsonb,
  weights_version     text,
  created_at          timestamptz not null default now()
);

create index prospect_scores_ranked_idx
  on prospect_scores (campaign_id, disqualified, prospect_score desc);
create index prospect_scores_business_id_idx on prospect_scores (business_id);

-- ---------------------------------------------------------------------------
-- pipeline: PRIVATE. Outreach state per business per campaign.
-- ---------------------------------------------------------------------------
create table pipeline (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references businesses(id) on delete cascade,
  campaign_id       uuid not null references campaigns(id) on delete cascade,
  -- 'needs_lookup': no contact channel found automatically, but the viability
  -- signals say it is worth finding one by hand. Distinct from 'disqualified'
  -- so these surface in their own list instead of being silently dropped.
  status            text not null default 'new'
                    check (status in ('new', 'queued', 'needs_lookup', 'contacted', 'replied', 'meeting', 'won', 'lost', 'disqualified')),
  notes             text,
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (business_id, campaign_id)
);

create index pipeline_campaign_status_idx on pipeline (campaign_id, status);
create index pipeline_follow_up_idx on pipeline (next_follow_up_at) where next_follow_up_at is not null;

-- ---------------------------------------------------------------------------
-- runs: PRIVATE. One row per discovery/scan/scoring run, with per-API
-- request counts so spend is visible per run. request_counts example:
--   {"places_search": 12, "place_details": 40, "psi": 8, "yelp": 8}
-- stats example: {"found": 143, "new": 87, "deduped": 56, "shortlisted": 22}
-- ---------------------------------------------------------------------------
create table runs (
  id             uuid primary key default gen_random_uuid(),
  campaign_id    uuid references campaigns(id) on delete set null,
  kind           text not null check (kind in ('discovery', 'deep_scan', 'scoring')),
  status         text not null default 'running' check (status in ('running', 'completed', 'failed')),
  started_at     timestamptz not null default now(),
  finished_at    timestamptz,
  request_counts jsonb not null default '{}',
  stats          jsonb not null default '{}',
  error          text
);

create index runs_campaign_id_started_at_idx on runs (campaign_id, started_at desc);
