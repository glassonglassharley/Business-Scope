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
        "brand-hover": COLORS.brandHover,
        "brand-soft": COLORS.brandSoft,
        "signal-green": COLORS.signalGreen,
        "signal-amber": COLORS.signalAmber,
        "signal-red": COLORS.signalRed,
        line: COLORS.line,
        slate: {
          200: "#E7E5E4",
          300: "#D6D3D1",
          400: "#A8A29E",
          500: "#57534E",
          600: "#57534E",
          700: "#57534E"
        }
      },
      boxShadow: {
        soft: "0 18px 50px rgba(28, 25, 23, 0.08)"
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"]
      }
    }
  },
  plugins: []
};