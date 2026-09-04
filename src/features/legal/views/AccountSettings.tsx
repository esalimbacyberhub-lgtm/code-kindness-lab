import { useEffect, useState } from "react";
import { KeyRound, CheckCircle2, AlertCircle, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

export function AccountSettings() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [currentMasterPw, setCurrentMasterPw] = useState("");
  const [newMasterPw, setNewMasterPw] = useState("");
  const [confirmMasterPw, setConfirmMasterPw] = useState("");
  const [showMasterCurrent, setShowMasterCurrent] = useState(false);
  const [showMasterNew, setShowMasterNew] = useState(false);
  const [mpSaving, setMpSaving] = useState(false);
  const [mpError, setMpError] = useState("");
  const [mpSuccess, setMpSuccess] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setEmail(data.user?.email || "");
      if (data.user?.id) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
        setRole(profile?.role || "");
      }
    });
  }, []);

  const submitMasterPassword = async () => {
    setMpError("");
    setMpSuccess(false);
    if (newMasterPw.length < 6) { setMpError("Password must be at least 6 characters."); return; }
    if (newMasterPw !== confirmMasterPw) { setMpError("Passwords do not match."); return; }
    setMpSaving(true);
    const { error: rpcErr } = await supabase.rpc("set_master_password", {
      p_current_password: currentMasterPw || null,
      p_new_password: newMasterPw,
    });
    setMpSaving(false);
    if (rpcErr) { setMpError(rpcErr.message || "Could not update master password"); return; }
    setMpSuccess(true);
    setCurrentMasterPw("");
    setNewMasterPw("");
    setConfirmMasterPw("");
  };

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

      {role === "partner" && (
        <div className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-4 h-4 text-brand-gold" />
            <h3 className="font-semibold text-sm">Master Password</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Used firm-wide to confirm deletion of matters, folders, and documents. Only partners can set or change it.
          </p>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Current Master Password</Label>
              <div className="relative">
                <Input
                  type={showMasterCurrent ? "text" : "password"}
                  value={currentMasterPw}
                  onChange={e => setCurrentMasterPw(e.target.value)}
                  placeholder="Leave blank if setting for the first time"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowMasterCurrent(s => !s)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showMasterCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>New Master Password</Label>
              <div className="relative">
                <Input
                  type={showMasterNew ? "text" : "password"}
                  value={newMasterPw}
                  onChange={e => setNewMasterPw(e.target.value)}
                  placeholder="At least 6 characters"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowMasterNew(s => !s)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showMasterNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Confirm New Master Password</Label>
              <Input
                type="password"
                value={confirmMasterPw}
                onChange={e => setConfirmMasterPw(e.target.value)}
                placeholder="Re-enter new master password"
              />
            </div>
            {mpError && (
              <p className="text-xs text-destructive font-medium flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> {mpError}
              </p>
            )}
            {mpSuccess && (
              <p className="text-xs text-success font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Master password updated successfully.
              </p>
            )}
            <Button onClick={submitMasterPassword} className="btn-royal w-full" disabled={mpSaving || !newMasterPw || !confirmMasterPw}>
              {mpSaving ? "Updating..." : "Update Master Password"}
            </Button>
          </div>
        </div>
      )}

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
