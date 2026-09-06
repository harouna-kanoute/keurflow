"use server";

import { revalidatePath } from "next/cache";
import { calculatePurchaseTotalMinor } from "@keurflow/business";
import { materialDisplayName } from "@keurflow/config";
import {
  createPurchaseSchema,
  createSupplierSchema,
  deletePurchaseSchema,
  updatePurchaseSchema,
  updateSupplierSchema,
  updateSupplierStatusSchema,
  type CreatePurchaseInput,
  type CreateSupplierInput,
  type DeletePurchaseInput,
  type UpdatePurchaseInput,
  type UpdateSupplierInput,
  type UpdateSupplierStatusInput,
} from "@keurflow/validation";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { isOrganizationBlocked } from "@/lib/subscription-guard";
import { createExpense, type ActionResult } from "./actions";

// Generic fallback per §68 — real Supabase error details never reach the client.
const GENERIC_ERROR = "Une erreur est survenue. Veuillez réessayer.";
const TRIAL_LOCKED_ERROR =
  "Votre essai gratuit est terminé. Passez à un abonnement pour continuer à modifier vos chantiers.";

export type CreateSupplierResult =
  | { error: string; requiresUpgrade?: boolean; supplierId?: undefined }
  | { error?: undefined; supplierId: string };

export type CreatePurchaseResult =
  | { error: string; requiresUpgrade?: boolean; purchaseId?: undefined }
  | { error?: undefined; purchaseId: string };

// Suppliers are organization-scoped, so every action here revalidates the
// whole dashboard subtree rather than one project page — the same supplier
// list is reachable from each of the tenant's chantiers.
function revalidateSuppliers(projectId?: string) {
  if (projectId) revalidatePath(`/dashboard/projects/${projectId}`);
  else revalidatePath("/dashboard", "layout");
}

export async function createSupplier(input: CreateSupplierInput): Promise<CreateSupplierResult> {
  const parsed = createSupplierSchema.safeParse(input);
  if (!parsed.success) return { error: GENERIC_ERROR };

  const supabase = await createClient();

  if (await isOrganizationBlocked(supabase, { organizationId: parsed.data.organizationId })) {
    return { error: TRIAL_LOCKED_ERROR, requiresUpgrade: true };
  }

  const { data: country } = await supabase
    .from("countries")
    .select("id")
    .eq("code", parsed.data.countryCode)
    .maybeSingle();
  if (!country) return { error: GENERIC_ERROR };

  // RLS (suppliers_insert_org_managers) is the authoritative check on whether
  // this user may add a supplier to this organization.
  const { data: supplier, error } = await supabase
    .from("suppliers")
    .insert({
      organization_id: parsed.data.organizationId,
      name: parsed.data.name,
      contact_name: parsed.data.contactName ?? null,
      phone: parsed.data.phone ?? null,
      whatsapp: parsed.data.whatsapp ?? null,
      email: parsed.data.email ?? null,
      address: parsed.data.address ?? null,
      city: parsed.data.city ?? null,
      country_id: country.id,
      specialties: parsed.data.specialties ?? null,
      notes: parsed.data.notes ?? null,
    })
    .select("id")
    .single();

  if (error || !supplier) {
    console.error("[createSupplier] Supabase error:", error?.code, error?.message);
    return { error: GENERIC_ERROR };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await logAudit({
      organizationId: parsed.data.organizationId,
      userId: user.id,
      action: "supplier_created",
      entityType: "supplier",
      entityId: supplier.id,
      metadata: { name: parsed.data.name },
    });
  }

  revalidateSuppliers();
  return { supplierId: supplier.id };
}

export async function updateSupplier(input: UpdateSupplierInput): Promise<ActionResult> {
  const parsed = updateSupplierSchema.safeParse(input);
  if (!parsed.success) return { error: GENERIC_ERROR };

  const supabase = await createClient();

  // Read first so the audit entry can carry the tenant, and so a supplier the
  // caller cannot even see (RLS) fails as "not found" rather than leaking.
  const { data: existing } = await supabase
    .from("suppliers")
    .select("organization_id")
    .eq("id", parsed.data.supplierId)
    .maybeSingle();
  if (!existing) return { error: GENERIC_ERROR };

  const { data: country } = await supabase
    .from("countries")
    .select("id")
    .eq("code", parsed.data.countryCode)
    .maybeSingle();
  if (!country) return { error: GENERIC_ERROR };

  // RLS (suppliers_update_org_managers) is the authoritative check.
  const { error } = await supabase
    .from("suppliers")
    .update({
      name: parsed.data.name,
      contact_name: parsed.data.contactName ?? null,
      phone: parsed.data.phone ?? null,
      whatsapp: parsed.data.whatsapp ?? null,
      email: parsed.data.email ?? null,
      address: parsed.data.address ?? null,
      city: parsed.data.city ?? null,
      country_id: country.id,
      specialties: parsed.data.specialties ?? null,
      notes: parsed.data.notes ?? null,
      status: parsed.data.status,
    })
    .eq("id", parsed.data.supplierId);

  if (error) {
    console.error("[updateSupplier] Supabase error:", error.code, error.message);
    return { error: GENERIC_ERROR };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await logAudit({
      organizationId: existing.organization_id,
      userId: user.id,
      action: "supplier_updated",
      entityType: "supplier",
      entityId: parsed.data.supplierId,
      metadata: { name: parsed.data.name, status: parsed.data.status },
    });
  }

  revalidateSuppliers();
  return {};
}

