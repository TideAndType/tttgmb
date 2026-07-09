import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripeForUser } from "@/lib/stripe";

export const dynamic = "force-dynamic";

// Verify a returned Checkout session and mark the invoice paid. Avoids needing
// a per-agency webhook secret — the return URL carries the session id.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { id: string; role: string };

  const invoice = await prisma.invoice.findUnique({ where: { id: params.id } });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && invoice.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (invoice.status === "Paid") return NextResponse.json({ paid: true });

  const sessionId = req.nextUrl.searchParams.get("session");
  if (!sessionId) return NextResponse.json({ error: "Missing session" }, { status: 400 });

  const client = await stripeForUser(invoice.userId);
  if (!client) return NextResponse.json({ error: "Payments not configured" }, { status: 400 });

  try {
    const cs = await client.checkout.sessions.retrieve(sessionId);
    if (cs.payment_status === "paid") {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: "Paid", stripePaymentId: (cs.payment_intent as string) || null, stripeSessionId: sessionId },
      });
      return NextResponse.json({ paid: true });
    }
    return NextResponse.json({ paid: false, status: cs.payment_status });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Verification failed" }, { status: 502 });
  }
}
