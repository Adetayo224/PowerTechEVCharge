import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.toLowerCase() ?? "";
  const city = sp.get("city") ?? "";
  const connector = sp.get("connector") ?? "";
  const maxPrice = sp.get("maxPrice") ? Number(sp.get("maxPrice")) : null;
  const availableNow = sp.get("availableNow") === "1";

  const supabase = await createClient();
  let query = supabase.from("stations").select("*, chargers(*)");
  if (city) query = query.eq("city", city);
  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 400 });

  let stations = data || [];
  if (q) stations = stations.filter((s) => (s.name + " " + s.city + " " + s.address).toLowerCase().includes(q));
  if (connector) stations = stations.filter((s) => (s.chargers ?? []).some((c: { connector_type: string }) => c.connector_type === connector));
  if (maxPrice !== null) stations = stations.filter((s) => (s.chargers ?? []).some((c: { price_per_kwh: number }) => c.price_per_kwh <= maxPrice));
  if (availableNow) stations = stations.filter((s) => (s.chargers ?? []).some((c: { status: string }) => c.status === "online"));

  return Response.json({ stations });
}

const StationCreate = z.object({
  name: z.string().min(2),
  address: z.string().min(2),
  city: z.string().min(2),
  lat: z.number(),
  lng: z.number(),
  amenities: z.array(z.string()).default([]),
  photo_url: z.string().url().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "operator") return Response.json({ error: "Operator only" }, { status: 403 });

  const body = await req.json();
  const parsed = StationCreate.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });

  const { data, error } = await supabase.from("stations").insert({ ...parsed.data, owner_id: user.id }).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ station: data });
}
