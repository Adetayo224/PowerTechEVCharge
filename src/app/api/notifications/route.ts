import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";
import { z } from "zod";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ notifications: data ?? [] });
}

const PatchBody = z.object({
  read_all: z.boolean().optional(),
  ids: z.array(z.string().uuid()).optional(),
});

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });
  const parsed = PatchBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "Invalid payload" }, { status: 400 });
  const now = new Date().toISOString();
  let query = supabase.from("notifications").update({ read_at: now }).is("read_at", null);
  if (parsed.data.ids?.length) query = query.in("id", parsed.data.ids);
  const { error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true });
}
