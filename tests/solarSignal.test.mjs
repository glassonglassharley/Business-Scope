// Rooftop solar signal tests.
//
// Two layers:
//   1. Offline (always run): the prompt is strict and JSON-only, the stored
//      image URL never carries a key, the reply parser maps every malformed
//      or off-schema answer to 'unclear', and the persistence path writes the
//      key-less URL + status with the request counts the pipeline expects.
//      Google and the model are both mocked.
//   2. Live (opt-in, SPENDS): classifies six real rooftops — three with a
//      large, unmistakable PV array and three plain roofs — and asserts the
//      labels. Runs only when SOLAR_LIVE_TEST=1 plus a Static-Maps-enabled
//      Google key and ANTHROPIC_API_KEY are set; otherwise it is reported as
//      skipped with the reason, never as a pass.
//
// Sample coordinates were checked by eye in Google Maps satellite view on
// 2026-09-10 — each "solar" point sits on the array itself, each "no solar"
// point on an unobstructed plain roof. Glass-skylight roofs (e.g. Lincoln
// Memorial) were deliberately left out of the no-solar set: the prompt sends
// those to UNCLEAR by design.

import assert from "node:assert/strict";
import { test } from "node:test";
import { loadEnvLocal } from "../scripts/envLocal.mjs";

loadEnvLocal();

const {
  SOLAR_CLASSIFIER_PROMPT, SOLAR_OUTPUT_SCHEMA,
  buildRooftopImageUrl, withApiKey, fetchRooftopImage, parseClassifierReply,
  classifyRooftopImage, solarSignalFor, checkSolarForBusiness,
  parseSolarFilter, solarFilterSql, solarLabel, staticMapsKey
} = await import("../src/lib/solarSignal.mjs");

export const SAMPLE_COORDS = [
  { label: "Apple Park ring roof, Cupertino", lat: 37.3368, lng: -122.0090, expect: "has_solar" },
  { label: "Moscone Center rooftop array, San Francisco", lat: 37.7838, lng: -122.4001, expect: "has_solar" },
  { label: "LA Convention Center South Hall roof", lat: 34.0394, lng: -118.2700, expect: "has_solar" },
  { label: "Madison Square Garden roof, New York", lat: 40.7505, lng: -73.9934, expect: "no_solar" },
  { label: "The Pentagon, Arlington", lat: 38.8719, lng: -77.0563, expect: "no_solar" },
  { label: "Grand Central Terminal main roof, New York", lat: 40.7530, lng: -73.9772, expect: "no_solar" }
];

// ---------------------------------------------------------------------------
// 1. Offline
// ---------------------------------------------------------------------------

test("classifier prompt is strict: three labels, JSON only, UNCLEAR for the ambiguous cases", () => {
  for (const label of ["HAS_SOLAR", "NO_SOLAR", "UNCLEAR"]) assert.match(SOLAR_CLASSIFIER_PROMPT, new RegExp(label));
  assert.match(SOLAR_CLASSIFIER_PROMPT, /JSON only/);
  assert.match(SOLAR_CLASSIFIER_PROMPT, /No prose/);
  for (const ambiguous of ["multi-tenant", "low resolution", "hidden", "skylights"]) {
    assert.match(SOLAR_CLASSIFIER_PROMPT, new RegExp(ambiguous), `prompt must route "${ambiguous}" roofs to UNCLEAR`);
  }
  assert.deepEqual(SOLAR_OUTPUT_SCHEMA.properties.label.enum, ["HAS_SOLAR", "NO_SOLAR", "UNCLEAR"]);
  assert.equal(SOLAR_OUTPUT_SCHEMA.additionalProperties, false);
});

