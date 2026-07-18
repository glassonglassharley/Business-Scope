import { WebsiteProvider } from "@/lib/websiteProvider";

export const runtime = "nodejs";

export async function POST(request) {
  let body = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: { code: "bad_request", message: "Request body must be JSON." } }, { status: 400 });
  }

  try {
    const result = await WebsiteProvider.auditResolvedPlace(body.place);
    if (!result.ok) {
      const status = result.error?.code === "bad_request" ? 400 : result.error?.code === "rate_limited" ? 429 : result.error?.code === "unavailable" ? 503 : 502;
      return Response.json(result, { status });
    }

    return Response.json(result);
  } catch (error) {
    return Response.json({
      ok: false,
      source: "website_audit",
      error: {
        code: "api_error",
        message: error?.message || "Website audit failed."
      }
    }, { status: 502 });
  }
}
