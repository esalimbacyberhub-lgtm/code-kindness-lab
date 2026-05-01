import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, AlertTriangle, Gavel, FileText, Megaphone, Scale, Users2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NewDeadlineDialog } from "../components/NewDeadlineDialog";
import type { Deadline, DeadlineType, Matter } from "../types";

interface Props {
  deadlines: Deadline[];
  matters: Matter[];
  onCreate: (d: Omit<Deadline, "id">) => void;
  onRemove: (id: string) => void;
}

const TYPE_META: Record<DeadlineType, { label: string; dot: string; chip: string; Icon: typeof Gavel }> = {
  hearing: { label: "Hearing", dot: "bg-primary", chip: "bg-primary/15 text-primary border-primary/30", Icon: Gavel },
  filing: { label: "Filing", dot: "bg-info", chip: "bg-info/15 text-info border-info/30", Icon: FileText },
  mention: { label: "Mention", dot: "bg-warning", chip: "bg-warning/15 text-warning border-warning/30", Icon: Megaphone },
  ruling: { label: "Ruling", dot: "bg-accent", chip: "bg-accent/15 text-accent border-accent/30", Icon: Scale },
  lsk: { label: "LSK Event", dot: "bg-success", chip: "bg-success/15 text-success border-success/30", Icon: Users2 },
};

const startOfDay = (d: Date) => {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x;
};
const today = startOfDay(new Date());

function buildMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay(); // 0 Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < startWeekday; i++) {
    const d = new Date(year, month, -(startWeekday - 1 - i));
    cells.push({ date: d, inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(year, month, d), inMonth: true });
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false });
  }
  if (cells.length < 42) {
    const last = cells[cells.length - 1].date;
    for (let i = 1; cells.length < 42; i++) {
      cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + i), inMonth: false });
    }
  }
  return cells;
}

const fmtKey = (d: Date) => d.toISOString().slice(0, 10);
const longDate = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("en-KE", {
  weekday: "short", day: "2-digit", month: "short", year: "numeric",
});

