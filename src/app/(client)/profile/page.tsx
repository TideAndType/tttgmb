"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TwoFactorSettings } from "@/components/profile/two-factor-settings";
import { Button } from "@/components/ui/button";
import { Trash2, UserPlus, Mail, ShieldCheck } from "lucide-react";
import { PERMISSIONS, ALL_PERMISSION_KEYS } from "@/lib/permissions";

interface Member {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  permissions?: string[];
}

function StatusBanner({ status }: { status: { type: "success" | "error"; message: string } | null }) {
  if (!status) return null;
  return (
    <div className={`rounded-md px-3 py-2 text-sm ${
      status.type === "success"
        ? "bg-green-500/10 text-green-600 border border-green-500/20"
        : "bg-destructive/10 text-destructive border border-destructive/20"
    }`}>
      {status.message}
    </div>
  );
}

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const user = session?.user as any;

  // Profile
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [profileStatus, setProfileStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Notifications
  const [notifyTaskCreated, setNotifyTaskCreated] = useState(true);
  const [notifyTaskCompleted, setNotifyTaskCompleted] = useState(true);
  const [notifyApprovalNeeded, setNotifyApprovalNeeded] = useState(true);
  const [notifyProposalSent, setNotifyProposalSent] = useState(true);
  const [notifyInvoiceSent, setNotifyInvoiceSent] = useState(true);
  const [notifyTaskDueReminder, setNotifyTaskDueReminder] = useState(true);
  const [notifyWeeklyDigest, setNotifyWeeklyDigest] = useState(true);
  const [notifStatus, setNotifStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [notifLoading, setNotifLoading] = useState(false);

  // Team
  const [members, setMembers] = useState<Member[]>([]);
  const [teamLoading, setTeamLoading] = useState(true);
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteLastName, setInviteLastName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePerms, setInvitePerms] = useState<string[]>(ALL_PERMISSION_KEYS);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [savingPerms, setSavingPerms] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    setTeamLoading(true);
    try {
      const res = await fetch("/api/team");
      const data = await res.json();
      setMembers(data.members ?? []);
    } catch {
      // silently fail
    }
    setTeamLoading(false);
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  useEffect(() => {
    fetch("/api/profile/notifications")
      .then((r) => r.json())
      .then((d) => {
        setNotifyTaskCreated(d.notifyTaskCreated ?? true);
        setNotifyTaskCompleted(d.notifyTaskCompleted ?? true);
        setNotifyApprovalNeeded(d.notifyApprovalNeeded ?? true);
        setNotifyProposalSent(d.notifyProposalSent ?? true);
        setNotifyInvoiceSent(d.notifyInvoiceSent ?? true);
        setNotifyTaskDueReminder(d.notifyTaskDueReminder ?? true);
        setNotifyWeeklyDigest(d.notifyWeeklyDigest ?? true);
      })
      .catch(() => {});
  }, []);

  const handleNotifSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotifLoading(true);
    setNotifStatus(null);
    try {
      const res = await fetch("/api/profile/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifyTaskCreated, notifyTaskCompleted, notifyApprovalNeeded, notifyProposalSent, notifyInvoiceSent, notifyTaskDueReminder, notifyWeeklyDigest }),
      });
      if (!res.ok) {
        setNotifStatus({ type: "error", message: "Failed to save preferences." });
      } else {
        setNotifStatus({ type: "success", message: "Notification preferences saved." });
      }
    } catch {
      setNotifStatus({ type: "error", message: "An unexpected error occurred." });
    }
    setNotifLoading(false);
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileStatus(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileStatus({ type: "error", message: data.error || "Failed to update profile." });
      } else {
        await update({ name: data.name, email: data.email });
        setProfileStatus({ type: "success", message: "Profile updated successfully." });
      }
    } catch {
      setProfileStatus({ type: "error", message: "An unexpected error occurred." });
    }
    setProfileLoading(false);
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: "error", message: "New passwords do not match." });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordStatus({ type: "error", message: "New password must be at least 8 characters." });
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordStatus({ type: "error", message: data.error || "Failed to change password." });
      } else {
        setPasswordStatus({ type: "success", message: "Password changed successfully." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setPasswordStatus({ type: "error", message: "An unexpected error occurred." });
    }
    setPasswordLoading(false);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    setInviteStatus(null);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: inviteFirstName, lastName: inviteLastName, email: inviteEmail, permissions: invitePerms }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteStatus({ type: "error", message: data.error || "Failed to send invite." });
      } else {
        setInviteStatus({ type: "success", message: `Invite sent to ${inviteEmail}. They'll receive an email to set their password.` });
        setInviteFirstName("");
        setInviteLastName("");
        setInviteEmail("");
        setInvitePerms(ALL_PERMISSION_KEYS);
        fetchMembers();
        fetchMembers();
      }
    } catch {
      setInviteStatus({ type: "error", message: "An unexpected error occurred." });
    }
    setInviteLoading(false);
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm("Remove this team member? They will lose access to the portal.")) return;
    setRemovingId(memberId);
    try {
      const res = await fetch("/api/team", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
      }
    } catch {
      // silently fail
    }
    setRemovingId(null);
  };

  const startEditPerms = (m: Member) => {
    setEditingMemberId(m.id);
    // No permissions set = full access → show all checked.
    setEditPerms(m.permissions && m.permissions.length > 0 ? m.permissions : ALL_PERMISSION_KEYS);
  };

  const saveMemberPerms = async (memberId: string) => {
    setSavingPerms(true);
    try {
      const res = await fetch(`/api/team/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: editPerms }),
      });
      if (res.ok) {
        setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, permissions: editPerms } : m));
        setEditingMemberId(null);
      }
    } catch {
      // silently fail
    }
    setSavingPerms(false);
  };

  const togglePerm = (list: string[], key: string) =>
    list.includes(key) ? list.filter((k) => k !== key) : [...list, key];

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account and team</p>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Profile Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground" htmlFor="name">Name</label>
              <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground" htmlFor="email">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground" htmlFor="company">Business Name</label>
              <input id="company" type="text" value={user?.companyName ?? ""} readOnly disabled
                className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground cursor-not-allowed" />
              <p className="text-xs text-muted-foreground">Only your account team can change this.</p>
            </div>
            <StatusBanner status={profileStatus} />
            <Button type="submit" disabled={profileLoading}>
              {profileLoading ? "Saving…" : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSave} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground" htmlFor="currentPassword">Current Password</label>
              <input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground" htmlFor="newPassword">New Password</label>
              <input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground" htmlFor="confirmPassword">Confirm New Password</label>
              <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <StatusBanner status={passwordStatus} />
            <Button type="submit" disabled={passwordLoading}>
              {passwordLoading ? "Saving…" : "Change Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <TwoFactorSettings />

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Email Notifications</CardTitle>
          <CardDescription>Choose which emails you want to receive.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleNotifSave} className="space-y-4">
            {[
              { id: "notifyTaskCreated", label: "New task assigned to you", value: notifyTaskCreated, setter: setNotifyTaskCreated },
              { id: "notifyTaskCompleted", label: "Task marked as completed", value: notifyTaskCompleted, setter: setNotifyTaskCompleted },
              { id: "notifyApprovalNeeded", label: "New deliverable needs approval", value: notifyApprovalNeeded, setter: setNotifyApprovalNeeded },
              { id: "notifyProposalSent", label: "New proposal sent to you", value: notifyProposalSent, setter: setNotifyProposalSent },
              { id: "notifyInvoiceSent", label: "New invoice issued", value: notifyInvoiceSent, setter: setNotifyInvoiceSent },
              { id: "notifyTaskDueReminder", label: "Task due-date reminders", value: notifyTaskDueReminder, setter: setNotifyTaskDueReminder },
              { id: "notifyWeeklyDigest", label: "Weekly activity summary", value: notifyWeeklyDigest, setter: setNotifyWeeklyDigest },
            ].map(({ id, label, value, setter }) => (
              <label key={id} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => setter(e.target.checked)}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                <span className="text-sm text-foreground">{label}</span>
              </label>
            ))}
            <StatusBanner status={notifStatus} />
            <Button type="submit" disabled={notifLoading}>
              {notifLoading ? "Saving…" : "Save Preferences"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Team Members</CardTitle>
          <CardDescription>Invite colleagues to access this portal alongside you.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current members */}
          {teamLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No team members yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {members.map((m) => (
                <li key={m.id} className="py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <Mail className="h-3 w-3" />{m.email}
                        {m.permissions && m.permissions.length > 0 && (
                          <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px]">{m.permissions.length} of {ALL_PERMISSION_KEYS.length} sections</span>
                        )}
                      </p>
                    </div>
                    {m.id !== user?.id && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => editingMemberId === m.id ? setEditingMemberId(null) : startEditPerms(m)}
                          className="text-muted-foreground hover:text-primary transition-colors p-1 rounded"
                          title="Edit access"
                        >
                          <ShieldCheck className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleRemove(m.id)}
                          disabled={removingId === m.id}
                          className="text-muted-foreground hover:text-red-500 transition-colors p-1 rounded"
                          title="Remove from team"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  {editingMemberId === m.id && (
                    <div className="mt-3 rounded-md border border-border bg-muted/30 p-3">
                      <p className="text-xs font-medium text-foreground mb-2">Which sections can {m.name.split(" ")[0]} access?</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {PERMISSIONS.map((p) => (
                          <label key={p.key} className="flex items-center gap-2 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editPerms.includes(p.key)}
                              onChange={() => setEditPerms((prev) => togglePerm(prev, p.key))}
                              className="accent-primary"
                            />
                            {p.label}
                          </label>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" className="h-7 text-xs" onClick={() => saveMemberPerms(m.id)} disabled={savingPerms}>
                          {savingPerms ? "Saving…" : "Save access"}
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingMemberId(null)}>Cancel</Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-2">All checked = full access. Changes apply next time they sign in.</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* Invite form */}
          <div className="border-t border-border pt-5">
            <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Invite a team member
            </p>
            <form onSubmit={handleInvite} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground" htmlFor="inviteFirst">First Name</label>
                  <input id="inviteFirst" type="text" value={inviteFirstName} onChange={(e) => setInviteFirstName(e.target.value)} required placeholder="Jane"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground" htmlFor="inviteLast">Last Name</label>
                  <input id="inviteLast" type="text" value={inviteLastName} onChange={(e) => setInviteLastName(e.target.value)} required placeholder="Smith"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground" htmlFor="inviteEmail">Email Address</label>
                <input id="inviteEmail" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required placeholder="jane@company.com"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Section access</label>
                <div className="grid grid-cols-2 gap-1.5 rounded-md border border-border p-3">
                  {PERMISSIONS.map((p) => (
                    <label key={p.key} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={invitePerms.includes(p.key)}
                        onChange={() => setInvitePerms((prev) => prev.includes(p.key) ? prev.filter((k) => k !== p.key) : [...prev, p.key])}
                        className="accent-primary"
                      />
                      {p.label}
                    </label>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">All checked = full access. Uncheck to restrict what this person can see.</p>
              </div>
              <StatusBanner status={inviteStatus} />
              <Button type="submit" disabled={inviteLoading} className="gap-2">
                <UserPlus className="h-4 w-4" />
                {inviteLoading ? "Sending invite…" : "Send Invite"}
              </Button>
              <p className="text-xs text-muted-foreground">They'll receive an email with a link to set their own password.</p>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
