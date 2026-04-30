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
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h2 className="text-3xl font-serif">Command Deck</h2>
        <div className="flex gap-2">
          <Button onClick={onNewMatter} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" /> New Matter
          </Button>
          <Button variant="secondary" className="bg-accent/15 text-accent hover:bg-accent/25 border-accent/20">
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>
      <PriorityWidgets tasks={tasks} />
      <TaskBoard tasks={tasks} onMove={onMoveTask} />
    </div>
  );
}
