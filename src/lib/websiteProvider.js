import { lookup } from "node:dns/promises";
import net from "node:net";

const REQUEST_TIMEOUT_MS = 5500;
const PSI_TIMEOUT_MS = 7000;
const MAX_HTML_BYTES = 350_000;
const MAX_REDIRECTS = 5;

/**
 * WebsiteProvider audits only the website URL already returned by Google Places.
 * It never re-resolves the business and never accepts a raw user-entered URL.
 */
export const WebsiteProvider = {
  async auditResolvedPlace(place = {}) {
    const websiteUrl = place?.website || null;
    if (!websiteUrl) {
      return {
        ok: true,
        source: "website_audit",
        audit: noWebsiteAudit(place),
        error: null
      };
    }

    const parsed = parsePublicHttpUrl(websiteUrl);
    if (!parsed.ok) return providerError("bad_request", parsed.message);

    const htmlResult = await fetchHtmlWithSafety(parsed.url);
    const psiPromise = fetchPageSpeed(parsed.url.href);
    const psi = await psiPromise;

    const html = htmlResult.html || "";
    const htmlSignals = htmlResult.ok ? parseHtmlSignals(html, parsed.url) : emptyHtmlSignals(htmlResult.error?.message || "Homepage HTML could not be measured.");
    const reachability = buildReachabilitySignal(htmlResult);
    const httpUrl = toHttpUrl(parsed.url);
    const httpRedirect = httpUrl ? await checkHttpToHttpsRedirect(httpUrl) : { value: null, reason: "Website URL is not HTTPS, so HTTP to HTTPS redirect was not checked." };

    return {
      ok: true,
      source: "website_audit",
      audit: {
        status: "measured",
        websiteUrl: parsed.url.href,
        finalUrl: htmlResult.finalUrl || null,
        resolvedHost: parsed.url.hostname,
        reachable: reachability,
        https: {
          servedOverHttps: parsed.url.protocol === "https:",
          validCertificate: parsed.url.protocol === "https:" && reachability.value === true ? true : parsed.url.protocol === "https:" && reachability.value === null ? null : false,
          httpRedirectsToHttps: httpRedirect.value,
          httpRedirectReason: httpRedirect.reason
        },
        html: htmlSignals,
        performance: psi,
        nap: buildNapSignals(html, place)
      },
      error: null
    };
  }
};

function noWebsiteAudit(place) {
  return {
    status: "measured",
    websiteUrl: null,
    finalUrl: null,
    resolvedHost: null,
    reachable: { value: false, status: null, timingMs: null, reason: "Google Places did not return a website URL." },
    https: { servedOverHttps: false, validCertificate: null, httpRedirectsToHttps: null, httpRedirectReason: "No website URL was available to test." },
    html: emptyHtmlSignals("No website URL was available to fetch."),
    performance: skippedPerformance("No website URL was available to test."),
    nap: {
      phoneMatches: null,
      addressMatches: null,
      reason: "No website URL was available to compare against the Google listing."
    }
  };
}

function buildReachabilitySignal(htmlResult) {
  const status = htmlResult.status ?? null;
  const measuredHttpStatus = typeof status === "number";
  const unmeasuredErrorCodes = ["timeout", "fetch_failed", "blocked_url", "too_many_redirects", "bad_redirect"];
  const unmeasured = htmlResult.error?.code && unmeasuredErrorCodes.includes(htmlResult.error.code);
  return {
    value: unmeasured ? null : measuredHttpStatus ? status >= 200 && status < 400 : null,
    status,
    timingMs: htmlResult.timingMs ?? null,
    reason: htmlResult.ok ? null : htmlResult.error?.message || (measuredHttpStatus ? `Website returned HTTP ${status}.` : "Website could not be measured.")
  };
}

function parsePublicHttpUrl(value) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) {
      return { ok: false, message: "Website URL must use http or https." };
    }
    return { ok: true, url };
  } catch {
    return { ok: false, message: "Google Places returned an invalid website URL." };
  }
}

