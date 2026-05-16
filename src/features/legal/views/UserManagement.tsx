import { useState } from "react";
import { Users, Shield, Briefcase, FileText, UserCircle, Trash2, Edit3, Link2, AlertCircle, Mail, Phone } from "lucide-react";
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
  const { users, loading, updateUser, deleteUser, linkClientToMatter } = useSupabaseUsers();
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

  const byRole = (r: string) => users.filter(u => u.role === r);

  return (
    <div>
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.25em] text-primary/80 font-mono mb-2">Firm Administration</p>
        <h2 className="text-3xl font-serif font-semibold">User <span className="text-gradient-blue">Management</span></h2>
        <p className="text-xs text-muted-foreground mt-1">Manage staff and client accounts. Real-time across all devices.</p>
      </div>

      {/* How to add users banner */}
      <div className="glass-card rounded-2xl p-4 mb-6 border-l-4 border-l-info bg-info/5">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-info shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-semibold mb-1">To add new users:</p>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Open the Supabase dashboard → Authentication → Users → "Add user"</li>
              <li>Enter email + password, tick "Auto Confirm User"</li>
              <li>The user will appear here. Then assign them a role below.</li>
              <li>For clients: use "Link to matter" to give them access to their case only.</li>
            </ol>
          </div>
        </div>
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
