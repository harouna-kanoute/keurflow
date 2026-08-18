"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  deleteAccountSchema,
  updateAvatarSchema,
  updateEmailSchema,
  updateProfileSchema,
  type DeleteAccountInput,
  type UpdateAvatarInput,
  type UpdateEmailInput,
  type UpdateProfileInput,
} from "@keurflow/validation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Generic fallback per §68 — real Supabase error details never reach the client.
const GENERIC_ERROR = "Une erreur est survenue. Veuillez réessayer.";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export type ActionResult = { error?: string; message?: string };

export async function updateProfile(input: UpdateProfileInput): Promise<ActionResult> {
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) return { error: GENERIC_ERROR };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: GENERIC_ERROR };

  // RLS (profiles_update_own) is the authoritative check — this can only
  // ever touch the caller's own row regardless of what's passed. phone is
  // always overwritten (including to null) to match how fullName behaves —
  // an omitted/empty field means "cleared", not "leave unchanged".
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, phone: parsed.data.phone ?? null })
    .eq("id", user.id);

  if (error) {
    console.error("[updateProfile] Supabase error:", error.code, error.message);
    return { error: GENERIC_ERROR };
  }

  revalidatePath("/", "layout");
  return {};
}

export async function updateAvatar(input: UpdateAvatarInput): Promise<ActionResult> {
  const parsed = updateAvatarSchema.safeParse(input);
  if (!parsed.success) return { error: GENERIC_ERROR };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: GENERIC_ERROR };

  // The upload itself (avatars_insert_own) already only allows writing under
  // "{own_user_id}/..." — this just rejects a path claiming to be someone
  // else's before it's trusted as the new avatar_url.
  if (!parsed.data.storagePath.startsWith(`${user.id}/`)) {
    return { error: GENERIC_ERROR };
  }

  const { data: previous } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .single();

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: parsed.data.storagePath })
    .eq("id", user.id);

  if (error) {
    console.error("[updateAvatar] Supabase error:", error.code, error.message);
    return { error: GENERIC_ERROR };
  }

  // Best-effort cleanup of the old file — a leftover orphan object isn't
  // worth failing the (already-succeeded) avatar change over.
  if (previous?.avatar_url && previous.avatar_url !== parsed.data.storagePath) {
    await supabase.storage.from("avatars").remove([previous.avatar_url]);
  }

  revalidatePath("/", "layout");
  return {};
}

export async function removeAvatar(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: GENERIC_ERROR };

  const { data: previous } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .single();

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", user.id);

  if (error) {
    console.error("[removeAvatar] Supabase error:", error.code, error.message);
    return { error: GENERIC_ERROR };
  }

  if (previous?.avatar_url) {
    await supabase.storage.from("avatars").remove([previous.avatar_url]);
  }

  revalidatePath("/", "layout");
  return {};
}

export async function requestEmailChange(input: UpdateEmailInput): Promise<ActionResult> {
  const parsed = updateEmailSchema.safeParse(input);
  if (!parsed.success) return { error: GENERIC_ERROR };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser(
    { email: parsed.data.email },
    { emailRedirectTo: `${APP_URL}/auth/callback` },
  );

  if (error) {
    console.error("[requestEmailChange] Supabase error:", error.code, error.message);
    if (error.code === "over_email_send_rate_limit") {
      return { error: "Trop de tentatives. Réessayez dans quelques minutes." };
    }
    if (error.message.toLowerCase().includes("already")) {
      return { error: "Un compte existe déjà avec cet email." };
    }
    return { error: GENERIC_ERROR };
  }

  return {
    message:
      "Vérifiez votre nouvelle adresse email : un lien de confirmation vient de vous être envoyé.",
  };
}

export async function deleteAccount(input: DeleteAccountInput): Promise<ActionResult> {
  const parsed = deleteAccountSchema.safeParse(input);
  if (!parsed.success) return { error: GENERIC_ERROR };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: GENERIC_ERROR };

  if (parsed.data.confirmEmail !== user.email?.toLowerCase()) {
    return { error: "L'adresse email ne correspond pas." };
  }

  // organizations.owner_id has no ON DELETE CASCADE from auth.users (by
  // design — losing an owner must never silently vaporize an entire
  // organization's chantiers). Block instead of erroring out on the FK.
  const { data: ownedOrgs } = await supabase
    .from("organizations")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1);
  if (ownedOrgs && ownedOrgs.length > 0) {
    return {
      error:
        "Vous êtes propriétaire d'une organisation. Transférez-la ou supprimez-la avant de supprimer votre compte.",
    };
  }

  // Captured before the delete — profiles cascades away with auth.users, so
  // this is the last point avatar_url is still reachable.
  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  // Deleting the auth.users row itself is what everything else (profile,
  // organization_members, project_members, ...) cascades from — none of
  // that is reachable through the RLS-scoped client, hence the admin client.
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("[deleteAccount] Supabase error:", error.code, error.message);
    return { error: GENERIC_ERROR };
  }

  // Best-effort: the account is already gone either way, an orphaned avatar
  // file isn't worth surfacing an error for at this point.
  if (profile?.avatar_url) {
    const { error: storageError } = await admin.storage.from("avatars").remove([profile.avatar_url]);
    if (storageError) {
      console.error("[deleteAccount] avatar cleanup error:", storageError.message);
    }
  }

  await supabase.auth.signOut();
  redirect("/");
}