// Deactivation is the supported alternative to deleting a supplier that
// already has purchases (the FK is ON DELETE RESTRICT) — §16.
export async function updateSupplierStatus(
  input: UpdateSupplierStatusInput,
): Promise<ActionResult> {
  const parsed = updateSupplierStatusSchema.safeParse(input);
  if (!parsed.success) return { error: GENERIC_ERROR };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("suppliers")
    .select("organization_id, name")
    .eq("id", parsed.data.supplierId)
    .maybeSingle();
  if (!existing) return { error: GENERIC_ERROR };

  const { error } = await supabase
    .from("suppliers")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.supplierId);

  if (error) {
    console.error("[updateSupplierStatus] Supabase error:", error.code, error.message);
    return { error: GENERIC_ERROR };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await logAudit({
      organizationId: existing.organization_id,
      userId: user.id,
      action: "supplier_updated",
      entityType: "supplier",
      entityId: parsed.data.supplierId,
      metadata: { name: existing.name, status: parsed.data.status },
    });
  }

  revalidateSuppliers();
  return {};
}

export async function createPurchase(input: CreatePurchaseInput): Promise<CreatePurchaseResult> {
  const parsed = createPurchaseSchema.safeParse(input);
  if (!parsed.success) return { error: GENERIC_ERROR };

  const supabase = await createClient();

  if (await isOrganizationBlocked(supabase, { projectId: parsed.data.projectId })) {
    return { error: TRIAL_LOCKED_ERROR, requiresUpgrade: true };
  }

  // The supplier read doubles as the cross-tenant check the RLS policy also
  // enforces (purchase_supplier_matches_project): a supplier from another
  // organization is invisible here, so this returns nothing and we stop.
  const { data: supplier } = await supabase
    .from("suppliers")
    .select("id, name, organization_id, status")
    .eq("id", parsed.data.supplierId)
    .maybeSingle();
  if (!supplier) return { error: GENERIC_ERROR };

  const { data: project } = await supabase
    .from("projects")
    .select("organization_id")
    .eq("id", parsed.data.projectId)
    .maybeSingle();
  if (!project || project.organization_id !== supplier.organization_id) {
    return { error: GENERIC_ERROR };
  }

  const paymentMethodId = await resolvePaymentMethodId(supabase, parsed.data.paymentMethodCode);

  // Server-side total (§8): the client never sends one, and the DB trigger
  // purchases_recompute_total recomputes it again on write — this value is
  // only used for the linked expense below.
  const totalAmountMinor = calculatePurchaseTotalMinor({
    quantity: parsed.data.quantity,
    unitPriceMinor: parsed.data.unitPriceMinor,
  });

  // Reuses createExpense rather than re-implementing the financial write:
  // same validation, notifications, audit entry and paywall check as an
  // expense logged by hand.
  let expenseId = parsed.data.expenseId ?? null;
  if (parsed.data.createExpense) {
    const expenseResult = await createExpense({
      projectId: parsed.data.projectId,
      amountMinor: totalAmountMinor,
      currencyCode: parsed.data.currencyCode,
      category: "materials",
      supplierName: supplier.name,
      description:
        parsed.data.description ??
        `${materialDisplayName(parsed.data.materialCode, parsed.data.materialName)} — ${parsed.data.quantity} ${parsed.data.unit}`,
      expenseDate: parsed.data.purchaseDate,
    });
    // Checked on the id rather than on `error` being truthy: the result is a
    // union whose error branch is a plain string, which TypeScript can't
    // narrow away on truthiness alone.
    if (!expenseResult.expenseId) {
      return {
        error: expenseResult.error ?? GENERIC_ERROR,
        requiresUpgrade: expenseResult.error ? expenseResult.requiresUpgrade : undefined,
      };
    }
    expenseId = expenseResult.expenseId;
  }

  // RLS (purchases_insert_non_viewers) is the authoritative check.
  const { data: purchase, error } = await supabase
    .from("purchases")
    .insert({
      project_id: parsed.data.projectId,
      supplier_id: parsed.data.supplierId,
      expense_id: expenseId,
      material_code: parsed.data.materialCode,
      material_name: parsed.data.materialName ?? null,
      description: parsed.data.description ?? null,
      purchase_date: parsed.data.purchaseDate,
      quantity: parsed.data.quantity,
      unit: parsed.data.unit,
      unit_price_minor: parsed.data.unitPriceMinor,
      currency_code: parsed.data.currencyCode,
      payment_method_id: paymentMethodId,
    })
    .select("id")
    .single();

  if (error || !purchase) {
    console.error("[createPurchase] Supabase error:", error?.code, error?.message);
    return { error: GENERIC_ERROR };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await logAudit({
      projectId: parsed.data.projectId,
      organizationId: project.organization_id,
      userId: user.id,
      action: "purchase_created",
      entityType: "purchase",
      entityId: purchase.id,
      metadata: { supplierId: supplier.id, materialCode: parsed.data.materialCode },
    });
  }

  revalidateSuppliers(parsed.data.projectId);
  return { purchaseId: purchase.id };
}

