import type {
  DocumentationStatus,
  DocumentType,
  ExpenseStatus,
  MembershipStatus,
  MilestoneStatus,
  OrganizationRole,
  OrganizationType,
  ProjectRole,
  ProjectStatus,
  SubscriptionStatus,
} from "./enums";

// Application-level domain types, hand-written for use before Phase 4 generates
// database.generated.ts from the real Postgres schema. Monetary amounts are
// always integers in the currency's minor unit (see @keurflow/business/money).

export interface Profile {
  id: string;
  fullName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  countryId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Country {
  id: string;
  code: string;
  name: string;
  currencyCode: string;
  active: boolean;
}

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  minorUnit: number;
  active: boolean;
}

export interface PaymentMethod {
  id: string;
  code: string;
  label: string;
  active: boolean;
}

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  countryId: string;
  ownerId: string;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  status: MembershipStatus;
  createdAt: string;
}

export interface Project {
  id: string;
  organizationId: string;
  ownerId: string;
  name: string;
  description: string | null;
  projectType: string;
  countryId: string;
  city: string | null;
  address: string | null;
  surfaceArea: number | null;
  budgetMinor: number;
  currencyCode: string;
  startDate: string | null;
  expectedEndDate: string | null;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  status: MembershipStatus;
  createdAt: string;
}

export interface Funding {
  id: string;
  projectId: string;
  createdBy: string;
  amountMinor: number;
  currencyCode: string;
  paymentMethodId: string;
  reference: string | null;
  description: string | null;
  fundingDate: string;
  proofUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  projectId: string;
  createdBy: string;
  amountMinor: number;
  currencyCode: string;
  category: string;
  description: string | null;
  supplierName: string | null;
  expenseDate: string;
  milestoneId: string | null;
  status: ExpenseStatus;
  documentationStatus: DocumentationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseItem {
  id: string;
  expenseId: string;
  name: string;
  quantity: number;
  unit: string;
  unitPriceMinor: number;
  totalMinor: number;
  createdAt: string;
}

export interface ExpenseComment {
  id: string;
  expenseId: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  status: MilestoneStatus;
  orderIndex: number;
  plannedDate: string | null;
  completedDate: string | null;
  budgetMinor: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Photo {
  id: string;
  projectId: string;
  milestoneId: string | null;
  expenseId: string | null;
  uploadedBy: string;
  storagePath: string;
  caption: string | null;
  takenAt: string | null;
  createdAt: string;
}

export interface ProjectDocument {
  id: string;
  projectId: string;
  uploadedBy: string;
  documentType: DocumentType;
  storagePath: string;
  filename: string;
  mimeType: string;
  size: number;
  expenseId: string | null;
  fundingId: string | null;
  createdAt: string;
}

export interface Report {
  id: string;
  projectId: string;
  createdBy: string;
  periodStart: string;
  periodEnd: string;
  summary: string;
  createdAt: string;
}

export interface Plan {
  code: string;
  label: string;
  maxActiveProjects: number | null;
  priceCentsMinor: number;
  currencyCode: string;
  trialDays: number;
  features: Record<string, boolean>;
}

export interface Subscription {
  id: string;
  organizationId: string;
  planCode: string;
  status: SubscriptionStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
}
