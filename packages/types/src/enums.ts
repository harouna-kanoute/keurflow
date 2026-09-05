// Enumerations shared by web, mobile and Supabase Edge Functions.
// These mirror the CHECK constraints / enum types defined in supabase/migrations.
// Keep in sync manually until Phase 4 introduces generated DB types.

export const ORGANIZATION_TYPES = ["individual", "agency", "company"] as const;
export type OrganizationType = (typeof ORGANIZATION_TYPES)[number];

export const ORGANIZATION_ROLES = ["owner", "admin", "manager", "member", "viewer"] as const;
export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

export const PROJECT_ROLES = [
  "project_owner",
  "project_manager",
  "project_approver",
  "project_member",
  "project_viewer",
] as const;
export type ProjectRole = (typeof PROJECT_ROLES)[number];

export const MEMBERSHIP_STATUSES = ["invited", "active", "suspended", "removed"] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export const PROJECT_STATUSES = ["planning", "active", "paused", "completed", "archived"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const EXPENSE_STATUSES = ["pending", "needs_information", "approved", "rejected"] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

export const DOCUMENTATION_STATUSES = ["documented", "partial", "missing"] as const;
export type DocumentationStatus = (typeof DOCUMENTATION_STATUSES)[number];

export const MILESTONE_STATUSES = ["pending", "in_progress", "completed", "delayed"] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export const NOTIFICATION_TYPES = [
  "new_expense",
  "expense_needs_review",
  "document_added",
  "expense_approved",
  "expense_rejected",
  "milestone_completed",
  "milestone_delayed",
  "report_created",
  "member_invited",
  "trial_ending_soon",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_CHANNELS = ["in_app", "push", "email"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const AUDIT_ACTIONS = [
  "project_created",
  "project_updated",
  "project_deleted",
  "member_invited",
  "member_updated",
  "member_removed",
  "expense_created",
  "expense_updated",
  "expense_approved",
  "expense_rejected",
  "document_uploaded",
  "photo_uploaded",
  "photo_deleted",
  "funding_created",
  "milestone_updated",
  "comment_created",
  "report_created",
  "organization_updated",
  "document_deleted",
  "supplier_created",
  "supplier_updated",
  "purchase_created",
  "purchase_updated",
  "purchase_deleted",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const SUBSCRIPTION_STATUSES = [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "incomplete",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const BILLING_PERIODS = ["month", "year"] as const;
export type BillingPeriod = (typeof BILLING_PERIODS)[number];

export const SUPPORT_TICKET_CATEGORIES = ["bug", "security", "other"] as const;
export type SupportTicketCategory = (typeof SUPPORT_TICKET_CATEGORIES)[number];

export const SUPPORT_TICKET_STATUSES = ["open", "in_progress", "resolved", "closed"] as const;
export type SupportTicketStatus = (typeof SUPPORT_TICKET_STATUSES)[number];

export const DOCUMENT_TYPES = [
  "invoice",
  "receipt",
  "payment_proof",
  "screenshot",
  "identity",
  "contract",
  "other",
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

// Suppliers are deactivated, never deleted, once they carry purchase history
// (the purchases.supplier_id FK is ON DELETE RESTRICT).
export const SUPPLIER_STATUSES = ["active", "inactive"] as const;
export type SupplierStatus = (typeof SUPPLIER_STATUSES)[number];

// Units a material is bought in. Kept short on purpose — "autre" covers the
// long tail rather than growing this list into a unit catalog.
export const PURCHASE_UNITS = [
  "sac",
  "kg",
  "tonne",
  "m",
  "m²",
  "m³",
  "pièce",
  "litre",
  "carton",
  "autre",
] as const;
export type PurchaseUnit = (typeof PURCHASE_UNITS)[number];

// Role hierarchy, weakest first. Used by @keurflow/business for UI-only checks —
// the authoritative check always happens server-side via RLS / SECURITY DEFINER helpers.
export const ORGANIZATION_ROLE_RANK: Record<OrganizationRole, number> = {
  viewer: 0,
  member: 1,
  manager: 2,
  admin: 3,
  owner: 4,
};

// project_approver ranks below project_manager on purpose: it must NOT
// satisfy hasProjectRoleAtLeast(role, "project_manager") checks (project
// edit/delete, member management, invite authorization) — those stay
// exclusive to manager+. Its own actual grants (expense approval, report
// creation) are wired as explicit checks/RLS lists instead of a rank
// threshold — see canApproveExpense in @keurflow/business/permissions.
export const PROJECT_ROLE_RANK: Record<ProjectRole, number> = {
  project_viewer: 0,
  project_member: 1,
  project_approver: 2,
  project_manager: 3,
  project_owner: 4,
};
