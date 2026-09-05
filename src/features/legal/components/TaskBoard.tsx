import { useState } from "react";
import { Plus, Trash2, Gavel, CalendarClock, Coins, AlertTriangle, ListTodo, Loader2, ClipboardCheck, PartyPopper, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Task, TaskStatus } from "../types";
import { cn } from "@/lib/utils";

const COLUMNS: { key: TaskStatus; label: string; subtitle: string; Icon: typeof ListTodo; tone: string }[] = [
  { key: "todo",       label: "To Do",       subtitle: "Scheduled work",   Icon: ListTodo,       tone: "info"   },
  { key: "inprogress", label: "In Progress", subtitle: "Active on cases",  Icon: Loader2,         tone: "accent" },
  { key: "review",     label: "Review",      subtitle: "Pending checks",   Icon: ClipboardCheck,  tone: "gold"   },
  { key: "done",       label: "Done",        subtitle: "Completed (24h)",  Icon: PartyPopper,     tone: "ivory"  },
];

const toneClasses: Record<string, string> = {
  info:   "from-info/10 to-transparent border-info/25 [&_.icon-bg]:bg-info/20 [&_.icon]:text-info [&_.label]:text-info",
  accent: "from-accent/15 to-transparent border-accent/30 [&_.icon-bg]:bg-accent/20 [&_.icon]:text-accent [&_.label]:text-accent",
  gold:   "from-brand-gold/15 to-transparent border-brand-gold/30 [&_.icon-bg]:bg-brand-gold/20 [&_.icon]:text-brand-gold [&_.label]:text-brand-gold",
  ivory:  "from-brand-ivory/10 to-transparent border-brand-ivory/20 [&_.icon-bg]:bg-brand-ivory/15 [&_.icon]:text-brand-ivory [&_.label]:text-brand-ivory",
};

const PRIORITY_BORDER: Record<Task["priority"], string> = {
  high:   "border-l-destructive",
  medium: "border-l-warning",
  low:    "border-l-success",
};

const DONE_VISIBLE_MS = 24 * 60 * 60 * 1000; // auto-hide Done tasks 24h after completion

function isRecentlyDone(updatedAt?: string): boolean {
  if (!updatedAt) return true;
  const ts = new Date(updatedAt).getTime();
  if (Number.isNaN(ts)) return true;
  return Date.now() - ts < DONE_VISIBLE_MS;
}

interface AutoItem {
  id: string;
  kind: "hearing" | "deadline" | "invoice";
  status: TaskStatus;
  title: string;
  subtitle: string;
  date: string;
}

const AUTO_STYLES: Record<AutoItem["kind"], { Icon: typeof Gavel; label: string; cls: string }> = {
  "hearing":  { Icon: Gavel,         label: "Hearing",  cls: "border-l-info bg-info/5"               },
  "deadline": { Icon: CalendarClock, label: "Deadline", cls: "border-l-warning bg-warning/5"         },
  "invoice":  { Icon: Coins,         label: "Invoice",  cls: "border-l-destructive bg-destructive/5" },
};

interface Props {
  tasks: Task[];
  matters?: any[];
  deadlines?: any[];
  invoices?: any[];
  onMove: (id: string, status: TaskStatus) => void;
  onAdd?: (t: Omit<Task, "id">) => void;
  onDelete?: (id: string) => void;
}

const BLANK: Omit<Task, "id"> = {
  title: "",
  matter: "",
  priority: "medium",
  status: "todo",
  due: "",
};

// NOTE: closed/completed matters are intentionally NOT surfaced here.
// Matter Hub's own "Closed" counter (matters.filter(m => m.status === "closed"))
// is the correct place for that — the Done column is for completed TASKS only.
function deriveAutoItems(deadlines: any[]): AutoItem[] {
  const today = new Date().toISOString().slice(0, 10);
  const inSeven = new Date();
  inSeven.setDate(inSeven.getDate() + 7);
  const sevenStr = inSeven.toISOString().slice(0, 10);
  const items: AutoItem[] = [];

  deadlines.forEach((d: any) => {
    let status: TaskStatus | null = null;
    if (d.date === today)        status = "inprogress";
    else if (d.date < today)     status = "review";
    else if (d.date <= sevenStr) status = "todo";
    if (!status) return;
    items.push({
      id: `auto-d-${d.id}`,
      kind: d.type === "hearing" || d.type === "mention" ? "hearing" : "deadline",
      status,
      title: d.title,
      subtitle: [d.court, d.matter && d.matter !== "General" ? d.matter : null].filter(Boolean).join(" · "),
      date: d.date,
    });
  });

  return items;
}

