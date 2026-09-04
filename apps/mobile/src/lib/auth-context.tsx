import { Session } from "@supabase/supabase-js";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextValue>({ session: null, loading: true });

// Activates any project_members rows this user was invited to but never
// accepted (status 'invited' -> 'active') — without this, RLS
// (is_project_member requires status = 'active') leaves an accepted invite
// permanently invisible. Web calls the same RPC after every sign-in
// (apps/web/src/app/(auth)/actions.ts); mobile needs it on cold start too
// (not just a fresh sign-in) because a session here persists across app
// restarts for a long time — a user invited while already logged in would
// otherwise never see the project until their next explicit sign-in, which
// on mobile can be effectively never.
async function acceptPendingInvites() {
  const { error } = await supabase.rpc("accept_project_invites");
  if (error) {
    console.error("[acceptPendingInvites] Supabase error:", error.code, error.message);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      if (data.session) acceptPendingInvites();
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (event === "SIGNED_IN") acceptPendingInvites();
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ session, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
