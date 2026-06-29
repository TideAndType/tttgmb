"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert } from "@/components/ui/alert";
import { Users, Trash2, Plus, Globe, Eye, StickyNote, X, History, Paperclip, MoreHorizontal } from "lucide-react";
import { AnnouncementBanners } from "@/components/announcements/announcement-banners";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/ui/avatar";
import Link from "next/link";

interface Client {
  id: string;
  name: string;
  email: string;
  role: string;
  companyName: string | null;
  gscProperty: string | null;
  createdAt: string;
  image?: string | null;
}

interface Member {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  image?: string | null;
}

function Avatar({ name, seed, image }: { name: string; seed: string; image?: string | null }) {
  return <UserAvatar name={name} seed={seed} image={image} className="h-7 w-7 text-[10px]" />;
}

export default function AdminPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [gscDialog, setGscDialog] = useState<Client | null>(null);
  const [gscUrl, setGscUrl] = useState("");
  const [gscLoading, setGscLoading] = useState(false);
  const [error, setError] = useState("");

  const [notesDialog, setNotesDialog] = useState<Client | null>(null);
  const [notes, setNotes] = useState<{ id: string; body: string; createdAt: string }[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  const [filesDialog, setFilesDialog] = useState<Client | null>(null);
  const [clientFiles, setClientFiles] = useState<{ id: string; originalName: string; label: string | null; size: number; filename: string }[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [uploadLabel, setUploadLabel] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Team dialog state
  const [teamDialog, setTeamDialog] = useState<Client | null>(null);
  const [teamMembers, setTeamMembers] = useState<Member[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [addMemberForm, setAddMemberForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [addMemberLoading, setAddMemberLoading] = useState(false);
  const [teamError, setTeamError] = useState("");

  const [myAnnouncements, setMyAnnouncements] = useState<{ id: string; title: string; body: string; createdAt: string }[]>([]);

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/admin/clients");
      const data = await res.json();
      setClients(Array.isArray(data) ? data : []);
      if (!res.ok) setError((data && data.error) || "Failed to load clients.");
    } catch {
      setClients([]);
      setError("Failed to load clients.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
    fetch("/api/announcements?scope=mine")
      .then((r) => (r.ok ? r.json() : { announcements: [] }))
      .then((d) => setMyAnnouncements(d.announcements || []))
      .catch(() => {});
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    await fetch(`/api/admin/clients/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    setDeleteLoading(false);
    fetchClients();
  };

  const handleViewPortal = async (clientId: string) => {
    await fetch("/api/admin/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId }),
    });
    window.location.href = "/tasks";
  };

  const handleGscSave = async () => {
    if (!gscDialog) return;
    setGscLoading(true);
    setError("");
    const res = await fetch(`/api/admin/clients/${gscDialog.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gscProperty: gscUrl }),
    });
    if (!res.ok) {
      setError("Failed to save GSC property");
    } else {
      setGscDialog(null);
      setGscUrl("");
      fetchClients();
    }
    setGscLoading(false);
  };

  const openNotesDialog = async (client: Client) => {
    setNotesDialog(client);
    setNewNote("");
    setNotesLoading(true);
    const res = await fetch(`/api/admin/clients/${client.id}/notes`);
    const data = await res.json();
    setNotes(data);
    setNotesLoading(false);
  };

  const handleAddNote = async () => {
    if (!notesDialog || !newNote.trim()) return;
    setAddingNote(true);
    await fetch(`/api/admin/clients/${notesDialog.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: newNote }),
    });
    const res = await fetch(`/api/admin/clients/${notesDialog.id}/notes`);
    const data = await res.json();
    setNotes(data);
    setNewNote("");
    setAddingNote(false);
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!notesDialog) return;
    await fetch(`/api/admin/clients/${notesDialog.id}/notes?noteId=${noteId}`, { method: "DELETE" });
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  const formatFileSize = (bytes: number) =>
    bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(0)} KB`
      : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  const openFilesDialog = async (client: Client) => {
    setFilesDialog(client);
    setUploadFile(null);
    setUploadLabel("");
    setFilesLoading(true);
    const res = await fetch(`/api/files?userId=${client.id}`);
    const data = await res.json();
    setClientFiles(Array.isArray(data) ? data : []);
    setFilesLoading(false);
  };

  const handleFileUpload = async () => {
    if (!filesDialog || !uploadFile) return;
    setUploadingFile(true);
    const form = new FormData();
    form.append("file", uploadFile);
    form.append("userId", filesDialog.id);
    if (uploadLabel.trim()) form.append("label", uploadLabel.trim());
    await fetch("/api/files", { method: "POST", body: form });
    const res = await fetch(`/api/files?userId=${filesDialog.id}`);
    const data = await res.json();
    setClientFiles(Array.isArray(data) ? data : []);
    setUploadFile(null);
    setUploadLabel("");
    setUploadingFile(false);
  };

  const handleDeleteFile = async (fileId: string) => {
    await fetch(`/api/files/${fileId}`, { method: "DELETE" });
    setClientFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const openTeamDialog = async (client: Client) => {
    setTeamDialog(client);
    setTeamError("");
    setAddMemberForm({ firstName: "", lastName: "", email: "", password: "" });
    setTeamLoading(true);
    const res = await fetch(`/api/admin/clients/${client.id}/members`);
    const data = await res.json();
    setTeamMembers(data.members ?? []);
    setTeamLoading(false);
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!teamDialog) return;
    const res = await fetch(`/api/admin/clients/${teamDialog.id}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    });
    if (res.ok) {
      setTeamMembers((prev) => prev.filter((m) => m.id !== memberId));
    }
  };

  const handleAddMember = async () => {
    if (!teamDialog) return;
    setTeamError("");
    setAddMemberLoading(true);
    const res = await fetch(`/api/admin/clients/${teamDialog.id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${addMemberForm.firstName.trim()} ${addMemberForm.lastName.trim()}`.trim(),
        email: addMemberForm.email,
        password: addMemberForm.password,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setTeamError(data.error || "Failed to add member");
    } else {
      setAddMemberForm({ firstName: "", lastName: "", email: "", password: "" });
      // Refresh members list
      const refreshRes = await fetch(`/api/admin/clients/${teamDialog.id}/members`);
      const refreshData = await refreshRes.json();
      setTeamMembers(refreshData.members ?? []);
    }
    setAddMemberLoading(false);
  };

  // Compact per-row actions menu.
  function RowActions({ client }: { client: Client }) {
    const [open, setOpen] = useState(false);
    const item = "w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent transition-colors";
    return (
      <div className="relative inline-block text-left">
        <Button size="sm" variant="outline" onClick={() => setOpen((o) => !o)} aria-label="Actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute right-0 z-50 mt-1 w-44 rounded-lg border border-border bg-popover shadow-lg py-1">
              <button className={item} onClick={() => { setOpen(false); handleViewPortal(client.id); }}>
                <Eye className="h-4 w-4 text-muted-foreground" /> View portal
              </button>
              <button className={item} onClick={() => { setOpen(false); openTeamDialog(client); }}>
                <Users className="h-4 w-4 text-muted-foreground" /> Team
              </button>
              <button className={item} onClick={() => { setOpen(false); openNotesDialog(client); }}>
                <StickyNote className="h-4 w-4 text-muted-foreground" /> Notes
              </button>
              <button className={item} onClick={() => { setOpen(false); openFilesDialog(client); }}>
                <Paperclip className="h-4 w-4 text-muted-foreground" /> Files
              </button>
              <button className={item} onClick={() => { setOpen(false); setGscDialog(client); setGscUrl(client.gscProperty || ""); }}>
                <Globe className="h-4 w-4 text-muted-foreground" /> GSC property
              </button>
              <Link href={`/admin/clients/${client.id}/history`} className={item} onClick={() => setOpen(false)}>
                <History className="h-4 w-4 text-muted-foreground" /> History
              </Link>
              <div className="my-1 border-t border-border" />
              <button className={`${item} text-destructive`} onClick={() => { setOpen(false); setDeleteId(client.id); }}>
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Centered header */}
      <div className="text-center pt-2 mb-8">
        <p className="text-sm text-muted-foreground">Client Portal</p>
        <h1 className="text-3xl font-bold text-foreground mt-0.5">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Manage client accounts</p>
        <div className="mt-4 flex justify-center">
          <Link href="/admin/clients/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Client
            </Button>
          </Link>
        </div>
      </div>

      {/* Platform announcements from the super admin (dismissible) */}
      <AnnouncementBanners items={myAnnouncements} accent="violet" />

      {/* Stat modules — centered title with underline rule */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        {[
          { label: "Total Clients", value: clients.length, Icon: Users },
          { label: "GSC Connected", value: clients.filter((c) => c.gscProperty).length, Icon: Globe },
          { label: "Admins", value: clients.filter((c) => c.role === "ADMIN").length, Icon: Eye },
        ].map(({ label, value, Icon }) => (
          <Card key={label}>
            <div className="text-center px-5 pt-5 pb-3 border-b border-border">
              <h3 className="font-bold text-foreground inline-flex items-center gap-2"><Icon className="h-4 w-4 text-muted-foreground" />{label}</h3>
            </div>
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <div className="text-center px-5 pt-5 pb-3 border-b border-border">
          <h3 className="font-bold text-foreground">All Clients</h3>
        </div>
        <CardContent className="pt-4">
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          ) : clients.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No clients yet. Create one to get started.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>GSC Property</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Avatar name={client.name} seed={client.id} image={client.image} />
                        <span className="truncate">{client.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{client.email}</TableCell>
                    <TableCell>{client.companyName || "-"}</TableCell>
                    <TableCell>
                      {client.gscProperty ? (
                        <Badge variant="default" className="text-xs">{client.gscProperty}</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Not set</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <select
                        value={client.role}
                        onChange={async (e) => {
                          const role = e.target.value;
                          await fetch(`/api/admin/clients/${client.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ role }),
                          });
                          setClients(prev => prev.map(c => c.id === client.id ? { ...c, role } : c));
                        }}
                        className="text-xs border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="CLIENT">CLIENT</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(client.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <RowActions client={client} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Files Dialog */}
      <Dialog open={!!filesDialog} onOpenChange={(open) => !open && setFilesDialog(null)}>
        <DialogContent onClose={() => setFilesDialog(null)}>
          <DialogHeader>
            <DialogTitle>
              Files — {filesDialog?.companyName || filesDialog?.name}
            </DialogTitle>
          </DialogHeader>
          {filesLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {clientFiles.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">No files uploaded yet.</p>
                ) : (
                  clientFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between gap-2 py-2 border-b border-border last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.originalName}</p>
                        <p className="text-xs text-muted-foreground">
                          {file.label ? `${file.label} · ` : ""}{formatFileSize(file.size)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => handleDeleteFile(file.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-border pt-4 space-y-3">
                <p className="text-sm font-semibold">Upload File</p>
                <div className="space-y-2">
                  <Label htmlFor="uploadFile">File</Label>
                  <Input
                    id="uploadFile"
                    type="file"
                    onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="uploadLabel">Label (optional)</Label>
                  <Input
                    id="uploadLabel"
                    placeholder="e.g. Q1 Report"
                    value={uploadLabel}
                    onChange={(e) => setUploadLabel(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleFileUpload}
                  disabled={uploadingFile || !uploadFile}
                >
                  {uploadingFile ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent onClose={() => setDeleteId(null)}>
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Are you sure you want to delete this client? This action cannot be undone and will remove all their data.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GSC Property Dialog */}
      <Dialog open={!!gscDialog} onOpenChange={(open) => !open && setGscDialog(null)}>
        <DialogContent onClose={() => setGscDialog(null)}>
          <DialogHeader>
            <DialogTitle>Assign GSC Property</DialogTitle>
          </DialogHeader>
          {error && <Alert variant="destructive">{error}</Alert>}
          <div className="space-y-2">
            <Label htmlFor="gscUrl">GSC Property URL</Label>
            <Input
              id="gscUrl"
              placeholder="https://example.com"
              value={gscUrl}
              onChange={(e) => setGscUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Enter the exact property URL as it appears in Google Search Console
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGscDialog(null)}>Cancel</Button>
            <Button onClick={handleGscSave} disabled={gscLoading}>
              {gscLoading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Client Notes Dialog */}
      <Dialog open={!!notesDialog} onOpenChange={(open) => !open && setNotesDialog(null)}>
        <DialogContent onClose={() => setNotesDialog(null)}>
          <DialogHeader>
            <DialogTitle>
              Client Notes — {notesDialog?.companyName || notesDialog?.name}
            </DialogTitle>
          </DialogHeader>
          {notesLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {notes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">No notes yet. Add one below.</p>
                ) : (
                  notes.map((note) => (
                    <div key={note.id} className="flex items-start justify-between gap-2 py-2 border-b border-border last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm whitespace-pre-wrap">{note.body}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(note.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => handleDeleteNote(note.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-border pt-4 space-y-3">
                <Textarea
                  placeholder="Add a note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                />
                <Button
                  className="w-full"
                  onClick={handleAddNote}
                  disabled={addingNote || !newNote.trim()}
                >
                  {addingNote ? "Adding..." : "Add Note"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Team Management Dialog */}
      <Dialog open={!!teamDialog} onOpenChange={(open) => !open && setTeamDialog(null)}>
        <DialogContent onClose={() => setTeamDialog(null)}>
          <DialogHeader>
            <DialogTitle>
              Team Members — {teamDialog?.companyName || teamDialog?.name}
            </DialogTitle>
          </DialogHeader>

          {teamLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
          ) : (
            <div className="space-y-4">
              {teamMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">No additional team members yet.</p>
              ) : (
                <div className="space-y-2">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={member.name} seed={member.id} image={member.image} />
                        <div>
                          <p className="text-sm font-medium">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-border pt-4 space-y-3">
                <p className="text-sm font-semibold">Add Team Member</p>
                {teamError && <Alert variant="destructive">{teamError}</Alert>}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="memberFirstName">First Name</Label>
                    <Input
                      id="memberFirstName"
                      placeholder="Jane"
                      value={addMemberForm.firstName}
                      onChange={(e) => setAddMemberForm((f) => ({ ...f, firstName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="memberLastName">Last Name</Label>
                    <Input
                      id="memberLastName"
                      placeholder="Smith"
                      value={addMemberForm.lastName}
                      onChange={(e) => setAddMemberForm((f) => ({ ...f, lastName: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="memberEmail">Email</Label>
                  <Input
                    id="memberEmail"
                    type="email"
                    placeholder="jane@company.com"
                    value={addMemberForm.email}
                    onChange={(e) => setAddMemberForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="memberPassword">Password</Label>
                  <Input
                    id="memberPassword"
                    type="password"
                    placeholder="Temporary password"
                    value={addMemberForm.password}
                    onChange={(e) => setAddMemberForm((f) => ({ ...f, password: e.target.value }))}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleAddMember}
                  disabled={addMemberLoading || !addMemberForm.firstName || !addMemberForm.lastName || !addMemberForm.email || !addMemberForm.password}
                >
                  {addMemberLoading ? "Adding..." : "Add Member"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
