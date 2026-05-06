import { useState } from "react";
import { Plus, UserCheck, BookOpen, Phone, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Witness, Matter } from "../types";
import { cn } from "@/lib/utils";

const STATUS_ICON = { confirmed: CheckCircle, pending: Clock, contacted: AlertCircle };
const STATUS_COLOR = { confirmed: "text-success", pending: "text-warning", contacted: "text-accent" };

interface Props { witnesses: Witness[]; matters: Matter[]; onAdd: (w: Omit<Witness,"id">) => void; onUpdateStatus: (id: string, s: Witness["status"]) => void; }

export function WitnessExperts({ witnesses, matters, onAdd, onUpdateStatus }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", type: "witness" as Witness["type"], matter: "", contact: "", status: "pending" as Witness["status"], expertise: "" });

  const experts = witnesses.filter(w => w.type === "expert");
  const witnessList = witnesses.filter(w => w.type === "witness");

  const submit = () => {
    if (!form.name) return;
    onAdd(form);
    setForm({ name: "", type: "witness", matter: "", contact: "", status: "pending", expertise: "" });
    setOpen(false);
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-brand-gold/80 font-mono mb-2">Case Support</p>
          <h2 className="text-4xl font-serif">Witness <span className="text-gradient-gold">&amp; Experts</span></h2>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-brand-gold text-primary-foreground hover:bg-brand-gold/90"><Plus className="w-4 h-4 mr-2" /> Add</Button>
      </div>
      <div className="gold-divider mb-6" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Expert Witnesses" icon={BookOpen} items={experts} matters={matters} onUpdateStatus={onUpdateStatus} />
        <Section title="Witnesses of Fact" icon={UserCheck} items={witnessList} matters={matters} onUpdateStatus={onUpdateStatus} />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass-card border-border">
          <DialogHeader><DialogTitle className="font-serif text-2xl">Add Witness / Expert</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Full Name</Label><Input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Dr. Jane Kamau" /></div>
            <div className="space-y-2"><Label>Type</Label>
              <Select value={form.type} onValueChange={v=>setForm(f=>({...f,type:v as Witness["type"]}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="witness">Witness of Fact</SelectItem><SelectItem value="expert">Expert Witness</SelectItem></SelectContent>
              </Select></div>
            {form.type === "expert" && <div className="space-y-2"><Label>Area of Expertise</Label><Input value={form.expertise} onChange={e=>setForm(f=>({...f,expertise:e.target.value}))} placeholder="e.g. Forensic Accounting" /></div>}
            <div className="space-y-2"><Label>Matter</Label>
              <Select value={form.matter} onValueChange={v=>setForm(f=>({...f,matter:v}))}>
                <SelectTrigger><SelectValue placeholder="Link to matter..." /></SelectTrigger>
                <SelectContent>{matters.map(m=><SelectItem key={m.id} value={m.title}>{m.title}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="space-y-2"><Label>Contact</Label><Input value={form.contact} onChange={e=>setForm(f=>({...f,contact:e.target.value}))} placeholder="Phone or email" /></div>
            <div className="space-y-2"><Label>Status</Label>
              <Select value={form.status} onValueChange={v=>setForm(f=>({...f,status:v as Witness["status"]}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="contacted">Contacted</SelectItem><SelectItem value="confirmed">Confirmed</SelectItem></SelectContent>
              </Select></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} className="bg-brand-gold text-primary-foreground">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Section({ title, icon: Icon, items, onUpdateStatus }: { title: string; icon: typeof UserCheck; items: Witness[]; matters: Matter[]; onUpdateStatus: (id:string, s:Witness["status"])=>void }) {
  return (
    <div>
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-3"><Icon className="w-4 h-4 text-brand-gold" /> {title} <span className="text-xs text-muted-foreground">({items.length})</span></h3>
      {items.length === 0
        ? <div className="glass-card rounded-xl p-6 text-center text-sm text-muted-foreground">No {title.toLowerCase()} added yet.</div>
        : <div className="space-y-2">
          {items.map(w => {
            const StatusIcon = STATUS_ICON[w.status];
            return (
              <div key={w.id} className="glass-card rounded-xl p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-gold/15 flex items-center justify-center font-serif text-brand-gold font-bold text-sm shrink-0">
                  {w.name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{w.name}</p>
                  {w.expertise && <p className="text-xs text-brand-gold">{w.expertise}</p>}
                  <p className="text-xs text-muted-foreground truncate">{w.matter}</p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground"><Phone className="w-3 h-3" />{w.contact}</div>
                </div>
                <Select value={w.status} onValueChange={v => onUpdateStatus(w.id, v as Witness["status"])}>
                  <SelectTrigger className="w-28 h-7 text-xs">
                    <div className={cn("flex items-center gap-1", STATUS_COLOR[w.status])}><StatusIcon className="w-3 h-3" /><span className="capitalize">{w.status}</span></div>
                  </SelectTrigger>
                  <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="contacted">Contacted</SelectItem><SelectItem value="confirmed">Confirmed</SelectItem></SelectContent>
                </Select>
              </div>
            );
          })}
        </div>
      }
    </div>
  );
}
