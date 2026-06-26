import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

type Action = "proposal_section" | "task_description" | "client_update" | "rewrite" | "section_content";
type Tone = "professional" | "friendly" | "concise";

const SYSTEM_PROMPTS: Record<Action, string> = {
  proposal_section: "You are a professional copywriter for a marketing agency. Write compelling proposal content. Return only the written content with no preamble, headers, or meta-commentary.",
  task_description: "You are a project manager. Write clear, actionable task descriptions. Return only the description text.",
  client_update: "You are writing a professional client update for a marketing agency. Be warm and results-focused. Return only the update text.",
  rewrite: "Rewrite the following text to be more professional and compelling while preserving the meaning. Return only the rewritten text.",
  section_content: "You are a professional copywriter for a marketing agency. Write compelling content for a proposal section. Return only the written content with no preamble or meta-commentary.",
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

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({
      result: `[Claude is not configured]\n\nSet ANTHROPIC_API_KEY in your environment variables to enable AI generation.\n\nContext received: ${context}`,
    });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const systemPrompt = SYSTEM_PROMPTS[action] ?? SYSTEM_PROMPTS.proposal_section;
  const toneInstruction = TONE_INSTRUCTIONS[tone];

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: `${systemPrompt} ${toneInstruction}`,
    messages: [{ role: "user", content: context }],
  });

  const result = message.content[0]?.type === "text" ? message.content[0].text : "";
  return NextResponse.json({ result });
}
