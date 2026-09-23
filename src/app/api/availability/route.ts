import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateSlotsForDate } from "@/lib/booking";
import { toZonedTime } from "date-fns-tz";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const chargerId = sp.get("charger_id");
  const dateStr = sp.get("date");
  if (!chargerId || !dateStr) return Response.json({ error: "charger_id and date required" }, { status: 400 });

  const supabase = await createClient();
  const { data: charger, error: cErr } = await supabase.from("chargers").select("*").eq("id", chargerId).maybeSingle();
  if (cErr || !charger) return Response.json({ error: "Charger not found" }, { status: 404 });

  const { data: availability } = await supabase.from("availability").select("*").eq("charger_id", chargerId);

  // fetch confirmed bookings for the day (Africa/Lagos)
  const dayStart = new Date(`${dateStr}T00:00:00+01:00`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const { data: bookings } = await supabase
    .from("bookings")
    .select("slot, status")
    .eq("charger_id", chargerId)
    .eq("status", "confirmed");

  const taken = (bookings ?? []).map((b) => {
    // slot format: [start,end)
    const raw = (b.slot as string).replace(/[\[\]\(\)]/g, "");
    const [start, end] = raw.split(",");
    return { start: new Date(start), end: new Date(end) };
  }).filter((t) => t.end > dayStart && t.start < dayEnd);

  const date = toZonedTime(dayStart, "Africa/Lagos");
  const slots = generateSlotsForDate({
    date,
    availability: availability ?? [],
    taken,
  });

  return Response.json({
    charger,
    online: charger.status === "online",
    slots: slots.map((s) => ({ start: s.start.toISOString(), end: s.end.toISOString(), available: s.available, reason: s.reason })),
  });
}
