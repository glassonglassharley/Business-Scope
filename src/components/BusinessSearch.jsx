"use client";

import { useMemo, useState } from "react";

const DEFAULT_INDUSTRY = "Other Local Business";
const EMPTY_FORM = { businessName: "", location: "" };
const PROGRESS_STEPS = [
  "Finding the business",
  "Checking public profiles",
  "Comparing contact information",
  "Testing customer-action links",
  "Preparing priorities"
];

export function BusinessSearch({ onAuditComplete, variant = "hero" }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [coordinates, setCoordinates] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");
  const [locationStatus, setLocationStatus] = useState("");

  const query = useMemo(() => {
    return [form.businessName.trim(), form.location.trim(), coordinates].filter(Boolean).join(" ");
  }, [form.businessName, form.location, coordinates]);

  const encodedQuery = encodeURIComponent(query);
  const mapsUrl = query ? `https://www.google.com/maps/search/?api=1&query=${encodedQuery}` : "#";
  const webUrl = query ? `https://www.google.com/search?q=${encodedQuery}` : "#";
  const busy = status === "searching" || status === "scanning";
  const hasSelection = Boolean(selectedCandidate);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  }

  function validate() {
    const nextErrors = {};
    if (!form.businessName.trim()) nextErrors.businessName = "Enter the business name customers would search for.";
    if (!form.location.trim() && !coordinates) nextErrors.location = "Add a city, neighborhood, or service area so StreetSignal can find the correct listing.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setStatus("validation_error");
      setMessage("Add the missing information and try again.");
      return false;
    }
    return true;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (hasSelection) {
      await runAudit(selectedCandidate);
      return;
    }
    await resolveCandidates();
  }

  async function resolveCandidates() {
    if (!validate()) return;
    setStatus("searching");
    setMessage("Searching public business listings. Confirm the right location before the checkup runs.");
    setCandidates([]);
    setSelectedCandidate(null);

    try {
      const response = await fetch("/api/places/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "candidates",
          businessName: form.businessName.trim(),
          city: form.location.trim(),
          coordinates
        })
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok || !body.ok) {
        setStatus(statusFromHttp(response.status));
        setMessage(messageForPlacesStatus(response.status));
        return;
      }

      const nextCandidates = body.candidates || [];
      if (nextCandidates.length === 0) {
        setStatus("not_found");
        setMessage("No matching business was found. Try the exact Google listing name, a nearby city, or a service-area keyword.");
        return;
      }

      setCandidates(nextCandidates);
      setStatus(nextCandidates.length > 1 ? "multiple_matches" : "confirmation");
      setMessage(nextCandidates.length > 1 ? "Choose the correct business before StreetSignal runs the checkup." : "Confirm this is the correct business before StreetSignal runs the checkup.");
      if (nextCandidates.length === 1) setSelectedCandidate(nextCandidates[0]);
    } catch {
      setStatus("failed");
      setMessage("StreetSignal could not reach the lookup service. Please try again in a moment.");
    }
  }

  async function runAudit(candidate) {
    if (!candidate) return;
    setStatus("scanning");
    setMessage(`Checking public customer-facing information for ${candidate.name}.`);

    try {
      const response = await fetch("/api/places/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId: candidate.placeId,
          businessName: candidate.name,
          city: form.location.trim() || candidate.address,
          industry: DEFAULT_INDUSTRY
        })
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok || !body.ok) {
        setStatus(statusFromHttp(response.status));
        setMessage(messageForPlacesStatus(response.status));
        return;
      }

      const websiteAuditResult = await scanWebsiteForPlace(body.place);
      onAuditComplete?.(formDataFromPlacesResult(body, websiteAuditResult.audit));
      setStatus(websiteAuditResult.audit?.status === "scan_unavailable" ? "partial_scan" : "success");
      setMessage(websiteAuditResult.audit?.status === "scan_unavailable" ? "Partial checkup ready. Website checks were unavailable, but public profile checks completed." : "Checkup ready. Review the prioritized findings below.");
      setCandidates([]);
      setSelectedCandidate(null);
    } catch {
      setStatus("failed");
      setMessage("StreetSignal could not finish the checkup. No raw provider error was saved. Please try again.");
    }
  }

  async function scanWebsiteForPlace(place) {
    // No listed website is a normal, measurable outcome (WebsiteProvider scores
    // it as a real 0, not an unknown) — always call the API so Technical Health
    // stays part of the free report instead of falling back to "unavailable".
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
      return unavailableWebsiteAudit(place, "Website checks could not run this time.");
    }
  }

  function useCurrentLocation() {
    setMessage("");
    if (!navigator.geolocation) {
      setStatus("geolocation_denied");
      setLocationStatus("Your browser does not support location lookup. You can still enter a city or area.");
      return;
    }

    setLocationStatus("Asking your browser for your current area. StreetSignal receives approximate coordinates only if you allow it.");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(5);
        const lng = position.coords.longitude.toFixed(5);
        setCoordinates(`${lat},${lng}`);
        setErrors((current) => ({ ...current, location: "" }));
        setLocationStatus("Current area added to help find the correct business. You still confirm the listing before the scan runs.");
      },
      () => {
        setCoordinates("");
        setStatus("geolocation_denied");
        setLocationStatus("Location permission was denied. Search still works if you enter a city or area.");
      },
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 8000 }
    );
  }

  return (
    <form id="business-search" className={variant === "compact" ? "diagnostic-form compact" : "diagnostic-form"} onSubmit={handleSubmit} noValidate>
      <div className={variant === "compact" ? "grid gap-3 md:grid-cols-2" : "grid gap-3 lg:grid-cols-[1.05fr_0.85fr_auto] lg:items-end"}>
        <label className="field-label" htmlFor="business-search-business">
          Business name
          <input
            id="business-search-business"
            className="input mt-2 min-h-12"
            placeholder="Example: Harbor City Dental"
            value={form.businessName}
            onChange={(event) => update("businessName", event.target.value)}
            aria-invalid={Boolean(errors.businessName)}
            aria-describedby={errors.businessName ? "business-name-error" : undefined}
            autoComplete="organization"
          />
          {errors.businessName && <span id="business-name-error" className="form-error">{errors.businessName}</span>}
        </label>

        <label className="field-label" htmlFor="business-search-location">
          City or area
          <input
            id="business-search-location"
            className="input mt-2 min-h-12"
            placeholder="City, neighborhood, or service area"
            value={form.location}
            onChange={(event) => update("location", event.target.value)}
            aria-invalid={Boolean(errors.location)}
            aria-describedby={errors.location ? "business-location-error" : undefined}
            autoComplete="address-level2"
          />
          {errors.location && <span id="business-location-error" className="form-error">{errors.location}</span>}
        </label>

        <button className={variant === "compact" ? "primary-button min-h-12 w-full whitespace-nowrap md:col-span-2" : "primary-button min-h-12 w-full whitespace-nowrap lg:w-auto"} type="submit" disabled={busy} aria-busy={busy}>
          {buttonLabel(status, hasSelection)}
        </button>
      </div>

      {status === "scanning" && <ScanProgress />}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="secondary-button min-h-11 px-4 py-2 text-sm"
            type="button"
            aria-describedby={locationStatus ? "location-status" : undefined}
            onClick={useCurrentLocation}
            disabled={busy}
          >
            Use my current area to find the correct business
          </button>
          {query && (
            <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-600">
              <a className="link" href={mapsUrl} target="_blank" rel="noopener noreferrer">Open this search in Google Maps</a>
              <a className="link" href={webUrl} target="_blank" rel="noopener noreferrer">Search the web for this business</a>
            </div>
          )}
        </div>

        {(message || locationStatus) && <div className="min-h-6 text-sm font-semibold leading-6 text-slate-700" role="status" aria-live="polite">
          {message || <span id="location-status">{locationStatus}</span>}
        </div>}
      </div>

      {locationStatus && message && <p id="location-status" className="mt-2 text-xs leading-5 text-slate-600">{locationStatus}</p>}

      {(candidates.length > 0 || selectedCandidate) && (
        <div className="mt-4 rounded-xl border border-line bg-nested-surface p-3 sm:p-4">
          <p className="eyebrow">Business confirmation</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {(candidates.length ? candidates : [selectedCandidate]).filter(Boolean).map((candidate) => {
              const active = selectedCandidate?.placeId === candidate.placeId;
              return (
                <button
                  key={candidate.placeId}
                  className={`confirmation-card ${active ? "active" : ""}`}
                  type="button"
                  onClick={() => {
                    setSelectedCandidate(candidate);
                    setStatus("confirmation");
                    setMessage("Confirm this listing, then run the checkup.");
                  }}
                  disabled={busy}
                  aria-pressed={active}
                >
                  <span className="block text-base font-black text-ink">{candidate.name}</span>
                  <span className="mt-1 block text-sm leading-5 text-slate-700">{candidate.address || "Address not shown"}</span>
                  <span className="mt-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{formatBusinessMeta(candidate)}</span>
                </button>
              );
            })}
          </div>
          {selectedCandidate && (
            <div className="mt-4 flex flex-col gap-2 rounded-lg border border-line bg-surface p-3 text-sm leading-6 text-slate-700 sm:flex-row sm:items-center sm:justify-between">
              <span><strong className="text-ink">Selected:</strong> {selectedCandidate.name} — {selectedCandidate.address || "address not shown"}</span>
              <button className="primary-button w-full sm:w-auto" type="button" onClick={() => runAudit(selectedCandidate)} disabled={busy}>Confirm and run checkup</button>
            </div>
          )}
        </div>
      )}

      {status === "not_found" && <StateNote tone="amber" title="Business not found" body="Try the full Google listing name, add the city, or use the current-area option. Service-area businesses may appear without a public address." />}
      {status === "rate_limited" && <StateNote tone="red" title="Scan temporarily limited" body="The lookup provider is rate-limiting requests. Please wait and retry; StreetSignal will not show raw provider errors to customers." />}
      {status === "geolocation_denied" && <StateNote tone="amber" title="Location not used" body="You can still run the checkup by entering a city, neighborhood, or service area." />}
      {status === "failed" && <StateNote tone="red" title="Checkup could not run" body="The public lookup service did not complete. No listing access or password is required; please retry in a moment." />}
    </form>
  );
}

