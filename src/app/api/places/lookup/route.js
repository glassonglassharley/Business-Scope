// Relative imports (not @/ alias) so the leak test can invoke this handler
// directly under Node. Responses are built field-by-field — provider results
// are never passed through wholesale.
import { GooglePlacesProvider } from "../../../../lib/prospectData.js";
import { calculateBusinessHealthScore } from "../../../../lib/scoring.js";

export async function POST(request) {
  let body = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: { code: "bad_request", message: "Request body must be JSON." } }, { status: 400 });
  }

  try {
    if (body.mode === "candidates") {
      const candidatesResult = await GooglePlacesProvider.findCandidates({
        businessName: body.businessName,
        city: body.city,
        coordinates: body.coordinates
      });

      if (!candidatesResult.ok) {
        return Response.json(
          { ok: false, source: "google_places", error: candidatesResult.error },
          { status: statusForPlacesError(candidatesResult.error?.code) }
        );
      }

      return Response.json({ ok: true, source: "google_places", candidates: candidatesResult.candidates, error: null });
    }

    const result = await GooglePlacesProvider.getProspectData({
      businessName: body.businessName,
      city: body.city,
      industry: body.industry,
      placeId: body.placeId
    });

    if (!result.ok) {
      return Response.json(
        { ok: false, source: "google_places", error: result.error },
        { status: statusForPlacesError(result.error?.code) }
      );
    }

    const scoreBreakdown = calculateBusinessHealthScore(result.prospect);
    return Response.json({
      ok: true,
      source: "google_places",
      scan: result.prospect,
      place: result.place,
      scoreBreakdown
    });
  } catch (error) {
    return Response.json({
      ok: false,
      source: "google_places",
      error: {
        code: "api_error",
        message: error?.message || "Google Places lookup failed."
      }
    }, { status: 502 });
  }
}
function statusForPlacesError(code) {
  return code === "missing_api_key" ? 503 : code === "bad_request" ? 400 : code === "not_found" ? 404 : code === "rate_limited" ? 429 : 502;
}