test("stored image URL is a tight satellite crop and never carries the API key", () => {
  const url = new URL(buildRooftopImageUrl({ lat: 32.7157, lng: -117.1611 }));
  assert.equal(url.origin + url.pathname, "https://maps.googleapis.com/maps/api/staticmap");
  assert.equal(url.searchParams.get("maptype"), "satellite");
  assert.equal(url.searchParams.get("zoom"), "20");
  assert.equal(url.searchParams.get("size"), "400x400");
  assert.equal(url.searchParams.get("scale"), "2");
  assert.equal(url.searchParams.get("center"), "32.715700,-117.161100");
  assert.equal(url.searchParams.get("key"), null);

  const keyed = new URL(withApiKey(url.toString(), "secret-key"));
  assert.equal(keyed.searchParams.get("key"), "secret-key");
  assert.throws(() => buildRooftopImageUrl({ lat: null, lng: -117 }), /numeric lat\/lng/);
});

test("fetchRooftopImage sends the key only on the wire and returns the key-less URL", async () => {
  let requested = null;
  const fetchImpl = async (url) => {
    requested = String(url);
    return new Response(Buffer.from("png-bytes"), { status: 200, headers: { "content-type": "image/png" } });
  };
  const result = await fetchRooftopImage({ lat: 1, lng: 2, apiKey: "k-123", fetchImpl });
  assert.equal(result.ok, true);
  assert.match(requested, /key=k-123/);
  assert.doesNotMatch(result.imageUrl, /key=/);
  assert.equal(result.mediaType, "image/png");
  assert.equal(result.bytes.toString(), "png-bytes");

  const denied = await fetchRooftopImage({
    lat: 1, lng: 2, apiKey: "k-123",
    fetchImpl: async () => new Response("The Google Maps Platform server rejected your request. key=k-123", { status: 403 })
  });
  assert.equal(denied.ok, false);
  assert.equal(denied.code, "api_error");
  assert.doesNotMatch(denied.message, /k-123/, "error text must not echo the key");

  const noKey = await fetchRooftopImage({ lat: 1, lng: 2, apiKey: null, fetchImpl });
  assert.equal(noKey.code, "no_api_key");
});

test("reply parser: valid labels map to statuses, everything else becomes 'unclear'", () => {
  assert.deepEqual(parseClassifierReply('{"label":"HAS_SOLAR","confidence":0.93,"reason":"grid of PV modules"}'),
    { status: "has_solar", confidence: 0.93, reason: "grid of PV modules" });
  assert.equal(parseClassifierReply('{"label":"NO_SOLAR","confidence":0.8,"reason":"plain roof"}').status, "no_solar");
  assert.equal(parseClassifierReply('{"label":"UNCLEAR","confidence":0.4,"reason":"trees"}').status, "unclear");
  assert.equal(parseClassifierReply("Looks like it has solar panels.").status, "unclear");
  assert.equal(parseClassifierReply('{"label":"MAYBE","confidence":0.5,"reason":"x"}').status, "unclear");
  assert.equal(parseClassifierReply('{"label":"HAS_SOLAR","confidence":7,"reason":"x"}').confidence, null);
  assert.equal(parseClassifierReply("").status, "unclear");
});

test("classifyRooftopImage: refusal and truncation are recorded as 'unclear', not thrown", async () => {
  const fakeClient = (reply) => ({ messages: { create: async () => reply } });
  const refused = await classifyRooftopImage({
    imageBase64: "AA==", mediaType: "image/png",
    client: fakeClient({ stop_reason: "refusal", stop_details: { category: "other" }, content: [], model: "m", usage: {} })
  });
  assert.equal(refused.status, "unclear");
  assert.match(refused.reason, /refused/);

  const truncated = await classifyRooftopImage({
    imageBase64: "AA==", mediaType: "image/png",
    client: fakeClient({ stop_reason: "max_tokens", content: [{ type: "text", text: '{"label":"HAS' }], model: "m", usage: {} })
  });
  assert.equal(truncated.status, "unclear");

  let sent = null;
  const good = await classifyRooftopImage({
    imageBase64: "AA==", mediaType: "image/jpeg",
    client: { messages: { create: async (params) => { sent = params; return { stop_reason: "end_turn", content: [{ type: "text", text: '{"label":"NO_SOLAR","confidence":0.9,"reason":"plain"}' }], model: "m", usage: { input_tokens: 1 } }; } } }
  });
  assert.equal(good.status, "no_solar");
  assert.equal(sent.system, SOLAR_CLASSIFIER_PROMPT);
  assert.equal(sent.output_config.format.type, "json_schema");
  assert.equal(sent.messages[0].content[0].source.media_type, "image/jpeg");
});

