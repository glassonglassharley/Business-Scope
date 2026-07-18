export type BusinessHealthCategoryKey =
  | "dataAccuracy"
  | "discoveryStrength"
  | "onlinePresence"
  | "contentFreshness"
  | "customerSignals"
  | "aiVisibility"
  | "technicalHealth";

export type IssueImpact = "High" | "Medium" | "Low";
export type IssueDifficulty = "Easy" | "Medium" | "Hard";
export type TrendDirection = "up" | "down" | "flat" | "new";
export type BusinessSize = "micro" | "small" | "midMarket" | "enterprise";
export type MomentumDirection = "Strongly Improving" | "Improving" | "Flat" | "Declining" | "Strongly Declining" | "New";

export interface BusinessIdentity { name: string; city?: string; industry?: string; businessSize?: BusinessSize; websiteUrl?: string; phone?: string; address?: string; }
export interface ScoringContext { industry?: string; businessSize?: BusinessSize; scanRecencyDays?: number; customWeightMultipliers?: Partial<Record<BusinessHealthCategoryKey, number>>; }

export interface ConsistencyScanResult { napConsistent?: boolean; phoneConsistent?: boolean; addressConsistent?: boolean; hoursConsistent?: boolean; hoursComplete?: boolean; conflictingDirectoryCount?: number; totalDirectoryCount?: number; }
export interface DiscoveryScanResult { googleBusinessProfileClaimed?: boolean; googleBusinessProfileVerified?: boolean; googleBusinessProfileCompleteness?: number; primaryCategorySet?: boolean; serviceCategoriesComplete?: boolean; mapsTopThree?: boolean; localRankPosition?: number; directoryPresenceCount?: number; importantDirectoryCount?: number; }
export interface OnlinePresenceScanResult { websiteUp?: boolean; hasWebsite?: boolean; mobileOptimized?: boolean; pageSpeedScore?: number; coreWebVitalsPass?: boolean; schemaPresent?: boolean; bookingOrContactPathPresent?: boolean; }
export interface ContentFreshnessScanResult { recentPhotoCount?: number; daysSinceLastPhoto?: number; daysSinceLastPost?: number; qAndAAnswered?: number; qAndATotal?: number; daysSinceLastReview?: number; reviewVelocityLast90Days?: number; }
export interface CustomerSignalsScanResult { reviewCount?: number; averageRating?: number; reviewResponseRate?: number; negativeReviewResponseRate?: number; averageResponseTimeHours?: number; }
export interface AiSearchSimulationResult { query: string; appeared: boolean; informationCorrect: boolean; citedSource?: string; rankPosition?: number; }
export interface AiVisibilityScanResult { simulations?: AiSearchSimulationResult[]; }
export interface TechnicalHealthScanResult { sslValid?: boolean; mixedContent?: boolean; canonicalRedirectWorking?: boolean; wwwRedirectWorking?: boolean; securityHeadersPresent?: boolean; brokenImportantLinks?: number; }

export interface BusinessHealthScanResults { dataAccuracy?: ConsistencyScanResult; discoveryStrength?: DiscoveryScanResult; onlinePresence?: OnlinePresenceScanResult; contentFreshness?: ContentFreshnessScanResult; customerSignals?: CustomerSignalsScanResult; aiVisibility?: AiVisibilityScanResult; technicalHealth?: TechnicalHealthScanResult; }
export interface PreviousBusinessHealthSnapshot { scannedAt?: string; overallScore: number; categoryScores?: Partial<Record<BusinessHealthCategoryKey, number>>; }
export interface BusinessHealthScoreInput { business: BusinessIdentity; scan: BusinessHealthScanResults; previousScan?: PreviousBusinessHealthSnapshot; previousScans?: PreviousBusinessHealthSnapshot[]; context?: ScoringContext; scannedAt?: string; }

export interface MetricScore { key: string; label: string; score: number; weight: number; available: boolean; confidence: number; explanation: string; outlier?: boolean; outlierReason?: string; }
export interface CompositeSubScore { key: string; label: string; score: number; weight: number; metrics: string[]; }
export interface CategoryScoreBreakdown { key: BusinessHealthCategoryKey; label: string; baseWeight: number; effectiveWeight: number; weightMultiplier: number; score: number; weightedPoints: number; confidence: number; subScores: CompositeSubScore[]; metrics: MetricScore[]; }
export interface PrioritizedIssue { id: string; category: BusinessHealthCategoryKey; title: string; impact: IssueImpact; difficulty: IssueDifficulty; timeEstimate: string; priorityScore: number; estimatedImpact: number; scoreImpact: number; explanation: string; suggestedFix: string; timeSensitive: boolean; }
export interface CategoryTrend { category: BusinessHealthCategoryKey; direction: TrendDirection; previousScore?: number; delta?: number; percentChange?: number; }
export interface BusinessHealthTrend { direction: TrendDirection; momentum: MomentumDirection; confidence: number; previousScore?: number; delta?: number; percentChange?: number; velocityPerScan?: number; categoryDeltas: Partial<Record<BusinessHealthCategoryKey, number>>; categoryTrends: CategoryTrend[]; }
export interface EffectiveWeight { category: BusinessHealthCategoryKey; baseWeight: number; effectiveWeight: number; multiplier: number; reason: string; }
export interface BusinessHealthScoreResult { overallScore: number; confidence: number; scannedAt: string; business: BusinessIdentity; effectiveWeights: EffectiveWeight[]; categories: CategoryScoreBreakdown[]; categoryScores: Record<BusinessHealthCategoryKey, number>; strengths: string[]; prioritizedIssues: PrioritizedIssue[]; suggestedNextFixes: string[]; warnings: string[]; trend: BusinessHealthTrend; }

