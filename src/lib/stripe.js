import Stripe from "stripe";

/**
 * Server-only Stripe client. Reads STRIPE_SECRET_KEY at first use so the rest
 * of the app keeps working with no key configured — only checkout/webhook
 * routes that actually need Stripe will fail, with a clear message.
 */

let client = null;

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set. Add it server-side to enable checkout.");
  }
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return client;
}

export const CLEANUP_PACKAGES = {
  sandbox: { label: "Sandbox Fix", priceEnvVar: "STRIPE_PRICE_SANDBOX" },
  full: { label: "Full Cleanup", priceEnvVar: "STRIPE_PRICE_FULL" }
};

/**
 * @param {string} packageKey "sandbox" | "full"
 * @returns {string|null} the configured Stripe Price ID, or null if unset/unknown
 */
export function priceIdFor(packageKey) {
  const config = CLEANUP_PACKAGES[packageKey];
  if (!config) return null;
  return process.env[config.priceEnvVar] || null;
}
