#!/usr/bin/env python3
"""
Patch: self-service password change (Account Settings) + staff account creation
(generalizes the existing client-only "Create Account" flow to any role).
Run from the repo root: python3 patch_handover.py
"""
import sys

def apply(path, old, new, label):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    count = content.count(old)
    if count != 1:
        print(f"  FAILED [{label}]: expected 1 match, found {count} in {path}")
        sys.exit(1)
    content = content.replace(old, new, 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"  OK [{label}]")

def write_new(path, content, label):
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"  OK [{label}]")

TYPES     = "src/features/legal/types.ts"
SIDEBAR   = "src/features/legal/components/Sidebar.tsx"
INDEX     = "src/pages/Index.tsx"
USERMGMT  = "src/features/legal/views/UserManagement.tsx"
ACCOUNT   = "src/features/legal/views/AccountSettings.tsx"

print("== Patching types.ts (add 'account' view) ==")
apply(TYPES,
'''export type ViewKey = "dashboard"|"matters"|"calendar"|"vault"|"directory"|"invoices"|"admin"|"finance"|"clientportal"|"drafting"|"witness" | "users";''',
'''export type ViewKey = "dashboard"|"matters"|"calendar"|"vault"|"directory"|"invoices"|"admin"|"finance"|"clientportal"|"drafting"|"witness" | "users" | "account";''',
"add account ViewKey")

print("\n== Patching Sidebar.tsx (add Account Settings nav item) ==")
apply(SIDEBAR,
'''  { key: "directory", label: "Firm Directory", Icon: BookUser },

  { key: "admin", label: "Admin & Audit", Icon: ShieldCheck, partnerOnly: true },''',
'''  { key: "directory", label: "Firm Directory", Icon: BookUser },
  { key: "account", label: "Account Settings", Icon: Lock },

  { key: "admin", label: "Admin & Audit", Icon: ShieldCheck, partnerOnly: true },''',
"add Account Settings nav item")

print("\n== Creating AccountSettings.tsx ==")
write_new(ACCOUNT,
'''import { useEffect, useState } from "react";
import { KeyRound, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

export function AccountSettings() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email || ""));
  }, []);

  const submit = async () => {
    setError("");
    setSuccess(false);
    if (newPassword.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    setSaving(true);
    const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (updateErr) { setError(updateErr.message); return; }
    setSuccess(true);
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="max-w-md">
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.25em] text-primary/80 font-mono mb-2">My Account</p>
        <h2 className="text-3xl font-serif font-semibold">Account <span className="text-gradient-blue">Settings</span></h2>
        {email && <p className="text-xs text-muted-foreground mt-1">Signed in as {email}</p>}
      </div>

      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Change Password</h3>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>New Password</Label>
            <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="At least 6 characters" />
          </div>
          <div className="space-y-1.5">
            <Label>Confirm New Password</Label>
            <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" />
          </div>
          {error && (
            <p className="text-xs text-destructive font-medium flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> {error}
            </p>
          )}
          {success && (
            <p className="text-xs text-success font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Password updated successfully.
            </p>
          )}
          <Button onClick={submit} className="btn-royal w-full" disabled={saving || !newPassword || !confirmPassword}>
            {saving ? "Updating..." : "Update Password"}
          </Button>
        </div>
      </div>
    </div>
  );
}
''',
"create AccountSettings.tsx")

print("\n== Patching Index.tsx (wire up Account Settings) ==")
apply(INDEX,
'''import { UserManagement } from "@/features/legal/views/UserManagement";''',
'''import { UserManagement } from "@/features/legal/views/UserManagement";
import { AccountSettings } from "@/features/legal/views/AccountSettings";''',
"import AccountSettings")

apply(INDEX,
'''      case "users": return <UserManagement matters={state.matters} />;''',
'''      case "users": return <UserManagement matters={state.matters} />;
      case "account": return <AccountSettings />;''',
"add account route")

print("\n== Patching UserManagement.tsx (generalize account creation to any role) ==")
apply(USERMGMT,
'''  const [createForm, setCreateForm] = useState({ full_name: "", email: "", password: "", matterId: "" });''',
'''  const [createForm, setCreateForm] = useState({ full_name: "", email: "", password: "", matterId: "", role: "client" as UserRow["role"] });''',
"create form state")

apply(USERMGMT,
'''  const submitCreate = async () => {
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
  };''',
'''  const submitCreate = async () => {
    setCreateErr("");
    if (!createForm.full_name.trim()) { setCreateErr("Enter the person's full name."); return; }
    if (!createForm.email.trim())     { setCreateErr("Enter an email address."); return; }
    if (createForm.password.length < 6) { setCreateErr("Password must be at least 6 characters."); return; }
    setCreating(true);
    const res = await createClientAccount({
      fullName: createForm.full_name.trim(),
      email: createForm.email.trim(),
      password: createForm.password,
      role: createForm.role,
      matterId: createForm.role === "client" ? (createForm.matterId || undefined) : undefined,
    });
    setCreating(false);
    if (res.error) { setCreateErr(res.error); return; }
    setCreateOpen(false);
    setCreateForm({ full_name: "", email: "", password: "", matterId: "", role: "client" });
  };''',
"submitCreate role-aware")

apply(USERMGMT,
'''      {/* Create client account */}
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
      </div>''',
'''      {/* Create account */}
      <div className="glass-card rounded-2xl p-4 mb-6 border-l-4 border-l-primary bg-primary/5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold mb-0.5">Create an account</p>
            <p className="text-xs text-muted-foreground">Set up a login for a staff member or client. Clients only ever see their own linked matter.</p>
          </div>
        </div>
        <Button onClick={() => { setCreateErr(""); setCreateOpen(true); }} className="btn-royal shrink-0">
          <UserPlus className="w-4 h-4 mr-1.5" /> Create Account
        </Button>
      </div>''',
"generalize banner")

apply(USERMGMT,
'''      {/* Create Client Account Dialog */}
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
      </Dialog>''',
'''      {/* Create Account Dialog */}
      <Dialog open={createOpen} onOpenChange={o => !o && setCreateOpen(false)}>
        <DialogContent className="glass-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Create Account</DialogTitle>
            <p className="text-xs text-muted-foreground">
              {createForm.role === "client"
                ? "The client will receive these login details and see only their linked matter."
                : "This person will receive these login details and can access the firm system based on their role."}
            </p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={createForm.role} onValueChange={(v: any) => setCreateForm(f => ({ ...f, role: v, matterId: v === "client" ? f.matterId : "" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="partner">Partner</SelectItem>
                  <SelectItem value="associate">Associate</SelectItem>
                  <SelectItem value="paralegal">Paralegal</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input value={createForm.full_name} onChange={e => setCreateForm(f => ({ ...f, full_name: e.target.value }))} placeholder="e.g. Jane Wanjiku" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} placeholder="name@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Temporary Password</Label>
              <Input value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} placeholder="At least 6 characters" />
              <p className="text-[10px] text-muted-foreground">Share this securely. They can change it themselves after logging in via Account Settings.</p>
            </div>
            {createForm.role === "client" && (
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
            )}
            {createErr && <p className="text-xs text-destructive font-medium">{createErr}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
            <Button onClick={submitCreate} className="btn-royal" disabled={creating}>
              {creating ? "Creating..." : "Create Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>''',
"generalize create dialog")

print("\nAll edits applied successfully.")
