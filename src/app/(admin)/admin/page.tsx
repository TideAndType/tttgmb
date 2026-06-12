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
import { Users, Trash2, Plus, Globe, Eye, StickyNote, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";

interface Client {
  id: string;
  name: string;
  email: string;
  companyName: string | null;
  gscProperty: string | null;
  createdAt: string;
}

interface Member {
  id: string;
  name: string;
  email: string;
  createdAt: string;
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

  // Team dialog state
  const [teamDialog, setTeamDialog] = useState<Client | null>(null);
  const [teamMembers, setTeamMembers] = useState<Member[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [addMemberForm, setAddMemberForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [addMemberLoading, setAddMemberLoading] = useState(false);
  const [teamError, setTeamError] = useState("");

  const fetchClients = async () => {
    const res = await fetch("/api/admin/clients");
    const data = await res.json();
    setClients(data);
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, []);

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

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage client accounts</p>
        </div>
        <Link href="/admin/clients/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Client
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{clients.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">GSC Connected</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{clients.filter(c => c.gscProperty).length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Clients</CardTitle>
        </CardHeader>
        <CardContent>
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
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell className="text-muted-foreground">{client.email}</TableCell>
                    <TableCell>{client.companyName || "-"}</TableCell>
                    <TableCell>
                      {client.gscProperty ? (
                        <Badge variant="default" className="text-xs">{client.gscProperty}</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Not set</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(client.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewPortal(client.id)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openTeamDialog(client)}
                        >
                          <Users className="h-3 w-3 mr-1" />
                          Team
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openNotesDialog(client)}
                        >
                          <StickyNote className="h-3 w-3 mr-1" />
                          Notes
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setGscDialog(client); setGscUrl(client.gscProperty || ""); }}
                        >
                          <Globe className="h-3 w-3 mr-1" />
                          GSC
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteId(client.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
                      <div>
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
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
