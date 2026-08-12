import type { NextConfig } from "next";

// Stripe never needs to appear here: checkout is a server-side redirect
// (redirect(session.url) in a Server Action) to a Stripe-hosted page, not a
// client-side fetch/iframe/script — so there's nothing for CSP to allow.
// next/font (layout.tsx) self-hosts fonts at build time, so no Google Fonts
// origin is needed either.
//
// 'unsafe-eval' is dev-only: React's Fast Refresh uses eval() to rebuild
// call stacks in development and warns loudly without it, but (per React's
// own error message) "will never use eval() in production" — so production
// stays without it.
const isDev = process.env.NODE_ENV !== "production";
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  // 'unsafe-inline' is needed for Tailwind's inline style={{ width: ... }}
  // progress bars used throughout the dashboard.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://*.supabase.co https://images.unsplash.com",
  "font-src 'self'",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: CSP },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
