import "server-only";
import type { NotificationType } from "@keurflow/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "./supabase/admin";

// Server-only: creating a notification writes to *someone else's* row,
// which no RLS policy allows an ordinary user to do directly (see
// notifications_select_own/notifications_update_own — there is
// intentionally no insert policy). Every call site here has already
// authorized the action that triggers the notification through its own
// RLS-respecting path; this just fans out the resulting event.

// Resolves "everyone who can see this project", i.e. the union of the
// organization's staff and the project's own members, minus whoever
// triggered the event (no one needs to be notified of their own action).
// Uses the caller's regular (RLS-respecting) client — these are plain
// reads the caller is already authorized to see.
export async function getProjectAudience(
  supabase: SupabaseClient,
  projectId: string,
  excludeUserId: string,
): Promise<string[]> {
  const { data: project } = await supabase
    .from("projects")
    .select("organization_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return [];

  const [{ data: orgMembers }, { data: projectMembers }] = await Promise.all([
    supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", project.organization_id)
      .eq("status", "active"),
    supabase
      .from("project_members")
      .select("user_id")
      .eq("project_id", projectId)
      .eq("status", "active"),
  ]);

  const ids = new Set<string>();
  for (const m of orgMembers ?? []) if (m.user_id !== excludeUserId) ids.add(m.user_id);
  for (const m of projectMembers ?? []) if (m.user_id !== excludeUserId) ids.add(m.user_id);
  return Array.from(ids);
}

export async function notifyUsers(params: {
  userIds: readonly string[];
  projectId: string;
  type: NotificationType;
  title: string;
  body?: string;
}): Promise<void> {
  if (params.userIds.length === 0) return;

  const admin = createAdminClient();
  const { error } = await admin.from("notifications").insert(
    params.userIds.map((userId) => ({
      user_id: userId,
      project_id: params.projectId,
      type: params.type,
      title: params.title,
      body: params.body ?? null,
    })),
  );

  if (error) {
    console.error("[notifyUsers] Supabase error:", error.code, error.message);
  }
}
