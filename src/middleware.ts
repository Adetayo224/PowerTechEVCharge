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

  function homeForRole(role?: string) {
    if (role === "admin") return "/admin/dashboard";
    if (role === "operator") return "/operator/dashboard";
    return "/driver/home";
  }

  if (user && (path === "/sign-in" || path === "/sign-up" || path === "/")) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const url = req.nextUrl.clone();
    url.pathname = homeForRole(profile?.role);
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && path.startsWith("/operator")) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "operator") {
      const url = req.nextUrl.clone();
      url.pathname = homeForRole(profile?.role);
      return NextResponse.redirect(url);
    }
  }
  if (user && path.startsWith("/driver")) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "driver") {
      const url = req.nextUrl.clone();
      url.pathname = homeForRole(profile?.role);
      return NextResponse.redirect(url);
    }
  }
  if (user && path.startsWith("/admin")) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "admin") {
      const url = req.nextUrl.clone();
      url.pathname = homeForRole(profile?.role);
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
