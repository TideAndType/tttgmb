"use client";
import { useEffect, useState } from "react";
import { Trash2, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/avatar";

interface User { id: string; name: string; email: string; role: string; companyName: string | null; createdAt: string; image?: string | null; _count: { projects: number; invoices: number }; }

const ROLES = ["SUPER_ADMIN", "ADMIN", "CLIENT"];
const roleColors: Record<string, string> = { SUPER_ADMIN: "bg-violet-100 text-violet-700", ADMIN: "bg-blue-100 text-blue-700", CLIENT: "bg-green-100 text-green-700" };

function Avatar({ name, seed, image }: { name: string; seed: string; image?: string | null }) {
  return <UserAvatar name={name} seed={seed} image={image} className="h-8 w-8 text-[11px]" />;
}

export default function SuperAdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  async function load() {
    const data = await fetch("/api/super-admin/users").then(r => r.json());
    setUsers(Array.isArray(data) ? data : []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function changeRole(id: string, role: string) {
    await fetch(`/api/super-admin/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) });
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
  }

  async function del(id: string) {
    if (!confirm("Permanently delete this user and all their data?")) return;
    await fetch(`/api/super-admin/users/${id}`, { method: "DELETE" });
    setUsers(prev => prev.filter(u => u.id !== id));
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchQ = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchQ && matchRole;
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">All Users</h1>
        <p className="text-sm text-gray-500 mt-0.5">{users.length} total users</p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…" className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none">
          <option value="ALL">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-gray-400 gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">User</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Role</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Projects</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Invoices</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Joined</th>
                <th className="px-4 py-3" />
              </tr></thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={u.name} seed={u.id} image={u.image} />
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{u.name}</p>
                          <p className="text-xs text-gray-400 truncate">{u.email}</p>
                          {u.companyName && <p className="text-xs text-gray-400 truncate">{u.companyName}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select value={u.role} onChange={e => changeRole(u.id, e.target.value)} className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none ${roleColors[u.role] ?? "bg-gray-100 text-gray-600"}`}>
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{u._count.projects}</td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{u._count.invoices}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm" onClick={() => del(u.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <p className="text-center text-gray-400 text-sm py-8">No users match your filters.</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
