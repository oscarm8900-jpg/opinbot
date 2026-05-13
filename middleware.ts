import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Replit Secrets may have these values swapped — detect and fix
const _v1 = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const _v2 = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const _isUrl = (v: string) =>
  typeof v === "string" && (v.startsWith("https://") || v.startsWith("http://"));

const SUPABASE_URL = _isUrl(_v1) ? _v1 : _isUrl(_v2) ? _v2 : null;
const SUPABASE_ANON_KEY = _isUrl(_v1) ? _v2 : _isUrl(_v2) ? _v1 : null;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // If Supabase isn't configured correctly, skip auth checks and allow all routes
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });
  let user = null;

  try {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    // Refresh session — IMPORTANT: do not add logic between createServerClient and getUser
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Supabase misconfigured — allow through without auth enforcement
    return NextResponse.next({ request });
  }

  // Protect /dashboard routes
  if (pathname.startsWith("/dashboard") && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Protect /api routes except /api/public/*
  if (
    pathname.startsWith("/api") &&
    !pathname.startsWith("/api/public") &&
    !user
  ) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Redirect authenticated users away from login/register
  if ((pathname === "/login" || pathname === "/register") && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
