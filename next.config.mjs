import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname
  },
  // Routing-only proxy to a separate, private, password-gated Vercel
  // deployment (its own repo, own DATABASE_URL) so it's reachable under this
  // domain. No prospect data, DB credentials, or private code enters this
  // app — Vercel forwards these requests server-to-server; the destination
  // app's own auth gate still runs on every request. See its next.config.mjs
  // for the matching basePath: "/prospects".
  async rewrites() {
    return [
      { source: "/prospects", destination: "https://streetsignal-prospects.vercel.app/prospects" },
      { source: "/prospects/:path*", destination: "https://streetsignal-prospects.vercel.app/prospects/:path*" }
    ];
  }
};

export default nextConfig;
