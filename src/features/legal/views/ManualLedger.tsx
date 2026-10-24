import { Fragment, useMemo, useState } from "react";
import { formatDate } from "@/lib/formatDate";
import { Plus, Pencil, Trash2, X, ChevronDown, ChevronRight, Receipt } from "lucide-react";
import type { Matter, Role } from "../types";
import { cn } from "@/lib/utils";
import {
  useManualLedger,
  type AccountType,
  type JournalEntry,
} from "../hooks/useManualLedger";

interface Props { matters: Matter[]; role: Role; }

type DraftLine = { account_id: string; debit: string; credit: string };
type Draft = { id: string | null; date: string; description: string; matterId: string; lines: DraftLine[] };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACCOUNT_TYPES: AccountType[] = ["asset", "liability", "equity", "income", "expense"];

const kes = (n: number) =>
  `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (s: string) => { const n = parseFloat(s); return isFinite(n) ? n : 0; };
const cents = (n: number) => Math.round(n * 100);
const today = () => new Date().toISOString().slice(0, 10);
const matterLabel = (m: any) => String(m?.title ?? m?.name ?? m?.caseNumber ?? m?.id ?? "");

const blankLine = (): DraftLine => ({ account_id: "", debit: "", credit: "" });
const newEntry = (): Draft => ({ id: null, date: today(), description: "", matterId: "", lines: [blankLine(), blankLine()] });
const newFee = (): Draft => ({ ...newEntry(), description: "Legal fee - " });
const editDraft = (e: JournalEntry): Draft => ({
  id: e.id,
  date: e.entry_date,
  description: e.description,
  matterId: e.matter_id ?? "",
  lines: e.lines.map(l => ({
    account_id: l.account_id,
    debit: l.debit > 0 ? String(l.debit) : "",
    credit: l.credit > 0 ? String(l.credit) : "",
  })),
});

const inputCls =
  "w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary";
const btnPrimary =
  "inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50";
const btnGhost =
  "inline-flex items-center gap-1.5 rounded-lg bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted";

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ManualLedger({ matters, role }: Props) {
  const { accounts, entries, loading, error, saveEntry, deleteEntry, addAccount } = useManualLedger();
  const canWrite = (role as string) === "partner" || (role as string) === "accountant";

  const [filter, setFilter] = useState<"all" | "manual" | "automatic">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [showAccount, setShowAccount] = useState(false);
  const [acctForm, setAcctForm] = useState<{ code: string; name: string; type: AccountType }>({ code: "", name: "", type: "asset" });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const accountById = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);
  const matterById = useMemo(() => new Map(matters.map((m: any) => [String(m.id), matterLabel(m)])), [matters]);

  const totals = useMemo(() => {
    let asset = 0, liability = 0;
    entries.forEach(e => e.lines.forEach(l => {
      const t = accountById.get(l.account_id)?.type;
      if (t === "asset") asset += l.debit - l.credit;
      if (t === "liability") liability += l.credit - l.debit;
    }));
    return { asset, liability };
  }, [entries, accountById]);

  const manualCount = entries.filter(e => e.source === "manual").length;
  const shown = entries.filter(e =>
    filter === "all" ? true : filter === "manual" ? e.source === "manual" : e.source !== "manual");
  const entryTotal = (e: JournalEntry) => e.lines.reduce((s, l) => s + l.debit, 0);
  const shownDebit = shown.reduce((s, e) => s + e.lines.reduce((a, l) => a + l.debit, 0), 0);
  const shownCredit = shown.reduce((s, e) => s + e.lines.reduce((a, l) => a + l.credit, 0), 0);

  const accountLabel = (id: string) => {
    const a = accountById.get(id);
    return a ? `${a.code} - ${a.name}` : "Unknown account";
  };

  // ── Draft editing helpers ──────────────────────────────────────────────────
  const setLine = (i: number, patch: Partial<DraftLine>) =>
    setDraft(d => d && ({ ...d, lines: d.lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) }));
  const addLine = () => setDraft(d => d && ({ ...d, lines: [...d.lines, blankLine()] }));
  const removeLine = (i: number) =>
    setDraft(d => d && ({ ...d, lines: d.lines.filter((_, idx) => idx !== i) }));
  const balanceLast = () => setDraft(d => {
    if (!d || d.lines.length < 2) return d;
    const others = d.lines.slice(0, -1);
    const dr = others.reduce((s, l) => s + num(l.debit), 0);
    const cr = others.reduce((s, l) => s + num(l.credit), 0);
    const diff = Math.round(Math.abs(dr - cr) * 100) / 100;
    const last = { ...d.lines[d.lines.length - 1] };
    if (dr > cr) { last.credit = String(diff); last.debit = ""; }
    else if (cr > dr) { last.debit = String(diff); last.credit = ""; }
    return { ...d, lines: [...others, last] };
  });

  const draftDebit = draft ? draft.lines.reduce((s, l) => s + num(l.debit), 0) : 0;
  const draftCredit = draft ? draft.lines.reduce((s, l) => s + num(l.credit), 0) : 0;
  const balanced = cents(draftDebit) === cents(draftCredit) && draftDebit > 0;

  const submitEntry = async () => {
    if (!draft) return;
    setFormError(null);
    if (!draft.description.trim()) { setFormError("Description is required."); return; }
    if (draft.lines.some(l => !l.account_id)) { setFormError("Choose an account on every line."); return; }
    if (draft.lines.some(l => num(l.debit) > 0 && num(l.credit) > 0)) {
      setFormError("A line can have a debit or a credit, not both."); return;
    }
    if (draft.lines.some(l => num(l.debit) === 0 && num(l.credit) === 0)) {
      setFormError("Every line needs an amount."); return;
    }
    if (!balanced) { setFormError("Debits and credits must be equal."); return; }
    setBusy(true);
    try {
      await saveEntry({
        id: draft.id,
        date: draft.date,
        description: draft.description.trim(),
        matterId: UUID.test(draft.matterId) ? draft.matterId : null,
        lines: draft.lines.map(l => ({ account_id: l.account_id, debit: num(l.debit), credit: num(l.credit) })),
      });
      setDraft(null);
    } catch (e: any) {
      setFormError(e.message || "Could not save the entry.");
    } finally {
      setBusy(false);
    }
  };

  const removeEntry = async (e: JournalEntry) => {
    if (!window.confirm(`Delete "${e.description}"? This cannot be undone.`)) return;
    try { await deleteEntry(e.id); }
    catch (err: any) { window.alert(err.message || "Could not delete the entry."); }
  };

  const submitAccount = async () => {
    setFormError(null);
    setBusy(true);
    try {
      await addAccount(acctForm.code, acctForm.name, acctForm.type);
      setShowAccount(false);
      setAcctForm({ code: "", name: "", type: "asset" });
    } catch (e: any) {
      setFormError(e.message || "Could not add the account.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Assets",         value: kes(totals.asset),     color: "text-primary",          bg: "bg-primary/8" },
          { label: "Liabilities",    value: kes(totals.liability), color: "text-warning",          bg: "bg-warning/8" },
          { label: "Manual entries", value: String(manualCount),   color: "text-success",          bg: "bg-success/8" },
          { label: "All entries",    value: String(entries.length), color: "text-muted-foreground", bg: "bg-muted/20" },
        ].map(k => (
          <div key={k.label} className={cn("glass-card rounded-xl p-4", k.bg)}>
            <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{k.label}</p>
            <p className={cn("text-lg font-bold", k.color)}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Show:</span>
          {(["all", "manual", "automatic"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-semibold capitalize transition-all",
                filter === f ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground hover:bg-muted",
              )}
            >
              {f}
            </button>
          ))}
        </div>
        {canWrite && (
          <div className="flex flex-wrap items-center gap-2">
            <button className={btnGhost} onClick={() => { setFormError(null); setShowAccount(true); }}>
              <Plus className="h-3.5 w-3.5" /> New account
            </button>
            <button className={btnGhost} onClick={() => { setFormError(null); setDraft(newFee()); }}>
              <Receipt className="h-3.5 w-3.5" /> Record legal fee
            </button>
            <button className={btnPrimary} onClick={() => { setFormError(null); setDraft(newEntry()); }}>
              <Plus className="h-3.5 w-3.5" /> New entry
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Could not load the ledger: {error}
        </div>
      )}

      <div className="glass-card overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                {["", "Date", "Description", "Matter", "Source", "Amount", ""].map((h, i) => (
                  <th
                    key={i}
                    className={cn(
                      "px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground",
                      h === "Amount" && "text-right",
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">Loading ledger...</td></tr>
              ) : shown.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No ledger entries yet.
                  </td>
                </tr>
              ) : shown.map(e => {
                const isManual = e.source === "manual";
                const open = expanded === e.id;
                return (
                  <Fragment key={e.id}>
                    <tr
                      className="cursor-pointer border-b border-border/30 transition-colors hover:bg-secondary/20"
                      onClick={() => setExpanded(open ? null : e.id)}
                    >
                      <td className="px-4 py-3 text-muted-foreground">
                        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {formatDate(e.entry_date)}
                      </td>
                      <td className="max-w-[260px] truncate px-4 py-3">{e.description}</td>
                      <td className="max-w-[160px] truncate px-4 py-3 text-xs text-muted-foreground">
                        {(e.matter_id && matterById.get(e.matter_id)) || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
                          isManual ? "bg-primary/15 text-primary" : "bg-muted/40 text-muted-foreground",
                        )}>
                          {isManual ? "manual" : e.source || "auto"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">{kes(entryTotal(e))}</td>
                      <td className="px-4 py-3 text-right" onClick={ev => ev.stopPropagation()}>
                        {isManual && canWrite && (
                          <span className="inline-flex gap-2">
                            <button
                              aria-label="Edit entry"
                              className="text-muted-foreground hover:text-primary"
                              onClick={() => { setFormError(null); setDraft(editDraft(e)); }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              aria-label="Delete entry"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => removeEntry(e)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        )}
                      </td>
                    </tr>
                    {open && (
                      <tr className="border-b border-border/30 bg-muted/10">
                        <td />
                        <td colSpan={6} className="px-4 py-3">
                          <table className="w-full text-xs">
                            <tbody>
                              {e.lines.map((l, i) => (
                                <tr key={i}>
                                  <td className="py-1">{accountLabel(l.account_id)}</td>
                                  <td className="w-36 py-1 text-right font-semibold text-success">{l.debit > 0 ? kes(l.debit) : "—"}</td>
                                  <td className="w-36 py-1 text-right font-semibold text-destructive">{l.credit > 0 ? kes(l.credit) : "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
            {shown.length > 0 && (
              <tfoot>
                <tr className="border-t border-primary/20 bg-primary/5">
                  <td colSpan={5} className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-primary">
                    Totals (debits / credits)
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-bold">
                    {kes(shownDebit)} / {kes(shownCredit)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {draft && (
        <Modal title={draft.id ? "Edit manual entry" : "New manual entry"} onClose={() => setDraft(null)}>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs">
              <span className="mb-1 block text-muted-foreground">Date</span>
              <input type="date" className={inputCls} value={draft.date}
                onChange={e => setDraft({ ...draft, date: e.target.value })} />
            </label>
            <label className="text-xs sm:col-span-2">
              <span className="mb-1 block text-muted-foreground">Description</span>
              <input className={inputCls} value={draft.description}
                onChange={e => setDraft({ ...draft, description: e.target.value })} />
            </label>
            <label className="text-xs sm:col-span-3">
              <span className="mb-1 block text-muted-foreground">Matter (optional)</span>
              <select className={inputCls} value={draft.matterId}
                onChange={e => setDraft({ ...draft, matterId: e.target.value })}>
                <option value="">No matter</option>
                {matters.map((m: any) => (
                  <option key={String(m.id)} value={String(m.id)}>{matterLabel(m)}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5 space-y-2">
            <div className="grid grid-cols-12 gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <span className="col-span-6">Account</span>
              <span className="col-span-3 text-right">Debit</span>
              <span className="col-span-3 text-right">Credit</span>
            </div>
            {draft.lines.map((l, i) => (
              <div key={i} className="grid grid-cols-12 items-center gap-2">
                <select className={cn(inputCls, "col-span-6")} value={l.account_id}
                  onChange={e => setLine(i, { account_id: e.target.value })}>
                  <option value="">Select account</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.code} - {a.name} ({a.type})</option>
                  ))}
                </select>
                <input inputMode="decimal" placeholder="0.00" className={cn(inputCls, "col-span-3 text-right")}
                  value={l.debit}
                  onChange={e => setLine(i, { debit: e.target.value, credit: e.target.value ? "" : l.credit })} />
                <div className="col-span-3 flex items-center gap-1">
                  <input inputMode="decimal" placeholder="0.00" className={cn(inputCls, "text-right")}
                    value={l.credit}
                    onChange={e => setLine(i, { credit: e.target.value, debit: e.target.value ? "" : l.debit })} />
                  {draft.lines.length > 2 && (
                    <button aria-label="Remove line" className="text-muted-foreground hover:text-destructive"
                      onClick={() => removeLine(i)}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <button className={btnGhost} onClick={addLine}><Plus className="h-3.5 w-3.5" /> Add line</button>
              <button className={btnGhost} onClick={balanceLast}>Balance last line</button>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2 text-xs">
            <span>Debits {kes(draftDebit)} · Credits {kes(draftCredit)}</span>
            <span className={balanced ? "font-semibold text-success" : "font-semibold text-warning"}>
              {balanced ? "Balanced" : `Out by ${kes(Math.abs(draftDebit - draftCredit))}`}
            </span>
          </div>

          {formError && <p className="mt-3 text-xs text-destructive">{formError}</p>}

          <div className="mt-5 flex justify-end gap-2">
            <button className={btnGhost} onClick={() => setDraft(null)}>Cancel</button>
            <button className={btnPrimary} disabled={busy} onClick={submitEntry}>
              {busy ? "Saving..." : "Save entry"}
            </button>
          </div>
        </Modal>
      )}

      {showAccount && (
        <Modal title="New ledger account" onClose={() => setShowAccount(false)}>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs">
              <span className="mb-1 block text-muted-foreground">Code</span>
              <input className={inputCls} value={acctForm.code}
                onChange={e => setAcctForm({ ...acctForm, code: e.target.value })} />
            </label>
            <label className="text-xs sm:col-span-2">
              <span className="mb-1 block text-muted-foreground">Name</span>
              <input className={inputCls} value={acctForm.name}
                onChange={e => setAcctForm({ ...acctForm, name: e.target.value })} />
            </label>
            <label className="text-xs sm:col-span-3">
              <span className="mb-1 block text-muted-foreground">Type</span>
              <select className={inputCls} value={acctForm.type}
                onChange={e => setAcctForm({ ...acctForm, type: e.target.value as AccountType })}>
                {ACCOUNT_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
              </select>
            </label>
          </div>
          {formError && <p className="mt-3 text-xs text-destructive">{formError}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button className={btnGhost} onClick={() => setShowAccount(false)}>Cancel</button>
            <button className={btnPrimary} disabled={busy} onClick={submitAccount}>
              {busy ? "Adding..." : "Add account"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
