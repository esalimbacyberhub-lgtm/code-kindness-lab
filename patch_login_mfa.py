path = "src/features/auth/Login.tsx"
with open(path, "r") as f:
    content = f.read()

edits = [
    (
        'import { Lock, Mail, Loader2, AlertCircle } from "lucide-react";',
        'import { Lock, Mail, Loader2, AlertCircle, ShieldCheck } from "lucide-react";'
    ),
    (
        '''  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      onSuccess?.();
    }
  };''',
        '''  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [mfaChallengeId, setMfaChallengeId] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    const { data: aal, error: aalErr } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    setLoading(false);
    if (aalErr) { setError(aalErr.message); return; }

    if (aal.nextLevel === "aal2" && aal.currentLevel !== aal.nextLevel) {
      const { data: factorsData, error: factorsErr } = await supabase.auth.mfa.listFactors();
      if (factorsErr) { setError(factorsErr.message); return; }
      const totpFactor = factorsData.totp.find(f => f.status === "verified");
      if (!totpFactor) { setError("Two-factor setup is incomplete on this account. Contact the firm partner."); return; }

      const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
      if (challengeErr) { setError(challengeErr.message); return; }

      setMfaFactorId(totpFactor.id);
      setMfaChallengeId(challenge.id);
      setMfaRequired(true);
      return;
    }

    onSuccess?.();
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaError(null);
    setMfaLoading(true);
    const { error } = await supabase.auth.mfa.verify({
      factorId: mfaFactorId,
      challengeId: mfaChallengeId,
      code: mfaCode,
    });
    setMfaLoading(false);
    if (error) { setMfaError(error.message); return; }
    onSuccess?.();
  };'''
    ),
    (
        '''          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">''',
        '''          {mfaRequired ? (
            <>
              <div className="flex flex-col items-center mb-4">
                <ShieldCheck className="w-8 h-8 text-primary mb-2" />
                <p className="text-sm text-muted-foreground text-center">
                  Enter the 6-digit code from your authenticator app.
                </p>
              </div>
              {mfaError && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive">{mfaError}</p>
                </div>
              )}
              <form onSubmit={handleVerifyMfa} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Verification Code</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={mfaCode}
                    onChange={e => setMfaCode(e.target.value.replace(/\\D/g, "").slice(0, 6))}
                    placeholder="123456"
                    autoFocus
                    required
                    className="text-center tracking-[0.4em] text-lg"
                  />
                </div>
                <Button type="submit" disabled={mfaLoading || mfaCode.length !== 6} className="btn-royal w-full">
                  {mfaLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</> : "Verify"}
                </Button>
              </form>
            </>
          ) : (
            <>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">'''
    ),
    (
        '''            <Button type="submit" disabled={loading || !email || !password} className="btn-royal w-full">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...</> : "Sign In"}
            </Button>
          </form>''',
        '''            <Button type="submit" disabled={loading || !email || !password} className="btn-royal w-full">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...</> : "Sign In"}
            </Button>
          </form>
            </>
          )}'''
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
