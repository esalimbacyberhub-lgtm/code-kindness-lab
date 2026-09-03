import { useState } from "react";
import { CalendarDays, AlertTriangle, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Task } from "../types";

interface Props {
  tasks: Task[];
  matters?: any[];
  deadlines?: any[];
  invoices?: any[];
  onGoToCalendar?: () => void;
  onGoToMatters?: () => void;
}

type PopupKind = null | "today" | "priority";

export function PriorityWidgets({ tasks, matters = [], deadlines = [], invoices = [], onGoToCalendar, onGoToMatters }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const threeDays = new Date();
  threeDays.setDate(threeDays.getDate() + 3);
  const threeDaysStr = threeDays.toISOString().slice(0, 10);
  const [popup, setPopup] = useState<PopupKind>(null);

  // ── TODAY: today's hearings/mentions/filings
  const todayDeadlines = deadlines.filter((d: any) => d.date === today);
  const todayCount = todayDeadlines.length;

  // ── PRIORITY: deadlines in next 3 days only
  const urgentDeadlines = deadlines.filter((d: any) => d.date >= today && d.date <= threeDaysStr);
  const priorityCount = urgentDeadlines.length;

  const cards = [
    { kind: "today" as const,     label: "Today",     value: todayCount,    sub: "Hearings & mentions", Icon: CalendarDays,  tone: "info"   },
    { kind: "priority" as const,  label: "Priority",  value: priorityCount, sub: "Deadlines (3 days)",  Icon: AlertTriangle, tone: "accent" },
  ];

  const toneClasses: Record<string, string> = {
    info:   "from-info/10 to-transparent border-info/25 [&_.icon-bg]:bg-info/20 [&_.icon]:text-info [&_.label]:text-info",
    accent: "from-accent/15 to-transparent border-accent/30 [&_.icon-bg]:bg-accent/20 [&_.icon]:text-accent [&_.label]:text-accent",
    ivory:  "from-brand-ivory/10 to-transparent border-brand-ivory/20 [&_.icon-bg]:bg-brand-ivory/15 [&_.icon]:text-brand-ivory [&_.label]:text-brand-ivory",
    gold:   "from-brand-gold/15 to-transparent border-brand-gold/30 [&_.icon-bg]:bg-brand-gold/20 [&_.icon]:text-brand-gold [&_.label]:text-brand-gold",
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {cards.map(({ kind, label, value, sub, Icon, tone }) => (
          <button
            key={label}
            onClick={() => setPopup(kind)}
            className={`glass-card glass-card-hover rounded-xl p-4 flex flex-col items-center justify-center text-center bg-gradient-to-br ${toneClasses[tone]} hover:scale-[1.02] transition cursor-pointer`}
          >
            <div className="icon-bg w-10 h-10 rounded-full flex items-center justify-center mb-2">
              <Icon className="icon w-4 h-4" />
            </div>
            <div className="label text-[10px] uppercase font-semibold tracking-[0.15em]">{label}</div>
            <div className="text-xl sm:text-2xl font-serif font-semibold leading-tight mt-1">{value}</div>
            <div className="text-[10px] text-muted-foreground truncate w-full px-1">{sub}</div>
          </button>
        ))}
      </div>

      {/* TODAY popup */}
      <Dialog open={popup === "today"} onOpenChange={o => !o && setPopup(null)}>
        <DialogContent className="glass-card max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-info" /> Today
            </DialogTitle>
          </DialogHeader>
          {todayDeadlines.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nothing scheduled for today.</p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {todayDeadlines.map((d: any) => (
                <div key={d.id} className="glass-card rounded-lg p-3 border-l-4 border-l-info">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm">{d.title}</p>
                    {d.time && <span className="text-xs font-bold text-info">{d.time}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{d.court}</p>
                  {d.mode === "online" && d.meetingLink ? (
                    <a href={d.meetingLink} target="_blank" rel="noopener noreferrer"
                       className="inline-flex items-center gap-1 mt-2 px-2 py-1 rounded bg-primary text-white text-[10px] font-bold">
                      Join meeting →
                    </a>
                  ) : (
                    <span className="inline-block mt-2 text-[10px] text-muted-foreground">📍 Physical</span>
                  )}
                </div>
              ))}
            </div>
          )}
          {onGoToCalendar && (
            <button onClick={() => { setPopup(null); onGoToCalendar(); }} className="flex items-center gap-1 text-xs text-brand-gold hover:underline mt-2 self-start">
              Open Calendar <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </DialogContent>
      </Dialog>

      {/* PRIORITY popup */}
      <Dialog open={popup === "priority"} onOpenChange={o => !o && setPopup(null)}>
        <DialogContent className="glass-card max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-accent" /> Urgent & Overdue
            </DialogTitle>
          </DialogHeader>
          {priorityCount === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No deadlines in the next 3 days.</p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {urgentDeadlines.map((d: any) => (
                <div key={d.id} className="glass-card rounded-lg p-3 border-l-4 border-l-accent">
                  <p className="font-semibold text-sm">{d.title}</p>
                  <p className="text-xs text-muted-foreground">{d.court} · {d.date}{d.time ? ` ${d.time}` : ""}</p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

    </>
  );
}
