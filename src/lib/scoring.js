import { ratingNeedsAttention, scoreReviewRating } from "@/lib/ratingScore";
import { getScoringCategories } from "@/lib/scoringConfig";

export function calculateScore(prospect) {
  const categoriesConfig = getScoringCategories(prospect);
  const categories = [
    scoreGbp(prospect, categoriesConfig),
    scoreAccuracy(prospect, categoriesConfig),
    scoreReviews(prospect, categoriesConfig),
    scoreWebsite(prospect, categoriesConfig),
    scoreOrdering(prospect, categoriesConfig),
    scoreLocalVisibility(prospect, categoriesConfig),
    scoreContact(prospect, categoriesConfig)
  ].filter(Boolean);

  return {
    total: categories.reduce((sum, category) => sum + category.points, 0),
    categories
  };
}

/**
 * @typedef {"measured" | "not_yet_scanned" | "scan_unavailable"} ScanStatus
 * @typedef {"High" | "Medium" | "Low"} IssueImpact
 * @typedef {{ id: string, label: string, value: boolean | number | null, score: number | null, note: string }} VisibilityMetric
 * @typedef {{ key: string, label: string, baseWeight: number, weight: number, status: ScanStatus, score: number | null, metrics: VisibilityMetric[] }} VisibilityCategoryScore
 * @typedef {{ id: string, category: string, title: string, impact: IssueImpact, suggestedFix: string }} VisibilityIssue
 * @typedef {{ overallScore: number | null, availableWeight: number, hasScanError: boolean, scanErrors: string[], categories: VisibilityCategoryScore[], strengths: string[], prioritizedIssues: VisibilityIssue[], suggestedFixes: string[] }} BusinessHealthScoreBreakdown
 */

// Technical Health is intentionally easy to tune as the website scanner matures.
const TECHNICAL_HEALTH_BASE_WEIGHT = 12;

const PLACES_CATEGORY_CONFIG = [
  { key: "dataAccuracy", label: "Data Accuracy & Consistency", baseWeight: 25, scanner: (prospect) => scorePlacesDataAccuracy(prospect?.googlePlaces || null) },
  { key: "discoveryStrength", label: "Discovery / Google Profile Strength", baseWeight: 20, scanner: (prospect) => scorePlacesDiscovery(prospect?.googlePlaces || null) },
  // Extension point: flip each scanner from null to a real function when that data source is implemented.
  { key: "onlinePresence", label: "Online Presence", baseWeight: 15, scanner: null },
  { key: "contentFreshness", label: "Content Freshness", baseWeight: 15, scanner: null },
  { key: "customerSignals", label: "Customer Signals", baseWeight: 10, scanner: (prospect) => scorePlacesCustomerSignals(prospect?.googlePlaces || null) },
  { key: "aiVisibility", label: "AI Visibility", baseWeight: 10, scanner: null },
  { key: "technicalHealth", label: "Technical Health", baseWeight: TECHNICAL_HEALTH_BASE_WEIGHT, scanner: (prospect) => scoreWebsiteTechnicalHealth(prospect?.websiteAudit || null) }
];

/**
 * Calculates the Google Places-backed Business Health Score.
 * Only categories populated with real Places data are measured. Unbuilt scanners
 * are marked not_yet_scanned and excluded from the weighted total; measured
 * category weights are then renormalized to 100 so the overall score is fair.
 *
 * @param {object} prospect Normalized prospect with an optional googlePlaces object.
 * @returns {BusinessHealthScoreBreakdown}
 */
