-- 0006_referred_status.sql
-- Adds the 'referred' pipeline status: the business was handed to the
-- fulfillment partner via the partner lead form. Distinct from 'won' (they
-- bought a Thorost cleanup) — 'referred' means the lead now lives in the
-- partner portal, not in this pipeline.

alter table pipeline drop constraint if exists pipeline_status_check;

alter table pipeline add constraint pipeline_status_check
  check (status in ('new', 'queued', 'needs_lookup', 'contacted', 'replied', 'meeting', 'referred', 'won', 'lost', 'disqualified'));
