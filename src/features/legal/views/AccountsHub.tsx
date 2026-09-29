import { useState } from "react";
import { Plus, Trash2, Scale, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSupabasePurchases } from "../hooks/useSupabasePurchases";
import { useSupabaseCreditors } from "../hooks/useSupabaseCreditors";
import { useSupabaseDebtors } from "../hooks/useSupabaseDebtors";
import { useSupabaseLedger } from "../hooks/useSupabaseLedger";
import type { Matter } from "../types";

const VAT_RATE = 0.16;
const VAT_REDUCED_RATE = 0.08; // temporary reduced rate on fuel — check KRA notices for its end date
const CATEGORIES = ["Rent", "Utilities", "Stationery", "Court fees", "Travel", "Professional fees", "Subscriptions", "Other"];

const today = () => new Date().toISOString().slice(0, 10);
const kes = (n: number) =>
  `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
// VAT contained in a VAT-inclusive amount
const calcVat = (gross: number, rate: number = VAT_RATE) => Math.round((gross - gross / (1 + rate)) * 100) / 100;

const STATUS_COLOR: Record<string, string> = {
  outstanding: "text-destructive bg-destructive/10 border-destructive/30",
  partially_paid: "text-brand-gold bg-brand-gold/10 border-brand-gold/30",
  paid: "text-success bg-success/10 border-success/30",
};

interface Props { matters: Matter[] }

function MatterSelect({ value, onChange, matters }: { value: string; onChange: (v: string) => void; matters: Matter[] }) {
  return (
    <div className="space-y-2">
      <Label>Matter (optional)</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="general">General — firm expense</SelectItem>
          {matters.map(m => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function AmountFields({ amount, vat, onAmount, onVat }: { amount: number; vat: number; onAmount: (n: number) => void; onVat: (n: number) => void }) {
  // VAT treatment decides how the VAT amount is worked out from the (VAT-inclusive) total.
  // Rates live in VAT_RATE / VAT_REDUCED_RATE at the top of this file — change them there if the law changes.
  type Treatment = "standard" | "reduced" | "none" | "custom";
  const RATES = { standard: VAT_RATE, reduced: VAT_REDUCED_RATE, none: 0 } as const;
  const [treatment, setTreatment] = useState<Treatment>("standard");
  const apply = (t: Treatment, gross: number) => {
    if (t !== "custom") onVat(calcVat(gross, RATES[t]));
  };
  const hint: Record<Treatment, string> = {
    standard: "Standard rate (16%), contained in the total.",
    reduced: "Reduced rate (8%) — fuel only. Check the KRA notice for when it ends.",
    none: "No VAT claimed — exempt or zero-rated, or the supplier has no eTIMS invoice.",
    custom: "Enter the VAT amount shown on the invoice.",
  };
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-2">
        <Label>Total amount (incl. VAT)</Label>
        <Input
          type="number"
          value={amount || ""}
          onChange={e => {
            const n = Number(e.target.value);
            onAmount(n);
            apply(treatment, n);
          }}
          placeholder="0"
        />
      </div>
      <div className="space-y-2">
        <Label>VAT treatment</Label>
        <Select value={treatment} onValueChange={v => { const t = v as Treatment; setTreatment(t); apply(t, amount); }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="standard">Standard 16%</SelectItem>
            <SelectItem value="reduced">Reduced 8% (fuel)</SelectItem>
            <SelectItem value="none">No VAT / exempt</SelectItem>
            <SelectItem value="custom">Custom amount</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-2 space-y-2">
        <Label>VAT included (KES)</Label>
        <Input
          type="number"
          value={vat || ""}
          disabled={treatment !== "custom"}
          onChange={e => onVat(Number(e.target.value))}
          placeholder="0"
        />
        <p className="text-[10px] text-muted-foreground">{hint[treatment]}</p>
      </div>
    </div>
  );
}

function Toolbar({ title, hint, onAdd, label }: { title: string; hint: string; onAdd: () => void; label: string }) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        <h3 className="text-xl font-serif">{title}</h3>
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
      </div>
      <Button onClick={onAdd} className="bg-brand-gold text-primary-foreground hover:bg-brand-gold/90">
        <Plus className="w-4 h-4 mr-2" /> {label}
      </Button>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${STATUS_COLOR[status] || ""}`}>
      {status.replace("_", " ")}
    </span>
  );
}

