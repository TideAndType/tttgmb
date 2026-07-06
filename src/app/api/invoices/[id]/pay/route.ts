import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripeForUser } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { id: string; role: string; email?: string | null };
  const { id } = params;

  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Verify ownership — admin can access any, client must own it
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && invoice.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (invoice.status === "Paid") {
    return NextResponse.json({ error: "Already paid" }, { status: 400 });
  }
  if (!invoice.totalAmount || invoice.totalAmount <= 0) {
    return NextResponse.json({ error: "This invoice has no amount to charge." }, { status: 400 });
  }

  // Use the invoice owner's agency Stripe key (BYOK); falls back to platform key.
  const client = await stripeForUser(invoice.userId);
  if (!client) {
    return NextResponse.json({ error: "Online payments aren't enabled yet. Ask your provider to connect Stripe." }, { status: 400 });
  }

  const base = process.env.NEXTAUTH_URL || "";
  const checkoutSession = await client.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: invoice.currency.toLowerCase(),
          unit_amount: Math.round((invoice.totalAmount ?? 0) * 100),
          product_data: {
            name: invoice.number ? `Invoice #${invoice.number}` : `Invoice`,
            description: `Payment for services`,
          },
        },
        quantity: 1,
      },
    ],
    // Return with the session id so we can verify + mark paid without relying on
    // a per-agency webhook secret.
    success_url: `${base}/invoices?inv=${invoice.id}&session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/invoices`,
    metadata: { invoiceId: invoice.id },
    customer_email: user.email ?? undefined,
  });

  await prisma.invoice.update({
    where: { id },
    data: { stripeSessionId: checkoutSession.id },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
