import { calculateBusinessHealthScore as calculateManualBusinessHealthScore } from "@/lib/businessHealthScore";
import { generateGaps } from "@/lib/gaps";
import { getProspectData } from "@/lib/prospectData";
import { calculateBusinessHealthScore as calculatePlacesBusinessHealthScore, calculateScore } from "@/lib/scoring";

export function buildAudit(formData) {
  const prospect = getProspectData(formData.businessName, formData.city, formData.industry, formData);
  const legacyScore = calculateScore(prospect);
  const placesScoreBreakdown = prospect.dataSource === "google_places" ? calculatePlacesBusinessHealthScore(prospect) : null;
  const businessHealthScore = placesScoreBreakdown || calculateManualBusinessHealthScore({
    business: {
      name: prospect.businessName,
      city: prospect.city,
      industry: prospect.industry
    },
    scan: buildBusinessHealthScan(prospect),
    context: {
      industry: prospect.industry,
      businessSize: "small",
      scanRecencyDays: 0
    }
  });
  const score = placesScoreBreakdown
    ? {
        total: placesScoreBreakdown.overallScore ?? 0,
        categories: placesScoreBreakdown.categories,
        breakdown: placesScoreBreakdown
      }
    : {
        ...legacyScore,
        total: businessHealthScore.overallScore
      };

  return {
    id: createId(),
    createdAt: new Date().toISOString(),
    ...prospect,
    score,
    legacyScore,
    businessHealthScore,
    placesScoreBreakdown,
    gaps: placesScoreBreakdown ? gapsFromPlacesBreakdown(placesScoreBreakdown) : generateGaps(prospect, score)
  };
}

function buildBusinessHealthScan(prospect) {
  const gbpFields = [
    prospect.googleBusinessProfile.claimed,
    prospect.googleBusinessProfile.hoursListed,
    prospect.googleBusinessProfile.photosPresent,
    prospect.googleBusinessProfile.descriptionFilled,
    prospect.googleBusinessProfile.primaryCategorySet
  ];
  const gbpCompleteness = Math.round((gbpFields.filter(Boolean).length / gbpFields.length) * 100);
  const websiteUp = prospect.website.status !== "none";
  const hasContactPath = Boolean(prospect.contact.clickToCall || prospect.contact.quoteForm || prospect.ordering?.onlineOrderingWorks);
  const recentPhotoCount = prospect.googleBusinessProfile.photosPresent ? 6 : 0;
  const qAndATotal = prospect.googleBusinessProfile.descriptionFilled ? 1 : 0;
  const qAndAAnswered = prospect.googleBusinessProfile.descriptionFilled ? 1 : 0;

  return {
    dataAccuracy: {
      napConsistent: Boolean(prospect.accuracy.phoneAccurate && prospect.accuracy.addressAccurate),
      phoneConsistent: Boolean(prospect.accuracy.phoneAccurate),
      addressConsistent: Boolean(prospect.accuracy.addressAccurate),
      hoursConsistent: Boolean(prospect.accuracy.hoursAccurate),
      hoursComplete: Boolean(prospect.googleBusinessProfile.hoursListed)
    },
    discoveryStrength: {
      googleBusinessProfileClaimed: Boolean(prospect.googleBusinessProfile.claimed),
      googleBusinessProfileVerified: Boolean(prospect.googleBusinessProfile.claimed),
      googleBusinessProfileCompleteness: gbpCompleteness,
      primaryCategorySet: Boolean(prospect.googleBusinessProfile.primaryCategorySet),
      serviceCategoriesComplete: Boolean(prospect.accuracy.servicesAccurate),
      mapsTopThree: Boolean(prospect.localVisibility.mapsTopThree),
      localRankPosition: prospect.localVisibility.mapsTopThree ? 3 : undefined
    },
    onlinePresence: {
      websiteUp,
      hasWebsite: websiteUp,
      mobileOptimized: Boolean(prospect.website.mobileFriendly),
      pageSpeedScore: prospect.website.status === "none" ? 0 : prospect.website.loadsFast ? 82 : 42,
      coreWebVitalsPass: Boolean(prospect.website.loadsFast),
      schemaPresent: prospect.website.status === "modern",
      bookingOrContactPathPresent: hasContactPath
    },
    contentFreshness: {
      recentPhotoCount,
      qAndAAnswered,
      qAndATotal,
      reviewVelocityLast90Days: prospect.reviews.count >= 50 ? 10 : prospect.reviews.count >= 10 ? 4 : 1
    },
    customerSignals: {
      reviewCount: prospect.reviews.count,
      averageRating: prospect.reviews.averageRating,
      reviewResponseRate: prospect.contact.repliesFast ? 0.8 : 0.25,
      averageResponseTimeHours: prospect.contact.repliesFast ? 1 : 72
    },
    aiVisibility: {},
    technicalHealth: {
      sslValid: Boolean(prospect.website.hasSsl),
      canonicalRedirectWorking: websiteUp,
      wwwRedirectWorking: websiteUp,
      brokenImportantLinks: prospect.industry === "Restaurant / Food Service" && !prospect.ordering.menuAccurate ? 1 : 0
    }
  };
}

function gapsFromPlacesBreakdown(breakdown) {
  return (breakdown.prioritizedIssues || []).map((issue, index) => ({
    id: issue.id,
    priority: 100 - index,
    title: issue.title,
    body: issue.suggestedFix
  }));
}

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}