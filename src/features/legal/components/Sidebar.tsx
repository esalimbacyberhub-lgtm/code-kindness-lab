import {
  Home, Briefcase, Calendar, UserLock, FolderTree,
  FileSignature, UserCheck, BookUser, LineChart, ShieldCheck, ChevronLeft,
} from "lucide-react";
import type { Role, ViewKey } from "../types";
import { cn } from "@/lib/utils";

interface NavItem { key: ViewKey; label: string; Icon: typeof Home; partnerOnly?: boolean }

const ITEMS: NavItem[] = [
  { key: "dashboard", label: "Command Deck", Icon: Home },
  { key: "matters", label: "Matter Hub", Icon: Briefcase },
  { key: "calendar", label: "Calendar & Deadlines", Icon: Calendar },
  { key: "clientportal", label: "Client Portal", Icon: UserLock },
  { key: "vault", label: "Document Vault", Icon: FolderTree },
  { key: "drafting", label: "Legal Drafting", Icon: FileSignature },
  { key: "witness", label: "Witness & Experts", Icon: UserCheck },
  { key: "directory", label: "Firm Directory", Icon: BookUser },
  { key: "finance", label: "Financial Ledger", Icon: LineChart },
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
        className="absolute -right-3 top-10 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs shadow-lg z-50"
      >
        <ChevronLeft className={cn("w-3 h-3 transition-transform", collapsed && "rotate-180")} />
      </button>
      <nav className="p-4 space-y-1" aria-label="Primary">
        {ITEMS.filter(i => !i.partnerOnly || role === "partner").map(({ key, label, Icon }) => {
          const active = current === key;
          return (
            <button
              key={key}
              onClick={() => onNavigate(key)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "w-full flex items-center gap-4 p-3 rounded-xl transition group",
                active ? "bg-primary/15 text-primary" : "hover:bg-secondary/40 text-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5 shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
              {!collapsed && <span className="text-sm font-medium truncate">{label}</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
