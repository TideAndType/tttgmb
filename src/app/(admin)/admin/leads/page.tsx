"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Trash2,
  Pencil,
  TrendingUp,
  Users,
  CalendarDays,
  Trophy,
} from "lucide-react";

type LeadStatus = "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL_SENT" | "WON" | "LOST";
type LeadSource = "WEBSITE" | "REFERRAL" | "SOCIAL" | "EMAIL" | "COLD_OUTREACH" | "OTHER";

interface LeadActivity {
  id: string;
  type: string;
  note: string;
  createdAt: string;
}

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: LeadSource;
  status: LeadStatus;
  value: number | null;
  notes: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  activities: LeadActivity[];
}

const STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  PROPOSAL_SENT: "Proposal Sent",
  WON: "Won",
  LOST: "Lost",
};

const STATUS_COLORS: Record<LeadStatus, string> = {
  NEW: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  CONTACTED: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  QUALIFIED: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  PROPOSAL_SENT: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  WON: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  LOST: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

const SOURCE_COLORS: Record<LeadSource, string> = {
  WEBSITE: "#6366f1",
  REFERRAL: "#10b981",
  SOCIAL: "#f59e0b",
  EMAIL: "#3b82f6",
  COLD_OUTREACH: "#8b5cf6",
  OTHER: "#6b7280",
};

const SOURCE_LABELS: Record<LeadSource, string> = {
  WEBSITE: "Website",
  REFERRAL: "Referral",
  SOCIAL: "Social",
  EMAIL: "Email",
  COLD_OUTREACH: "Cold Outreach",
  OTHER: "Other",
};

const ACTIVITY_TYPES = ["call", "email", "meeting", "note", "status_change"];

function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function SourceBadge({ source }: { source: LeadSource }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        className="inline-block w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: SOURCE_COLORS[source] }}
      />
      {SOURCE_LABELS[source]}
    </span>
  );
}

