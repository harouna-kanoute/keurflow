import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardChrome } from "@/components/dashboard-chrome";

const ORGANIZATION_TYPE_LABELS: Record<string, string> = {
  individual: "Particulier",
  agency: "Agence immobilière",
  company: "Entreprise",
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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

  const { count: unreadNotificationCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);

  // RLS (organization_members_select_same_org / organizations_select_members)
  // scopes both queries to organizations this user actually belongs to.
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  const { data: organization } = membership
    ? await supabase
        .from("organizations")
        .select("name, type")
        .eq("id", membership.organization_id)
        .single()
    : { data: null };

  return (
    <DashboardChrome
      userName={profile?.full_name ?? null}
      userEmail={user.email ?? ""}
      userAvatarUrl={avatarSignedUrl}
      organizationName={organization?.name ?? null}
      organizationTypeLabel={
        organization ? (ORGANIZATION_TYPE_LABELS[organization.type] ?? organization.type) : null
      }
      unreadNotificationCount={unreadNotificationCount ?? 0}
      hasOrganization={!!organization}
    >
      {children}
    </DashboardChrome>
  );
}
