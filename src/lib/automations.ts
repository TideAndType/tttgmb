import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { buildBusinessContext, askClaude, aiConfigured } from "@/lib/marketing-ai";

export type Trigger = "content_published" | "review_received" | "score_drop" | "manual";
export type ActionType = "notify" | "create_task" | "generate_social" | "draft_review_response";

export interface AutomationPayload {
  contentId?: string;
  title?: string;
  type?: string;
  reviewId?: string;
  author?: string;
  rating?: number;
  detail?: string;
}

// Metadata for the UI (labels + which actions make sense per trigger).
export const TRIGGERS: { value: Trigger; label: string; desc: string }[] = [
  { value: "content_published", label: "When content is published", desc: "A Content Studio piece is marked published" },
  { value: "review_received", label: "When a review is received", desc: "A new review is added" },
  { value: "score_drop", label: "When marketing health drops", desc: "Overall score falls vs. the previous snapshot" },
  { value: "manual", label: "Manual / on demand", desc: "Only runs when you click Run" },
];

export const ACTIONS: { value: ActionType; label: string }[] = [
  { value: "create_task", label: "Create a marketing task" },
  { value: "notify", label: "Send an in-app notification" },
  { value: "generate_social", label: "Generate social posts from it" },
  { value: "draft_review_response", label: "Draft an AI review response" },
];

// Run all enabled automations matching a trigger for a user. Best-effort: an
// individual action failure is logged but never breaks the caller.
export async function runAutomations(userId: string, trigger: Trigger, payload: AutomationPayload = {}): Promise<number> {
  const automations = await prisma.automation.findMany({ where: { userId, trigger, enabled: true } });
  let ran = 0;
  for (const a of automations) {
    try {
      await executeAction(userId, a.action as ActionType, (a.config as Record<string, unknown>) || {}, payload, a.name);
      await prisma.automation.update({ where: { id: a.id }, data: { lastRunAt: new Date(), runCount: { increment: 1 } } });
      ran++;
    } catch (err) {
      console.error(`[Automation] "${a.name}" (${a.action}) failed:`, err);
    }
  }
  return ran;
}

// Run a single automation by id (used by the "Run now" test button).
export async function runOneAutomation(userId: string, id: string, payload: AutomationPayload = {}): Promise<boolean> {
  const a = await prisma.automation.findUnique({ where: { id } });
  if (!a || a.userId !== userId) return false;
  await executeAction(userId, a.action as ActionType, (a.config as Record<string, unknown>) || {}, { detail: `Manual run of "${a.name}"`, ...payload }, a.name);
  await prisma.automation.update({ where: { id: a.id }, data: { lastRunAt: new Date(), runCount: { increment: 1 } } });
  return true;
}

async function executeAction(userId: string, action: ActionType, config: Record<string, unknown>, payload: AutomationPayload, name: string) {
  switch (action) {
    case "notify": {
      const msg = (config.message as string) || payload.detail || "An automation was triggered.";
      await createNotification(userId, "automation", name, msg, "/marketing/automations");
      return;
    }
    case "create_task": {
      const title = (config.taskTitle as string) || payload.title || name;
      await prisma.marketingTask.create({
        data: { userId, title: String(title).slice(0, 200), category: (config.category as string) || "general", priority: (config.priority as string) || "medium", source: "ai", instructions: payload.detail || null },
      });
      return;
    }
    case "generate_social": {
      if (!aiConfigured() || !payload.title) return;
      const context = await buildBusinessContext(userId);
      for (const platform of ["facebook", "instagram"]) {
        const body = await askClaude({
          system: `You are a social media manager. Write a ${platform} post promoting the following piece of content, in the business's brand voice. Return only the post text.\n\n--- Business context ---\n${context}`,
          user: `Content to promote: "${payload.title}"${payload.type ? ` (${payload.type})` : ""}`,
          maxTokens: 400,
        });
        if (body) await prisma.marketingContent.create({ data: { userId, type: platform, title: `Promote: ${payload.title}`.slice(0, 160), body, status: "draft" } });
      }
      return;
    }
    case "draft_review_response": {
      if (!aiConfigured() || !payload.reviewId) return;
      const review = await prisma.marketingReview.findUnique({ where: { id: payload.reviewId } });
      if (!review || review.userId !== userId || review.response) return;
      const context = await buildBusinessContext(userId);
      const draft = await askClaude({
        system: `You write review responses for a small business in their brand voice. Be genuine and concise (2-4 sentences); for negative reviews apologize and invite them to reach out. Return only the response.\n\n--- Business context ---\n${context}`,
        user: `Review by ${review.author} (${review.rating}/5): "${review.text || "(no text)"}"`,
        maxTokens: 400,
      });
      if (draft) await prisma.marketingReview.update({ where: { id: review.id }, data: { response: draft, respondedAt: new Date() } });
      return;
    }
  }
}
