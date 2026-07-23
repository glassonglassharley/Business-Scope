// Share links encode ONLY the whitelisted public report — never the raw
// audit object. buildPublicReport is the single serialization gate.
import { buildPublicReport } from "./publicReport.js";

export function encodeAuditForUrl(audit) {
  const json = JSON.stringify(buildPublicReport(audit));
  const utf8 = encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, value) =>
    String.fromCharCode(Number.parseInt(value, 16))
  );
  return btoa(utf8);
}

export function decodeAuditFromUrl(href) {
  try {
    const url = new URL(href);
    const payload = url.searchParams.get("report");
    if (!payload) return null;

    const binary = atob(payload);
    const escaped = [...binary]
      .map((character) => `%${character.charCodeAt(0).toString(16).padStart(2, "0")}`)
      .join("");
    return JSON.parse(decodeURIComponent(escaped));
  } catch {
    return null;
  }
}
