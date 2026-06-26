import nodemailer from "nodemailer";

const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

const FROM = process.env.SMTP_FROM || "Client Portal <noreply@example.com>";
const PORTAL_NAME = "Client Portal";

function buildHtml(heading: string, body: string, ctaLabel: string, ctaUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr>
          <td style="background:#1e293b;padding:24px 32px;">
            <span style="color:#ffffff;font-size:18px;font-weight:bold;">${PORTAL_NAME}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 16px;color:#0f172a;font-size:20px;">${heading}</h2>
            <div style="color:#475569;font-size:15px;line-height:1.6;">${body}</div>
            <div style="margin-top:28px;">
              <a href="${ctaUrl}" style="display:inline-block;background:#2dd4bf;color:#0f172a;font-weight:bold;font-size:14px;padding:12px 24px;border-radius:6px;text-decoration:none;">${ctaLabel}</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">You're receiving this because you have an account on ${PORTAL_NAME}.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendMail(to: string, subject: string, html: string): Promise<void> {
  if (!transporter) {
    console.log(`[Email - no SMTP configured] To: ${to} | Subject: ${subject}`);
    return;
  }
  await transporter.sendMail({ from: FROM, to, subject, html });
}

export async function sendProposalSentEmail(
  to: string,
  clientName: string,
  proposalTitle: string,
  portalUrl: string
): Promise<void> {
  try {
    const html = buildHtml(
      `You have a new proposal: ${proposalTitle}`,
      `<p>Hi ${clientName},</p><p>A new proposal titled <strong>${proposalTitle}</strong> has been sent to you. Please review it at your earliest convenience.</p>`,
      "View Proposal",
      portalUrl
    );
    await sendMail(to, `New Proposal: ${proposalTitle}`, html);
  } catch (err) {
    console.error("[Email] sendProposalSentEmail failed:", err);
  }
}

export async function sendTaskCreatedEmail(
  to: string,
  clientName: string,
  taskTitle: string,
  taskDescription: string | null,
  dueDate: Date | null,
  portalUrl: string
): Promise<void> {
  try {
    const dueLine = dueDate
      ? `<p><strong>Due:</strong> ${dueDate.toLocaleDateString("en-US", { dateStyle: "medium" })}</p>`
      : "";
    const descLine = taskDescription ? `<p>${taskDescription}</p>` : "";
    const html = buildHtml(
      `New task assigned: ${taskTitle}`,
      `<p>Hi ${clientName},</p><p>A new task has been assigned to you: <strong>${taskTitle}</strong></p>${descLine}${dueLine}`,
      "View Task",
      portalUrl
    );
    await sendMail(to, `New Task: ${taskTitle}`, html);
  } catch (err) {
    console.error("[Email] sendTaskCreatedEmail failed:", err);
  }
}

export async function sendApprovalNeededEmail(
  to: string,
  clientName: string,
  deliverableTitle: string,
  deliverableType: string,
  portalUrl: string
): Promise<void> {
  try {
    const html = buildHtml(
      `Approval needed: ${deliverableTitle}`,
      `<p>Hi ${clientName},</p><p>A new <strong>${deliverableType}</strong> deliverable is waiting for your review: <strong>${deliverableTitle}</strong>.</p><p>Please review and approve or request changes.</p>`,
      "Review Now",
      portalUrl
    );
    await sendMail(to, `Approval Needed: ${deliverableTitle}`, html);
  } catch (err) {
    console.error("[Email] sendApprovalNeededEmail failed:", err);
  }
}

export async function sendInvoiceEmail(
  to: string,
  clientName: string,
  invoiceNumber: string | null,
  amount: number | null,
  currency: string,
  dueDate: Date | null,
  invoilessUrl: string | null,
  portalUrl: string
): Promise<void> {
  try {
    const numLine = invoiceNumber ? `<p><strong>Invoice #:</strong> ${invoiceNumber}</p>` : "";
    const amtLine =
      amount !== null
        ? `<p><strong>Amount:</strong> ${new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount)}</p>`
        : "";
    const dueLine = dueDate
      ? `<p><strong>Due:</strong> ${dueDate.toLocaleDateString("en-US", { dateStyle: "medium" })}</p>`
      : "";
    const ctaUrl = invoilessUrl || portalUrl;
    const html = buildHtml(
      "You have a new invoice",
      `<p>Hi ${clientName},</p><p>A new invoice has been issued for you.</p>${numLine}${amtLine}${dueLine}`,
      "View Invoice",
      ctaUrl
    );
    await sendMail(to, invoiceNumber ? `Invoice #${invoiceNumber}` : "New Invoice", html);
  } catch (err) {
    console.error("[Email] sendInvoiceEmail failed:", err);
  }
}

