"use server";

import { revalidatePath } from "next/cache";
import { createSupportTicketSchema, type CreateSupportTicketInput } from "@keurflow/validation";
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
