import { NextRequest, NextResponse } from "next/server";
import { runDueWorkflows } from "@/lib/workflow-engine";

export const dynamic = "force-dynamic";

// Advances delayed workflow steps whose wait has elapsed. Schedule this every
// few minutes in vercel.json.
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const processed = await runDueWorkflows();
  return NextResponse.json({ processed });
}
