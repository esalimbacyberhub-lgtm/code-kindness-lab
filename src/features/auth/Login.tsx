import { useState } from "react";
import { Lock, Mail, Loader2, AlertCircle } from "lucide-react";
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
