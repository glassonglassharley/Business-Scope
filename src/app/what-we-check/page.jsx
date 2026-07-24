import Link from "next/link";
import { WhatWeCheck } from "@/components/WhatWeCheck";
import { BRAND, SITE_URL } from "@/lib/brand";

export const metadata = {
  title: "What We Check",
  description: `See the public business details, customer trust signals, and customer action paths ${BRAND} reviews during a local presence checkup.`,
  alternates: { canonical: `${SITE_URL}/what-we-check` },
  openGraph: {
    title: `What We Check | ${BRAND}`,
    description: `See what ${BRAND} reviews during a local business presence checkup.`,
    url: `${SITE_URL}/what-we-check`
  }
};

export default function WhatWeCheckPage() {
  return (
    <main className="min-h-screen bg-paper px-4 py-6 text-ink sm:px-5 sm:py-10">
      <div className="mx-auto grid max-w-7xl gap-5">
        <Link className="link text-sm font-bold" href="/">← Back to {BRAND}</Link>
        <WhatWeCheck />
      </div>
    </main>
  );
}
