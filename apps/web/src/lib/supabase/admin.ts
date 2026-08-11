import { createClient } from "@supabase/supabase-js";

// SERVICE ROLE — bypasses RLS entirely. Only ever import this from a Server
// Action or Route Handler, never a Client Component (§62). Next.js won't
// inline SUPABASE_SERVICE_ROLE_KEY into the client bundle since it isn't
// NEXT_PUBLIC_-prefixed, so an accidental client-side import fails at
// runtime (the env var reads as undefined there) instead of leaking the key.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "createAdminClient requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
