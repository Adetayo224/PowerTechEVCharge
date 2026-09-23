# PlugSpot

Find a charger. Book your slot. Drive on.

**Live demo:** https://plugspot.samfredrobotics.com

An installable, mobile first PWA for EV drivers and station operators in Nigeria.

**Built for PowerTech Nigeria.** PlugSpot is a PowerTech Nigeria product.

## Highlights

- Driver flow: map, search + filters, station detail, slot picker, booking, QR reference, email confirmation, cancellation.
- Operator flow: dashboard with animated counters, station and charger management with pin picker, one tap status toggle, bookings filter.
- Real time updates: charger status changes and new bookings propagate live to open driver sessions using Supabase Realtime.
- Double booking prevention enforced in Postgres via `EXCLUDE USING gist` plus a `SECURITY DEFINER` function; hostile concurrent bookings on the same slot resolve to exactly one confirmed booking.
- Truly dark theme, glossy green primary, glass cards, Motion transitions, respects reduced motion.
- Prices in Naira, dates in Africa/Lagos time.

## Architecture

```mermaid
graph LR
  A[Next.js 16 App Router / PWA] -- SSR --> B[Supabase Auth]
  A -- Realtime --> C[Supabase Realtime]
  A -- REST --> D[Route Handlers /api]
  D -- RPC create_booking --> E[Postgres]
  D -- SQL --> E
  E -- pub/sub --> C
  D -- SDK --> F[Resend Email]
  A -- Tiles --> G[Leaflet + CARTO OSM]
```

## Data model

| Table | Purpose |
| --- | --- |
| `profiles` | Mirrors `auth.users`, holds `role` (`driver` or `operator`) |
| `stations` | Owned by an operator, has coordinates and amenities |
| `chargers` | Belong to a station, have status, connector, power, price |
| `availability` | Weekly recurring hours per charger |
| `bookings` | 30 minute `tstzrange` slots, unique 8 char reference, status |

`bookings` carries `exclude using gist (charger_id with =, slot with &&) where (status = 'confirmed')` so overlapping confirmed slots on the same charger cannot exist.

## Double booking prevention

The `create_booking` Postgres function is `SECURITY DEFINER` and does the following inside a single statement:

1. Verifies the charger is online.
2. Verifies the slot is 30 minutes, aligned to `:00` or `:30`, in the future.
3. Verifies the slot is fully inside an availability window (in Africa/Lagos time).
4. Inserts a confirmed booking with a fresh 8 char reference.

If two concurrent transactions attempt the same slot, Postgres raises `exclusion_violation` on the losing one. The function catches that and re-raises the friendly message `This slot was just taken. Please pick another.` The API route maps that to HTTP 409.

## Setup

Prereqs: Node 20+ (Node 22 recommended), a Supabase project, a Resend account (optional for email), `psql` for applying migrations.

1. `cp .env.example .env.local` and fill in the values.
2. `npm install`
3. Apply migrations:
   ```
   psql "$SUPABASE_DB_URL" -f supabase/migrations/0001_init.sql
   psql "$SUPABASE_DB_URL" -f supabase/migrations/0002_rls.sql
   ```
   or `npm run db:push` after exporting `SUPABASE_DB_URL`.
4. Seed:
   ```
   npm run seed
   ```
5. `npm run dev` and open http://localhost:3000

### Demo accounts

- Driver: `driver@demo.powertech.ng` / `Demo1234!`
- Operator: `operator@demo.powertech.ng` / `Demo1234!`

## Environment variables

| Name | Where |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | client + server |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | client + server |
| `SUPABASE_SECRET_KEY` | server only (used by `scripts/seed.ts` and never imported by client) |
| `SUPABASE_DB_URL` | migrations |
| `RESEND_API_KEY` | server only (booking email + auth email via Supabase SMTP) |
| `EMAIL_FROM` | server, e.g. `PlugSpot <bookings@samfredrobotics.com>` |
| `NEXT_PUBLIC_APP_URL` | client + server, used as `emailRedirectTo` base |

### Email setup (Resend + Supabase Auth)

1. Verify your sending domain in Resend (this project uses `samfredrobotics.com`).
2. Put the real `RESEND_API_KEY` and `EMAIL_FROM` in `.env.local`. The `.env.example` shows the expected shape but no real values.
3. Booking emails are sent from the server through Resend using `EMAIL_FROM`.
4. Supabase Auth sends signup and password reset emails through Resend SMTP. Configure that in the Supabase dashboard: Authentication > Emails > SMTP settings. Host: `smtp.resend.com`, port `465`, username `resend`, password: your Resend API key.
5. Paste the two branded templates from `supabase/templates/` into Supabase > Authentication > Emails > Templates (Confirm signup and Reset password). Both link to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=...` which is verified server side at `src/app/auth/confirm/route.ts`.
6. Test the pipeline: `npm run test:email` sends a real message to the address you pass on the CLI (defaults to `adetayosaka045@gmail.com`).

## Auth flows

- `/sign-up` posts to Supabase with `emailRedirectTo: NEXT_PUBLIC_APP_URL/auth/confirm`, then routes to `/auth/check-email` with an animated "Check your email" screen and a resend button on a 60 second cooldown.
- `/auth/confirm` calls `supabase.auth.verifyOtp({ token_hash, type })`, then routes the user to their role home (driver or operator). Failures land on `/auth/error` with a friendly message.
- `/sign-in` catches the "email not confirmed" error and inlines a Resend confirmation email button.
- `/auth/forgot-password` sends a password reset email; the recovery link comes back through `/auth/confirm?type=recovery` and hands off to `/auth/reset-password`.

## Tests

```
npm test           # unit + integration (integration skips without live creds)
npm run test:e2e   # Playwright driver + operator flows against a running dev server
```

Unit tests cover slot generation (window respect, past slot rejection, taken slot detection), pricing, references, and formatters. The integration suite exercises `create_booking` for the happy path and drives two concurrent identical bookings to prove exactly one succeeds. E2E tests hit the seeded demo accounts.

## Deployment

The production app is deployed on Vercel at **https://plugspot.samfredrobotics.com** with the custom domain routed through Cloudflare DNS (CNAME `plugspot` → the Vercel target host, proxy off).

### Vercel setup

1. Import `Adetayo224/PowerTechEVCharge` in Vercel.
2. Under Project Settings > Domains, add `plugspot.samfredrobotics.com` and follow Vercel's DNS instructions. In Cloudflare, set a CNAME on the `plugspot` subdomain to the value Vercel gives you and leave the proxy toggle off so Vercel can issue the TLS certificate.
3. Under Project Settings > Environment Variables, set the same names listed in the table above (no values shown here):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY`
   - `SUPABASE_DB_URL`
   - `RESEND_API_KEY`
   - `EMAIL_FROM`
   - `NEXT_PUBLIC_APP_URL` — production value is `https://plugspot.samfredrobotics.com`
4. Migrations must be applied to your Supabase project before the first request.

### Supabase URL configuration

Under Authentication > URL Configuration in the Supabase dashboard:

- **Site URL:** `https://plugspot.samfredrobotics.com`
- **Additional redirect URLs:**
  - `https://plugspot.samfredrobotics.com/auth/confirm`
  - `http://localhost:3000/auth/confirm` (for local development)

The signup and password reset flows send `emailRedirectTo` values under this base, so every listed URL must appear in the allowlist above.

## Roadmap

- Paystack payments for pay per session.
- Live charger telemetry through OCPP so real hardware pushes status without operator taps.
- Push reminders 15 minutes before a slot starts.
- Operator revenue analytics: peak hours heatmap, utilization by connector, month over month trend.