interface MetricScoreDraft { score: number; available?: boolean; confidence?: number; explanation: string; outlier?: boolean; outlierReason?: string; }
interface MetricDefinition { key: string; label: string; weight: number; difficulty: IssueDifficulty; timeEstimate: string; score: (scan: BusinessHealthScanResults) => MetricScoreDraft; }
interface SubScoreDefinition { key: string; label: string; weight: number; metricKeys: string[]; }
interface CategoryDefinition { key: BusinessHealthCategoryKey; label: string; weight: number; metrics: MetricDefinition[]; subScores: SubScoreDefinition[]; }

const UNKNOWN_SCORE = 50;
const MAX_CONTEXT_MULTIPLIER = 1.2;
const MIN_CONTEXT_MULTIPLIER = 0.8;

// Base category weights total 100. Effective weights can shift slightly by context, but are always normalized back to 100 for a transparent overall score.
export const BUSINESS_HEALTH_CATEGORY_WEIGHTS: Record<BusinessHealthCategoryKey, number> = { dataAccuracy: 25, discoveryStrength: 20, onlinePresence: 15, contentFreshness: 15, customerSignals: 10, aiVisibility: 10, technicalHealth: 5 };
const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  {
    key: "dataAccuracy",
    label: "Data Accuracy & Consistency",
    weight: BUSINESS_HEALTH_CATEGORY_WEIGHTS.dataAccuracy,
    subScores: [
      { key: "nap", label: "Name, address, phone", weight: 45, metricKeys: ["napConsistency"] },
      { key: "hours", label: "Hours", weight: 35, metricKeys: ["hoursConsistency", "hoursCompleteness"] },
      { key: "directories", label: "Directory consistency", weight: 20, metricKeys: ["directoryConflicts"] }
    ],
    metrics: [
      metric("napConsistency", "Name, address, phone consistency", 35, "Medium", "1-2 hours", (scan) => booleanAverage([scan.dataAccuracy?.napConsistent, scan.dataAccuracy?.phoneConsistent, scan.dataAccuracy?.addressConsistent], "NAP information is checked across the places customers see it.")),
      metric("hoursConsistency", "Hours consistency", 30, "Easy", "30-60 minutes", (scan) => {
        const base = boolScore(scan.dataAccuracy?.hoursConsistent, "Business hours match across Google, website, and listings.");
        return applyPenalty(base, scan.dataAccuracy?.hoursConsistent === false ? 12 : 0, "Inconsistent hours receive an extra penalty because they can directly waste customer trips.");
      }),
      metric("hoursCompleteness", "Hours completeness", 15, "Easy", "15-30 minutes", (scan) => boolScore(scan.dataAccuracy?.hoursComplete, "Complete hours help customers know when they can call, visit, or order.")),
      metric("directoryConflicts", "Directory conflict rate", 20, "Medium", "2-4 hours", (scan) => {
        const data = scan.dataAccuracy;
        if (data?.conflictingDirectoryCount === undefined || !data.totalDirectoryCount) return unknown("Directory conflict data was not provided.");
        const conflictRate = clamp01(data.conflictingDirectoryCount / data.totalDirectoryCount);
        return explained(100 - conflictRate * 100, `${data.conflictingDirectoryCount} of ${data.totalDirectoryCount} checked directories have conflicting details.`);
      })
    ]
  },
  {
    key: "discoveryStrength",
    label: "Discovery Strength",
    weight: BUSINESS_HEALTH_CATEGORY_WEIGHTS.discoveryStrength,
    subScores: [
      { key: "gbp", label: "Google profile", weight: 55, metricKeys: ["gbpCompleteness", "gbpOwnership"] },
      { key: "localPack", label: "Local pack visibility", weight: 25, metricKeys: ["localRank"] },
      { key: "directoryPresence", label: "Directory presence", weight: 20, metricKeys: ["directoryPresence"] }
    ],
    metrics: [
      metric("gbpCompleteness", "Google Business Profile completeness", 35, "Easy", "1-2 hours", (scan) => {
        const data = scan.discoveryStrength;
        if (data?.googleBusinessProfileCompleteness === undefined) return unknown("Google profile completeness was not provided.");
        const bonus = data.googleBusinessProfileVerified ? 5 : 0;
        return explained(clampScore(data.googleBusinessProfileCompleteness + bonus), `Google profile completeness is ${data.googleBusinessProfileCompleteness}/100${bonus ? ", with a verification bonus." : "."}`);
      }),
      metric("gbpOwnership", "Claimed and verified Google listing", 20, "Easy", "30-60 minutes", (scan) => {
        const data = scan.discoveryStrength;
        const claimed = data?.googleBusinessProfileClaimed ? 50 : 0;
        const verified = data?.googleBusinessProfileVerified ? 50 : 0;
        return explained(claimed + verified, "Claimed and verified listings are easier to trust and manage.", data?.googleBusinessProfileClaimed !== undefined || data?.googleBusinessProfileVerified !== undefined);
      }),
      metric("localRank", "Local Maps ranking", 25, "Hard", "2-6 weeks", (scan) => {
        const data = scan.discoveryStrength;
        if (data?.mapsTopThree) return explained(100, "Business appears in the local Maps top 3.");
        if (data?.localRankPosition === undefined) return unknown("Local ranking position was not provided.");
        return explained(positionScore(data.localRankPosition), `Observed local rank position is ${data.localRankPosition}.`);
      }),
      metric("directoryPresence", "Important directory presence", 20, "Medium", "2-4 hours", (scan) => {
        const data = scan.discoveryStrength;
        if (data?.directoryPresenceCount === undefined || !data.importantDirectoryCount) return unknown("Directory presence data was not provided.");
        return explained(ratioScore(data.directoryPresenceCount, data.importantDirectoryCount), `${data.directoryPresenceCount} of ${data.importantDirectoryCount} important directories were found.`);
      })
    ]
  },
  {
    key: "onlinePresence",
    label: "Online Presence",
    weight: BUSINESS_HEALTH_CATEGORY_WEIGHTS.onlinePresence,
    subScores: [
      { key: "website", label: "Website basics", weight: 45, metricKeys: ["websiteAvailability", "mobileOptimization", "conversionPath"] },
      { key: "technicalSeo", label: "Technical SEO", weight: 35, metricKeys: ["speed", "schema"] },
      { key: "customerAction", label: "Customer action path", weight: 20, metricKeys: ["conversionPath"] }
    ],
    metrics: [
      metric("websiteAvailability", "Website availability", 25, "Medium", "1-3 hours", (scan) => boolScore(scan.onlinePresence?.websiteUp ?? scan.onlinePresence?.hasWebsite, "A live website gives customers a place to confirm details and take action.")),
      metric("mobileOptimization", "Mobile optimization", 20, "Medium", "2-6 hours", (scan) => boolScore(scan.onlinePresence?.mobileOptimized, "Most local searches happen on phones, so mobile usability matters.")),
      metric("speed", "Loading speed", 20, "Medium", "2-6 hours", (scan) => {
        const speed = scan.onlinePresence?.pageSpeedScore;
        if (speed === undefined) return unknown("Page speed score was not provided.");
        return explained(sCurveScore(speed, 45, 85), `Page speed score is ${speed}/100. A curve is used because moving from slow to acceptable matters more than chasing a perfect lab score.`);
      }),
      metric("schema", "Structured data/schema", 15, "Medium", "1-3 hours", (scan) => boolScore(scan.onlinePresence?.schemaPresent, "Schema helps search engines understand the business.")),
      metric("conversionPath", "Contact, booking, or quote path", 20, "Easy", "30-90 minutes", (scan) => boolScore(scan.onlinePresence?.bookingOrContactPathPresent, "Clear action paths turn visits into calls, orders, or leads."))
    ]
  },  {
    key: "contentFreshness",
    label: "Content Freshness",
    weight: BUSINESS_HEALTH_CATEGORY_WEIGHTS.contentFreshness,
    subScores: [
      { key: "visualFreshness", label: "Photos and posts", weight: 45, metricKeys: ["photos", "posts"] },
      { key: "conversationFreshness", label: "Customer activity", weight: 55, metricKeys: ["questions", "reviewFreshness", "reviewVelocity"] }
    ],
    metrics: [
      metric("photos", "Recent photos", 25, "Easy", "1-2 hours", (scan) => {
        const data = scan.contentFreshness;
        const countScore = data?.recentPhotoCount === undefined ? UNKNOWN_SCORE : diminishingReturnScore(data.recentPhotoCount, 12);
        const recencyScore = daysSinceScore(data?.daysSinceLastPhoto, 30, 180);
        return explained(average([countScore, recencyScore]), "Fresh photos make the business look active and trustworthy.", data?.recentPhotoCount !== undefined || data?.daysSinceLastPhoto !== undefined);
      }),
      metric("posts", "Recent posts/updates", 20, "Easy", "30-60 minutes", (scan) => explained(daysSinceScore(scan.contentFreshness?.daysSinceLastPost, 30, 180), "Recent updates show the business is active.", scan.contentFreshness?.daysSinceLastPost !== undefined)),
      metric("questions", "Q&A activity", 20, "Easy", "30-60 minutes", (scan) => {
        const data = scan.contentFreshness;
        if (data?.qAndAAnswered === undefined || data.qAndATotal === undefined) return unknown("Q&A data was not provided.");
        return explained(data.qAndATotal === 0 ? 75 : ratioScore(data.qAndAAnswered, data.qAndATotal), `${data.qAndAAnswered} of ${data.qAndATotal} visible questions are answered.`);
      }),
      metric("reviewFreshness", "Recent reviews", 20, "Medium", "1-4 weeks", (scan) => explained(daysSinceScore(scan.contentFreshness?.daysSinceLastReview, 30, 180), "Recent reviews reduce doubt for new customers.", scan.contentFreshness?.daysSinceLastReview !== undefined)),
      metric("reviewVelocity", "Review velocity", 15, "Medium", "1-4 weeks", (scan) => {
        const velocity = scan.contentFreshness?.reviewVelocityLast90Days;
        if (velocity === undefined) return unknown("Review velocity was not provided.");
        return explained(diminishingReturnScore(velocity, 12), `${velocity} reviews were observed in the last 90 days.`);
      })
    ]
  },
  {
    key: "customerSignals",
    label: "Customer Signals",
    weight: BUSINESS_HEALTH_CATEGORY_WEIGHTS.customerSignals,
    subScores: [
      { key: "reviews", label: "Review strength", weight: 60, metricKeys: ["reviewCount", "rating"] },
      { key: "responses", label: "Response behavior", weight: 40, metricKeys: ["responseRate", "responseSpeed"] }
    ],
    metrics: [
      metric("reviewCount", "Review count", 30, "Medium", "2-8 weeks", (scan) => {
        const count = scan.customerSignals?.reviewCount;
        if (count === undefined) return unknown("Review count was not provided.");
        const lowCountPenalty = count < 10 ? 15 : 0;
        const outlier = count > 1000;
        return explained(clampScore(diminishingReturnScore(count, 75) - lowCountPenalty), `${count} reviews were observed${lowCountPenalty ? ", with a low-count penalty." : "."}`, true, outlier ? 0.75 : 1, outlier, outlier ? "Review volume is unusually high for many local businesses; verify it against the market." : undefined);
      }),
      metric("rating", "Average rating", 30, "Hard", "Ongoing", (scan) => {
        const rating = scan.customerSignals?.averageRating;
        if (rating === undefined) return unknown("Average rating was not provided.");
        const outlier = rating === 5 && (scan.customerSignals?.reviewCount ?? 0) > 100;
        return explained(clampScore(((rating - 3) / 2) * 100), `Average rating is ${rating.toFixed(1)} out of 5.`, true, outlier ? 0.8 : 1, outlier, outlier ? "A perfect rating with high review volume is possible, but worth manually verifying." : undefined);
      }),
      metric("responseRate", "Review response rate", 25, "Easy", "1-2 hours", (scan) => {
        const rate = scan.customerSignals?.reviewResponseRate;
        if (rate === undefined) return unknown("Review response rate was not provided.");
        return explained(percentToScore(rate), `Review response rate is ${formatPercent(rate)}.`);
      }),
      metric("responseSpeed", "Response speed", 15, "Medium", "1-3 days", (scan) => {
        const hours = scan.customerSignals?.averageResponseTimeHours;
        if (hours === undefined) return unknown("Average response time was not provided.");
        return explained(inverseRangeScore(hours, 2, 72), `Average response time is about ${hours} hours.`);
      })
    ]
  },
  {
    key: "aiVisibility",
    label: "AI Visibility",
    weight: BUSINESS_HEALTH_CATEGORY_WEIGHTS.aiVisibility,
    subScores: [
      { key: "appearance", label: "Appearance", weight: 45, metricKeys: ["aiAppearance"] },
      { key: "accuracy", label: "Answer accuracy", weight: 45, metricKeys: ["aiAccuracy"] },
      { key: "prominence", label: "Prominence", weight: 10, metricKeys: ["aiRank"] }
    ],
    metrics: [
      metric("aiAppearance", "AI search appearance", 45, "Medium", "1-4 weeks", (scan) => {
        const simulations = scan.aiVisibility?.simulations ?? [];
        if (!simulations.length) return unknown("AI search simulations were not provided.");
        const appeared = simulations.filter((simulation) => simulation.appeared).length;
        return explained(ratioScore(appeared, simulations.length), `${appeared} of ${simulations.length} simulated AI searches surfaced the business.`);
      }),
      metric("aiAccuracy", "AI answer accuracy", 45, "Medium", "1-4 weeks", (scan) => {
        const appeared = (scan.aiVisibility?.simulations ?? []).filter((simulation) => simulation.appeared);
        if (!appeared.length) return unknown("No appeared AI results were available to judge accuracy.");
        const correct = appeared.filter((simulation) => simulation.informationCorrect).length;
        return explained(ratioScore(correct, appeared.length), `${correct} of ${appeared.length} appeared AI results had correct business information.`);
      }),
      metric("aiRank", "AI answer prominence", 10, "Hard", "2-8 weeks", (scan) => {
        const positions = (scan.aiVisibility?.simulations ?? []).map((simulation) => simulation.rankPosition).filter((position): position is number => typeof position === "number");
        if (!positions.length) return unknown("AI rank positions were not provided.");
        return explained(average(positions.map(positionScore)), "Higher AI answer prominence improves confidence that customers will see the business.");
      })
    ]
  },
  {
    key: "technicalHealth",
    label: "Technical Health",
    weight: BUSINESS_HEALTH_CATEGORY_WEIGHTS.technicalHealth,
    subScores: [
      { key: "security", label: "Security", weight: 55, metricKeys: ["ssl", "mixedContent", "securityHeaders"] },
      { key: "siteIntegrity", label: "Site integrity", weight: 45, metricKeys: ["redirects", "brokenLinks"] }
    ],
    metrics: [
      metric("ssl", "SSL/security certificate", 25, "Easy", "15-60 minutes", (scan) => boolScore(scan.technicalHealth?.sslValid, "A valid SSL certificate protects trust and browser safety signals.")),
      metric("mixedContent", "Mixed content", 15, "Medium", "1-3 hours", (scan) => inverseBoolScore(scan.technicalHealth?.mixedContent, "Mixed content can create security warnings or broken assets.")),
      metric("redirects", "Canonical redirects", 20, "Medium", "1-2 hours", (scan) => booleanAverage([scan.technicalHealth?.canonicalRedirectWorking, scan.technicalHealth?.wwwRedirectWorking], "Clean redirects reduce confusion and duplicate versions of the site.")),
      metric("securityHeaders", "Security headers", 15, "Medium", "1-2 hours", (scan) => boolScore(scan.technicalHealth?.securityHeadersPresent, "Security headers are a positive technical trust signal.")),
      metric("brokenLinks", "Important broken links", 25, "Easy", "30-90 minutes", (scan) => {
        const count = scan.technicalHealth?.brokenImportantLinks;
        if (count === undefined) return unknown("Broken link count was not provided.");
        return explained(clampScore(100 - count * 20), `${count} important broken links were found.`);
      })
    ]
  }
];
// Calculates a transparent Business Health Score from observed data. Missing metrics fall back to a neutral score and lower confidence instead of pretending data was scanned.
export function calculateBusinessHealthScore(input: BusinessHealthScoreInput): BusinessHealthScoreResult {
  const context = buildContext(input);
  const effectiveWeights = buildEffectiveWeights(context);
  const categories = CATEGORY_DEFINITIONS.map((category) => scoreCategory(category, input.scan, effectiveWeights));
  const baseOverall = categories.reduce((sum, category) => sum + category.weightedPoints, 0);
  // Small excellence bonus rewards businesses that are strong across every category, without letting one great area hide a weak one.
  const bonus = categories.every((category) => category.score > 85) ? 3 : 0;
  const overallScore = roundScore(clampScore(baseOverall + bonus));
  const categoryScores = categories.reduce((scores, category) => {
    scores[category.key] = category.score;
    return scores;
  }, {} as Record<BusinessHealthCategoryKey, number>);
  const trend = buildTrend(overallScore, categoryScores, input.previousScan, input.previousScans);
  const prioritizedIssues = buildIssues(categories, trend);
  const strengths = buildStrengths(categories);
  const suggestedNextFixes = prioritizedIssues.slice(0, 5).map((issue) => `${issue.suggestedFix} Estimated lift: +${issue.estimatedImpact} points. Difficulty: ${issue.difficulty}.`);
  const confidence = buildConfidence(categories, context);

  return {
    overallScore,
    confidence,
    scannedAt: input.scannedAt ?? new Date().toISOString(),
    business: input.business,
    effectiveWeights,
    categories,
    categoryScores,
    strengths,
    prioritizedIssues,
    suggestedNextFixes,
    warnings: buildWarnings(categories, context),
    trend
  };
}

