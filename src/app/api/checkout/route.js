import { CLEANUP_PACKAGES, getStripe, priceIdFor } from "@/lib/stripe";
import { SITE_URL } from "@/lib/brand";

export const runtime = "nodejs";

export async function POST(request) {
  let body = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Request body must be JSON." }, { status: 400 });
  }

  const packageKey = body.package;
  if (!CLEANUP_PACKAGES[packageKey]) {
    return Response.json({ ok: false, error: "Unknown package." }, { status: 400 });
  }

  const priceId = priceIdFor(packageKey);
  if (!priceId) {
    return Response.json({ ok: false, error: "Checkout is not configured yet." }, { status: 503 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email) {
    return Response.json({ ok: false, error: "Email is required." }, { status: 400 });
  }

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      success_url: `${SITE_URL}/cleanup?checkout=success`,
      cancel_url: `${SITE_URL}/cleanup?checkout=cancelled`,
      metadata: {
        package: packageKey,
        name: String(body.name || "").slice(0, 200),
        businessName: String(body.businessName || "").slice(0, 200),
        website: String(body.website || "").slice(0, 300),
        reportLink: String(body.reportLink || "").slice(0, 300),
        priorities: String(body.priorities || "").slice(0, 500)
      }
    });

    return Response.json({ ok: true, url: session.url });
  } catch (error) {
    return Response.json({ ok: false, error: error?.message || "Checkout failed." }, { status: 502 });
  }
}
