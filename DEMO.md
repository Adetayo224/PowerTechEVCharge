# PlugSpot · 5 minute demo script

Total time: about 5 minutes. Use a phone width window (390 px) so the layout looks native.

**Live app:** https://plugspot.samfredrobotics.com

## 0. Setup (once before the demo)

1. Open the live URL (or `npm run dev` and http://localhost:3000 for local).
2. Sign in as `driver@demo.powertech.ng` / `Demo1234!`.

## 1. Home (30 s)

- Land on `/driver/home`.
- Show the profile card, the animated battery ring (My vehicle), the range in km, the upcoming booking with the live countdown, quick actions, stats, and recent activity.

## 2. Set your location in Lekki (30 s)

- Bottom nav: tap **Map**. Because you have not set a location yet, the top pill reads "Tap map to set your location".
- Tap on Lekki Phase 1 (near Admiralty Way) on the map. A blue car marker drops with a heading arrow. The pill switches to "Location set".

## 3. Find a charger, smart reroute (60 s)

- Drag the bottom sheet up. Point out the list is sorted by **time to start charging** = drive time + estimated wait.
- Point out any **Faster option** card floating above the sheet: "Station X is 4 km farther, but you start charging 12 min sooner". The nearest is Lekki Phase 1; if it happens to be busy the recommendation will point to Ikoyi or Victoria Island.
- Tap **Go there** on the faster option (or tap any station in the list).

## 4. Book a slot (45 s)

- On the station detail page, tap **Book** on an online charger.
- Pick a 30 minute slot and confirm. Booking confirmation shows with a QR reference.

## 5. Turn by turn with voice (75 s)

- Back to Home. Tap **Navigate** on the upcoming booking card.
- The map switches to heading up with 3D tilt. The next turn banner shows the distance to the maneuver, ETA, and remaining km.
- Tap **Start** and set speed to **20x**. The car glides along the route; voice guidance announces upcoming turns ("In 200 metres, turn right onto Adeola Odeku Street"). Toggle **mute** to demonstrate.
- On arrival, the "You have arrived" card appears with a link back to the booking.

## 6. Live queue proof (30 s)

- Open a second window, sign in as `operator@demo.powertech.ng`.
- Wait a few seconds. The **charger_state** table updates every 6 s through Supabase Realtime, so the driver's map shows waiting counts and pulses in real time without a refresh.

## 7. Double booking guard (30 s)

- Back to the driver window. Try to book the exact slot you just took a second time (open the booking flow in a second tab and race). You get a friendly "This slot was just taken. Please pick another." No duplicate row in the database.

## Cheat sheet

- Live URL: https://plugspot.samfredrobotics.com
- Local URL: http://localhost:3000
- Demo driver: `driver@demo.powertech.ng` / `Demo1234!`
- Demo operator: `operator@demo.powertech.ng` / `Demo1234!`
- Reset demo data: `npm run seed`
- Screenshots: `docs/screenshots/` after running `npm run test:e2e -- e2e/screenshots.spec.ts`
