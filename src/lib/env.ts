export const env = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "",
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || "",
  SUPABASE_DB_URL: process.env.SUPABASE_DB_URL || "",
  RESEND_API_KEY: process.env.RESEND_API_KEY || "",
  EMAIL_FROM: process.env.EMAIL_FROM || "Samfred Charge <bookings@example.com>",
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
};

export function assertServerEnv() {
  const missing: string[] = [];
  if (!env.SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!env.SUPABASE_SECRET_KEY) missing.push("SUPABASE_SECRET_KEY");
  if (missing.length) throw new Error(`Missing env: ${missing.join(", ")}`);
}
