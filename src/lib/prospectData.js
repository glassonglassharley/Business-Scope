export function getProspectData(businessName, city, industry, manualInputs) {
  return ManualInputProvider.getProspectData(businessName, city, industry, manualInputs);
}

export const ManualInputProvider = {
  getProspectData(businessName, city, industry, inputs) {
    return {
      businessName,
      city,
      industry,
      dataSource: inputs.dataSource || "manual",
      googlePlaces: inputs.googlePlaces || null,
      placesScoreBreakdown: inputs.placesScoreBreakdown || null,
      websiteAudit: inputs.websiteAudit || null,
      website: {
        status: inputs.websiteStatus,
        mobileFriendly: inputs.mobileFriendly,
        loadsFast: inputs.loadsFast,
        hasSsl: inputs.hasSsl
      },
      googleBusinessProfile: {
        claimed: inputs.gbpClaimed,
        hoursListed: inputs.gbpHours,
        photosPresent: inputs.gbpPhotos,
        descriptionFilled: inputs.gbpDescription,
        primaryCategorySet: inputs.gbpPrimaryCategory
      },
      accuracy: {
        hoursAccurate: Boolean(inputs.hoursAccurate),
        phoneAccurate: Boolean(inputs.phoneAccurate),
        addressAccurate: Boolean(inputs.addressAccurate),
        servicesAccurate: Boolean(inputs.servicesAccurate)
      },
      reviews: {
        averageRating: Number(inputs.averageRating),
        count: Number(inputs.reviewCount)
      },
      localVisibility: {
        mapsTopThree: inputs.mapsTopThree
      },
      ordering: {
        menuAccurate: Boolean(inputs.menuAccurate),
        deliveryAppsListed: Boolean(inputs.deliveryAppsListed),
        deliveryItemsHavePhotos: Boolean(inputs.deliveryItemsHavePhotos),
        onlineOrderingWorks: Boolean(inputs.onlineOrderingWorks)
      },
      contact: {
        clickToCall: inputs.clickToCall,
        quoteForm: inputs.quoteForm,
        repliesFast: inputs.repliesFast
      }
    };
  }
};

export const GooglePlacesProvider = {
  async getProspectData({ businessName, city, industry, placeId } = {}) {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return providerError("missing_api_key", "GOOGLE_PLACES_API_KEY is not set. Add it server-side to enable real Google Places scans.");
    }

    const lookup = placeId ? { ok: true, placeId } : await findPlaceId({ apiKey, businessName, city });
    if (!lookup.ok) return lookup;

    const resolvedPlaceId = lookup.placeId;
    if (!resolvedPlaceId) {
      return providerError("not_found", "No matching Google Places listing was found.");
    }

    const details = await fetchPlaceDetails({ apiKey, placeId: resolvedPlaceId });
    if (!details.ok) return details;

    const normalized = normalizePlace(details.place, { businessName, city, industry });
    return {
      ok: true,
      source: "google_places",
      prospect: placesToProspect(normalized, { businessName, city, industry }),
      place: normalized,
      error: null
    };
  }
};

async function findPlaceId({ apiKey, businessName, city }) {
  const input = [businessName, city].filter(Boolean).join(" ").trim();
  if (!input) return providerError("bad_request", "Business name or place_id is required for Google Places lookup.");

  const url = new URL("https://maps.googleapis.com/maps/api/place/findplacefromtext/json");
  url.searchParams.set("input", input);
  url.searchParams.set("inputtype", "textquery");
  url.searchParams.set("fields", "place_id");
  url.searchParams.set("key", apiKey);

  const body = await fetchJson(url);
  if (!body.ok) return providerError("api_error", body.error);
  if (body.data.status === "ZERO_RESULTS") return { ok: true, placeId: null };
  if (body.data.status === "OVER_QUERY_LIMIT" || body.data.status === "RESOURCE_EXHAUSTED") {
    return providerError("rate_limited", "Google Places rate limit reached. Try again later.");
  }
  if (body.data.status !== "OK") {
    return providerError("api_error", body.data.error_message || `Google Places Find Place failed: ${body.data.status}`);
  }

  return { ok: true, placeId: body.data.candidates?.[0]?.place_id || null };
}

