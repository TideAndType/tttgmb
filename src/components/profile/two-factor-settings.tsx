"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldCheck, ShieldOff } from "lucide-react";

export function TwoFactorSettings() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [step, setStep] = useState<"idle" | "enrolling" | "disabling">("idle");
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/profile/2fa").then((r) => r.json()).then((d) => setEnabled(!!d.enabled)).catch(() => setEnabled(false));
  }, []);

  const begin = async () => {
    setLoading(true);
    setStatus(null);
    const res = await fetch("/api/profile/2fa", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "begin" }),
    });
    setLoading(false);
    if (res.ok) { const d = await res.json(); setQr(d.qr); setSecret(d.secret); setStep("enrolling"); }
  };

  const confirm = async () => {
    setLoading(true);
    setStatus(null);
    const res = await fetch("/api/profile/2fa", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }),
    });
    setLoading(false);
    if (res.ok) {
      setEnabled(true); setStep("idle"); setCode(""); setQr(""); setSecret("");
      setStatus({ type: "success", message: "Two-factor authentication is now enabled." });
    } else {
      const d = await res.json();
      setStatus({ type: "error", message: d.error || "Invalid code." });
    }
  };

  const disable = async () => {
    setLoading(true);
    setStatus(null);
    const res = await fetch("/api/profile/2fa", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      setEnabled(false); setStep("idle"); setPassword("");
      setStatus({ type: "success", message: "Two-factor authentication disabled." });
    } else {
      const d = await res.json();
      setStatus({ type: "error", message: d.error || "Could not disable 2FA." });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          {enabled ? <ShieldCheck className="h-4 w-4 text-green-600" /> : <ShieldOff className="h-4 w-4 text-muted-foreground" />}
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          {enabled ? "Your account is protected with an authenticator app." : "Add a second step to your login using an authenticator app."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status && <Alert variant={status.type === "error" ? "destructive" : "default"}>{status.message}</Alert>}

        {enabled === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : enabled ? (
          step === "disabling" ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="disable-pw">Confirm your password to disable</Label>
                <Input id="disable-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
              </div>
              <div className="flex gap-2">
                <Button variant="destructive" onClick={disable} disabled={loading || !password}>Disable 2FA</Button>
                <Button variant="outline" onClick={() => { setStep("idle"); setPassword(""); }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setStep("disabling")}>Disable 2FA</Button>
          )
        ) : step === "enrolling" ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">1. Scan this QR code with Google Authenticator, Authy, or 1Password.</p>
            {qr && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="2FA QR code" className="h-44 w-44 border border-border rounded-md bg-white p-2" />
            )}
            <p className="text-xs text-muted-foreground">Or enter this key manually: <code className="font-mono text-foreground">{secret}</code></p>
            <div className="space-y-2">
              <Label htmlFor="enroll-code">2. Enter the 6-digit code to confirm</Label>
              <Input id="enroll-code" inputMode="numeric" placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} disabled={loading} />
            </div>
            <div className="flex gap-2">
              <Button onClick={confirm} disabled={loading || code.length < 6}>Verify & Enable</Button>
              <Button variant="outline" onClick={() => { setStep("idle"); setQr(""); setCode(""); }}>Cancel</Button>
            </div>
          </div>
        ) : (
          <Button onClick={begin} disabled={loading}>{loading ? "Preparing…" : "Enable 2FA"}</Button>
        )}
      </CardContent>
    </Card>
  );
}
