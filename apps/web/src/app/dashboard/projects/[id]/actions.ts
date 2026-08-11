"use server";

import { revalidatePath } from "next/cache";
import { calculateExpenseTotal } from "@keurflow/business";
import {
  createExpenseSchema,
  createFundingSchema,
  createMilestoneSchema,
  updateExpenseStatusSchema,
  updateMilestoneStatusSchema,
  uploadDocumentSchema,
  uploadPhotoSchema,
  type CreateExpenseInput,
  type CreateFundingInput,
  type CreateMilestoneInput,
  type UpdateExpenseStatusInput,
  type UpdateMilestoneStatusInput,
  type UploadDocumentInput,
  type UploadPhotoInput,
} from "@keurflow/validation";
import { createClient } from "@/lib/supabase/server";

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
