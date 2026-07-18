import { BRAND, TAGLINE } from "@/lib/brand";
import "./globals.css";

const description = "See where your online presence is costing you calls and customers. Get a free 0\u2013100 snapshot with the top fixes that matter most.";
const title = `${BRAND} \u2014 ${TAGLINE}`;
const url = "https://business-scope.vercel.app/";

export const metadata = {
  metadataBase: new URL(url),
  title,
  description,
  alternates: {
    canonical: url
  },
  openGraph: {
    type: "website",
    siteName: BRAND,
    title,
    description,
    url
  },
  twitter: {
    card: "summary_large_image",
    title,
    description
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}