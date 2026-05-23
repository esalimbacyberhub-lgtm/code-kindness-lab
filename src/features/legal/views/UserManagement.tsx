import { useState } from "react";
import { Users, Shield, Briefcase, FileText, UserCircle, Trash2, Edit3, Link2, AlertCircle, Mail, Phone, UserPlus } from "lucide-react";
import { useSupabaseUsers, type UserRow } from "../hooks/useSupabaseUsers";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Matter } from "../types";

const ROLE_META = {
  partner:   { label: "Partner",   icon: Shield,      color: "bg-primary/15 text-primary border-primary/40" },
  associate: { label: "Associate", icon: Briefcase,   color: "bg-info/15 text-info border-info/40" },
  paralegal: { label: "Paralegal", icon: FileText,    color: "bg-accent/15 text-accent border-accent/40" },
  client:    { label: "Client",    icon: UserCircle,  color: "bg-secondary/40 text-foreground border-border" },
};

interface Props {
  matters: Matter[];
}

export function UserManagement({ matters }: Props) {
  const { users, loading, updateUser, deleteUser, linkClientToMatter, createClientAccount } = useSupabaseUsers();
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ full_name: "", email: "", password: "", matterId: "" });
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState("");
  const [edit, setEdit] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", role: "client" as UserRow["role"], phone: "" });
  const [linkMatter, setLinkMatter] = useState<UserRow | null>(null);

  const startEdit = (u: UserRow) => {
    setEdit(u);
    setEditForm({ full_name: u.full_name || "", role: u.role, phone: u.phone || "" });
  };

  const saveEdit = async () => {
    if (!edit) return;
    await updateUser(edit.id, editForm);
    setEdit(null);
  };

  const remove = async (u: UserRow) => {
    if (confirm(`Delete user ${u.email}? This cannot be undone.`)) await deleteUser(u.id);
  };

  const submitCreate = async () => {
    setCreateErr("");
    if (!createForm.full_name.trim()) { setCreateErr("Enter the client's full name."); return; }
    if (!createForm.email.trim())     { setCreateErr("Enter an email address."); return; }
    if (createForm.password.length < 6) { setCreateErr("Password must be at least 6 characters."); return; }
    setCreating(true);
    const res = await createClientAccount({
      fullName: createForm.full_name.trim(),
      email: createForm.email.trim(),
      password: createForm.password,
      role: "client",
      matterId: createForm.matterId || undefined,
    });
    setCreating(false);
    if (res.error) { setCreateErr(res.error); return; }
    setCreateOpen(false);
    setCreateForm({ full_name: "", email: "", password: "", matterId: "" });
  };

  const byRole = (r: string) => users.filter(u => u.role === r);

  return (
    <div>
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.25em] text-primary/80 font-mono mb-2">Firm Administration</p>
        <h2 className="text-3xl font-serif font-semibold">User <span className="text-gradient-blue">Management</span></h2>
        <p className="text-xs text-muted-foreground mt-1">Manage staff and client accounts. Real-time across all devices.</p>
      </div>

      {/* Create client account */}
      <div className="glass-card rounded-2xl p-4 mb-6 border-l-4 border-l-primary bg-primary/5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold mb-0.5">Create a client account</p>
            <p className="text-xs text-muted-foreground">Set up a client login and link it to their matter — they will only ever see their own case.</p>
          </div>
        </div>
        <Button onClick={() => { setCreateErr(""); setCreateOpen(true); }} className="btn-royal shrink-0">
          <UserPlus className="w-4 h-4 mr-1.5" /> Create Client Account
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {(Object.keys(ROLE_META) as Array<keyof typeof ROLE_META>).map(r => {
          const meta = ROLE_META[r];
          const Icon = meta.icon;
          const count = byRole(r).length;
          return (
            <div key={r} className="glass-card rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Icon className="w-3.5 h-3.5 text-primary" />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{meta.label}</p>
              </div>
              <p className="text-2xl font-bold font-serif text-primary">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Users list */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading users...</div>
      ) : users.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-semibold mb-1">No users yet</p>
          <p className="text-xs">Add the first user via Supabase dashboard → Authentication → Users.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map(u => {
            const meta = ROLE_META[u.role] || ROLE_META.client;
            const Icon = meta.icon;
            const clientMatters = u.role === "client" ? matters.filter((m: any) => m.clientUserId === u.id) : [];
            return (
              <div key={u.id} className="glass-card rounded-xl p-4 flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", meta.color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{u.full_name || "Unnamed"}</p>
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase", meta.color)}>{meta.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3" /> {u.email}</p>
                    {u.phone && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" /> {u.phone}</p>}
                    {u.role === "client" && clientMatters.length > 0 && (
                      <p className="text-[10px] text-info mt-1">Linked to: {clientMatters.map((m: any) => m.fileNo).join(", ")}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {u.role === "client" && (
                    <button onClick={() => setLinkMatter(u)} className="text-info hover:bg-info/10 p-2 rounded" title="Link to matter">
                      <Link2 className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => startEdit(u)} className="text-muted-foreground hover:text-primary hover:bg-primary/10 p-2 rounded">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => remove(u)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-2 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Client Account Dialog */}
      <Dialog open={createOpen} onOpenChange={o => !o && setCreateOpen(false)}>
        <DialogContent className="glass-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Create Client Account</DialogTitle>
            <p className="text-xs text-muted-foreground">The client will receive these login details and see only their linked matter.</p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input value={createForm.full_name} onChange={e => setCreateForm(f => ({ ...f, full_name: e.target.value }))} placeholder="e.g. Jane Wanjiku" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} placeholder="client@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Temporary Password</Label>
              <Input value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} placeholder="At least 6 characters" />
              <p className="text-[10px] text-muted-foreground">Share this with the client securely. They can use it to log in.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Link to Matter (optional)</Label>
              <Select value={createForm.matterId || "none"} onValueChange={(v: any) => setCreateForm(f => ({ ...f, matterId: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Choose a matter" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— No matter yet —</SelectItem>
                  {matters.map((mm: any) => (
                    <SelectItem key={mm.id} value={mm.id}>{mm.fileNo} — {mm.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {createErr && <p className="text-xs text-destructive font-medium">{createErr}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
            <Button onClick={submitCreate} className="btn-royal" disabled={creating}>
              {creating ? "Creating..." : "Create Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!edit} onOpenChange={o => !o && setEdit(null)}>
        <DialogContent className="glass-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Edit User</DialogTitle>
            {edit && <p className="text-xs text-muted-foreground">{edit.email}</p>}
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone (optional)</Label>
              <Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="+254..." />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={editForm.role} onValueChange={(v: any) => setEditForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="partner">Partner</SelectItem>
                  <SelectItem value="associate">Associate</SelectItem>
                  <SelectItem value="paralegal">Paralegal</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button>
            <Button onClick={saveEdit} className="btn-royal">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link to Matter Dialog */}
      <Dialog open={!!linkMatter} onOpenChange={o => !o && setLinkMatter(null)}>
        <DialogContent className="glass-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Link Client to Matter</DialogTitle>
            {linkMatter && <p className="text-xs text-muted-foreground">{linkMatter.email}</p>}
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground mb-3">Select which matter this client should have access to:</p>
            {matters.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No matters available. Add a matter first.</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {matters.map((m: any) => {
                  const isLinked = m.clientUserId === linkMatter?.id;
                  return (
                    <button key={m.id}
                      onClick={async () => {
                        if (linkMatter) {
                          await linkClientToMatter(m.id, isLinked ? "" : linkMatter.id);
                          setLinkMatter(null);
                        }
                      }}
                      className={cn("w-full text-left p-3 rounded-lg border transition-all",
                        isLinked ? "border-info bg-info/10" : "border-border hover:border-primary/40")}>
                      <p className="font-semibold text-sm">{m.fileNo}</p>
                      <p className="text-xs text-muted-foreground">{m.title}</p>
                      {isLinked && <p className="text-[10px] text-info mt-1 font-bold">✓ LINKED — click to unlink</p>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
