// Rooftop solar signal: one Static Maps satellite tile per business, one
// vision-model classification, persisted on the businesses row. Server-side
// only — both keys are read from the environment here and never leave the
// process: the stored image URL is key-less and the browser is never handed
// an image or model call.
//
// Deliberately narrow: the model answers HAS_SOLAR / NO_SOLAR / UNCLEAR as
// JSON and nothing else. UNCLEAR is a first-class outcome, not a failure —
// a multi-tenant roof, a tree-covered roof, or a no-imagery tile is recorded
// as 'unclear' so the business is not re-queried every run.

import Anthropic from "@anthropic-ai/sdk";
import { sleep } from "./placesHttp.mjs";

export const STATIC_MAPS_URL = "https://maps.googleapis.com/maps/api/staticmap";

export const SOLAR_STATUSES = ["has_solar", "no_solar", "unclear"];

export const solarConfig = {
  // Zoom 20 is the tightest level Static Maps serves satellite imagery at in
  // most US metros (~0.13 m/px at San Diego's latitude). 400px at scale 2
  // returns an 800x800 image covering roughly a 50 m square — one building,
  // not a block — which is what keeps the "judge only the center roof"
  // instruction honest.
  zoom: 20,
  sizePx: 400,
  scale: 2,
  model: process.env.SOLAR_VISION_MODEL || "claude-opus-5",
  maxTokens: 512,
  // Delay between consecutive vision calls, mirroring discoveryConfig.rateLimitMs.
  rateLimitMs: 250
};

/**
 * The classifier prompt. Frozen text — no per-request values are interpolated
 * into it, so it caches as a stable prefix across a whole run.
 */
export const SOLAR_CLASSIFIER_PROMPT = `You classify a single top-down satellite image of a building rooftop for the presence of photovoltaic (PV) solar panels.

Return exactly one label:

HAS_SOLAR — the roof at the center of the image clearly shows one or more PV arrays: a regular grid of rectangular dark-blue or black modules with visible seams or framing, mounted on the roof surface.

NO_SOLAR — the roof at the center of the image is clearly visible, in focus, and unobstructed, and there are no PV panels anywhere on it.

UNCLEAR — everything else. Use UNCLEAR when:
- the image is low resolution, blurry, blank, a "no imagery" placeholder, or mostly cloud or shadow;
- the center of the image is not a building roof (parking lot, road, vegetation, water, open ground, construction site);
- the roof is partly hidden by trees, taller neighbouring structures, or heavy shadow;
- the building is a large multi-tenant structure (strip mall, office park, apartment block, warehouse complex) so panels could not be attributed to one occupant;
- dark features could equally be skylights, HVAC units, glass, dark roofing membrane, shade sails, or solar water heaters rather than PV modules.

Rules:
- Judge only the roof at the center of the image. Panels on neighbouring roofs or ground-mounted arrays nearby do not count.
- PV panels are a uniform grid of same-sized rectangles, usually with thin light-coloured gaps between modules. Skylights, HVAC units, shadows, and dark coatings are not PV. If you cannot tell them apart, answer UNCLEAR.
- Do not guess. A confident wrong answer is worse than UNCLEAR.
- Respond with JSON only, matching the provided schema. No prose, no markdown, nothing outside the JSON fields.`;

export const SOLAR_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    label: { type: "string", enum: ["HAS_SOLAR", "NO_SOLAR", "UNCLEAR"] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    reason: { type: "string", maxLength: 200 }
  },
  required: ["label", "confidence", "reason"],
  additionalProperties: false
};

const LABEL_TO_STATUS = { HAS_SOLAR: "has_solar", NO_SOLAR: "no_solar", UNCLEAR: "unclear" };

// ---------------------------------------------------------------------------
// Image
// ---------------------------------------------------------------------------

/**
 * The canonical, KEY-LESS Static Maps request for a rooftop. This is what gets
 * persisted and exported; the key is appended only at fetch time.
 */
