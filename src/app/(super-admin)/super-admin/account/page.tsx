"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { TwoFactorSettings } from "@/components/profile/two-factor-settings";
import { UserCog } from "lucide-react";

type Status = { type: "success" | "error"; message: string } | null;

function Banner({ status }: { status: Status }) {
  if (!status) return null;
  return <Alert variant={status.type === "error" ? "destructive" : "default"}>{status.message}</Alert>;
}

export default function SuperAdminAccountPage() {
  const { data: session, update } = useSession();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profileStatus, setProfileStatus] = useState<Status>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwStatus, setPwStatus] = useState<Status>(null);
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    const u = session?.user as any;
    if (u) { setName(u.name ?? ""); setEmail(u.email ?? ""); }
  }, [session]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileStatus(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      if (!res.ok) {
        const d = await res.json();
        setProfileStatus({ type: "error", message: d.error || "Failed to save." });
      } else {
        setProfileStatus({ type: "success", message: "Profile updated." });
        update?.();
      }
    } catch {
      setProfileStatus({ type: "error", message: "An unexpected error occurred." });
    }
    setProfileLoading(false);
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwStatus(null);
    if (newPassword !== confirmPassword) {
      setPwStatus({ type: "error", message: "New passwords do not match." });
      return;
    }
    if (newPassword.length < 8) {
      setPwStatus({ type: "error", message: "New password must be at least 8 characters." });
      return;
    }
    setPwLoading(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const d = await res.json();
        setPwStatus({ type: "error", message: d.error || "Failed to change password." });
      } else {
        setPwStatus({ type: "success", message: "Password changed." });
        setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      }
    } catch {
      setPwStatus({ type: "error", message: "An unexpected error occurred." });
    }
    setPwLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-6">
      <div className="flex items-center gap-3">
        <UserCog className="h-7 w-7 text-violet-500" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Account</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Platform admin — manage your name, email, password, and security.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base font-semibold">Profile Information</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <Banner status={profileStatus} />
            <Button type="submit" disabled={profileLoading}>{profileLoading ? "Saving…" : "Save Changes"}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Change Password</CardTitle>
          <CardDescription>Use at least 8 characters.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={savePassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="current">Current Password</Label>
              <Input id="current" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new">New Password</Label>
              <Input id="new" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm New Password</Label>
              <Input id="confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            <Banner status={pwStatus} />
            <Button type="submit" disabled={pwLoading}>{pwLoading ? "Saving…" : "Change Password"}</Button>
          </form>
        </CardContent>
      </Card>

      <TwoFactorSettings />
    </div>
  );
}
