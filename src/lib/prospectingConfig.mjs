// Tunables for the private prospecting layer. Edit by hand.
//
// After changing prospectScoringConfig: bump weightsVersion, then run
//   node scripts/score.mjs recompute --campaign <name>
// prospect_scores is fully derived, so recompute is lossless and free.

export const prospectScoringConfig = {
  // Stamped into prospect_scores.weights_version so every row says which
  // config produced it. Bump on every tuning change.
  weightsVersion: "v1",

  // prospect_score = (weakness*w + viability*w + momentum*w) * reachability.
  // Component weights renormalize over MEASURED components only, so an
  // unmeasured component never drags the score down as a silent zero —
  // completeness on the row tells you how much was actually measured.
  componentWeights: { weakness: 0.35, viability: 0.35, momentum: 0.3 },

  viability: {
    // Sub-signal weights (renormalized over measured sub-signals).
    weights: { reviewCount: 0.35, rating: 0.35, open: 0.2, claimed: 0.1 },
    // Review count scores linearly up to this target.
    reviewCountTarget: 40,
    // rating >= 4.0 is the "can pay, customers like them" bar.
    ratingBands: [
      { min: 4.6, score: 100 },
      { min: 4.3, score: 90 },
      { min: 4.0, score: 75 },
      { min: 3.5, score: 45 },
      { min: 0, score: 15 }
    ],
    openScores: { OPERATIONAL: 100, CLOSED_TEMPORARILY: 30 }
  },

  momentum: {
    // reviewVelocity is the heaviest signal by design.
    weights: { reviewVelocity: 0.5, ownerResponds: 0.2, socialWhileSiteWeak: 0.3 },

    // Two snapshots taken close together say nothing about velocity: a
    // same-day re-scan would show "0 new reviews" and look like dead momentum.
    // Below this gap, fall back to latest-review recency instead.
    minVelocityDays: 7,
    // Reviews gained per 30 days (from consecutive scan snapshots).
    velocityBands: [
      { min: 8, score: 100 },
      { min: 4, score: 85 },
      { min: 2, score: 70 },
      { min: 1, score: 55 },
      { min: 0.01, score: 40 },
      { min: 0, score: 15 }
    ],
    // First-scan fallback: days since latest review (needs 2 snapshots for
    // real velocity).
    reviewRecencyBands: [
      { maxDays: 30, score: 90 },
      { maxDays: 60, score: 70 },
      { maxDays: 90, score: 55 },
      { maxDays: 180, score: 35 },
      { maxDays: Infinity, score: 10 }
    ],
    // Social posting while the site is broken/absent = "trying but losing
    // online" — the core momentum tell.
    socialScores: { activeWhileSiteWeak: 100, activeSiteFine: 50, dormantOnly: 30, none: 0 }
  },

  // Highest tier wins across all channels on file. Social with status
  // 'unknown' scores as dormant (conservative) until hand-verified.
  reachabilityTiers: {
    phone: 1.0,
    email: 0.9,
    form: 0.9,
    social_active: 0.85,
    social_dormant: 0.6,
    none: 0.0
  },

  disqualifiers: {
    // presence_score at/above this = site already strong; they won't buy.
    //
    // Calibrated 2026-07-23 against 17 scanned San Diego plumbers:
    //   44, 56, 59 | 75 | 85, 89, 89 | 90 90 91 92 92 93 93 96 99 100
    // The scores cluster hard from 90 up (10 of 17). Below 90 there is always
    // a concrete defect to open a conversation with — a failing HTTPS
    // redirect, no meta description, poor mobile performance. At 90+ the
    // remaining differences are cosmetic (favicon, single H1) and there is no
    // credible "your site is costing you customers" pitch.
    // Re-check this number whenever the scanner set changes: it is a property
    // of what the engine currently measures, not a universal constant.
    strongPresenceScore: 90
  },

  // A business with no automatically discoverable contact channel is normally
  // disqualified. When these viability signals are met it is instead flagged
  // 'needs_lookup': clearly a real, earning business that is simply hard to
  // reach automatically, and worth a manual search rather than a silent drop.
  needsLookup: {
    minReviewCount: 15,
    minRating: 4.0
  }
};

export const discoveryConfig = {
  // Search-circle radius per tile. Smaller = more tiles but less chance any
  // single tile hits the 60-result cap and silently truncates. 1200m is a
  // reasonable default for suburban density; drop it for dense urban cores.
  tileRadiusM: 1200,

  // Hard ceiling on billable API requests per run (all endpoints combined).
  // The run aborts cleanly when hit; resume continues from completed tiles.
  maxRequestsPerRun: 250,

  // Delay between consecutive API calls.
  rateLimitMs: 250,

  // Nearby Search page tokens take a moment to become valid server-side.
  pageTokenDelayMs: 2000,
  maxPagesPerTile: 3,

  // Default search radius when a campaign is created from a zip code.
  zipDefaultRadiusKm: 5,

  // A normalized business name seen this many times or more across the
  // businesses table is treated as a chain/franchise.
  chainNameFrequencyThreshold: 4,

  // USD per 1000 requests, used ONLY for dry-run and per-run cost estimates.
  // These drift with Google/Yelp pricing changes — verify against the current
  // price sheet when the numbers start to matter.
  costEstimatesUsdPer1000: {
    nearby_search: 32,
    place_details_contact: 20,
    place_details_full: 25,
    geocode: 5,
    psi: 0,
    yelp: 0
  },

  // Normalized substring match against business names. Lowercase, letters and
  // digits only (punctuation becomes spaces). Extend freely.
  chainNames: [
    "mcdonald", "burger king", "wendy s", "subway", "starbucks", "dunkin",
    "domino s", "pizza hut", "papa john", "little caesars", "kfc", "taco bell",
    "chick fil a", "chipotle", "popeyes", "jimmy john", "jersey mike",
    "walmart", "target", "walgreens", "cvs", "7 eleven", "dollar general",
    "autozone", "o reilly auto", "advance auto", "jiffy lube", "midas",
    "meineke", "firestone", "valvoline",
    "great clips", "supercuts", "sport clips",
    "planet fitness", "anytime fitness", "la fitness", "orangetheory",
    "the ups store", "fedex office", "h r block",
    "servpro", "roto rooter", "mr rooter", "mr handyman",
    "benjamin franklin plumbing", "one hour heating", "stanley steemer",
    "molly maid", "merry maids", "two men and a truck",
    "massage envy", "european wax center"
  ]
};

export function estimateCostUsd(requestCounts, rates = discoveryConfig.costEstimatesUsdPer1000) {
  let total = 0;
  for (const [endpoint, count] of Object.entries(requestCounts || {})) {
    total += ((rates[endpoint] || 0) * count) / 1000;
  }
  return Math.round(total * 100) / 100;
}
