// scoring.js uses relative imports (./ratingScore.js, ./scoringConfig.js —
// both leaf modules with no further imports of their own) specifically so
// it's importable from plain Node scripts without alias resolution; see the
// comment at the top of that file. A normal relative import here resolves
// the whole chain natively — no @/ aliases exist anywhere in this chain to
// work around.
import { calculateBusinessHealthScore } from "../src/lib/scoring.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function pass(message) {
  console.log(`PASS ${message}`);
}

function category(breakdown, key) {
  const found = breakdown.categories.find((item) => item.key === key);
  assert(found, `Missing category ${key}`);
  return found;
}

function baseProspect(websiteAudit) {
  return {
    googlePlaces: {
      address: "123 Main Street, Riverside, CA 92501, USA",
      phone: "+1 951-555-1212",
      openingHours: { openNow: true, weekdayText: ["Monday: 8:00 AM - 5:00 PM"] },
      website: "https://example.com/",
      photosCount: 4,
      types: ["plumber"],
      claimedOrVerified: null,
      rating: 4.6,
      reviewCount: 42
    },
    websiteAudit
  };
}

function measuredWebsiteAudit(overrides = {}) {
  return {
    status: "measured",
    websiteUrl: "https://example.com/",
    reachable: { value: true, status: 200, timingMs: 320, reason: null },
    https: { servedOverHttps: true, validCertificate: true, httpRedirectsToHttps: true, httpRedirectReason: null },
    html: {
      titlePresent: true,
      titleCount: 1,
      metaDescriptionPresent: true,
      viewportPresent: true,
      h1Count: 1,
      singleH1: true,
      faviconPresent: true,
      reason: null
    },
    performance: {
      performanceScore: 86,
      largestContentfulPaintMs: 1900,
      cumulativeLayoutShift: 0.02,
      totalBlockingTimeMs: 80,
      mobileFriendly: true,
      reason: null
    },
    nap: { phoneMatches: true, addressMatches: true, reason: null },
    ...overrides
  };
}

const measured = calculateBusinessHealthScore(baseProspect(measuredWebsiteAudit()));
const technicalMeasured = category(measured, "technicalHealth");
assert(technicalMeasured.status === "measured", "Technical Health should be measured with a website audit payload.");
assert(technicalMeasured.weight > 0, "Measured Technical Health should be included in renormalized weight.");
assert(measured.availableWeight === 76, `Expected availableWeight 76 with Technical Health and Content Freshness measured, got ${measured.availableWeight}.`);
pass("measured Technical Health is included in weighted total");

const unbuilt = category(measured, "onlinePresence");
assert(unbuilt.status === "not_yet_scanned", "Online Presence should remain not_yet_scanned.");
assert(unbuilt.weight === 0, "not_yet_scanned category should be excluded from weighted total.");
assert(measured.hasScanError === false, "not_yet_scanned category should not set hasScanError.");
assert(!measured.scanErrors.includes(unbuilt.label), "not_yet_scanned category should not appear in scanErrors.");
pass("not_yet_scanned category is excluded without scan error");

const unavailableAudit = { status: "scan_unavailable", websiteUrl: "https://example.com/", reason: "Synthetic route failure." };
const unavailable = calculateBusinessHealthScore(baseProspect(unavailableAudit));
const technicalUnavailable = category(unavailable, "technicalHealth");
assert(technicalUnavailable.status === "scan_unavailable", "Technical Health should preserve scan_unavailable status.");
assert(technicalUnavailable.weight === 0, "scan_unavailable Technical Health should be excluded from weighted total.");
assert(unavailable.hasScanError === true, "scan_unavailable should set hasScanError.");
assert(unavailable.scanErrors.includes("Technical Health"), "scanErrors should include Technical Health.");
pass("scan_unavailable Technical Health is distinct and reported as provisional");

const psiSkipped = calculateBusinessHealthScore(baseProspect(measuredWebsiteAudit({
  performance: {
    performanceScore: null,
    largestContentfulPaintMs: null,
    cumulativeLayoutShift: null,
    totalBlockingTimeMs: null,
    mobileFriendly: null,
    reason: "GOOGLE_PSI_API_KEY is not set, so PageSpeed Insights was skipped."
  }
})));
const technicalPsiSkipped = category(psiSkipped, "technicalHealth");
const perfMetric = technicalPsiSkipped.metrics.find((metric) => metric.id === "performance");
assert(technicalPsiSkipped.status === "measured", "PSI skip should keep Technical Health measured.");
assert(perfMetric?.score === null, "PSI performance metric should be null/excluded when skipped.");
assert(psiSkipped.hasScanError === false, "PSI skip should not set hasScanError.");
pass("PSI skipped metrics stay measured and internally excluded");

const noWebsite = calculateBusinessHealthScore(baseProspect({
  status: "measured",
  websiteUrl: null,
  reachable: { value: false, status: null, timingMs: null, reason: "No website URL." },
  https: { servedOverHttps: false, validCertificate: null, httpRedirectsToHttps: null, httpRedirectReason: "No website URL." },
  html: {},
  performance: {},
  nap: {}
}));
const technicalNoWebsite = category(noWebsite, "technicalHealth");
const websiteFound = technicalNoWebsite.metrics.find((metric) => metric.id === "website");
assert(technicalNoWebsite.status === "measured", "No website should be a measured finding.");
assert(websiteFound?.score === 0, "No website should count as a measured negative.");
assert(noWebsite.hasScanError === false, "No website should not set hasScanError.");
pass("no website is measured negative, not scan_unavailable");

const measuredBaseWeight = 25 + 20 + 9 + 10;
assert(unavailable.availableWeight === measuredBaseWeight, `Expected availableWeight ${measuredBaseWeight} when Technical Health unavailable, got ${unavailable.availableWeight}.`);
const dataAccuracy = category(unavailable, "dataAccuracy");
const discovery = category(unavailable, "discoveryStrength");
const contentFreshness = category(unavailable, "contentFreshness");
const customerSignals = category(unavailable, "customerSignals");
assert(dataAccuracy.weight === 39.1, `Expected Data Accuracy weight 39.1, got ${dataAccuracy.weight}.`);
assert(discovery.weight === 31.3, `Expected Discovery weight 31.3, got ${discovery.weight}.`);
assert(contentFreshness.weight === 14.1, `Expected Content Freshness weight 14.1, got ${contentFreshness.weight}.`);
assert(customerSignals.weight === 15.6, `Expected Customer Signals weight 15.6, got ${customerSignals.weight}.`);
const expectedOverall = Math.round(dataAccuracy.score * 0.391 + discovery.score * 0.313 + contentFreshness.score * 0.141 + customerSignals.score * 0.156);
assert(unavailable.overallScore === expectedOverall, `Expected overall ${expectedOverall}, got ${unavailable.overallScore}.`);
pass("scan_unavailable renormalizes over measured categories only and is not scored as zero");

console.log("All scan state checks passed.");