function scoreCategory(definition: CategoryDefinition, scanResults: BusinessHealthScanResults, effectiveWeights: EffectiveWeight[]): CategoryScoreBreakdown {
  const weight = effectiveWeights.find((item) => item.category === definition.key);
  const metrics = definition.metrics.map((metricDefinition) => {
    const draft = metricDefinition.score(scanResults);
    return {
      key: metricDefinition.key,
      label: metricDefinition.label,
      score: clampScore(draft.score),
      weight: metricDefinition.weight,
      available: draft.available ?? true,
      confidence: clampScore(draft.confidence === undefined ? (draft.available === false ? 35 : 100) : draft.confidence * 100),
      explanation: draft.explanation,
      outlier: draft.outlier,
      outlierReason: draft.outlierReason
    };
  });
  const rawScore = weightedAverage(metrics);
  const score = applyCategoryFloors(definition.key, rawScore, metrics);
  const effectiveWeight = weight?.effectiveWeight ?? definition.weight;

  return {
    key: definition.key,
    label: definition.label,
    baseWeight: definition.weight,
    effectiveWeight,
    weightMultiplier: weight?.multiplier ?? 1,
    score,
    weightedPoints: (score * effectiveWeight) / 100,
    confidence: roundScore(average(metrics.map((item) => item.confidence))),
    subScores: definition.subScores.map((subScore) => scoreSubScore(subScore, metrics)),
    metrics
  };
}

