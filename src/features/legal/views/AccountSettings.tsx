import { useEffect, useState } from "react";
import { KeyRound, CheckCircle2, AlertCircle, Eye, EyeOff, ShieldAlert, ShieldCheck, Smartphone } from "lucide-react";
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

  const [factorId, setFactorId] = useState<string | null>(null);
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [pendingFactorId, setPendingFactorId] = useState("");
  const [twofaCode, setTwofaCode] = useState("");
  const [twofaLoading, setTwofaLoading] = useState(false);
  const [twofaError, setTwofaError] = useState("");
  const [twofaSuccess, setTwofaSuccess] = useState(false);
  const [disabling, setDisabling] = useState(false);

  const refreshFactors = async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    const verified = data?.totp.find(f => f.status === "verified");
    setTotpEnabled(!!verified);
    setFactorId(verified?.id || null);
  };

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setEmail(data.user?.email || "");
      if (data.user?.id) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
        setRole(profile?.role || "");
      }
    });
    refreshFactors();
  }, []);

  const startEnroll = async () => {
    setTwofaError("");
    setTwofaSuccess(false);

    // Clean up any stale/abandoned unverified factors first — Supabase
    // blocks re-enrollment if one already exists with the same friendly name.
    const { data: existing } = await supabase.auth.mfa.listFactors();
    const stale = existing?.totp.filter(f => f.status === "unverified") || [];
    for (const f of stale) {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `totp-${Date.now()}`,
    });
    if (error) { setTwofaError(error.message); return; }
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setPendingFactorId(data.id);
    setEnrolling(true);
  };

  const confirmEnroll = async () => {
    setTwofaError("");
    setTwofaLoading(true);
    const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId: pendingFactorId });
    if (challengeErr) { setTwofaLoading(false); setTwofaError(challengeErr.message); return; }
    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId: pendingFactorId,
      challengeId: challenge.id,
      code: twofaCode,
    });
    setTwofaLoading(false);
    if (verifyErr) { setTwofaError(verifyErr.message); return; }
    setEnrolling(false);
    setTwofaCode("");
    setTwofaSuccess(true);
    await refreshFactors();
  };

  const cancelEnroll = async () => {
    if (pendingFactorId) {
      await supabase.auth.mfa.unenroll({ factorId: pendingFactorId });
    }
    setEnrolling(false);
    setQrCode("");
    setSecret("");
    setPendingFactorId("");
    setTwofaCode("");
    setTwofaError("");
  };

  const disable2fa = async () => {
    if (!factorId) return;
    setDisabling(true);
    setTwofaError("");
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setDisabling(false);
    if (error) { setTwofaError(error.message); return; }
    setTwofaSuccess(false);
    await refreshFactors();
  };

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

      <div className="glass-card rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Smartphone className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Two-Factor Authentication</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Adds a code from an authenticator app (Google Authenticator, Authy, etc.) on top of your password when signing in. Optional — each person decides for themselves.
        </p>

        {twofaError && (
          <p className="text-xs text-destructive font-medium flex items-center gap-1.5 mb-3">
            <AlertCircle className="w-3.5 h-3.5" /> {twofaError}
          </p>
        )}
        {twofaSuccess && (
          <p className="text-xs text-success font-medium flex items-center gap-1.5 mb-3">
            <CheckCircle2 className="w-3.5 h-3.5" /> Two-factor authentication is now enabled on your account.
          </p>
        )}

        {enrolling ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-background border border-border">
              {qrCode && <img src={qrCode} alt="Scan this QR code with your authenticator app" className="w-40 h-40" />}
              <p className="text-[11px] text-muted-foreground text-center">
                Scan with your authenticator app, or enter this code manually:
              </p>
              <code className="text-xs font-mono bg-muted px-2 py-1 rounded select-all">{secret}</code>
            </div>
            <div className="space-y-1.5">
              <Label>Enter the 6-digit code from your app</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={twofaCode}
                onChange={e => setTwofaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                className="text-center tracking-[0.4em] text-lg"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={cancelEnroll}>Cancel</Button>
              <Button size="sm" className="btn-royal flex-1" disabled={twofaLoading || twofaCode.length !== 6} onClick={confirmEnroll}>
                {twofaLoading ? "Verifying..." : "Confirm & Enable"}
              </Button>
            </div>
          </div>
        ) : totpEnabled ? (
          <div className="flex items-center justify-between p-3 rounded-lg bg-success/10 border border-success/25">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-success" />
              <span className="text-sm font-medium">Enabled</span>
            </div>
            <Button variant="outline" size="sm" disabled={disabling} onClick={disable2fa}>
              {disabling ? "Disabling..." : "Disable"}
            </Button>
          </div>
        ) : (
          <Button onClick={startEnroll} className="btn-royal w-full">Enable Two-Factor Authentication</Button>
        )}
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
