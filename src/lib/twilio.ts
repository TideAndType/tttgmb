// Minimal Twilio REST client (no SDK dependency). Uses the agency's own
// Account SID + auth token (BYOK) so messages send from their number.

export interface TwilioCreds { accountSid: string; authToken: string; fromNumber: string; }

export function normalizePhone(p: string): string {
  return (p || "").replace(/[^\d]/g, "");
}
// Loose match: same last-10 digits (ignores country-code/formatting differences).
export function phonesMatch(a: string, b: string): boolean {
  const na = normalizePhone(a), nb = normalizePhone(b);
  if (!na || !nb) return false;
  return na.slice(-10) === nb.slice(-10);
}

export async function sendSms(creds: TwilioCreds, to: string, body: string): Promise<{ sid: string; status: string }> {
  const auth = Buffer.from(`${creds.accountSid}:${creds.authToken}`).toString("base64");
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${creds.accountSid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ To: to, From: creds.fromNumber, Body: body.slice(0, 1600) }).toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Twilio error ${res.status}`);
  return { sid: data.sid, status: data.status || "sent" };
}
