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
    { label: "Today", value: todayCount, sub: "Due today", Icon: CalendarDays, tone: "info" as const },
    { label: "Priority", value: highCount, sub: "Urgent", Icon: AlertTriangle, tone: "accent" as const },
    { label: "Pending", value: pendingCount, sub: "In progress", Icon: Clock, tone: "ivory" as const },
    { label: "Billables", value: `KES ${billables.toLocaleString()}`, sub: `${(pendingCount * 1.5).toFixed(1)} hrs`, Icon: Coins, tone: "gold" as const },
  ];

  const toneClasses: Record<string, string> = {
    info: "from-info/10 to-transparent border-info/25 [&_.icon-bg]:bg-info/20 [&_.icon]:text-info [&_.label]:text-info",
    accent: "from-accent/15 to-transparent border-accent/30 [&_.icon-bg]:bg-accent/20 [&_.icon]:text-accent [&_.label]:text-accent",
    ivory: "from-brand-ivory/10 to-transparent border-brand-ivory/20 [&_.icon-bg]:bg-brand-ivory/15 [&_.icon]:text-brand-ivory [&_.label]:text-brand-ivory",
    gold: "from-brand-gold/15 to-transparent border-brand-gold/30 [&_.icon-bg]:bg-brand-gold/20 [&_.icon]:text-brand-gold [&_.label]:text-brand-gold",
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {items.map(({ label, value, sub, Icon, tone }) => (
        <div
          key={label}
          className={`glass-card glass-card-hover rounded-xl p-4 flex flex-col items-center justify-center text-center bg-gradient-to-br ${toneClasses[tone]}`}
        >
          <div className="icon-bg w-10 h-10 rounded-full flex items-center justify-center mb-2">
            <Icon className="icon w-4.5 h-4.5" />
          </div>
          <div className="label text-[10px] uppercase font-semibold tracking-[0.15em]">{label}</div>
          <div className="text-xl sm:text-2xl font-serif font-semibold leading-tight mt-1">{value}</div>
          <div className="text-[10px] text-muted-foreground truncate w-full px-1">{sub}</div>
        </div>
      ))}
    </div>
  );
}