export function TaskBoard({ tasks, matters = [], deadlines = [], invoices = [], onMove, onAdd, onDelete }: Props) {
  const [openCol, setOpenCol] = useState<TaskStatus | null>(null);
  const [addingInOpen, setAddingInOpen] = useState(false);
  const [form, setForm] = useState<Omit<Task, "id">>(BLANK);

  const today = new Date().toISOString().slice(0, 10);
  const overdueInvoices = invoices.filter((i: any) =>
    i.status === "overdue" || (i.dueDate && i.dueDate < today && i.status !== "paid")
  );
  const invoiceAutoItems: AutoItem[] = overdueInvoices.map((i: any) => ({
    id: `auto-i-${i.id}`,
    kind: "invoice",
    status: "review" as TaskStatus,
    title: `Follow up: ${i.matter || i.client || "Invoice"}`,
    subtitle: `KES ${(Number(i.amount) || Number(i.total) || 0).toLocaleString("en-KE")} overdue`,
    date: i.dueDate || "",
  }));

  const deadlineAutoItems = deriveAutoItems(deadlines);
  const autoItems = [...deadlineAutoItems, ...invoiceAutoItems];

  const itemsFor = (col: TaskStatus) => {
    const manual = tasks
      .filter(t => t.status === col)
      .filter(t => col !== "done" || isRecentlyDone((t as any).updatedAt));
    const autos = autoItems.filter(a => a.status === col);
    return { manual, autos, total: manual.length + autos.length };
  };

  const openAdd = () => {
    setForm({ ...BLANK, status: openCol || "todo" });
    setAddingInOpen(true);
  };

  const submitAdd = () => {
    if (!form.title.trim()) return;
    onAdd?.(form);
    setForm(BLANK);
    setAddingInOpen(false);
  };

  const activeCol = COLUMNS.find(c => c.key === openCol);
  const activeData = openCol ? itemsFor(openCol) : null;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {COLUMNS.map(col => {
          const { total } = itemsFor(col.key);
          const Icon = col.Icon;
          return (
            <button
              key={col.key}
              onClick={() => setOpenCol(col.key)}
              className={cn(
                "glass-card glass-card-hover rounded-xl p-4 flex flex-col items-center justify-center text-center bg-gradient-to-br hover:scale-[1.02] transition cursor-pointer",
                toneClasses[col.tone],
              )}
            >
              <div className="icon-bg w-10 h-10 rounded-full flex items-center justify-center mb-2">
                <Icon className="icon w-4 h-4" />
              </div>
              <div className="label text-[10px] uppercase font-semibold tracking-[0.15em]">{col.label}</div>
              <div className="text-xl sm:text-2xl font-serif font-semibold leading-tight mt-1">{total}</div>
              <div className="text-[10px] text-muted-foreground truncate w-full px-1">{col.subtitle}</div>
            </button>
          );
        })}
      </div>

      <Dialog open={!!openCol} onOpenChange={o => !o && setOpenCol(null)}>
        <DialogContent className="glass-card max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center gap-2">
              {activeCol && <activeCol.Icon className="w-5 h-5" />}
              {activeCol?.label}
            </DialogTitle>
          </DialogHeader>

          {activeData && activeData.total === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nothing here right now.</p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {activeData?.manual.map(t => (
                <div key={t.id} className={cn("glass-card rounded-lg p-3 border-l-4", PRIORITY_BORDER[t.priority])}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm flex-1">{t.title}</p>
                    {onDelete && (
                      <button
                        onClick={() => { if (confirm(`Delete task "${t.title}"?`)) onDelete(t.id); }}
                        className="text-muted-foreground hover:text-destructive shrink-0"
                        title="Delete task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-xs text-muted-foreground truncate">{t.matter}</p>
                    {t.due && (
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                        {new Date(t.due).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <select
                      value={t.status}
                      onChange={e => onMove(t.id, e.target.value as TaskStatus)}
                      className="text-[11px] bg-background border border-border rounded px-1.5 py-0.5 text-muted-foreground"
                    >
                      {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                  </div>
                </div>
              ))}

              {activeData && activeData.manual.length > 0 && activeData.autos.length > 0 && (
                <div className="flex items-center gap-2 my-2">
                  <div className="flex-1 h-px bg-border/40" />
                  <span className="text-[9px] uppercase tracking-widest text-muted-foreground/60 font-mono">Auto</span>
                  <div className="flex-1 h-px bg-border/40" />
                </div>
              )}

              {activeData?.autos.map(a => {
                const style = AUTO_STYLES[a.kind];
                const Icon = style.Icon;
                return (
                  <div
                    key={a.id}
                    title="Auto-generated from your calendar/invoices"
                    className={cn("rounded-lg p-3 border-l-4 opacity-90", style.cls)}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className="w-3 h-3" />
                      <span className="text-[9px] uppercase tracking-widest font-bold font-mono">{style.label}</span>
                      <AlertTriangle className="w-2.5 h-2.5 text-muted-foreground/50 ml-auto" aria-label="Auto" />
                    </div>
                    <p className="text-sm font-medium leading-snug">{a.title}</p>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="truncate max-w-[60%]">{a.subtitle}</span>
                      {a.date && (
                        <time>{new Date(a.date).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}</time>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {onAdd && (
            <button
              onClick={openAdd}
              className="flex items-center gap-1 text-xs text-brand-gold hover:underline mt-2 self-start"
            >
              <Plus className="w-3.5 h-3.5" /> Add to {activeCol?.label}
            </button>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={addingInOpen} onOpenChange={o => !o && setAddingInOpen(false)}>
        <DialogContent className="glass-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              Add Task — {activeCol?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Task *</Label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Collect payment from Kamau"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label>Linked matter (optional)</Label>
              <Select
                value={form.matter || "__none"}
                onValueChange={v => setForm(f => ({ ...f, matter: v === "__none" ? "" : v }))}
              >
                <SelectTrigger><SelectValue placeholder="Link to a case…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— No matter —</SelectItem>
                  {matters.map((m: any) => (
                    <SelectItem key={m.id} value={m.title}>
                      {m.fileNo ? `${m.fileNo} · ` : ""}{m.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={v => setForm(f => ({ ...f, priority: v as Task["priority"] }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Due date</Label>
                <Input
                  type="date"
                  value={form.due}
                  onChange={e => setForm(f => ({ ...f, due: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddingInOpen(false)}>Cancel</Button>
            <Button onClick={submitAdd} disabled={!form.title.trim()} className="btn-royal">
              Add Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
