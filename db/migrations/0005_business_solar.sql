-- 0005_business_solar.sql
-- Rooftop solar signal, one observation per business. Purely additive.
--
-- OBSERVED data, same lifecycle as phone / website_url: it cost a Static Maps
-- request plus a vision-model call to collect, so it lives on the business
-- (a rooftop is a property of the building, not of any one scan) and is only
-- ever overwritten by a newer observation. It is NOT sales intel — nothing
-- about buying likelihood is derived from it, and the public report's
-- whitelist serializer (src/lib/publicReport.js) never reads businesses rows,
-- so it cannot reach an owner-visible surface.
--
-- solar_image_url is stored WITHOUT the API key. It is the canonical Static
-- Maps request that was classified (center/zoom/size/maptype), kept so the
-- exact image can be re-fetched server-side for spot checks by appending the
-- key. A URL with the key in it must never be written here or exported.
--
-- solar_status is null until checked. 'unclear' is a real, recorded outcome
-- (multi-tenant / obstructed / low-res / ambiguous roof), distinct from
-- "not yet checked".
alter table businesses
  add column solar_status     text check (solar_status in ('has_solar', 'no_solar', 'unclear')),
  add column solar_image_url  text,
  add column solar_checked_at timestamptz,
  -- Raw classifier verdict for audit: {"confidence": 0.9, "reason": "...", "model": "..."}
  add column solar_signal     jsonb;

-- The --solar filters on rank / export / worst-scorers and the backfill
-- query ("every scanned business not yet checked") hit this column.
create index businesses_solar_status_idx on businesses (solar_status);

-- The solar backfill (scripts/solar.mjs) logs its request counts like every
-- other spending run. refreshCampaignCompleteness only looks at discovery /
-- deep_scan kinds, so a solar run can never flip a campaign's incomplete flag.
alter table runs drop constraint if exists runs_kind_check;
alter table runs add constraint runs_kind_check
  check (kind in ('discovery', 'deep_scan', 'scoring', 'solar'));
