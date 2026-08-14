"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  calculateExpenseTotal,
  deriveDocumentationStatus,
  formatMoney,
  generateProjectReportSummary,
  getApprovedExpensesTotal,
  getMilestoneProgressPercent,
  getTotalFunded,
  hasOrgRoleAtLeast,
  hasProjectRoleAtLeast,
  type ReportData,
} from "@keurflow/business";
import { CURRENCIES } from "@keurflow/config";
import type { OrganizationRole, ProjectRole } from "@keurflow/types";
import {
  createExpenseCommentSchema,
  createExpenseSchema,
  createFundingSchema,
  createMilestoneSchema,
  createReportSchema,
  deletePhotoSchema,
  deleteProjectSchema,
  inviteProjectMemberSchema,
  removeProjectMemberSchema,
  updateExpenseStatusSchema,
  updateMilestoneStatusSchema,
  updateProjectMemberRoleSchema,
  updateProjectSchema,
  updateProjectStatusSchema,
  uploadDocumentSchema,
  uploadPhotoSchema,
  type CreateExpenseCommentInput,
  type CreateExpenseInput,
  type CreateFundingInput,
  type CreateMilestoneInput,
  type CreateReportInput,
  type DeletePhotoInput,
  type DeleteProjectInput,
  type InviteProjectMemberInput,
  type RemoveProjectMemberInput,
  type UpdateExpenseStatusInput,
  type UpdateMilestoneStatusInput,
  type UpdateProjectInput,
  type UpdateProjectMemberRoleInput,
  type UpdateProjectStatusInput,
  type UploadDocumentInput,
  type UploadPhotoInput,
} from "@keurflow/validation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProjectAudience, notifyUsers } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";

function minorUnitFor(currencyCode: string): number {
  return CURRENCIES.find((c) => c.code === currencyCode)?.minorUnit ?? 2;
}

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
  const { data: funding, error } = await supabase
    .from("fundings")
    .insert({
      project_id: parsed.data.projectId,
      amount_minor: parsed.data.amountMinor,
      currency_code: parsed.data.currencyCode,
      payment_method_id: paymentMethod.id,
      reference: parsed.data.reference ?? null,
      description: parsed.data.description ?? null,
      funding_date: parsed.data.fundingDate,
    })
    .select("id")
    .single();

  if (error || !funding) {
    console.error("[createFunding] Supabase error:", error?.code, error?.message);
    return { error: GENERIC_ERROR };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await logAudit({
      projectId: parsed.data.projectId,
      userId: user.id,
      action: "funding_created",
      entityType: "funding",
      entityId: funding.id,
      metadata: { amountMinor: parsed.data.amountMinor, currencyCode: parsed.data.currencyCode },
    });
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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const audience = await getProjectAudience(supabase, parsed.data.projectId, user.id);
    await notifyUsers({
      userIds: audience,
      projectId: parsed.data.projectId,
      type: "new_expense",
      title: "Nouvelle dépense enregistrée",
      body: formatMoney(amountMinor, parsed.data.currencyCode, minorUnitFor(parsed.data.currencyCode)),
    });
    await logAudit({
      projectId: parsed.data.projectId,
      userId: user.id,
      action: "expense_created",
      entityType: "expense",
      entityId: expense.id,
      metadata: { category: parsed.data.category, amountMinor },
    });
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
  const { data: document, error } = await supabase
    .from("documents")
    .insert({
      project_id: parsed.data.projectId,
      document_type: parsed.data.documentType,
      storage_path: storagePath,
      filename: parsed.data.filename,
      mime_type: parsed.data.mimeType,
      size: parsed.data.size,
      expense_id: parsed.data.expenseId ?? null,
      funding_id: parsed.data.fundingId ?? null,
    })
    .select("id")
    .single();

  if (error || !document) {
    console.error("[attachDocument] Supabase error:", error?.code, error?.message);
    return { error: GENERIC_ERROR };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const audience = await getProjectAudience(supabase, parsed.data.projectId, user.id);
    await notifyUsers({
      userIds: audience,
      projectId: parsed.data.projectId,
      type: "document_added",
      title: "Nouveau document ajouté",
      body: parsed.data.filename,
    });
    await logAudit({
      projectId: parsed.data.projectId,
      userId: user.id,
      action: "document_uploaded",
      entityType: "document",
      entityId: document.id,
      metadata: { filename: parsed.data.filename, documentType: parsed.data.documentType },
    });
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
    .select("project_id, created_by, category")
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

  if (expense) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const notificationByStatus: Partial<
      Record<typeof parsed.data.status, { type: "expense_needs_review" | "expense_approved" | "expense_rejected"; title: string }>
    > = {
      needs_information: { type: "expense_needs_review", title: "Informations demandées sur une dépense" },
      approved: { type: "expense_approved", title: "Dépense approuvée" },
      rejected: { type: "expense_rejected", title: "Dépense rejetée" },
    };
    const notification = notificationByStatus[parsed.data.status];
    // Only the creator needs to know their own submission moved — and not
    // when they're the one who moved it themselves.
    if (notification && user && expense.created_by !== user.id) {
      await notifyUsers({
        userIds: [expense.created_by],
        projectId: expense.project_id,
        type: notification.type,
        title: notification.title,
        body: expense.category,
      });
    }
    if (user) {
      await logAudit({
        projectId: expense.project_id,
        userId: user.id,
        action:
          parsed.data.status === "approved"
            ? "expense_approved"
            : parsed.data.status === "rejected"
              ? "expense_rejected"
              : "expense_updated",
        entityType: "expense",
        entityId: parsed.data.expenseId,
        metadata: { status: parsed.data.status },
      });
    }
    revalidatePath(`/dashboard/projects/${expense.project_id}`);
  }
  return {};
}

