import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const secret = process.env.SUPABASE_SECRET_KEY!;
if (!url || !secret) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}

const admin = createClient(url, secret, { auth: { persistSession: false } });

const DRIVER = { email: "driver@demo.samfred.com", password: "Demo1234!", full_name: "Ada Driver", role: "driver" as const };
const OPERATOR = { email: "operator@demo.samfred.com", password: "Demo1234!", full_name: "Segun Operator", role: "operator" as const };

type NewStation = {
  name: string; address: string; city: string; lat: number; lng: number;
  amenities: string[]; owner: "operator" | "driver";
  chargers: { label: string; connector_type: "CCS2"|"Type 2"|"CHAdeMO"|"GB/T"; power_kw: number; price_per_kwh: number; status: "online"|"offline"|"unavailable" }[];
};

const STATIONS: NewStation[] = [
  { name: "Samfred Lekki Phase 1", address: "12 Admiralty Way, Lekki", city: "Lagos", lat: 6.4396, lng: 3.4735, amenities: ["Cafe","Restroom","WiFi"], owner: "operator",
    chargers: [
      { label: "A1", connector_type: "CCS2", power_kw: 60, price_per_kwh: 250, status: "online" },
      { label: "A2", connector_type: "Type 2", power_kw: 22, price_per_kwh: 220, status: "online" },
      { label: "A3", connector_type: "CHAdeMO", power_kw: 50, price_per_kwh: 260, status: "offline" },
    ]},
  { name: "Samfred Victoria Island", address: "1004 Adeola Odeku St, VI", city: "Lagos", lat: 6.4281, lng: 3.4219, amenities: ["Cafe","Lounge"], owner: "operator",
    chargers: [
      { label: "B1", connector_type: "CCS2", power_kw: 120, price_per_kwh: 300, status: "online" },
      { label: "B2", connector_type: "CCS2", power_kw: 120, price_per_kwh: 300, status: "online" },
    ]},
  { name: "Samfred Ikeja GRA", address: "Mobolaji Bank Anthony Way, Ikeja", city: "Lagos", lat: 6.5834, lng: 3.3527, amenities: ["Restroom","Mall"], owner: "operator",
    chargers: [
      { label: "C1", connector_type: "Type 2", power_kw: 22, price_per_kwh: 200, status: "online" },
      { label: "C2", connector_type: "CCS2", power_kw: 60, price_per_kwh: 240, status: "unavailable" },
    ]},
  { name: "Samfred Yaba Tech Hub", address: "Herbert Macaulay Way, Yaba", city: "Lagos", lat: 6.5158, lng: 3.3711, amenities: ["Cafe","WiFi","Co working"], owner: "operator",
    chargers: [
      { label: "D1", connector_type: "CCS2", power_kw: 50, price_per_kwh: 230, status: "online" },
      { label: "D2", connector_type: "Type 2", power_kw: 22, price_per_kwh: 210, status: "online" },
    ]},
  { name: "Samfred Ajah", address: "Sangotedo, Ajah", city: "Lagos", lat: 6.4661, lng: 3.5900, amenities: ["Mall","Restroom"], owner: "operator",
    chargers: [
      { label: "E1", connector_type: "CCS2", power_kw: 60, price_per_kwh: 250, status: "online" },
      { label: "E2", connector_type: "GB/T", power_kw: 30, price_per_kwh: 190, status: "online" },
    ]},
  { name: "Samfred Ikoyi", address: "Awolowo Rd, Ikoyi", city: "Lagos", lat: 6.4531, lng: 3.4353, amenities: ["Cafe"], owner: "operator",
    chargers: [
      { label: "F1", connector_type: "CCS2", power_kw: 120, price_per_kwh: 320, status: "online" },
    ]},
  { name: "Samfred Surulere", address: "Adeniran Ogunsanya, Surulere", city: "Lagos", lat: 6.5000, lng: 3.3560, amenities: ["Mall"], owner: "operator",
    chargers: [
      { label: "G1", connector_type: "Type 2", power_kw: 22, price_per_kwh: 200, status: "online" },
      { label: "G2", connector_type: "CCS2", power_kw: 50, price_per_kwh: 240, status: "offline" },
    ]},
  { name: "Samfred Wuse 2", address: "Aminu Kano Cres, Wuse 2", city: "Abuja", lat: 9.0765, lng: 7.4666, amenities: ["Cafe","Lounge"], owner: "operator",
    chargers: [
      { label: "H1", connector_type: "CCS2", power_kw: 120, price_per_kwh: 310, status: "online" },
      { label: "H2", connector_type: "CCS2", power_kw: 60, price_per_kwh: 260, status: "online" },
    ]},
  { name: "Samfred Maitama", address: "Aguiyi Ironsi St, Maitama", city: "Abuja", lat: 9.0850, lng: 7.4894, amenities: ["Restroom"], owner: "operator",
    chargers: [
      { label: "I1", connector_type: "Type 2", power_kw: 22, price_per_kwh: 220, status: "online" },
      { label: "I2", connector_type: "CHAdeMO", power_kw: 50, price_per_kwh: 260, status: "online" },
    ]},
  { name: "Samfred Garki", address: "Ahmadu Bello Way, Garki", city: "Abuja", lat: 9.0342, lng: 7.4894, amenities: ["Mall"], owner: "operator",
    chargers: [
      { label: "J1", connector_type: "CCS2", power_kw: 60, price_per_kwh: 240, status: "online" },
    ]},
  { name: "Samfred Ring Road Ibadan", address: "Ring Road, Ibadan", city: "Ibadan", lat: 7.3646, lng: 3.9074, amenities: ["Restroom","Cafe"], owner: "operator",
    chargers: [
      { label: "K1", connector_type: "CCS2", power_kw: 60, price_per_kwh: 230, status: "online" },
      { label: "K2", connector_type: "Type 2", power_kw: 22, price_per_kwh: 190, status: "online" },
    ]},
  { name: "Samfred Bodija Ibadan", address: "Awolowo Ave, Bodija", city: "Ibadan", lat: 7.4269, lng: 3.9042, amenities: ["Cafe"], owner: "operator",
    chargers: [
      { label: "L1", connector_type: "Type 2", power_kw: 22, price_per_kwh: 200, status: "unavailable" },
      { label: "L2", connector_type: "CCS2", power_kw: 50, price_per_kwh: 240, status: "online" },
    ]},
  { name: "Samfred Ogbomoso Central", address: "Owode Rd, Ogbomoso", city: "Ogbomoso", lat: 8.1339, lng: 4.2436, amenities: ["Restroom"], owner: "operator",
    chargers: [
      { label: "M1", connector_type: "CCS2", power_kw: 60, price_per_kwh: 220, status: "online" },
      { label: "M2", connector_type: "GB/T", power_kw: 30, price_per_kwh: 180, status: "online" },
    ]},
  { name: "Samfred LAUTECH Ogbomoso", address: "LAUTECH Main Gate, Ogbomoso", city: "Ogbomoso", lat: 8.1652, lng: 4.2643, amenities: ["Cafe","WiFi"], owner: "operator",
    chargers: [
      { label: "N1", connector_type: "Type 2", power_kw: 22, price_per_kwh: 190, status: "online" },
    ]},
  { name: "Samfred Apapa", address: "Wharf Rd, Apapa", city: "Lagos", lat: 6.4488, lng: 3.3644, amenities: ["Truck Park"], owner: "operator",
    chargers: [
      { label: "O1", connector_type: "CCS2", power_kw: 120, price_per_kwh: 300, status: "online" },
      { label: "O2", connector_type: "CCS2", power_kw: 120, price_per_kwh: 300, status: "offline" },
    ]},
];

