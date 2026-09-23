import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const hasRealCreds =
  !!url && !!secret && !!publishable &&
  !secret.startsWith("paste_") && !publishable.startsWith("paste_");

const describeIfLive = hasRealCreds ? describe : describe.skip;

describeIfLive("create_booking (live Supabase)", () => {
  let admin: SupabaseClient;
  let driverClient: SupabaseClient;
  let ownerId = "";
  let driverId = "";
  let stationId = "";
  let chargerAId = "";
  let chargerBId = "";
  const created: string[] = [];

  const email = `test-driver-${Date.now()}@samfred.test`;
  const ownerEmail = `test-owner-${Date.now()}@samfred.test`;
  const password = "Test1234!";

  function nextSlotStart(minutesAhead = 60): Date {
    const d = new Date(Date.now() + minutesAhead * 60_000);
    d.setSeconds(0, 0);
    d.setMinutes(d.getMinutes() >= 30 ? 30 : 0);
    return d;
  }

  beforeAll(async () => {
    admin = createClient(url!, secret!, { auth: { persistSession: false } });

    const { data: o } = await admin.auth.admin.createUser({
      email: ownerEmail, password, email_confirm: true,
      user_metadata: { full_name: "Test Owner", role: "operator" },
    });
    ownerId = o!.user!.id;
    await admin.from("profiles").upsert({ id: ownerId, full_name: "Test Owner", role: "operator" });
    created.push(ownerId);

    const { data: d } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name: "Test Driver", role: "driver" },
    });
    driverId = d!.user!.id;
    await admin.from("profiles").upsert({ id: driverId, full_name: "Test Driver", role: "driver" });
    created.push(driverId);

    const { data: st } = await admin.from("stations").insert({
      owner_id: ownerId, name: "Test Station " + Date.now(), address: "Test", city: "Lagos",
      lat: 6.5, lng: 3.4, amenities: [],
    }).select().single();
    stationId = st!.id;

    const { data: chA } = await admin.from("chargers").insert({
      station_id: stationId, label: "TA", connector_type: "CCS2",
      power_kw: 60, price_per_kwh: 250, status: "online",
    }).select().single();
    chargerAId = chA!.id;

    const { data: chB } = await admin.from("chargers").insert({
      station_id: stationId, label: "TB", connector_type: "CCS2",
      power_kw: 60, price_per_kwh: 250, status: "online",
    }).select().single();
    chargerBId = chB!.id;

    const rows = [chargerAId, chargerBId].flatMap((cid) =>
      Array.from({ length: 7 }, (_, weekday) => ({ charger_id: cid, weekday, open_time: "00:00", close_time: "23:30" }))
    );
    await admin.from("availability").insert(rows);

    driverClient = createClient(url!, publishable!, { auth: { persistSession: false } });
    await driverClient.auth.signInWithPassword({ email, password });
  });

  afterAll(async () => {
    await admin.from("stations").delete().eq("id", stationId);
    for (const uid of created) {
      await admin.auth.admin.deleteUser(uid);
    }
  });

  it("creates a booking and returns a reference", async () => {
    const start = nextSlotStart(60);
    const { data, error } = await driverClient.rpc("create_booking", {
      p_charger_id: chargerAId, p_start_time: start.toISOString(),
    });
    expect(error).toBeNull();
    const row = Array.isArray(data) ? data[0] : data;
    expect(row?.reference).toMatch(/^[A-Z2-9]{8}$/);
  });

  it("prevents double booking on the same slot (Promise.all)", async () => {
    const start = nextSlotStart(120);
    const [a, b] = await Promise.all([
      driverClient.rpc("create_booking", { p_charger_id: chargerAId, p_start_time: start.toISOString() }),
      driverClient.rpc("create_booking", { p_charger_id: chargerAId, p_start_time: start.toISOString() }),
    ]);
    const results = [a, b];
    const okCount = results.filter((r) => !r.error).length;
    const errCount = results.filter((r) => r.error).length;
    expect(okCount).toBe(1);
    expect(errCount).toBe(1);
    const failing = results.find((r) => r.error)!;
    expect(String(failing.error?.message)).toMatch(/just taken/i);
  });

  it("rejects overlap on same charger", async () => {
    const start = nextSlotStart(180);
    const r1 = await driverClient.rpc("create_booking", { p_charger_id: chargerAId, p_start_time: start.toISOString() });
    expect(r1.error).toBeNull();
    const r2 = await driverClient.rpc("create_booking", { p_charger_id: chargerAId, p_start_time: start.toISOString() });
    expect(r2.error).not.toBeNull();
  });

  it("allows the same slot on a different charger", async () => {
    const start = nextSlotStart(240);
    const r1 = await driverClient.rpc("create_booking", { p_charger_id: chargerAId, p_start_time: start.toISOString() });
    const r2 = await driverClient.rpc("create_booking", { p_charger_id: chargerBId, p_start_time: start.toISOString() });
    expect(r1.error).toBeNull();
    expect(r2.error).toBeNull();
  });
});
