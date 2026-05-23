import { Bell, Mic, Search, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { ShieldLogo } from "@/components/FirmLetterhead";
import type { Role } from "../types";

interface Props {
  role: Role;
  onRoleChange: (r: Role) => void;
  hideRoleSwitcher?: boolean;
  onLogout?: () => void;
  userName?: string;
}

const ROLE_LABEL: Record<Role, string> = {
  partner: "Managing Partner",
  associate: "Associate",
  paralegal: "Paralegal",
  client: "Client View",
};

export function Header({ role, onRoleChange, onLogout, userName, hideRoleSwitcher }: Props) {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })
  );
  useEffect(() => {
    const id = setInterval(
      () => setTime(new Date().toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })),
      30_000
    );
    return () => clearInterval(id);
  }, []);

  return (
    <header className="relative z-20 px-6 pt-5 pb-4 border-b border-brand-gold/10">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <ShieldLogo size={52} />
          <div className="hidden sm:block">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest bg-brand-gold/15 text-brand-gold border border-brand-gold/30">Practice OS</span>
              <span className="text-[11px] text-muted-foreground font-mono">Nairobi · {time}</span>
            </div>
            <h1 className="font-serif text-xl text-foreground tracking-tight leading-none">Omuyoma <span className="text-brand-gold">&amp;</span> Co.</h1>
          </div>
        </div>
        <div className="hidden md:flex flex-1 max-w-md mx-6">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="search" placeholder="Search matters, clients, statutes…" aria-label="Global search" className="w-full pl-10 pr-3 py-2 rounded-lg bg-card/60 border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm placeholder:text-muted-foreground" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!hideRoleSwitcher && <><label className="sr-only" htmlFor="role-switcher">Role</label>
          <select id="role-switcher" value={role} onChange={(e) => onRoleChange(e.target.value as Role)} className="bg-card/60 rounded-lg px-3 py-2 text-sm border border-border focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="partner">Partner</option>
            <option value="associate">Associate</option>
            <option value="paralegal">Paralegal</option>
            <option value="client">Client (View)</option>
          </select></>}
          <button aria-label="Voice command" className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:border-brand-gold/40"><Mic className="w-4 h-4 text-brand-gold-soft" /></button>
          <button aria-label="Notifications" className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:border-brand-gold/40 relative"><Bell className="w-4 h-4 text-brand-gold-soft" /><span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full ring-2 ring-background" /></button>
          <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-brand-gold/15">
            <div className="text-right">
              <p className="text-sm font-medium leading-tight">{userName || "Omuyoma Amukhono"}</p>
              <p className="text-[11px] text-muted-foreground">{ROLE_LABEL[role]}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-gold to-brand-burgundy border-2 border-brand-gold/40 flex items-center justify-center font-serif text-sm text-primary-foreground" aria-hidden>
              {userName ? userName.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase() : "OA"}
            </div>
            {onLogout && (
              <button onClick={onLogout} className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition" title="Sign out">
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
