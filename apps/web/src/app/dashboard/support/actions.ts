"use server";

import { revalidatePath } from "next/cache";
import {
  createSupportTicketSchema,
  deleteSupportAttachmentSchema,
  type CreateSupportTicketInput,
  type DeleteSupportAttachmentInput,
} from "@keurflow/validation";
import { createClient } from "@/lib/supabase/server";

// Generic fallback per §68 — real Supabase error details never reach the client.
const GENERIC_ERROR = "Une erreur est survenue. Veuillez réessayer.";

export type ActionResult = { error: string } | { error?: undefined };

export async function createSupportTicket(input: CreateSupportTicketInput): Promise<ActionResult> {
  const parsed = createSupportTicketSchema.safeParse(input);
  if (!parsed.success) return { error: GENERIC_ERROR };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: GENERIC_ERROR };

  // user_id defaults to auth.uid() at the DB level (support_tickets_insert_own
  // RLS policy is the authority either way) — never trust a client-supplied id.
  const { error } = await supabase.from("support_tickets").insert({
    organization_id: parsed.data.organizationId ?? null,
    category: parsed.data.category,
    subject: parsed.data.subject,
    description: parsed.data.description,
    page_url: parsed.data.pageUrl ?? null,
    attachment_paths: parsed.data.attachmentPaths?.length ? parsed.data.attachmentPaths : null,
  });

  if (error) {
    console.error("[createSupportTicket] Supabase error:", error.code, error.message);
    return { error: GENERIC_ERROR };
  }

  revalidatePath("/dashboard/support");
  return {};
}

export async function deleteSupportAttachment(
  input: DeleteSupportAttachmentInput,
): Promise<ActionResult> {
  const parsed = deleteSupportAttachmentSchema.safeParse(input);
  if (!parsed.success) return { error: GENERIC_ERROR };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: GENERIC_ERROR };

  const { data: ticket } = await supabase
    .from("support_tickets")
    .select("attachment_paths")
    .eq("id", parsed.data.ticketId)
    .maybeSingle();
  if (!ticket) return { error: GENERIC_ERROR };

  const remainingPaths = (ticket.attachment_paths ?? []).filter(
    (path: string) => path !== parsed.data.path,
  );

  // support_tickets_update_own_attachments (RLS) + a column-level grant are
  // the actual authority here — they let this UPDATE touch attachment_paths
  // only, keeping subject/description/category/status immutable from the
  // client either way.
  const { error } = await supabase
    .from("support_tickets")
    .update({ attachment_paths: remainingPaths.length > 0 ? remainingPaths : null })
    .eq("id", parsed.data.ticketId);
  if (error) {
    console.error("[deleteSupportAttachment] Supabase error:", error.code, error.message);
    return { error: GENERIC_ERROR };
  }

  // Best-effort: support_attachments_delete_own already permits this, but the
  // ticket row above is the source of truth the UI reads from either way.
  const { error: storageError } = await supabase.storage
    .from("support-attachments")
    .remove([parsed.data.path]);
  if (storageError) {
    console.error("[deleteSupportAttachment] storage remove error:", storageError.message);
  }

  revalidatePath("/dashboard/support");
  return {};
}
