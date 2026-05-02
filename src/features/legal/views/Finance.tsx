import { useState } from "react";
import { Plus, TrendingUp, TrendingDown, Coins, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { LedgerEntry, Matter } from "../types";

interface Props { ledger: LedgerEntry[]; matters: Matter[]; onAdd: (e: Omit<LedgerEntry,"id">) => void; }

const TYPE_COLOR: Record<string,string> = {
  billable: "text-success bg-success/10 border-success/30",
  payment: "text-primary bg-primary/10 border-primary/30",
  disbursement: "text-destructive bg-destructive/10 border-destructive/30",
  trust: "text-brand-gold bg-brand-gold/10 border-brand-gold/30",
};

export function Finance({ ledger, matters, onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0,10), description: "", matter: "", debit: 0, credit: 0, type: "billable" as LedgerEntry["type"] });

  const totalDebit = ledger.reduce((a,e)=>a+e.debit,0);
  const totalCredit = ledger.reduce((a,e)=>a+e.credit,0);
  const net = totalDebit - totalCredit;
  const lsk = ledger.filter(e=>e.type==="billable").reduce((a,e)=>a+e.debit,0) * 0.01;

  const submit = () => {
    if (!form.description) return;
    onAdd(form);
    setForm({ date: new Date().toISOString().slice(0,10), description: "", matter: "", debit: 0, credit: 0, type: "billable" });
    setOpen(false);
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-brand-gold/80 font-mono mb-2">LSK Compliant</p>
          <h2 className="text-4xl font-serif">Financial <span className="text-gradient-gold">Ledger</span></h2>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-brand-gold text-primary-foreground hover:bg-brand-gold/90"><Plus className="w-4 h-4 mr-2" /> Add Entry</Button>
      </div>
      <div className="gold-divider mb-6" />

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Billables", val: `KES ${totalDebit.toLocaleString()}`, icon: TrendingUp, color: "text-success" },
          { label: "Total Disbursed", val: `KES ${totalCredit.toLocaleString()}`, icon: TrendingDown, color: "text-destructive" },
          { label: "Net Position", val: `KES ${net.toLocaleString()}`, icon: Coins, color: net >= 0 ? "text-success" : "text-destructive" },
          { label: "LSK 1% Remittance", val: `KES ${lsk.toLocaleString()}`, icon: Scale, color: "text-brand-gold" },
        ].map(c => (
          <div key={c.label} className="glass-card rounded-2xl p-4 text-center">
            <c.icon className={`w-5 h-5 mx-auto mb-2 ${c.color}`} />
            <p className={`text-xl font-serif font-bold ${c.color}`}>{c.val}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Ledger table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_2fr_1.5fr_1fr_1fr_auto] gap-3 px-5 py-3 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
          <span>Date</span><span>Description</span><span>Matter</span>
          <span className="text-right">Debit</span><span className="text-right">Credit</span><span>Type</span>
        </div>
        {ledger.length === 0 && (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">No ledger entries yet. Add your first entry.</div>
        )}
        {ledger.map(e => (
          <div key={e.id} className="grid grid-cols-[1fr_2fr_1.5fr_1fr_1fr_auto] gap-3 px-5 py-3 text-sm border-b border-border/40 hover:bg-secondary/20 items-center">
            <time className="text-muted-foreground text-xs">{e.date}</time>
            <span className="truncate">{e.description}</span>
            <span className="text-muted-foreground text-xs truncate">{e.matter}</span>
            <span className="text-right text-success font-medium">{e.debit ? `KES ${e.debit.toLocaleString()}` : "—"}</span>
            <span className="text-right text-destructive font-medium">{e.credit ? `KES ${e.credit.toLocaleString()}` : "—"}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${TYPE_COLOR[e.type]}`}>{e.type}</span>
          </div>
        ))}
        {ledger.length > 0 && (
          <div className="px-5 py-3 flex justify-between items-center text-sm font-semibold bg-secondary/20">
            <span>Net Balance</span>
            <span className={net >= 0 ? "text-success" : "text-destructive"}>KES {net.toLocaleString()}</span>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass-card border-border">
          <DialogHeader><DialogTitle className="font-serif text-2xl">Add Ledger Entry</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Type</Label>
              <Select value={form.type} onValueChange={v=>setForm(f=>({...f,type:v as LedgerEntry["type"]}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="billable">Billable (Office Account)</SelectItem>
                  <SelectItem value="payment">Payment Received</SelectItem>
                  <SelectItem value="disbursement">Disbursement</SelectItem>
                  <SelectItem value="trust">Trust Account</SelectItem>
                </SelectContent>
              </Select></div>
            <div className="space-y-2"><Label>Description</Label>
              <Input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="e.g. Professional fees — Kamau matter" /></div>
            <div className="space-y-2"><Label>Matter</Label>
              <Select value={form.matter} onValueChange={v=>setForm(f=>({...f,matter:v}))}>
                <SelectTrigger><SelectValue placeholder="Link to matter..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="General">General</SelectItem>
                  {matters.map(m=><SelectItem key={m.id} value={m.title}>{m.title}</SelectItem>)}
                </SelectContent>
              </Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Debit (KES)</Label>
                <Input type="number" value={form.debit||""} onChange={e=>setForm(f=>({...f,debit:Number(e.target.value)}))} placeholder="0" /></div>
              <div className="space-y-2"><Label>Credit (KES)</Label>
                <Input type="number" value={form.credit||""} onChange={e=>setForm(f=>({...f,credit:Number(e.target.value)}))} placeholder="0" /></div>
            </div>
            <div className="space-y-2"><Label>Date</Label>
              <Input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} className="bg-brand-gold text-primary-foreground">Save Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
