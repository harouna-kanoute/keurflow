"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  requestPasswordResetSchema,
  signInSchema,
  signUpSchema,
  updatePasswordSchema,
  verifyEmailOtpSchema,
  type RequestPasswordResetInput,
  type SignInInput,
  type SignUpInput,
  type UpdatePasswordInput,
  type VerifyEmailOtpInput,
} from "@keurflow/validation";
import { createClient } from "@/lib/supabase/server";

// Generic fallback per §68 — real Supabase error details never reach the client.
const GENERIC_ERROR = "Une erreur est survenue. Veuillez réessayer.";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export type ActionResult = { error: string } | { error?: undefined };

export async function signIn(input: SignInInput): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return { error: GENERIC_ERROR };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Email ou mot de passe incorrect." };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signUp(input: SignUpInput): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return { error: GENERIC_ERROR };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        country_code: parsed.data.countryCode,
        organization_type: parsed.data.organizationType,
      },
      emailRedirectTo: `${APP_URL}/auth/callback`,
    },
  });
  if (error) {
    console.error("[signUp] Supabase error:", error.status, error.code, error.message);
    if (error.code === "over_email_send_rate_limit") {
      return { error: "Trop de tentatives. Réessayez dans quelques minutes." };
    }
    if (error.message.toLowerCase().includes("already")) {
      return { error: "Un compte existe déjà avec cet email." };
    }
    return { error: GENERIC_ERROR };
  }

  redirect("/signup/check-email");
}

export async function requestPasswordReset(
  input: RequestPasswordResetInput,
): Promise<ActionResult> {
  const parsed = requestPasswordResetSchema.safeParse(input);
  if (!parsed.success) return { error: GENERIC_ERROR };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${APP_URL}/auth/callback?next=/reset-password`,
  });

  // Always succeeds from the caller's perspective, whether or not the email
  // is registered — prevents using this endpoint to enumerate accounts.
  return {};
}

export async function updatePassword(input: UpdatePasswordInput): Promise<ActionResult> {
  const parsed = updatePasswordSchema.safeParse(input);
  if (!parsed.success) return { error: GENERIC_ERROR };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: GENERIC_ERROR };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

// Called only from a Server Action invoked by an explicit "Confirmer" click
// (see auth/confirm) — never from a bare GET. Supabase's own hosted /verify
// link consumes the one-time token on any visit, so an email client or
// security scanner prefetching the link burns it before the real user
// clicks; requiring a POST here means prefetchers (which only issue GETs)
// can't trigger it.
export async function verifyEmailOtp(input: VerifyEmailOtpInput): Promise<ActionResult> {
  const parsed = verifyEmailOtpSchema.safeParse(input);
  if (!parsed.success) return { error: GENERIC_ERROR };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: parsed.data.tokenHash,
    type: parsed.data.type,
  });
  if (error) {
    console.error("[verifyEmailOtp] Supabase error:", error.code, error.message);
    return { error: "Ce lien n'est plus valide ou a expiré. Demandez-en un nouveau." };
  }

  revalidatePath("/", "layout");
  // invite/recovery land the user with no usable password yet — recovery
  // already sends its own explicit ?next=/reset-password, invite doesn't.
  redirect(
    parsed.data.type === "invite" ? "/reset-password" : (parsed.data.next ?? "/dashboard"),
  );
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
