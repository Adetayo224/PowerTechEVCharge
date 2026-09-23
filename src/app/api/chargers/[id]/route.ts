import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const ChargerPatch = z.object({
  status: z.enum(["online","offline","unavailable"]).optional(),
  price_per_kwh: z.number().nonnegative().optional(),
  label: z.string().optional(),
  connector_type: z.enum(["CCS2","Type 2","CHAdeMO","GB/T"]).optional(),
  power_kw: z.number().positive().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });
  const body = await req.json();
  const parsed = ChargerPatch.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid payload" }, { status: 400 });
  const { data, error } = await supabase.from("chargers").update(parsed.data).eq("id", id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ charger: data });
}
