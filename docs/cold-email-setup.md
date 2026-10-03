# Cold Email Setup Playbook — Thorost Outreach

Goal: a deliverability-safe cold email machine that feeds Thorost prospects
into conversations, then into BuzzBull referrals (or Thorost cleanups).

## The stack (costs verified Oct 2026)

**Bootstrap path — $0/mo (recommended until you're sending real volume):**
You only have ~112 prospects right now. You don't need a scale tool yet.

| Piece | What | Cost |
|---|---|---|
| Inbox | Google Workspace on thorost.com, `jonathan@thorost.com` | ~$7/mo |
| Warmup | E-Warmup free-forever tier (40k+ real inbox network) or TrulyInbox free tier | $0 |
| Sending | Manual from Gmail, 15–20/day | $0 |

With personalized defect talking points per business, hand-sent emails
actually outperform automated ones at this volume. 112 prospects ÷ 20/day
= about a week of sending. Upgrade to Instantly when the prospect list is
in the thousands and manual sending can't keep up.

**Scale path — ~$54/mo (when volume justifies it):**

| Piece | What | Cost |
|---|---|---|
| Inbox | Google Workspace Business Starter on thorost.com | ~$7/mo |
| Sending + warmup | Instantly Growth plan | ~$47/mo |

Why this stack: Google Workspace inboxes have the best deliverability for
cold email. Instantly handles warmup automation, inbox rotation, reply
detection, and sequence automation in one place. (Smartlead at ~$39/mo is
the alternative if you ever scale past ~30k emails/mo — you won't need it
at the start.)

## Phase 1 — Inbox + DNS (Day 1, ~30 min, your hands)

1. Sign up for Google Workspace with your thorost.com domain. Create the
   user `hello@thorost.com`. (Use your name as the sender name — "Jonathan
   Menyon" beats a faceless brand for reply rates.)
2. In Google Admin, verify the domain and add the DNS records at your
   registrar. Google shows you the exact values; the standard set is:
   - **MX**: `ASPMX.L.GOOGLE.COM` (priority 1), plus the 4 backup
     `ALT1/ALT2.ASPMX.L.GOOGLE.COM` etc. (Google lists all 5)
   - **SPF** (TXT @): `v=spf1 include:_spf.google.com ~all`
   - **DKIM**: generate in Admin → Apps → Gmail → Authenticate email,
     add the TXT record it gives you (selector `google`)
   - **DMARC** (TXT `_dmarc`): start permissive while warming up:
     `v=DMARC1; p=none; rua=mailto:hello@thorost.com`
     Move to `p=quarantine` once aggregate reports look clean.
3. Verify with a checker (e.g. mxtoolbox.com) that SPF/DKIM/DMARC all pass.

## Phase 2 — Warmup (Days 1–21, automatic)

1. In Instantly, connect `hello@thorost.com` and turn on warmup immediately.
2. Do NOT send real campaigns during warmup. Warmup emails ramp from a
   handful/day upward on their own.
3. Keep warmup running alongside campaigns afterward — never turn it off.

## Phase 3 — List prep (while warming up, Muse does this)

1. Export the call sheet:
   `node scripts/export-prospects.mjs --campaign "sd-plumbers-8km"`
2. Reshape to Instantly's import columns:
   `firstName, lastName, company, email, website, phone, defect_1, defect_2, defect_3`
   - `defect_1..3` are already in the export — they become your
     personalized talking points per business (this is the unfair advantage:
     every email references THEIR actual gaps).
   - Drop rows with no email address. Never import unverified emails —
     bounces over ~2% hurt deliverability.
3. Start small: 100–150 prospects for the first campaign.

## Phase 4 — Launch (Day 21+)

1. Import the CSV into an Instantly campaign.
2. Paste the sequences below.
3. Sending volume: **20–30 emails/day** for the first 2 weeks, then ramp
   toward 50/day max on a single inbox. Never send on weekends.
4. Reply handling: Instantly stops the sequence on reply. You answer
   personally — the `pipeline.mjs contact/move` commands track it.

## Sending rules (2026 reality)

- Google/Yahoo bulk-sender rules: keep spam complaints under 0.3%,
  bounces under 2%. This is why list quality > list size.
- One inbox only to start. Add a second inbox (`jonathan@thorost.com`)
  only when you're consistently maxing volume.
- Every email must have a working unsubscribe path (Instantly adds this).

---

## The sequences (paste into Instantly)

Variables: `{{firstName}}` `{{company}}` `{{defect_1}}` `{{defect_2}}`

### Email 1 — Day 0
**Subject:** quick snapshot for {{company}}

Hi {{firstName}},

I noticed a few online details that may be costing {{company}} customers —
things like {{defect_1}}.

I put together a free Business Snapshot that maps exactly what's leaking
and what to fix first. Want me to send it over? Takes 2 minutes to review.

Best,
Jonathan
Thorost — thorost.com

### Email 2 — Day 3 (bump)
**Subject:** Re: quick snapshot for {{company}}

Quick bump, {{firstName}} — the snapshot for {{company}} is ready whenever
you are. The two biggest items I flagged: {{defect_1}}, and {{defect_2}}.

Worth a look?

Jonathan

### Email 3 — Day 7
**Subject:** {{company}} — last call on this

{{firstName}}, I'll close the loop on my end after this.

Most local businesses I scan are losing calls over 2–3 small fixable
things and have no idea. The snapshot shows you exactly which ones are
hitting {{company}}. Free, no pitch attached.

Want it?

Jonathan

### Email 4 — Day 14 (breakup)
**Subject:** closing the loop

No worries at all, {{firstName}}. If online stuff ever starts costing
{{company}} noticeable business, the snapshot offer stands — just reply
and I'll run a fresh one.

Good luck,
Jonathan

---

## When someone replies warm → the handoff

1. Send them the Thorost snapshot (run a fresh scan, share the link).
2. If they want the fixes done → Thorost cleanup ($497–$1,500, Stripe
   checkout is already live on thorost.com/cleanup).
3. If they want full marketing handled → partner bridge, then submit via
   your referral form and mark them `referred`:
   `node scripts/pipeline.mjs refer --campaign "sd-plumbers-8km" --business "<name>"`
