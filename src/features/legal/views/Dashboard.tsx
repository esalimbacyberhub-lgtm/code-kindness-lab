import { Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PriorityWidgets } from "../components/PriorityWidgets";
import { TaskBoard } from "../components/TaskBoard";
import type { Task, TaskStatus } from "../types";

interface Props {
  tasks: Task[];
  onMoveTask: (id: string, status: TaskStatus) => void;
  onNewMatter: () => void;
}

export function Dashboard({ tasks, onMoveTask, onNewMatter }: Props) {
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
      <PriorityWidgets tasks={tasks} />
      <TaskBoard tasks={tasks} onMove={onMoveTask} />
    </div>
  );
}
