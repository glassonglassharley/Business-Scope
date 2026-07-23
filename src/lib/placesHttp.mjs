// Shared low-level HTTP helper for Google Maps-platform APIs. Used by the
// public single-business scan (prospectData.js) and the private discovery
// layer so there is one Places integration, not two.

export async function fetchJson(url) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, error: data.error_message || `Google Places HTTP ${response.status}` };
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error?.message || "Google Places request failed." };
  }
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
