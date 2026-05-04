import { useState } from "react";
import { Eye, EyeOff, Scale, Shield, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Role } from "../types";
const USERS = [
  { username: "managing.partner", password: "Omuyoma@2026", role: "partner" as Role, name: "Omuyoma Amukhono" },
  { username: "associate", password: "Associate@2026", role: "associate" as Role, name: "Associate Counsel" },
  { username: "paralegal", password: "Paralegal@2026", role: "paralegal" as Role, name: "Paralegal Officer" },
  { username: "client.portal", password: "Client@2026", role: "client" as Role, name: "Client Access" },
];
interface Props { onLogin: (role: Role, name: string) => void; }
export function Login({ onLogin }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const handleLogin = () => {
    if (!username || !password) { setError("Please enter your username and password."); return; }
    setLoading(true); setError("");
    setTimeout(() => {
      const user = USERS.find(u => u.username === username.trim().toLowerCase() && u.password === password);
      if (user) { onLogin(user.role, user.name); } else { setError("Invalid username or password."); setLoading(false); }
    }, 800);
  };
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{background:"#0d0d14"}}>
      <div className="mesh-bg" aria-hidden />
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-brand-gold to-brand-burgundy flex items-center justify-center mb-4"><Scale className="w-8 h-8 text-white" /></div>
          <h1 className="text-3xl font-serif text-white mb-1">Omuyoma <span style={{color:"#c9a84c"}}>&amp; Co.</span></h1>
          <p className="text-sm" style={{color:"rgba(255,255,255,0.45)"}}>Legal Practice Management OS</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="h-px w-12" style={{background:"rgba(201,168,76,0.3)"}} />
            <p className="text-xs uppercase tracking-widest" style={{color:"rgba(201,168,76,0.6)"}}>Nairobi · Kenya</p>
            <div className="h-px w-12" style={{background:"rgba(201,168,76,0.3)"}} />
          </div>
        </div>
        <div className="glass-card rounded-2xl p-8">
          <div className="flex items-center gap-2 mb-6"><Shield className="w-4 h-4" style={{color:"#c9a84c"}} /><p className="text-xs uppercase tracking-widest" style={{color:"rgba(201,168,76,0.8)"}}>Secure Sign In</p></div>
          <div className="space-y-5">
            <div className="space-y-2"><Label style={{color:"rgba(255,255,255,0.7)"}}>Username</Label><Input value={username} onChange={e=>{setUsername(e.target.value);setError("");}} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="Enter your username" className="h-11" /></div>
            <div className="space-y-2"><Label style={{color:"rgba(255,255,255,0.7)"}}>Password</Label>
              <div className="relative"><Input type={showPass?"text":"password"} value={password} onChange={e=>{setPassword(e.target.value);setError("");}} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="Enter your password" className="h-11 pr-10" /><button type="button" onClick={()=>setShowPass(s=>!s)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{color:"rgba(255,255,255,0.4)"}}>{showPass?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}</button></div>
            </div>
            {error&&<div className="flex items-center gap-2 p-3 rounded-lg" style={{background:"rgba(220,50,50,0.1)",border:"0.5px solid rgba(220,50,50,0.3)"}}><AlertCircle className="w-4 h-4" style={{color:"#f87171"}}/><p className="text-xs" style={{color:"#f87171"}}>{error}</p></div>}
            <Button onClick={handleLogin} disabled={loading} className="w-full h-11" style={{background:"#c9a84c",color:"#0d0d14"}}>{loading?"Signing in...":"Sign In"}</Button>
          </div>
          <div className="mt-6 p-4 rounded-xl" style={{background:"rgba(255,255,255,0.03)",border:"0.5px solid rgba(255,255,255,0.06)"}}>
            <p className="text-xs mb-2" style={{color:"rgba(255,255,255,0.3)"}}>Default credentials:</p>
            {USERS.map(u=><div key={u.username} className="flex justify-between text-xs" style={{color:"rgba(255,255,255,0.25)"}}><span>{u.username}</span><span>{u.password}</span></div>)}
          </div>
        </div>
        <p className="text-center text-xs mt-6" style={{color:"rgba(255,255,255,0.2)"}}>© 2026 Omuyoma &amp; Co. Advocates · Confidential</p>
      </div>
    </div>
  );
}