function buildContext(input: BusinessHealthScoreInput): Required<Omit<ScoringContext, "customWeightMultipliers">> & Pick<ScoringContext, "customWeightMultipliers"> {
  return {
    industry: input.context?.industry ?? input.business.industry ?? "local-service",
    businessSize: input.context?.businessSize ?? input.business.businessSize ?? "small",
    scanRecencyDays: input.context?.scanRecencyDays ?? 0,
    customWeightMultipliers: input.context?.customWeightMultipliers
  };
}

// Context multipliers keep the default model simple, then adjust weights slightly for industry, size, and stale scans.
function buildEffectiveWeights(context: ScoringContext): EffectiveWeight[] {
  const adjusted = CATEGORY_DEFINITIONS.map((category) => {
    const multiplier = clampMultiplier(industryMultiplier(category.key, context.industry) * businessSizeMultiplier(category.key, context.businessSize) * recencyMultiplier(category.key, context.scanRecencyDays) * (context.customWeightMultipliers?.[category.key] ?? 1));
    return { category: category.key, baseWeight: category.weight, adjustedWeight: category.weight * multiplier, multiplier, reason: weightReason(multiplier, context) };
  });
  const totalAdjusted = adjusted.reduce((sum, item) => sum + item.adjustedWeight, 0);
  return adjusted.map((item) => ({ category: item.category, baseWeight: item.baseWeight, effectiveWeight: roundTo((item.adjustedWeight / totalAdjusted) * 100, 2), multiplier: roundTo(item.multiplier, 2), reason: item.reason }));
}