async function ensureUser(email: string, password: string, full_name: string, role: "driver"|"operator") {
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
  console.log("Seeding Samfred Charge...");
  const operatorId = await ensureUser(OPERATOR.email, OPERATOR.password, OPERATOR.full_name, OPERATOR.role);
  const driverId = await ensureUser(DRIVER.email, DRIVER.password, DRIVER.full_name, DRIVER.role);
  console.log("Users ready:", { operatorId, driverId });

  // Clean prior demo data owned by operator
  const { data: existingStations } = await admin.from("stations").select("id").eq("owner_id", operatorId);
  if (existingStations && existingStations.length) {
    const ids = existingStations.map((s) => s.id);
    await admin.from("bookings").delete().in("charger_id",
      (await admin.from("chargers").select("id").in("station_id", ids)).data?.map((c) => c.id) ?? []
    );
    await admin.from("stations").delete().in("id", ids);
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

      // availability every day 06:00 to 22:00
      const rows = Array.from({ length: 7 }, (_, weekday) => ({
        charger_id: charger.id, weekday, open_time: "06:00", close_time: "22:00",
      }));
      await admin.from("availability").insert(rows);
    }
  }

  // Give the driver a couple of sample bookings so the operator dashboard is not empty
  const { data: someOnline } = await admin.from("chargers").select("id, power_kw, price_per_kwh").eq("status", "online").limit(3);
  const now = new Date();
  const align = (d: Date) => { d.setSeconds(0, 0); d.setMinutes(d.getMinutes() >= 30 ? 30 : 0); return d; };
  const in1h = align(new Date(now.getTime() + 60 * 60 * 1000));
  const in3h = align(new Date(now.getTime() + 3 * 60 * 60 * 1000));
  const in5h = align(new Date(now.getTime() + 5 * 60 * 60 * 1000));
  const slots = [in1h, in3h, in5h];
  const ref = () => {
    const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = ""; for (let i = 0; i < 8; i++) s += a[Math.floor(Math.random() * a.length)]; return s;
  };
  for (let i = 0; i < Math.min(3, someOnline?.length ?? 0); i++) {
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

  console.log("Seed complete.");
}

main().catch((e) => { console.error(e); process.exit(1); });
