import { useEffect, useState } from "react";
import {
  TrendingUp, TrendingDown, AlertCircle, Users, CheckCircle2,
  Clock, FileText, DollarSign, Send,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Invoice {
  id: string;
  invoiceNo: string;
  date: string;
  dueDate?: string;
  client: string;
  matter?: string;
  totalAmount: number;
  status: "draft" | "sent" | "paid" | "overdue";
  paidDate?: string;
}

interface FeeNote {
  id: string;
  feeNoteNo?: string;
  noteNo?: string;
  date: string;
  client: string;
  matter?: string;
  totalAmount?: number;
  total?: number;
  status: "draft" | "sent" | "paid";
}

const kes = (n: number) => `KES ${(+n || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" }) : "—";

function daysBetween(a: string, b: string) {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  return Math.floor((db - da) / 86400000);
}

export function FinancialsOverview() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [feeNotes, setFeeNotes] = useState<FeeNote[]>([]);

  useEffect(() => {
    try {
      const fin = localStorage.getItem("omuyoma_financials_v1");
      if (fin) {
        const parsed = JSON.parse(fin);
        if (Array.isArray(parsed?.invoices)) setInvoices(parsed.invoices);
        else if (Array.isArray(parsed)) setInvoices(parsed);
      }
      const fn = localStorage.getItem("omuyoma_fee_notes_v1");
      if (fn) {
        const parsed = JSON.parse(fn);
        if (Array.isArray(parsed)) setFeeNotes(parsed);
      }
    } catch {}
  }, []);

  // ── Normalise into common record shape ─────────────────────────────────
  type Record = { kind: "Invoice" | "Fee Note"; ref: string; date: string; client: string; matter: string; amount: number; status: string; dueDate: string };
  const records: Record[] = [
    ...invoices.map(i => ({
      kind: "Invoice" as const,
      ref: i.invoiceNo,
      date: i.date,
      client: i.client || "Unknown",
      matter: i.matter || "",
      amount: +i.totalAmount || 0,
      status: i.status,
      dueDate: i.dueDate || i.date,
    })),
    ...feeNotes.map(f => ({
      kind: "Fee Note" as const,
      ref: f.feeNoteNo || f.noteNo || f.id,
      date: f.date,
      client: f.client || "Unknown",
      matter: f.matter || "",
      amount: +(f.totalAmount ?? f.total) || 0,
      status: f.status,
      dueDate: f.date,
    })),
  ];

  // ── Calculations ──────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const totalBilled = records.reduce((s, r) => s + r.amount, 0);
  const totalPaid = records.filter(r => r.status === "paid").reduce((s, r) => s + r.amount, 0);
  const totalOutstanding = totalBilled - totalPaid;
  const outstandingRecords = records.filter(r => r.status !== "paid" && r.status !== "draft");

  // Aging buckets
  const aging = { current: 0, d30: 0, d60: 0, d90: 0, d90plus: 0 };
  outstandingRecords.forEach(r => {
    const overdue = daysBetween(r.dueDate, today);
    if (overdue <= 0)      aging.current  += r.amount;
    else if (overdue <= 30) aging.d30     += r.amount;
    else if (overdue <= 60) aging.d60     += r.amount;
    else if (overdue <= 90) aging.d90     += r.amount;
    else                    aging.d90plus += r.amount;
  });

  // Group by debtor
  const byDebtor: Record_[]= [] as any;
  type Debtor = { client: string; outstanding: number; items: Record[]; oldest: number };
  const debtorsMap: Record<string, Debtor> = {};
  outstandingRecords.forEach(r => {
    if (!debtorsMap[r.client]) debtorsMap[r.client] = { client: r.client, outstanding: 0, items: [], oldest: 0 };
    debtorsMap[r.client].outstanding += r.amount;
    debtorsMap[r.client].items.push(r);
    const overdue = daysBetween(r.dueDate, today);
    if (overdue > debtorsMap[r.client].oldest) debtorsMap[r.client].oldest = overdue;
  });
  const debtors = Object.values(debtorsMap).sort((a, b) => b.outstanding - a.outstanding);

  // Pending items (most recent first)
  const pending = outstandingRecords.sort((a, b) => b.date.localeCompare(a.date));

  const collectionRate = totalBilled > 0 ? (totalPaid / totalBilled) * 100 : 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.25em] text-primary/80 font-mono mb-2">Books &amp; Receivables</p>
        <h3 className="text-2xl font-serif font-semibold">Financial <span className="text-gradient-blue">Overview</span></h3>
        <p className="text-xs text-muted-foreground mt-1">Auto-calculated from all invoices and fee notes — totals, dues, debtors and pending items.</p>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="glass-card rounded-2xl p-4 border-l-4 border-l-primary">
          <div className="flex items-center gap-2 mb-1.5">
            <DollarSign className="w-3.5 h-3.5 text-primary" />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Total Billed</p>
          </div>
          <p className="text-2xl font-bold font-serif text-primary">{kes(totalBilled)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{records.length} document{records.length !== 1 ? "s" : ""}</p>
        </div>

        <div className="glass-card rounded-2xl p-4 border-l-4 border-l-success">
          <div className="flex items-center gap-2 mb-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-success" />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Paid</p>
          </div>
          <p className="text-2xl font-bold font-serif text-success">{kes(totalPaid)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{collectionRate.toFixed(0)}% collection rate</p>
        </div>

        <div className="glass-card rounded-2xl p-4 border-l-4 border-l-warning">
          <div className="flex items-center gap-2 mb-1.5">
            <Clock className="w-3.5 h-3.5 text-warning" />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Outstanding</p>
          </div>
          <p className="text-2xl font-bold font-serif text-warning">{kes(totalOutstanding)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{outstandingRecords.length} pending item{outstandingRecords.length !== 1 ? "s" : ""}</p>
        </div>

        <div className="glass-card rounded-2xl p-4 border-l-4 border-l-info">
          <div className="flex items-center gap-2 mb-1.5">
            <Users className="w-3.5 h-3.5 text-info" />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Debtors</p>
          </div>
          <p className="text-2xl font-bold font-serif text-info">{debtors.length}</p>
          <p className="text-[10px] text-muted-foreground mt-1">client{debtors.length !== 1 ? "s" : ""} owe the firm</p>
        </div>
      </div>

      {/* ── Aging Analysis ─────────────────────────────────────────────── */}
      {totalOutstanding > 0 && (
        <div className="glass-card rounded-2xl p-5 mb-6">
          <h4 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-warning" /> Aging Analysis
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {[
              { label: "Current",      val: aging.current, color: "bg-success/10 border-success/30 text-success" },
              { label: "1-30 days",    val: aging.d30,     color: "bg-info/10 border-info/30 text-info" },
              { label: "31-60 days",   val: aging.d60,     color: "bg-warning/10 border-warning/30 text-warning" },
              { label: "61-90 days",   val: aging.d90,     color: "bg-destructive/10 border-destructive/30 text-destructive" },
              { label: "90+ days",     val: aging.d90plus, color: "bg-destructive/20 border-destructive/50 text-destructive" },
            ].map(b => (
              <div key={b.label} className={cn("rounded-lg p-3 border", b.color)}>
                <p className="text-[10px] uppercase font-bold tracking-wider mb-1">{b.label}</p>
                <p className="text-sm font-bold font-mono">{kes(b.val)}</p>
                <p className="text-[10px] opacity-70 mt-0.5">
                  {totalOutstanding > 0 ? `${((b.val / totalOutstanding) * 100).toFixed(0)}%` : "0%"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Debtors & Pending grid ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Who owes the firm */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Who Owes the Firm
            </h4>
            {debtors.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-bold">{debtors.length}</span>
            )}
          </div>
          {debtors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-success/60" />
              <p className="text-sm font-semibold text-success">All settled!</p>
              <p className="text-xs">No clients have outstanding balances.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto">
              {debtors.map((d, i) => {
                const isCritical = d.oldest > 90;
                const isOverdue = d.oldest > 30;
                return (
                  <div key={d.client} className={cn(
                    "rounded-lg p-3 border-l-4",
                    isCritical ? "border-l-destructive bg-destructive/5" :
                    isOverdue  ? "border-l-warning bg-warning/5" :
                                 "border-l-primary/40 bg-secondary/20"
                  )}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{i + 1}. {d.client}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {d.items.length} pending item{d.items.length !== 1 ? "s" : ""}
                          {d.oldest > 0 && <span> · oldest {d.oldest}d overdue</span>}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={cn("font-bold text-sm", isCritical ? "text-destructive" : isOverdue ? "text-warning" : "text-primary")}>
                          {kes(d.outstanding)}
                        </p>
                        {isCritical && <span className="text-[9px] px-1.5 py-0.5 rounded bg-destructive/20 text-destructive font-bold uppercase">Critical</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pending Items */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-warning" /> Pending Items
            </h4>
            {pending.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-warning/15 text-warning font-bold">{pending.length}</span>
            )}
          </div>
          {pending.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-success/60" />
              <p className="text-sm">No pending invoices or fee notes.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto">
              {pending.map(p => {
                const overdue = daysBetween(p.dueDate, today);
                return (
                  <div key={p.kind + p.ref} className={cn(
                    "rounded-lg p-3 border",
                    overdue > 30 ? "border-warning/30 bg-warning/5" : "border-border bg-secondary/10"
                  )}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-primary/15 text-primary">{p.kind}</span>
                        <p className="text-xs font-mono font-semibold text-primary">{p.ref}</p>
                      </div>
                      <p className="text-sm font-bold font-mono">{kes(p.amount)}</p>
                    </div>
                    <p className="text-xs truncate text-foreground">{p.client}{p.matter && p.matter !== "General" ? ` · ${p.matter}` : ""}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[10px] text-muted-foreground">Issued {fmtDate(p.date)}</p>
                      {overdue > 0 ? (
                        <span className="text-[10px] font-bold text-destructive">{overdue}d overdue</span>
                      ) : overdue === 0 ? (
                        <span className="text-[10px] font-bold text-warning">Due today</span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">Due in {Math.abs(overdue)}d</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {records.length === 0 && (
        <div className="glass-card rounded-2xl p-10 mt-6 text-center text-muted-foreground">
          <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-semibold mb-1">No financial records yet</p>
          <p className="text-xs">Create invoices and fee notes — totals, dues and debtors will appear here automatically.</p>
        </div>
      )}
    </div>
  );
}
