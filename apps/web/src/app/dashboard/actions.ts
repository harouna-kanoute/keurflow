"use server";

import { revalidatePath } from "next/cache";
import {
  createOrganizationSchema,
  createProjectSchema,
  type CreateOrganizationInput,
  type CreateProjectInput,
} from "@keurflow/validation";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

// Generic fallback per §68 — real Supabase error details never reach the client.
const GENERIC_ERROR = "Une erreur est survenue. Veuillez réessayer.";

export type ActionResult = { error: string } | { error?: undefined };

export async function createOrganization(input: CreateOrganizationInput): Promise<ActionResult> {
  const parsed = createOrganizationSchema.safeParse(input);
  if (!parsed.success) return { error: GENERIC_ERROR };

  const supabase = await createClient();

  const { data: country } = await supabase
    .from("countries")
    .select("id")
    .eq("code", parsed.data.countryCode)
    .single();

  if (!country) return { error: GENERIC_ERROR };

  // create_organization() is SECURITY DEFINER: it inserts the organization
  // row and the caller's owner membership row atomically (see migration
  // 20260811140000_organizations.sql) — a plain client-side insert can't do
  // this because no membership row exists yet to authorize it via RLS.
  const { error } = await supabase.rpc("create_organization", {
    org_name: parsed.data.name,
    org_type: parsed.data.type,
    org_country_id: country.id,
  });

  if (error) {
    console.error("[createOrganization] Supabase error:", error.code, error.message);
    return { error: GENERIC_ERROR };
  }

  revalidatePath("/dashboard");
  return {};
}

export async function markNotificationRead(notificationId: string): Promise<ActionResult> {
  const supabase = await createClient();

  // RLS (notifications_update_own) is the authoritative check — this can
  // only ever touch the caller's own row regardless of what id is passed.
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId);

  if (error) {
    console.error("[markNotificationRead] Supabase error:", error.code, error.message);
    return { error: GENERIC_ERROR };
  }

  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard");
  return {};
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: GENERIC_ERROR };

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) {
    console.error("[markAllNotificationsRead] Supabase error:", error.code, error.message);
    return { error: GENERIC_ERROR };
  }

  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard");
  return {};
}

export async function createProject(input: CreateProjectInput): Promise<ActionResult> {
  const parsed = createProjectSchema.safeParse(input);
  if (!parsed.success) return { error: GENERIC_ERROR };

  const supabase = await createClient();

  const { data: country } = await supabase
    .from("countries")
    .select("id")
    .eq("code", parsed.data.countryCode)
    .single();

  if (!country) return { error: GENERIC_ERROR };

  // create_project() is SECURITY DEFINER: it checks the caller's
  // organization role server-side (owner/admin/manager) and, if authorized,
  // inserts the project row and the caller's project_owner membership row
  // atomically (see migration 20260811170000_project_members.sql).
  const { data: newProject, error } = await supabase.rpc("create_project", {
    p_organization_id: parsed.data.organizationId,
    p_name: parsed.data.name,
    p_description: parsed.data.description ?? null,
    p_project_type: parsed.data.projectType,
    p_country_id: country.id,
    p_city: parsed.data.city ?? null,
    p_budget_minor: parsed.data.budgetMinor,
    p_currency_code: parsed.data.currencyCode,
  });

  if (error) {
    // KF001/KF002 are the custom errcodes raised by create_project() itself
    // (supabase/migrations/20260811310000_project_limits.sql) — trial
    // expired / no active subscription, or the plan's project limit is
    // reached. Everything else stays generic per §68.
    if (error.code === "KF001") {
      return { error: "Votre essai est terminé. Passez à l'abonnement payant pour continuer." };
    }
    if (error.code === "KF002") {
      return { error: "Limite de chantiers atteinte pour votre plan actuel." };
    }
    console.error("[createProject] Supabase error:", error.code, error.message);
    return { error: GENERIC_ERROR };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user && newProject) {
    await logAudit({
      organizationId: parsed.data.organizationId,
      projectId: newProject.id,
      userId: user.id,
      action: "project_created",
      entityType: "project",
      entityId: newProject.id,
      metadata: { name: parsed.data.name },
    });
  }

  revalidatePath("/dashboard");
  return {};
}
