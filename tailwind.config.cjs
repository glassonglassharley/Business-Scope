const COLORS = require("./src/lib/colorTokens.json");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: COLORS.ink,
        paper: COLORS.paper,
        surface: COLORS.surface,
        "nested-surface": COLORS.nestedSurface,
        "search-surface": COLORS.searchSurface,
        "search-line": COLORS.searchLine,
        brand: COLORS.brand,
        "brand-soft": COLORS.brandSoft,
        "signal-green": COLORS.signalGreen,
        "signal-amber": COLORS.signalAmber,
        "signal-red": COLORS.signalRed,
        line: COLORS.line
      },
      boxShadow: {
        soft: "0 18px 50px rgba(14, 22, 38, 0.08)"
      }
    }
  },
  plugins: []
};