async function fetchHtmlWithSafety(startUrl) {
  let currentUrl = new URL(startUrl.href);
  const started = Date.now();

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const allowed = await assertPublicUrl(currentUrl);
    if (!allowed.ok) return { ok: false, finalUrl: currentUrl.href, error: { code: "blocked_url", message: allowed.message } };

    const response = await fetchWithTimeout(currentUrl, REQUEST_TIMEOUT_MS);
    if (!response.ok) return { ...response, finalUrl: currentUrl.href, timingMs: Date.now() - started };

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) return { ok: false, status: response.status, finalUrl: currentUrl.href, timingMs: Date.now() - started, error: { code: "bad_redirect", message: "Website redirected without a Location header." } };
      currentUrl = new URL(location, currentUrl);
      continue;
    }

    const textResult = await readTextWithLimit(response, MAX_HTML_BYTES);
    return {
      ok: response.status >= 200 && response.status < 400,
      status: response.status,
      finalUrl: currentUrl.href,
      timingMs: Date.now() - started,
      html: textResult.text,
      truncated: textResult.truncated,
      error: textResult.error
    };
  }

  return { ok: false, finalUrl: currentUrl.href, timingMs: Date.now() - started, error: { code: "too_many_redirects", message: "Website redirected too many times." } };
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      redirect: "manual",
      signal: controller.signal,
      headers: { "user-agent": "StreetSignalWebsiteAudit/1.0", accept: "text/html,application/xhtml+xml" }
    });
    return { ok: true, status: response.status, headers: response.headers, response };
  } catch (error) {
    return { ok: false, status: null, error: { code: error?.name === "AbortError" ? "timeout" : "fetch_failed", message: error?.name === "AbortError" ? "Website timed out before it could be measured." : "Website request failed." } };
  } finally {
    clearTimeout(timer);
  }
}

async function readTextWithLimit(fetchResult, limit) {
  const response = fetchResult.response;
  if (!response.body) {
    const text = await response.text().catch(() => "");
    return { text: text.slice(0, limit), truncated: text.length > limit, error: null };
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

  return { text: new TextDecoder("utf-8", { fatal: false }).decode(bytes), truncated: total > limit, error: null };
}

async function assertPublicUrl(url) {
  if (!["http:", "https:"].includes(url.protocol)) return { ok: false, message: "Blocked non-http website URL." };
  const host = url.hostname;
  if (isPrivateHost(host)) return { ok: false, message: "Blocked private or local website host." };

  try {
    const records = await lookup(host, { all: true, verbatim: true });
    if (!records.length) return { ok: false, message: "Website host could not be resolved." };
    if (records.some((record) => isPrivateIp(record.address))) return { ok: false, message: "Blocked website redirect to a private network address." };
  } catch {
    return { ok: false, message: "Website host could not be resolved." };
  }

  return { ok: true };
}

function isPrivateHost(host) {
  const lower = host.toLowerCase();
  return lower === "localhost" || lower.endsWith(".localhost") || isPrivateIp(lower);
}

function isPrivateIp(value) {
  const version = net.isIP(value);
  if (version === 4) {
    const parts = value.split(".").map(Number);
    return parts[0] === 10 || parts[0] === 127 || (parts[0] === 169 && parts[1] === 254) || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168) || parts[0] === 0;
  }
  if (version === 6) {
    const lower = value.toLowerCase();
    return lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80:");
  }
  return false;
}

function parseHtmlSignals(html, url) {
  const titleMatches = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/gi) || [];
  const title = titleMatches[0]?.replace(/<[^>]+>/g, "").trim() || "";
  const description = getMetaContent(html, "description");
  const viewport = getMetaContent(html, "viewport");
  const h1Matches = html.match(/<h1\b[^>]*>/gi) || [];
  const favicon = findFavicon(html, url);

  return {
    titlePresent: Boolean(title),
    titleCount: titleMatches.length,
    metaDescriptionPresent: Boolean(description),
    viewportPresent: Boolean(viewport),
    h1Count: h1Matches.length,
    singleH1: h1Matches.length === 1,
    faviconPresent: Boolean(favicon),
    reason: null
  };
}

function emptyHtmlSignals(reason) {
  return {
    titlePresent: null,
    titleCount: null,
    metaDescriptionPresent: null,
    viewportPresent: null,
    h1Count: null,
    singleH1: null,
    faviconPresent: null,
    reason
  };
}

function getMetaContent(html, name) {
  const pattern = new RegExp(`<meta[^>]+name=["']${name}["'][^>]*>`, "i");
  const match = html.match(pattern)?.[0];
  return match?.match(/content=["']([^"']*)["']/i)?.[1]?.trim() || "";
}

