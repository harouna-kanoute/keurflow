import { createBrowserClient } from "@supabase/ssr";

// Anon key only — safe to expose to the browser bundle because every table
// it can reach is protected by RLS (see supabase/migrations). Never use this
// client for privileged operations; those go through Server Actions/Route
// Handlers using the service role key, which never leaves the server.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
