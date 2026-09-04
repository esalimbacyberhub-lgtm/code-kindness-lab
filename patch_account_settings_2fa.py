path = "src/features/legal/views/AccountSettings.tsx"
with open(path, "r") as f:
    content = f.read()

edits = [
    (
        'import { KeyRound, CheckCircle2, AlertCircle, Eye, EyeOff, ShieldAlert } from "lucide-react";',
        'import { KeyRound, CheckCircle2, AlertCircle, Eye, EyeOff, ShieldAlert, ShieldCheck, Smartphone } from "lucide-react";'
    ),
    (
        '''  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setEmail(data.user?.email || "");
      if (data.user?.id) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
        setRole(profile?.role || "");
      }
    });
  }, []);''',
        '''  const [factorId, setFactorId] = useState<string | null>(null);
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
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
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
  };''',
    ),
    (
        '''      {role === "partner" && (
        <div className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-4 h-4 text-brand-gold" />
            <h3 className="font-semibold text-sm">Master Password</h3>
          </div>''',
        '''      <div className="glass-card rounded-2xl p-6 mb-6">
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
                onChange={e => setTwofaCode(e.target.value.replace(/\\D/g, "").slice(0, 6))}
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
          </div>'''
    ),
]

for i, (old, new) in enumerate(edits, 1):
    if old not in content:
        print(f"❌ Edit {i} FAILED — anchor text not found. Stopping, no changes written.")
        raise SystemExit(1)
    content = content.replace(old, new, 1)
    print(f"✅ Edit {i} applied")

with open(path, "w") as f:
    f.write(content)

print("\nAll edits applied successfully.")
