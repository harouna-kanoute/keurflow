import type { Plan } from "@keurflow/types";

// Seed values for the `plans` table (Phase 4 / Phase 15). Prices and limits
// live in the database at runtime — changing a price is an UPDATE, never a
// redeploy. This file only seeds initial rows and documents the intended
// shape of `features`.
export const DEFAULT_PLANS: readonly Plan[] = [
  {
    code: "individual_trial",
    label: "Essai gratuit",
    maxActiveProjects: 1,
    priceCentsMinor: 0,
    currencyCode: "EUR",
    trialDays: 7,
    features: { web: true, mobile: true, collaborators: true, reports: true },
  },
  {
    code: "individual",
    label: "Particulier",
    maxActiveProjects: 1,
    priceCentsMinor: 990,
    currencyCode: "EUR",
    trialDays: 0,
    features: { web: true, mobile: true, collaborators: true, reports: true },
  },
  {
    code: "agency_starter",
    label: "Agence — Starter",
    maxActiveProjects: 5,
    priceCentsMinor: 0, // TODO Phase 15: set real price before B2B launch
    currencyCode: "EUR",
    trialDays: 14,
    features: { web: true, mobile: true, collaborators: true, reports: true, agencyDashboard: true },
  },
  {
    code: "agency_business",
    label: "Agence — Business",
    maxActiveProjects: 20,
    priceCentsMinor: 0, // TODO Phase 15: set real price before B2B launch
    currencyCode: "EUR",
    trialDays: 14,
    features: { web: true, mobile: true, collaborators: true, reports: true, agencyDashboard: true },
  },
  {
    code: "agency_enterprise",
    label: "Agence — Enterprise",
    maxActiveProjects: null, // negotiated per customer
    priceCentsMinor: 0,
    currencyCode: "EUR",
    trialDays: 14,
    features: {
      web: true,
      mobile: true,
      collaborators: true,
      reports: true,
      agencyDashboard: true,
      customLimits: true,
    },
  },
] as const;
