import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  canApproveExpense,
  DOCUMENTATION_STATUS_LABEL,
  deriveDocumentationStatus,
  formatMoney,
  getBudgetConsumptionPercent,
  getFundingCoveragePercent,
  getFundingGap,
  getMilestoneProgressPercent,
  getRemainingBudget,
  getTotalFunded,
  hasOrgRoleAtLeast,
  hasProjectRoleAtLeast,
  isProjectDelayed,
  type ReportData,
} from "@keurflow/business";
import { CURRENCIES, EXPENSE_CATEGORIES, PROJECT_TYPES } from "@keurflow/config";
import type { OrganizationRole, ProjectRole } from "@keurflow/types";
import { createClient } from "@/lib/supabase/server";
import { Modal } from "@/components/modal";
import { DonutChart } from "@/components/donut-chart";
import { Money } from "@/components/money";
import { MoneyBarChart } from "@/components/money-bar-chart";
import {
  AlertIcon,
  BudgetIcon,
  CheckIcon,
  ClockIcon,
  EditIcon,
  ExpandIcon,
  FlagIcon,
  GlobeIcon,
  MapPinIcon,
  ReceiptIcon,
  TrashIcon,
} from "@/components/icons";
import { EditProjectForm } from "../../edit-project-form";
import { CreateFundingForm } from "./create-funding-form";
import { CreateExpenseForm } from "./create-expense-form";
import { ExpenseStatusActions, ExpenseStatusBadge } from "./expense-status";
import { ExpenseComments, type ExpenseCommentView } from "./expense-comments";
import { ExpenseDocuments, type ExpenseDocumentView } from "./expense-documents";
import { AddMilestoneForm, MilestoneStatusSelect } from "./milestones";
import { PhotoGallery, UploadPhotoForm } from "./photos";
import { InviteMemberForm } from "./invite-member-form";
import { MemberRowActions } from "./member-actions";
import { CreateReportForm } from "./create-report-form";
import { ReportActions } from "./report-actions";
import { DeleteProjectForm } from "./delete-project-form";
import { ProjectStatusSelect, PROJECT_STATUS_COLORS } from "./project-status";
import { ProjectTabs } from "./project-tabs";
import { SuppliersPanel } from "./suppliers-panel";
import { PROJECT_TAB_IDS, type ProjectTabId } from "./project-tab-ids";
import { MemberProfileTrigger } from "./member-profile";

function minorUnitFor(currencyCode: string): number {
  return CURRENCIES.find((c) => c.code === currencyCode)?.minorUnit ?? 2;
}

const STATUS_LABELS: Record<string, string> = {
  planning: "Planification",
  active: "Actif",
  paused: "En pause",
  completed: "Terminé",
  archived: "Archivé",
};

const CATEGORY_LABELS = new Map(EXPENSE_CATEGORIES.map((c) => [c.code, c.label]));
const PROJECT_TYPE_LABELS = new Map(PROJECT_TYPES.map((t) => [t.code, t.label]));

const PROJECT_ROLE_LABELS: Record<string, string> = {
  project_owner: "Propriétaire",
  project_manager: "Responsable",
  project_approver: "Propriétaire du chantier",
  project_member: "Collaborateur",
  project_viewer: "Client (lecture seule)",
};

const MILESTONE_STATUS_LABELS: Record<string, string> = {
  pending: "À faire",
  in_progress: "En cours",
  completed: "Terminée",
  delayed: "En retard",
};

const MILESTONE_STATUS_COLORS: Record<string, string> = {
  pending: "text-slate-400 dark:text-slate-600",
  in_progress: "text-amber-500 dark:text-amber-400",
  completed: "text-green-500 dark:text-green-400",
  delayed: "text-red-500 dark:text-red-400",
};

type IconComponent = (props: { className?: string }) => React.ReactNode;

function InfoTile({
  icon: Icon,
  label,
  children,
}: {
  icon: IconComponent;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-canvas px-3.5 py-3 dark:bg-slate-800/40">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400">
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-slate-900 dark:text-slate-50">{children}</p>
      </div>
    </div>
  );
}

const STAT_TONE_CLASSES = {
  brand: "bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400",
  green: "bg-green-50 text-green-600 dark:bg-green-900/40 dark:text-green-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
  slate: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
} as const;

