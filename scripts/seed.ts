import "dotenv/config";
import WebSocketImpl from "ws";
// Node 20 does not expose a global WebSocket; supabase-js requires one.
if (typeof (globalThis as unknown as { WebSocket?: unknown }).WebSocket === "undefined") {
  (globalThis as unknown as { WebSocket: unknown }).WebSocket = WebSocketImpl;
}
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const secret = process.env.SUPABASE_SECRET_KEY!;
if (!url || !secret) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}

const admin = createClient(url, secret, { auth: { persistSession: false } });

const DRIVER = {
  email: "driver@demo.powertech.ng",
  password: "Demo1234!",
  full_name: "Ada Driver",
  role: "driver" as const,
  car_model: "Hyundai Kona Electric",
  battery_kwh: 64,
  efficiency_km_per_kwh: 5.6,
  battery_percent: 62,
  target_percent: 80,
};
const OPERATOR = { email: "operator@demo.powertech.ng", password: "Demo1234!", full_name: "Segun Operator", role: "operator" as const };

type Connector = "CCS2" | "Type 2" | "CHAdeMO" | "GB/T";
type Status = "online" | "offline" | "unavailable";
type SeedStation = {
  name: string; address: string; city: string; lat: number; lng: number;
  amenities: string[];
  chargers: { label: string; connector_type: Connector; power_kw: number; price_per_kwh: number; status: Status }[];
};

// Exactly 10 stations, 6 in Lagos + 4 in Abuja, real coordinates on or near real roads.
const STATIONS: SeedStation[] = [
  {
    name: "PlugSpot Lekki Phase 1",
    address: "12 Admiralty Way, Lekki Phase 1, Lagos",
    city: "Lagos",
    lat: 6.4416, lng: 3.4732,
    amenities: ["Cafe", "Restroom", "WiFi"],
    chargers: [
      { label: "A1", connector_type: "CCS2", power_kw: 60, price_per_kwh: 250, status: "online" },
      { label: "A2", connector_type: "Type 2", power_kw: 22, price_per_kwh: 220, status: "online" },
      { label: "A3", connector_type: "CHAdeMO", power_kw: 50, price_per_kwh: 260, status: "unavailable" },
    ],
  },
  {
    name: "PlugSpot Victoria Island",
    address: "1004 Adeola Odeku Street, Victoria Island, Lagos",
    city: "Lagos",
    lat: 6.4281, lng: 3.4219,
    amenities: ["Cafe", "Lounge"],
    chargers: [
      { label: "B1", connector_type: "CCS2", power_kw: 120, price_per_kwh: 300, status: "online" },
      { label: "B2", connector_type: "CCS2", power_kw: 120, price_per_kwh: 300, status: "online" },
    ],
  },
  {
    name: "PlugSpot Ikoyi",
    address: "23A Awolowo Road, Ikoyi, Lagos",
    city: "Lagos",
    lat: 6.4520, lng: 3.4346,
    amenities: ["Cafe"],
    chargers: [
      { label: "C1", connector_type: "CCS2", power_kw: 120, price_per_kwh: 320, status: "online" },
      { label: "C2", connector_type: "Type 2", power_kw: 22, price_per_kwh: 220, status: "online" },
    ],
  },
  {
    name: "PlugSpot Ikeja GRA",
    address: "Mobolaji Bank Anthony Way, Ikeja GRA, Lagos",
    city: "Lagos",
    lat: 6.5835, lng: 3.3557,
    amenities: ["Mall", "Restroom"],
    chargers: [
      { label: "D1", connector_type: "Type 2", power_kw: 22, price_per_kwh: 210, status: "online" },
      { label: "D2", connector_type: "CCS2", power_kw: 60, price_per_kwh: 250, status: "offline" },
    ],
  },
  {
    name: "PlugSpot Yaba Tech Hub",
    address: "Herbert Macaulay Way, Yaba, Lagos",
    city: "Lagos",
    lat: 6.5156, lng: 3.3712,
    amenities: ["Cafe", "WiFi", "Co working"],
    chargers: [
      { label: "E1", connector_type: "CCS2", power_kw: 50, price_per_kwh: 230, status: "online" },
      { label: "E2", connector_type: "Type 2", power_kw: 22, price_per_kwh: 210, status: "online" },
      { label: "E3", connector_type: "GB/T", power_kw: 30, price_per_kwh: 200, status: "online" },
    ],
  },
  {
    name: "PlugSpot Surulere",
    address: "Adeniran Ogunsanya Street, Surulere, Lagos",
    city: "Lagos",
    lat: 6.5017, lng: 3.3559,
    amenities: ["Mall"],
    chargers: [
      { label: "F1", connector_type: "Type 2", power_kw: 22, price_per_kwh: 210, status: "online" },
      { label: "F2", connector_type: "CCS2", power_kw: 50, price_per_kwh: 240, status: "online" },
    ],
  },
  {
    name: "PlugSpot Wuse 2",
    address: "Aminu Kano Crescent, Wuse 2, Abuja",
    city: "Abuja",
    lat: 9.0768, lng: 7.4671,
    amenities: ["Cafe", "Lounge"],
    chargers: [
      { label: "G1", connector_type: "CCS2", power_kw: 120, price_per_kwh: 310, status: "online" },
      { label: "G2", connector_type: "CCS2", power_kw: 60, price_per_kwh: 260, status: "online" },
    ],
  },
  {
    name: "PlugSpot Maitama",
    address: "Aguiyi Ironsi Street, Maitama, Abuja",
    city: "Abuja",
    lat: 9.0851, lng: 7.4895,
    amenities: ["Restroom"],
    chargers: [
      { label: "H1", connector_type: "Type 2", power_kw: 22, price_per_kwh: 220, status: "online" },
      { label: "H2", connector_type: "CHAdeMO", power_kw: 50, price_per_kwh: 260, status: "online" },
    ],
  },
  {
    name: "PlugSpot Garki",
    address: "Ahmadu Bello Way, Garki, Abuja",
    city: "Abuja",
    lat: 9.0344, lng: 7.4899,
    amenities: ["Mall"],
    chargers: [
      { label: "I1", connector_type: "CCS2", power_kw: 60, price_per_kwh: 240, status: "online" },
      { label: "I2", connector_type: "Type 2", power_kw: 22, price_per_kwh: 200, status: "online" },
    ],
  },
  {
    name: "PlugSpot Jabi Lake",
    address: "Jabi Lake Mall, Jabi, Abuja",
    city: "Abuja",
    lat: 9.0704, lng: 7.4183,
    amenities: ["Mall", "Cafe", "WiFi"],
    chargers: [
      { label: "J1", connector_type: "CCS2", power_kw: 120, price_per_kwh: 300, status: "online" },
      { label: "J2", connector_type: "CCS2", power_kw: 60, price_per_kwh: 240, status: "online" },
      { label: "J3", connector_type: "Type 2", power_kw: 22, price_per_kwh: 200, status: "online" },
    ],
  },
];

