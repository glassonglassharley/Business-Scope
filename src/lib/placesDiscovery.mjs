// Discovery-layer Google API calls: Nearby Search (stage-1 cheap pass),
// contact-fields-only Place Details, and zip geocoding. Extends the same
// legacy Places integration prospectData.js uses — same key, same host, same
// error handling via the shared placesHttp helper. Server-side only.

import { fetchJson } from "./placesHttp.mjs";

const NEARBY_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json";
const DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json";
const GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";

/**
 * One page of Nearby Search (max 20 results). Stage 1 only: Nearby Search
 * returns basic-tier data (name, status, rating, review count, types,
 * location) — no contact fields, which keeps this the cheapest viable pass.
 */
export async function nearbySearchPage({ apiKey, lat, lng, radiusM, keyword, type, pageToken }) {
  const url = new URL(NEARBY_URL);
  if (pageToken) {
    url.searchParams.set("pagetoken", pageToken);
  } else {
    url.searchParams.set("location", `${lat},${lng}`);
    url.searchParams.set("radius", String(Math.round(radiusM)));
    if (type) url.searchParams.set("type", type);
    else if (keyword) url.searchParams.set("keyword", keyword);
  }
  url.searchParams.set("key", apiKey);

  const body = await fetchJson(url);
  if (!body.ok) return { ok: false, code: "api_error", message: body.error };

  const status = body.data.status;
  if (status === "ZERO_RESULTS") return { ok: true, results: [], nextPageToken: null };
  if (status === "OVER_QUERY_LIMIT" || status === "RESOURCE_EXHAUSTED") {
    return { ok: false, code: "rate_limited", message: "Google Places rate limit reached." };
  }
  // A just-issued page token can briefly return INVALID_REQUEST until it
  // becomes valid server-side; the caller retries once after a delay.
  if (status === "INVALID_REQUEST" && pageToken) {
    return { ok: false, code: "page_token_not_ready", message: "Page token not valid yet." };
  }
  if (status !== "OK") {
    return { ok: false, code: "api_error", message: body.data.error_message || `Nearby Search failed: ${status}` };
  }

  return {
    ok: true,
    results: (body.data.results || []).map(normalizeNearbyResult),
    nextPageToken: body.data.next_page_token || null
  };
}

/**
 * Contact fields only. Deliberately excludes atmosphere/expensive tiers —
 * this is still stage 1 (pre-filter + contact_channels population), not the
 * deep scan.
 */
export async function fetchContactDetails({ apiKey, placeId }) {
  const url = new URL(DETAILS_URL);
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "place_id,international_phone_number,formatted_phone_number,website");
  url.searchParams.set("key", apiKey);

  const body = await fetchJson(url);
  if (!body.ok) return { ok: false, code: "api_error", message: body.error };

  const status = body.data.status;
  if (status === "OVER_QUERY_LIMIT" || status === "RESOURCE_EXHAUSTED") {
    return { ok: false, code: "rate_limited", message: "Google Places rate limit reached." };
  }
  if (status === "NOT_FOUND" || status === "ZERO_RESULTS") {
    return { ok: true, phone: null, website: null };
  }
  if (status !== "OK") {
    return { ok: false, code: "api_error", message: body.data.error_message || `Place Details failed: ${status}` };
  }

  const result = body.data.result || {};
  return {
    ok: true,
    phone: result.international_phone_number || result.formatted_phone_number || null,
    website: result.website || null
  };
}

export async function geocodeZip({ apiKey, zip, country = "US" }) {
  const url = new URL(GEOCODE_URL);
  url.searchParams.set("components", `postal_code:${zip}|country:${country}`);
  url.searchParams.set("key", apiKey);

  const body = await fetchJson(url);
  if (!body.ok) return { ok: false, code: "api_error", message: body.error };
  if (body.data.status !== "OK" || !body.data.results?.length) {
    return { ok: false, code: "not_found", message: `Could not geocode zip ${zip}: ${body.data.status}` };
  }

  const location = body.data.results[0].geometry?.location;
  if (!location) return { ok: false, code: "not_found", message: `Zip ${zip} returned no coordinates.` };
  return { ok: true, lat: location.lat, lng: location.lng };
}

function normalizeNearbyResult(result = {}) {
  const vicinity = result.vicinity || null;
  return {
    placeId: result.place_id || null,
    name: result.name || "Unknown business",
    address: vicinity,
    city: vicinity?.includes(",") ? vicinity.split(",").pop().trim() : null,
    lat: result.geometry?.location?.lat ?? null,
    lng: result.geometry?.location?.lng ?? null,
    primaryType: Array.isArray(result.types) ? result.types[0] || null : null,
    types: Array.isArray(result.types) ? result.types : [],
    businessStatus: result.business_status || null,
    rating: typeof result.rating === "number" ? result.rating : null,
    reviewCount: typeof result.user_ratings_total === "number" ? result.user_ratings_total : null
  };
}
