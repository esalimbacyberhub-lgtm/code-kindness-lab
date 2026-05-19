import { Plus, Download, Calendar as CalIcon, Gavel, FileText, AlertCircle, Scale, Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PriorityWidgets } from "../components/PriorityWidgets";
import { TaskBoard } from "../components/TaskBoard";
import type { Task, TaskStatus, Deadline } from "../types";

interface Props {
  tasks: Task[];
  deadlines?: Deadline[];
  matters?: any[];
  invoices?: any[];
  onMoveTask: (id: string, status: TaskStatus) => void;
  onAddTask?: (t: Omit<Task, "id">) => void;
  onDeleteTask?: (id: string) => void;
  onNewMatter: () => void;
  onGoToCalendar?: () => void;
  onGoToMatters?: () => void;
}

const TYPE_ICON: Record<string, typeof Gavel> = {
  hearing:  Gavel,
  filing:   FileText,
  mention:  CalIcon,
  ruling:   Scale,
  deadline: AlertCircle,
  lsk:      Building2,
};

const TYPE_STYLE: Record<string, string> = {
  hearing:  "text-primary bg-primary/10 border-primary/30",
  filing:   "text-info bg-info/10 border-info/30",
  mention:  "text-accent bg-accent/10 border-accent/30",
  ruling:   "text-destructive bg-destructive/10 border-destructive/30",
  deadline: "text-warning bg-warning/10 border-warning/30",
  lsk:      "text-success bg-success/10 border-success/30",
};

export function Dashboard({ tasks, deadlines = [], matters = [], invoices = [], onMoveTask, onAddTask, onDeleteTask, onNewMatter, onGoToCalendar, onGoToMatters }: Props) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const upcoming = [...deadlines]
    .filter(d => d.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);

  const daysUntil = (d: string) => {
    const diff = Math.ceil((new Date(d + "T00:00:00").getTime() - new Date().setHours(0,0,0,0)) / 86400000);
    if (diff === 0) return { label: "Today", color: "text-warning" };
    if (diff === 1) return { label: "Tomorrow", color: "text-warning" };
    if (diff <= 7)  return { label: `${diff}d`, color: "text-warning" };
    if (diff <= 14) return { label: `${diff}d`, color: "text-info" };
    return { label: `${diff}d`, color: "text-muted-foreground" };
  };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-end gap-4 mb-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-brand-gold/80 font-mono mb-2">
            Chambers · Nairobi
          </p>
          <h2 className="text-4xl font-serif tracking-tight">
            Command <span className="text-gradient-gold">Deck</span>
          </h2>
        </div>
        <div className="flex gap-2">
          <Button onClick={onNewMatter} className="bg-brand-gold text-primary-foreground hover:bg-brand-gold/90 shadow-[0_8px_24px_-8px_hsl(43_70%_48%/0.6)]">
            <Plus className="w-4 h-4 mr-2" /> New Matter
          </Button>
          <Button variant="outline" className="border-brand-gold/30 hover:bg-brand-gold/10 text-foreground">
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
        </div>
      </div>
      <div className="gold-divider my-6" />
      <PriorityWidgets tasks={tasks} matters={matters} deadlines={deadlines} invoices={invoices} onGoToCalendar={onGoToCalendar} onGoToMatters={onGoToMatters} />

      {/* ── Upcoming Court Dates (auto-pulled from Calendar) ── */}
      <div className="glass-card rounded-2xl p-5 my-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalIcon className="w-4 h-4 text-brand-gold" />
            <h3 className="font-semibold text-sm">Upcoming Court Dates &amp; Deadlines</h3>
            {upcoming.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-gold/15 text-brand-gold font-bold">
                {upcoming.length}
              </span>
            )}
          </div>
          {onGoToCalendar && (
            <button onClick={onGoToCalendar} className="flex items-center gap-1 text-xs text-brand-gold hover:underline">
              View calendar <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {upcoming.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <CalIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No upcoming court dates.</p>
            <p className="text-xs mt-1">Add deadlines from Calendar &amp; Deadlines.</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {upcoming.map(d => {
              const Icon = TYPE_ICON[d.type] || CalIcon;
              const dc = daysUntil(d.date);
              return (
                <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-all border-l-4 border-l-brand-gold/40">
                  <div className={"w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 " + (TYPE_STYLE[d.type] || TYPE_STYLE.deadline)}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{d.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {d.court}{d.matter && d.matter !== "General" ? ` · ${d.matter}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-brand-gold">
                      {new Date(d.date + "T00:00:00").toLocaleDateString("en-KE", { day: "numeric", month: "short" })}
                    </p>
                    <p className={"text-[10px] uppercase font-bold " + dc.color}>{dc.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <TaskBoard tasks={tasks} matters={matters} onMove={onMoveTask} onAdd={onAddTask} onDelete={onDeleteTask} />
    </div>
  );
}
