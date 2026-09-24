import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Surface Vercel's build commit so the SW route can version its cache.
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev",
  },
  async headers() {
    return [
      // Service worker must never be cached by the browser so update checks
      // always hit the network.
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
      // Same for the web app manifest so start_url / icons refresh on deploy.
      {
        source: "/manifest.webmanifest",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
      // Every top-level HTML response is uncached; static asset chunks under
      // /_next/static keep their long-lived immutable cache headers.
      {
        source: "/:path((?!_next/|api/|icons/|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|otf|css|js|map|json|webmanifest)).*)",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
    ];
  },
};

export default nextConfig;
