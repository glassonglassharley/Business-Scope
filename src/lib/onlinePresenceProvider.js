const YELP_TIMEOUT_MS = 5500;
const MAX_YELP_BYTES = 120_000;
const YELP_API_ORIGIN = "https://api.yelp.com";

/**
 * OnlinePresenceProvider reuses data already collected by the Places and website
 * scans, then optionally checks Yelp server-side when YELP_API_KEY is available.
 */
export const OnlinePresenceProvider = {
  async fromExistingData({ place = {}, websiteNap = null } = {}) {
    const websiteNapSignal = normalizeWebsiteNapSignal(websiteNap);
    const yelpSignal = await fetchYelpPresence(place);

    return {
      status: "measured",
      sources: {
        websiteNap: websiteNapSignal,
        yelp: yelpSignal,
        bing: pendingSignal("Bing local presence is pending; this scanner does not fetch Bing yet."),
        apple: pendingSignal("Apple Maps presence is pending; this scanner does not fetch Apple Maps yet."),
        facebook: pendingSignal("Facebook business-page presence is pending; this scanner does not fetch Facebook yet.")
      }
    };
  }
};

function normalizeWebsiteNapSignal(nap) {
  return {
    status: nap ? "measured" : "pending",
    phoneMatches: nap?.phoneMatches ?? null,
    addressMatches: nap?.addressMatches ?? null,
    reason: nap?.reason || (nap ? null : "Website NAP was not available from this scan.")
  };
}

async function fetchYelpPresence(place) {
  const apiKey = process.env.YELP_API_KEY;
  if (!apiKey) return skippedYelp("Yelp check skipped because YELP_API_KEY is not set.");
  if (!place?.name) return skippedYelp("Yelp check skipped because the Google listing did not include a business name.");

  const matchParams = yelpMatchParams(place);
  const matchResult = matchParams
    ? await fetchYelpBusinesses("/v3/businesses/matches", matchParams, apiKey)
    : { ok: false, soft: true, reason: "Google address was not specific enough for Yelp Business Match." };

  const businesses = matchResult.ok ? matchResult.businesses : [];
  const fallbackResult = businesses.length ? null : await fetchYelpBusinesses("/v3/businesses/search", yelpSearchParams(place), apiKey);
  const candidates = businesses.length ? businesses : fallbackResult?.ok ? fallbackResult.businesses : [];
  const source = businesses.length ? "business_match" : fallbackResult?.ok ? "search" : "unavailable";

  if (!matchResult.ok && !matchResult.soft && !fallbackResult?.ok) {
    return skippedYelp(matchResult.reason || fallbackResult?.reason || "Yelp could not be checked this time.");
  }

  if (!candidates.length) {
    return {
      status: "not_found",
      source,
      found: null,
      nameMatches: null,
      addressMatches: null,
      phoneMatches: null,
      reason: "No confident Yelp match was found. This is neutral because many legitimate local businesses are not listed on Yelp."
    };
  }

  const best = chooseConfidentYelpMatch(candidates, place);
  if (!best) {
    return {
      status: "ambiguous",
      source,
      found: null,
      nameMatches: null,
      addressMatches: null,
      phoneMatches: null,
      reason: "Yelp returned possible matches, but none were confident enough to score. This stays neutral instead of guessing."
    };
  }

  const nameMatches = namesLookSimilar(place.name, best.name) ? true : null;
  const addressMatches = addressesLookSimilar(place.address, yelpAddress(best)) ? true : null;
  const phoneMatches = phonesMatch(place.phone, best.phone || best.display_phone) ? true : null;

  return {
    status: "measured",
    source,
    found: true,
    nameMatches,
    addressMatches,
    phoneMatches,
    listing: {
      id: best.id || null,
      name: best.name || null,
      address: yelpAddress(best) || null,
      phone: best.phone || best.display_phone || null,
      url: best.url || null
    },
    reason: null
  };
}

async function fetchYelpBusinesses(path, params, apiKey) {
  try {
    const url = new URL(path, YELP_API_ORIGIN);
    if (url.protocol !== "https:" || url.origin !== YELP_API_ORIGIN) {
      return { ok: false, reason: "Blocked unexpected Yelp URL." };
    }
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") url.searchParams.set(key, String(value));
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), YELP_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        cache: "no-store",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          authorization: `Bearer ${apiKey}`,
          accept: "application/json"
        }
      });
      if (response.status >= 300 && response.status < 400) {
        return { ok: false, reason: "Yelp redirected unexpectedly, so the check was skipped." };
      }
      const json = await readJsonWithLimit(response, MAX_YELP_BYTES);
      if (!response.ok) {
        return {
          ok: false,
          reason: response.status === 429 ? "Yelp rate limit reached. This check was skipped for now." : json.error?.description || `Yelp returned HTTP ${response.status}.`
        };
      }
      return { ok: true, businesses: Array.isArray(json.businesses) ? json.businesses : [] };
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    return { ok: false, reason: error?.name === "AbortError" ? "Yelp timed out. This check was skipped for now." : "Yelp could not be reached for this scan." };
  }
}