export function calculateBusinessHealthScore(prospect) {
  const rawCategories = PLACES_CATEGORY_CONFIG.map((category) => {
    if (!category.scanner) {
      return notYetScanned(category, "Scanner not built yet. This category is excluded from the current Places score.");
    }

    const measured = category.scanner(prospect);
    return {
      ...category,
      ...measured,
      status: measured.status || (measured.score === null ? "not_yet_scanned" : "measured")
    };
  });
  const measuredCategories = rawCategories.filter((category) => category.status === "measured" && typeof category.score === "number");
  const availableWeight = measuredCategories.reduce((sum, category) => sum + category.baseWeight, 0);
  const categories = rawCategories.map((category) => ({
    key: category.key,
    label: category.label,
    baseWeight: category.baseWeight,
    weight: category.status === "measured" && availableWeight > 0 ? round((category.baseWeight / availableWeight) * 100, 1) : 0,
    status: category.status,
    score: category.score,
    metrics: category.metrics || []
  }));
  const overallScore = availableWeight > 0
    ? Math.round(categories.reduce((sum, category) => sum + (category.score || 0) * (category.weight / 100), 0))
    : null;
  const scanErrors = categories.filter((category) => category.status === "scan_unavailable").map((category) => category.label);
  const strengths = buildPlacesStrengths(categories);
  const prioritizedIssues = buildPlacesIssues(categories);

  return {
    overallScore,
    availableWeight,
    hasScanError: scanErrors.length > 0,
    scanErrors,
    categories,
    strengths,
    prioritizedIssues,
    suggestedFixes: prioritizedIssues.slice(0, 5).map((issue) => issue.suggestedFix)
  };
}

function scorePlacesDataAccuracy(place) {
  if (!place) return { score: null, metrics: [] };
  const metrics = [
    booleanMetric("address", "Address present", Boolean(place.address), "Customers can confirm the location or service area."),
    booleanMetric("phone", "Phone present", Boolean(place.phone), "Customers can call directly from the listing."),
    booleanMetric("hours", "Hours present", Boolean(place.openingHours?.weekdayText?.length || typeof place.openingHours?.openNow === "boolean"), "Customers can tell when the business is open.")
  ];
  return { score: averageMetricScore(metrics), metrics };
}

function scorePlacesDiscovery(place) {
  if (!place) return { score: null, metrics: [] };
  const metrics = [
    booleanMetric("website", "Website linked", Boolean(place.website), "A website link gives customers somewhere to verify details."),
    nullableBooleanMetric("photos", "Photos available", typeof place.photosCount === "number" ? place.photosCount > 0 : null, "Photos help the listing feel current and credible."),
    booleanMetric("category", "Category set", Array.isArray(place.types) && place.types.length > 0, "Google category/types help customers and Google understand the business."),
    nullableBooleanMetric("claimed", "Claimed / verified", place.claimedOrVerified, "Places API does not always expose claimed or verified status.")
  ];
  return { score: averageMetricScore(metrics), metrics };
}

function scorePlacesCustomerSignals(place) {
  if (!place) return { score: null, metrics: [] };
  const metrics = [
    numberMetric("rating", "Average rating", place.rating, scoreRating(place.rating), ratingNote(place.rating)),
    numberMetric("reviews", "Review count", place.reviewCount, scoreReviewCount(place.reviewCount), reviewCountNote(place.reviewCount))
  ];
  return { score: averageMetricScore(metrics), metrics };
}


