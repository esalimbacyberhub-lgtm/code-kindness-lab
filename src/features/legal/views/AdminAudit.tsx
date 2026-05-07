import { useState } from "react";
import {
  Shield, Activity, TrendingUp, Users, Briefcase,
  Lock, BookOpen, BarChart3, ArrowDownLeft, ArrowUpRight,
} from "lucide-react";
import type { AuditLog, Matter, StaffMember, LedgerEntry, Role } from "../types";
import { cn } from "@/lib/utils";

interface Props {
  logs:    AuditLog[];
  matters: Matter[];
  staff:   StaffMember[];
  ledger:  LedgerEntry[];
  role:    Role;
}

const LEDGER_TYPE_STYLE: Record<string, string> = {
  billable:      "bg-primary/15 text-primary",
  payment:       "bg-success/15 text-success",
  disbursement:  "bg-destructive/15 text-destructive",
  trust:         "bg-warning/15 text-warning",
};

const MODULE_COLOR: Record<string, string> = {
  "System":    "bg-muted/40 text-muted-foreground",
  "Matters":   "bg-primary/15 text-primary",
  "Finance":   "bg-info/15 text-info",
  "Calendar":  "bg-accent/15 text-accent",
  "Vault":     "bg-warning/15 text-warning",
  "Directory": "bg-primary/15 text-primary",
  "Drafting":  "bg-success/15 text-success",
};

