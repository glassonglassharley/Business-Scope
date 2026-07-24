import { SAMPLE_CATEGORY_SCORES, SAMPLE_FINDINGS } from "@/lib/sampleReport";

export function SampleReport({ checkedDate }) {
  return (
    <section id="sample-report" className="sample-report scroll-mt-24">
      <div className="report-header">
        <div>
          <p className="eyebrow">Sample Report · Fictional business</p>
          <h2>Business Health Score: 68/100</h2>
          <p>Sample business: Harbor City Dental. Three issues may be costing this business customers.</p>
        </div>
        <div className="report-score" aria-label="Business Health Score 68 out of 100">68</div>
      </div>

      <div className="fix-first">
        <p className="eyebrow">Fix First</p>
        <h3>Repair the booking link.</h3>
        <p>It directly blocks customer action and can be corrected immediately.</p>
      </div>

      <div className="grid gap-4">
        {SAMPLE_FINDINGS.map((finding, index) => <FindingCard key={finding.title} finding={finding} index={index + 1} checkedDate={checkedDate} />)}
      </div>

      <div className="category-score-grid">
        {SAMPLE_CATEGORY_SCORES.map(([label, score]) => <CategoryScore key={label} label={label} score={score} />)}
      </div>
    </section>
  );
}

function FindingCard({ finding, index, checkedDate }) {
  return (
    <article className="finding-card">
      <div className="finding-title-row">
        <span className="finding-number">{index}</span>
        <div>
          <h3>{finding.title}</h3>
          <p><strong>Impact:</strong> {finding.impact}</p>
        </div>
        <span className={`severity-pill ${finding.severity.toLowerCase()}`}>{finding.severity}</span>
      </div>
      <dl className="finding-meta">
        <div><dt>Source checked</dt><dd>{finding.source}</dd></div>
        <div><dt>Checked</dt><dd>{checkedDate}</dd></div>
        <div><dt>Value found</dt><dd>{finding.valueFound}</dd></div>
        <div><dt>Expected value</dt><dd>{finding.expectedValue}</dd></div>
        <div><dt>Confidence</dt><dd>{finding.confidence}</dd></div>
        <div><dt>Status</dt><dd>{finding.status}</dd></div>
      </dl>
      <p className="recommended-action"><strong>Recommended action:</strong> {finding.action}</p>
    </article>
  );
}

function CategoryScore({ label, score }) {
  return (
    <div className="category-score-card">
      <div className="flex items-center justify-between gap-3">
        <h3>{label}</h3>
        <span>{score}</span>
      </div>
      <div className="score-bar" aria-hidden="true"><div style={{ width: `${score}%` }} /></div>
    </div>
  );
}
