import { useState } from "react";
import { Lock, Mail, Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldLogo } from "@/components/FirmLetterhead";
import { supabase } from "@/lib/supabase";

interface Props {
  onSuccess?: () => void;
}

export function Login({ onSuccess }: Props) {
  const [email, setEmail] = useState("");
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
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="flex flex-col items-center mb-8">
          <ShieldLogo size={64} />
          <h1 className="font-serif text-3xl font-semibold mt-4 text-center">
            Omuyoma <span className="text-gradient-blue">& Co.</span>
          </h1>
          <p className="text-xs text-muted-foreground uppercase tracking-[0.25em] font-mono mt-1">Advocates Practice OS</p>
        </div>

        {/* Login card */}
        <div className="glass-card rounded-2xl p-8 border-t-4 border-t-primary shadow-2xl">
          <h2 className="font-serif text-2xl mb-1 text-center">Welcome back</h2>
          <p className="text-sm text-muted-foreground text-center mb-6">Sign in to access your practice</p>

          {mfaRequired ? (
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
                    onChange={e => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs"><Mail className="w-3 h-3" /> Email</Label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs"><Lock className="w-3 h-3" /> Password</Label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" disabled={loading || !email || !password} className="btn-royal w-full">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...</> : "Sign In"}
            </Button>
          </form>
            </>
          )}

          <p className="text-[10px] text-center text-muted-foreground mt-6 leading-relaxed">
            Only authorised users can access this system.<br />
            Contact the firm partner for account access.
          </p>
        </div>

        <p className="text-center text-[10px] text-muted-foreground mt-6 font-mono">
          OMUYOMA & COMPANY ADVOCATES · Nairobi · Kenya
        </p>
      </div>
    </div>
  );
}