function industryMultiplier(category: BusinessHealthCategoryKey, industry?: string): number {
  const normalized = (industry ?? "").toLowerCase();
  if (["restaurant", "food", "cafe", "bar", "pizza", "takeout"].some((term) => normalized.includes(term))) {
    if (category === "contentFreshness") return 1.15;
    if (category === "dataAccuracy") return 1.1;
    if (category === "customerSignals") return 1.08;
  }
  if (["hvac", "plumbing", "cleaning", "landscaping", "home service", "contractor"].some((term) => normalized.includes(term))) {
    if (category === "discoveryStrength") return 1.12;
    if (category === "customerSignals") return 1.08;
    if (category === "onlinePresence") return 1.05;
  }
  if (["ecommerce", "online store", "retail"].some((term) => normalized.includes(term))) {
    if (category === "onlinePresence") return 1.18;
    if (category === "technicalHealth") return 1.1;
    if (category === "customerSignals") return 1.1;
  }
  return 1;
}

function businessSizeMultiplier(category: BusinessHealthCategoryKey, businessSize?: BusinessSize): number {
  if (businessSize === "micro") {
    if (category === "dataAccuracy" || category === "discoveryStrength") return 1.08;
    if (category === "technicalHealth") return 0.9;
  }
  if (businessSize === "enterprise") {
    if (category === "technicalHealth" || category === "aiVisibility") return 1.12;
    if (category === "dataAccuracy") return 0.95;
  }
  return 1;
}

