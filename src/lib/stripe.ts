import Stripe from "stripe";
import { getIntegrationForUser } from "@/lib/agency-integrations";

const API_VERSION = "2026-05-27.dahlia" as any;

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
  // Cast avoids coupling to the exact pinned apiVersion literal in the installed
  // Stripe SDK's types (which changes between minor versions).
  apiVersion: API_VERSION,
});

// A Stripe client bound to a specific secret key (BYOK — the agency's own).
export function stripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey, { apiVersion: API_VERSION });
}

// Resolve the Stripe client to use for a given client/member user: the user's
// agency's own key when configured, else the platform key as a fallback.
// Returns null if neither is available.
export async function stripeForUser(userId: string): Promise<Stripe | null> {
  const integration = await getIntegrationForUser(userId);
  if (integration?.stripeSecretKey) return stripeClient(integration.stripeSecretKey);
  if (process.env.STRIPE_SECRET_KEY) return stripe;
  return null;
}
