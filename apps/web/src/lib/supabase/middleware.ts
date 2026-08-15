import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Redirected to /dashboard if the visitor is already logged in — does NOT
// include /reset-password, since that page is precisely where the invite
// and password-recovery flows land an already-authenticated (token-scoped)
// user; bouncing them away from it would strand them before they ever set
// a password.
const PUBLIC_AUTH_ROUTES = ["/login", "/signup", "/forgot-password"];
const PROTECTED_PREFIXES = ["/dashboard"];

// Runs on every request (see src/middleware.ts matcher). Refreshes the
// Supabase session cookie and gates protected routes server-side — the
// authoritative access check still happens in RLS, this is just UX routing.
export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Supabase isn't configured yet (fresh clone, no .env.local): let public
  // pages render instead of 500ing on every request. Auth-gated routes will
  // still fail once actually loaded — that's expected until real
  // credentials are supplied, see README § Sécurité.
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      "[proxy] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set — skipping session refresh and route gating.",
    );
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        supabaseResponse = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  // Do not add logic between createServerClient and getUser(): getUser()
  // is what actually revalidates the token and refreshes the cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicAuthRoute = PUBLIC_AUTH_ROUTES.some((route) => pathname.startsWith(route));
  const isProtectedRoute = PROTECTED_PREFIXES.some((route) => pathname.startsWith(route));

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isPublicAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
