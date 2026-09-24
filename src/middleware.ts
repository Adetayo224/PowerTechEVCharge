import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";

const PUBLIC_PATHS = [
  "/", "/sign-in", "/sign-up", "/offline", "/api/health",
  "/auth/confirm", "/auth/check-email", "/auth/error",
  "/auth/forgot-password", "/auth/reset-password",
  "/sw.js",
];

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({ request: req });

  const supabase = createServerClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (items) => {
        items.forEach(({ name, value, options }) => {
          req.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const path = req.nextUrl.pathname;

  const isPublic =
    PUBLIC_PATHS.includes(path) ||
    path.startsWith("/_next") ||
    path.startsWith("/icons") ||
    path.startsWith("/api/auth") ||
    path.startsWith("/auth/") ||
    path === "/sw.js" ||
    path.endsWith(".png") ||
    path.endsWith(".ico") ||
    path.endsWith(".webmanifest") ||
    path.endsWith(".svg");

  if (!user && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (user && (path === "/sign-in" || path === "/sign-up" || path === "/")) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const url = req.nextUrl.clone();
    url.pathname = profile?.role === "operator" ? "/operator/dashboard" : "/driver/home";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && path.startsWith("/operator")) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "operator") {
      const url = req.nextUrl.clone();
      url.pathname = "/driver/home";
      return NextResponse.redirect(url);
    }
  }
  if (user && path.startsWith("/driver")) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "driver") {
      const url = req.nextUrl.clone();
      url.pathname = "/operator/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