function recencyMultiplier(category: BusinessHealthCategoryKey, scanRecencyDays = 0): number {
  if (scanRecencyDays <= 30) return 1;
  if (category === "contentFreshness" || category === "customerSignals" || category === "discoveryStrength") return 0.92;
  return 0.97;
}

function weightReason(multiplier: number, context: ScoringContext): string {
  if (Math.abs(multiplier - 1) < 0.02) return "Base weight used.";
  return `Adjusted for ${context.industry ?? "industry"}, ${context.businessSize ?? "business size"}, and scan recency context.`;
}

function scoreSubScore(subScore: SubScoreDefinition, metrics: MetricScore[]): CompositeSubScore {
  const included = metrics.filter((metricScore) => subScore.metricKeys.includes(metricScore.key));
  return { key: subScore.key, label: subScore.label, score: weightedAverage(included), weight: subScore.weight, metrics: included.map((metricScore) => metricScore.key) };
}

function applyCategoryFloors(category: BusinessHealthCategoryKey, score: number, metrics: MetricScore[]): number {
  if (category === "dataAccuracy") {
    const criticalMissing = metrics.some((metricScore) => ["napConsistency", "hoursConsistency"].includes(metricScore.key) && metricScore.score < 50);
    if (criticalMissing) return Math.min(score, 70);
  }
  if (category === "technicalHealth" && metrics.some((metricScore) => metricScore.key === "ssl" && metricScore.score === 0)) return Math.min(score, 60);
  return roundScore(score);
}

