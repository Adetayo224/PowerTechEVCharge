import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sendBookingEmail } from "@/lib/email";

const Body = z.object({
  charger_id: z.string().uuid(),
  start_time: z.string().datetime(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "Invalid payload" }, { status: 400 });

  const { data, error } = await supabase.rpc("create_booking", {
    p_charger_id: parsed.data.charger_id,
    p_start_time: parsed.data.start_time,
  });

  if (error) {
    const msg = error.message || "";
    const friendly = msg.includes("just taken") ? "This slot was just taken. Please pick another." : msg;
    const status = msg.includes("just taken") ? 409 : 400;
    return Response.json({ error: friendly }, { status });
  }

  const booking = Array.isArray(data) ? data[0] : data;

  // send confirmation email if configured, do not block on failure
  try {
    if (booking?.reference) {
      const { data: charger } = await supabase.from("chargers").select("*, stations(*)").eq("id", booking.charger_id).maybeSingle();
      const email = user.email;
      if (email && charger) {
        await sendBookingEmail({
          to: email,
          reference: booking.reference,
          stationName: charger.stations?.name ?? "PlugSpot station",
          address: charger.stations?.address ?? "",
          chargerLabel: charger.label,
          startISO: (booking.slot as string).split(",")[0].replace(/[\[\(]/, ""),
          cost: Number(booking.estimated_cost),
          kwh: Number(booking.estimated_kwh),
        });
      }
    }
  } catch (e) {
    console.error("email send failed", e);
  }

  return Response.json({ booking });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });
  const { data, error } = await supabase
    .from("bookings")
    .select("*, chargers(*, stations(*))")
    .eq("driver_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ bookings: data });
}