export function buildRooftopImageUrl({ lat, lng }, config = solarConfig) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("buildRooftopImageUrl needs numeric lat/lng.");
  }
  const url = new URL(STATIC_MAPS_URL);
  url.searchParams.set("center", `${lat.toFixed(6)},${lng.toFixed(6)}`);
  url.searchParams.set("zoom", String(config.zoom));
  url.searchParams.set("size", `${config.sizePx}x${config.sizePx}`);
  url.searchParams.set("scale", String(config.scale));
  url.searchParams.set("maptype", "satellite");
  url.searchParams.set("format", "png");
  return url.toString();
}

export function withApiKey(imageUrl, apiKey) {
  const url = new URL(imageUrl);
  url.searchParams.set("key", apiKey);
  return url.toString();
}

/**
 * Fetches the rooftop tile. Returns the bytes plus the key-less URL that was
 * classified. Never returns or logs the keyed URL.
 */
export async function fetchRooftopImage({ lat, lng, apiKey, fetchImpl = fetch, config = solarConfig }) {
  if (!apiKey) return { ok: false, code: "no_api_key", message: "GOOGLE_STATIC_MAPS_API_KEY / GOOGLE_PLACES_API_KEY is not set." };
  const imageUrl = buildRooftopImageUrl({ lat, lng }, config);

  try {
    const response = await fetchImpl(withApiKey(imageUrl, apiKey), { cache: "no-store" });
    if (response.status === 429) return { ok: false, code: "rate_limited", message: "Static Maps rate limit reached.", imageUrl };
    if (!response.ok) {
      // Static Maps error bodies are plain text; strip anything that could
      // echo the request URL (and its key) back into a log line.
      const text = (await response.text().catch(() => "")).replace(/key=[^&\s]+/g, "key=***").slice(0, 200);
      return { ok: false, code: "api_error", message: `Static Maps HTTP ${response.status}: ${text}`, imageUrl };
    }
    const mediaType = (response.headers.get("content-type") || "image/png").split(";")[0].trim();
    if (!mediaType.startsWith("image/")) {
      return { ok: false, code: "api_error", message: `Static Maps returned ${mediaType}, not an image.`, imageUrl };
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    return { ok: true, imageUrl, bytes, mediaType };
  } catch (error) {
    return { ok: false, code: "api_error", message: error?.message || "Static Maps request failed.", imageUrl };
  }
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

let sharedClient = null;
function getClient() {
  if (!sharedClient) sharedClient = new Anthropic();
  return sharedClient;
}

/**
 * One vision call. Always resolves to a status — a refusal, an unparseable
 * reply, or a truncated reply becomes 'unclear' with the cause in `reason`,
 * so the caller can persist it and move on. Only transport/auth errors throw.
 *
 * @returns {Promise<{ status: 'has_solar'|'no_solar'|'unclear', confidence: number|null, reason: string, model: string, usage: object|null }>}
 */
export async function classifyRooftopImage({ imageBase64, mediaType, client = getClient(), config = solarConfig }) {
  const response = await client.messages.create({
    model: config.model,
    max_tokens: config.maxTokens,
    system: SOLAR_CLASSIFIER_PROMPT,
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: SOLAR_OUTPUT_SCHEMA }
    },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
          { type: "text", text: "Classify the rooftop at the center of this image." }
        ]
      }
    ]
  });

  const usage = response.usage || null;
  if (response.stop_reason === "refusal") {
    return { status: "unclear", confidence: null, reason: `model refused: ${response.stop_details?.category || "unspecified"}`, model: response.model, usage };
  }
  if (response.stop_reason === "max_tokens") {
    return { status: "unclear", confidence: null, reason: "model reply truncated", model: response.model, usage };
  }

  const text = (response.content || []).filter((block) => block.type === "text").map((block) => block.text).join("");
  const parsed = parseClassifierReply(text);
  return { ...parsed, model: response.model, usage };
}

/** Exported for tests: strict JSON in, normalized verdict out. */
export function parseClassifierReply(text) {
  let body;
  try {
    body = JSON.parse(String(text || "").trim());
  } catch {
    return { status: "unclear", confidence: null, reason: "unparseable model reply" };
  }
  const status = LABEL_TO_STATUS[body?.label];
  if (!status) return { status: "unclear", confidence: null, reason: `unknown label ${JSON.stringify(body?.label ?? null)}` };
  const confidence = typeof body.confidence === "number" && body.confidence >= 0 && body.confidence <= 1
    ? Math.round(body.confidence * 100) / 100
    : null;
  return { status, confidence, reason: String(body.reason || "").slice(0, 200) };
}

