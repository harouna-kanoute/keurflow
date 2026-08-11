import "server-only";
import Stripe from "stripe";

// SERVER ONLY (§62) — never import from a Client Component. Lazy: throws
// only when actually invoked, so the rest of the app keeps working in dev
// before Stripe keys are configured (same pattern as ./supabase/admin.ts).
export function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("getStripe requires STRIPE_SECRET_KEY");
  }
  return new Stripe(secretKey);
}
