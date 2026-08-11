import { useEffect, useState } from "react";
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
