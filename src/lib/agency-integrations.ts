import { prisma } from "@/lib/prisma";

// Server-side accessor for an agency's provider credentials (raw). Used by the
// agency's email/SMS/payment features — never expose the result to the client.
export async function getAgencyIntegration(agencyId: string | null | undefined) {
  if (!agencyId) return null;
  return prisma.agencyIntegration.findUnique({ where: { agencyId } });
}

// Resolve the agency integration for a given client/member user id (walks up to
// the user's agency). Returns null if the user has no agency or no integration.
export async function getIntegrationForUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { agencyId: true } });
  if (!user?.agencyId) return null;
  return getAgencyIntegration(user.agencyId);
}

// A safe, secret-free view of what's configured (for the management UI).
export function maskIntegration(i: Awaited<ReturnType<typeof getAgencyIntegration>>) {
  const last4 = (s: string | null | undefined) => (s ? "••••" + s.slice(-4) : null);
  return {
    stripe: { configured: !!i?.stripeSecretKey, publishableKey: i?.stripePublishableKey || null, secretHint: last4(i?.stripeSecretKey) },
    twilio: { configured: !!(i?.twilioAccountSid && i?.twilioAuthToken), fromNumber: i?.twilioFromNumber || null, sidHint: last4(i?.twilioAccountSid) },
    email: {
      provider: i?.emailProvider || "none",
      configured: i?.emailProvider === "sendgrid" ? !!i?.sendgridApiKey : i?.emailProvider === "smtp" ? !!(i?.smtpHost && i?.smtpUser) : false,
      fromEmail: i?.fromEmail || null,
      fromName: i?.fromName || null,
      sendgridHint: last4(i?.sendgridApiKey),
      smtpHost: i?.smtpHost || null,
    },
  };
}
