-- 0004_operator_log.sql
-- PRIVATE. The operator's own decision log: what the human decided about a
-- business and whether it was handed off. Purely additive — this migration
-- only CREATEs; it never alters or drops an existing table, so every row and
-- every existing query is untouched and code that predates this table keeps
-- working unchanged.
--
-- Deliberately NOT the pipeline table. `pipeline` is machine-owned: the
-- discovery run writes 'new' / 'needs_lookup' / 'disqualified' into it
-- automatically for every business it sees, and its status list is a full
-- sales funnel. Hand-entered decisions must not sit in the path of a process
-- that rewrites rows on every run, so they live here instead.
--
-- Keyed on place_id, not on business_id and not on (business_id, campaign_id):
--   * No FK, same reasoning as contact_channels — this is hand-entered data
--     that cost human judgement to produce and must never be cascade-deleted
--     by churn in the businesses table.
--   * place_id alone (not per-campaign) because a verdict is a decision about
--     a BUSINESS. A business scored in two campaigns appears twice in the
--     workspace list; both rows must show the same decision rather than
--     drifting apart.
-- place_id is `not null unique` on businesses, so a left join from that table
-- to this one matches at most one row and can never fan out a result set.
--
-- handoff_outcome is a MANUAL pointer at BuzzBull's portal, which is the
-- source of truth for anything downstream of the handoff. Nothing syncs it
-- and nothing may auto-populate it. Likewise operator_verdict: it is set by
-- explicit human selection only and must never be derived from
-- presence_score, prospect_score, weakness, or any other computed signal.
create table operator_log (
  place_id              text primary key,

  -- Manual selection only. Never derived from any score.
  operator_verdict      text not null default 'unreviewed'
                        check (operator_verdict in ('unreviewed', 'buzzbull', 'inhouse', 'skip')),

  -- Dates, not timestamps: the operator records the day something happened,
  -- and a day is the honest precision for hand-entered recall.
  contacted_at          date,
  buzzbull_submitted_at date,

  buzzbull_link         text default 'https://marketing.buzzbullmarketing.com/book-now?am_id=jonathan3037',

  -- Hand-copied from the BuzzBull portal. Not synced, not integrated.
  handoff_outcome       text not null default 'pending'
                        check (handoff_outcome in ('pending', 'clicked', 'lead', 'customer', 'lost')),

  operator_notes        text,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Supports the "Needs decision" quick filter (operator_verdict = 'unreviewed')
-- and the verdict filter generally.
create index operator_log_verdict_idx on operator_log (operator_verdict);