const kes = (n: number) =>
  `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const TABS = [
  { id: "overview", label: "Overview",         icon: BarChart3  },
  { id: "ledger",   label: "Financial Ledger", icon: BookOpen   },
  { id: "audit",    label: "Activity Log",     icon: Activity   },
] as const;

type Tab = (typeof TABS)[number]["id"];

export function AdminAudit({ logs, matters, staff, ledger, role }: Props) {
  const [tab, setTab]           = useState<Tab>("overview");
  const [ledgerFilter, setLedgerFilter] = useState<string>("all");

  // ── Access guard ──────────────────────────────────────────────────────────
  if (role !== "partner") {
    return (
      <div className="text-center py-24">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-destructive/15 flex items-center justify-center mb-4">
          <Lock className="w-7 h-7 text-destructive" />
        </div>
        <h2 className="text-2xl font-serif mb-2">Partner Access Only</h2>
        <p className="text-muted-foreground">
          The Admin &amp; Audit module is restricted to Managing Partners.
        </p>
      </div>
    );
  }

  // ── Ledger calculations ───────────────────────────────────────────────────
  const billable      = ledger.filter(e => e.type === "billable").reduce((a, e) => a + e.debit, 0);
  const payments      = ledger.filter(e => e.type === "payment").reduce((a, e) => a + e.debit, 0);
  const disbursements = ledger.filter(e => e.type === "disbursement").reduce((a, e) => a + e.credit, 0);
  const trust         = ledger.filter(e => e.type === "trust").reduce((a, e) => a + e.debit - e.credit, 0);
  const activeMatters = matters.filter(m => m.status === "active").length;

  const stats = [
    { label: "Active Matters",    value: activeMatters,           icon: Briefcase,     color: "text-primary"     },
    { label: "Team Members",      value: staff.length,            icon: Users,         color: "text-info"        },
    { label: "Revenue Billed",    value: kes(billable),           icon: TrendingUp,    color: "text-success"     },
    { label: "Disbursements",     value: kes(disbursements),      icon: Activity,      color: "text-warning"     },
  ];

  const filteredLedger = ledgerFilter === "all"
    ? [...ledger].sort((a, b) => b.date.localeCompare(a.date))
    : [...ledger].filter(e => e.type === ledgerFilter).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-primary/80 font-mono mb-2">
            Partner Only
          </p>
          <h2 className="text-4xl font-serif">
            Admin <span className="text-gradient-blue">&amp; Audit</span>
          </h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 border border-primary/30 px-3 py-1.5 rounded-full">
          <Shield className="w-3 h-3" /> Restricted Access
        </div>
      </div>
      <div className="blue-divider mb-6" />

      {/* ── Tabs ── */}
      <div className="flex gap-0 border-b border-border/50 mb-6">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all",
              tab === t.id
                ? "text-primary border-b-2 border-primary -mb-px"
                : "text-muted-foreground hover:text-foreground border-b-2 border-transparent",
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ════════════════════ OVERVIEW ════════════════════ */}
      {tab === "overview" && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {stats.map(s => (
              <div key={s.label} className="glass-card rounded-2xl p-5 text-center">
                <s.icon className={cn("w-6 h-6 mx-auto mb-2", s.color)} />
                <p className="text-2xl font-serif font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Matter breakdown + Financial summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Matters by type */}
            <div className="glass-card rounded-2xl p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" /> Matters by Type
              </h3>
              {matters.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No matters yet.</p>
              ) : (
                Object.entries(
                  matters.reduce<Record<string, number>>(
                    (a, m) => ({ ...a, [m.type]: (a[m.type] || 0) + 1 }),
                    {},
                  ),
                ).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                    <span className="text-sm">{type}</span>
                    <span className="text-sm font-semibold text-primary">{count}</span>
                  </div>
                ))
              )}
            </div>

            {/* Financial summary */}
            <div className="glass-card rounded-2xl p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Financial Summary
              </h3>
              <div className="space-y-0">
                {[
                  { label: "Billable Revenue",   val: kes(billable),      color: "text-success"     },
                  { label: "Payments Received",  val: kes(payments),      color: "text-success"     },
                  { label: "Disbursements Out",  val: kes(disbursements), color: "text-destructive"  },
                  { label: "Trust Balance",      val: kes(trust),         color: "text-warning"     },
                  { label: "Net Position",       val: kes(payments - disbursements), color: payments - disbursements >= 0 ? "text-success" : "text-destructive" },
                ].map(r => (
                  <div key={r.label} className="flex justify-between items-center py-2.5 border-b border-border/40 last:border-0">
                    <span className="text-sm text-muted-foreground">{r.label}</span>
                    <span className={cn("text-sm font-semibold", r.color)}>{r.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ════════════════════ FINANCIAL LEDGER ════════════════════ */}
      {tab === "ledger" && (
        <>
          {/* Ledger KPI strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Billable",     value: kes(billable),      color: "text-primary",     bg: "bg-primary/8"     },
              { label: "Received",     value: kes(payments),      color: "text-success",     bg: "bg-success/8"     },
              { label: "Disbursed",    value: kes(disbursements), color: "text-destructive", bg: "bg-destructive/8" },
              { label: "Trust",        value: kes(trust),         color: "text-warning",     bg: "bg-warning/8"     },
            ].map(k => (
              <div key={k.label} className={cn("glass-card rounded-xl p-4", k.bg)}>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono mb-1">{k.label}</p>
                <p className={cn("text-lg font-bold", k.color)}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Filter row */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Filter:</span>
            {["all", "billable", "payment", "disbursement", "trust"].map(f => (
              <button
                key={f}
                onClick={() => setLedgerFilter(f)}
                className={cn(
                  "px-3 py-1 rounded-full text-[11px] font-semibold capitalize transition-all",
                  ledgerFilter === f
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted",
                )}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Ledger table */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  {["Date","Description","Matter","Type","Debit","Credit"].map(h => (
                    <th
                      key={h}
                      className={cn(
                        "px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-left",
                        (h === "Debit" || h === "Credit") && "text-right",
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLedger.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground text-sm">
                      No ledger entries yet. Entries are recorded when invoices are created and paid.
                    </td>
                  </tr>
                ) : (
                  filteredLedger.map(e => (
                    <tr key={e.id} className="border-b border-border/30 hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                        {new Date(e.date).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3 max-w-[220px] truncate">{e.description}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs truncate max-w-[140px]">{e.matter || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize", LEDGER_TYPE_STYLE[e.type] || "bg-muted/40 text-muted-foreground")}>
                          {e.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-success">
                        {e.debit > 0 ? (
                          <span className="flex items-center justify-end gap-1">
                            <ArrowDownLeft className="w-3 h-3" />
                            {kes(e.debit)}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-destructive">
                        {e.credit > 0 ? (
                          <span className="flex items-center justify-end gap-1">
                            <ArrowUpRight className="w-3 h-3" />
                            {kes(e.credit)}
                          </span>
                        ) : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredLedger.length > 0 && (
                <tfoot>
                  <tr className="border-t border-primary/20 bg-primary/5">
                    <td colSpan={4} className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-primary">
                      Totals
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-success">
                      {kes(filteredLedger.reduce((s, e) => s + e.debit, 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-destructive">
                      {kes(filteredLedger.reduce((s, e) => s + e.credit, 0))}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}

      {/* ════════════════════ ACTIVITY LOG ════════════════════ */}
      {tab === "audit" && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border/50 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">System Activity Log</h3>
            <span className="text-xs text-muted-foreground ml-auto">{logs.length} entries</span>
          </div>
          {logs.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No activity recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-border/40 max-h-[560px] overflow-y-auto custom-scroll">
              {[...logs].reverse().map(l => (
                <div
                  key={l.id}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-secondary/20 text-sm transition-colors"
                >
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0",
                    MODULE_COLOR[l.module] || "bg-muted/30 text-muted-foreground",
                  )}>
                    {l.module}
                  </span>
                  <span className="flex-1 truncate">{l.action}</span>
                  <span className="text-xs text-muted-foreground shrink-0 capitalize">{l.user}</span>
                  <time className="text-xs text-muted-foreground shrink-0 font-mono">
                    {new Date(l.timestamp).toLocaleString("en-KE", { dateStyle: "short", timeStyle: "short" })}
                  </time>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