export async function createExpenseComment(input: CreateExpenseCommentInput): Promise<ActionResult> {
  const parsed = createExpenseCommentSchema.safeParse(input);
  if (!parsed.success) return { error: GENERIC_ERROR };

  const supabase = await createClient();

  const { data: expense } = await supabase
    .from("expenses")
    .select("project_id, created_by")
    .eq("id", parsed.data.expenseId)
    .single();

  // RLS (expense_comments_insert_non_viewers) is the authoritative check.
  const { data: comment, error } = await supabase
    .from("expense_comments")
    .insert({
      expense_id: parsed.data.expenseId,
      content: parsed.data.content,
    })
    .select("id")
    .single();

  if (error || !comment) {
    console.error("[createExpenseComment] Supabase error:", error?.code, error?.message);
    return { error: GENERIC_ERROR };
  }

  if (expense) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await logAudit({
        projectId: expense.project_id,
        userId: user.id,
        action: "comment_created",
        entityType: "expense_comment",
        entityId: comment.id,
      });
    }
    revalidatePath(`/dashboard/projects/${expense.project_id}`);
  }
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
    .select("project_id, name")
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

  if (milestone) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      if (parsed.data.status === "completed" || parsed.data.status === "delayed") {
        const audience = await getProjectAudience(supabase, milestone.project_id, user.id);
        await notifyUsers({
          userIds: audience,
          projectId: milestone.project_id,
          type: parsed.data.status === "completed" ? "milestone_completed" : "milestone_delayed",
          title:
            parsed.data.status === "completed"
              ? "Étape terminée"
              : "Étape en retard",
          body: milestone.name,
        });
      }
      await logAudit({
        projectId: milestone.project_id,
        userId: user.id,
        action: "milestone_updated",
        entityType: "milestone",
        entityId: parsed.data.milestoneId,
        metadata: { status: parsed.data.status, name: milestone.name },
      });
    }
    revalidatePath(`/dashboard/projects/${milestone.project_id}`);
  }
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
  const { data: photo, error } = await supabase
    .from("photos")
    .insert({
      project_id: parsed.data.projectId,
      milestone_id: parsed.data.milestoneId ?? null,
      expense_id: parsed.data.expenseId ?? null,
      storage_path: storagePath,
      caption: parsed.data.caption ?? null,
      taken_at: parsed.data.takenAt ?? null,
    })
    .select("id")
    .single();

  if (error || !photo) {
    console.error("[attachPhoto] Supabase error:", error?.code, error?.message);
    return { error: GENERIC_ERROR };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await logAudit({
      projectId: parsed.data.projectId,
      userId: user.id,
      action: "photo_uploaded",
      entityType: "photo",
      entityId: photo.id,
    });
  }

  revalidatePath(`/dashboard/projects/${parsed.data.projectId}`);
  return {};
}

