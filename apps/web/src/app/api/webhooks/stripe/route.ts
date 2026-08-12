import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

// Stripe is the source of truth for billing; this endpoint is the only way
// the `subscriptions` table is ever written to after the initial trial row
// (see supabase/migrations/20260811300000_subscriptions.sql — there is no
// insert/update policy for `authenticated`). No user session exists here,
// so every write goes through the service-role admin client.
function mapStripeStatus(
  status: Stripe.Subscription.Status,
): "trialing" | "active" | "past_due" | "canceled" | "incomplete" {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "incomplete":
      return "incomplete";
    default:
      // canceled, incomplete_expired, unpaid, paused — all read as "not
      // billable" from this app's point of view.
      return "canceled";
  }
}

async function syncSubscription(
  admin: ReturnType<typeof createAdminClient>,
  subscription: Stripe.Subscription,
) {
  const organizationId = subscription.metadata?.organization_id;
  if (!organizationId) {
    console.error("[stripe webhook] subscription has no organization_id metadata:", subscription.id);
    return;
  }

  const periodEnd = subscription.items.data[0]?.current_period_end;
  // Set on the subscription (or its metadata, on creation and on any later
  // plan-code-changing update — see createCheckoutSession) by us, never
  // inferred from the price: Stripe has no concept of our plan codes.
  // "individual" is the fallback for subscriptions created before this
  // field existed.
  const planCode = subscription.metadata?.plan_code || "individual";

  await admin
    .from("subscriptions")
    .update({
      plan_code: planCode,
      status: mapStripeStatus(subscription.status),
      stripe_subscription_id: subscription.id,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    })
    .eq("organization_id", organizationId);
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("[stripe webhook] signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (typeof session.subscription === "string") {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        await syncSubscription(admin, subscription);
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await syncSubscription(admin, event.data.object);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
