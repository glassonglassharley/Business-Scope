import Link from "next/link";
import { CHECK_GROUPS } from "@/lib/checkGroups";

export function WhatWeCheck() {
  return (
    <>
      <section id="what-we-check" className="panel-section scroll-mt-24">
        <div className="section-heading">
          <p className="eyebrow">What StreetSignal checks</p>
          <h2>A structured look at the public customer journey.</h2>
          <p>
            StreetSignal looks at the public path a customer takes — from first impression to the moment they try to
            call, book, or buy — and shows you exactly where it breaks. We separate basic facts, trust signals, and
            customer-action paths so you can see what to fix first.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {CHECK_GROUPS.map((group) => (
            <article key={group.title} className="check-group">
              <h3>{group.title}</h3>
              <p className="check-group-impact">{group.impact}</p>
              <ul>
                {group.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
              <div className="example-issues">
                <p className="example-issues-label">Example issues</p>
                <ul>
                  {group.examples.map((example) => <li key={example}>{example}</li>)}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="final-cta">
        <div>
          <h2>Ready to see how your business looks on this journey?</h2>
          <p>Run a free checkup to find the public details that may be costing you calls, visits, and bookings.</p>
        </div>
        <Link className="primary-button w-full sm:w-auto" href="/#business-search">Run free checkup</Link>
      </section>
    </>
  );
}
