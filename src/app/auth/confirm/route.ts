import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (!token_hash || !type) {
    return NextResponse.redirect(`${origin}/auth/error?reason=missing_token`);
  }

  // We create a scratch cookie jar. For signup we throw the session away right after verifying so
  // the user has to sign in themselves. For recovery we keep it so they can set a new password.
  const scratch = NextResponse.redirect(`${origin}/`);
  const supabase = createServerClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (items) => {
        items.forEach(({ name, value, options }) => scratch.cookies.set(name, value, options));
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
    // Keep the session so the user can update their password.
    const redirect = NextResponse.redirect(`${origin}/auth/reset-password`);
    scratch.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  // Signup / email confirmation: do NOT auto sign in.
  // Sign the fresh session out and send the user to /sign-in with a friendly notice.
  await supabase.auth.signOut();

  const signInUrl = new URL(`${origin}/sign-in`);
  signInUrl.searchParams.set("confirmed", "1");
  const redirect = NextResponse.redirect(signInUrl);
  // Copy the signed out cookies (which clear any residual session) onto the final response.
  scratch.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  return redirect;
}
