import { Receipt,
  Home, Briefcase, Calendar, Lock, FolderTree,
  FileSignature, UserCheck, BookUser, LineChart, ShieldCheck, ChevronLeft,
} from "lucide-react";
import type { Role, ViewKey } from "../types";
import { cn } from "@/lib/utils";

interface NavItem { key: ViewKey; label: string; Icon: typeof Home; partnerOnly?: boolean }

const ITEMS: NavItem[] = [
  { key: "dashboard", label: "Command Deck", Icon: Home },
  { key: "matters", label: "Matter Hub", Icon: Briefcase },
  { key: "calendar", label: "Calendar & Deadlines", Icon: Calendar },
  { key: "vault", label: "Document Vault", Icon: FolderTree },
  { key: "directory", label: "Firm Directory", Icon: BookUser },
  { key: "invoices", label: "Invoices", Icon: Receipt },
  { key: "admin", label: "Admin & Audit", Icon: ShieldCheck, partnerOnly: true },
];

interface Props {
  current: ViewKey;
  role: Role;
  collapsed: boolean;
  onToggle: () => void;
  onNavigate: (v: ViewKey) => void;
}

export function Sidebar({ current, role, collapsed, onToggle, onNavigate }: Props) {
  return (
    <aside
      className={cn(
        "h-full glass-panel border-r border-sidebar-border flex flex-col relative overflow-y-auto custom-scroll transition-[width] duration-300",
        collapsed ? "w-20" : "w-72"
      )}
    >
      <button
        onClick={onToggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3 top-10 w-6 h-6 rounded-full bg-brand-gold text-primary-foreground flex items-center justify-center text-xs shadow-lg z-50 hover:scale-110 transition"
      >
        <ChevronLeft className={cn("w-3 h-3 transition-transform", collapsed && "rotate-180")} />
      </button>
      <nav className="p-4 space-y-0.5" aria-label="Primary">
        {!collapsed && (
          <p className="px-3 pt-2 pb-3 text-[10px] uppercase tracking-[0.2em] text-brand-gold/70 font-mono">
            Practice
          </p>
        )}
        {ITEMS.filter(i => !i.partnerOnly || role === "partner").map(({ key, label, Icon }) => {
          const active = current === key;
          return (
            <button
              key={key}
              onClick={() => onNavigate(key)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "w-full flex items-center gap-4 p-3 rounded-lg transition group relative",
                active
                  ? "bg-gradient-to-r from-brand-gold/20 to-transparent text-brand-gold"
                  : "hover:bg-secondary/40 text-foreground/90"
              )}
            >
              {active && <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-brand-gold rounded-r" aria-hidden />}
              <Icon className={cn("w-5 h-5 shrink-0", active ? "text-brand-gold" : "text-muted-foreground group-hover:text-brand-gold")} />
              {!collapsed && <span className="text-sm font-medium truncate">{label}</span>}
            </button>
          );
        })}
      </nav>
      {!collapsed && (
        <div className="mt-auto p-4 border-t border-brand-gold/10">
          <div className="glass-card rounded-lg p-3 text-center">
            <p className="text-[10px] uppercase tracking-widest text-brand-gold/80 mb-1">Member</p>
            <p className="text-xs font-serif">Law Society of Kenya</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">East African Law Society</p>
          </div>
        </div>
      )}
    </aside>
  );
}
