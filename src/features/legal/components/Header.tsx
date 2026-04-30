import { Bell, Mic } from "lucide-react";
import { useEffect, useState } from "react";
import type { Role } from "../types";

interface Props {
  role: Role;
  onRoleChange: (r: Role) => void;
}

export function Header({ role, onRoleChange }: Props) {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="relative z-20 px-6 pt-6 pb-2">
      <div className="flex flex-wrap justify-between items-end gap-4 mb-4">
        <div>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-accent/20 text-accent border border-accent/30">
              V 8.0 · LEGAL OS
            </span>
            <span className="text-xs text-muted-foreground font-mono" aria-live="polite">{time}</span>
            <span className="px-2 py-0.5 bg-primary/20 text-primary rounded-full text-xs uppercase tracking-wide">
              {role}
            </span>
          </div>
          <h1 className="font-serif text-3xl text-foreground tracking-tight">
            OMUYOMA <span className="text-primary">&amp;</span> CO. ADVOCATES
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <label className="sr-only" htmlFor="role-switcher">Role</label>
          <select
            id="role-switcher"
            value={role}
            onChange={(e) => onRoleChange(e.target.value as Role)}
            className="bg-secondary/60 rounded-lg px-3 py-2 text-sm border border-border focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="partner">Partner</option>
            <option value="associate">Associate</option>
            <option value="paralegal">Paralegal</option>
            <option value="client">Client (View)</option>
          </select>
          <button
            aria-label="Voice command"
            className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:bg-secondary/40"
          >
            <Mic className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            aria-label="Notifications"
            className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:bg-secondary/40 relative"
          >
            <Bell className="w-4 h-4 text-muted-foreground" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full" />
          </button>
          <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-border">
            <div className="text-right">
              <p className="text-sm font-medium">Alex Omuroma</p>
              <p className="text-xs text-muted-foreground">Managing Partner</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent border-2 border-primary/50" aria-hidden />
          </div>
        </div>
      </div>
    </header>
  );
}
