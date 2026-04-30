import { CalendarDays, AlertTriangle, Clock, Coins } from "lucide-react";
import type { Task } from "../types";

interface Props { tasks: Task[] }

export function PriorityWidgets({ tasks }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = tasks.filter(t => t.due.startsWith(today)).length;
  const highCount = tasks.filter(t => t.priority === "high" && t.status !== "done").length;
  const pendingCount = tasks.filter(t => t.status !== "done").length;
  const billables = pendingCount * 12500; // demo

  const items = [
    { label: "Today", value: todayCount, sub: "Due today", Icon: CalendarDays, tone: "accent" as const },
    { label: "High", value: highCount, sub: "Urgent", Icon: AlertTriangle, tone: "destructive" as const },
    { label: "Pending", value: pendingCount, sub: "Awaiting", Icon: Clock, tone: "warning" as const },
    { label: "Billables", value: `KES ${billables.toLocaleString()}`, sub: `${(pendingCount * 1.5).toFixed(1)} hrs`, Icon: Coins, tone: "primary" as const },
  ];

  const toneClasses: Record<string, string> = {
    accent: "from-accent/10 to-accent/5 border-accent/20 [&_.icon-bg]:bg-accent/20 [&_.icon]:text-accent [&_.label]:text-accent",
    destructive: "from-destructive/10 to-destructive/5 border-destructive/20 [&_.icon-bg]:bg-destructive/20 [&_.icon]:text-destructive [&_.label]:text-destructive",
    warning: "from-warning/10 to-warning/5 border-warning/20 [&_.icon-bg]:bg-warning/20 [&_.icon]:text-warning [&_.label]:text-warning",
    primary: "from-primary/10 to-primary/5 border-primary/20 [&_.icon-bg]:bg-primary/20 [&_.icon]:text-primary [&_.label]:text-primary",
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {items.map(({ label, value, sub, Icon, tone }) => (
        <div
          key={label}
          className={`glass-card rounded-xl p-3 flex flex-col items-center justify-center text-center bg-gradient-to-br ${toneClasses[tone]}`}
        >
          <div className="icon-bg w-9 h-9 rounded-full flex items-center justify-center mb-2">
            <Icon className="icon w-4 h-4" />
          </div>
          <div className="label text-[10px] uppercase font-semibold tracking-wider">{label}</div>
          <div className="text-lg sm:text-xl font-bold leading-tight mt-0.5">{value}</div>
          <div className="text-[10px] text-muted-foreground truncate w-full px-1">{sub}</div>
        </div>
      ))}
    </div>
  );
}
