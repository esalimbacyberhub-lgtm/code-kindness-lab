import { useState } from "react";
import { CalendarDays, AlertTriangle, ArrowRight, Gavel, FileText, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Task } from "../types";
import { formatDate } from "@/lib/formatDate";

interface Props {
  tasks: Task[];
  matters?: any[];
  deadlines?: any[];
  invoices?: any[];
  onGoToCalendar?: () => void;
  onGoToMatters?: () => void;
}

type PopupKind = null | "today" | "priority";
type Group = "Hearings" | "Mentions" | "Drafting" | "Other deadlines";

const GROUP_ORDER: Group[] = ["Hearings", "Mentions", "Drafting", "Other deadlines"];
const GROUP_ICON: Record<Group, typeof Gavel> = {
  "Hearings": Gavel,
  "Mentions": CalendarDays,
  "Drafting": FileText,
  "Other deadlines": AlertCircle,
};

// Deadlines created from a "Drafting" case activity are titled "Drafting — <matter>"
function groupOf(d: any): Group {
  if (String(d.title || "").toLowerCase().startsWith("drafting")) return "Drafting";
  if (d.type === "hearing") return "Hearings";
  if (d.type === "mention") return "Mentions";
  return "Other deadlines";
}

interface ListProps {
  items: any[];
  borderCls: string;
  showDate: boolean;
  showMeeting: boolean;
  onOpen: (d: any) => void;
}

function GroupedDeadlines({ items, borderCls, showDate, showMeeting, onOpen }: ListProps) {
  const groups = GROUP_ORDER
    .map(g => ({ g, rows: items.filter(d => groupOf(d) === g) }))
    .filter(x => x.rows.length > 0);

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto">
      {groups.map(({ g, rows }) => {
        const Icon = GROUP_ICON[g];
        return (
          <div key={g}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-muted-foreground">{g}</p>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/40 text-muted-foreground font-bold">{rows.length}</span>
            </div>
            <div className="space-y-2">
              {rows.map(d => (
                <div
                  key={d.id}
                  onClick={() => { if (d.matterId) onOpen(d); }}
                  className={`glass-card rounded-lg p-3 border-l-4 ${borderCls} ${d.matterId ? "cursor-pointer hover:bg-secondary/30" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm">{d.title}</p>
                    {d.time && <span className="text-xs font-bold text-muted-foreground">{d.time}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {[d.matter, d.court, showDate ? formatDate(d.date) : ""].filter(Boolean).join(" · ")}
                  </p>
                  {showMeeting && (
                    d.mode === "online" && d.meetingLink ? (
                      <a
                        href={d.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="inline-flex items-center gap-1 mt-2 px-2 py-1 rounded bg-primary text-white text-[10px] font-bold"
                      >
                        Join meeting →
                      </a>
                    ) : (
                      <span className="inline-block mt-2 text-[10px] text-muted-foreground">📍 Physical</span>
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PriorityWidgets({ tasks, matters = [], deadlines = [], invoices = [], onGoToCalendar, onGoToMatters }: Props) {
  const today = formatDate(new Date());
  const threeDays = new Date();
  threeDays.setDate(threeDays.getDate() + 3);
  const threeDaysStr = formatDate(threeDays);
  const [popup, setPopup] = useState<PopupKind>(null);

  const byDate = (a: any, b: any) =>
    String(a.date).localeCompare(String(b.date)) || String(a.time || "").localeCompare(String(b.time || ""));

  // TODAY: everything scheduled for today
  const todayDeadlines = deadlines.filter((d: any) => d.date === today).sort(byDate);
  const todayCount = todayDeadlines.length;

  // PRIORITY: deadlines in the next 3 days (including today)
  const urgentDeadlines = deadlines
    .filter((d: any) => d.date >= today && d.date <= threeDaysStr)
    .sort(byDate);
  const priorityCount = urgentDeadlines.length;

  const openMatter = (d: any) => {
    if (!d.matterId) return;
    sessionStorage.setItem("omuyoma_open_matter_id", d.matterId);
    setPopup(null);
    onGoToMatters?.();
  };

  const cards = [
    { kind: "today" as const,     label: "Today",     value: todayCount,    sub: "Hearings, mentions & drafting", Icon: CalendarDays,  tone: "info"   },
    { kind: "priority" as const,  label: "Priority",  value: priorityCount, sub: "Next 3 days",                   Icon: AlertTriangle, tone: "accent" },
  ];

  const toneClasses: Record<string, string> = {
    info:   "from-info/10 to-transparent border-info/25 [&_.icon-bg]:bg-info/20 [&_.icon]:text-info [&_.label]:text-info",
    accent: "from-accent/15 to-transparent border-accent/30 [&_.icon-bg]:bg-accent/20 [&_.icon]:text-accent [&_.label]:text-accent",
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
          {todayCount === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nothing scheduled for today.</p>
          ) : (
            <GroupedDeadlines items={todayDeadlines} borderCls="border-l-info" showDate={false} showMeeting onOpen={openMatter} />
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
              <AlertTriangle className="w-5 h-5 text-accent" /> Priority · next 3 days
            </DialogTitle>
          </DialogHeader>
          {priorityCount === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No deadlines in the next 3 days.</p>
          ) : (
            <GroupedDeadlines items={urgentDeadlines} borderCls="border-l-accent" showDate showMeeting={false} onOpen={openMatter} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
