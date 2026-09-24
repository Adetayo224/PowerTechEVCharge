import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Body = z.union([
  z.object({ action: z.literal("cancel") }),
  z.object({ action: z.literal("reschedule"), start_time: z.string().datetime() }),
  // Back compat with older client that sent { status: "cancelled" }
  z.object({ status: z.literal("cancelled") }),
]);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "Invalid payload" }, { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const body = parsed.data;
  const isCancel = ("action" in body && body.action === "cancel") || ("status" in body && body.status === "cancelled");

  if (isCancel) {
    const { data, error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("driver_id", user.id)
      .select()
      .single();
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ booking: data });
  }

  if ("action" in body && body.action === "reschedule") {
    const { data, error } = await supabase.rpc("reschedule_booking", {
      p_booking_id: id,
      p_new_start: body.start_time,
    });
    if (error) {
      const msg = error.message || "";
      const friendly = msg.includes("just taken") ? "This slot was just taken. Please pick another." : msg;
      const status = msg.includes("just taken") ? 409 : 400;
      return Response.json({ error: friendly }, { status });
    }
    const booking = Array.isArray(data) ? data[0] : data;
    return Response.json({ booking });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
