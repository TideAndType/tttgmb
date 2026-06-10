import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event, data } = body;

    if (!event || !data) {
      return NextResponse.json({ received: true });
    }

    const invoilessId: string | undefined = data?.id;

    if (!invoilessId) {
      console.log(`[invoiless webhook] event=${event} but no data.id`);
      return NextResponse.json({ received: true });
    }

    const invoice = await prisma.invoice.findUnique({ where: { invoilessId } });

    if (!invoice) {
      console.log(`[invoiless webhook] event=${event} id=${invoilessId} — not found in DB`);
      return NextResponse.json({ received: true });
    }

    const updateData: Record<string, unknown> = { lastSyncedAt: new Date() };

    if (data.status) updateData.status = data.status;
    if (data.total !== undefined) updateData.totalAmount = data.total;
    if (data.totalAmount !== undefined) updateData.totalAmount = data.totalAmount;
    if (data.url) updateData.invoilessUrl = data.url;

    await prisma.invoice.update({ where: { invoilessId }, data: updateData });

    console.log(`[invoiless webhook] event=${event} id=${invoilessId} status=${data.status}`);
  } catch (err) {
    console.error("[invoiless webhook] error:", err);
  }

  return NextResponse.json({ received: true });
}
