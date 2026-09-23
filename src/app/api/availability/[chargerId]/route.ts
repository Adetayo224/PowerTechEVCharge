import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Body = z.object({
  windows: z.array(z.object({
    weekday: z.number().int().min(0).max(6),
    open_time: z.string().regex(/^\d{2}:\d{2}$/),
    close_time: z.string().regex(/^\d{2}:\d{2}$/),
  })),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ chargerId: string }> }) {
  const { chargerId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "Invalid payload" }, { status: 400 });

  await supabase.from("availability").delete().eq("charger_id", chargerId);
  const rows = parsed.data.windows.map((w) => ({ charger_id: chargerId, ...w }));
  const { error } = await supabase.from("availability").insert(rows);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true });
}