export async function deletePhoto(input: DeletePhotoInput): Promise<ActionResult> {
  const parsed = deletePhotoSchema.safeParse(input);
  if (!parsed.success) return { error: GENERIC_ERROR };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: GENERIC_ERROR };

  const { data: photo } = await supabase
    .from("photos")
    .select("project_id, storage_path")
    .eq("id", parsed.data.photoId)
    .maybeSingle();
  if (!photo) return { error: GENERIC_ERROR };

  // RLS (photos_delete_own_or_managers) is the authoritative check — the
  // uploader can always remove their own photo, managers can remove any.
  const { error } = await supabase.from("photos").delete().eq("id", parsed.data.photoId);
  if (error) {
    console.error("[deletePhoto] Supabase error:", error.code, error.message);
    return { error: GENERIC_ERROR };
  }

  // Best-effort: storage RLS (project_photos_delete) is role-gated and
  // narrower than the row policy above, so a plain member deleting their
  // own upload can lose this step — the row is already gone either way.
  const { error: storageError } = await supabase.storage
    .from("project-photos")
    .remove([photo.storage_path]);
  if (storageError) {
    console.error("[deletePhoto] storage remove error:", storageError.message);
  }

  await logAudit({
    projectId: photo.project_id,
    userId: user.id,
    action: "photo_deleted",
    entityType: "photo",
    entityId: parsed.data.photoId,
  });

  revalidatePath(`/dashboard/projects/${photo.project_id}`);
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
  const { data: newMember, error: memberError } = await supabase
    .from("project_members")
    .insert({
      project_id: parsed.data.projectId,
      user_id: invitedUserId,
      role: parsed.data.role,
      status: "invited",
    })
    .select("id")
    .single();

  if (memberError || !newMember) {
    if (memberError?.code === "23505") {
      return { error: "Cette personne est déjà membre de ce chantier." };
    }
    console.error(
      "[inviteProjectMember] member insert error:",
      memberError?.code,
      memberError?.message,
    );
    return { error: GENERIC_ERROR };
  }

  const audience = await getProjectAudience(supabase, parsed.data.projectId, user.id);
  await notifyUsers({
    userIds: audience,
    projectId: parsed.data.projectId,
    type: "member_invited",
    title: "Nouveau membre invité",
    body: parsed.data.email,
  });
  await logAudit({
    projectId: parsed.data.projectId,
    organizationId: project.organization_id,
    userId: user.id,
    action: "member_invited",
    entityType: "project_member",
    entityId: newMember.id,
    metadata: { email: parsed.data.email, role: parsed.data.role },
  });

  revalidatePath(`/dashboard/projects/${parsed.data.projectId}`);
  return {};
}

export async function updateProjectMemberRole(
  input: UpdateProjectMemberRoleInput,
): Promise<ActionResult> {
  const parsed = updateProjectMemberRoleSchema.safeParse(input);
  if (!parsed.success) return { error: GENERIC_ERROR };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: GENERIC_ERROR };

  const { data: member } = await supabase
    .from("project_members")
    .select("id, project_id, role")
    .eq("id", parsed.data.memberId)
    .maybeSingle();
  // The owner's role is set once at creation (create_project()) and never
  // reassigned here — the schema already excludes "project_owner" as a
  // target, this blocks changing the *current* owner's row entirely.
  if (!member || member.role === "project_owner") return { error: GENERIC_ERROR };

  // RLS (project_members_manage) re-validates authorization on this update.
  const { error } = await supabase
    .from("project_members")
    .update({ role: parsed.data.role })
    .eq("id", parsed.data.memberId);

  if (error) {
    console.error("[updateProjectMemberRole] Supabase error:", error.code, error.message);
    return { error: GENERIC_ERROR };
  }

  await logAudit({
    projectId: member.project_id,
    userId: user.id,
    action: "member_updated",
    entityType: "project_member",
    entityId: member.id,
    metadata: { role: parsed.data.role },
  });

  revalidatePath(`/dashboard/projects/${member.project_id}`);
  return {};
}

export async function removeProjectMember(input: RemoveProjectMemberInput): Promise<ActionResult> {
  const parsed = removeProjectMemberSchema.safeParse(input);
  if (!parsed.success) return { error: GENERIC_ERROR };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: GENERIC_ERROR };

  const { data: member } = await supabase
    .from("project_members")
    .select("id, project_id, role")
    .eq("id", parsed.data.memberId)
    .maybeSingle();
  // The owner can't be removed from here — deleting a project's last owner
  // would leave it with no one authorized to manage it.
  if (!member || member.role === "project_owner") return { error: GENERIC_ERROR };

  // RLS (project_members_manage) re-validates authorization on this delete.
  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("id", parsed.data.memberId);

  if (error) {
    console.error("[removeProjectMember] Supabase error:", error.code, error.message);
    return { error: GENERIC_ERROR };
  }

  await logAudit({
    projectId: member.project_id,
    userId: user.id,
    action: "member_removed",
    entityType: "project_member",
    entityId: member.id,
  });

  revalidatePath(`/dashboard/projects/${member.project_id}`);
  return {};
}

