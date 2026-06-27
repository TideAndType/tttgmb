import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// The set of events admins can subscribe webhooks to.
export const WEBHOOK_EVENTS = [
  "proposal.accepted",
  "proposal.declined",
  "proposal.viewed",
  "task.completed",
  "invoice.paid",
  "approval.responded",
  "csat.received",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

/**
 * Fire all active webhooks subscribed to `event` with the given payload.
 * Fire-and-forget: failures are logged and recorded but never throw, so a
 * webhook outage can't break the action that triggered it.
 */
export async function dispatchWebhook(event: WebhookEvent, data: Record<string, unknown>): Promise<void> {
  let hooks;
  try {
    hooks = await prisma.webhook.findMany({ where: { active: true, events: { has: event } } });
  } catch (err) {
    console.error("[Webhook] lookup failed:", err);
    return;
  }
  if (hooks.length === 0) return;

  const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() });

  await Promise.all(
    hooks.map(async (hook) => {
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (hook.secret) {
          headers["X-Webhook-Signature"] =
            "sha256=" + crypto.createHmac("sha256", hook.secret).update(payload).digest("hex");
        }
        const res = await fetch(hook.url, {
          method: "POST",
          headers,
          body: payload,
          signal: AbortSignal.timeout(10000),
        });
        await prisma.webhook.update({
          where: { id: hook.id },
          data: { lastFiredAt: new Date(), lastStatus: res.status },
        });
      } catch (err) {
        console.error(`[Webhook] delivery to ${hook.url} failed:`, err);
        await prisma.webhook.update({
          where: { id: hook.id },
          data: { lastFiredAt: new Date(), lastStatus: 0 },
        }).catch(() => {});
      }
    })
  );
}