function findFavicon(html, url) {
  const icon = html.match(/<link[^>]+rel=["'][^"']*(icon|shortcut icon)[^"']*["'][^>]*>/i)?.[0];
  const href = icon?.match(/href=["']([^"']*)["']/i)?.[1];
  return href ? new URL(href, url).href : null;
}

function buildNapSignals(html, place) {
  if (!html) return { phoneMatches: null, addressMatches: null, reason: "Homepage HTML was unavailable for NAP comparison." };
  const normalizedHtml = normalizeText(html);
  const phoneDigits = digitsOnly(place?.phone);
  const confirmedPhoneMatch = phoneDigits ? digitsOnly(html).includes(phoneDigits.slice(-10)) : null;
  const addressParts = addressTokens(place?.address);
  const confirmedAddressMatch = addressParts.length ? addressParts.filter((part) => normalizedHtml.includes(part)).length >= Math.min(2, addressParts.length) : null;
  const phoneMatches = confirmedPhoneMatch ? true : null;
  const addressMatches = confirmedAddressMatch ? true : null;

  return {
    phoneMatches,
    addressMatches,
    reason: phoneMatches === null && addressMatches === null ? "Could not confirm Google phone or address on the homepage. This is neutral because the details may live on another page or be rendered differently." : null
  };
}

function addressTokens(address) {
  if (!address) return [];
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

function toHttpUrl(url) {
  if (url.protocol !== "https:") return null;
  const next = new URL(url.href);
  next.protocol = "http:";
  return next;
}

async function checkHttpToHttpsRedirect(httpUrl) {
  const allowed = await assertPublicUrl(httpUrl);
  if (!allowed.ok) return { value: null, reason: allowed.message };
  const result = await fetchWithTimeout(httpUrl, REQUEST_TIMEOUT_MS);
  if (!result.ok) return { value: null, reason: result.error?.message || "HTTP redirect could not be measured." };
  if (![301, 302, 303, 307, 308].includes(result.status)) return { value: false, reason: "HTTP version did not redirect." };
  const location = result.headers.get("location");
  if (!location) return { value: false, reason: "HTTP redirect had no destination." };
  const destination = new URL(location, httpUrl);
  const destinationAllowed = await assertPublicUrl(destination);
  if (!destinationAllowed.ok) return { value: null, reason: destinationAllowed.message };
  return { value: destination.protocol === "https:", reason: destination.protocol === "https:" ? null : "HTTP redirect did not land on HTTPS." };
}

async function fetchPageSpeed(websiteUrl) {
  const apiKey = process.env.GOOGLE_PSI_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return skippedPerformance("GOOGLE_PSI_API_KEY is not set, so PageSpeed Insights was skipped.");

  const url = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  url.searchParams.set("url", websiteUrl);
  url.searchParams.set("strategy", "mobile");
  url.searchParams.set("category", "performance");
  url.searchParams.set("key", apiKey);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PSI_TIMEOUT_MS);
  try {
    const response = await fetch(url, { cache: "no-store", signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return skippedPerformance(data.error?.message || `PageSpeed Insights HTTP ${response.status}`);
    const lighthouse = data.lighthouseResult || {};
    const audits = lighthouse.audits || {};
    return {
      performanceScore: typeof lighthouse.categories?.performance?.score === "number" ? Math.round(lighthouse.categories.performance.score * 100) : null,
      largestContentfulPaintMs: numericValue(audits["largest-contentful-paint"]?.numericValue),
      cumulativeLayoutShift: numericValue(audits["cumulative-layout-shift"]?.numericValue),
      totalBlockingTimeMs: numericValue(audits["total-blocking-time"]?.numericValue),
      mobileFriendly: audits.viewport?.score === 1 ? true : audits.viewport?.score === 0 ? false : null,
      reason: null
    };
  } catch (error) {
    return skippedPerformance(error?.name === "AbortError" ? "PageSpeed Insights timed out." : "PageSpeed Insights could not be measured.");
  } finally {
    clearTimeout(timer);
  }
}

function skippedPerformance(reason) {
  return {
    performanceScore: null,
    largestContentfulPaintMs: null,
    cumulativeLayoutShift: null,
    totalBlockingTimeMs: null,
    mobileFriendly: null,
    reason
  };
}

function numericValue(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function providerError(code, message) {
  return {
    ok: false,
    source: "website_audit",
    audit: null,
    error: { code, message }
  };
}
