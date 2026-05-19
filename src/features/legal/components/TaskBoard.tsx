import { useState, type DragEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Task, TaskStatus } from "../types";
import { cn } from "@/lib/utils";

const COLUMNS: { key: TaskStatus; title: string; dot: string }[] = [
  { key: "todo",       title: "To Do",       dot: "bg-warning" },
  { key: "inprogress", title: "In Progress", dot: "bg-accent" },
  { key: "review",     title: "Review",      dot: "bg-primary" },
  { key: "done",       title: "Done",        dot: "bg-success" },
];

const PRIORITY_BORDER: Record<Task["priority"], string> = {
  high:   "border-l-destructive",
  medium: "border-l-warning",
  low:    "border-l-success",
};

interface Props {
  tasks: Task[];
  matters?: any[];
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

export function TaskBoard({ tasks, matters = [], onMove, onAdd, onDelete }: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<TaskStatus | null>(null);
  const [addCol, setAddCol] = useState<TaskStatus | null>(null);
  const [form, setForm] = useState<Omit<Task, "id">>(BLANK);

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
    if (id) onMove(id, col);
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
              <div className="flex justify-between items-center mb-3 px-1">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full", col.dot)} />
                  {col.title}
                  <span className="text-xs bg-secondary/60 px-2 py-0.5 rounded-full text-muted-foreground">{items.length}</span>
                </h3>
                {onAdd && (
                  <button
                    onClick={() => openAdd(col.key)}
                    className="text-muted-foreground hover:text-brand-gold transition w-6 h-6 rounded flex items-center justify-center hover:bg-brand-gold/10"
                    title={`Add to ${col.title}`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="space-y-2">
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
                {items.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">{onAdd ? "Tap + to add" : "Drop tasks here"}</p>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* Add Task Dialog */}
      <Dialog open={!!addCol} onOpenChange={o => !o && setAddCol(null)}>
        <DialogContent className="glass-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              Add Task — {COLUMNS.find(c => c.key === addCol)?.title}
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
