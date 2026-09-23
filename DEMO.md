# PlugSpot · 5 minute demo script

Total time: about 5 minutes. Open two browser windows side by side at phone width (390 px) so you can show real time updates.

## 0. Setup (once before the demo)

1. `npm run dev` in one terminal.
2. Left window: sign in as `driver@demo.powertech.ng` / `Demo1234!`
3. Right window: sign in as `operator@demo.powertech.ng` / `Demo1234!`

## 1. Cover screen (15 s)

- Fresh tab on `/`, show the animated splash, tagline, and the two role buttons.
- Highlight: mobile first PWA, installable from Profile.

## 2. Driver: find a station (60 s)

- Left window is on `/driver/map`. Point out the count chip, pulsing green markers on stations with a charger online, and dark/light theme awareness.
- Tap a marker in Lekki. The bottom sheet slides up. Show chargers, price, status pairs (icon plus label).
- Tap View station. Show the details page: chargers list, connector, kW, price in Naira, Open in Google Maps.

## 3. Driver: book a slot (60 s)

- Tap Book on an online charger.
- Show the date strip (next 7 days) and the 30 minute slot grid. Past slots are struck through, taken slots are greyed.
- Tap a slot. Estimated cost updates live. Tap Confirm booking.
- Success screen with animated check, 8 char reference, QR code, and a summary.
- Confirmation email is queued via Resend if `RESEND_API_KEY` is set.

## 4. Live status change (45 s)

- On the operator window, go to Stations, pick the same Lekki station, and tap Offline on the charger the driver just booked from.
- Left window driver station detail page updates the status badge to Offline within a second (Supabase Realtime).

## 5. Double booking (60 s, the money moment)

- Back on the driver window, refresh the map, pick a different station, book a slot.
- Open a second driver tab (also signed in as the same driver), race to the same slot on the same charger.
- Second attempt returns `This slot was just taken. Please pick another.` The row count in the database stays exactly one confirmed booking.
- Optional: `npm test` shows the automated version passing (`prevents double booking on the same slot (Promise.all)`).

## 6. Operator dashboard (60 s)

- Switch to operator window > Dashboard.
- Animated counter cards: Stations, Online chargers, Bookings today, Revenue today.
- 7 day bar chart animates in.
- Recent bookings list includes the ones the driver just created.
- Bookings tab: filter by station and status.

## 7. PWA (30 s)

- Profile > Install app (Chromium prompt), or Add to Home Screen on iOS.
- Show the app icon, standalone launch, safe area bottom nav.

## Cheat sheet

- Demo driver: `driver@demo.powertech.ng` / `Demo1234!`
- Demo operator: `operator@demo.powertech.ng` / `Demo1234!`
- Local URL: http://localhost:3000
- Reset demo data: `npm run seed`
