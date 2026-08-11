import { describe, expect, it } from "vitest";
import { getTrialDaysRemaining, isBillablePlan, isSubscriptionBlocked, isTrialExpired } from "./subscription";

const now = new Date("2026-08-11T00:00:00Z");

describe("isBillablePlan", () => {
  it("is true for the individual plan family (trial and paid)", () => {
    expect(isBillablePlan("individual_trial")).toBe(true);
    expect(isBillablePlan("individual")).toBe(true);
  });

  it("is false for agency plans — B2B pricing isn't decided yet", () => {
    expect(isBillablePlan("agency_starter")).toBe(false);
    expect(isBillablePlan("agency_business")).toBe(false);
    expect(isBillablePlan("agency_enterprise")).toBe(false);
  });
});

describe("getTrialDaysRemaining", () => {
  it("is 0 when there is no trial", () => {
    expect(getTrialDaysRemaining(null, now)).toBe(0);
  });

  it("counts the days left, rounded up", () => {
    expect(getTrialDaysRemaining("2026-08-14T12:00:00Z", now)).toBe(4);
  });

  it("clamps to 0 once the trial has passed — never negative", () => {
    expect(getTrialDaysRemaining("2026-08-01T00:00:00Z", now)).toBe(0);
  });
});

describe("isTrialExpired", () => {
  it("is false with no trial date", () => {
    expect(isTrialExpired(null, now)).toBe(false);
  });

  it("is false while still within the trial window", () => {
    expect(isTrialExpired("2026-08-12T00:00:00Z", now)).toBe(false);
  });

  it("is true once the trial end date has passed", () => {
    expect(isTrialExpired("2026-08-01T00:00:00Z", now)).toBe(true);
  });
});

describe("isSubscriptionBlocked", () => {
  it("never blocks a non-billable (agency) plan, whatever the status", () => {
    expect(
      isSubscriptionBlocked(
        { status: "canceled", trialEndsAt: "2026-08-01T00:00:00Z" },
        "agency_starter",
        now,
      ),
    ).toBe(false);
  });

  it("blocks individual_trial once the trial has lapsed — this is the whole point of the trial", () => {
    expect(
      isSubscriptionBlocked(
        { status: "trialing", trialEndsAt: "2026-08-01T00:00:00Z" },
        "individual_trial",
        now,
      ),
    ).toBe(true);
  });

  it("does not block individual_trial while still within the trial window", () => {
    expect(
      isSubscriptionBlocked(
        { status: "trialing", trialEndsAt: "2026-08-20T00:00:00Z" },
        "individual_trial",
        now,
      ),
    ).toBe(false);
  });

  it("does not block an active individual subscription", () => {
    expect(isSubscriptionBlocked({ status: "active", trialEndsAt: null }, "individual", now)).toBe(
      false,
    );
  });

  it("blocks past_due, canceled and incomplete individual subscriptions", () => {
    for (const status of ["past_due", "canceled", "incomplete"] as const) {
      expect(isSubscriptionBlocked({ status, trialEndsAt: null }, "individual", now)).toBe(true);
    }
  });
});
