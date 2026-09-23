import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });
  const { error } = await supabase.rpc("tick_charger_state", { p_interval_seconds: 5 });
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true, at: new Date().toISOString() });
}