/**
 * Fetch + classify for one coordinate. Does not touch the database.
 * @returns {Promise<{ ok: true, status: string, imageUrl: string, signal: object } | { ok: false, code: string, message: string, imageUrl?: string }>}
 */
export async function solarSignalFor({ lat, lng, mapsApiKey = staticMapsKey(), client, fetchImpl, config = solarConfig }) {
  const image = await fetchRooftopImage({ lat, lng, apiKey: mapsApiKey, fetchImpl, config });
  if (!image.ok) return image;

  const verdict = await classifyRooftopImage({
    imageBase64: image.bytes.toString("base64"),
    mediaType: image.mediaType,
    client,
    config
  });
  return {
    ok: true,
    status: verdict.status,
    imageUrl: image.imageUrl,
    signal: { confidence: verdict.confidence, reason: verdict.reason, model: verdict.model, usage: verdict.usage }
  };
}

export function staticMapsKey() {
  return process.env.GOOGLE_STATIC_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY || null;
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

/**
 * Classifies one business and writes the observation to its row. Request
 * counting is the caller's job (pass `count`) so the numbers land in the
 * same runs.request_counts the rest of the pipeline uses.
 *
 * @param {import("pg").Pool} db
 * @param {{ id: string, lat: number|null, lng: number|null }} business
 * @param {{ count?: (endpoint: string) => void, client?: object, fetchImpl?: Function, mapsApiKey?: string }} [deps]
 * @returns {Promise<{ ok: true, status: string } | { ok: false, code: string, message: string }>}
 */
export async function checkSolarForBusiness(db, business, deps = {}) {
  // pg returns double precision as JS numbers, but guard the null case
  // explicitly: Number(null) is 0, which would "pass" as a coordinate.
  const lat = business.lat === null || business.lat === undefined ? NaN : Number(business.lat);
  const lng = business.lng === null || business.lng === undefined ? NaN : Number(business.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, code: "no_coordinates", message: "Business has no lat/lng." };
  }

  const count = deps.count || (() => {});
  count("static_map");
  count("solar_vision");
  await sleep(solarConfig.rateLimitMs);

  const result = await solarSignalFor({ lat, lng, mapsApiKey: deps.mapsApiKey, client: deps.client, fetchImpl: deps.fetchImpl });
  if (!result.ok) return result;

  await db.query(
    `update businesses
        set solar_status = $2, solar_image_url = $3, solar_signal = $4, solar_checked_at = now(), updated_at = now()
      where id = $1`,
    [business.id, result.status, result.imageUrl, JSON.stringify(result.signal)]
  );
  return { ok: true, status: result.status };
}

// ---------------------------------------------------------------------------
// CLI filter helpers shared by rank / export / worst-scorers
// ---------------------------------------------------------------------------

export const SOLAR_FILTER_VALUES = ["has", "none", "unclear", "unchecked", "any"];

/**
 * Maps a `--solar` CLI value to the bound parameter the SQL fragment below
 * expects. Returns null (no filter) for undefined / 'any'; throws on junk so
 * a typo never silently returns the unfiltered list.
 */
export function parseSolarFilter(value) {
  if (value === undefined || value === null || value === "" || value === "any") return null;
  const map = { has: "has_solar", none: "no_solar", unclear: "unclear", unchecked: "unchecked" };
  if (!map[value]) throw new Error(`--solar must be one of ${SOLAR_FILTER_VALUES.join("|")} (got "${value}").`);
  return map[value];
}

/** SQL fragment for the filter; `$n` is the placeholder bound to parseSolarFilter's output. */
export function solarFilterSql(placeholder) {
  return `(${placeholder}::text is null
           or (${placeholder} = 'unchecked' and b.solar_status is null)
           or b.solar_status = ${placeholder})`;
}

/** Human label for output columns. */
export function solarLabel(status) {
  return { has_solar: "has solar", no_solar: "no solar", unclear: "unclear" }[status] || "unchecked";
}
