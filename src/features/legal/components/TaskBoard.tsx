import { useState, type DragEvent } from "react";
import { Plus, Trash2, Gavel, CalendarClock, Coins, CheckCircle2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Task, TaskStatus } from "../types";
import { cn } from "@/lib/utils";

const COLUMNS: { key: TaskStatus; title: string; subtitle: string; dot: string }[] = [
  { key: "todo",       title: "To Do",       subtitle: "Scheduled work",   dot: "bg-warning" },
  { key: "inprogress", title: "In Progress", subtitle: "Active on cases",  dot: "bg-accent" },
  { key: "review",     title: "Review",      subtitle: "Pending checks",   dot: "bg-primary" },
  { key: "done",       title: "Done",        subtitle: "Completed",        dot: "bg-success" },
];

const PRIORITY_BORDER: Record<Task["priority"], string> = {
  high:   "border-l-destructive",
  medium: "border-l-warning",
  low:    "border-l-success",
};

interface AutoItem {
  id: string;
  kind: "hearing" | "deadline" | "matter-done" | "invoice";
  status: TaskStatus;
  title: string;
  subtitle: string;
  date: string;
}

const AUTO_STYLES: Record<AutoItem["kind"], { Icon: typeof Gavel; label: string; cls: string }> = {
  "hearing":     { Icon: Gavel,         label: "Hearing",  cls: "border-l-info bg-info/5"             },
  "deadline":    { Icon: CalendarClock, label: "Deadline", cls: "border-l-warning bg-warning/5"       },
  "invoice":     { Icon: Coins,         label: "Invoice",  cls: "border-l-destructive bg-destructive/5" },
  "matter-done": { Icon: CheckCircle2,  label: "Closed",   cls: "border-l-success bg-success/5"       },
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

function deriveAutoItems(deadlines: any[], matters: any[], invoices: any[]): AutoItem[] {
  const today = new Date().toISOString().slice(0, 10);
  const inSeven = new Date();
  inSeven.setDate(inSeven.getDate() + 7);
  const sevenStr = inSeven.toISOString().slice(0, 10);
  const items: AutoItem[] = [];

  deadlines.forEach((d: any) => {
    let status: TaskStatus | null = null;
    if (d.date === today)                       status = "inprogress";
    else if (d.date < today)                    status = "review";
    else if (d.date <= sevenStr)                status = "todo";
    if (!status) return;
    items.push({
      id: `auto-d-${d.id}`,
      kind: d.type === "hearing" || d.type === "mention" ? "hearing" : "deadline",
      status,
      title: d.title,
      subtitle: [d.court, d.matter && d.matter !== "General" ? d.matter : null].filter(Boolean).join(" \u00b7 "),
      date: d.date,
    });
  });

  matters.filter((m: any) => m.caseStatus === "completed").forEach((m: any) => {
    items.push({
      id: `auto-m-${m.id}`,
      kind: "matter-done",
      status: "done",
      title: `${m.title}${m.result ? " \u2014 " + String(m.result).toUpperCase() : ""}`,
      subtitle: [m.fileNo, m.client].filter(Boolean).join(" \u00b7 "),
      date: m.resultDate || "",
    });
  });

  invoices.forEach((i: any) => {
    const isOverdue =
      i.status === "overdue" ||
      (i.dueDate && i.dueDate < today && i.status !== "paid");
    if (!isOverdue) return;
    items.push({
      id: `auto-i-${i.id}`,
      kind: "invoice",
      status: "review",
      title: `Follow up: ${i.matter || i.client || "Invoice"}`,
      subtitle: `KES ${(Number(i.amount) || Number(i.total) || 0).toLocaleString("en-KE")} overdue`,
      date: i.dueDate || "",
    });
  });

  return items;
}

export function TaskBoard({ tasks, matters = [], deadlines = [], invoices = [], onMove, onAdd, onDelete }: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<TaskStatus | null>(null);
  const [addCol, setAddCol] = useState<TaskStatus | null>(null);
  const [form, setForm] = useState<Omit<Task, "id">>(BLANK);

  const autoItems = deriveAutoItems(deadlines, matters, invoices);

  const handleDragStart = (id: string) => (e: DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    setDraggingId(id);
  };
  const handleDragOver = (col: TaskStatus) => (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverCol(col);
  };
  const handleDrop = (col: TaskStatus) => (e: DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id && !id.startsWith("auto-")) onMove(id, col);
    setDraggingId(null);
    setOverCol(null);
  };

  const openAdd = (col: TaskStatus) => {
    setForm({ ...BLANK, status: col });
    setAddCol(col);
  };

  const submitAdd = () => {
    if (!form.title.trim()) return;
    onAdd?.(form);
    setForm(BLANK);
    setAddCol(null);
  };

  return (
    <>
      <section aria-label="Task board" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map(col => {
          const items = tasks.filter(t => t.status === col.key);
          const autos = autoItems.filter(a => a.status === col.key);
          return (
            <div
              key={col.key}
              onDragOver={handleDragOver(col.key)}
              onDragLeave={() => setOverCol(null)}
              onDrop={handleDrop(col.key)}
              className={cn(
                "rounded-2xl border border-border/50 bg-card/30 p-3 min-h-[320px] transition",
                overCol === col.key && "border-primary/60 bg-primary/5"
              )}
            >
              <div className="flex justify-between items-start mb-3 px-1">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", col.dot)} />
                    {col.title}
                    <span className="text-xs bg-secondary/60 px-2 py-0.5 rounded-full text-muted-foreground">{items.length + autos.length}</span>
                  </h3>
                  <p className="text-[10px] text-muted-foreground/80 mt-0.5 ml-4 font-mono uppercase tracking-wider">{col.subtitle}</p>
                </div>
                {onAdd && (
                  <button
                    onClick={() => openAdd(col.key)}
                    className="text-muted-foreground hover:text-brand-gold transition w-6 h-6 rounded flex items-center justify-center hover:bg-brand-gold/10 shrink-0"
                    title={`Add to ${col.title}`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {/* Manual tasks (draggable) */}
                {items.map(t => (
                  <article
                    key={t.id}
                    draggable
                    onDragStart={handleDragStart(t.id)}
                    onDragEnd={() => setDraggingId(null)}
                    className={cn(
                      "bg-secondary/40 hover:bg-secondary/60 rounded-xl p-3 border-l-[3px] cursor-grab active:cursor-grabbing transition group",
                      PRIORITY_BORDER[t.priority],
                      draggingId === t.id && "opacity-40"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-snug flex-1">{t.title}</p>
                      {onDelete && (
                        <button
                          onClick={(e) => { e.stopPropagation(); if (confirm(`Delete task "${t.title}"?`)) onDelete(t.id); }}
                          className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition shrink-0"
                          title="Delete task"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="truncate max-w-[60%]">{t.matter}</span>
                      {t.due && <time>{new Date(t.due).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}</time>}
                    </div>
                  </article>
                ))}

                {/* Separator if both kinds present */}
                {items.length > 0 && autos.length > 0 && (
                  <div className="flex items-center gap-2 my-2">
                    <div className="flex-1 h-px bg-border/40" />
                    <span className="text-[9px] uppercase tracking-widest text-muted-foreground/60 font-mono">Auto</span>
                    <div className="flex-1 h-px bg-border/40" />
                  </div>
                )}

                {/* Auto items (read-only) */}
                {autos.map(a => {
                  const style = AUTO_STYLES[a.kind];
                  const Icon = style.Icon;
                  return (
                    <article
                      key={a.id}
                      title="Auto-generated from your matters/calendar/invoices"
                      className={cn(
                        "rounded-xl p-3 border-l-[3px] opacity-90 cursor-default",
                        style.cls
                      )}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon className="w-3 h-3" />
                        <span className="text-[9px] uppercase tracking-widest font-bold font-mono">{style.label}</span>
                        <AlertTriangle className="w-2.5 h-2.5 text-muted-foreground/50 ml-auto" aria-label="Auto" />
                      </div>
                      <p className="text-sm font-medium leading-snug">{a.title}</p>
                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="truncate max-w-[60%]">{a.subtitle}</span>
                        {a.date && <time>{new Date(a.date).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}</time>}
                      </div>
                    </article>
                  );
                })}

                {items.length === 0 && autos.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">{onAdd ? "Tap + to add" : "Drop tasks here"}</p>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <Dialog open={!!addCol} onOpenChange={o => !o && setAddCol(null)}>
        <DialogContent className="glass-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              Add Task \u2014 {COLUMNS.find(c => c.key === addCol)?.title}
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
                <SelectTrigger><SelectValue placeholder="Link to a case\u2026" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">\u2014 No matter \u2014</SelectItem>
                  {matters.map((m: any) => (
                    <SelectItem key={m.id} value={m.title}>
                      {m.fileNo ? `${m.fileNo} \u00b7 ` : ""}{m.title}
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
            <Button variant="ghost" onClick={() => setAddCol(null)}>Cancel</Button>
            <Button onClick={submitAdd} disabled={!form.title.trim()} className="btn-royal">
              Add Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