async function fetchPlaceDetails({ apiKey, placeId }) {
  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", [
    "place_id",
    "name",
    "formatted_address",
    "formatted_phone_number",
    "international_phone_number",
    "website",
    "business_status",
    "opening_hours",
    "rating",
    "user_ratings_total",
    "types",
    "photos"
  ].join(","));
  url.searchParams.set("key", apiKey);

  const body = await fetchJson(url);
  if (!body.ok) return providerError("api_error", body.error);
  if (body.data.status === "NOT_FOUND" || body.data.status === "ZERO_RESULTS") {
    return providerError("not_found", "Google Places could not find that listing.");
  }
  if (body.data.status === "OVER_QUERY_LIMIT" || body.data.status === "RESOURCE_EXHAUSTED") {
    return providerError("rate_limited", "Google Places rate limit reached. Try again later.");
  }
  if (body.data.status !== "OK") {
    return providerError("api_error", body.data.error_message || `Google Places Details failed: ${body.data.status}`);
  }

  return { ok: true, place: body.data.result };
}

async function fetchJson(url) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, error: data.error_message || `Google Places HTTP ${response.status}` };
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error?.message || "Google Places request failed." };
  }
}

function normalizePlace(place = {}, fallback = {}) {
  return {
    placeId: place.place_id || null,
    name: place.name || fallback.businessName || null,
    address: place.formatted_address || null,
    phone: place.international_phone_number || place.formatted_phone_number || null,
    website: place.website || null,
    businessStatus: place.business_status || null,
    openingHours: place.opening_hours
      ? {
          openNow: place.opening_hours.open_now ?? null,
          weekdayText: place.opening_hours.weekday_text || null
        }
      : null,
    rating: typeof place.rating === "number" ? place.rating : null,
    reviewCount: typeof place.user_ratings_total === "number" ? place.user_ratings_total : null,
    types: Array.isArray(place.types) ? place.types : [],
    photosCount: Array.isArray(place.photos) ? place.photos.length : null,
    claimedOrVerified: null
  };
}

function placesToProspect(place, fallback = {}) {
  const hasHours = Boolean(place.openingHours?.weekdayText?.length || typeof place.openingHours?.openNow === "boolean");
  const hasPhone = Boolean(place.phone);
  const hasAddress = Boolean(place.address);
  const hasWebsite = Boolean(place.website);
  const hasPhotos = typeof place.photosCount === "number" ? place.photosCount > 0 : null;
  const hasCategory = place.types.length > 0;

  return {
    businessName: place.name || fallback.businessName || "Unknown business",
    city: fallback.city || "",
    industry: fallback.industry || "Other Local Business",
    dataSource: "google_places",
    googlePlaces: place,
    website: {
      status: hasWebsite ? "exists-but-outdated" : "none",
      mobileFriendly: false,
      loadsFast: false,
      hasSsl: place.website?.startsWith("https://") || false
    },
    googleBusinessProfile: {
      claimed: place.claimedOrVerified === true,
      hoursListed: hasHours,
      photosPresent: hasPhotos === true,
      descriptionFilled: false,
      primaryCategorySet: hasCategory
    },
    accuracy: {
      hoursAccurate: hasHours,
      phoneAccurate: hasPhone,
      addressAccurate: hasAddress,
      servicesAccurate: hasCategory
    },
    reviews: {
      averageRating: place.rating ?? 0,
      count: place.reviewCount ?? 0
    },
    localVisibility: {
      mapsTopThree: false
    },
    ordering: {
      menuAccurate: false,
      deliveryAppsListed: false,
      deliveryItemsHavePhotos: false,
      onlineOrderingWorks: false
    },
    contact: {
      clickToCall: hasPhone,
      quoteForm: false,
      repliesFast: false
    }
  };
}

function providerError(code, message) {
  return {
    ok: false,
    source: "google_places",
    prospect: null,
    place: null,
    error: { code, message }
  };
}