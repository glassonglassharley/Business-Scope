const CURRENT_YEAR = new Date().getFullYear();

/**
 * ContentFreshnessProvider derives freshness signals only from data StreetSignal
 * already fetched: Google Places details and the homepage HTML captured by
 * WebsiteProvider. It does not fetch new URLs or call external APIs.
 */
export const ContentFreshnessProvider = {
  fromExistingData({ html = "", place = {}, websiteUrl = null } = {}) {
    const copyright = parseCopyrightYear(html);
    const pageDate = parsePageDateSignal(html);
    const photosCount = typeof place?.photosCount === "number" ? place.photosCount : null;
    const hoursSpecificity = scoreHoursSpecificity(place?.openingHours);

    return {
      source: "content_freshness",
      websiteUrl,
      signals: {
        copyright,
        pageDate,
        googlePhotos: {
          count: photosCount,
          hasPhotos: photosCount === null ? null : photosCount > 0,
          // Places Details returns photo references, but not capture/upload dates.
          recency: null,
          reason: photosCount === null ? "Google photo count was not available from this scan." : null
        },
        hoursSpecificity
      },
      pendingSignals: [
        "Google photo dates",
        "Google posts or updates",
        "Q&A activity",
        "Review recency"
      ]
    };
  }
};

function parseCopyrightYear(html) {
  if (!html) {
    return { year: null, age: null, found: false, reason: "Homepage HTML was unavailable for copyright-year detection." };
  }

  const matches = [...String(html).matchAll(/(?:©|&copy;|copyright)[^0-9]{0,30}((?:19|20)\d{2})(?:\s*[-–—]\s*((?:19|20)\d{2}))?/gi)];
  const years = matches.flatMap((match) => [match[1], match[2]].filter(Boolean).map(Number));
  const validYears = years.filter((year) => year >= 1990 && year <= CURRENT_YEAR + 1);
  if (!validYears.length) {
    return { year: null, age: null, found: false, reason: "No copyright year was found on the homepage; this is neutral because many current sites do not show one." };
  }

  const year = Math.max(...validYears);
  return { year, age: Math.max(0, CURRENT_YEAR - year), found: true, reason: null };
}

function parsePageDateSignal(html) {
  if (!html) {
    return { date: null, year: null, age: null, found: false, reason: "Homepage HTML was unavailable for date detection." };
  }

  const meta = findMetaDate(html);
  if (!meta) {
    return { date: null, year: null, age: null, found: false, reason: "No clear updated/published date was found on the homepage; this is neutral unless a date is visible." };
  }

  const date = new Date(meta);
  if (Number.isNaN(date.getTime())) {
    return { date: null, year: null, age: null, found: false, reason: "A page date was present but could not be read confidently, so it was left neutral." };
  }

  const year = date.getFullYear();
  return { date: date.toISOString(), year, age: Math.max(0, CURRENT_YEAR - year), found: true, reason: null };
}

function findMetaDate(html) {
  const patterns = [
    /<meta[^>]+(?:property|name)=["'](?:article:modified_time|og:updated_time|dateModified|lastmod|revised|dc\.date\.modified)["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:article:modified_time|og:updated_time|dateModified|lastmod|revised|dc\.date\.modified)["'][^>]*>/i,
    /<time[^>]+datetime=["']([^"']+)["'][^>]*>/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1].trim();
  }

  const visible = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  const visibleMatch = visible.match(/(?:last\s+updated|updated|modified)[^0-9]{0,30}((?:19|20)\d{2}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.](?:19|20)\d{2}|[a-z]+\s+\d{1,2},?\s+(?:19|20)\d{2})/i);
  return visibleMatch?.[1]?.trim() || null;
}

function scoreHoursSpecificity(openingHours) {
  const weekdayText = openingHours?.weekdayText;
  if (Array.isArray(weekdayText) && weekdayText.length >= 5) {
    return { value: "specific_hours", score: 100, reason: null };
  }
  if (Array.isArray(weekdayText) && weekdayText.length > 0) {
    return { value: "partial_hours", score: 75, reason: "Some business hours were available, but the weekly schedule looked incomplete." };
  }
  if (typeof openingHours?.openNow === "boolean") {
    return { value: "open_now_only", score: 55, reason: "Google showed open-now status, but not a full weekly schedule." };
  }
  return { value: "missing_hours", score: 0, reason: "No specific business hours were available from Google Places." };
}
