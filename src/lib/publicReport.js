/**
 * The ONLY sanctioned way to serialize a report for anything a business owner
 * can see (share links today; any server-rendered report later).
 *
 * Every field is picked explicitly — there is no spread of the source object
 * anywhere in this file, so a field added to the internal audit (or a private
 * value that leaks onto it by mistake) can never ride along into a public
 * payload. tests/publicLeak.test.mjs enforces this adversarially.
 */

export function buildPublicReport(audit) {
  if (!audit) return null;

  return {
    id: audit.id ?? null,
    createdAt: audit.createdAt ?? null,
    preparerName: audit.preparerName ?? null,
    businessName: audit.businessName ?? null,
    city: audit.city ?? null,
    industry: audit.industry ?? null,
    dataSource: audit.dataSource ?? null,
    website: pickWebsite(audit.website),
    googleBusinessProfile: pickGbp(audit.googleBusinessProfile),
    accuracy: pickAccuracy(audit.accuracy),
    reviews: audit.reviews
      ? { averageRating: audit.reviews.averageRating ?? null, count: audit.reviews.count ?? null }
      : null,
    localVisibility: audit.localVisibility ? { mapsTopThree: Boolean(audit.localVisibility.mapsTopThree) } : null,
    ordering: pickOrdering(audit.ordering),
    contact: pickContact(audit.contact),
    score: pickScore(audit.score),
    businessHealthScore: pickHealthScore(audit.businessHealthScore),
    gaps: (audit.gaps || []).map((gap) => ({ id: gap.id, title: gap.title, body: gap.body }))
  };
}

function pickWebsite(website) {
  if (!website) return null;
  return {
    status: website.status ?? null,
    mobileFriendly: website.mobileFriendly ?? null,
    loadsFast: website.loadsFast ?? null,
    hasSsl: website.hasSsl ?? null
  };
}

function pickGbp(gbp) {
  if (!gbp) return null;
  return {
    claimed: gbp.claimed ?? null,
    hoursListed: gbp.hoursListed ?? null,
    photosPresent: gbp.photosPresent ?? null,
    descriptionFilled: gbp.descriptionFilled ?? null,
    primaryCategorySet: gbp.primaryCategorySet ?? null
  };
}

function pickAccuracy(accuracy) {
  if (!accuracy) return null;
  return {
    hoursAccurate: accuracy.hoursAccurate ?? null,
    phoneAccurate: accuracy.phoneAccurate ?? null,
    addressAccurate: accuracy.addressAccurate ?? null,
    servicesAccurate: accuracy.servicesAccurate ?? null
  };
}

function pickOrdering(ordering) {
  if (!ordering) return null;
  return {
    menuAccurate: ordering.menuAccurate ?? null,
    deliveryAppsListed: ordering.deliveryAppsListed ?? null,
    deliveryItemsHavePhotos: ordering.deliveryItemsHavePhotos ?? null,
    onlineOrderingWorks: ordering.onlineOrderingWorks ?? null
  };
}

function pickContact(contact) {
  if (!contact) return null;
  return {
    clickToCall: contact.clickToCall ?? null,
    quoteForm: contact.quoteForm ?? null,
    repliesFast: contact.repliesFast ?? null
  };
}

function pickScore(score) {
  if (!score) return null;
  return {
    total: score.total ?? null,
    categories: (score.categories || []).map((category) => ({
      key: category.key,
      label: category.label,
      points: category.points ?? null,
      max: category.max ?? null,
      // Places-breakdown categories reuse this list shape in ReportView.
      baseWeight: category.baseWeight ?? null,
      weight: category.weight ?? null,
      status: category.status ?? null,
      score: category.score ?? null,
      metrics: pickMetrics(category.metrics)
    })),
    breakdown: pickPlacesBreakdown(score.breakdown)
  };
}

function pickPlacesBreakdown(breakdown) {
  if (!breakdown) return null;
  return {
    overallScore: breakdown.overallScore ?? null,
    availableWeight: breakdown.availableWeight ?? null,
    hasScanError: Boolean(breakdown.hasScanError),
    scanErrors: [...(breakdown.scanErrors || [])],
    categories: (breakdown.categories || []).map((category) => ({
      key: category.key,
      label: category.label,
      baseWeight: category.baseWeight ?? null,
      weight: category.weight ?? null,
      status: category.status ?? null,
      score: category.score ?? null,
      metrics: pickMetrics(category.metrics)
    })),
    strengths: [...(breakdown.strengths || [])],
    prioritizedIssues: pickIssues(breakdown.prioritizedIssues),
    suggestedFixes: [...(breakdown.suggestedFixes || [])]
  };
}

function pickHealthScore(healthScore) {
  if (!healthScore) return null;
  if (healthScore.availableWeight !== undefined) return pickPlacesBreakdown(healthScore);
  return {
    overallScore: healthScore.overallScore ?? null,
    confidence: healthScore.confidence ?? null,
    warnings: [...(healthScore.warnings || [])],
    categories: (healthScore.categories || []).map((category) => ({
      key: category.key,
      label: category.label,
      effectiveWeight: category.effectiveWeight ?? null,
      confidence: category.confidence ?? null,
      score: category.score ?? null,
      subScores: (category.subScores || []).map((subScore) => ({
        key: subScore.key,
        label: subScore.label,
        score: subScore.score ?? null
      }))
    })),
    prioritizedIssues: pickIssues(healthScore.prioritizedIssues)
  };
}

function pickIssues(issues) {
  return (issues || []).map((issue) => ({
    id: issue.id,
    category: issue.category ?? null,
    title: issue.title,
    impact: issue.impact ?? null,
    suggestedFix: issue.suggestedFix ?? null,
    difficulty: issue.difficulty ?? null,
    timeEstimate: issue.timeEstimate ?? null,
    estimatedImpact: issue.estimatedImpact ?? null
  }));
}

function pickMetrics(metrics) {
  return (metrics || []).map((metric) => ({
    id: metric.id,
    label: metric.label,
    value: metric.value ?? null,
    score: metric.score ?? null,
    note: metric.note ?? null
  }));
}
