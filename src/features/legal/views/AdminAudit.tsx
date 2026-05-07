import { Shield, Activity, TrendingUp, Users, Briefcase, Lock } from "lucide-react";
import type { AuditLog, Matter, StaffMember, LedgerEntry, Role } from "../types";

interface Props { logs: AuditLog[]; matters: Matter[]; staff: StaffMember[]; ledger: LedgerEntry[]; role: Role; }

export function AdminAudit({ logs, matters, staff, ledger, role }: Props) {
  if (role !== "partner") {
    return (
      <div className="text-center py-24">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-destructive/15 flex items-center justify-center mb-4"><Lock className="w-7 h-7 text-destructive" /></div>
        <h2 className="text-2xl font-serif mb-2">Partner Access Only</h2>
        <p className="text-muted-foreground">The Admin &amp; Audit module is restricted to Managing Partners.</p>
      </div>
    );
  }

  const totalRevenue = ledger.filter(e => e.type === "billable" || e.type === "payment").reduce((a, e) => a + e.debit, 0);
  const totalDisbursements = ledger.filter(e => e.type === "disbursement").reduce((a, e) => a + e.credit, 0);
  const activeMatters = matters.filter(m => m.status === "active").length;

  const stats = [
    { label: "Active Matters", value: activeMatters, icon: Briefcase, color: "text-accent" },
    { label: "Team Members", value: staff.length, icon: Users, color: "text-primary" },
    { label: "Total Revenue", value: `KES ${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: "text-success" },
    { label: "Disbursements", value: `KES ${totalDisbursements.toLocaleString()}`, icon: Activity, color: "text-warning" },
  ];

  const MODULE_COLOR: Record<string, string> = {
    "System": "bg-muted/40 text-muted-foreground",
    "Matters": "bg-primary/15 text-primary",
    "Finance": "bg-blue-500/15 text-blue-400",
    "Calendar": "bg-accent/15 text-accent",
    "Vault": "bg-warning/15 text-warning",
    "Directory": "bg-brand-gold/15 text-brand-gold",
    "Drafting": "bg-info/15 text-info",
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-brand-gold/80 font-mono mb-2">Partner Only</p>
          <h2 className="text-4xl font-serif">Admin <span className="text-gradient-gold">&amp; Audit</span></h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-brand-gold bg-brand-gold/10 border border-brand-gold/30 px-3 py-1.5 rounded-full">
          <Shield className="w-3 h-3" /> Restricted Access
        </div>
      </div>
      <div className="gold-divider mb-6" />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="glass-card rounded-2xl p-5 text-center">
            <s.icon className={`w-6 h-6 mx-auto mb-2 ${s.color}`} />
            <p className="text-2xl font-serif font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Matter breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Briefcase className="w-4 h-4 text-brand-gold" /> Matters by Type</h3>
          {matters.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No matters yet.</p> : (
            Object.entries(matters.reduce<Record<string,number>>((a,m)=>({...a,[m.type]:(a[m.type]||0)+1}),{})).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                <span className="text-sm">{type}</span>
                <span className="text-sm font-semibold text-brand-gold">{count}</span>
              </div>
            ))
          )}
        </div>
        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-brand-gold" /> Financial Summary</h3>
          <div className="space-y-3">
            {[
              { label: "Billable Revenue", val: `KES ${ledger.filter(e=>e.type==="billable").reduce((a,e)=>a+e.debit,0).toLocaleString()}`, color: "text-success" },
              { label: "Payments Received", val: `KES ${ledger.filter(e=>e.type==="payment").reduce((a,e)=>a+e.debit,0).toLocaleString()}`, color: "text-success" },
              { label: "Disbursements", val: `KES ${totalDisbursements.toLocaleString()}`, color: "text-destructive" },
              { label: "Trust Account", val: `KES ${ledger.filter(e=>e.type==="trust").reduce((a,e)=>a+e.debit-e.credit,0).toLocaleString()}`, color: "text-brand-gold" },
            ].map(r => (
              <div key={r.label} className="flex justify-between items-center py-2 border-b border-border/40 last:border-0">
                <span className="text-sm text-muted-foreground">{r.label}</span>
                <span className={`text-sm font-semibold ${r.color}`}>{r.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Audit log */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50 flex items-center gap-2">
          <Activity className="w-4 h-4 text-brand-gold" />
          <h3 className="font-semibold">System Activity Log</h3>
          <span className="text-xs text-muted-foreground ml-auto">{logs.length} entries</span>
        </div>
        {logs.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No activity recorded yet.</div>
        ) : (
          <div className="divide-y divide-border/40 max-h-80 overflow-y-auto">
            {logs.map(l => (
              <div key={l.id} className="flex items-center gap-4 px-5 py-3 hover:bg-secondary/20 text-sm">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${MODULE_COLOR[l.module] || "bg-muted/30 text-muted-foreground"}`}>{l.module}</span>
                <span className="flex-1">{l.action}</span>
                <span className="text-xs text-muted-foreground shrink-0 capitalize">{l.user}</span>
                <time className="text-xs text-muted-foreground shrink-0">{new Date(l.timestamp).toLocaleString("en-KE",{dateStyle:"short",timeStyle:"short"})}</time>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
