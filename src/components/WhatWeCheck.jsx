import { CHECK_GROUPS } from "@/lib/checkGroups";

export function WhatWeCheck() {
  return (
    <section id="what-we-check" className="panel-section scroll-mt-24">
      <div className="section-heading">
        <p className="eyebrow">What StreetSignal checks</p>
        <h2>A structured look at the public customer journey.</h2>
        <p>StreetSignal separates basic facts, trust signals, and customer-action paths so a business can see what to fix first.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {CHECK_GROUPS.map((group) => (
          <article key={group.title} className="check-group">
            <h3>{group.title}</h3>
            <ul>
              {group.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
