/**
 * Ionic-column logomark, shared by every header instance. `ThorostMark` is
 * the icon alone (used on mobile, where the full stacked lockup is too
 * tall); `ThorostLogo` stacks the icon over the terracotta accent line and
 * the "THOROST" wordmark, matching the reference artwork's crest layout.
 */
function ColumnGlyph({ className }) {
  return (
    <g className={className} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="3" x2="32" y2="3" strokeWidth="1.4" />
      <path
        d="M11 3 C7 3 5 5 5 7.4 C5 9.7 7 10.8 8.9 10.2 C10.3 9.7 10.5 8 9.1 7.6 C8.2 7.3 7.6 8 8.1 8.7"
        strokeWidth="1.2"
      />
      <path
        d="M29 3 C33 3 35 5 35 7.4 C35 9.7 33 10.8 31.1 10.2 C29.7 9.7 29.5 8 30.9 7.6 C31.8 7.3 32.4 8 31.9 8.7"
        strokeWidth="1.2"
      />
      <path d="M8.9 10.2 Q20 13.6 31.1 10.2" strokeWidth="1.2" />
      <line x1="12.5" y1="15" x2="11" y2="30" strokeWidth="1.1" />
      <line x1="16.25" y1="15" x2="15.5" y2="30" strokeWidth="1.1" />
      <line x1="20" y1="15" x2="20" y2="30" strokeWidth="1.1" />
      <line x1="23.75" y1="15" x2="24.5" y2="30" strokeWidth="1.1" />
      <line x1="27.5" y1="15" x2="29" y2="30" strokeWidth="1.1" />
      <line x1="8" y1="30" x2="32" y2="30" strokeWidth="1.5" />
    </g>
  );
}

export function ThorostMark({ className = "h-9 w-9" }) {
  return (
    <svg viewBox="0 0 40 34" className={className} aria-hidden="true">
      <ColumnGlyph className="stroke-ink" />
    </svg>
  );
}

export function ThorostLogo({ className = "h-11" }) {
  return (
    <svg viewBox="0 0 90 58" className={className} aria-hidden="true">
      <g transform="translate(25, 0)">
        <ColumnGlyph className="stroke-ink" />
        <line x1="14" y1="35.5" x2="26" y2="35.5" strokeWidth="2" className="stroke-brand" strokeLinecap="round" />
      </g>
      <text
        x="45"
        y="50"
        textAnchor="middle"
        fontSize="10"
        fontWeight="600"
        letterSpacing="0.14em"
        className="fill-ink font-serif"
      >
        THOROST
      </text>
    </svg>
  );
}
