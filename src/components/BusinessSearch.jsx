"use client";

import { useMemo, useState } from "react";

// Free hand-off version: opens Google URLs now; upgrade path is a Google Places API provider later.
export function BusinessSearch() {
  const [businessName, setBusinessName] = useState("");
  const [location, setLocation] = useState("");
  const [coordinates, setCoordinates] = useState("");
  const [hint, setHint] = useState("");
  const [locationStatus, setLocationStatus] = useState("Location not added");

  const query = useMemo(() => {
    return [businessName.trim(), location.trim(), coordinates].filter(Boolean).join(" ");
  }, [businessName, location, coordinates]);

  const encodedQuery = encodeURIComponent(query);
  const mapsUrl = query ? `https://www.google.com/maps/search/?api=1&query=${encodedQuery}` : "#";
  const webUrl = query ? `https://www.google.com/search?q=${encodedQuery}` : "#";

  function requireQuery(event) {
    if (query) {
      setHint("");
      return true;
    }

    event.preventDefault();
    setHint("Enter a business name first.");
    return false;
  }

  function openMaps(event) {
    if (!requireQuery(event)) return;
    window.open(mapsUrl, "_blank", "noopener,noreferrer");
  }

  function handleSubmit(event) {
    event.preventDefault();
    openMaps(event);
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
        setLocationStatus("Location added to Maps search.");
      },
      () => {
        setCoordinates("");
        setLocationStatus("Location permission denied. Search still works without it.");
      },
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 8000 }
    );
  }

  return (
    <form className="mt-6 rounded-lg border border-white/15 bg-surface p-4 text-ink shadow-soft" onSubmit={handleSubmit}>
      <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_auto] lg:items-end">
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

        <button className="primary-button min-h-12 w-full lg:w-auto" type="submit">
          Open in Google Maps
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <a
            className="secondary-button inline-flex min-h-11 items-center justify-center"
            href={webUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={requireQuery}
          >
            Search the web
          </a>
          <button
            className="rounded-md border border-line bg-paper px-4 py-2 text-sm font-black text-ink transition hover:border-brand hover:text-brand"
            type="button"
            aria-describedby="location-status"
            onClick={useCurrentLocation}
          >
            Use my location
          </button>
        </div>

        <div className="text-sm leading-6 text-slate-600" aria-live="polite">
          {hint || <span id="location-status">{locationStatus}</span>}
        </div>
      </div>
    </form>
  );
}