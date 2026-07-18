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
    const result = await GooglePlacesProvider.getProspectData({
      businessName: body.businessName,
      city: body.city,
      industry: body.industry,
      placeId: body.placeId
    });

    if (!result.ok) {
      const status = result.error?.code === "missing_api_key" ? 503 : result.error?.code === "bad_request" ? 400 : result.error?.code === "not_found" ? 404 : result.error?.code === "rate_limited" ? 429 : 502;
      return Response.json(result, { status });
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