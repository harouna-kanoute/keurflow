"use server";

import { revalidatePath } from "next/cache";
import { calculateExpenseTotal, hasOrgRoleAtLeast, hasProjectRoleAtLeast } from "@keurflow/business";
import type { OrganizationRole, ProjectRole } from "@keurflow/types";
import {
  createExpenseSchema,
  createFundingSchema,
  createMilestoneSchema,
  inviteProjectMemberSchema,
  updateExpenseStatusSchema,
  updateMilestoneStatusSchema,
  uploadDocumentSchema,
  uploadPhotoSchema,
  type CreateExpenseInput,
  type CreateFundingInput,
  type CreateMilestoneInput,
  type InviteProjectMemberInput,
  type UpdateExpenseStatusInput,
  type UpdateMilestoneStatusInput,
  type UploadDocumentInput,
  type UploadPhotoInput,
} from "@keurflow/validation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Generic fallback per §68 — real Supabase error details never reach the client.
const GENERIC_ERROR = "Une erreur est survenue. Veuillez réessayer.";

export type ActionResult = { error: string } | { error?: undefined };

export async function createFunding(input: CreateFundingInput): Promise<ActionResult> {
  const parsed = createFundingSchema.safeParse(input);
  if (!parsed.success) return { error: GENERIC_ERROR };

  const supabase = await createClient();

  const { data: paymentMethod } = await supabase
    .from("payment_methods")
    .select("id")
    .eq("code", parsed.data.paymentMethodCode)
    .single();

  if (!paymentMethod) return { error: GENERIC_ERROR };

  // created_by defaults to auth.uid() in the DB; RLS (fundings_insert_non_viewers)
  // is the authoritative check on whether this user may log a funding here.
  const { error } = await supabase.from("fundings").insert({
    project_id: parsed.data.projectId,
    amount_minor: parsed.data.amountMinor,
    currency_code: parsed.data.currencyCode,
    payment_method_id: paymentMethod.id,
    reference: parsed.data.reference ?? null,
    description: parsed.data.description ?? null,
    funding_date: parsed.data.fundingDate,
  });

  if (error) {
    console.error("[createFunding] Supabase error:", error.code, error.message);
    return { error: GENERIC_ERROR };
  }

  revalidatePath(`/dashboard/projects/${parsed.data.projectId}`);
  return {};
}

export type CreateExpenseResult =
  | { error: string; expenseId?: undefined }
  | { error?: undefined; expenseId: string };

export async function createExpense(input: CreateExpenseInput): Promise<CreateExpenseResult> {
  const parsed = createExpenseSchema.safeParse(input);
  if (!parsed.success) return { error: GENERIC_ERROR };

  // Server-side recompute (§29): a client-sent amountMinor is only trusted
  // when there are no items — when items are present, the total is always
  // their sum, never the client-sent hint.
  const amountMinor = parsed.data.items?.length
    ? calculateExpenseTotal(
        parsed.data.items.map((item) => ({
          quantity: item.quantity,
          unitPriceMinor: item.unitPriceMinor,
        })),
      )
    : parsed.data.amountMinor;

  if (!amountMinor) return { error: GENERIC_ERROR };

  const supabase = await createClient();

  const { data: expense, error } = await supabase
    .from("expenses")
    .insert({
      project_id: parsed.data.projectId,
      amount_minor: amountMinor,
      currency_code: parsed.data.currencyCode,
      category: parsed.data.category,
      description: parsed.data.description ?? null,
      supplier_name: parsed.data.supplierName ?? null,
      expense_date: parsed.data.expenseDate,
    })
    .select("id")
    .single();

  if (error || !expense) {
    console.error("[createExpense] Supabase error:", error?.code, error?.message);
    return { error: GENERIC_ERROR };
  }

  if (parsed.data.items?.length) {
    const { error: itemsError } = await supabase.from("expense_items").insert(
      parsed.data.items.map((item) => ({
        expense_id: expense.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        unit_price_minor: item.unitPriceMinor,
      })),
    );
    if (itemsError) {
      console.error("[createExpense] items error:", itemsError.code, itemsError.message);
    }
  }

  revalidatePath(`/dashboard/projects/${parsed.data.projectId}`);
  return { expenseId: expense.id };
}