function buildStrengths(categories: CategoryScoreBreakdown[]): string[] {
  const categoryStrengths = categories.filter((category) => category.score >= 80).map((category) => `${category.label} is strong at ${category.score}/100.`);
  const metricStrengths = categories.flatMap((category) => category.metrics.filter((metricScore) => metricScore.available && metricScore.score >= 90).map((metricScore) => `${metricScore.label} is working well.`));
  return [...categoryStrengths, ...metricStrengths].slice(0, 8);
}
// Issues are ranked by severity, business impact, effort, and whether the category is trending down.
function buildIssues(categories: CategoryScoreBreakdown[], trend: BusinessHealthTrend): PrioritizedIssue[] {
  return categories
    .flatMap((category) => category.metrics.filter((metricScore) => metricScore.score < 75).map((metricScore) => {
      const metricDefinition = findMetricDefinition(category.key, metricScore.key);
      const scoreImpact = ((100 - metricScore.score) * metricScore.weight * category.effectiveWeight) / 10000;
      const timeSensitive = category.key === "contentFreshness" || trend.categoryTrends.some((item) => item.category === category.key && item.direction === "down");
      const priorityScore = clampScore(severityValue(metricScore.score) * 0.45 + impactValue(category.effectiveWeight, scoreImpact) * 0.4 + effortValue(metricDefinition?.difficulty ?? "Medium") * 0.15 + (timeSensitive ? 8 : 0));
      return {
        id: `${category.key}-${metricScore.key}`,
        category: category.key,
        title: `${metricScore.label} needs attention`,
        impact: impactFromPriority(priorityScore, metricScore.score),
        difficulty: metricDefinition?.difficulty ?? "Medium",
        timeEstimate: metricDefinition?.timeEstimate ?? "Varies",
        priorityScore: roundScore(priorityScore),
        estimatedImpact: estimatedLift(metricScore, category),
        scoreImpact: roundScore(scoreImpact),
        explanation: metricScore.explanation,
        suggestedFix: suggestedFixFor(category.key, metricScore.key),
        timeSensitive
      };
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 12);
}

function buildTrend(overallScore: number, categoryScores: Record<BusinessHealthCategoryKey, number>, previousScan?: PreviousBusinessHealthSnapshot, previousScans?: PreviousBusinessHealthSnapshot[]): BusinessHealthTrend {
  const history = [...(previousScans ?? []), ...(previousScan ? [previousScan] : [])].filter((scan) => typeof scan.overallScore === "number").slice(-3);
  const lastScan = history.at(-1);
  if (!lastScan) return { direction: "new", momentum: "New", confidence: 45, categoryDeltas: {}, categoryTrends: [] };

  const delta = roundScore(overallScore - lastScan.overallScore);
  const percentChange = lastScan.overallScore === 0 ? undefined : roundTo((delta / lastScan.overallScore) * 100, 2);
  const categoryTrends = Object.entries(categoryScores).flatMap(([key, score]) => {
    const category = key as BusinessHealthCategoryKey;
    const previous = lastScan.categoryScores?.[category];
    if (previous === undefined) return [];
    const categoryDelta = roundScore(score - previous);
    return [{ category, direction: directionFromDelta(categoryDelta), previousScore: previous, delta: categoryDelta, percentChange: previous === 0 ? undefined : roundTo((categoryDelta / previous) * 100, 2) }];
  });
  const categoryDeltas = categoryTrends.reduce((deltas, item) => {
    deltas[item.category] = item.delta;
    return deltas;
  }, {} as Partial<Record<BusinessHealthCategoryKey, number>>);
  const velocityPerScan = history.length >= 2 ? roundTo((overallScore - history[0].overallScore) / history.length, 2) : delta;
  return { direction: directionFromDelta(delta), momentum: momentumFromVelocity(velocityPerScan, history.length), confidence: history.length >= 3 ? 85 : 65, previousScore: lastScan.overallScore, delta, percentChange, velocityPerScan, categoryDeltas, categoryTrends };
}

function buildConfidence(categories: CategoryScoreBreakdown[], context: ScoringContext): number {
  const metrics = categories.flatMap((category) => category.metrics);
  const metricConfidence = average(metrics.map((metricScore) => metricScore.confidence));
  const coverage = metrics.length ? (metrics.filter((metricScore) => metricScore.available).length / metrics.length) * 100 : 0;
  const stalePenalty = context.scanRecencyDays && context.scanRecencyDays > 30 ? Math.min(20, (context.scanRecencyDays - 30) / 4) : 0;
  const outlierPenalty = metrics.filter((metricScore) => metricScore.outlier).length * 4;
  return roundScore(clampScore(metricConfidence * 0.55 + coverage * 0.45 - stalePenalty - outlierPenalty));
}

function buildWarnings(categories: CategoryScoreBreakdown[], context: ScoringContext): string[] {
  const metrics = categories.flatMap((category) => category.metrics);
  const warnings: string[] = [];
  const missing = metrics.filter((metricScore) => !metricScore.available).length;
  if (missing > 0) warnings.push(`${missing} metrics were not available, so confidence is reduced and unknown values fall back to ${UNKNOWN_SCORE}/100.`);
  if ((context.scanRecencyDays ?? 0) > 30) warnings.push("Scan data is more than 30 days old; freshness, review, and discovery signals may have changed.");
  metrics.filter((metricScore) => metricScore.outlier && metricScore.outlierReason).forEach((metricScore) => warnings.push(metricScore.outlierReason as string));
  return warnings;
}

function metric(key: string, label: string, weight: number, difficulty: IssueDifficulty, timeEstimate: string, score: (scan: BusinessHealthScanResults) => MetricScoreDraft): MetricDefinition {
  return { key, label, weight, difficulty, timeEstimate, score };
}

function findMetricDefinition(categoryKey: BusinessHealthCategoryKey, metricKey: string): MetricDefinition | undefined {
  return CATEGORY_DEFINITIONS.find((category) => category.key === categoryKey)?.metrics.find((metricDefinition) => metricDefinition.key === metricKey);
}

function weightedAverage(metrics: Array<MetricScore | CompositeSubScore>): number {
  const totalWeight = metrics.reduce((sum, metricScore) => sum + metricScore.weight, 0);
  if (!totalWeight) return UNKNOWN_SCORE;
  return roundScore(metrics.reduce((sum, metricScore) => sum + metricScore.score * metricScore.weight, 0) / totalWeight);
}

function boolScore(value: boolean | undefined, explanation: string): MetricScoreDraft {
  if (value === undefined) return unknown(`${explanation} This data was not provided.`);
  return explained(value ? 100 : 0, explanation);
}

function inverseBoolScore(value: boolean | undefined, explanation: string): MetricScoreDraft {
  if (value === undefined) return unknown(`${explanation} This data was not provided.`);
  return explained(value ? 0 : 100, explanation);
}

function booleanAverage(values: Array<boolean | undefined>, explanation: string): MetricScoreDraft {
  const available = values.filter((value): value is boolean => value !== undefined);
  if (!available.length) return unknown(`${explanation} No checks were provided.`);
  return explained((available.filter(Boolean).length / available.length) * 100, explanation, true, available.length / values.length);
}

function applyPenalty(score: MetricScoreDraft, penalty: number, extraExplanation: string): MetricScoreDraft {
  if (!score.available) return score;
  return { ...score, score: clampScore(score.score - penalty), explanation: penalty ? `${score.explanation} ${extraExplanation}` : score.explanation };
}

function explained(score: number, explanation: string, available = true, confidence = 1, outlier = false, outlierReason?: string): MetricScoreDraft {
  return { score: clampScore(score), available, confidence, explanation, outlier, outlierReason };
}

function unknown(explanation: string): MetricScoreDraft {
  return { score: UNKNOWN_SCORE, available: false, confidence: 0.35, explanation };
}
function ratioScore(value: number, max: number): number {
  if (max <= 0) return UNKNOWN_SCORE;
  return clampScore((value / max) * 100);
}

function percentToScore(value: number): number {
  return value <= 1 ? clampScore(value * 100) : clampScore(value);
}

function positionScore(position: number): number {
  if (position <= 1) return 100;
  if (position <= 3) return 90;
  if (position <= 5) return 75;
  if (position <= 10) return 55;
  if (position <= 20) return 35;
  return 15;
}

function daysSinceScore(days: number | undefined, strongWithinDays: number, weakAfterDays: number): number {
  if (days === undefined) return UNKNOWN_SCORE;
  if (days <= strongWithinDays) return 100;
  if (days >= weakAfterDays) return 20;
  const progress = (days - strongWithinDays) / (weakAfterDays - strongWithinDays);
  return clampScore(100 - progress * 80);
}

function inverseRangeScore(value: number, bestAtOrBelow: number, weakAtOrAbove: number): number {
  if (value <= bestAtOrBelow) return 100;
  if (value >= weakAtOrAbove) return 20;
  const progress = (value - bestAtOrBelow) / (weakAtOrAbove - bestAtOrBelow);
  return clampScore(100 - progress * 80);
}

function sCurveScore(value: number, midpoint: number, steepAt: number): number {
  const steepness = 8 / Math.max(1, steepAt - midpoint);
  return clampScore(100 / (1 + Math.exp(-steepness * (value - midpoint))));
}

function diminishingReturnScore(value: number, target: number): number {
  if (value <= 0) return 0;
  return clampScore((1 - Math.exp(-value / Math.max(1, target / 3))) * 100);
}

function average(values: number[]): number {
  if (!values.length) return UNKNOWN_SCORE;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function severityValue(metricScore: number): number {
  if (metricScore <= 30) return 100;
  if (metricScore <= 60) return 70;
  return 45;
}

function impactValue(categoryWeight: number, scoreImpact: number): number {
  return clampScore(categoryWeight * 2 + scoreImpact * 12);
}

function effortValue(difficulty: IssueDifficulty): number {
  if (difficulty === "Easy") return 100;
  if (difficulty === "Medium") return 65;
  return 35;
}

function estimatedLift(metricScore: MetricScore, category: CategoryScoreBreakdown): number {
  const realisticTarget = metricScore.available ? 85 : 70;
  const metricLift = Math.max(0, realisticTarget - metricScore.score);
  return Math.max(1, roundScore((metricLift * metricScore.weight * category.effectiveWeight) / 10000));
}

function impactFromPriority(priorityScore: number, metricScore: number): IssueImpact {
  if (priorityScore >= 75 || metricScore <= 30) return "High";
  if (priorityScore >= 50 || metricScore <= 60) return "Medium";
  return "Low";
}

function directionFromDelta(delta: number): TrendDirection {
  if (Math.abs(delta) < 2) return "flat";
  return delta > 0 ? "up" : "down";
}

function momentumFromVelocity(velocity: number, scanCount: number): MomentumDirection {
  if (scanCount < 2) return "New";
  if (velocity >= 5) return "Strongly Improving";
  if (velocity >= 2) return "Improving";
  if (velocity <= -5) return "Strongly Declining";
  if (velocity <= -2) return "Declining";
  return "Flat";
}

function suggestedFixFor(category: BusinessHealthCategoryKey, metricKey: string): string {
  const fixes: Partial<Record<BusinessHealthCategoryKey, Record<string, string>>> = {
    dataAccuracy: { napConsistency: "Correct the business name, phone, and address everywhere customers see them.", hoursConsistency: "Make Google, website, and directory hours match exactly, including holiday hours.", hoursCompleteness: "Add complete business hours anywhere customers may check before visiting or calling.", directoryConflicts: "Clean up conflicting directory listings, starting with the highest-traffic sources." },
    discoveryStrength: { gbpCompleteness: "Fill missing Google Business Profile fields and add the strongest available categories/services.", gbpOwnership: "Claim and verify the Google listing so the business controls its public storefront.", localRank: "Improve local Maps relevance with category, service, review, and proximity signals.", directoryPresence: "Add or repair listings on the directories customers and search engines trust." },
    onlinePresence: { websiteAvailability: "Make sure the website is live, reachable, and points to the correct business.", mobileOptimization: "Fix mobile layout, tap targets, and above-the-fold contact paths.", speed: "Compress heavy assets and remove slow-loading scripts from key pages.", schema: "Add local business schema so search engines can understand the business details.", conversionPath: "Add a clear call, booking, order, or quote path on the main pages." },
    contentFreshness: { photos: "Add recent real photos that show the location, work, team, products, or menu items.", posts: "Publish a current update so customers can tell the business is active.", questions: "Answer visible customer questions in plain language.", reviewFreshness: "Ask recent happy customers for reviews to refresh trust signals.", reviewVelocity: "Create a simple review request rhythm after successful customer interactions." },
    customerSignals: { reviewCount: "Ask more recent customers for reviews until the business clears the trust threshold.", rating: "Respond to negative patterns and fix the service issues hurting the visible rating.", responseRate: "Reply to more reviews, especially recent and negative ones.", responseSpeed: "Shorten review and lead response time with templates or notifications." },
    aiVisibility: { aiAppearance: "Strengthen consistent public business facts across Google, website, and trusted directories.", aiAccuracy: "Correct inaccurate public facts that AI tools may be repeating.", aiRank: "Improve source clarity and authority so AI answers can identify the business confidently." },
    technicalHealth: { ssl: "Renew or repair SSL so browsers show the site as secure.", mixedContent: "Remove insecure page assets that can trigger browser warnings.", redirects: "Fix canonical redirects so visitors and crawlers land on one clean website version.", securityHeaders: "Add basic security headers through the hosting platform or site config.", brokenLinks: "Repair important broken links, especially contact, booking, menu, and service links." }
  };
  return fixes[category]?.[metricKey] ?? "Review this area and fix the highest-friction customer-facing issue first.";
}

function clampMultiplier(value: number): number { return Math.min(MAX_CONTEXT_MULTIPLIER, Math.max(MIN_CONTEXT_MULTIPLIER, value)); }
function clamp01(value: number): number { return Math.min(1, Math.max(0, value)); }
function clampScore(value: number): number { if (!Number.isFinite(value)) return UNKNOWN_SCORE; return Math.min(100, Math.max(0, value)); }
function roundScore(value: number): number { return Math.round(value); }
function roundTo(value: number, decimals: number): number { const factor = 10 ** decimals; return Math.round(value * factor) / factor; }
function formatPercent(value: number): string { const normalized = value <= 1 ? value * 100 : value; return `${Math.round(normalized)}%`; }