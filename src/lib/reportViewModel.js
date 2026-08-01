const DEFAULT_DATE = "Not available";

export function createReportViewModel(input = {}) {
  const scoreTotal = asNumber(input.score?.total, 0);
  const rawScoreBreakdown = input.score?.breakdown || input.placesScoreBreakdown || input.businessHealthScore || null;
  const scoreBreakdown = normalizeBreakdown(rawScoreBreakdown);
  const businessHealthScore = scoreBreakdown || input.businessHealthScore || null;
  const categories = normalizeCategories(Array.isArray(input.score?.categories) ? input.score.categories : Array.isArray(scoreBreakdown?.categories) ? scoreBreakdown.categories : []);
  const prioritizedIssues = scoreBreakdown?.prioritizedIssues || [];
  const gaps = normalizeGaps(input.gaps, prioritizedIssues);
  const createdAt = input.createdAt || null;

  return {
    ...input,
    id: input.id || "report-preview",
    businessName: textOr(input.businessName, input.business?.businessName, "Unknown business"),
    industry: textOr(input.industry, input.business?.industry, "Business type not available"),
    city: textOr(input.city, input.business?.city, "Location not available"),
    createdAt,
    reportDateLabel: formatReportDate(createdAt),
    score: {
      ...(input.score || {}),
      total: scoreTotal,
      categories,
      breakdown: scoreBreakdown
    },
    businessHealthScore,
    placesScoreBreakdown: input.placesScoreBreakdown || scoreBreakdown,
    gaps,
    customerImpactLabel: textOr(input.customerImpactLabel, null),
    fullReportUnlocked: Boolean(input.fullReportUnlocked)
  };
}

export function sampleReportToAudit(sample, checkedDate) {
  const createdAt = dateFromLabel(checkedDate);
  const scoreBreakdown = {
    overallScore: asNumber(sample?.scoreTotal, 0),
    availableWeight: asNumber(sample?.availableWeight, 0),
    categories: Array.isArray(sample?.categories) ? sample.categories : [],
    prioritizedIssues: Array.isArray(sample?.prioritizedIssues) ? sample.prioritizedIssues : []
  };

  return createReportViewModel({
    id: `sample-${slugify(sample?.business?.businessName || "report")}`,
    createdAt,
    businessName: sample?.business?.businessName,
    industry: sample?.business?.industry,
    city: sample?.business?.city,
    dataSource: "sample",
    score: {
      total: scoreBreakdown.overallScore,
      categories: scoreBreakdown.categories,
      breakdown: scoreBreakdown
    },
    businessHealthScore: scoreBreakdown,
    placesScoreBreakdown: scoreBreakdown,
    gaps: scoreBreakdown.prioritizedIssues.map((issue) => ({
      id: issue.id,
      title: issue.title,
      body: issue.suggestedFix
    })),
    fullReportUnlocked: true
  });
}

export function buildReportSummary(auditInput) {
  const audit = createReportViewModel(auditInput);
  const lines = [
    `${audit.businessName} — Thorost checkup`,
    `Score: ${audit.score.total}/100`,
    `Prepared: ${audit.reportDateLabel}`,
    "",
    "Top findings:"
  ];

  const findings = audit.gaps.slice(0, 3);
  if (findings.length) {
    findings.forEach((gap, index) => {
      lines.push(`${index + 1}. ${textOr(gap.title, null, "No major issue detected")} — ${textOr(gap.body, null, "No additional details available")}`);
    });
  } else {
    lines.push("No major issue detected");
  }

  const nextFix = audit.score?.breakdown?.prioritizedIssues?.[0]?.suggestedFix || audit.gaps[0]?.body || "Review the highest-impact public-facing issue first.";
  lines.push("", `Fix first: ${nextFix}`);
  return lines.join("\n");
}

export function formatReportDate(value) {
  if (!value) return DEFAULT_DATE;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return DEFAULT_DATE;
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(date);
}

function normalizeBreakdown(breakdown) {
  if (!breakdown || typeof breakdown !== "object") return null;
  return {
    ...breakdown,
    categories: normalizeCategories(breakdown.categories),
    prioritizedIssues: normalizeIssues(breakdown.prioritizedIssues),
    scanErrors: Array.isArray(breakdown.scanErrors) ? breakdown.scanErrors : []
  };
}

function normalizeCategories(categories) {
  if (!Array.isArray(categories)) return [];
  return categories.map((category, index) => ({
    ...category,
    key: textOr(category?.key, null, `category-${index}`),
    label: textOr(category?.label, null, "Not available"),
    status: textOr(category?.status, null, "measured"),
    metrics: normalizeMetrics(category?.metrics),
    subScores: Array.isArray(category?.subScores) ? category.subScores : []
  }));
}

function normalizeMetrics(metrics) {
  if (!Array.isArray(metrics)) return [];
  return metrics.map((metric, index) => ({
    ...metric,
    id: textOr(metric?.id, null, `metric-${index}`),
    label: textOr(metric?.label, null, "Not available"),
    note: textOr(metric?.note, null, "No additional details available")
  }));
}

function normalizeIssues(issues) {
  if (!Array.isArray(issues)) return [];
  return issues.map((issue, index) => ({
    ...issue,
    id: textOr(issue?.id, null, `issue-${index}`),
    title: textOr(issue?.title, null, "No major issue detected"),
    impact: textOr(issue?.impact, null, "Medium"),
    suggestedFix: textOr(issue?.suggestedFix, issue?.body, "No additional details available")
  }));
}

function normalizeGaps(gaps, issues) {
  if (Array.isArray(gaps) && gaps.length) {
    return gaps.map((gap, index) => ({
      id: gap.id || `gap-${index}`,
      title: textOr(gap.title, null, "No major issue detected"),
      body: textOr(gap.body, gap.suggestedFix, "No additional details available")
    }));
  }

  if (Array.isArray(issues) && issues.length) {
    return issues.map((issue, index) => ({
      id: issue.id || `issue-${index}`,
      title: textOr(issue.title, null, "No major issue detected"),
      body: textOr(issue.suggestedFix, issue.body, "No additional details available")
    }));
  }

  return [];
}

function textOr(...values) {
  const fallback = values.at(-1) ?? "";
  for (const value of values.slice(0, -1)) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return fallback;
}

function asNumber(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function dateFromLabel(label) {
  const date = new Date(label);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "report";
}
