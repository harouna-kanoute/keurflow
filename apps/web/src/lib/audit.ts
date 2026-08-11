import "server-only";
import type { AuditAction } from "@keurflow/types";
import { createAdminClient } from "./supabase/admin";

// Server-only, same reasoning as notifications.ts: writing an audit_logs row
// must never be something the acting user's own client can do (they could
// tamper with their own trail), so every write goes through the admin
// client, called only after the triggering action's own RLS-respecting
// path has already succeeded.
export async function logAudit(params: {
  projectId?: string | null;
  // Pass organizationId directly when already known (e.g. right after
  // creating the organization/project itself) to skip the lookup below.
  organizationId?: string | null;
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const admin = createAdminClient();

  let organizationId = params.organizationId ?? null;
  if (!organizationId && params.projectId) {
    const { data: project } = await admin
      .from("projects")
      .select("organization_id")
      .eq("id", params.projectId)
      .maybeSingle();
    organizationId = project?.organization_id ?? null;
  }
  // No organization to attribute this to — skip rather than fail the
  // caller's action over a missing audit trail entry.
  if (!organizationId) return;

  const { error } = await admin.from("audit_logs").insert({
    organization_id: organizationId,
    project_id: params.projectId ?? null,
    user_id: params.userId,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    metadata: params.metadata ?? {},
  });

  if (error) {
    console.error("[logAudit] Supabase error:", error.code, error.message);
  }
}
