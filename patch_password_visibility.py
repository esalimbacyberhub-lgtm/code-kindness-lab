#!/usr/bin/env python3
"""
Patch: add show/hide password toggles to Account Settings and Create Account.
Run from the repo root: python3 patch_password_visibility.py
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

ACCOUNT   = "src/features/legal/views/AccountSettings.tsx"
USERMGMT  = "src/features/legal/views/UserManagement.tsx"

print("== Rewriting AccountSettings.tsx with show/hide password ==")
write_new(ACCOUNT,
'''import { useEffect, useState } from "react";
import { KeyRound, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

export function AccountSettings() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew(s => !s)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Confirm New Password</Label>
            <div className="relative">
              <Input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(s => !s)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
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
"rewrite AccountSettings.tsx")

print("\n== Patching UserManagement.tsx (show/hide temporary password) ==")
apply(USERMGMT,
'''import { Users, Shield, Briefcase, FileText, UserCircle, Trash2, Edit3, Link2, AlertCircle, Mail, Phone, UserPlus } from "lucide-react";''',
'''import { Users, Shield, Briefcase, FileText, UserCircle, Trash2, Edit3, Link2, AlertCircle, Mail, Phone, UserPlus, Eye, EyeOff } from "lucide-react";''',
"import Eye/EyeOff")

apply(USERMGMT,
'''  const [createErr, setCreateErr] = useState("");''',
'''  const [createErr, setCreateErr] = useState("");
  const [showCreatePassword, setShowCreatePassword] = useState(false);''',
"add showCreatePassword state")

apply(USERMGMT,
'''            <div className="space-y-1.5">
              <Label>Temporary Password</Label>
              <Input value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} placeholder="At least 6 characters" />
              <p className="text-[10px] text-muted-foreground">Share this securely. They can change it themselves after logging in via Account Settings.</p>
            </div>''',
'''            <div className="space-y-1.5">
              <Label>Temporary Password</Label>
              <div className="relative">
                <Input
                  type={showCreatePassword ? "text" : "password"}
                  value={createForm.password}
                  onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="At least 6 characters"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCreatePassword(s => !s)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">Share this securely. They can change it themselves after logging in via Account Settings.</p>
            </div>''',
"password visibility toggle in Create Account")

print("\nAll edits applied successfully.")