// Records a document row for a file the client already uploaded directly to
// Storage (protected by that bucket's own RLS) — this action never handles
// file bytes, only the resulting metadata.
export async function attachDocument(
  input: UploadDocumentInput & { storagePath: string },
): Promise<ActionResult> {
  const { storagePath, ...rest } = input;
  const parsed = uploadDocumentSchema.safeParse(rest);
  if (!parsed.success) return { error: GENERIC_ERROR };

  if (!storagePath.startsWith(`${parsed.data.projectId}/`)) {
    return { error: GENERIC_ERROR };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("documents").insert({
    project_id: parsed.data.projectId,
    document_type: parsed.data.documentType,
    storage_path: storagePath,
    filename: parsed.data.filename,
    mime_type: parsed.data.mimeType,
    size: parsed.data.size,
    expense_id: parsed.data.expenseId ?? null,
    funding_id: parsed.data.fundingId ?? null,
  });

  if (error) {
    console.error("[attachDocument] Supabase error:", error.code, error.message);
    return { error: GENERIC_ERROR };
  }

  revalidatePath(`/dashboard/projects/${parsed.data.projectId}`);
  return {};
}

export async function updateExpenseStatus(input: UpdateExpenseStatusInput): Promise<ActionResult> {
  const parsed = updateExpenseStatusSchema.safeParse(input);
  if (!parsed.success) return { error: GENERIC_ERROR };

  const supabase = await createClient();

  const { data: expense } = await supabase
    .from("expenses")
    .select("project_id")
    .eq("id", parsed.data.expenseId)
    .single();

  // RLS (expenses_update_own_pending_or_managers) is the authoritative check
  // on whether this user may transition this expense's status — this simply
  // performs the update and reports success or denial.
  const { error } = await supabase
    .from("expenses")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.expenseId);

  if (error) {
    console.error("[updateExpenseStatus] Supabase error:", error.code, error.message);
    return { error: GENERIC_ERROR };
  }

  if (expense) revalidatePath(`/dashboard/projects/${expense.project_id}`);
  return {};
}

export async function createMilestone(input: CreateMilestoneInput): Promise<ActionResult> {
  const parsed = createMilestoneSchema.safeParse(input);
  if (!parsed.success) return { error: GENERIC_ERROR };

  const supabase = await createClient();
  const { error } = await supabase.from("milestones").insert({
    project_id: parsed.data.projectId,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    order_index: parsed.data.orderIndex,
    planned_date: parsed.data.plannedDate ?? null,
    budget_minor: parsed.data.budgetMinor ?? null,
  });

  if (error) {
    console.error("[createMilestone] Supabase error:", error.code, error.message);
    return { error: GENERIC_ERROR };
  }

  revalidatePath(`/dashboard/projects/${parsed.data.projectId}`);
  return {};
}

export async function updateMilestoneStatus(
  input: UpdateMilestoneStatusInput,
): Promise<ActionResult> {
  const parsed = updateMilestoneStatusSchema.safeParse(input);
  if (!parsed.success) return { error: GENERIC_ERROR };

  const supabase = await createClient();

  const { data: milestone } = await supabase
    .from("milestones")
    .select("project_id")
    .eq("id", parsed.data.milestoneId)
    .single();

  // RLS (milestones_write_non_viewers) is the authoritative check — updating
  // a milestone's status is meant to be a quick action from the field (§43),
  // open to any real collaborator, not just managers.
  const { error } = await supabase
    .from("milestones")
    .update({
      status: parsed.data.status,
      completed_date:
        parsed.data.status === "completed"
          ? (parsed.data.completedDate ?? new Date().toISOString().slice(0, 10))
          : null,
    })
    .eq("id", parsed.data.milestoneId);

  if (error) {
    console.error("[updateMilestoneStatus] Supabase error:", error.code, error.message);
    return { error: GENERIC_ERROR };
  }

  if (milestone) revalidatePath(`/dashboard/projects/${milestone.project_id}`);
  return {};
}

