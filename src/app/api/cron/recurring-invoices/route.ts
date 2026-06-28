import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateInvoice, advanceInvoiceDate } from "@/lib/generate-invoice";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const due = await prisma.recurringInvoice.findMany({
    where: { active: true, nextRunAt: { lte: now } },
  });

  let generated = 0;
  for (const schedule of due) {
    try {
      await generateInvoice({
        userId: schedule.userId,
        items: schedule.items as any,
        currency: schedule.currency,
        notes: schedule.notes,
        taxes: (schedule.taxes as any) ?? undefined,
        discount: (schedule.discount as any) ?? undefined,
        status: "Draft",
      });
      await prisma.recurringInvoice.update({
        where: { id: schedule.id },
        data: { lastRunAt: now, nextRunAt: advanceInvoiceDate(schedule.nextRunAt, schedule.interval) },
      });
      generated++;
    } catch (err) {
      console.error(`[RecurringInvoice] failed for schedule ${schedule.id}:`, err);
      // Advance anyway so a persistent failure doesn't fire every run.
      await prisma.recurringInvoice.update({
        where: { id: schedule.id },
        data: { nextRunAt: advanceInvoiceDate(schedule.nextRunAt, schedule.interval) },
      }).catch(() => {});
    }
  }

  return NextResponse.json({ due: due.length, generated });
}
