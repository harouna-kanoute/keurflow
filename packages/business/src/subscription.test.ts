import { describe, expect, it } from "vitest";
import { getTrialDaysRemaining, isSubscriptionBlocked, isTrialExpired } from "./subscription";

const now = new Date("2026-08-11T00:00:00Z");

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
  const paidPlan = { priceCentsMinor: 990 };
  const freePlan = { priceCentsMinor: 0 };

  it("never blocks a free plan, whatever the status", () => {
    expect(
      isSubscriptionBlocked({ status: "canceled", trialEndsAt: "2026-08-01T00:00:00Z" }, freePlan, now),
    ).toBe(false);
  });

  it("blocks a paid plan once the trial has lapsed", () => {
    expect(
      isSubscriptionBlocked({ status: "trialing", trialEndsAt: "2026-08-01T00:00:00Z" }, paidPlan, now),
    ).toBe(true);
  });

  it("does not block a paid plan while still trialing", () => {
    expect(
      isSubscriptionBlocked({ status: "trialing", trialEndsAt: "2026-08-20T00:00:00Z" }, paidPlan, now),
    ).toBe(false);
  });

  it("does not block an active paid subscription", () => {
    expect(isSubscriptionBlocked({ status: "active", trialEndsAt: null }, paidPlan, now)).toBe(false);
  });

  it("blocks past_due, canceled and incomplete paid subscriptions", () => {
    for (const status of ["past_due", "canceled", "incomplete"] as const) {
      expect(isSubscriptionBlocked({ status, trialEndsAt: null }, paidPlan, now)).toBe(true);
    }
  });
});
