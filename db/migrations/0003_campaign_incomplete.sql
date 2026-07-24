-- 0003_campaign_incomplete.sql
-- Marks a campaign whose discovery or deep scan terminated at the per-run
-- request ceiling. Such a campaign covers only part of its area / shortlist,
-- so its ranked list and export are a biased partial sample and must not be
-- presented as clean. The flag is recomputed at the end of every discovery
-- and deep-scan run (see refreshCampaignCompleteness), and a full re-run that
-- finishes under the ceiling clears it.

alter table campaigns add column incomplete boolean not null default false;