function scoreWebsiteTechnicalHealth(audit) {
  if (!audit) return { score: null, metrics: [] };
  if (audit.status === "scan_unavailable") {
    return {
      status: "scan_unavailable",
      score: null,
      metrics: [{ id: "scan-unavailable", label: "Website scan", value: null, score: null, note: audit.reason || "This check could not run this time." }]
    };
  }
  const noWebsite = audit.websiteUrl === null;
  const metrics = noWebsite
    ? [booleanMetric("website", "Website found", false, "Google Places did not return a website URL. No website is a measured customer-facing gap.")]
    : [
        nullableBooleanMetric("reachable", "Website reachable", audit.reachable?.value ?? null, audit.reachable?.reason || "The website should load for customers without timing out."),
        nullableBooleanMetric("https", "Served over HTTPS", audit.https?.servedOverHttps ?? null, "Customers should land on a secure HTTPS version of the site."),
        nullableBooleanMetric("certificate", "Valid HTTPS response", audit.https?.validCertificate ?? null, "A valid certificate prevents browser trust warnings."),
        nullableBooleanMetric("httpRedirect", "HTTP redirects to HTTPS", audit.https?.httpRedirectsToHttps ?? null, audit.https?.httpRedirectReason || "The insecure version should forward customers to HTTPS."),
        nullableBooleanMetric("title", "Homepage title", audit.html?.titlePresent ?? null, audit.html?.reason || "A clear title helps customers and search engines understand the page."),
        nullableBooleanMetric("description", "Meta description", audit.html?.metaDescriptionPresent ?? null, audit.html?.reason || "A description gives searchers a clearer reason to click."),
        nullableBooleanMetric("viewport", "Mobile viewport", audit.html?.viewportPresent ?? null, audit.html?.reason || "Mobile viewport markup helps the site render properly on phones."),
        nullableBooleanMetric("h1", "Single H1", audit.html?.singleH1 ?? null, audit.html?.reason || "A single main heading keeps the page structure clear."),
        nullableBooleanMetric("favicon", "Favicon present", audit.html?.faviconPresent ?? null, audit.html?.reason || "A favicon is a small trust and polish signal."),
        numberMetric("performance", "Mobile performance", audit.performance?.performanceScore, audit.performance?.performanceScore, performanceNote(audit.performance?.reason)),
        nullableBooleanMetric("mobile", "Mobile usability signal", audit.performance?.mobileFriendly ?? null, performanceNote(audit.performance?.reason)),
        nullableBooleanMetric("phoneMatch", "Website phone matches Google", audit.nap?.phoneMatches ?? null, audit.nap?.reason || "The Google phone number should appear on the website."),
        nullableBooleanMetric("addressMatch", "Website address matches Google", audit.nap?.addressMatches ?? null, audit.nap?.reason || "The Google address should appear on the website when applicable.")
      ];

  return { score: averageMetricScore(metrics), metrics };
}
function notYetScanned(category, note) {
  return {
    key: category.key,
    label: category.label,
    baseWeight: category.baseWeight,
    weight: 0,
    status: "not_yet_scanned",
    score: null,
    metrics: [{ id: `${category.key}-pending`, label: "Not yet measured", value: null, score: null, note }]
  };
}

function booleanMetric(id, label, value, note) {
  return { id, label, value, score: value ? 100 : 0, note };
}

function nullableBooleanMetric(id, label, value, note) {
  return { id, label, value, score: value === null ? null : value ? 100 : 0, note };
}

function numberMetric(id, label, value, score, note) {
  return { id, label, value: typeof value === "number" ? value : null, score, note };
}

function averageMetricScore(metrics) {
  const measured = metrics.filter((metric) => typeof metric.score === "number");
  if (!measured.length) return null;
  return Math.round(measured.reduce((sum, metric) => sum + metric.score, 0) / measured.length);
}

function scoreRating(rating) {
  return scoreReviewRating(rating);
}

function ratingNote(rating) {
  const score = scoreReviewRating(rating);
  if (score === null) return "Average rating was not available from this scan.";
  return score >= 75 ? "Strong ratings help customers trust the business before they call." : "Low ratings reduce trust before a customer calls.";
}

function reviewCountNote(count) {
  const score = scoreReviewCount(count);
  if (score === null) return "Review count was not available from this scan.";
  return score >= 75 ? "Strong review volume makes the business easier to trust." : "Low review volume makes the business easier to skip.";
}

function performanceNote(reason) {
  if (!reason) return "PageSpeed Insights mobile performance score.";
  if (/blocked|pagespeedonline|google\.chrome|google_psi_api_key|api key/i.test(reason)) {
    return "Performance check unavailable from this scan.";
  }
  return reason;
}

function scoreReviewCount(count) {
  if (typeof count !== "number") return null;
  const base = clamp(count / 75, 0, 1) * 100;
  return Math.round(count < 10 ? base * 0.65 : base);
}

function buildPlacesStrengths(categories) {
  return categories
    .flatMap((category) => category.metrics
      .filter((metric) => metric.score === 100)
      .map((metric) => `${metric.label} is working.`))
    .slice(0, 8);
}

