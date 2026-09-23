import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");

  if (!token_hash || !type) {
    return NextResponse.redirect(`${origin}/auth/error?reason=missing_token`);
  }

  const response = NextResponse.redirect(`${origin}/`);
  const supabase = createServerClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (items) => {
        items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { error } = await supabase.auth.verifyOtp({ token_hash, type });
  if (error) {
    const url = new URL(`${origin}/auth/error`);
    url.searchParams.set("reason", "verify_failed");
    url.searchParams.set("message", error.message);
    return NextResponse.redirect(url);
  }

  if (type === "recovery") {
    return NextResponse.redirect(`${origin}/auth/reset-password`);
  }

  // Route by role to the right home
  const { data: { user } } = await supabase.auth.getUser();
  let destination = next || "/driver/map";
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    destination = profile?.role === "operator" ? "/operator/dashboard" : "/driver/map";
  }

  const finalUrl = new URL(destination, origin);
  const redirect = NextResponse.redirect(finalUrl);
  // Carry the cookies that supabase set on `response` over to the final redirect
  response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  return redirect;
}
