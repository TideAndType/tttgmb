"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Trash2, Check, Loader2, Globe } from "lucide-react";

interface Settings {
  appName: string;
  logoFilename: string | null;
  primaryColor: string;
  accentColor: string;
}

const DEFAULTS: Settings = {
  appName: "Client Portal",
  logoFilename: null,
  primaryColor: "#2dd4bf",
  accentColor: "#6366f1",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [deletingLogo, setDeletingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => setSettings({ ...DEFAULTS, ...data }))
      .catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appName: settings.appName,
          primaryColor: settings.primaryColor,
          accentColor: settings.accentColor,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/settings/logo", { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      const { filename } = await res.json();
      setSettings((s) => ({ ...s, logoFilename: filename }));
    } catch {
      setError("Logo upload failed.");
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleLogoDelete() {
    setDeletingLogo(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/logo", { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setSettings((s) => ({ ...s, logoFilename: null }));
    } catch {
      setError("Failed to remove logo.");
    } finally {
      setDeletingLogo(false);
    }
  }

  const logoUrl = settings.logoFilename
    ? `/api/uploads/${settings.logoFilename}`
    : null;

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Portal Settings</h1>
        <p className="text-muted-foreground mt-1">
          Customize how the portal looks for you and your clients.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left: form */}
        <div className="lg:col-span-3 space-y-6">

          {/* Agency logo */}
          <Card className="p-6">
            <h2 className="font-semibold text-foreground mb-1">Agency Logo</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Shown on the login page and admin sidebar. PNG, SVG, JPG or WebP.
            </p>

            {logoUrl ? (
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-muted border border-border">
                  <img
                    src={logoUrl}
                    alt="Agency logo"
                    style={{ maxHeight: "56px", maxWidth: "180px", objectFit: "contain" }}
                  />
                </div>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingLogo}
                  >
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    Replace
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogoDelete}
                    disabled={deletingLogo}
                    className="text-destructive hover:text-destructive"
                  >
                    {deletingLogo ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingLogo}
                className="flex flex-col items-center justify-center w-full h-32 rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-muted-foreground hover:text-foreground"
              >
                {uploadingLogo ? (
                  <Loader2 className="h-6 w-6 animate-spin mb-2" />
                ) : (
                  <Upload className="h-6 w-6 mb-2" />
                )}
                <span className="text-sm font-medium">
                  {uploadingLogo ? "Uploading…" : "Click to upload logo"}
                </span>
                <span className="text-xs mt-1">PNG, SVG, JPG, WebP</span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/svg+xml,image/jpeg,image/webp"
              className="hidden"
              onChange={handleLogoUpload}
            />
          </Card>

          {/* Portal name */}
          <Card className="p-6">
            <h2 className="font-semibold text-foreground mb-1">Portal Name</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Displayed on the login page and throughout the admin panel.
            </p>
            <div>
              <Label htmlFor="appName">Name</Label>
              <Input
                id="appName"
                value={settings.appName}
                onChange={(e) => setSettings((s) => ({ ...s, appName: e.target.value }))}
                placeholder="Client Portal"
                className="mt-1.5 max-w-sm"
              />
            </div>
          </Card>

          {/* Colors */}
          <Card className="p-6">
            <h2 className="font-semibold text-foreground mb-1">Brand Colors</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Primary color is used for active nav items and buttons. Accent is used for highlights.
              Client portals use their own brand book colors automatically.
            </p>

            <div className="space-y-4">
              <div>
                <Label>Primary Color</Label>
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="relative">
                    <input
                      type="color"
                      value={settings.primaryColor}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, primaryColor: e.target.value }))
                      }
                      className="w-10 h-10 rounded-md border border-border cursor-pointer bg-transparent p-0.5"
                    />
                  </div>
                  <Input
                    value={settings.primaryColor}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, primaryColor: e.target.value }))
                    }
                    placeholder="#2dd4bf"
                    className="w-32 font-mono text-sm"
                    maxLength={7}
                  />
                  <div
                    className="h-10 w-24 rounded-md border border-border flex items-center justify-center text-xs font-medium"
                    style={{ backgroundColor: settings.primaryColor, color: "#fff" }}
                  >
                    Preview
                  </div>
                </div>
              </div>

              <div>
                <Label>Accent Color</Label>
                <div className="flex items-center gap-3 mt-1.5">
                  <input
                    type="color"
                    value={settings.accentColor}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, accentColor: e.target.value }))
                    }
                    className="w-10 h-10 rounded-md border border-border cursor-pointer bg-transparent p-0.5"
                  />
                  <Input
                    value={settings.accentColor}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, accentColor: e.target.value }))
                    }
                    placeholder="#6366f1"
                    className="w-32 font-mono text-sm"
                    maxLength={7}
                  />
                  <div
                    className="h-10 w-24 rounded-md border border-border flex items-center justify-center text-xs font-medium"
                    style={{ backgroundColor: settings.accentColor, color: "#fff" }}
                  >
                    Preview
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving || saved}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : saved ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Saved
                </>
              ) : (
                "Save Settings"
              )}
            </Button>
          </div>
        </div>

        {/* Right: live preview */}
        <div className="lg:col-span-2">
          <div className="sticky top-8">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Login Page Preview
            </p>
            <div className="rounded-xl border border-border overflow-hidden shadow-lg bg-slate-900">
              {/* Simulated login card */}
              <div className="p-6 flex flex-col items-center">
                <div className="w-full max-w-xs bg-slate-800 rounded-lg p-5 border border-slate-700">
                  {/* Logo preview */}
                  <div className="flex justify-center mb-4">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Logo"
                        style={{ maxHeight: "40px", maxWidth: "120px", objectFit: "contain" }}
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: settings.primaryColor }}
                      >
                        <Globe className="h-5 w-5 text-white" />
                      </div>
                    )}
                  </div>

                  <h3 className="text-center text-white font-semibold text-sm mb-1">
                    {settings.appName || "Client Portal"}
                  </h3>
                  <p className="text-center text-slate-400 text-xs mb-4">Sign in to your account</p>

                  <div className="space-y-2 mb-3">
                    <div className="h-7 rounded bg-slate-700 border border-slate-600" />
                    <div className="h-7 rounded bg-slate-700 border border-slate-600" />
                  </div>

                  <div
                    className="h-7 w-full rounded text-center text-xs text-white font-medium flex items-center justify-center"
                    style={{ backgroundColor: settings.primaryColor }}
                  >
                    Sign In
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-5 mb-3">
              Sidebar Preview
            </p>
            <div className="rounded-xl border border-border overflow-hidden shadow-lg">
              <div className="bg-slate-800 p-4 border-b border-slate-700">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo"
                    style={{ maxHeight: "32px", maxWidth: "100px", objectFit: "contain" }}
                    className="mb-2"
                  />
                ) : null}
                <p className="text-xs text-slate-400 uppercase tracking-wider">Admin Panel</p>
                <p className="text-white font-medium text-sm">{settings.appName || "Client Portal"}</p>
              </div>
              <div className="bg-slate-800 p-3 space-y-1">
                {["Dashboard", "Proposals", "Projects", "Tasks"].map((item, i) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 px-2 py-1.5 rounded text-xs"
                    style={
                      i === 0
                        ? {
                            backgroundColor: settings.primaryColor + "20",
                            color: settings.primaryColor,
                          }
                        : { color: "#94a3b8" }
                    }
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-sm"
                      style={{ backgroundColor: i === 0 ? settings.primaryColor : "#475569" }}
                    />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
