import Stripe from "stripe";
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
  // Cast avoids coupling to the exact pinned apiVersion literal in the installed
  // Stripe SDK's types (which changes between minor versions).
  apiVersion: "2026-05-27.dahlia" as any,
});
