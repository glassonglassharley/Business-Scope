import { getStripe } from "@/lib/stripe";

// Confirms payment server-side rather than trusting the success_url redirect
// alone (a closed tab or flaky network never reaches success_url). Logs to
// Vercel's function logs, which is enough to see who paid for what until a
// heavier fulfillment step is needed.

export const runtime = "nodejs";

export async function POST(request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return Response.json({ ok: false, error: "Webhook not configured." }, { status: 503 });
  }

  const rawBody = await request.text();

  let event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch (error) {
    return Response.json({ ok: false, error: `Invalid signature: ${error.message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    console.log("[stripe] cleanup order paid", {
      sessionId: session.id,
      package: session.metadata?.package,
      businessName: session.metadata?.businessName,
      email: session.customer_details?.email || session.customer_email,
      amountTotal: session.amount_total
    });
  }

  return Response.json({ ok: true });
}
