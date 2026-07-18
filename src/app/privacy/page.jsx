import { BRAND } from "@/lib/brand";

export const metadata = {
  title: `Privacy — ${BRAND}`,
  description: `Privacy information for ${BRAND}.`
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen px-5 py-8">
      <section className="panel mx-auto max-w-3xl p-7">
        <p className="eyebrow">{BRAND}</p>
        <h1 className="mt-3 text-3xl font-black text-ink">Privacy</h1>
        <div className="mt-5 grid gap-5 text-sm leading-7 text-slate-700">
          <p>
            {BRAND} collects the business information you provide so we can prepare a business snapshot. This may include your business name, city, website or Google profile link, contact information, and notes about details you believe may be inaccurate.
          </p>
          <p>
            We use this information only to review your public online presence, prepare your business snapshot, and follow up with you about the request. We do not sell your information.
          </p>
          <p>
            The current prototype may store submitted requests in the browser while the service is being tested. A production version should connect requests to a secure email inbox or database before collecting real customer submissions.
          </p>
          <p>
            Questions about privacy can be sent to <a className="font-bold text-brand hover:underline" href="mailto:hello@example.com">hello@example.com</a>.
          </p>
        </div>
      </section>
    </main>
  );
}