function ScanProgress() {
  return (
    <div className="mt-4 rounded-xl border border-line bg-paper p-4" aria-label="Checkup progress">
      <p className="text-sm font-black text-ink">Preparing a diagnostic report. This is a processing state, not a fake percentage.</p>
      <ol className="mt-3 grid gap-2 sm:grid-cols-5">
        {PROGRESS_STEPS.map((step) => (
          <li key={step} className="flex items-center gap-2 text-xs font-bold leading-5 text-slate-700 sm:block">
            <span className="status-dot bg-brand" aria-hidden="true" />
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}

function StateNote({ tone, title, body }) {
  return (
    <div className={`mt-4 rounded-xl border p-4 text-sm leading-6 ${tone === "red" ? "border-signal-red/30 bg-signal-red/10" : "border-signal-amber/40 bg-signal-amber/10"}`}>
      <p className="font-black text-ink">{title}</p>
      <p className="mt-1 text-slate-700">{body}</p>
    </div>
  );
}

function buttonLabel(status, hasSelection) {
  if (status === "searching") return "Finding matches...";
  if (status === "scanning") return "Running checkup...";
  if (hasSelection) return "Run checkup for this business";
  return "Check my business free";
}

function statusFromHttp(status) {
  if (status === 404) return "not_found";
  if (status === 429) return "rate_limited";
  if (status === 503) return "failed";
  return "failed";
}

function formatBusinessMeta(candidate) {
  if (candidate.businessStatus === "CLOSED_PERMANENTLY") return "Closed business";
  if (candidate.businessStatus === "CLOSED_TEMPORARILY") return "Temporarily closed";
  if (candidate.types?.includes("point_of_interest") && !candidate.address) return "Service-area or listing-only business";
  return (candidate.types || []).slice(0, 2).map((type) => type.replaceAll("_", " ")).join(" · ") || "Public listing";
}

function formDataFromPlacesResult(result, websiteAudit) {
  const scan = result.scan;
  return {
    businessName: scan.businessName,
    city: scan.city || result.place?.address || "",
    industry: scan.industry || DEFAULT_INDUSTRY,
    websiteStatus: scan.website.status,
    mobileFriendly: scan.website.mobileFriendly,
    loadsFast: scan.website.loadsFast,
    hasSsl: scan.website.hasSsl,
    gbpClaimed: scan.googleBusinessProfile.claimed,
    gbpHours: scan.googleBusinessProfile.hoursListed,
    gbpPhotos: scan.googleBusinessProfile.photosPresent,
    gbpDescription: scan.googleBusinessProfile.descriptionFilled,
    gbpPrimaryCategory: scan.googleBusinessProfile.primaryCategorySet,
    hoursAccurate: scan.accuracy.hoursAccurate,
    phoneAccurate: scan.accuracy.phoneAccurate,
    addressAccurate: scan.accuracy.addressAccurate,
    servicesAccurate: scan.accuracy.servicesAccurate,
    averageRating: scan.reviews.averageRating,
    reviewCount: scan.reviews.count,
    mapsTopThree: scan.localVisibility.mapsTopThree,
    menuAccurate: scan.ordering.menuAccurate,
    deliveryAppsListed: scan.ordering.deliveryAppsListed,
    deliveryItemsHavePhotos: scan.ordering.deliveryItemsHavePhotos,
    onlineOrderingWorks: scan.ordering.onlineOrderingWorks,
    clickToCall: scan.contact.clickToCall,
    quoteForm: scan.contact.quoteForm,
    repliesFast: scan.contact.repliesFast,
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
      reason: reason || "Website checks could not run this time."
    }
  };
}

function messageForPlacesStatus(status) {
  if (status === 400) return "Enter a business name and city or area, then try again.";
  if (status === 404) return "No matching business was found. Check the name, city, or selected location and try again.";
  if (status === 429) return "The lookup provider is rate-limiting scans right now. Wait a moment and retry.";
  if (status === 503) return "Live public-listing scans are not configured right now. The sample report still shows what StreetSignal checks.";
  if (status === 502) return "A public data source did not respond. Retry in a moment.";
  return "StreetSignal could not run this checkup. Try again in a moment.";
}
