import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

// Plain-English explanation of a report/dashboard's data. Available to any
// signed-in user so clients can understand their own metrics.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reportType, data } = await req.json();
  if (!reportType || data === undefined) {
    return NextResponse.json({ error: "Missing reportType or data" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ explanation: "AI explanations aren't configured yet. Set ANTHROPIC_API_KEY to enable them." });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const system =
    "You are a friendly marketing analytics expert explaining results to a small-business client who isn't technical. " +
    "Given the metrics, write a short, plain-English summary (no jargon, no preamble, no headers): " +
    "1) what these numbers mean in one or two sentences, 2) what's notable — call out anything trending up or down, " +
    "3) 2-3 concrete, specific recommendations for what to do next. Keep it under 180 words. Be encouraging but honest.";

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 700,
    system,
    messages: [{ role: "user", content: `Report type: ${reportType}\n\nData (JSON):\n${JSON.stringify(data).slice(0, 6000)}` }],
  });

  const explanation = message.content[0]?.type === "text" ? message.content[0].text : "";
  return NextResponse.json({ explanation });
}