test("checkSolarForBusiness persists status + key-less URL and counts both requests", async () => {
  const writes = [];
  const db = { query: async (text, params) => { writes.push({ text, params }); return { rows: [] }; } };
  const counts = [];
  const fetchImpl = async () => new Response(Buffer.from("png"), { status: 200, headers: { "content-type": "image/png" } });
  const client = { messages: { create: async () => ({ stop_reason: "end_turn", model: "m", usage: {}, content: [{ type: "text", text: '{"label":"HAS_SOLAR","confidence":0.88,"reason":"array"}' }] }) } };

  const result = await checkSolarForBusiness(db, { id: "biz-1", lat: 32.7, lng: -117.1 }, {
    count: (endpoint) => counts.push(endpoint), client, fetchImpl, mapsApiKey: "k"
  });
  assert.deepEqual(result, { ok: true, status: "has_solar" });
  assert.deepEqual(counts, ["static_map", "solar_vision"]);
  assert.equal(writes.length, 1);
  assert.match(writes[0].text, /update businesses/);
  const [id, status, imageUrl, signal] = writes[0].params;
  assert.equal(id, "biz-1");
  assert.equal(status, "has_solar");
  assert.doesNotMatch(imageUrl, /key=/);
  assert.equal(JSON.parse(signal).confidence, 0.88);

  const noCoords = await checkSolarForBusiness(db, { id: "biz-2", lat: null, lng: null }, { count: () => counts.push("x") });
  assert.equal(noCoords.code, "no_coordinates");
  assert.equal(counts.length, 2, "no request is counted when there is nothing to fetch");
});

test("--solar filter maps to bound values and rejects typos", () => {
  assert.equal(parseSolarFilter(undefined), null);
  assert.equal(parseSolarFilter("any"), null);
  assert.equal(parseSolarFilter("has"), "has_solar");
  assert.equal(parseSolarFilter("none"), "no_solar");
  assert.equal(parseSolarFilter("unclear"), "unclear");
  assert.equal(parseSolarFilter("unchecked"), "unchecked");
  assert.throws(() => parseSolarFilter("yes"), /--solar must be one of/);
  assert.match(solarFilterSql("$7"), /\$7::text is null/);
  assert.doesNotMatch(solarFilterSql("$7"), /'\$\{|\+/, "fragment is a placeholder reference, never interpolated user input");
  assert.equal(solarLabel("has_solar"), "has solar");
  assert.equal(solarLabel(null), "unchecked");
});

// ---------------------------------------------------------------------------
// 2. Live — three known-solar and three known-no-solar roofs. SPENDS.
// ---------------------------------------------------------------------------

const liveBlockers = [
  process.env.SOLAR_LIVE_TEST !== "1" && "SOLAR_LIVE_TEST is not 1",
  !staticMapsKey() && "no GOOGLE_STATIC_MAPS_API_KEY / GOOGLE_PLACES_API_KEY",
  !process.env.ANTHROPIC_API_KEY && "no ANTHROPIC_API_KEY"
].filter(Boolean);

test("live: classifier labels 3 known-solar and 3 known-no-solar rooftops correctly", { skip: liveBlockers.length ? `live classifier test skipped: ${liveBlockers.join(", ")}` : false }, async () => {
  const results = [];
  for (const sample of SAMPLE_COORDS) {
    const result = await solarSignalFor({ lat: sample.lat, lng: sample.lng });
    assert.equal(result.ok, true, `${sample.label}: ${result.message}`);
    results.push({ ...sample, got: result.status, confidence: result.signal.confidence, reason: result.signal.reason });
    console.log(`  ${sample.label}: expected ${sample.expect}, got ${result.status} (${result.signal.confidence ?? "?"}) — ${result.signal.reason}`);
  }
  const wrong = results.filter((r) => r.got !== r.expect);
  assert.deepEqual(wrong, [], `misclassified: ${wrong.map((r) => `${r.label} → ${r.got}`).join("; ")}`);
});