function urgencyDays(iso: string) {
  const target = startOfDay(new Date(iso + "T00:00:00"));
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function CalendarView({ deadlines, matters, onCreate, onRemove }: Props) {
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [open, setOpen] = useState(false);
  const [defaultDate, setDefaultDate] = useState<string | undefined>();

  const grid = useMemo(() => buildMonthGrid(cursor.y, cursor.m), [cursor]);
  const byDate = useMemo(() => {
    const map = new Map<string, Deadline[]>();
    deadlines.forEach(d => {
      const arr = map.get(d.date) ?? [];
      arr.push(d); map.set(d.date, arr);
    });
    return map;
  }, [deadlines]);

  const upcoming = useMemo(() =>
    [...deadlines].sort((a, b) => a.date.localeCompare(b.date)),
    [deadlines]
  );

  const monthLabel = new Date(cursor.y, cursor.m, 1).toLocaleDateString("en-KE", { month: "long", year: "numeric" });
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const openCreate = (iso?: string) => { setDefaultDate(iso); setOpen(true); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-brand-gold/80 font-mono mb-1">Docket</p>
          <h1 className="text-3xl md:text-4xl font-serif">Calendar &amp; Deadlines</h1>
          <p className="text-sm text-muted-foreground mt-1">Hearings, filings, mentions, rulings and LSK events.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 glass-card rounded-lg p-1">
            <Button variant="ghost" size="icon" aria-label="Previous month"
              onClick={() => setCursor(({ y, m }) => m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 })}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <button
              onClick={() => setCursor({ y: now.getFullYear(), m: now.getMonth() })}
              className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider hover:text-brand-gold transition"
            >Today</button>
            <Button variant="ghost" size="icon" aria-label="Next month"
              onClick={() => setCursor(({ y, m }) => m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 })}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <Button onClick={() => openCreate()} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4" /> New Deadline
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(TYPE_META) as DeadlineType[]).map(k => {
          const meta = TYPE_META[k];
          return (
            <span key={k} className={cn("inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider px-2 py-1 rounded border", meta.chip)}>
              <span className={cn("w-1.5 h-1.5 rounded-full", meta.dot)} />{meta.label}
            </span>
          );
        })}
        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider px-2 py-1 rounded border bg-destructive/15 text-destructive border-destructive/30">
          <AlertTriangle className="w-3 h-3" /> Overdue
        </span>
      </div>

      {/* Calendar grid */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="font-serif text-xl">{monthLabel}</h2>
          <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
            {deadlines.filter(d => d.date.startsWith(`${cursor.y}-${String(cursor.m + 1).padStart(2, "0")}`)).length} this month
          </p>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekdays.map(w => (
            <div key={w} className="text-[10px] font-mono uppercase tracking-wider text-brand-gold/70 text-center py-2">{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map(({ date, inMonth }, i) => {
            const key = fmtKey(date);
            const items = byDate.get(key) ?? [];
            const isToday = startOfDay(date).getTime() === today.getTime();
            return (
              <button
                key={i}
                onClick={() => openCreate(key)}
                className={cn(
                  "min-h-[84px] sm:min-h-[96px] rounded-lg p-1.5 text-left border transition relative group",
                  inMonth ? "bg-card/40 border-border/60 hover:border-brand-gold/50" : "bg-card/10 border-transparent text-muted-foreground/50",
                  isToday && "ring-1 ring-brand-gold border-brand-gold/60"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "text-xs font-mono",
                    isToday && "inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-gold text-primary-foreground"
                  )}>{date.getDate()}</span>
                  {items.length > 2 && (
                    <span className="text-[9px] font-mono text-muted-foreground">+{items.length - 2}</span>
                  )}
                </div>
                <div className="space-y-0.5 mt-1">
                  {items.slice(0, 2).map(d => {
                    const meta = TYPE_META[d.type];
                    const overdue = urgencyDays(d.date) < 0;
                    return (
                      <div
                        key={d.id}
                        className={cn(
                          "flex items-center gap-1 text-[10px] truncate rounded px-1 py-0.5",
                          overdue ? "bg-destructive/20 text-destructive" : meta.chip
                        )}
                        title={d.title}
                      >
                        <span className={cn("w-1 h-1 rounded-full shrink-0", overdue ? "bg-destructive" : meta.dot)} />
                        <span className="truncate">{d.title}</span>
                      </div>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Upcoming list */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl">Upcoming Deadlines</h2>
          <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">{upcoming.length} total</span>
        </div>
        {upcoming.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            No deadlines on the docket. Click any day or <span className="text-brand-gold">New Deadline</span> to add one.
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {upcoming.map(d => {
              const days = urgencyDays(d.date);
              const overdue = days < 0;
              const soon = days >= 0 && days <= 7;
              const meta = TYPE_META[d.type];
              const Icon = meta.Icon;
              return (
                <li key={d.id} className="flex items-center gap-4 py-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border",
                    overdue ? "bg-destructive/15 text-destructive border-destructive/30" : meta.chip
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{d.title}</p>
                      <span className={cn("text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border", meta.chip)}>
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {d.matter} · {d.court}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-mono">{longDate(d.date)}</p>
                    <p className={cn(
                      "text-[11px] font-mono uppercase tracking-wider mt-0.5",
                      overdue ? "text-destructive" : soon ? "text-warning" : "text-muted-foreground"
                    )}>
                      {overdue ? `${Math.abs(days)}d overdue` : days === 0 ? "Today" : days === 1 ? "Tomorrow" : `in ${days}d`}
                    </p>
                  </div>
                  <button
                    onClick={() => onRemove(d.id)}
                    className="opacity-50 hover:opacity-100 hover:text-destructive transition p-1"
                    aria-label="Remove deadline"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <NewDeadlineDialog
        open={open}
        onOpenChange={setOpen}
        onCreate={onCreate}
        matters={matters}
        defaultDate={defaultDate}
      />
    </div>
  );
}