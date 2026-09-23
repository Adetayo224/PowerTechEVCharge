import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });
  const status = body.status === "cancelled" ? "cancelled" : null;
  if (!status) return Response.json({ error: "Only cancel is supported" }, { status: 400 });
  const { data, error } = await supabase.from("bookings").update({ status }).eq("id", id).eq("driver_id", user.id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ booking: data });
}
