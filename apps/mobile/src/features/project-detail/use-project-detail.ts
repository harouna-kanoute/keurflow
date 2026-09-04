import {
  canApproveExpense,
  getBudgetConsumptionPercent,
  getFundingCoveragePercent,
  getMilestoneProgressPercent,
  getTotalFunded,
  hasOrgRoleAtLeast,
  hasProjectRoleAtLeast,
  isSubscriptionBlocked,
} from "@keurflow/business";
import type { OrganizationRole, ProjectRole, SubscriptionStatus } from "@keurflow/types";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { supabase } from "../../lib/supabase";
import type { Expense, Member, Photo, Project, ProjectDetailState, Report } from "./types";

const PHOTO_LIMIT = 30;

// Fetches everything the project detail screen's 7 tabs need in one pass —
// mirrors web's own model (all tabs pre-rendered from data fetched once;
// switching tabs never re-fetches). Extended incrementally as each tab's PR
// lands rather than fetching data no tab uses yet.
export function useProjectDetail(id: string | undefined) {
  const [state, setState] = useState<ProjectDetailState>({ status: "loading" });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;

    const { data: projectRow } = await supabase
      .from("projects")
      .select(
        "id, name, description, project_type, city, address, surface_area, start_date, expected_end_date, country_id, status, budget_minor, currency_code, organization_id",
      )
      .eq("id", id)
      .maybeSingle();

    if (!projectRow) {
      setState({ status: "not-found" });
      return;
    }

    const { data: country } = projectRow.country_id
      ? await supabase.from("countries").select("name").eq("id", projectRow.country_id).maybeSingle()
      : { data: null };

    const project: Project = { ...projectRow, countryName: country?.name ?? null };

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const [
      { data: fundings },
      { data: expenses },
      { data: milestones },
      { data: paymentMethods },
      { data: photoRows },
      { data: memberRows },
      { data: reportRows },
      { data: subscription },
      orgRoleResult,
      projectRoleResult,
    ] = await Promise.all([
      supabase
        .from("fundings")
        .select("id, amount_minor, currency_code, reference, funding_date, payment_method_id")
        .eq("project_id", id)
        .order("funding_date", { ascending: false }),
      supabase
        .from("expenses")
        .select("id, amount_minor, currency_code, category, supplier_name, expense_date, status, created_by")
        .eq("project_id", id)
        .order("expense_date", { ascending: false })
        .limit(10),
      supabase
        .from("milestones")
        .select("id, name, status, order_index")
        .eq("project_id", id)
        .order("order_index", { ascending: true }),
      supabase.from("payment_methods").select("id, code, label"),
      supabase
        .from("photos")
        .select("id, storage_path, caption, uploaded_by, created_at")
        .eq("project_id", id)
        .order("created_at", { ascending: false })
        .limit(PHOTO_LIMIT),
      supabase
        .from("project_members")
        .select("id, user_id, role, status")
        .eq("project_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("reports")
        .select("id, period_start, period_end, summary, metrics, created_at")
        .eq("project_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("subscriptions")
        .select("status, trial_ends_at, plan_code")
        .eq("organization_id", project.organization_id)
        .maybeSingle(),
      user
        ? supabase
            .from("organization_members")
            .select("role")
            .eq("organization_id", project.organization_id)
            .eq("user_id", user.id)
            .eq("status", "active")
            .maybeSingle()
        : Promise.resolve({ data: null }),
      user
        ? supabase
            .from("project_members")
            .select("role")
            .eq("project_id", id)
            .eq("user_id", user.id)
            .eq("status", "active")
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const fundingList = (fundings ?? []).map((f) => ({ amountMinor: f.amount_minor }));
    const expenseList = (expenses ?? []).map((e) => ({
      amountMinor: e.amount_minor,
      status: e.status as "pending" | "needs_information" | "approved" | "rejected",
    }));

    let photos: Photo[] = (photoRows ?? []).map((p) => ({ ...p, signedUrl: null }));
    if (photos.length > 0) {
      const { data: signed } = await supabase.storage
        .from("project-photos")
        .createSignedUrls(
          photos.map((p) => p.storage_path),
          3600,
        );
      photos = photos.map((p, i) => ({ ...p, signedUrl: signed?.[i]?.signedUrl ?? null }));
    }

    // Web fetches profiles as a separate .in() query rather than an embedded
    // join — project_members.user_id FKs to auth.users, not profiles, so
    // PostgREST can't traverse it in one select. Mirrored here exactly.
    const memberUserIds = (memberRows ?? []).map((m) => m.user_id);
    const { data: memberProfiles } = memberUserIds.length
      ? await supabase.from("profiles").select("id, full_name, avatar_url, phone").in("id", memberUserIds)
      : { data: [] as { id: string; full_name: string | null; avatar_url: string | null; phone: string | null }[] };

    const avatarPaths = (memberProfiles ?? []).map((p) => p.avatar_url).filter((p): p is string => !!p);
    const { data: avatarSigned } =
      avatarPaths.length > 0
        ? await supabase.storage.from("avatars").createSignedUrls(avatarPaths, 3600)
        : { data: [] as { signedUrl: string }[] };
    const avatarUrlByPath = new Map(avatarPaths.map((path, i) => [path, avatarSigned?.[i]?.signedUrl ?? null]));

    // Same reasoning as memberProfiles above — expenses.created_by FKs to
    // auth.users, not profiles, so this needs its own .in() query rather
    // than an embedded select. Mirrors web's submitterById in page.tsx.
    const submitterIds = [...new Set((expenses ?? []).map((e) => e.created_by))];
    const { data: submitterProfiles } = submitterIds.length
      ? await supabase.from("profiles").select("id, full_name, phone").in("id", submitterIds)
      : { data: [] as { id: string; full_name: string | null; phone: string | null }[] };
    const submitterById = new Map((submitterProfiles ?? []).map((p) => [p.id, p]));

    const members: Member[] = (memberRows ?? []).map((m) => {
      const profile = memberProfiles?.find((p) => p.id === m.user_id);
      return {
        id: m.id,
        user_id: m.user_id,
        role: m.role,
        status: m.status,
        fullName: profile?.full_name ?? "Utilisateur",
        phone: profile?.phone ?? null,
        avatarSignedUrl: profile?.avatar_url ? (avatarUrlByPath.get(profile.avatar_url) ?? null) : null,
      };
    });

    const reports: Report[] = (reportRows ?? []).map((r) => ({
      ...r,
      metrics: r.metrics as Report["metrics"],
    }));

    const orgRole = (orgRoleResult.data?.role as OrganizationRole | undefined) ?? "viewer";
    const projectRole = (projectRoleResult.data?.role as ProjectRole | undefined) ?? "project_viewer";
    const canManageAny =
      hasOrgRoleAtLeast(orgRole, "manager") || hasProjectRoleAtLeast(projectRole, "project_manager");
    const canApprove = hasOrgRoleAtLeast(orgRole, "manager") || canApproveExpense(projectRole);

    // Client-side-only gate, same as web's Server Action guards but without
    // a server layer to enforce it at — mobile already writes straight to
    // Supabase with RLS as the sole authority, unchanged by this feature.
    const isBlocked = subscription
      ? isSubscriptionBlocked(
          { status: subscription.status as SubscriptionStatus, trialEndsAt: subscription.trial_ends_at },
          subscription.plan_code,
        )
      : false;

    setState({
      status: "ready",
      project,
      totalFunded: getTotalFunded(fundingList),
      coveragePercent: getFundingCoveragePercent(project.budget_minor, fundingList),
      consumptionPercent: getBudgetConsumptionPercent(project.budget_minor, expenseList),
      milestoneProgress: getMilestoneProgressPercent(
        (milestones ?? []).map((m) => ({ status: m.status as never })),
      ),
      milestones: milestones ?? [],
      expenses: (expenses ?? []).map((e) => ({
        ...e,
        submitterName: submitterById.get(e.created_by)?.full_name ?? null,
        submitterPhone: submitterById.get(e.created_by)?.phone ?? null,
      })) as Expense[],
      fundings: fundings ?? [],
      paymentMethods: paymentMethods ?? [],
      photos,
      members,
      reports,
      currentUserId: user?.id ?? null,
      canManageAny,
      canApprove,
      isBlocked,
    });
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return { state, refreshing, onRefresh, reload: load };
}
