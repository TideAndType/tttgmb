import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

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

  const checkoutSession = await stripe.checkout.sessions.create({
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
    success_url: `${process.env.NEXTAUTH_URL}/invoices?paid=1`,
    cancel_url: `${process.env.NEXTAUTH_URL}/invoices`,
    metadata: { invoiceId: invoice.id },
    customer_email: user.email ?? undefined,
  });

  await prisma.invoice.update({
    where: { id },
    data: { stripeSessionId: checkoutSession.id },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
