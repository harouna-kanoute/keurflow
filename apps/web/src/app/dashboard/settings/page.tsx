import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";
import { AvatarUpload } from "./avatar-upload";
import { EmailForm } from "./email-form";
import { PasswordForm } from "./password-form";
import { DeleteAccountForm } from "./delete-account-form";

export const metadata: Metadata = { title: "Mon profil — KeurFlow" };

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">{title}</h2>
      {description && (
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .single();

  let avatarSignedUrl: string | null = null;
  if (profile?.avatar_url) {
    const { data: signed } = await supabase.storage
      .from("avatars")
      .createSignedUrl(profile.avatar_url, 3600);
    avatarSignedUrl = signed?.signedUrl ?? null;
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-canvas px-6 py-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Mon profil</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Gérez vos informations personnelles et les paramètres de votre compte.
          </p>
        </div>

        <SettingsSection title="Photo de profil">
          <AvatarUpload
            userId={user.id}
            displayName={profile?.full_name || user.email || ""}
            avatarSignedUrl={avatarSignedUrl}
          />
        </SettingsSection>

        <SettingsSection title="Informations personnelles">
          <ProfileForm fullName={profile?.full_name ?? ""} />
        </SettingsSection>

        <SettingsSection
          title="Adresse email"
          description="Un email de confirmation sera envoyé à la nouvelle adresse avant qu'elle ne soit activée."
        >
          <EmailForm currentEmail={user.email ?? ""} />
        </SettingsSection>

        <SettingsSection title="Mot de passe">
          <PasswordForm />
        </SettingsSection>

        <DeleteAccountForm email={user.email ?? ""} />
      </div>
    </div>
  );
}