function buildPlacesIssues(categories) {
  return categories
    .flatMap((category) => category.metrics
      .filter((metric) => shouldCreatePlacesIssue(category, metric))
      .map((metric) => ({
        id: `${category.key}-${metric.id}`,
        category: category.key,
        title: `${metric.label} needs attention`,
        impact: metric.score <= 25 || category.baseWeight >= 20 ? "High" : metric.score <= 60 ? "Medium" : "Low",
        suggestedFix: suggestedFixForPlacesMetric(category.key, metric.id)
      })))
    .sort((a, b) => impactRank(b.impact) - impactRank(a.impact))
    .slice(0, 10);
}


function shouldCreatePlacesIssue(category, metric) {
  if (typeof metric.score !== "number") return false;

  if (category.key === "customerSignals" && metric.id === "rating") {
    const reviewCount = category.metrics.find((item) => item.id === "reviews")?.value ?? 0;
    return ratingNeedsAttention(metric.value, reviewCount);
  }

  return metric.score < 75;
}
function suggestedFixForPlacesMetric(categoryKey, metricId) {
  const fixes = {
    "dataAccuracy-address": "Add or correct the public address/service area on the Google listing.",
    "dataAccuracy-phone": "Add the correct public phone number so customers can call from Google.",
    "dataAccuracy-hours": "Add complete business hours, including special hours when needed.",
    "discoveryStrength-website": "Link the best current website or ordering page from the Google listing.",
    "discoveryStrength-photos": "Add recent real photos of the work, location, team, products, or menu items.",
    "discoveryStrength-category": "Set the most accurate primary category and supporting business types.",
    "discoveryStrength-claimed": "Verify whether the Google listing is claimed in Google Business Profile.",
    "customerSignals-rating": "Find and fix the patterns behind low reviews, then respond professionally.",
    "customerSignals-reviews": "Ask recent happy customers for reviews until the business clears the trust threshold.",
    "technicalHealth-website": "Add a working website URL to the Google listing so customers have somewhere to confirm details.",
    "technicalHealth-reachable": "Fix hosting or DNS so the website loads reliably for customers.",
    "technicalHealth-https": "Move the site to HTTPS so browsers show it as secure.",
    "technicalHealth-certificate": "Repair the SSL certificate so customers do not see browser trust warnings.",
    "technicalHealth-httpRedirect": "Redirect the HTTP version of the site to HTTPS.",
    "technicalHealth-title": "Add a clear homepage title that names the business and main service.",
    "technicalHealth-description": "Add a plain meta description that explains what customers can do next.",
    "technicalHealth-viewport": "Add mobile viewport markup so the website behaves correctly on phones.",
    "technicalHealth-h1": "Use one clear main heading on the homepage.",
    "technicalHealth-favicon": "Add a favicon so the site looks more legitimate in browser tabs and search surfaces.",
    "technicalHealth-performance": "Improve the mobile homepage speed by reducing heavy assets and slow scripts.",
    "technicalHealth-mobile": "Fix the mobile page setup so phone visitors can use the site easily.",
    "technicalHealth-phoneMatch": "Put the same phone number from Google on the website.",
    "technicalHealth-addressMatch": "Put the same address or service-area language from Google on the website."
  };
  return fixes[`${categoryKey}-${metricId}`] || "Review this Google listing field and fix the customer-facing gap first.";
}

function impactRank(impact) {
  return impact === "High" ? 3 : impact === "Medium" ? 2 : 1;
}

