// Tunables for the private prospecting layer. Edit by hand.
//
// After changing prospectScoringConfig: bump weightsVersion, then run
//   node scripts/score.mjs recompute --campaign <name>
// prospect_scores is fully derived, so recompute is lossless and free.

export const prospectScoringConfig = {
  // Stamped into prospect_scores.weights_version so every row says which
  // config produced it. Bump on every tuning change.
  weightsVersion: "v2.1",

  // PRIVATE re-weighting of the same category measurements the public
  // presence score is built from. The public score weights Google-listing
  // hygiene at roughly 59% and the website at roughly 16% — correct for a
  // customer-facing report, backwards for prospecting, where the broken
  // website IS the thing being sold. Weakness therefore re-weights the same
  // per-category scores rather than inverting the blended public score.
  //
  // The public presence_score is untouched by this and must stay that way.
  //
  // customerSignals is deliberately absent: review volume and rating are
  // ability-to-pay signals and already drive viability. Counting them here
  // too would double-count them.
  weakness: {
    categoryWeights: {
      technicalHealth: 0.45,
      onlinePresence: 0.2,
      contentFreshness: 0.15,
      discoveryStrength: 0.15,
      dataAccuracy: 0.05
    }
  },

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
    strongPresenceScore: 90,

    // BOTH conditions must hold to disqualify. A high blended presence score
    // on its own is not enough: measured 2026-07-23, businesses at presence
    // 81-89 included sites with no HTTPS, no title and no meta description,
    // carried there by an immaculate Google listing. Requiring the website
    // itself to be strong stops those being thrown away.
    strongTechnicalHealth: 90,

    // Independent of the two conditions above: below this much weakness there
    // is not enough wrong to build a pitch around, however well the business
    // scores on ability to pay. Reported as its own reason code so what it
    // cuts stays visible.
    //
    // Only meaningful since weakness moved to the private category weighting
    // (v2) — under v1 weakness barely varied, so a floor would have been
    // arbitrary. Observed v2 range across 79 businesses: 8 to 89.
    weaknessFloor: 12,

    // Relevance gate. Google's Nearby Search returns off-category junk that
    // carries the SAME primary type as real businesses (a fake lead-gen
    // listing stuffs `roofing_contractor` into its GBP just like a real
    // roofer), so a types check cannot separate them. The reliable signature
    // is review evidence: the junk has zero reviews, which also inflates
    // viability (with no review count or rating, "open" becomes the only
    // measured viability signal and pins it at 100). A business with no
    // reviews is neither demonstrably earning nor a real prospect. Below this
    // count it is disqualified as `off_category` at the discovery pre-filter
    // — before any Details call or deep scan — and again at scoring so
    // recompute stays consistent. Raise it to enforce a stronger
    // "established business" bar; at 1 it cuts only zero-review listings.
    minReviewCount: 1
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

// Category catalog for multi-category sweeps. Each entry maps a human label to
// a Google query: `type` uses the legacy Nearby Search type filter (tighter,
// cheaper signal); `keyword` is a free-text search for categories Google has no
// type for. `fit` rates suitability for the offer (a local business that needs
// web presence and can pay a few hundred a month); `default` marks whether the
// standard sweep includes it. Edit freely.
export const categoryCatalog = [
  // --- Home services: strongest fit. Local, need web presence, pay for leads.
  { slug: "plumber", label: "Plumbing", type: "plumber", fit: "strong", default: true },
  { slug: "hvac", label: "HVAC", keyword: "hvac", fit: "strong", default: true },
  { slug: "roofing", label: "Roofing", type: "roofing_contractor", fit: "strong", default: true },
  { slug: "electrical", label: "Electrical", type: "electrician", fit: "strong", default: true },
  { slug: "landscaping", label: "Landscaping", keyword: "landscaping", fit: "strong", default: true },
  { slug: "painting", label: "Painting", type: "painter", fit: "strong", default: true },
  { slug: "general-contractor", label: "General contracting", type: "general_contractor", fit: "strong", default: true, note: "Broad; overlaps roofing/painting/etc. heavily." },
  { slug: "locksmith", label: "Locksmith", type: "locksmith", fit: "mixed", default: true, note: "Category is polluted by national lead-gen/scam listings; expect noise." },
  { slug: "pest-control", label: "Pest control", keyword: "pest control", fit: "strong", default: true },
  { slug: "moving", label: "Moving", type: "moving_company", fit: "mixed", default: true, note: "Brokers and national franchises common; chain pre-filter helps." },
  { slug: "garage-doors", label: "Garage doors", keyword: "garage door repair", fit: "strong", default: true },
  { slug: "pool-service", label: "Pool service", keyword: "pool service", fit: "strong", default: true },

  // --- Auto: good fit except dealerships (excluded — franchised, corporate web).
  { slug: "auto-repair", label: "Auto repair", type: "car_repair", fit: "strong", default: true },
  { slug: "auto-body", label: "Auto body", keyword: "auto body shop", fit: "strong", default: true },
  { slug: "auto-detailing", label: "Auto detailing", keyword: "auto detailing", fit: "strong", default: true },
  { slug: "tires", label: "Tire shops", keyword: "tire shop", fit: "mixed", default: true, note: "Chains (Discount Tire, Big O) common; pre-filter handles them." },

  // --- Health & personal: strong payers; expect higher already-has-site rates.
  { slug: "dental", label: "Dental", type: "dentist", fit: "strong", default: true, note: "Good payers, but many already have strong sites -> higher strong_presence DQ." },
  { slug: "chiropractic", label: "Chiropractic", keyword: "chiropractor", fit: "strong", default: true },
  { slug: "med-spa", label: "Med spa", keyword: "med spa", fit: "strong", default: true },
  { slug: "salon", label: "Hair salon", type: "beauty_salon", fit: "strong", default: true },
  { slug: "barber", label: "Barber", keyword: "barber shop", fit: "mixed", default: true, note: "Very small operators; some below the pay-a-few-hundred line." },
  { slug: "gym", label: "Gym", type: "gym", fit: "mixed", default: true, note: "Franchise-heavy (Planet Fitness, Anytime); independents are the target." },
  { slug: "veterinary", label: "Veterinary", type: "veterinary_care", fit: "mixed", default: true, note: "Corporate consolidation rising; independents still good." },

  // --- Professional: good payers, but weaker fit for THIS offer.
  { slug: "law", label: "Law firms", type: "lawyer", fit: "mixed", default: true, note: "Often already have sites; strong payers when they don't." },
  { slug: "accounting", label: "Accounting", type: "accounting", fit: "mixed", default: true },
  { slug: "insurance", label: "Insurance agents", type: "insurance_agency", fit: "weak", default: false, note: "Heavily franchised (State Farm/Allstate); corporate provides the web presence." },
  { slug: "real-estate", label: "Real estate", type: "real_estate_agency", fit: "weak", default: false, note: "Agents rely on brokerage sites + Zillow; unlikely to buy a site cleanup." }
];

export function estimateCostUsd(requestCounts, rates = discoveryConfig.costEstimatesUsdPer1000) {
  let total = 0;
  for (const [endpoint, count] of Object.entries(requestCounts || {})) {
    total += ((rates[endpoint] || 0) * count) / 1000;
  }
  return Math.round(total * 100) / 100;
}
