import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import OpenAI from "openai";

type Action = "proposal_section" | "task_description" | "client_update" | "rewrite";
type Tone = "professional" | "friendly" | "concise";

const SYSTEM_PROMPTS: Record<Action, string> = {
  proposal_section: "You are a professional copywriter for a marketing agency. Write compelling proposal content.",
  task_description: "You are a project manager. Write clear, actionable task descriptions.",
  client_update: "You are writing a professional client update email for a marketing agency. Be warm and results-focused.",
  rewrite: "Rewrite the following text to be more professional and compelling while preserving the meaning.",
};

const TONE_INSTRUCTIONS: Record<Tone, string> = {
  professional: "Use a professional, formal tone.",
  friendly: "Use a warm, friendly, and approachable tone.",
  concise: "Be concise and to the point. Avoid unnecessary words.",
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as any;
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { action, context, tone = "professional" } = body as {
    action: Action;
    context: string;
    tone?: Tone;
  };

  if (!action || !context) {
    return NextResponse.json({ error: "Missing action or context" }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    // Mock response when API key not set
    return NextResponse.json({
      result: `[Mock AI response for "${action}" with tone "${tone}"]\n\n${context}\n\nThis is a placeholder response. Set OPENAI_API_KEY to enable real AI generation.`,
    });
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const systemPrompt = SYSTEM_PROMPTS[action];
  const toneInstruction = TONE_INSTRUCTIONS[tone];

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: `${systemPrompt} ${toneInstruction}` },
      { role: "user", content: context },
    ],
  });

  const result = completion.choices[0]?.message?.content ?? "";
  return NextResponse.json({ result });
}