function formatCurrency(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  company: "",
  source: "OTHER" as LeadSource,
  status: "NEW" as LeadStatus,
  value: "",
  notes: "",
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  // Add modal
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState(emptyForm);
  const [addLoading, setAddLoading] = useState(false);

  // Edit modal
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editLoading, setEditLoading] = useState(false);

  // Detail modal
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [activityType, setActivityType] = useState("note");
  const [activityNote, setActivityNote] = useState("");
  const [activityLoading, setActivityLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leads");
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
        // Refresh detail if open
        if (detailLead) {
          const updated = data.find((l: Lead) => l.id === detailLead.id);
          if (updated) setDetailLead(updated);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Stats
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonth = leads.filter((l) => new Date(l.createdAt) >= startOfMonth);
  const pipelineValue = leads
    .filter((l) => l.status !== "WON" && l.status !== "LOST" && l.value !== null)
    .reduce((sum, l) => sum + (l.value ?? 0), 0);
  const wonThisMonth = leads.filter(
    (l) => l.status === "WON" && new Date(l.updatedAt) >= startOfMonth
  );

  // Handlers
  async function handleAdd() {
    setAddLoading(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...addForm, value: addForm.value ? parseFloat(addForm.value) : null }),
      });
      if (res.ok) {
        setShowAdd(false);
        setAddForm(emptyForm);
        await load();
      }
    } finally {
      setAddLoading(false);
    }
  }

  async function handleEdit() {
    if (!editLead) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/leads/${editLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editForm, value: editForm.value ? parseFloat(editForm.value) : null }),
      });
      if (res.ok) {
        setEditLead(null);
        await load();
      }
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this lead?")) return;
    await fetch(`/api/leads/${id}`, { method: "DELETE" });
    await load();
  }

  function openEdit(lead: Lead) {
    setEditLead(lead);
    setEditForm({
      name: lead.name,
      email: lead.email ?? "",
      phone: lead.phone ?? "",
      company: lead.company ?? "",
      source: lead.source,
      status: lead.status,
      value: lead.value !== null ? String(lead.value) : "",
      notes: lead.notes ?? "",
    });
  }

  async function handleAddActivity() {
    if (!detailLead || !activityNote.trim()) return;
    setActivityLoading(true);
    try {
      const res = await fetch(`/api/leads/${detailLead.id}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: activityType, note: activityNote }),
      });
      if (res.ok) {
        setActivityNote("");
        await load();
      }
    } finally {
      setActivityLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Leads</h1>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Lead
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> Total Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leads.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{thisMonth.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Pipeline Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(pipelineValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Trophy className="h-4 w-4" /> Won This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{wonThisMonth.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : leads.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No leads yet. Add your first lead.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow
                      key={lead.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setDetailLead(lead)}
                    >
                      <TableCell className="font-medium">
                        <div>{lead.name}</div>
                        {lead.email && <div className="text-xs text-muted-foreground">{lead.email}</div>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{lead.company || "—"}</TableCell>
                      <TableCell><SourceBadge source={lead.source} /></TableCell>
                      <TableCell><StatusBadge status={lead.status} /></TableCell>
                      <TableCell className="text-muted-foreground">{formatCurrency(lead.value)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{formatDate(lead.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(lead)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(lead.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Lead Modal */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Lead</DialogTitle>
          </DialogHeader>
          <LeadForm form={addForm} setForm={setAddForm} onSubmit={handleAdd} loading={addLoading} submitLabel="Add Lead" />
        </DialogContent>
      </Dialog>

      {/* Edit Lead Modal */}
      <Dialog open={!!editLead} onOpenChange={(open) => { if (!open) setEditLead(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
          </DialogHeader>
          <LeadForm form={editForm} setForm={setEditForm} onSubmit={handleEdit} loading={editLoading} submitLabel="Save Changes" />
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={!!detailLead} onOpenChange={(open) => { if (!open) setDetailLead(null); }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          {detailLead && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {detailLead.name}
                  <StatusBadge status={detailLead.status} />
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Lead details */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {detailLead.email && (
                    <div>
                      <span className="text-muted-foreground">Email</span>
                      <div className="font-medium">{detailLead.email}</div>
                    </div>
                  )}
                  {detailLead.phone && (
                    <div>
                      <span className="text-muted-foreground">Phone</span>
                      <div className="font-medium">{detailLead.phone}</div>
                    </div>
                  )}
                  {detailLead.company && (
                    <div>
                      <span className="text-muted-foreground">Company</span>
                      <div className="font-medium">{detailLead.company}</div>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Source</span>
                    <div><SourceBadge source={detailLead.source} /></div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Value</span>
                    <div className="font-medium">{formatCurrency(detailLead.value)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created</span>
                    <div className="font-medium">{formatDate(detailLead.createdAt)}</div>
                  </div>
                </div>
                {detailLead.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm bg-muted rounded p-2">{detailLead.notes}</p>
                  </div>
                )}

                {/* Activity log */}
                <div>
                  <h3 className="font-semibold text-sm mb-3">Activity Timeline</h3>
                  {detailLead.activities.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No activity yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {detailLead.activities.map((a) => (
                        <div key={a.id} className="flex gap-2 text-sm border-l-2 border-border pl-3">
                          <div className="flex-1">
                            <span className="font-medium capitalize">{a.type}</span>
                            <span className="text-muted-foreground"> · {formatDate(a.createdAt)}</span>
                            <p className="text-muted-foreground mt-0.5">{a.note}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add activity */}
                <div className="border-t pt-4 space-y-3">
                  <h3 className="font-semibold text-sm">Log Activity</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Type</Label>
                      <Select value={activityType} onChange={(e) => setActivityType(e.target.value)} className="h-8">
                        {ACTIVITY_TYPES.map((t) => (
                          <option key={t} value={t}>{t.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                        ))}
                      </Select>
                    </div>
                  </div>
                  <Textarea
                    placeholder="Activity note..."
                    value={activityNote}
                    onChange={(e) => setActivityNote(e.target.value)}
                    rows={2}
                  />
                  <Button onClick={handleAddActivity} disabled={activityLoading || !activityNote.trim()} size="sm">
                    {activityLoading ? "Adding..." : "Add Activity"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface LeadFormProps {
  form: typeof emptyForm;
  setForm: (f: typeof emptyForm) => void;
  onSubmit: () => void;
  loading: boolean;
  submitLabel: string;
}

function LeadForm({ form, setForm, onSubmit, loading, submitLabel }: LeadFormProps) {
  const set = (key: keyof typeof emptyForm) => (value: string) =>
    setForm({ ...form, [key]: value });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label>Name *</Label>
          <Input value={form.name} onChange={(e) => set("name")(e.target.value)} placeholder="Full name" />
        </div>
        <div>
          <Label>Email</Label>
          <Input type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} placeholder="email@example.com" />
        </div>
        <div>
          <Label>Phone</Label>
          <Input value={form.phone} onChange={(e) => set("phone")(e.target.value)} placeholder="+1 555 000 0000" />
        </div>
        <div className="col-span-2">
          <Label>Company</Label>
          <Input value={form.company} onChange={(e) => set("company")(e.target.value)} placeholder="Company name" />
        </div>
        <div>
          <Label>Source</Label>
          <Select value={form.source} onChange={(e) => set("source")(e.target.value)}>
            {(Object.entries({ WEBSITE: "Website", REFERRAL: "Referral", SOCIAL: "Social", EMAIL: "Email", COLD_OUTREACH: "Cold Outreach", OTHER: "Other" }) as [string, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Status</Label>
          <Select value={form.status} onChange={(e) => set("status")(e.target.value)}>
            {(Object.entries({ NEW: "New", CONTACTED: "Contacted", QUALIFIED: "Qualified", PROPOSAL_SENT: "Proposal Sent", WON: "Won", LOST: "Lost" }) as [string, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </div>
        <div className="col-span-2">
          <Label>Estimated Value ($)</Label>
          <Input type="number" min={0} value={form.value} onChange={(e) => set("value")(e.target.value)} placeholder="0" />
        </div>
        <div className="col-span-2">
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(e) => set("notes")(e.target.value)} placeholder="Any notes about this lead..." rows={3} />
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={onSubmit} disabled={loading || !form.name.trim()}>
          {loading ? "Saving..." : submitLabel}
        </Button>
      </div>
    </div>
  );
}
