"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plug, CreditCard, MessageSquare, Mail, Check, ShieldCheck } from "lucide-react";

interface Status {
  stripe: { configured: boolean; publishableKey: string | null; secretHint: string | null };
  twilio: { configured: boolean; fromNumber: string | null; sidHint: string | null };
  email: { provider: string; configured: boolean; fromEmail: string | null; fromName: string | null; sendgridHint: string | null; smtpHost: string | null };
}

export default function IntegrationsPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [saving, setSaving] = useState<string>("");
  const [saved, setSaved] = useState<string>("");

  // Only send fields the admin actually types (blank = leave unchanged).
  const [stripe, setStripe] = useState({ stripeSecretKey: "", stripePublishableKey: "" });
  const [twilio, setTwilio] = useState({ twilioAccountSid: "", twilioAuthToken: "", twilioFromNumber: "" });
  const [email, setEmail] = useState({ emailProvider: "none", sendgridApiKey: "", smtpHost: "", smtpUser: "", smtpPass: "", fromEmail: "", fromName: "" });

  const load = async () => {
    const d = await fetch("/api/agency/integrations").then((r) => r.json());
    setStatus(d.integrations);
    if (d.integrations) {
      setEmail((e) => ({ ...e, emailProvider: d.integrations.email.provider, fromEmail: d.integrations.email.fromEmail || "", fromName: d.integrations.email.fromName || "" }));
      setStripe((s) => ({ ...s, stripePublishableKey: d.integrations.stripe.publishableKey || "" }));
      setTwilio((t) => ({ ...t, twilioFromNumber: d.integrations.twilio.fromNumber || "" }));
    }
  };
  useEffect(() => { load(); }, []);

  const save = async (section: string, payload: Record<string, unknown>) => {
    setSaving(section); setSaved("");
    // Drop blank secret fields so we don't overwrite stored keys with empties.
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(payload)) if (v !== "" || k === "emailProvider" || k.startsWith("from")) clean[k] = v;
    await fetch("/api/agency/integrations", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(clean) });
    setSaving(""); setSaved(section); setTimeout(() => setSaved(""), 2500);
    load();
  };

  const Badge = ({ on }: { on: boolean }) => on
    ? <span className="text-xs inline-flex items-center gap-1 text-green-600"><ShieldCheck className="h-3.5 w-3.5" /> Connected</span>
    : <span className="text-xs text-muted-foreground">Not connected</span>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Plug className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Integrations</h1>
          <p className="text-sm text-muted-foreground">Connect your own Stripe, Twilio, and email keys. They power your agency&apos;s payments, texting, and campaigns — and are never shared with other agencies.</p>
        </div>
      </div>

      <div className="rounded-md bg-primary/5 border border-primary/20 text-sm text-muted-foreground px-3 py-2">
        🔒 Secret keys are write-only — once saved they&apos;re never shown again, only a masked hint.
      </div>

      {/* Stripe */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" /> Stripe — Payments</CardTitle>
            <Badge on={!!status?.stripe.configured} />
          </div>
          <CardDescription>Collect payments on invoices and bookings.{status?.stripe.secretHint && ` Secret on file: ${status.stripe.secretHint}`}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="space-y-1"><Label>Publishable key</Label><Input value={stripe.stripePublishableKey} onChange={(e) => setStripe((s) => ({ ...s, stripePublishableKey: e.target.value }))} placeholder="pk_live_…" /></div>
          <div className="space-y-1"><Label>Secret key</Label><Input type="password" value={stripe.stripeSecretKey} onChange={(e) => setStripe((s) => ({ ...s, stripeSecretKey: e.target.value }))} placeholder={status?.stripe.configured ? "•••• (leave blank to keep)" : "sk_live_…"} /></div>
          <Button size="sm" onClick={() => save("stripe", stripe)} disabled={saving === "stripe"}>{saved === "stripe" ? <Check className="h-4 w-4 mr-1.5" /> : null}{saving === "stripe" ? "Saving…" : "Save Stripe"}</Button>
        </CardContent>
      </Card>

      {/* Twilio */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> Twilio — SMS</CardTitle>
            <Badge on={!!status?.twilio.configured} />
          </div>
          <CardDescription>Send and receive text messages.{status?.twilio.sidHint && ` SID on file: ${status.twilio.sidHint}`}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="space-y-1"><Label>Account SID</Label><Input value={twilio.twilioAccountSid} onChange={(e) => setTwilio((t) => ({ ...t, twilioAccountSid: e.target.value }))} placeholder={status?.twilio.configured ? "•••• (leave blank to keep)" : "AC…"} /></div>
          <div className="space-y-1"><Label>Auth token</Label><Input type="password" value={twilio.twilioAuthToken} onChange={(e) => setTwilio((t) => ({ ...t, twilioAuthToken: e.target.value }))} placeholder={status?.twilio.configured ? "•••• (leave blank to keep)" : "Auth token"} /></div>
          <div className="space-y-1"><Label>From number</Label><Input value={twilio.twilioFromNumber} onChange={(e) => setTwilio((t) => ({ ...t, twilioFromNumber: e.target.value }))} placeholder="+15551234567" /></div>
          <Button size="sm" onClick={() => save("twilio", twilio)} disabled={saving === "twilio"}>{saved === "twilio" ? <Check className="h-4 w-4 mr-1.5" /> : null}{saving === "twilio" ? "Saving…" : "Save Twilio"}</Button>
        </CardContent>
      </Card>

      {/* Email */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> Email</CardTitle>
            <Badge on={!!status?.email.configured} />
          </div>
          <CardDescription>Send campaigns and transactional email from your own domain.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="space-y-1"><Label>Provider</Label>
            <select value={email.emailProvider} onChange={(e) => setEmail((x) => ({ ...x, emailProvider: e.target.value }))} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background h-10">
              <option value="none">None</option>
              <option value="sendgrid">SendGrid</option>
              <option value="smtp">SMTP</option>
            </select>
          </div>
          {email.emailProvider === "sendgrid" && (
            <div className="space-y-1"><Label>SendGrid API key</Label><Input type="password" value={email.sendgridApiKey} onChange={(e) => setEmail((x) => ({ ...x, sendgridApiKey: e.target.value }))} placeholder={status?.email.sendgridHint ? "•••• (leave blank to keep)" : "SG.…"} /></div>
          )}
          {email.emailProvider === "smtp" && (
            <div className="grid sm:grid-cols-2 gap-2">
              <div className="space-y-1"><Label>SMTP host</Label><Input value={email.smtpHost} onChange={(e) => setEmail((x) => ({ ...x, smtpHost: e.target.value }))} placeholder="smtp.mailgun.org" /></div>
              <div className="space-y-1"><Label>SMTP user</Label><Input value={email.smtpUser} onChange={(e) => setEmail((x) => ({ ...x, smtpUser: e.target.value }))} /></div>
              <div className="space-y-1"><Label>SMTP password</Label><Input type="password" value={email.smtpPass} onChange={(e) => setEmail((x) => ({ ...x, smtpPass: e.target.value }))} placeholder="•••• (leave blank to keep)" /></div>
            </div>
          )}
          {email.emailProvider !== "none" && (
            <div className="grid sm:grid-cols-2 gap-2">
              <div className="space-y-1"><Label>From email</Label><Input value={email.fromEmail} onChange={(e) => setEmail((x) => ({ ...x, fromEmail: e.target.value }))} placeholder="hello@youragency.com" /></div>
              <div className="space-y-1"><Label>From name</Label><Input value={email.fromName} onChange={(e) => setEmail((x) => ({ ...x, fromName: e.target.value }))} placeholder="Your Agency" /></div>
            </div>
          )}
          <Button size="sm" onClick={() => save("email", email)} disabled={saving === "email"}>{saved === "email" ? <Check className="h-4 w-4 mr-1.5" /> : null}{saving === "email" ? "Saving…" : "Save email"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