export async function createReport(input: CreateReportInput): Promise<ActionResult> {
  const parsed = createReportSchema.safeParse(input);
  if (!parsed.success) return { error: GENERIC_ERROR };

  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("name, budget_minor, currency_code")
    .eq("id", parsed.data.projectId)
    .maybeSingle();
  if (!project) return { error: GENERIC_ERROR };

  const [{ data: fundings }, { data: expenses }, { data: milestones }, { data: documents }] =
    await Promise.all([
      supabase
        .from("fundings")
        .select("amount_minor")
        .eq("project_id", parsed.data.projectId)
        .gte("funding_date", parsed.data.periodStart)
        .lte("funding_date", parsed.data.periodEnd),
      supabase
        .from("expenses")
        .select("id, amount_minor, status, expense_date")
        .eq("project_id", parsed.data.projectId),
      supabase.from("milestones").select("status").eq("project_id", parsed.data.projectId),
      supabase
        .from("documents")
        .select("expense_id")
        .eq("project_id", parsed.data.projectId)
        .not("expense_id", "is", null),
    ]);

  // Funding/spend totals are period-bound ("what happened this month");
  // documents-manquants and à-vérifier are current-state concerns, not
  // reset each period, so they're computed over every expense regardless
  // of date.
  const expensesInPeriod = (expenses ?? []).filter(
    (e) => e.expense_date >= parsed.data.periodStart && e.expense_date <= parsed.data.periodEnd,
  );
  const approvedInPeriod = getApprovedExpensesTotal(
    expensesInPeriod.map((e) => ({
      amountMinor: e.amount_minor,
      status: e.status as "pending" | "needs_information" | "approved" | "rejected",
    })),
  );

  const docCountByExpense = new Map<string, number>();
  for (const doc of documents ?? []) {
    if (!doc.expense_id) continue;
    docCountByExpense.set(doc.expense_id, (docCountByExpense.get(doc.expense_id) ?? 0) + 1);
  }
  const documentsMissingCount = (expenses ?? []).filter(
    (e) => deriveDocumentationStatus(docCountByExpense.get(e.id) ?? 0) === "missing",
  ).length;
  const toReviewCount = (expenses ?? []).filter(
    (e) => e.status === "pending" || e.status === "needs_information",
  ).length;

  const milestoneList = (milestones ?? []).map((m) => ({
    status: m.status as "pending" | "in_progress" | "completed" | "delayed",
  }));

  const reportData: ReportData = {
    projectName: project.name,
    periodStart: parsed.data.periodStart,
    periodEnd: parsed.data.periodEnd,
    budgetMinor: project.budget_minor,
    currencyCode: project.currency_code,
    minorUnit: minorUnitFor(project.currency_code),
    fundedInPeriodMinor: getTotalFunded(
      (fundings ?? []).map((f) => ({ amountMinor: f.amount_minor })),
    ),
    approvedInPeriodMinor: approvedInPeriod,
    progressPercent: getMilestoneProgressPercent(milestoneList),
    milestonesCompleted: milestoneList.filter((m) => m.status === "completed").length,
    milestonesTotal: milestoneList.length,
    documentsMissingCount,
    toReviewCount,
  };

  // metrics stores the exact numbers the text summary was rendered from —
  // lets the UI chart a report without ever recomputing it live, keeping
  // the "immutable point-in-time snapshot" guarantee (see report.ts).
  const { data: report, error } = await supabase
    .from("reports")
    .insert({
      project_id: parsed.data.projectId,
      period_start: parsed.data.periodStart,
      period_end: parsed.data.periodEnd,
      summary: generateProjectReportSummary(reportData),
      metrics: reportData,
    })
    .select("id")
    .single();

  if (error || !report) {
    console.error("[createReport] Supabase error:", error?.code, error?.message);
    return { error: GENERIC_ERROR };
  }

  const {
    data: { user: reportUser },
  } = await supabase.auth.getUser();
  if (reportUser) {
    const audience = await getProjectAudience(supabase, parsed.data.projectId, reportUser.id);
    await notifyUsers({
      userIds: audience,
      projectId: parsed.data.projectId,
      type: "report_created",
      title: "Nouveau rapport disponible",
      body: `${parsed.data.periodStart} → ${parsed.data.periodEnd}`,
    });
    await logAudit({
      projectId: parsed.data.projectId,
      userId: reportUser.id,
      action: "report_created",
      entityType: "report",
      entityId: report.id,
      metadata: { periodStart: parsed.data.periodStart, periodEnd: parsed.data.periodEnd },
    });
  }

  revalidatePath(`/dashboard/projects/${parsed.data.projectId}`);
  return {};
}

