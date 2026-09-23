import { createClient as createBase } from "@supabase/supabase-js";
import { env } from "@/lib/env";

let cached: ReturnType<typeof createBase> | null = null;

export function createAdminClient() {
  if (!env.SUPABASE_SECRET_KEY) throw new Error("SUPABASE_SECRET_KEY missing");
  if (cached) return cached;
  cached = createBase(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
