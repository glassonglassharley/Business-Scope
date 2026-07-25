"use client";

import { useState } from "react";
import Link from "next/link";
import { BRAND } from "@/lib/brand";

const NAV_ITEMS = [
  ["How It Works", "/#how-it-works"],
  ["Sample Report", "/sample-report"],
  ["Cleanup", "/cleanup"],
  ["What We Check", "/what-we-check"],
  ["FAQ", "/faq"]
];

/**
 * Sticky site header used on every page: wordmark, desktop nav, and the
 * mobile hamburger toggle. The homepage keeps its own richer header (it
 * has extra owner-mode nav and SPA view-switching this shared version
 * doesn't need); this component is for every other static page.
 */
export function SiteHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="no-print sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-5">
        <Link className="wordmark" aria-label={`${BRAND} home`} href="/">
          <span className="wordmark-mark" aria-hidden="true">SS</span>
          <span>{BRAND}</span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
          {NAV_ITEMS.map(([label, href]) => <Link key={label} className="nav-link" href={href}>{label}</Link>)}
        </nav>
        <button
          className="inline-flex h-11 w-11 items-center justify-center rounded-md text-ink transition hover:text-brand focus:outline-none focus:ring-2 focus:ring-brand/20 lg:hidden"
          type="button"
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-menu"
          aria-label="Menu"
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          <svg width="22" height="16" viewBox="0 0 22 16" fill="none" aria-hidden="true">
            <line x1="0" y1="1" x2="22" y2="1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="8" x2="22" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="15" x2="22" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {mobileMenuOpen && (
        <nav id="mobile-menu" className="grid gap-2 border-t border-line bg-surface px-4 py-3 lg:hidden" aria-label="Mobile navigation">
          {NAV_ITEMS.map(([label, href]) => <Link key={label} className="nav-link" href={href} onClick={() => setMobileMenuOpen(false)}>{label}</Link>)}
        </nav>
      )}
    </header>
  );
}