async function ensureUser(email: string, password: string, full_name: string, role: "driver" | "operator") {
  const { data: list } = await admin.auth.admin.listUsers();
  const existing = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    await admin.from("profiles").upsert({ id: existing.id, full_name, role });
    return existing.id;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name, role },
  });
  if (error || !data.user) throw error ?? new Error("createUser failed");
  await admin.from("profiles").upsert({ id: data.user.id, full_name, role });
  return data.user.id;
}

async function main() {
  console.log("Seeding PlugSpot (10 stations)...");

  const operatorId = await ensureUser(OPERATOR.email, OPERATOR.password, OPERATOR.full_name, OPERATOR.role);
  const driverId = await ensureUser(DRIVER.email, DRIVER.password, DRIVER.full_name, DRIVER.role);
  await admin.from("profiles").update({
    car_model: DRIVER.car_model,
    battery_kwh: DRIVER.battery_kwh,
    efficiency_km_per_kwh: DRIVER.efficiency_km_per_kwh,
    battery_percent: DRIVER.battery_percent,
    target_percent: DRIVER.target_percent,
  }).eq("id", driverId);
  console.log("Users ready", { operatorId, driverId });

  // Clean prior demo data owned by operator (cascades to chargers, availability, bookings, charger_state).
  const { data: prior } = await admin.from("stations").select("id").eq("owner_id", operatorId);
  if (prior && prior.length) {
    console.log(`Removing ${prior.length} prior station(s)`);
    await admin.from("stations").delete().in("id", prior.map((s) => s.id));
  }

  for (const st of STATIONS) {
    const { data: station, error: sErr } = await admin.from("stations").insert({
      owner_id: operatorId,
      name: st.name, address: st.address, city: st.city,
      lat: st.lat, lng: st.lng, amenities: st.amenities, photo_url: null,
    }).select().single();
    if (sErr) throw sErr;

    for (const ch of st.chargers) {
      const { data: charger, error: cErr } = await admin.from("chargers").insert({
        station_id: station.id, label: ch.label, connector_type: ch.connector_type,
        power_kw: ch.power_kw, price_per_kwh: ch.price_per_kwh, status: ch.status,
      }).select().single();
      if (cErr) throw cErr;

      // Availability every day 06:00 to 22:00
      const rows = Array.from({ length: 7 }, (_, weekday) => ({
        charger_id: charger.id, weekday, open_time: "06:00", close_time: "22:00",
      }));
      await admin.from("availability").insert(rows);

      // Seed a live state row so the simulator has something to tick against.
      await admin.from("charger_state").upsert({
        charger_id: charger.id,
        in_use: ch.status === "online" && Math.random() < 0.35,
        waiting: 0,
      });
    }
  }

  // A couple of upcoming demo bookings for the driver.
  const { data: someOnline } = await admin
    .from("chargers")
    .select("id, power_kw, price_per_kwh, status")
    .eq("status", "online")
    .limit(3);
  const align = (d: Date) => { d.setSeconds(0, 0); d.setMinutes(d.getMinutes() >= 30 ? 30 : 0); return d; };
  const in1h = align(new Date(Date.now() + 60 * 60 * 1000));
  const in3h = align(new Date(Date.now() + 3 * 60 * 60 * 1000));
  const in5h = align(new Date(Date.now() + 5 * 60 * 60 * 1000));
  const slots = [in1h, in3h, in5h];
  const ref = () => {
    const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = ""; for (let i = 0; i < 8; i++) s += a[Math.floor(Math.random() * a.length)]; return s;
  };
  for (let i = 0; i < Math.min(slots.length, someOnline?.length ?? 0); i++) {
    const c = someOnline![i];
    const start = slots[i];
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const kwh = Number((c.power_kw * 0.5).toFixed(2));
    const cost = Number((kwh * c.price_per_kwh).toFixed(2));
    await admin.from("bookings").insert({
      reference: ref(),
      charger_id: c.id,
      driver_id: driverId,
      slot: `[${start.toISOString()},${end.toISOString()})`,
      status: "confirmed",
      estimated_kwh: kwh,
      estimated_cost: cost,
    });
  }

  const { count } = await admin.from("stations").select("id", { count: "exact", head: true }).eq("owner_id", operatorId);
  console.log(`Seed complete. Operator now owns ${count} station(s).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