function BudgetStat({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: IconComponent;
  tone: keyof typeof STAT_TONE_CLASSES;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-canvas p-3.5 dark:bg-slate-800/40">
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${STAT_TONE_CLASSES[tone]}`}>
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-0.5 text-base font-semibold text-slate-900 dark:text-slate-50">{value}</p>
    </div>
  );
}

const CATEGORY_CHART_COLORS = [
  "text-brand-600 dark:text-brand-500",
  "text-teal-500 dark:text-teal-400",
  "text-amber-500 dark:text-amber-400",
  "text-purple-500 dark:text-purple-400",
  "text-pink-500 dark:text-pink-400",
  "text-blue-500 dark:text-blue-400",
  "text-lime-500 dark:text-lime-400",
  "text-orange-500 dark:text-orange-400",
];

const MONTH_LABELS = [
  "Jan",
  "Fév",
  "Mars",
  "Avr",
  "Mai",
  "Juin",
  "Juil",
  "Août",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  // RLS-scoped like the page itself — a project this viewer can't see
  // simply yields no row, so the tab title falls back to the generic label.
  const { data: project } = await supabase.from("projects").select("name").eq("id", id).maybeSingle();
  return { title: project ? `${project.name} — KeurFlow` : "Chantier — KeurFlow" };
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const initialTab: ProjectTabId = PROJECT_TAB_IDS.includes(tab as ProjectTabId)
    ? (tab as ProjectTabId)
    : "apercu";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // RLS (projects_select_org_or_project_members) returns nothing here if
  // this user can't see the project — including when the id was just
  // guessed from another tenant's data (spec §64/§82).
  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, organization_id, name, description, project_type, country_id, city, address, surface_area, status, budget_minor, currency_code, start_date, expected_end_date",
    )
    .eq("id", id)
    .maybeSingle();

  if (!project) {
    notFound();
  }

  const { data: country } = await supabase
    .from("countries")
    .select("name")
    .eq("id", project.country_id)
    .maybeSingle();

  // Drives the invite form's framing (§ contextual invite): an agency
  // invites the chantier's owner to follow remotely, an individual invites
  // a collaborator to track it for them — see InviteMemberForm.
  const { data: organization } = await supabase
    .from("organizations")
    .select("type")
    .eq("id", project.organization_id)
    .maybeSingle();
  const isAgencyOrg = organization?.type === "agency" || organization?.type === "company";

  const { data: fundings } = await supabase
    .from("fundings")
    .select("id, amount_minor, currency_code, payment_method_id, reference, funding_date")
    .eq("project_id", project.id)
    .order("funding_date", { ascending: false });

  const { data: paymentMethods } = await supabase.from("payment_methods").select("id, label");
  const paymentMethodLabels = new Map((paymentMethods ?? []).map((m) => [m.id, m.label]));

  const fundingList = (fundings ?? []).map((f) => ({ amountMinor: f.amount_minor }));
  const totalFunded = getTotalFunded(fundingList);
  const fundingGap = getFundingGap(project.budget_minor, fundingList);
  const coveragePercent = getFundingCoveragePercent(project.budget_minor, fundingList);
  const minorUnit = minorUnitFor(project.currency_code);

  const { data: expenses } = await supabase
    .from("expenses")
    .select("id, amount_minor, currency_code, category, supplier_name, expense_date, status, created_by")
    .eq("project_id", project.id)
    .order("expense_date", { ascending: false });

  // Submitter name + WhatsApp number, resolved for the "Demander des infos"
  // deep link — same shared-context join already used for milestone/comment
  // authors below (profiles_select_shared_context covers every collaborator
  // visible on this page).
  const submitterIds = [...new Set((expenses ?? []).map((e) => e.created_by))];
  const { data: submitterProfiles } =
    submitterIds.length > 0
      ? await supabase.from("profiles").select("id, full_name, phone").in("id", submitterIds)
      : { data: [] };
  const submitterById = new Map((submitterProfiles ?? []).map((p) => [p.id, p]));

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const projectUrl = `${appUrl}/dashboard/projects/${project.id}`;

  const { data: documents } = await supabase
    .from("documents")
    .select("id, expense_id, filename, storage_path, uploaded_by")
    .eq("project_id", project.id)
    .not("expense_id", "is", null);

  // One batch signed-url call across every document rather than one per
  // document — same approach as the project photo gallery.
  const documentPaths = (documents ?? []).map((d) => d.storage_path);
  const { data: documentSignedUrls } =
    documentPaths.length > 0
      ? await supabase.storage.from("expense-receipts").createSignedUrls(documentPaths, 3600)
      : { data: [] };
  const documentUrlByPath = new Map(
    (documentSignedUrls ?? []).map((s) => [s.path, s.signedUrl] as const),
  );

  // Suppliers are organization-scoped (reusable across the tenant's
  // chantiers), so this reads the org's directory, not the project's.
  // RLS (suppliers_select_org_or_purchase_collaborators) decides what comes
  // back — another tenant's suppliers simply aren't in the result.
  const { data: supplierRows } = await supabase
    .from("suppliers")
    .select(
      "id, name, contact_name, phone, whatsapp, email, address, city, country_id, specialties, notes, status",
    )
    .eq("organization_id", project.organization_id)
    .order("name", { ascending: true });

  // Every purchase from those suppliers (not just this chantier's) so the
  // supplier sheet can show its full history and recorded average prices —
  // again bounded by RLS, which only returns purchases on projects the caller
  // can already see.
  const supplierIds = (supplierRows ?? []).map((s) => s.id);
  const { data: purchaseRows } =
    supplierIds.length > 0
      ? await supabase
          .from("purchases")
          .select(
            "id, project_id, supplier_id, material_code, material_name, purchase_date, quantity, unit, unit_price_minor, currency_code, total_amount_minor, payment_method_id, expense_id",
          )
          .in("supplier_id", supplierIds)
          .order("purchase_date", { ascending: false })
      : { data: [] };

  const purchaseProjectIds = [...new Set((purchaseRows ?? []).map((p) => p.project_id))];
  const { data: purchaseProjects } =
    purchaseProjectIds.length > 0
      ? await supabase.from("projects").select("id, name").in("id", purchaseProjectIds)
      : { data: [] };
  const projectNameById = new Map((purchaseProjects ?? []).map((p) => [p.id, p.name]));

  const purchaseIds = (purchaseRows ?? []).map((p) => p.id);
  const { data: purchaseDocuments } =
    purchaseIds.length > 0
      ? await supabase.from("documents").select("purchase_id").in("purchase_id", purchaseIds)
      : { data: [] };
  const documentCountByPurchase = new Map<string, number>();
  for (const doc of purchaseDocuments ?? []) {
    if (!doc.purchase_id) continue;
    documentCountByPurchase.set(
      doc.purchase_id,
      (documentCountByPurchase.get(doc.purchase_id) ?? 0) + 1,
    );
  }

  const supplierCountryIds = [...new Set((supplierRows ?? []).map((s) => s.country_id))];
  const { data: supplierCountries } =
    supplierCountryIds.length > 0
      ? await supabase.from("countries").select("id, code, name").in("id", supplierCountryIds)
      : { data: [] };
  const countryById = new Map((supplierCountries ?? []).map((c) => [c.id, c]));

  const suppliers = (supplierRows ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    contactName: s.contact_name,
    phone: s.phone,
    whatsapp: s.whatsapp,
    email: s.email,
    address: s.address,
    city: s.city,
    countryCode: countryById.get(s.country_id)?.code ?? "",
    countryName: countryById.get(s.country_id)?.name ?? "",
    specialties: s.specialties,
    notes: s.notes,
    status: s.status as "active" | "inactive",
  }));

  const supplierNameById = new Map((supplierRows ?? []).map((s) => [s.id, s.name]));
  const purchases = (purchaseRows ?? []).map((p) => ({
    id: p.id,
    projectId: p.project_id,
    projectName: projectNameById.get(p.project_id) ?? "",
    supplierId: p.supplier_id,
    supplierName: supplierNameById.get(p.supplier_id) ?? "",
    materialCode: p.material_code,
    materialName: p.material_name,
    purchaseDate: p.purchase_date,
    quantity: Number(p.quantity),
    unit: p.unit,
    unitPriceMinor: p.unit_price_minor,
    currencyCode: p.currency_code,
    totalAmountMinor: p.total_amount_minor,
    paymentMethodLabel: p.payment_method_id
      ? (paymentMethodLabels.get(p.payment_method_id) ?? null)
      : null,
    expenseId: p.expense_id,
    documentCount: documentCountByPurchase.get(p.id) ?? 0,
  }));

  const purchaseCurrencyCodes = [
    ...new Set([project.currency_code, ...purchases.map((p) => p.currencyCode)]),
  ];
  const purchaseMinorUnits = Object.fromEntries(
    purchaseCurrencyCodes.map((code) => [code, minorUnitFor(code)]),
  );

  const documentCountByExpense = new Map<string, number>();
  const documentsByExpense = new Map<string, ExpenseDocumentView[]>();
  for (const doc of documents ?? []) {
    if (!doc.expense_id) continue;
    documentCountByExpense.set(doc.expense_id, (documentCountByExpense.get(doc.expense_id) ?? 0) + 1);
    const list = documentsByExpense.get(doc.expense_id) ?? [];
    list.push({
      id: doc.id,
      filename: doc.filename,
      url: documentUrlByPath.get(doc.storage_path) ?? null,
      uploadedBy: doc.uploaded_by,
    });
    documentsByExpense.set(doc.expense_id, list);
  }

  const expenseIds = (expenses ?? []).map((e) => e.id);
  const { data: expenseComments } =
    expenseIds.length > 0
      ? await supabase
          .from("expense_comments")
          .select("id, expense_id, user_id, content, created_at")
          .in("expense_id", expenseIds)
          .order("created_at", { ascending: true })
      : { data: [] };

  const commenterIds = [...new Set((expenseComments ?? []).map((c) => c.user_id))];
  const { data: commenterProfiles } =
    commenterIds.length > 0
      ? await supabase.from("profiles").select("id, full_name").in("id", commenterIds)
      : { data: [] };
  const commenterNames = new Map((commenterProfiles ?? []).map((p) => [p.id, p.full_name ?? "Utilisateur"]));

  const commentsByExpense = new Map<string, ExpenseCommentView[]>();
  for (const c of expenseComments ?? []) {
    const list = commentsByExpense.get(c.expense_id) ?? [];
    list.push({
      id: c.id,
      authorName: commenterNames.get(c.user_id) ?? "Utilisateur",
      content: c.content,
      createdAt: c.created_at,
    });
    commentsByExpense.set(c.expense_id, list);
  }

  // Determines whether to render the approve/reject/needs-info buttons —
  // UI convenience only. RLS (expenses_update_own_pending_or_managers) is
  // the actual authority on whether the update succeeds (§69/§83).
  const { data: orgMembership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", project.organization_id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  const { data: projectMembership } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", project.id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  const canApprove =
    (!!orgMembership && hasOrgRoleAtLeast(orgMembership.role as OrganizationRole, "manager")) ||
    (!!projectMembership && canApproveExpense(projectMembership.role as ProjectRole));

  // A narrower bar than canApprove — project_approver (the agency-invited
  // chantier owner) satisfies canApprove but must NOT get member
  // management, project status changes, or delete-any-photo/document; those
  // stay at project_manager+ (matches project_members_manage RLS, which
  // doesn't list project_approver).
  const canManageProject =
    (!!orgMembership && hasOrgRoleAtLeast(orgMembership.role as OrganizationRole, "manager")) ||
    (!!projectMembership &&
      hasProjectRoleAtLeast(projectMembership.role as ProjectRole, "project_manager"));

  // Deletion is a higher bar than canApprove — org owners/admins or the
  // project's own owner, not managers (see deleteProject's own check,
  // which RLS re-validates authoritatively either way).
  const canDelete =
    (!!orgMembership && hasOrgRoleAtLeast(orgMembership.role as OrganizationRole, "admin")) ||
    (!!projectMembership &&
      hasProjectRoleAtLeast(projectMembership.role as ProjectRole, "project_owner"));

  // Matches projects_update_org_managers_or_project_owners (RLS) — org
  // managers+ or the project's own owner, same bar as updateProject's own
  // check re-validates authoritatively either way.
  const canEdit =
    (!!orgMembership && hasOrgRoleAtLeast(orgMembership.role as OrganizationRole, "manager")) ||
    (!!projectMembership &&
      hasProjectRoleAtLeast(projectMembership.role as ProjectRole, "project_owner"));

  // Mirrors suppliers_insert_org_managers / suppliers_update_org_managers:
  // the supplier directory belongs to the organization, so managing it is an
  // org-level right — a project-only collaborator reads it, never edits it.
  const canManageSuppliers =
    !!orgMembership && hasOrgRoleAtLeast(orgMembership.role as OrganizationRole, "manager");

  // Same bar as logging an expense (purchases_insert_non_viewers): anyone who
  // really works on the chantier can record what was bought.
  const canCreatePurchase =
    (!!orgMembership && hasOrgRoleAtLeast(orgMembership.role as OrganizationRole, "member")) ||
    (!!projectMembership &&
      hasProjectRoleAtLeast(projectMembership.role as ProjectRole, "project_member"));

  const expenseList = (expenses ?? []).map((e) => ({
    amountMinor: e.amount_minor,
    status: e.status as "pending" | "needs_information" | "approved" | "rejected",
  }));
  const approvedTotal = getBudgetConsumptionPercent(project.budget_minor, expenseList);
  const remainingBudget = getRemainingBudget(project.budget_minor, expenseList);
  const spentApproved = project.budget_minor - remainingBudget;

  const { data: milestones } = await supabase
    .from("milestones")
    .select("id, name, status")
    .eq("project_id", project.id)
    .order("order_index", { ascending: true });

  const { data: photoRows } = await supabase
    .from("photos")
    .select("id, storage_path, caption, uploaded_by")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .limit(30);

  let photos: { id: string; url: string | null; caption: string | null; uploadedBy: string }[] =
    [];
  if (photoRows && photoRows.length > 0) {
    const { data: signedUrls } = await supabase.storage
      .from("project-photos")
      .createSignedUrls(
        photoRows.map((p) => p.storage_path),
        3600,
      );
    photos = photoRows.map((p, i) => ({
      id: p.id,
      caption: p.caption,
      uploadedBy: p.uploaded_by,
      url: signedUrls?.[i]?.signedUrl ?? null,
    }));
  }

  const { data: members } = await supabase
    .from("project_members")
    .select("id, user_id, role, status")
    .eq("project_id", project.id)
    .order("created_at", { ascending: true });

  // profiles_select_shared_context (Phase 12) is what makes these names
  // (and, below, avatars/phone) visible — without it, this query would only
  // ever return the caller's own profile row, per profiles_select_own.
  const memberProfiles = members?.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, phone")
        .in(
          "id",
          members.map((m) => m.user_id),
        )
    : { data: [] };

  // One batch signed-url call across every member's avatar rather than one
  // per member — same approach as the project photo gallery.
  const memberAvatarPaths = (memberProfiles.data ?? [])
    .map((p) => p.avatar_url)
    .filter((p): p is string => !!p);
  const { data: memberAvatarSigned } =
    memberAvatarPaths.length > 0
      ? await supabase.storage.from("avatars").createSignedUrls(memberAvatarPaths, 3600)
      : { data: [] };
  const memberAvatarUrlByPath = new Map(
    (memberAvatarSigned ?? []).map((s) => [s.path, s.signedUrl] as const),
  );

  const memberInfoById = new Map(
    (memberProfiles.data ?? []).map((p) => [
      p.id,
      {
        fullName: p.full_name ?? "Membre",
        phone: p.phone,
        avatarSignedUrl: p.avatar_url ? (memberAvatarUrlByPath.get(p.avatar_url) ?? null) : null,
      },
    ]),
  );

  const { data: reportsRaw } = await supabase
    .from("reports")
    .select("id, period_start, period_end, summary, metrics, created_at")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  // metrics is untyped jsonb at the DB level — cast to the exact shape
  // createReport() writes (see actions.ts), null for reports generated
  // before this column existed.
  const reports = (reportsRaw ?? []).map((r) => ({
    ...r,
    metrics: r.metrics as ReportData | null,
  }));

  // Aperçu charts — derived from data already fetched above (budget,
  // expenses, milestones), no extra queries. Category/monthly totals only
  // count approved expenses, matching "Dépensé (approuvé)" elsewhere on
  // this page — pending/rejected amounts aren't real spend yet.
  const approvedExpenses = (expenses ?? []).filter((e) => e.status === "approved");

  const categoryTotalsMap = new Map<string, number>();
  for (const e of approvedExpenses) {
    categoryTotalsMap.set(e.category, (categoryTotalsMap.get(e.category) ?? 0) + e.amount_minor);
  }
  const categoryBreakdown = Array.from(categoryTotalsMap.entries())
    .map(([code, amountMinor], index) => ({
      code,
      label: CATEGORY_LABELS.get(code) ?? code,
      amountMinor,
      colorClassName: CATEGORY_CHART_COLORS[index % CATEGORY_CHART_COLORS.length],
    }))
    .sort((a, b) => b.amountMinor - a.amountMinor);

  const monthlyTotalsMap = new Map<string, number>();
  for (const e of approvedExpenses) {
    const d = new Date(e.expense_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyTotalsMap.set(key, (monthlyTotalsMap.get(key) ?? 0) + e.amount_minor);
  }
  const monthlyTotals = Array.from(monthlyTotalsMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(-6)
    .map(([key, amountMinor]) => {
      const [year, month] = key.split("-").map(Number);
      return { label: `${MONTH_LABELS[month - 1]} ${String(year).slice(2)}`, amountMinor };
    });

  const milestoneStatusCountsMap = new Map<string, number>();
  for (const m of milestones ?? []) {
    milestoneStatusCountsMap.set(m.status, (milestoneStatusCountsMap.get(m.status) ?? 0) + 1);
  }
  const milestoneStatusBreakdown = ["pending", "in_progress", "completed", "delayed"]
    .map((status) => ({
      status,
      label: MILESTONE_STATUS_LABELS[status],
      count: milestoneStatusCountsMap.get(status) ?? 0,
      colorClassName: MILESTONE_STATUS_COLORS[status],
    }))
    .filter((s) => s.count > 0);
  const milestoneProgressPercent = getMilestoneProgressPercent(
    (milestones ?? []).map((m) => ({
      status: m.status as "pending" | "in_progress" | "completed" | "delayed",
    })),
  );

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-canvas px-6 py-10">
      <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-8">
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            ← Retour
          </Link>

          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-lg font-semibold text-brand-700 dark:bg-brand-900 dark:text-brand-300">
                {project.name.trim().slice(0, 2).toUpperCase()}
              </span>
              <div>
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                  {project.name}
                </h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {PROJECT_TYPE_LABELS.get(project.project_type) ?? project.project_type}
                  </span>
                  {canManageProject ? (
                    <ProjectStatusSelect projectId={project.id} status={project.status} />
                  ) : (
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        PROJECT_STATUS_COLORS[project.status] ?? PROJECT_STATUS_COLORS.planning
                      }`}
                    >
                      {STATUS_LABELS[project.status] ?? project.status}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href={`/dashboard/projects/${project.id}/a-verifier`}
                className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-500 dark:border-slate-700 dark:text-slate-300"
              >
                À vérifier
              </Link>
              {canEdit && (
                <Modal
                  triggerLabel="Modifier le chantier"
                  triggerIcon={<EditIcon className="h-4 w-4" />}
                  title="Modifier le chantier"
                  variant="icon"
                  iconOnly
                >
                  <EditProjectForm
                    projectId={project.id}
                    currencyCode={project.currency_code}
                    defaultValues={{
                      name: project.name,
                      description: project.description,
                      projectType: project.project_type,
                      city: project.city,
                      budgetMinor: project.budget_minor,
                      address: project.address,
                      surfaceArea: project.surface_area,
                      startDate: project.start_date,
                      expectedEndDate: project.expected_end_date,
                    }}
                  />
                </Modal>
              )}
              {canDelete && (
                <Modal
                  triggerLabel="Supprimer le chantier"
                  triggerIcon={<TrashIcon className="h-4 w-4" />}
                  title="Supprimer le chantier"
                  variant="icon-danger"
                  iconOnly
                >
                  <DeleteProjectForm projectId={project.id} projectName={project.name} />
                </Modal>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
            Informations du chantier
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <InfoTile icon={FlagIcon} label="Type">
              {PROJECT_TYPE_LABELS.get(project.project_type) ?? project.project_type}
            </InfoTile>
            <InfoTile icon={GlobeIcon} label="Pays">
              {country?.name ?? "—"}
            </InfoTile>
            <InfoTile icon={MapPinIcon} label="Localisation">
              {[project.city, project.address].filter(Boolean).join(" — ") || "—"}
            </InfoTile>
            <InfoTile icon={ExpandIcon} label="Superficie">
              {project.surface_area != null ? `${project.surface_area} m²` : "—"}
            </InfoTile>
            <InfoTile icon={ClockIcon} label="Calendrier">
              <span className="flex flex-wrap items-center gap-1.5">
                <span>
                  {project.start_date ? new Date(project.start_date).toLocaleDateString("fr-FR") : "—"}
                  {" → "}
                  {project.expected_end_date
                    ? new Date(project.expected_end_date).toLocaleDateString("fr-FR")
                    : "—"}
                </span>
                {isProjectDelayed(
                  project.expected_end_date,
                  project.status as "planning" | "active" | "paused" | "completed" | "archived",
                ) && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-900/40 dark:text-red-400">
                    En retard
                  </span>
                )}
              </span>
            </InfoTile>
          </div>
          {project.description && (
            <div className="mt-4 rounded-xl border-l-2 border-brand-200 bg-canvas px-4 py-3 dark:border-brand-800 dark:bg-slate-800/40">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Description</p>
              <p className="mt-1 text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                {project.description}
              </p>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
            Budget
          </p>
          <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-8">
            <div className="flex justify-center lg:shrink-0">
              <DonutChart
                size={112}
                strokeWidth={12}
                total={Math.max(project.budget_minor, spentApproved)}
                segments={[
                  { value: spentApproved, colorClassName: "text-brand-600 dark:text-brand-500" },
                ]}
                centerLabel={`${approvedTotal}%`}
                centerSublabel="dépensé"
              />
            </div>
            <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <BudgetStat
                icon={BudgetIcon}
                tone="brand"
                label="Budget"
                value={
                  <Money amountMinor={project.budget_minor} currencyCode={project.currency_code} minorUnit={minorUnit} />
                }
              />
              <BudgetStat
                icon={ReceiptIcon}
                tone="green"
                label={`Financé (${coveragePercent}%)`}
                value={<Money amountMinor={totalFunded} currencyCode={project.currency_code} minorUnit={minorUnit} />}
              />
              <BudgetStat
                icon={AlertIcon}
                tone={fundingGap >= 0 ? "amber" : "green"}
                label={fundingGap >= 0 ? "Reste à financer" : "Financé en excédent"}
                value={
                  <Money amountMinor={Math.abs(fundingGap)} currencyCode={project.currency_code} minorUnit={minorUnit} />
                }
              />
              <BudgetStat
                icon={CheckIcon}
                tone="slate"
                label="Dépensé (approuvé)"
                value={<Money amountMinor={spentApproved} currencyCode={project.currency_code} minorUnit={minorUnit} />}
              />
            </div>
          </div>
        </div>

        <ProjectTabs
          key={initialTab}
          initialTab={initialTab}
          counts={{
            apercu: 0,
            financements: fundings?.length ?? 0,
            depenses: expenses?.length ?? 0,
            fournisseurs: suppliers.length,
            etapes: milestones?.length ?? 0,
            photos: photos.length,
            membres: members?.length ?? 0,
            rapports: reports.length,
          }}
          panels={{
            apercu: (
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Dépenses par catégorie
                  </p>
                  {categoryBreakdown.length > 0 ? (
                    <div className="mt-4 flex items-center gap-6">
                      <DonutChart
                        size={96}
                        strokeWidth={12}
                        segments={categoryBreakdown.map((c) => ({
                          value: c.amountMinor,
                          colorClassName: c.colorClassName,
                        }))}
                      />
                      <ul className="flex flex-1 flex-col gap-1.5 text-xs">
                        {categoryBreakdown.map((c) => (
                          <li key={c.code} className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                              <span
                                className={`h-2 w-2 shrink-0 rounded-full bg-current ${c.colorClassName}`}
                              />
                              {c.label}
                            </span>
                            <span className="shrink-0 text-slate-900 dark:text-slate-100">
                              <Money amountMinor={c.amountMinor} currencyCode={project.currency_code} minorUnit={minorUnit} />
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                      Aucune dépense approuvée.
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Avancement des étapes
                  </p>
                  {milestones && milestones.length > 0 ? (
                    <div className="mt-4 flex items-center gap-6">
                      <DonutChart
                        size={96}
                        strokeWidth={12}
                        segments={milestoneStatusBreakdown.map((s) => ({
                          value: s.count,
                          colorClassName: s.colorClassName,
                        }))}
                        centerLabel={`${milestoneProgressPercent}%`}
                        centerSublabel="fait"
                      />
                      <ul className="flex flex-1 flex-col gap-1.5 text-xs">
                        {milestoneStatusBreakdown.map((s) => (
                          <li key={s.status} className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                              <span
                                className={`h-2 w-2 shrink-0 rounded-full bg-current ${s.colorClassName}`}
                              />
                              {s.label}
                            </span>
                            <span className="shrink-0 text-slate-900 dark:text-slate-100">
                              {s.count}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Aucune étape.</p>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 sm:col-span-2">
                  {monthlyTotals.length > 0 ? (
                    <MoneyBarChart
                      title="Dépenses approuvées par mois"
                      data={monthlyTotals.map((m) => ({ label: m.label, amountMinor: m.amountMinor }))}
                      currencyCode={project.currency_code}
                      minorUnit={minorUnit}
                    />
                  ) : (
                    <>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        Dépenses approuvées par mois ({project.currency_code})
                      </p>
                      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                        Aucune dépense approuvée.
                      </p>
                    </>
                  )}
                </div>
              </div>
            ),
            financements: (
              <div>
                <div className="flex justify-end">
                  <Modal triggerLabel="Financement" title="Nouveau financement" variant="secondary">
                    <CreateFundingForm
                      projectId={project.id}
                      currencyCode={project.currency_code}
                      minorUnit={minorUnit}
                    />
                  </Modal>
                </div>
                {fundings && fundings.length > 0 ? (
                  <ul className="mt-3 flex flex-col gap-2">
                    {fundings.map((funding) => (
                      <li
                        key={funding.id}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900"
                      >
                        <span className="text-slate-900 dark:text-slate-100">
                          {paymentMethodLabels.get(funding.payment_method_id) ?? "—"}
                          {funding.reference ? ` · ${funding.reference}` : ""}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">
                          <Money amountMinor={funding.amount_minor} currencyCode={funding.currency_code} minorUnit={minorUnit} />
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                    Aucun financement enregistré.
                  </p>
                )}
              </div>
            ),
            depenses: (
              <div>
                <div className="flex justify-end">
                  <Modal triggerLabel="Dépense" title="Nouvelle dépense" variant="secondary">
                    <CreateExpenseForm
                      projectId={project.id}
                      currencyCode={project.currency_code}
                      minorUnit={minorUnit}
                    />
                  </Modal>
                </div>
                {expenses && expenses.length > 0 ? (
                  <ul className="mt-3 flex flex-col gap-2">
                    {expenses.map((expense) => {
                      const documentationStatus = deriveDocumentationStatus(
                        documentCountByExpense.get(expense.id) ?? 0,
                      );
                      const submitter = submitterById.get(expense.created_by);
                      return (
                        <li
                          key={expense.id}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-slate-900 dark:text-slate-100">
                              {CATEGORY_LABELS.get(expense.category) ?? expense.category}
                              {expense.supplier_name ? ` · ${expense.supplier_name}` : ""}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400">
                              <Money amountMinor={expense.amount_minor} currencyCode={expense.currency_code} minorUnit={minorUnit} />
                            </span>
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <ExpenseStatusBadge status={expense.status} />
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {DOCUMENTATION_STATUS_LABEL[documentationStatus]}
                            </span>
                          </div>
                          <ExpenseStatusActions
                            expenseId={expense.id}
                            canApprove={canApprove}
                            categoryLabel={CATEGORY_LABELS.get(expense.category) ?? expense.category}
                            amountLabel={formatMoney(expense.amount_minor, expense.currency_code, minorUnit)}
                            supplierName={expense.supplier_name}
                            submitterName={submitter?.full_name ?? null}
                            submitterPhone={submitter?.phone ?? null}
                            projectUrl={projectUrl}
                          />
                          <ExpenseDocuments
                            documents={documentsByExpense.get(expense.id) ?? []}
                            currentUserId={user.id}
                            canManageAny={canManageProject}
                          />
                          <ExpenseComments
                            expenseId={expense.id}
                            comments={commentsByExpense.get(expense.id) ?? []}
                          />
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                    Aucune dépense enregistrée.
                  </p>
                )}
              </div>
            ),
            fournisseurs: (
              <SuppliersPanel
                projectId={project.id}
                organizationId={project.organization_id}
                currencyCode={project.currency_code}
                minorUnits={purchaseMinorUnits}
                suppliers={suppliers}
                purchases={purchases}
                expenses={(expenses ?? []).map((e) => ({
                  id: e.id,
                  label: `${CATEGORY_LABELS.get(e.category) ?? e.category} · ${formatMoney(e.amount_minor, e.currency_code, minorUnitFor(e.currency_code))} · ${e.expense_date}`,
                }))}
                canManageSuppliers={canManageSuppliers}
                canCreatePurchase={canCreatePurchase}
              />
            ),
            etapes: (
              <div>
                <div className="flex justify-end">
                  <Modal triggerLabel="Étape" title="Nouvelle étape" variant="secondary">
                    <AddMilestoneForm projectId={project.id} nextOrderIndex={milestones?.length ?? 0} />
                  </Modal>
                </div>
                {milestones && milestones.length > 0 ? (
                  <ul className="mt-3 flex flex-col gap-2">
                    {milestones.map((milestone) => (
                      <li
                        key={milestone.id}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900"
                      >
                        <span className="text-slate-900 dark:text-slate-100">{milestone.name}</span>
                        <MilestoneStatusSelect milestone={milestone} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Aucune étape.</p>
                )}
              </div>
            ),
            photos: (
              <div>
                <div className="flex justify-end">
                  <Modal triggerLabel="Photo" title="Ajouter une photo" variant="secondary">
                    <UploadPhotoForm projectId={project.id} />
                  </Modal>
                </div>
                <div className="mt-3">
                  <PhotoGallery photos={photos} currentUserId={user.id} canManageAny={canManageProject} />
                </div>
              </div>
            ),
            membres: (
              <div>
                <div className="flex justify-end">
                  {canManageProject && (
                    <Modal
                      triggerLabel="Inviter"
                      title={isAgencyOrg ? "Inviter le propriétaire du chantier" : "Inviter un collaborateur"}
                      variant="secondary"
                    >
                      <InviteMemberForm projectId={project.id} isAgencyOrg={isAgencyOrg} />
                    </Modal>
                  )}
                </div>
                {members && members.length > 0 ? (
                  <ul className="mt-3 flex flex-col gap-2">
                    {members.map((member) => {
                      const info = memberInfoById.get(member.user_id);
                      return (
                        <li
                          key={member.id}
                          className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900"
                        >
                          <MemberProfileTrigger
                            fullName={info?.fullName ?? "Membre"}
                            phone={info?.phone ?? null}
                            avatarSignedUrl={info?.avatarSignedUrl ?? null}
                            roleLabel={PROJECT_ROLE_LABELS[member.role] ?? member.role}
                            invited={member.status === "invited"}
                          />
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="text-slate-500 dark:text-slate-400">
                              {PROJECT_ROLE_LABELS[member.role] ?? member.role}
                            </span>
                            <MemberRowActions
                              memberId={member.id}
                              memberName={info?.fullName ?? "ce membre"}
                              role={member.role}
                              canManage={canManageProject}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Aucun membre.</p>
                )}
              </div>
            ),
            rapports: (
              <div>
                <div className="flex justify-end">
                  <Modal triggerLabel="Rapport" title="Générer un rapport" variant="secondary">
                    <CreateReportForm projectId={project.id} />
                  </Modal>
                </div>
                {reports.length > 0 ? (
                  <ul className="mt-3 flex flex-col gap-2">
                    {reports.map((report) => (
                      <li
                        key={report.id}
                        className="rounded-xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900"
                      >
                        <details>
                          <summary className="cursor-pointer text-slate-900 dark:text-slate-100">
                            {report.period_start} → {report.period_end}
                          </summary>
                          <div className="mt-2 flex justify-end">
                            <ReportActions
                              projectName={project.name}
                              periodStart={report.period_start}
                              periodEnd={report.period_end}
                              summary={report.summary}
                              metrics={report.metrics}
                            />
                          </div>
                          {report.metrics && (
                            <div className="mt-4 flex flex-col gap-5 border-b border-slate-100 pb-5 dark:border-slate-800">
                              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                                <DonutChart
                                  size={96}
                                  strokeWidth={12}
                                  total={report.metrics.milestonesTotal}
                                  segments={[
                                    {
                                      value: report.metrics.milestonesCompleted,
                                      colorClassName: "text-green-500 dark:text-green-400",
                                    },
                                  ]}
                                  centerLabel={`${report.metrics.progressPercent}%`}
                                  centerSublabel="fait"
                                />
                                <div className="grid flex-1 grid-cols-2 gap-3">
                                  <BudgetStat
                                    icon={AlertIcon}
                                    tone={report.metrics.documentsMissingCount > 0 ? "amber" : "slate"}
                                    label="Documents manquants"
                                    value={String(report.metrics.documentsMissingCount)}
                                  />
                                  <BudgetStat
                                    icon={ClockIcon}
                                    tone={report.metrics.toReviewCount > 0 ? "amber" : "slate"}
                                    label="À vérifier"
                                    value={String(report.metrics.toReviewCount)}
                                  />
                                </div>
                              </div>
                              <div>
                                <MoneyBarChart
                                  title="Financier"
                                  data={[
                                    { label: "Budget", amountMinor: report.metrics.budgetMinor },
                                    { label: "Financé", amountMinor: report.metrics.fundedInPeriodMinor },
                                    { label: "Dépensé", amountMinor: report.metrics.approvedInPeriodMinor },
                                  ]}
                                  currencyCode={report.metrics.currencyCode}
                                  minorUnit={report.metrics.minorUnit}
                                />
                              </div>
                            </div>
                          )}
                          <pre className="mt-4 whitespace-pre-wrap font-sans text-slate-600 dark:text-slate-400">
                            {report.summary}
                          </pre>
                        </details>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                    Aucun rapport généré.
                  </p>
                )}
              </div>
            ),
          }}
        />
      </div>
    </div>
  );
}
