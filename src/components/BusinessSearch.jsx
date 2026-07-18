"use client";

import { useMemo, useState } from "react";

const DEFAULT_INDUSTRY = "Other Local Business";

// In-app scan version: resolves Google Places candidates server-side, then runs the existing StreetSignal audit pipeline.
export function BusinessSearch({ onAuditComplete }) {
  const [businessName, setBusinessName] = useState("");
  const [location, setLocation] = useState("");
  const [coordinates, setCoordinates] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [hint, setHint] = useState("");
  const [status, setStatus] = useState("idle");
  const [locationStatus, setLocationStatus] = useState("Location not added");

  const query = useMemo(() => {
    return [businessName.trim(), location.trim(), coordinates].filter(Boolean).join(" ");
  }, [businessName, location, coordinates]);

  const encodedQuery = encodeURIComponent(query);
  const mapsUrl = query ? `https://www.google.com/maps/search/?api=1&query=${encodedQuery}` : "#";
  const webUrl = query ? `https://www.google.com/search?q=${encodedQuery}` : "#";
  const busy = status === "resolving" || status === "auditing";

  async function handleSubmit(event) {
    event.preventDefault();
    await resolveCandidates();
  }

  async function resolveCandidates() {
    if (!businessName.trim()) {
      setHint("Enter a business name first.");
      return;
    }

    setStatus("resolving");
    setHint("Finding matching businesses...");
    setCandidates([]);

    try {
      const response = await fetch("/api/places/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "candidates",
          businessName: businessName.trim(),
          city: location.trim(),
          coordinates
        })
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok || !body.ok) {
        setStatus("error");
        setHint(messageForPlacesStatus(response.status));
        return;
      }

      const nextCandidates = body.candidates || [];
      if (nextCandidates.length === 0) {
        setStatus("error");
        setHint("No business found. Check the name or city and try again.");
        return;
      }

      if (nextCandidates.length === 1) {
        await runAudit(nextCandidates[0]);
        return;
      }

      setCandidates(nextCandidates);
      setStatus("selecting");
      setHint("Pick the matching business to run the checkup.");
    } catch {
      setStatus("error");
      setHint("StreetSignal could not start the checkup. Try again in a moment.");
    }
  }

  async function runAudit(candidate) {
    setStatus("auditing");
    setHint(`Running StreetSignal checks for ${candidate.name}...`);

    try {
      const response = await fetch("/api/places/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId: candidate.placeId,
          businessName: candidate.name,
          city: location.trim(),
          industry: DEFAULT_INDUSTRY
        })
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok || !body.ok) {
        setStatus("error");
        setHint(messageForPlacesStatus(response.status));
        return;
      }

      const websiteAuditResult = await scanWebsiteForPlace(body.place);
      onAuditComplete?.(formDataFromPlacesResult(body, websiteAuditResult.audit));
      setStatus("success");
      setHint("Snapshot ready.");
      setCandidates([]);
    } catch {
      setStatus("error");
      setHint("StreetSignal could not finish this checkup. Try again in a moment.");
    }
  }

  async function scanWebsiteForPlace(place) {
    try {
      const response = await fetch("/api/website/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ place })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.ok) return unavailableWebsiteAudit(place, body.error?.message);
      return { ok: true, audit: body.audit };
    } catch {
      return unavailableWebsiteAudit(place, "Website scan could not run this time.");
    }
  }

  function useCurrentLocation() {
    setHint("");

    if (!navigator.geolocation) {
      setLocationStatus("Location is not supported on this browser.");
      return;
    }

    setLocationStatus("Requesting location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(5);
        const lng = position.coords.longitude.toFixed(5);
        setCoordinates(`${lat},${lng}`);
        setLocationStatus("Location added to the checkup search.");
      },
      () => {
        setCoordinates("");
        setLocationStatus("Location permission denied. Search still works without it.");
      },
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 8000 }
    );
  }

  return (
    <form className="mt-6 rounded-lg border border-white/15 bg-surface p-4 text-ink shadow-soft sm:p-5" onSubmit={handleSubmit}>
      <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_minmax(190px,auto)] lg:items-end">
        <label className="block text-sm font-black text-ink">
          Business
          <input
            className="input mt-2 min-h-12"
            placeholder="Search a business - name + city"
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
          />
        </label>

        <label className="block text-sm font-black text-ink">
          City or area
          <input
            className="input mt-2 min-h-12"
            placeholder="Optional"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          />
        </label>

        <button className="primary-button min-h-12 w-full whitespace-nowrap lg:w-auto" type="submit" disabled={busy} aria-busy={busy}>
          {status === "resolving" ? "Finding matches..." : status === "auditing" ? "Running checkup..." : "Run my free checkup"}
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="min-h-11 rounded-md border border-line bg-paper px-4 py-2 text-sm font-black text-ink transition hover:border-brand hover:text-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            type="button"
            aria-describedby="location-status"
            onClick={useCurrentLocation}
          >
            Use my location
          </button>
          {query && (
            <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-600">
              <a className="hover:text-brand" href={mapsUrl} target="_blank" rel="noopener noreferrer">Check Google Maps</a>
              <a className="hover:text-brand" href={webUrl} target="_blank" rel="noopener noreferrer">Search web</a>
            </div>
          )}
        </div>

        <div className="min-h-6 text-sm font-semibold leading-6 text-slate-600" aria-live="polite">
          {hint || <span id="location-status">{locationStatus}</span>}
        </div>
      </div>

      {candidates.length > 0 && (
        <div className="mt-4 rounded-lg border border-line bg-nested-surface p-3 sm:p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Choose a match</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {candidates.map((candidate) => (
              <button
                key={candidate.placeId}
                className="min-h-20 rounded-md border border-line bg-surface p-3 text-left transition hover:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
                type="button"
                onClick={() => runAudit(candidate)}
                disabled={busy}
              >
                <span className="block font-black text-ink">{candidate.name}</span>
                <span className="mt-1 block text-sm leading-5 text-slate-600">{candidate.address}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}

function formDataFromPlacesResult(result, websiteAudit) {
  const prospect = result.prospect;
  return {
    businessName: prospect.businessName,
    city: prospect.city || result.place?.address || "",
    industry: prospect.industry || DEFAULT_INDUSTRY,
    websiteStatus: prospect.website.status,
    mobileFriendly: prospect.website.mobileFriendly,
    loadsFast: prospect.website.loadsFast,
    hasSsl: prospect.website.hasSsl,
    gbpClaimed: prospect.googleBusinessProfile.claimed,
    gbpHours: prospect.googleBusinessProfile.hoursListed,
    gbpPhotos: prospect.googleBusinessProfile.photosPresent,
    gbpDescription: prospect.googleBusinessProfile.descriptionFilled,
    gbpPrimaryCategory: prospect.googleBusinessProfile.primaryCategorySet,
    hoursAccurate: prospect.accuracy.hoursAccurate,
    phoneAccurate: prospect.accuracy.phoneAccurate,
    addressAccurate: prospect.accuracy.addressAccurate,
    servicesAccurate: prospect.accuracy.servicesAccurate,
    averageRating: prospect.reviews.averageRating,
    reviewCount: prospect.reviews.count,
    mapsTopThree: prospect.localVisibility.mapsTopThree,
    menuAccurate: prospect.ordering.menuAccurate,
    deliveryAppsListed: prospect.ordering.deliveryAppsListed,
    deliveryItemsHavePhotos: prospect.ordering.deliveryItemsHavePhotos,
    onlineOrderingWorks: prospect.ordering.onlineOrderingWorks,
    clickToCall: prospect.contact.clickToCall,
    quoteForm: prospect.contact.quoteForm,
    repliesFast: prospect.contact.repliesFast,
    dataSource: "google_places",
    googlePlaces: result.place,
    placesScoreBreakdown: result.scoreBreakdown,
    websiteAudit
  };
}

function unavailableWebsiteAudit(place, reason) {
  return {
    ok: false,
    audit: {
      status: "scan_unavailable",
      websiteUrl: place?.website || null,
      reason: reason || "Website scan could not run this time."
    }
  };
}

function messageForPlacesStatus(status) {
  if (status === 400) return "Enter a business name and city or area, then try again.";
  if (status === 404) return "No business found. Check the name or location and try again.";
  if (status === 429) return "Google is rate-limiting scans right now. Wait a moment and retry.";
  if (status === 503) return "Scanning is temporarily unavailable. Try again later.";
  if (status === 502) return "Google did not respond. Retry in a moment.";
  return "StreetSignal could not run this checkup. Try again in a moment.";
}

