import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyUsers } from "@/lib/notifications";

// Vercel Cron (see apps/web/vercel.json, runs once daily) — no user session
// exists here, so authorization is the shared secret header Vercel sends on
// every cron invocation, not RLS. CRON_SECRET must be set in the Vercel
// project's environment variables (not committed — see .env.example).
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Exactly the calendar day 2 days from now, in UTC — trial_ends_at is a
  // timestamp, so comparing on its date part means this only ever matches
  // once per organization (the day it's due), regardless of what time this
  // cron actually runs.
  const { data: subscriptions, error } = await admin
    .from("subscriptions")
    .select("organization_id, trial_ends_at")
    .eq("status", "trialing")
    .not("trial_ends_at", "is", null);

  if (error) {
    console.error("[cron/trial-reminders] Supabase error:", error.code, error.message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  const now = new Date();
  const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2).toDateString();
  const dueOrganizationIds = (subscriptions ?? [])
    .filter((s) => s.trial_ends_at && new Date(s.trial_ends_at).toDateString() === targetDate)
    .map((s) => s.organization_id);

  let notifiedCount = 0;
  for (const organizationId of dueOrganizationIds) {
    const { data: members } = await admin
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", organizationId)
      .eq("status", "active");

    const userIds = (members ?? []).map((m) => m.user_id);
    await notifyUsers({
      userIds,
      projectId: null,
      type: "trial_ending_soon",
      title: "Votre essai se termine dans 2 jours",
      body: "Passez à l'abonnement avant la fin de l'essai pour ne rien perdre de vos chantiers.",
    });
    notifiedCount += userIds.length;
  }

  return NextResponse.json({ organizations: dueOrganizationIds.length, notified: notifiedCount });
}
