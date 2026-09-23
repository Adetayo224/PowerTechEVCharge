import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const ChargerCreate = z.object({
  station_id: z.string().uuid(),
  label: z.string().min(1),
  connector_type: z.enum(["CCS2", "Type 2", "CHAdeMO", "GB/T"]),
  power_kw: z.number().positive(),
  price_per_kwh: z.number().nonnegative(),
  status: z.enum(["online", "offline", "unavailable"]).default("online"),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });
  const body = await req.json();
  const parsed = ChargerCreate.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid payload" }, { status: 400 });
  const { data, error } = await supabase.from("chargers").insert(parsed.data).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  // default availability: every day 06:00 to 22:00
  await supabase.from("availability").insert(
    Array.from({ length: 7 }, (_, weekday) => ({ charger_id: data.id, weekday, open_time: "06:00", close_time: "22:00" }))
  );
  return Response.json({ charger: data });
}