// Records a photo row for a file the client already uploaded directly to
// Storage (protected by that bucket's own RLS) — this action never handles
// file bytes, only the resulting metadata.
export async function attachPhoto(
  input: UploadPhotoInput & { storagePath: string },
): Promise<ActionResult> {
  const { storagePath, ...rest } = input;
  const parsed = uploadPhotoSchema.safeParse(rest);
  if (!parsed.success) return { error: GENERIC_ERROR };

  if (!storagePath.startsWith(`${parsed.data.projectId}/`)) {
    return { error: GENERIC_ERROR };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("photos").insert({
    project_id: parsed.data.projectId,
    milestone_id: parsed.data.milestoneId ?? null,
    expense_id: parsed.data.expenseId ?? null,
    storage_path: storagePath,
    caption: parsed.data.caption ?? null,
    taken_at: parsed.data.takenAt ?? null,
  });

  if (error) {
    console.error("[attachPhoto] Supabase error:", error.code, error.message);
    return { error: GENERIC_ERROR };
  }

  revalidatePath(`/dashboard/projects/${parsed.data.projectId}`);
  return {};
}

export async function inviteProjectMember(input: InviteProjectMemberInput): Promise<ActionResult> {
  const parsed = inviteProjectMemberSchema.safeParse(input);
  if (!parsed.success) return { error: GENERIC_ERROR };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: GENERIC_ERROR };

  const { data: project } = await supabase
    .from("projects")
    .select("organization_id")
    .eq("id", parsed.data.projectId)
    .maybeSingle();
  if (!project) return { error: GENERIC_ERROR };

  // Manual authorization check (mirrors the RLS rule for project_members
  // writes) is required here because the admin client used below bypasses
  // RLS entirely — it's the only way to look up or create a user by email,
  // which no RLS-scoped query can ever do (§62). The project_members insert
  // itself still goes through the RLS-respecting client further down, so
  // this check is defense in depth, not the sole gate.
  const [{ data: orgMembership }, { data: projectMembership }] = await Promise.all([
    supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", project.organization_id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("project_members")
      .select("role")
      .eq("project_id", parsed.data.projectId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
  ]);

  const authorized =
    (!!orgMembership && hasOrgRoleAtLeast(orgMembership.role as OrganizationRole, "manager")) ||
    (!!projectMembership &&
      hasProjectRoleAtLeast(projectMembership.role as ProjectRole, "project_manager"));
  if (!authorized) return { error: GENERIC_ERROR };

  const admin = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // The common case: this person has never signed up. inviteUserByEmail
  // creates their auth.users row and emails them a sign-up link.
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    parsed.data.email,
    { redirectTo: `${appUrl}/auth/callback` },
  );

  let invitedUserId = invited?.user?.id;

  if (inviteError) {
    if (inviteError.code === "over_email_send_rate_limit") {
      return { error: "Trop de tentatives. Réessayez dans quelques minutes." };
    }
    if (!inviteError.message.toLowerCase().includes("already")) {
      console.error("[inviteProjectMember] invite error:", inviteError.code, inviteError.message);
      return { error: GENERIC_ERROR };
    }

    // Already registered — the admin API has no lookup-by-email, so this
    // scans users to find them. Fine at agency scale; would need a proper
    // index if this ever needs to work across a much larger user base.
    const { data: existing, error: listError } = await admin.auth.admin.listUsers({
      perPage: 1000,
    });
    if (listError) {
      console.error("[inviteProjectMember] listUsers error:", listError.message);
      return { error: GENERIC_ERROR };
    }
    invitedUserId = existing.users.find((u) => u.email?.toLowerCase() === parsed.data.email)?.id;
    if (!invitedUserId) return { error: GENERIC_ERROR };
  }

  // RLS (project_members_manage) re-validates authorization on this insert
  // independently of the manual check above.
  const { error: memberError } = await supabase.from("project_members").insert({
    project_id: parsed.data.projectId,
    user_id: invitedUserId,
    role: parsed.data.role,
    status: "invited",
  });

  if (memberError) {
    if (memberError.code === "23505") {
      return { error: "Cette personne est déjà membre de ce chantier." };
    }
    console.error(
      "[inviteProjectMember] member insert error:",
      memberError.code,
      memberError.message,
    );
    return { error: GENERIC_ERROR };
  }

  revalidatePath(`/dashboard/projects/${parsed.data.projectId}`);
  return {};
}
