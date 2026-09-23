# Decisions log

Engineering choices I made while building PlugSpot, and why.

1. **Tailwind v4 with `@theme inline` tokens.** I stayed on Tailwind 4 with the CSS-first token system so I could drive the whole design system from a single stylesheet. Dark mode is a class on `<html>` set by a synchronous head script to avoid a flash of unstyled theme on first paint.
2. **Plus Jakarta Sans via `next/font/google`.** Clean, modern, still free.
3. **Icons via SVG only.** Rather than shipping a Node-side icon pipeline (sharp, pngjs), I wrote a single hand-rolled `/icons/icon.svg` and referenced it as `any maskable` in the manifest. Keeps the install experience high fidelity without pulling in native modules.
4. **Hand-rolled service worker instead of Serwist.** Serwist adds a webpack plugin chain that fights with Turbopack. A ~40 line `public/sw.js` covers the offline shell, caches static routes, and skips `/api/*`. If we ever need background sync I can swap in Workbox or Serwist later.
5. **Stayed on `middleware.ts` for now.** Next 16 deprecates it in favour of Proxy, but the deprecation is warning-only and the codemod would sprawl into an unrelated migration. Build passes, and I would rather touch this in a focused PR.
6. **`create_booking` is `SECURITY DEFINER`.** Drivers cannot `INSERT` into `bookings` directly (there is deliberately no insert policy). Every confirmed booking must go through `create_booking`, which enforces the invariants and lets Postgres's exclusion constraint be the source of truth for uniqueness.
7. **Africa/Lagos time everywhere.** Availability windows are stored as local `time` values per weekday and evaluated in `Africa/Lagos` inside both the SQL function and the client (via `date-fns-tz`). No UTC surprises for operators.
8. **Bottom nav is role-aware, not prop-driven.** Passing `LucideIcon` components across a Server > Client Component boundary crashes the build. Instead of forcing every layout to `"use client"`, the nav takes `role: "driver" | "operator"` and looks up the item list internally.
9. **Realtime subscriptions scoped per page.** I subscribe on the station detail page (charger updates) and on the slot picker (booking changes). Blanket app-wide subscription would leak channels; per-page subscribe/unsubscribe is enough for the demo moments and keeps the client tidy.
10. **Business logic sits in `src/lib`, not in route handlers.** Availability generation, cost estimation, and formatting all live in plain functions I can unit test without spinning up Next.js. The route handlers are thin.
11. **Docs live in the repo root.** `README.md` for reviewers, `DEMO.md` as a live click script for judges, this `DECISIONS.md` as the running log.