export async function updateProject(input: UpdateProjectInput): Promise<ActionResult> {
  const parsed = updateProjectSchema.safeParse(input);
  if (!parsed.success) return { error: GENERIC_ERROR };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: GENERIC_ERROR };

  // RLS (projects_update_org_managers_or_project_owners) is the actual
  // authority here — org managers+ or the project's own manager/owner.
  const { data: updated, error } = await supabase
    .from("projects")
    .update({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      project_type: parsed.data.projectType,
      city: parsed.data.city ?? null,
      address: parsed.data.address ?? null,
      surface_area: parsed.data.surfaceArea ?? null,
      budget_minor: parsed.data.budgetMinor,
      start_date: parsed.data.startDate ?? null,
      expected_end_date: parsed.data.expectedEndDate ?? null,
    })
    .eq("id", parsed.data.projectId)
    .select("id, organization_id")
    .single();

  if (error || !updated) {
    console.error("[updateProject] Supabase error:", error?.code, error?.message);
    return { error: GENERIC_ERROR };
  }

  await logAudit({
    organizationId: updated.organization_id,
    projectId: updated.id,
    userId: user.id,
    action: "project_updated",
    entityType: "project",
    entityId: updated.id,
    metadata: { name: parsed.data.name },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/projects/${parsed.data.projectId}`);
  return {};
}

export async function updateProjectStatus(input: UpdateProjectStatusInput): Promise<ActionResult> {
  const parsed = updateProjectStatusSchema.safeParse(input);
  if (!parsed.success) return { error: GENERIC_ERROR };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: GENERIC_ERROR };

  // RLS (projects_update_org_managers_or_project_owners) is the actual
  // authority here — org managers+ or the project's own manager/owner.
  const { data: updated, error } = await supabase
    .from("projects")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.projectId)
    .select("id, organization_id")
    .single();

  if (error || !updated) {
    console.error("[updateProjectStatus] Supabase error:", error?.code, error?.message);
    return { error: GENERIC_ERROR };
  }

  await logAudit({
    organizationId: updated.organization_id,
    projectId: updated.id,
    userId: user.id,
    action: "project_updated",
    entityType: "project",
    entityId: updated.id,
    metadata: { status: parsed.data.status },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/projects/${parsed.data.projectId}`);
  return {};
}

export async function deleteProject(input: DeleteProjectInput): Promise<ActionResult> {
  const parsed = deleteProjectSchema.safeParse(input);
  if (!parsed.success) return { error: GENERIC_ERROR };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: GENERIC_ERROR };

  const { data: project } = await supabase
    .from("projects")
    .select("name, organization_id")
    .eq("id", parsed.data.projectId)
    .maybeSingle();
  if (!project) return { error: GENERIC_ERROR };

  // Manual pre-check for a clear error message — the RLS delete policy
  // (projects_delete_org_admins_or_project_owners) is the actual authority,
  // deliberately a higher bar than the update policy: deletion destroys
  // every expense, funding, document and photo under the project (all FK'd
  // with "on delete cascade"), so it's restricted to org owners/admins or
  // the project's own owner, not managers.
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
    (!!orgMembership && hasOrgRoleAtLeast(orgMembership.role as OrganizationRole, "admin")) ||
    (!!projectMembership &&
      hasProjectRoleAtLeast(projectMembership.role as ProjectRole, "project_owner"));
  if (!authorized) return { error: GENERIC_ERROR };

  // Logged before the delete: audit_logs.project_id is "on delete set
  // null", so this entry survives with organizationId already resolved
  // (passed directly, since the project row it'd otherwise be looked up
  // from is about to disappear).
  await logAudit({
    organizationId: project.organization_id,
    projectId: parsed.data.projectId,
    userId: user.id,
    action: "project_deleted",
    entityType: "project",
    entityId: parsed.data.projectId,
    metadata: { name: project.name },
  });

  const { error } = await supabase.from("projects").delete().eq("id", parsed.data.projectId);
  if (error) {
    console.error("[deleteProject] Supabase error:", error.code, error.message);
    return { error: GENERIC_ERROR };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
