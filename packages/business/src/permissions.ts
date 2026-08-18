import {
  ORGANIZATION_ROLE_RANK,
  PROJECT_ROLE_RANK,
  type OrganizationRole,
  type ProjectRole,
} from "@keurflow/types";

// ⚠️ UI CONVENIENCE ONLY. These functions decide what to render (e.g. hide an
// "Approve" button), never what to allow. The authoritative check is always
// performed server-side (RLS policies + SECURITY DEFINER helpers in Postgres,
// re-validated in Edge Functions). Never gate a mutation on the client role
// alone — see project rule §69/§83: a role supplied by the client is never trusted.

export function hasOrgRoleAtLeast(role: OrganizationRole, required: OrganizationRole): boolean {
  return ORGANIZATION_ROLE_RANK[role] >= ORGANIZATION_ROLE_RANK[required];
}

export function hasProjectRoleAtLeast(role: ProjectRole, required: ProjectRole): boolean {
  return PROJECT_ROLE_RANK[role] >= PROJECT_ROLE_RANK[required];
}

// Not a rank threshold: project_approver ranks below project_manager (so it
// correctly stays excluded from member-management/project-edit checks,
// which ARE rank-based) but must still pass this one — matches the
// expenses_update_own_pending_or_managers RLS policy's explicit role list.
export function canApproveExpense(role: ProjectRole): boolean {
  return role === "project_owner" || role === "project_manager" || role === "project_approver";
}

export function canManageMembers(role: OrganizationRole): boolean {
  return hasOrgRoleAtLeast(role, "admin");
}