async function readJsonWithLimit(response, limit) {
  if (!response.body) {
    const text = await response.text();
    return parseJson(text.slice(0, limit));
  }

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      chunks.push(value.slice(0, Math.max(0, value.byteLength - (total - limit))));
      await reader.cancel();
      break;
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0));
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return parseJson(new TextDecoder("utf-8", { fatal: false }).decode(bytes));
}

function parseJson(text) {
  try {
    return JSON.parse(text || "{}");
  } catch {
    return {};
  }
}

function yelpMatchParams(place) {
  const parsed = parseGoogleAddress(place.address);
  if (!parsed.address1 || !parsed.city || !parsed.state || !parsed.country) return null;
  return {
    name: sanitizeYelpValue(place.name, 64),
    address1: sanitizeYelpValue(parsed.address1, 64),
    city: sanitizeYelpValue(parsed.city, 64),
    state: sanitizeYelpValue(parsed.state, 3),
    country: sanitizeYelpValue(parsed.country, 2),
    postal_code: sanitizeYelpValue(parsed.postalCode, 12),
    phone: yelpPhone(place.phone),
    limit: 3,
    match_threshold: "strict"
  };
}

function yelpSearchParams(place) {
  return {
    term: place.name,
    location: place.address || place.name,
    limit: 3
  };
}

function parseGoogleAddress(address) {
  const parts = String(address || "").split(",").map((part) => part.trim()).filter(Boolean);
  const region = parts[2] || "";
  const regionMatch = region.match(/\b([A-Z]{2})\b(?:\s+(\d{5}(?:-\d{4})?))?/);
  return {
    address1: parts[0] || "",
    city: parts[1] || "",
    state: regionMatch?.[1] || "",
    postalCode: regionMatch?.[2] || "",
    country: (parts[3] || "US").slice(0, 2).toUpperCase()
  };
}

function chooseConfidentYelpMatch(candidates, place) {
  const scored = candidates
    .map((candidate) => ({ candidate, score: yelpCandidateScore(candidate, place) }))
    .sort((a, b) => b.score - a.score);
  return scored[0]?.score >= 2 ? scored[0].candidate : null;
}

function yelpCandidateScore(candidate, place) {
  return [
    namesLookSimilar(place.name, candidate.name),
    addressesLookSimilar(place.address, yelpAddress(candidate)),
    phonesMatch(place.phone, candidate.phone || candidate.display_phone)
  ].filter(Boolean).length;
}

function namesLookSimilar(a, b) {
  const left = normalizeText(a);
  const right = normalizeText(b);
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

function addressesLookSimilar(a, b) {
  const left = addressTokens(a);
  const normalizedRight = normalizeText(b);
  if (!left.length || !normalizedRight) return false;
  return left.filter((part) => normalizedRight.includes(part)).length >= Math.min(2, left.length);
}

function phonesMatch(a, b) {
  const left = digitsOnly(a).slice(-10);
  const right = digitsOnly(b).slice(-10);
  return Boolean(left && right && left === right);
}

function yelpAddress(business) {
  return [
    ...(business.location?.display_address || []),
    business.location?.city,
    business.location?.state,
    business.location?.zip_code
  ].filter(Boolean).join(", ");
}

function addressTokens(address) {
  return normalizeText(address)
    .split(/[\s,]+/)
    .filter((part) => part.length >= 3 && !["usa", "united", "states"].includes(part))
    .slice(0, 6);
}

function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function digitsOnly(value) {
  return String(value || "").replace(/\D+/g, "");
}

function yelpPhone(value) {
  const digits = digitsOnly(value);
  return digits ? `+${digits}` : "";
}

function sanitizeYelpValue(value, maxLength) {
  return String(value || "").slice(0, maxLength);
}

function pendingSignal(reason) {
  return { status: "pending", value: null, reason };
}

function skippedYelp(reason) {
  return {
    status: "skipped",
    source: "yelp",
    found: null,
    nameMatches: null,
    addressMatches: null,
    phoneMatches: null,
    reason
  };
}
