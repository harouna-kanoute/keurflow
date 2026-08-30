export type Project = {
  id: string;
  name: string;
  city: string | null;
  status: string;
  budget_minor: number;
  currency_code: string;
  organization_id: string;
};

export type Milestone = {
  id: string;
  name: string;
  status: "pending" | "in_progress" | "completed" | "delayed";
  order_index: number;
};

export type Expense = {
  id: string;
  amount_minor: number;
  currency_code: string;
  category: string;
  supplier_name: string | null;
  expense_date: string;
  status: "pending" | "needs_information" | "approved" | "rejected";
};

export type Funding = {
  id: string;
  amount_minor: number;
  currency_code: string;
  reference: string | null;
  funding_date: string;
  payment_method_id: string;
};

export type Photo = {
  id: string;
  storage_path: string;
  caption: string | null;
  uploaded_by: string;
  created_at: string;
  signedUrl: string | null;
};

export type Member = {
  id: string;
  user_id: string;
  role: string;
  status: string;
  fullName: string;
  phone: string | null;
  avatarSignedUrl: string | null;
};

export type Report = {
  id: string;
  period_start: string;
  period_end: string;
  summary: string;
  metrics: {
    budgetMinor: number;
    fundedInPeriodMinor: number;
    approvedInPeriodMinor: number;
    progressPercent: number;
    milestonesCompleted: number;
    milestonesTotal: number;
    documentsMissingCount: number;
    toReviewCount: number;
    currencyCode: string;
    minorUnit: number;
  } | null;
  created_at: string;
};

export type PaymentMethod = { id: string; code: string; label: string };

export type ProjectDetailState =
  | { status: "loading" }
  | { status: "not-found" }
  | {
      status: "ready";
      project: Project;
      totalFunded: number;
      coveragePercent: number;
      consumptionPercent: number;
      milestoneProgress: number;
      milestones: Milestone[];
      expenses: Expense[];
      fundings: Funding[];
      paymentMethods: PaymentMethod[];
      photos: Photo[];
      members: Member[];
      reports: Report[];
      currentUserId: string | null;
      // UI-only convenience (never the authoritative check — RLS is, same as
      // web's own canManageAny/canManageProject in page.tsx). Gates whether
      // to show the photo-delete icon for photos this user didn't upload.
      canManageAny: boolean;
      // Trial expired / subscription not active — same client-side gate as
      // web's Server Action guards, applied here since mobile has no server
      // layer of its own to enforce it at (RLS remains the only real
      // authority for mobile writes, unchanged by this feature).
      isBlocked: boolean;
    };
