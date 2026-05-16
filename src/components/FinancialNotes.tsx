import { useState } from "react";
import { useSupabaseFinancialNotes } from "@/features/legal/hooks/useSupabaseFinancialNotes";
import { Plus, Trash2, FileText, Tag, Calendar as CalIcon, X, AlertCircle, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface FinancialNote {
  id: string;
  date: string;
  category: string;
  title: string;
  body: string;
  relatedRef?: string;
  createdAt: string;
}

const CATEGORIES = [
  { id: "audit",          label: "Audit Observation",   color: "bg-warning/15 text-warning border-warning/30" },
  { id: "trust",          label: "Trust Account",       color: "bg-info/15 text-info border-info/30" },
  { id: "reconciliation", label: "Reconciliation",      color: "bg-primary/15 text-primary border-primary/30" },
  { id: "compliance",     label: "Compliance / LSK",    color: "bg-destructive/15 text-destructive border-destructive/30" },
  { id: "tax",            label: "Tax / VAT / KRA",     color: "bg-accent/15 text-accent border-accent/30" },
  { id: "general",        label: "General",             color: "bg-secondary text-foreground border-border" },
];


const BLANK = { date: new Date().toISOString().slice(0,10), category: "general", title: "", body: "", relatedRef: "" };

const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export function FinancialNotes() {
  const { notes, addNote, updateNote, deleteNote } = useSupabaseFinancialNotes();
  
  const [open,  setOpen]  = useState(false);
  const [edit,  setEdit]  = useState<FinancialNote | null>(null);
  const [form,  setForm]  = useState(BLANK);
  const [filter,setFilter]= useState<string>("all");

  const set = <K extends keyof typeof BLANK>(k: K, v: (typeof BLANK)[K]) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.title.trim() || !form.body.trim()) return;
    if (edit) {
      await updateNote(edit.id, form);
    } else {
      await addNote(form);
    }
    setForm(BLANK); setEdit(null); setOpen(false);
  };

  const remove = async (id: string) => {
    if (confirm("Delete this note?")) await deleteNote(id);
  };

  const startEdit = (n: FinancialNote) => {
    setEdit(n);
    setForm({ date: n.date, category: n.category, title: n.title, body: n.body, relatedRef: n.relatedRef || "" });
    setOpen(true);
  };

  const startNew = () => {
    setEdit(null);
    setForm(BLANK);
    setOpen(true);
  };

  const filtered = filter === "all" ? notes : notes.filter(n => n.category === filter);
  const sorted = [...filtered].sort((a,b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const getCat = (id: string) => CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];

  return (
    <div>
      <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-primary/80 font-mono mb-2">Books &amp; Audit</p>
          <h3 className="text-2xl font-serif font-semibold">Financial <span className="text-gradient-blue">Notes</span></h3>
          <p className="text-xs text-muted-foreground mt-1">Record audit observations, trust account remarks, reconciliations &amp; compliance notes.</p>
        </div>
        <Button onClick={startNew} className="btn-royal"><Plus className="w-4 h-4 mr-2" /> New Note</Button>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <button onClick={() => setFilter("all")}
          className={cn("text-xs px-3 py-1.5 rounded-full border font-medium",
            filter === "all" ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40")}>
          All ({notes.length})
        </button>
        {CATEGORIES.map(c => {
          const count = notes.filter(n => n.category === c.id).length;
          if (count === 0) return null;
          return (
            <button key={c.id} onClick={() => setFilter(c.id)}
              className={cn("text-xs px-3 py-1.5 rounded-full border font-medium",
                filter === c.id ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40")}>
              {c.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Notes list */}
      {sorted.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-semibold mb-1">No financial notes yet</p>
          <p className="text-xs">Click "New Note" to record an audit observation, trust account remark, or any financial commentary.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(n => {
            const cat = getCat(n.category);
            return (
              <div key={n.id} className="glass-card rounded-xl p-4 border-l-4 border-l-primary/40 hover:border-l-primary transition-all">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase", cat.color)}>
                        <Tag className="w-2.5 h-2.5 inline mr-1" />{cat.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <CalIcon className="w-3 h-3" /> {fmtDate(n.date)}
                      </span>
                      {n.relatedRef && (
                        <span className="text-[10px] font-mono bg-secondary/40 px-2 py-0.5 rounded text-primary">
                          Ref: {n.relatedRef}
                        </span>
                      )}
                    </div>
                    <h4 className="font-semibold text-sm">{n.title}</h4>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => startEdit(n)} className="text-muted-foreground hover:text-primary p-1 rounded hover:bg-primary/10">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => remove(n.id)} className="text-muted-foreground hover:text-destructive p-1 rounded hover:bg-destructive/10">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed border-l-2 border-border pl-3 italic">
                  {n.body}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={o => { if (!o) { setForm(BLANK); setEdit(null); } setOpen(o); }}>
        <DialogContent className="glass-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">
              {edit ? "Edit Financial Note" : "New Financial Note"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date *</Label>
                <Input type="date" value={form.date} onChange={e => set("date", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={v => set("category", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Title / Subject *</Label>
              <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Trust Account reconciliation March 2026" />
            </div>
            <div className="space-y-1.5">
              <Label>Note / Observation *</Label>
              <textarea value={form.body} onChange={e => set("body", e.target.value)} rows={6}
                placeholder="e.g. Reconciled trust account ledger with bank statement. Difference of KES 1,200 noted on 14 March - to verify with bank. All client funds properly segregated."
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary resize-none" />
            </div>
            <div className="space-y-1.5">
              <Label>Related Reference (optional)</Label>
              <Input value={form.relatedRef} onChange={e => set("relatedRef", e.target.value)}
                placeholder="e.g. INV-2026-001, FN/2026/003, Matter OM/COMM/2026/001" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setForm(BLANK); setEdit(null); setOpen(false); }}>Cancel</Button>
            <Button onClick={save} disabled={!form.title.trim() || !form.body.trim()} className="btn-royal">
              {edit ? "Save Changes" : "Add Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
