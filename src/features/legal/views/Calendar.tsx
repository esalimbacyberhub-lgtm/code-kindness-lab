import { useState } from "react";
import { Plus, Trash2, Calendar as CalIcon, Scale, FileText, Gavel, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Deadline, Matter } from "../types";
import { cn } from "@/lib/utils";

const TYPE_ICON = { hearing: Gavel, filing: FileText, mention: CalIcon, ruling: Scale, deadline: AlertCircle };
const TYPE_COLOR: Record<string, string> = {
  hearing: "text-accent bg-accent/10 border-accent/30",
  filing: "text-brand-gold bg-brand-gold/10 border-brand-gold/30",
  mention: "text-info bg-info/10 border-info/30",
  ruling: "text-destructive bg-destructive/10 border-destructive/30",
  deadline: "text-warning bg-warning/10 border-warning/30",
};

interface Props { deadlines: Deadline[]; matters: Matter[]; onAdd: (d: Omit<Deadline,"id">) => void; onDelete: (id: string) => void; }

export function Calendar({ deadlines, matters, onAdd, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", matter: "", court: "", date: "", type: "hearing" as Deadline["type"] });
  const today = new Date().toISOString().slice(0, 10);

  const sorted = [...deadlines].sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = sorted.filter(d => d.date >= today);
  const overdue = sorted.filter(d => d.date < today);

  const submit = () => {
    if (!form.title || !form.date) return;
    onAdd(form);
    setForm({ title: "", matter: "", court: "", date: "", type: "hearing" });
    setOpen(false);
  };

  const KENYAN_COURTS = ["Milimani Law Courts (Commercial Division)", "Milimani Law Courts (Family Division)", "Milimani Law Courts (Constitutional & HR)", "Milimani Criminal Courts", "Employment & Labour Relations Court", "Environment & Land Court Nairobi", "Makadara Law Courts", "Kibera Law Courts", "Mombasa Law Courts", "Kisumu Law Courts", "Nakuru Law Courts", "Eldoret Law Courts", "Nyeri Law Courts", "Court of Appeal Nairobi", "Supreme Court of Kenya", "Business Premises Rent Tribunal", "Rent Restriction Tribunal", "Cooperative Tribunal"];

  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-brand-gold/80 font-mono mb-2">Kenyan Judiciary</p>
          <h2 className="text-4xl font-serif">Calendar <span className="text-gradient-gold">&amp; Deadlines</span></h2>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-brand-gold text-primary-foreground hover:bg-brand-gold/90">
          <Plus className="w-4 h-4 mr-2" /> Add Deadline
        </Button>
      </div>
      <div className="gold-divider mb-6" />

      {overdue.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-destructive mb-3 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Overdue ({overdue.length})</h3>
          <div className="space-y-2">
            {overdue.map(d => <DeadlineRow key={d.id} d={d} onDelete={onDelete} overdue />)}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Upcoming ({upcoming.length})</h3>
        {upcoming.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 text-center text-sm text-muted-foreground">
            No upcoming deadlines. Add your first court date or filing deadline.
          </div>
        ) : (
          <div className="space-y-2">{upcoming.map(d => <DeadlineRow key={d.id} d={d} onDelete={onDelete} />)}</div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass-card border-border">
          <DialogHeader><DialogTitle className="font-serif text-2xl">Add Deadline</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Title</Label>
              <Input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="e.g. File Defence — Kamau v Njeri" /></div>
            <div className="space-y-2"><Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({...f, type: v as Deadline["type"]}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["hearing","filing","mention","ruling","deadline"].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="space-y-2"><Label>Court</Label>
              <Select value={form.court} onValueChange={v => setForm(f => ({...f, court: v}))}>
                <SelectTrigger><SelectValue placeholder="Select court..." /></SelectTrigger>
                <SelectContent>{KENYAN_COURTS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="space-y-2"><Label>Matter</Label>
              <Select value={form.matter} onValueChange={v => setForm(f => ({...f, matter: v}))}>
                <SelectTrigger><SelectValue placeholder="Link to matter..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="General">General (not linked)</SelectItem>
                  {matters.map(m => <SelectItem key={m.id} value={m.title}>{m.title}</SelectItem>)}
                </SelectContent>
              </Select></div>
            <div className="space-y-2"><Label>Date</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} className="bg-brand-gold text-primary-foreground">Save Deadline</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DeadlineRow({ d, onDelete, overdue = false }: { d: Deadline; onDelete: (id:string)=>void; overdue?: boolean }) {
  const Icon = TYPE_ICON[d.type] ?? CalIcon;
  return (
    <div className={cn("glass-card rounded-xl p-4 flex items-center gap-4", overdue && "border border-destructive/30")}>
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center text-xs border", TYPE_COLOR[d.type])}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{d.title}</p>
        <p className="text-xs text-muted-foreground truncate">{d.court}{d.matter && d.matter !== "General" ? ` · ${d.matter}` : ""}</p>
      </div>
      <div className="text-right shrink-0">
        <p className={cn("text-sm font-semibold", overdue ? "text-destructive" : "text-brand-gold")}>{new Date(d.date).toLocaleDateString("en-KE",{day:"numeric",month:"short",year:"numeric"})}</p>
        <p className="text-[10px] uppercase text-muted-foreground capitalize">{d.type}</p>
      </div>
      <button onClick={() => onDelete(d.id)} className="text-muted-foreground hover:text-destructive ml-1"><Trash2 className="w-4 h-4" /></button>
    </div>
  );
}