export async function updatePurchase(input: UpdatePurchaseInput): Promise<ActionResult> {
  const parsed = updatePurchaseSchema.safeParse(input);
  if (!parsed.success) return { error: GENERIC_ERROR };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("purchases")
    .select("id, project_id")
    .eq("id", parsed.data.purchaseId)
    .maybeSingle();
  if (!existing) return { error: GENERIC_ERROR };

  const paymentMethodId = await resolvePaymentMethodId(supabase, parsed.data.paymentMethodCode);

  // total_amount_minor is deliberately absent: the trigger recomputes it from
  // the new quantity/unit price. RLS (purchases_update_own_or_managers, which
  // re-checks the supplier/project tenant match) is the authoritative check.
  const { error } = await supabase
    .from("purchases")
    .update({
      supplier_id: parsed.data.supplierId,
      expense_id: parsed.data.expenseId ?? null,
      material_code: parsed.data.materialCode,
      material_name: parsed.data.materialName ?? null,
      description: parsed.data.description ?? null,
      purchase_date: parsed.data.purchaseDate,
      quantity: parsed.data.quantity,
      unit: parsed.data.unit,
      unit_price_minor: parsed.data.unitPriceMinor,
      currency_code: parsed.data.currencyCode,
      payment_method_id: paymentMethodId,
    })
    .eq("id", parsed.data.purchaseId);

  if (error) {
    console.error("[updatePurchase] Supabase error:", error.code, error.message);
    return { error: GENERIC_ERROR };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await logAudit({
      projectId: existing.project_id,
      userId: user.id,
      action: "purchase_updated",
      entityType: "purchase",
      entityId: parsed.data.purchaseId,
    });
  }

  revalidateSuppliers(existing.project_id);
  return {};
}

export async function deletePurchase(input: DeletePurchaseInput): Promise<ActionResult> {
  const parsed = deletePurchaseSchema.safeParse(input);
  if (!parsed.success) return { error: GENERIC_ERROR };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("purchases")
    .select("id, project_id")
    .eq("id", parsed.data.purchaseId)
    .maybeSingle();
  if (!existing) return { error: GENERIC_ERROR };

  // Attached documents cascade with the purchase row (documents.purchase_id is
  // ON DELETE CASCADE); their storage objects are left to the existing
  // document cleanup path rather than a second, divergent one here.
  const { error } = await supabase.from("purchases").delete().eq("id", parsed.data.purchaseId);

  if (error) {
    console.error("[deletePurchase] Supabase error:", error.code, error.message);
    return { error: GENERIC_ERROR };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await logAudit({
      projectId: existing.project_id,
      userId: user.id,
      action: "purchase_deleted",
      entityType: "purchase",
      entityId: parsed.data.purchaseId,
    });
  }

  revalidateSuppliers(existing.project_id);
  return {};
}

async function resolvePaymentMethodId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  code: string | undefined,
): Promise<string | null> {
  if (!code) return null;
  const { data } = await supabase
    .from("payment_methods")
    .select("id")
    .eq("code", code)
    .maybeSingle();
  return data?.id ?? null;
}
