import { GooglePlacesProvider } from "@/lib/prospectData";
import { calculateBusinessHealthScore } from "@/lib/scoring";

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
        return Response.json(candidatesResult, { status: statusForPlacesError(candidatesResult.error?.code) });
      }

      return Response.json(candidatesResult);
    }

    const result = await GooglePlacesProvider.getProspectData({
      businessName: body.businessName,
      city: body.city,
      industry: body.industry,
      placeId: body.placeId
    });

    if (!result.ok) {
      return Response.json(result, { status: statusForPlacesError(result.error?.code) });
    }

    const scoreBreakdown = calculateBusinessHealthScore(result.prospect);
    return Response.json({
      ok: true,
      source: "google_places",
      prospect: result.prospect,
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
