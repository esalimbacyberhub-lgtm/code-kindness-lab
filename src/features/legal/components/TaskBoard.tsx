import { useState, type DragEvent } from "react";
import type { Task, TaskStatus } from "../types";
import { cn } from "@/lib/utils";

const COLUMNS: { key: TaskStatus; title: string; dot: string }[] = [
  { key: "todo", title: "To Do", dot: "bg-warning" },
  { key: "inprogress", title: "In Progress", dot: "bg-accent" },
  { key: "review", title: "Review", dot: "bg-primary" },
  { key: "done", title: "Done", dot: "bg-success" },
];

const PRIORITY_BORDER: Record<Task["priority"], string> = {
  high: "border-l-destructive",
  medium: "border-l-warning",
  low: "border-l-success",
};

interface Props {
  tasks: Task[];
  onMove: (id: string, status: TaskStatus) => void;
}

export function TaskBoard({ tasks, onMove }: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<TaskStatus | null>(null);

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

  return (
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
            </div>
            <div className="space-y-2">
              {items.map(t => (
                <article
                  key={t.id}
                  draggable
                  onDragStart={handleDragStart(t.id)}
                  onDragEnd={() => setDraggingId(null)}
                  className={cn(
                    "bg-secondary/40 hover:bg-secondary/60 rounded-xl p-3 border-l-[3px] cursor-grab active:cursor-grabbing transition",
                    PRIORITY_BORDER[t.priority],
                    draggingId === t.id && "opacity-40"
                  )}
                >
                  <p className="text-sm font-medium leading-snug">{t.title}</p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="truncate max-w-[60%]">{t.matter}</span>
                    <time>{new Date(t.due).toLocaleDateString()}</time>
                  </div>
                </article>
              ))}
              {items.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">Drop tasks here</p>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
