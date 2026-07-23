-- 0002_needs_lookup_status.sql
-- Adds the 'needs_lookup' pipeline status: businesses with no automatically
-- discoverable contact channel whose viability signals still make them worth
-- finding by hand. Previously these were lumped into 'disqualified' and
-- disappeared. 0001_init.sql carries the same status list for fresh installs;
-- this migration brings already-migrated databases in line.

alter table pipeline drop constraint if exists pipeline_status_check;

alter table pipeline add constraint pipeline_status_check
  check (status in ('new', 'queued', 'needs_lookup', 'contacted', 'replied', 'meeting', 'won', 'lost', 'disqualified'));