export function AccountsHub({ matters }: Props) {
  const { purchases, addPurchase, deletePurchase } = useSupabasePurchases();
  const { creditors, addCreditor, updateCreditor, deleteCreditor } = useSupabaseCreditors();
  const { debtors, addDebtor, updateDebtor, deleteDebtor } = useSupabaseDebtors();
  const { balances } = useSupabaseLedger(); // all-time — Trial Balance
  const [vatMonth, setVatMonth] = useState(() => new Date().toISOString().slice(0, 7)); // YYYY-MM
  const vatRange = {
    from: `${vatMonth}-01`,
    to: new Date(Number(vatMonth.slice(0, 4)), Number(vatMonth.slice(5, 7)), 0).toISOString().slice(0, 10),
  };
  const { balances: vatBalances } = useSupabaseLedger(vatRange); // this month only — VAT Analysis

  // ── Purchases dialog ──
  const blankPurchase = { purchaseDate: today(), supplierName: "", description: "", category: "Other", amount: 0, vatAmount: 0, paid: "paid", matterId: "general" };
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [pf, setPf] = useState(blankPurchase);
  const submitPurchase = async () => {
    if (!pf.supplierName || !pf.description || !(pf.amount > 0)) return;
    await addPurchase({
      purchaseDate: pf.purchaseDate, supplierName: pf.supplierName, description: pf.description,
      category: pf.category, amount: pf.amount, vatAmount: pf.vatAmount, paid: pf.paid === "paid",
      matterId: pf.matterId === "general" ? null : pf.matterId,
    });
    setPf(blankPurchase); setPurchaseOpen(false);
  };

  // ── Creditors dialog ──
  const blankCreditor = { supplierName: "", invoiceRef: "", amount: 0, vatAmount: 0, dueDate: "", matterId: "general" };
  const [creditorOpen, setCreditorOpen] = useState(false);
  const [cf, setCf] = useState(blankCreditor);
  const submitCreditor = async () => {
    if (!cf.supplierName || !(cf.amount > 0)) return;
    await addCreditor({
      supplierName: cf.supplierName, invoiceRef: cf.invoiceRef || null, amount: cf.amount, vatAmount: cf.vatAmount,
      dueDate: cf.dueDate || null, matterId: cf.matterId === "general" ? null : cf.matterId,
    });
    setCf(blankCreditor); setCreditorOpen(false);
  };

  // ── Debtors dialog ──
  const blankDebtor = { clientName: "", invoiceRef: "", amount: 0, vatAmount: 0, dueDate: "", matterId: "general" };
  const [debtorOpen, setDebtorOpen] = useState(false);
  const [df, setDf] = useState(blankDebtor);
  const submitDebtor = async () => {
    if (!df.clientName || !(df.amount > 0)) return;
    await addDebtor({
      clientName: df.clientName, invoiceRef: df.invoiceRef || null, amount: df.amount, vatAmount: df.vatAmount,
      dueDate: df.dueDate || null, matterId: df.matterId === "general" ? null : df.matterId,
    });
    setDf(blankDebtor); setDebtorOpen(false);
  };

  // ── Payment / receipt dialog ──
  const [pay, setPay] = useState<{ kind: "creditor" | "debtor"; id: string; name: string; balance: number } | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const submitPay = async () => {
    if (!pay || !(payAmount > 0)) return;
    const amt = Math.min(payAmount, pay.balance);
    if (pay.kind === "creditor") {
      const c = creditors.find(x => x.id === pay.id);
      if (!c) return;
      const paid = c.amountPaid + amt;
      await updateCreditor(c.id, { amountPaid: paid, status: paid >= c.amount ? "paid" : "partially_paid" });
    } else {
      const d = debtors.find(x => x.id === pay.id);
      if (!d) return;
      const received = d.amountReceived + amt;
      await updateDebtor(d.id, { amountReceived: received, status: received >= d.amount ? "paid" : "partially_paid" });
    }
    setPay(null); setPayAmount(0);
  };

  const matterName = (id?: string) => matters.find(m => m.id === id)?.title || "General";
  const confirmDelete = (what: string, fn: () => void) => {
    if (window.confirm(`Delete this ${what}? Its ledger entries will be removed too.`)) fn();
  };

  // ── Totals ──
  const totalPurchases = purchases.reduce((a, p) => a + p.amount, 0);
  const creditorsOwed = creditors.reduce((a, c) => a + (c.amount - c.amountPaid), 0);
  const debtorsOwed = debtors.reduce((a, d) => a + (d.amount - d.amountReceived), 0);

  // ── VAT (from ledger) ──
  const acctVat = (code: string) => vatBalances.find(b => b.code === code);
  const outputVat = acctVat("2100") ? acctVat("2100")!.credit - acctVat("2100")!.debit : 0;
  const inputVat = acctVat("1200") ? acctVat("1200")!.debit - acctVat("1200")!.credit : 0;
  const netVat = outputVat - inputVat;

  // ── Trial balance ──
  const tbRows = balances.map(b => {
    const net = b.debit - b.credit;
    return { ...b, dr: net > 0 ? net : 0, cr: net < 0 ? -net : 0 };
  });
  const tbDebit = tbRows.reduce((a, r) => a + r.dr, 0);
  const tbCredit = tbRows.reduce((a, r) => a + r.cr, 0);
  const balanced = Math.abs(tbDebit - tbCredit) < 0.005;

  return (
    <div>
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.25em] text-brand-gold/80 font-mono mb-2">Firm Bookkeeping</p>
        <h2 className="text-4xl font-serif">Accounts <span className="text-gradient-gold">Ledger</span></h2>
      </div>
      <div className="gold-divider mb-6" />

      <Tabs defaultValue="purchases">
        <TabsList className="mb-6 flex-wrap h-auto">
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
          <TabsTrigger value="creditors">Creditors</TabsTrigger>
          <TabsTrigger value="debtors">Debtors</TabsTrigger>
          <TabsTrigger value="vat">VAT Analysis</TabsTrigger>
          <TabsTrigger value="trial">Trial Balance</TabsTrigger>
        </TabsList>

        {/* ───────── Purchases ───────── */}
        <TabsContent value="purchases">
          <Toolbar title="Purchases & Expenses" hint="Record every firm expense. VAT paid is tracked as Input VAT." onAdd={() => setPurchaseOpen(true)} label="Add Expense" />
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="grid grid-cols-[0.9fr_1.4fr_2fr_1fr_0.9fr_0.8fr_auto] gap-3 px-5 py-3 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
              <span>Date</span><span>Supplier</span><span>Description</span>
              <span className="text-right">Amount</span><span className="text-right">VAT</span><span>Status</span><span />
            </div>
            {purchases.length === 0 && <div className="px-5 py-12 text-center text-sm text-muted-foreground">No expenses recorded yet.</div>}
            {purchases.map(p => (
              <div key={p.id} className="grid grid-cols-[0.9fr_1.4fr_2fr_1fr_0.9fr_0.8fr_auto] gap-3 px-5 py-3 text-sm border-b border-border/40 hover:bg-secondary/20 items-center">
                <time className="text-muted-foreground text-xs">{p.purchaseDate}</time>
                <span className="truncate">{p.supplierName}</span>
                <span className="truncate text-muted-foreground">{p.description}<span className="block text-[10px]">{p.category} · {matterName(p.matterId)}</span></span>
                <span className="text-right font-medium">{kes(p.amount)}</span>
                <span className="text-right text-muted-foreground">{kes(p.vatAmount)}</span>
                <StatusPill status={p.paid ? "paid" : "outstanding"} />
                <button onClick={() => confirmDelete("expense", () => deletePurchase(p.id))} aria-label="Delete expense" className="text-destructive/70 hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            {purchases.length > 0 && (
              <div className="px-5 py-3 flex justify-between text-sm font-semibold bg-secondary/20"><span>Total expenses</span><span>{kes(totalPurchases)}</span></div>
            )}
          </div>
        </TabsContent>

        {/* ───────── Creditors ───────── */}
        <TabsContent value="creditors">
          <Toolbar title="Creditors" hint="Who the firm owes. Record supplier invoices, then log payments as you make them." onAdd={() => setCreditorOpen(true)} label="Add Creditor" />
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr_0.9fr_0.9fr_auto_auto] gap-3 px-5 py-3 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
              <span>Supplier</span><span className="text-right">Invoiced</span><span className="text-right">Paid</span>
              <span className="text-right">Balance</span><span>Due</span><span>Status</span><span /><span />
            </div>
            {creditors.length === 0 && <div className="px-5 py-12 text-center text-sm text-muted-foreground">No creditors recorded.</div>}
            {creditors.map(c => {
              const bal = c.amount - c.amountPaid;
              return (
                <div key={c.id} className="grid grid-cols-[1.6fr_1fr_1fr_1fr_0.9fr_0.9fr_auto_auto] gap-3 px-5 py-3 text-sm border-b border-border/40 hover:bg-secondary/20 items-center">
                  <span className="truncate">{c.supplierName}<span className="block text-[10px] text-muted-foreground">{c.invoiceRef || "—"} · {matterName(c.matterId)}</span></span>
                  <span className="text-right">{kes(c.amount)}</span>
                  <span className="text-right text-muted-foreground">{kes(c.amountPaid)}</span>
                  <span className="text-right font-medium text-destructive">{kes(bal)}</span>
                  <span className="text-xs text-muted-foreground">{c.dueDate || "—"}</span>
                  <StatusPill status={c.status} />
                  {bal > 0 ? (
                    <button onClick={() => { setPay({ kind: "creditor", id: c.id, name: c.supplierName, balance: bal }); setPayAmount(bal); }} className="text-xs text-brand-gold hover:underline">Pay</button>
                  ) : <span />}
                  <button onClick={() => confirmDelete("creditor", () => deleteCreditor(c.id))} aria-label="Delete creditor" className="text-destructive/70 hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                </div>
              );
            })}
            {creditors.length > 0 && (
              <div className="px-5 py-3 flex justify-between text-sm font-semibold bg-secondary/20"><span>Total owed to creditors</span><span className="text-destructive">{kes(creditorsOwed)}</span></div>
            )}
          </div>
        </TabsContent>

        {/* ───────── Debtors ───────── */}
        <TabsContent value="debtors">
          <Toolbar title="Debtors" hint="Who owes the firm. Record fee notes raised, then log receipts as clients pay." onAdd={() => setDebtorOpen(true)} label="Add Debtor" />
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr_0.9fr_0.9fr_auto_auto] gap-3 px-5 py-3 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
              <span>Client</span><span className="text-right">Billed</span><span className="text-right">Received</span>
              <span className="text-right">Balance</span><span>Due</span><span>Status</span><span /><span />
            </div>
            {debtors.length === 0 && <div className="px-5 py-12 text-center text-sm text-muted-foreground">No debtors recorded.</div>}
            {debtors.map(d => {
              const bal = d.amount - d.amountReceived;
              return (
                <div key={d.id} className="grid grid-cols-[1.6fr_1fr_1fr_1fr_0.9fr_0.9fr_auto_auto] gap-3 px-5 py-3 text-sm border-b border-border/40 hover:bg-secondary/20 items-center">
                  <span className="truncate">{d.clientName}<span className="block text-[10px] text-muted-foreground">{d.invoiceRef || "—"} · {matterName(d.matterId)}</span></span>
                  <span className="text-right">{kes(d.amount)}</span>
                  <span className="text-right text-muted-foreground">{kes(d.amountReceived)}</span>
                  <span className="text-right font-medium text-success">{kes(bal)}</span>
                  <span className="text-xs text-muted-foreground">{d.dueDate || "—"}</span>
                  <StatusPill status={d.status} />
                  {bal > 0 ? (
                    <button onClick={() => { setPay({ kind: "debtor", id: d.id, name: d.clientName, balance: bal }); setPayAmount(bal); }} className="text-xs text-brand-gold hover:underline">Receive</button>
                  ) : <span />}
                  <button onClick={() => confirmDelete("debtor", () => deleteDebtor(d.id))} aria-label="Delete debtor" className="text-destructive/70 hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                </div>
              );
            })}
            {debtors.length > 0 && (
              <div className="px-5 py-3 flex justify-between text-sm font-semibold bg-secondary/20"><span>Total owed by debtors</span><span className="text-success">{kes(debtorsOwed)}</span></div>
            )}
          </div>
        </TabsContent>

        {/* ───────── VAT ───────── */}
        <TabsContent value="vat">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
            <div>
              <h3 className="text-xl font-serif">VAT Analysis</h3>
              <p className="text-xs text-muted-foreground mt-1">Net VAT = Output VAT (charged on fees) − Input VAT (paid on purchases), for the month selected below.</p>
            </div>
            <div className="space-y-2">
              <Label>Month</Label>
              <Input type="month" value={vatMonth} onChange={e => setVatMonth(e.target.value)} className="w-40" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="glass-card rounded-2xl p-5 text-center">
              <TrendingUp className="w-5 h-5 mx-auto mb-2 text-brand-gold" />
              <p className="text-xl font-serif font-bold">{kes(outputVat)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Output VAT — charged on fees</p>
            </div>
            <div className="glass-card rounded-2xl p-5 text-center">
              <TrendingDown className="w-5 h-5 mx-auto mb-2 text-brand-gold" />
              <p className="text-xl font-serif font-bold">{kes(inputVat)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Input VAT — paid on purchases</p>
            </div>
            <div className="glass-card rounded-2xl p-5 text-center">
              <Scale className={`w-5 h-5 mx-auto mb-2 ${netVat > 0 ? "text-destructive" : "text-success"}`} />
              <p className={`text-xl font-serif font-bold ${netVat > 0 ? "text-destructive" : "text-success"}`}>{kes(Math.abs(netVat))}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {netVat > 0.005 ? "You owe KRA" : netVat < -0.005 ? "KRA owes you (credit carried forward)" : "Nil position"}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Figures reflect only what is recorded in this system. Confirm against your KRA iTax VAT return before filing.
          </p>
        </TabsContent>

        {/* ───────── Trial Balance ───────── */}
        <TabsContent value="trial">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h3 className="text-xl font-serif">Trial Balance</h3>
              <p className="text-xs text-muted-foreground mt-1">Every ledger account's balance. Total debits must equal total credits.</p>
            </div>
            <span className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border ${balanced ? "text-success border-success/30 bg-success/10" : "text-destructive border-destructive/30 bg-destructive/10"}`}>
              {balanced ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              {balanced ? "Balanced" : "Out of balance"}
            </span>
          </div>
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="grid grid-cols-[0.6fr_2.4fr_1fr_1fr_1fr] gap-3 px-5 py-3 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
              <span>Code</span><span>Account</span><span>Type</span><span className="text-right">Debit</span><span className="text-right">Credit</span>
            </div>
            {tbRows.map(r => (
              <div key={r.id} className="grid grid-cols-[0.6fr_2.4fr_1fr_1fr_1fr] gap-3 px-5 py-3 text-sm border-b border-border/40 items-center">
                <span className="text-muted-foreground font-mono text-xs">{r.code}</span>
                <span>{r.name}</span>
                <span className="text-xs text-muted-foreground capitalize">{r.type}</span>
                <span className="text-right">{r.dr ? kes(r.dr) : "—"}</span>
                <span className="text-right">{r.cr ? kes(r.cr) : "—"}</span>
              </div>
            ))}
            <div className="grid grid-cols-[0.6fr_2.4fr_1fr_1fr_1fr] gap-3 px-5 py-3 text-sm font-semibold bg-secondary/20">
              <span /><span>Totals</span><span />
              <span className="text-right">{kes(tbDebit)}</span><span className="text-right">{kes(tbCredit)}</span>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ───────── Dialogs ───────── */}
      <Dialog open={purchaseOpen} onOpenChange={setPurchaseOpen}>
        <DialogContent className="glass-card border-border">
          <DialogHeader><DialogTitle className="font-serif text-2xl">Add Expense</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Date</Label><Input type="date" value={pf.purchaseDate} onChange={e => setPf(f => ({ ...f, purchaseDate: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Supplier</Label><Input value={pf.supplierName} onChange={e => setPf(f => ({ ...f, supplierName: e.target.value }))} placeholder="e.g. Kenya Power" /></div>
            </div>
            <div className="space-y-2"><Label>Description</Label><Input value={pf.description} onChange={e => setPf(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Office electricity — September" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Category</Label>
                <Select value={pf.category} onValueChange={v => setPf(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select></div>
              <div className="space-y-2"><Label>Payment</Label>
                <Select value={pf.paid} onValueChange={v => setPf(f => ({ ...f, paid: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid now</SelectItem>
                    <SelectItem value="credit">On credit (owe supplier)</SelectItem>
                  </SelectContent>
                </Select></div>
            </div>
            <AmountFields amount={pf.amount} vat={pf.vatAmount} onAmount={n => setPf(f => ({ ...f, amount: n }))} onVat={n => setPf(f => ({ ...f, vatAmount: n }))} />
            <MatterSelect value={pf.matterId} onChange={v => setPf(f => ({ ...f, matterId: v }))} matters={matters} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPurchaseOpen(false)}>Cancel</Button>
            <Button onClick={submitPurchase} className="bg-brand-gold text-primary-foreground">Save Expense</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={creditorOpen} onOpenChange={setCreditorOpen}>
        <DialogContent className="glass-card border-border">
          <DialogHeader><DialogTitle className="font-serif text-2xl">Add Creditor</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Supplier</Label><Input value={cf.supplierName} onChange={e => setCf(f => ({ ...f, supplierName: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Invoice ref</Label><Input value={cf.invoiceRef} onChange={e => setCf(f => ({ ...f, invoiceRef: e.target.value }))} /></div>
            </div>
            <AmountFields amount={cf.amount} vat={cf.vatAmount} onAmount={n => setCf(f => ({ ...f, amount: n }))} onVat={n => setCf(f => ({ ...f, vatAmount: n }))} />
            <div className="space-y-2"><Label>Due date</Label><Input type="date" value={cf.dueDate} onChange={e => setCf(f => ({ ...f, dueDate: e.target.value }))} /></div>
            <MatterSelect value={cf.matterId} onChange={v => setCf(f => ({ ...f, matterId: v }))} matters={matters} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreditorOpen(false)}>Cancel</Button>
            <Button onClick={submitCreditor} className="bg-brand-gold text-primary-foreground">Save Creditor</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={debtorOpen} onOpenChange={setDebtorOpen}>
        <DialogContent className="glass-card border-border">
          <DialogHeader><DialogTitle className="font-serif text-2xl">Add Debtor</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Client</Label><Input value={df.clientName} onChange={e => setDf(f => ({ ...f, clientName: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Fee note / invoice ref</Label><Input value={df.invoiceRef} onChange={e => setDf(f => ({ ...f, invoiceRef: e.target.value }))} /></div>
            </div>
            <AmountFields amount={df.amount} vat={df.vatAmount} onAmount={n => setDf(f => ({ ...f, amount: n }))} onVat={n => setDf(f => ({ ...f, vatAmount: n }))} />
            <div className="space-y-2"><Label>Due date</Label><Input type="date" value={df.dueDate} onChange={e => setDf(f => ({ ...f, dueDate: e.target.value }))} /></div>
            <MatterSelect value={df.matterId} onChange={v => setDf(f => ({ ...f, matterId: v }))} matters={matters} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDebtorOpen(false)}>Cancel</Button>
            <Button onClick={submitDebtor} className="bg-brand-gold text-primary-foreground">Save Debtor</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pay} onOpenChange={o => { if (!o) { setPay(null); setPayAmount(0); } }}>
        <DialogContent className="glass-card border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">{pay?.kind === "creditor" ? "Record Payment" : "Record Receipt"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">{pay?.name} — outstanding {pay ? kes(pay.balance) : ""}</p>
            <div className="space-y-2"><Label>Amount (KES)</Label>
              <Input type="number" value={payAmount || ""} onChange={e => setPayAmount(Number(e.target.value))} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setPay(null); setPayAmount(0); }}>Cancel</Button>
            <Button onClick={submitPay} className="bg-brand-gold text-primary-foreground">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
