import { BRAND, SITE_URL, TAGLINE } from "@/lib/brand";
import "./globals.css";

const description = "Find inaccurate business details, broken customer links, trust gaps, and other public-facing issues that may be costing your local business calls, visits, and bookings.";
const title = `${BRAND} | ${TAGLINE}`;

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: title,
    template: `%s | ${BRAND}`
  },
  description,
  alternates: {
    canonical: SITE_URL
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png"
  },
  openGraph: {
    type: "website",
    siteName: BRAND,
    title,
    description,
    url: SITE_URL,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: `${BRAND} local business presence checkup preview`
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/opengraph-image"]
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
