import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sendBookingEmail, sendOperatorBookingEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";

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

  // Send confirmation email to the driver and a heads up to the operator.
  // Never block booking creation on email failures.
  try {
    if (booking?.reference) {
      const { data: charger } = await supabase
        .from("chargers")
        .select("*, stations(*)")
        .eq("id", booking.charger_id)
        .maybeSingle();
      const driverEmail = user.email;
      const startISO = (booking.slot as string).split(",")[0].replace(/[\[\(]/, "");
      const stationName = charger?.stations?.name ?? "PlugSpot station";
      const address = charger?.stations?.address ?? "";
      const label = charger?.label ?? "";
      const cost = Number(booking.estimated_cost);
      const kwh = Number(booking.estimated_kwh);
      if (driverEmail && charger) {
        await sendBookingEmail({
          to: driverEmail, reference: booking.reference, stationName, address,
          chargerLabel: label, startISO, cost, kwh,
        });
      }
      // Look up the operator's email via the service role so we can email them too.
      try {
        const ownerId: string | undefined = charger?.stations?.owner_id;
        if (ownerId) {
          const admin = createAdminClient();
          const { data: owner } = await admin.auth.admin.getUserById(ownerId);
          const opEmail = owner?.user?.email;
          if (opEmail) {
            await sendOperatorBookingEmail({
              to: opEmail,
              reference: booking.reference,
              stationName,
              chargerLabel: label,
              startISO,
              driverEmail: driverEmail ?? "",
              cost,
              kwh,
            });
          }
        }
      } catch (e) {
        console.error("operator email failed", e);
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