function round(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
export function bandForScore(score) {
  if (score <= 40) {
    return {
      label: "Critical",
      verdict: "Your online presence is likely costing you calls, orders, and quote requests.",
      textClass: "text-signal-red",
      badgeClass: "bg-signal-red/10 text-signal-red",
      panelClass: "border-signal-red bg-signal-red/10 text-signal-red",
      fillClass: "bg-signal-red"
    };
  }

  if (score <= 70) {
    return {
      label: "Needs Work",
      verdict: "You have enough presence to be found, but visible gaps are leaking customers.",
      textClass: "text-signal-amber",
      badgeClass: "bg-signal-amber/15 text-signal-amber",
      panelClass: "border-signal-amber bg-signal-amber/15 text-signal-amber",
      fillClass: "bg-signal-amber"
    };
  }

  return {
    label: "Strong",
    verdict: "Your digital foundation is strong, with room to keep compounding trust.",
    textClass: "text-signal-green",
    badgeClass: "bg-signal-green/10 text-signal-green",
    panelClass: "border-signal-green bg-signal-green/10 text-signal-green",
    fillClass: "bg-signal-green"
  };
}

export function formatDate(value) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function scoreGbp(prospect, categoriesConfig) {
  const config = categoriesConfig.gbp;
  const fields = [
    prospect.googleBusinessProfile.claimed,
    prospect.googleBusinessProfile.hoursListed,
    prospect.googleBusinessProfile.photosPresent,
    prospect.googleBusinessProfile.descriptionFilled,
    prospect.googleBusinessProfile.primaryCategorySet
  ];
  const points = fields.filter(Boolean).length * (config.max / fields.length);
  return categoryResult("gbp", points, config.max);
}

function scoreAccuracy(prospect, categoriesConfig) {
  const config = categoriesConfig.accuracy;
  const fields = [
    prospect.accuracy.hoursAccurate,
    prospect.accuracy.phoneAccurate,
    prospect.accuracy.addressAccurate,
    prospect.accuracy.servicesAccurate
  ];
  const points = fields.filter(Boolean).length * (config.max / fields.length);
  return categoryResult("accuracy", points, config.max);
}

function scoreReviews(prospect, categoriesConfig) {
  const config = categoriesConfig.reviews;
  const ratingScore = (scoreReviewRating(prospect.reviews.averageRating) ?? 0) / 100;
  const countScore = clamp(prospect.reviews.count / 50, 0, 1);
  const lowCountPenalty = prospect.reviews.count < 10 ? 0.68 : 1;
  const points = config.max * (ratingScore * 0.55 + countScore * 0.45) * lowCountPenalty;
  return categoryResult("reviews", points, config.max);
}

function scoreWebsite(prospect, categoriesConfig) {
  const config = categoriesConfig.website;
  const statusPoints = {
    none: 0,
    "exists-but-outdated": config.max * 0.35,
    modern: config.max * 0.55
  }[prospect.website.status];
  const points =
    statusPoints +
    (prospect.website.mobileFriendly ? config.max * 0.2 : 0) +
    (prospect.website.loadsFast ? config.max * 0.15 : 0) +
    (prospect.website.hasSsl ? config.max * 0.1 : 0);
  return categoryResult("website", points, config.max);
}

function scoreOrdering(prospect, categoriesConfig) {
  const config = categoriesConfig.ordering;
  if (!config) return null;

  const fields = [
    prospect.ordering.menuAccurate,
    prospect.ordering.deliveryAppsListed,
    prospect.ordering.deliveryItemsHavePhotos,
    prospect.ordering.onlineOrderingWorks
  ];
  const points = fields.filter(Boolean).length * (config.max / fields.length);
  return categoryResult("ordering", points, config.max);
}

function scoreLocalVisibility(prospect, categoriesConfig) {
  const config = categoriesConfig.localVisibility;
  return categoryResult(
    "localVisibility",
    prospect.localVisibility.mapsTopThree ? config.max : 0,
    config.max
  );
}

function scoreContact(prospect, categoriesConfig) {
  const config = categoriesConfig.contact;
  const fields = [prospect.contact.clickToCall, prospect.contact.quoteForm, prospect.contact.repliesFast];
  const points = fields.filter(Boolean).length * (config.max / fields.length);
  return categoryResult("contact", points, config.max);
}

function categoryResult(key, points, max) {
  return {
    key,
    points: Math.round(clamp(points, 0, max)),
    max
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
