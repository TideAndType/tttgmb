import nodemailer from "nodemailer";
import { getIntegrationForUser } from "@/lib/agency-integrations";

// Build a send function bound to a client's agency email provider (BYOK —
// SendGrid or SMTP). Returns null if email isn't configured.
export interface AgencySender {
  from: string;
  send: (to: string, subject: string, html: string) => Promise<void>;
}

export async function getAgencySender(userId: string): Promise<AgencySender | null> {
  const i = await getIntegrationForUser(userId);
  if (!i || i.emailProvider === "none") return null;
  const fromEmail = i.fromEmail;
  if (!fromEmail) return null;
  const fromName = i.fromName || "";
  const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

  if (i.emailProvider === "sendgrid") {
    if (!i.sendgridApiKey) return null;
    const key = i.sendgridApiKey;
    return {
      from,
      send: async (to, subject, html) => {
        const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: to }] }],
            from: { email: fromEmail, name: fromName || undefined },
            subject,
            content: [{ type: "text/html", value: html }],
          }),
        });
        if (!res.ok && res.status !== 202) {
          const t = await res.text().catch(() => "");
          throw new Error(`SendGrid ${res.status}: ${t.slice(0, 120)}`);
        }
      },
    };
  }

  if (i.emailProvider === "smtp") {
    if (!i.smtpHost || !i.smtpUser) return null;
    const transporter = nodemailer.createTransport({
      host: i.smtpHost,
      port: i.smtpPort || 587,
      auth: { user: i.smtpUser, pass: i.smtpPass || "" },
    });
    return { from, send: async (to, subject, html) => { await transporter.sendMail({ from, to, subject, html }); } };
  }

  return null;
}