export async function sendTaskCompletedEmail(
  to: string,
  clientName: string,
  taskTitle: string,
  portalUrl: string
): Promise<void> {
  try {
    const html = buildHtml(
      `Task completed: ${taskTitle}`,
      `<p>Hi ${clientName},</p><p>Great news — the task <strong>${taskTitle}</strong> has been marked as completed.</p>`,
      "View Task",
      portalUrl
    );
    await sendMail(to, `Task Completed: ${taskTitle}`, html);
  } catch (err) {
    console.error("[Email] sendTaskCompletedEmail failed:", err);
  }
}

export async function sendWeeklyDigestEmail(
  to: string,
  clientName: string,
  lines: string[],
  portalUrl: string
): Promise<void> {
  try {
    const list = lines.map((l) => `<li style="margin-bottom:6px;">${l}</li>`).join("");
    const html = buildHtml(
      "Your weekly summary",
      `<p>Hi ${clientName},</p><p>Here's what happened on your account over the past week:</p><ul style="padding-left:20px;margin:16px 0;">${list}</ul>`,
      "Open Portal",
      portalUrl
    );
    await sendMail(to, "Your weekly summary", html);
  } catch (err) {
    console.error("[Email] sendWeeklyDigestEmail failed:", err);
  }
}

export async function sendProposalRespondedEmail(
  to: string,
  adminName: string,
  clientName: string,
  proposalTitle: string,
  action: "accepted" | "declined",
  portalUrl: string
): Promise<void> {
  try {
    const html = buildHtml(
      `Proposal ${action}: ${proposalTitle}`,
      `<p>Hi ${adminName},</p><p><strong>${clientName}</strong> has <strong>${action}</strong> the proposal: <em>${proposalTitle}</em>.</p>`,
      "View Proposal",
      portalUrl
    );
    await sendMail(to, `Proposal ${action} by ${clientName}`, html);
  } catch (err) {
    console.error("[Email] sendProposalRespondedEmail failed:", err);
  }
}

export async function sendApprovalRespondedEmail(
  to: string,
  adminName: string,
  clientName: string,
  deliverableTitle: string,
  action: "approved" | "changes_requested",
  portalUrl: string
): Promise<void> {
  try {
    const label = action === "approved" ? "approved" : "requested changes on";
    const html = buildHtml(
      `Deliverable ${action === "approved" ? "approved" : "changes requested"}: ${deliverableTitle}`,
      `<p>Hi ${adminName},</p><p><strong>${clientName}</strong> has <strong>${label}</strong> the deliverable: <em>${deliverableTitle}</em>.</p>`,
      "View Deliverable",
      portalUrl
    );
    await sendMail(to, `Deliverable ${action === "approved" ? "Approved" : "Changes Requested"}: ${deliverableTitle}`, html);
  } catch (err) {
    console.error("[Email] sendApprovalRespondedEmail failed:", err);
  }
}

export async function sendTaskDueReminderEmail(
  to: string,
  clientName: string,
  taskTitle: string,
  dueDate: Date,
  portalUrl: string
): Promise<void> {
  try {
    const dueLine = dueDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    const html = buildHtml(
      `Reminder: "${taskTitle}" is due soon`,
      `<p>Hi ${clientName},</p><p>This is a reminder that the task <strong>${taskTitle}</strong> is due on <strong>${dueLine}</strong>.</p><p>Log in to your portal to view or update the task.</p>`,
      "View Task",
      portalUrl
    );
    await sendMail(to, `Reminder: Task due soon — ${taskTitle}`, html);
  } catch (err) {
    console.error("[Email] sendTaskDueReminderEmail failed:", err);
  }
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetUrl: string
): Promise<void> {
  try {
    const html = buildHtml(
      "Reset your password",
      `Hi ${name},<br><br>We received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.<br><br>If you didn't request this, you can safely ignore this email.`,
      "Reset Password",
      resetUrl
    );
    await sendMail(to, "Reset your password", html);
  } catch (err) {
    console.error("Password reset email failed:", err);
  }
}
