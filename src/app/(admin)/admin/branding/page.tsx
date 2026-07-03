"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Palette, Upload, Save, Check, Globe, Copy, ExternalLink } from "lucide-react";

interface Agency {
  id: string; name: string; slug: string; customDomain: string | null;
  appName: string; logoData: string | null; primaryColor: string; accentColor: string;
  loginHeadline: string | null; loginSubtext: string | null;
}

// Downscale an image file to a data URL (keeps payloads small, Vercel-safe).
function fileToDataUrl(file: File, max = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => { img.src = String(reader.result); };
    reader.onerror = reject;
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AgencyBrandingPage() {
  const [a, setA] = useState<Agency | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [rootDomain, setRootDomain] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/agency").then((r) => r.json()).then((d) => { setA(d.agency); });
    if (typeof window !== "undefined") setRootDomain(window.location.host.replace(/^[^.]+\./, ""));
  }, []);

  const set = (patch: Partial<Agency>) => setA((prev) => prev ? { ...prev, ...patch } : prev);

  const onLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { set({ logoData: await fileToDataUrl(file) }); } catch { setError("Couldn't read that image."); }
    if (fileRef.current) fileRef.current.value = "";
  };

  const save = async () => {
    if (!a) return;
    setSaving(true); setError(""); setSaved(false);
    const r = await fetch("/api/agency", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: a.name, slug: a.slug, customDomain: a.customDomain, appName: a.appName, logoData: a.logoData, primaryColor: a.primaryColor, accentColor: a.accentColor, loginHeadline: a.loginHeadline, loginSubtext: a.loginSubtext }),
    });
    const d = await r.json();
    setSaving(false);
    if (!r.ok) { setError(d.error || "Couldn't save."); return; }
    setA(d.agency); setSaved(true); setTimeout(() => setSaved(false), 2500);
  };

  if (!a) return <div className="max-w-2xl mx-auto"><p className="text-muted-foreground">Loading…</p></div>;

  const loginUrl = `https://${a.slug}.${rootDomain}`;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Palette className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agency Branding &amp; White-label</h1>
          <p className="text-sm text-muted-foreground">This branding applies to your clients&apos; portals and your white-label login page. Only you can see and edit it.</p>
        </div>
      </div>

      {error && <div className="rounded-md bg-destructive/10 text-destructive text-sm px-3 py-2">{error}</div>}

      <Card>
        <CardHeader><CardTitle className="text-base">Brand</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1"><Label>Agency name</Label><Input value={a.name} onChange={(e) => set({ name: e.target.value })} /></div>
          <div className="space-y-1"><Label>Portal name (shown to clients)</Label><Input value={a.appName} onChange={(e) => set({ appName: e.target.value })} /></div>
          <div className="space-y-1">
            <Label>Logo</Label>
            <div className="flex items-center gap-3">
              {a.logoData && <img src={a.logoData} alt="Logo" className="h-12 max-w-[160px] object-contain rounded border border-border bg-white p-1" />}
              <input ref={fileRef} type="file" accept="image/*" onChange={onLogo} className="hidden" />
              <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4 mr-1.5" /> Upload logo</Button>
              {a.logoData && <Button size="sm" variant="ghost" onClick={() => set({ logoData: null })}>Remove</Button>}
            </div>
          </div>
          <div className="flex gap-4">
            <div className="space-y-1"><Label>Primary color</Label><input type="color" value={a.primaryColor} onChange={(e) => set({ primaryColor: e.target.value })} className="h-10 w-16 rounded border border-border bg-background" /></div>
            <div className="space-y-1"><Label>Accent color</Label><input type="color" value={a.accentColor} onChange={(e) => set({ accentColor: e.target.value })} className="h-10 w-16 rounded border border-border bg-background" /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">White-label login page</CardTitle>
          <CardDescription>Your clients sign in here with your branding.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Subdomain</Label>
            <div className="flex items-center gap-1">
              <Input value={a.slug} onChange={(e) => set({ slug: e.target.value })} className="max-w-[180px]" />
              <span className="text-sm text-muted-foreground">.{rootDomain}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <input readOnly value={loginUrl} onFocus={(e) => e.target.select()} className="flex-1 text-xs border border-border rounded px-2 py-1.5 bg-muted/40 text-muted-foreground" />
            <Button size="sm" variant="outline" onClick={async () => { await navigator.clipboard.writeText(loginUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>{copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}</Button>
            <a href={loginUrl} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="ghost"><ExternalLink className="h-4 w-4" /></Button></a>
          </div>
          <div className="space-y-1">
            <Label className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> Custom domain (optional)</Label>
            <Input value={a.customDomain ?? ""} onChange={(e) => set({ customDomain: e.target.value })} placeholder="portal.youragency.com" />
            <p className="text-xs text-muted-foreground">Point a CNAME record for this host at <code className="bg-muted px-1 rounded">{rootDomain}</code>, then add it in your hosting/domain settings. Once DNS resolves, clients can use it to reach their branded login.</p>
          </div>
          <div className="space-y-1"><Label>Login headline</Label><Input value={a.loginHeadline ?? ""} onChange={(e) => set({ loginHeadline: e.target.value })} placeholder="Welcome back" /></div>
          <div className="space-y-1"><Label>Login subtext</Label><Textarea value={a.loginSubtext ?? ""} onChange={(e) => set({ loginSubtext: e.target.value })} rows={2} placeholder="Sign in to your marketing portal." /></div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving}>{saved ? <Check className="h-4 w-4 mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}{saving ? "Saving…" : saved ? "Saved" : "Save branding"}</Button>
    </div>
  );
}
