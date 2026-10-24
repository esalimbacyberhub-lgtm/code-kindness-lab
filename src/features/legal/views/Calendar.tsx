import { useState, useMemo } from "react";
import { formatDate } from "@/lib/formatDate";
import {
  Plus, Trash2, Calendar as CalIcon, Scale, FileText,
  Gavel, AlertCircle, Building2, ChevronLeft, ChevronRight,
  LayoutList, LayoutGrid, X, User, AlignLeft, Video, MapPin, ExternalLink, Clock, Link2, Bell,
  CalendarDays, CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Deadline, Matter } from "../types";
import { cn } from "@/lib/utils";
import { useCourtRegistries } from "../hooks/useCourtRegistries";

const TYPE_ICON: Record<string,typeof Gavel> = {
  hearing:Gavel, filing:FileText, mention:CalIcon,
  ruling:Scale, deadline:AlertCircle, lsk:Building2,
};
const TYPE_COLOR: Record<string,string> = {
  hearing: "text-primary bg-primary/10 border-primary/30",
  filing:  "text-info bg-info/10 border-info/30",
  mention: "text-accent bg-accent/10 border-accent/30",
  ruling:  "text-destructive bg-destructive/10 border-destructive/30",
  deadline:"text-warning bg-warning/10 border-warning/30",
  lsk:     "text-success bg-success/10 border-success/30",
};
const PILL_BG: Record<string,string> = {
  hearing: "bg-primary text-white",
  filing:  "bg-info/90 text-white",
  mention: "bg-accent/90 text-white",
  ruling:  "bg-destructive/90 text-white",
  deadline:"bg-warning/90 text-white",
  lsk:     "bg-success/90 text-white",
};

// Court levels now DB-backed via court_registries (see useCourtRegistries hook).
// This order-only array just controls display order in the level picker.
const COURT_LEVEL_ORDER = [
  "Supreme Court","Court of Appeal","High Court",
  "Environment & Land Court","Employment & Labour Relations Court",
  "Magistrates Court","Kadhis Court","Small Claims Court","Tribunal",
] as const;
type CourtLevel = string;

const LEVEL_RANK: Record<string,number> = {
  "Supreme Court":1,"Court of Appeal":2,"High Court":3,
  "Environment & Land Court":4,"Employment & Labour Relations Court":5,
  "Magistrates Court":6,"Kadhis Court":7,"Small Claims Court":8,"Tribunal":9,
};
function courtRank(s:string){for(const[l,r] of Object.entries(LEVEL_RANK))if(s.startsWith(l))return r;return 10;}

const BLANK = {
  title:"", matter:"", courtLevel:"High Court" as CourtLevel,
  courtStation:"", customStation:"", useCustomStation:false,
  date:"", time:"", type:"hearing" as Deadline["type"],
  judge:"", summary:"",
  mode:"physical" as "physical"|"online", meetingLink:"",
};

const DAYS   = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function daysInMonth(y:number,m:number){return new Date(y,m+1,0).getDate();}
function firstDay(y:number,m:number){const d=new Date(y,m,1).getDay();return d===0?6:d-1;}
function mondayOf(d:Date):Date{const day=d.getDay();const diff=day===0?-6:1-day;const m=new Date(d);m.setDate(d.getDate()+diff);m.setHours(0,0,0,0);return m;}
function addDays(d:Date,n:number):Date{const r=new Date(d);r.setDate(r.getDate()+n);return r;}
function dstr(d:Date):string{return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}

interface Props {
  deadlines: Deadline[];
  onUpdate?: (id: string, updates: any) => void;
  matters:   Matter[];
  onAdd:     (d: Omit<Deadline,"id">) => void;
  onDelete:  (id: string) => void;
}

export function Calendar({deadlines,matters,onAdd,onDelete,onUpdate}:Props) {
  const [open,setOpen]     = useState(false);
  const [form,setForm]     = useState(BLANK);
  const [view,setView]     = useState<"day"|"week"|"month"|"list">("month");
  const set = <K extends keyof typeof BLANK>(k:K, v:(typeof BLANK)[K]) => setForm(p=>({...p,[k]:v}));
  const { byCategory, addCustomRegistry } = useCourtRegistries();
  const courtStationsMap = byCategory();

  const now      = new Date();
  const todayStr = now.toISOString().slice(0,10);
  const [cy,setCy] = useState(now.getFullYear());
  const [cm,setCm] = useState(now.getMonth());
  const [selDay,setSelDay] = useState<string|null>(null); // for popup
  const [linkEditId,setLinkEditId] = useState<string|null>(null);
  const [linkEditValue,setLinkEditValue] = useState("");

  const prev = ()=>{if(cm===0){setCy(y=>y-1);setCm(11);}else setCm(m=>m-1);};
  const next = ()=>{if(cm===11){setCy(y=>y+1);setCm(0);}else setCm(m=>m+1);};

  const [dayCursor,setDayCursor] = useState(todayStr);
  const [weekCursor,setWeekCursor] = useState(()=>mondayOf(now));
  const dayPrev = ()=>setDayCursor(d=>dstr(addDays(new Date(d+"T00:00:00"),-1)));
  const dayNext = ()=>setDayCursor(d=>dstr(addDays(new Date(d+"T00:00:00"),1)));
  const weekPrev = ()=>setWeekCursor(w=>addDays(w,-7));
  const weekNext = ()=>setWeekCursor(w=>addDays(w,7));

  const dlMap = useMemo(()=>{
    const m:Record<string,Deadline[]>={};
    deadlines.forEach(d=>{if(!m[d.date])m[d.date]=[];m[d.date].push(d);});
    return m;
  },[deadlines]);

  const dim = daysInMonth(cy,cm);
  const off = firstDay(cy,cm);
  const cells:(number|null)[] = [...Array(off).fill(null),...Array.from({length:dim},(_,i)=>i+1)];
  while(cells.length%7!==0) cells.push(null);
  const ds = (d:number)=>`${cy}-${String(cm+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

  const sorted   = [...deadlines].sort((a,b)=>a.date.localeCompare(b.date));
  const upcoming = sorted.filter(d=>d.date>=todayStr);
  const overdue  = sorted.filter(d=>d.date<todayStr);

  const submit = ()=>{
    if(!form.title||!form.date) return;
    const supremeCourtStations = courtStationsMap["Supreme Court"] || [];
    const station = form.useCustomStation && form.customStation.trim()
      ? form.customStation.trim()
      : form.courtLevel === "Supreme Court"
        ? (supremeCourtStations[0] || "Supreme Court")
        : form.courtStation
          ? `${form.courtLevel} — ${form.courtStation}`
          : form.courtLevel;
    // Persist a manually-typed station so it's available next time
    // (spec: new registries open yearly, staff can add them ad hoc)
    if (form.useCustomStation && form.customStation.trim()) {
      addCustomRegistry(form.customStation.trim(), form.courtLevel);
    }
    onAdd({
      title:form.title, matter:form.matter, court:station,
      date:form.date, type:form.type, mode:form.mode,
      ...(form.time && {time:form.time}),
      ...(form.judge && {judge:form.judge}),
      ...(form.summary && {summary:form.summary}),
      ...(form.meetingLink && {meetingLink:form.meetingLink}),
    } as Omit<Deadline,"id">);
    setForm(BLANK); setOpen(false);
  };

  const selDeadlines = selDay ? (dlMap[selDay]||[]) : [];

  const todayHearings = deadlines.filter(d => d.date === todayStr);

  return (
    <div>
      {/* Today's reminder banner */}
      {todayHearings.length > 0 && (
        <div className="mb-4 glass-card border-l-4 border-l-primary rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-primary"/>
            <p className="font-semibold text-sm">Today ({todayHearings.length} scheduled)</p>
          </div>
          <div className="space-y-2">
            {todayHearings.map(d => (
              <div key={d.id} className="flex items-center justify-between gap-3 text-xs bg-background/40 rounded-lg p-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {(d as any).time && <span className="font-bold text-primary shrink-0">{(d as any).time}</span>}
                  <span className="font-medium truncate">{d.title}</span>
                  <span className="text-muted-foreground truncate hidden sm:inline">— {d.court}</span>
                </div>
                {(d as any).meetingLink ? (
                  <a href={(d as any).meetingLink} target="_blank" rel="noopener noreferrer"
                     className="px-2.5 py-1 rounded-md bg-primary text-white text-[10px] font-bold hover:bg-primary/90 transition flex items-center gap-1 shrink-0">
                    {(d as any).mode === "online"
                      ? <><Video className="w-3 h-3"/> Join</>
                      : <><Link2 className="w-3 h-3"/> Link</>}
                  </a>
                ) : (
                  <span className="text-[10px] text-muted-foreground shrink-0">{(d as any).mode === "online" ? "💻 Online" : "📍 Physical"}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-primary/80 font-mono mb-2">Kenyan Judiciary</p>
          <h2 className="text-4xl font-serif">Calendar <span className="text-gradient-blue">&amp; Deadlines</span></h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border border-border overflow-hidden">
            <button onClick={()=>setView("day")} className={cn("flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all",view==="day"?"bg-primary text-white":"text-muted-foreground hover:text-foreground")}>
              <CalendarDays className="w-3.5 h-3.5"/> Day
            </button>
            <button onClick={()=>setView("week")} className={cn("flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all",view==="week"?"bg-primary text-white":"text-muted-foreground hover:text-foreground")}>
              <CalendarRange className="w-3.5 h-3.5"/> Week
            </button>
            <button onClick={()=>setView("month")} className={cn("flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all",view==="month"?"bg-primary text-white":"text-muted-foreground hover:text-foreground")}>
              <LayoutGrid className="w-3.5 h-3.5"/> Month
            </button>
            <button onClick={()=>setView("list")} className={cn("flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all",view==="list"?"bg-primary text-white":"text-muted-foreground hover:text-foreground")}>
              <LayoutList className="w-3.5 h-3.5"/> List
            </button>
          </div>
          <Button onClick={()=>setOpen(true)} className="btn-royal"><Plus className="w-4 h-4 mr-2"/>Add Deadline</Button>
        </div>
      </div>
      <div className="blue-divider mb-6"/>

      {/* ══ DAY VIEW ══ */}
      {view==="day" && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
            <button onClick={dayPrev} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"><ChevronLeft className="w-4 h-4"/></button>
            <div className="flex items-center gap-4">
              <h3 className="font-serif text-xl font-semibold">
                {new Date(dayCursor+"T00:00:00").toLocaleDateString("en-KE",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
              </h3>
              <button onClick={()=>setDayCursor(todayStr)} className="text-xs px-3 py-1 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-all font-medium">Today</button>
            </div>
            <button onClick={dayNext} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"><ChevronRight className="w-4 h-4"/></button>
          </div>
          <div className="p-4 space-y-2">
            {(dlMap[dayCursor]||[]).length===0
              ? <div className="text-center py-10 text-sm text-muted-foreground">No matters scheduled for this day.</div>
              : (dlMap[dayCursor]||[]).slice().sort((a,b)=>((a as any).time||"99:99").localeCompare((b as any).time||"99:99")).map(d=><DeadlineRow key={d.id} d={d} onDelete={onDelete}/>)
            }
          </div>
        </div>
      )}

      {/* ══ WEEK VIEW ══ */}
      {view==="week" && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
            <button onClick={weekPrev} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"><ChevronLeft className="w-4 h-4"/></button>
            <div className="flex items-center gap-4">
              <h3 className="font-serif text-xl font-semibold">
                {weekCursor.toLocaleDateString("en-KE",{day:"numeric",month:"short"})} – {addDays(weekCursor,6).toLocaleDateString("en-KE",{day:"numeric",month:"short",year:"numeric"})}
              </h3>
              <button onClick={()=>setWeekCursor(mondayOf(now))} className="text-xs px-3 py-1 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-all font-medium">This week</button>
            </div>
            <button onClick={weekNext} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"><ChevronRight className="w-4 h-4"/></button>
          </div>
          <div className="grid grid-cols-7 border-b border-border/30">
            {DAYS.map((d,i)=>{
              const date = addDays(weekCursor,i);
              const isT = dstr(date)===todayStr;
              return (
                <div key={d} className={cn("py-2.5 text-center border-r border-border/20 last:border-r-0",isT&&"bg-primary/5")}>
                  <div className={cn("text-[11px] font-bold uppercase tracking-wider text-muted-foreground",(d==="Sat"||d==="Sun")&&"text-primary/50")}>{d}</div>
                  <div className={cn("text-sm font-semibold mt-0.5",isT&&"text-primary")}>{date.getDate()}</div>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-7 min-h-[240px]">
            {DAYS.map((d,i)=>{
              const date = addDays(weekCursor,i);
              const key = dstr(date);
              const evts = (dlMap[key]||[]).slice().sort((a,b)=>((a as any).time||"99:99").localeCompare((b as any).time||"99:99"));
              return (
                <div key={key} onClick={()=>evts.length>0&&setSelDay(key)}
                  className={cn("border-r border-border/20 last:border-r-0 p-1.5 space-y-1",evts.length>0?"cursor-pointer hover:bg-primary/5":"")}>
                  {evts.map(e=>(
                    <div key={e.id} className={cn("text-[10px] font-semibold px-1.5 py-1 rounded truncate",PILL_BG[e.type]||"bg-primary text-white")} title={e.title}>
                      {(e as any).time && <span className="opacity-80">{(e as any).time} · </span>}{e.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ MONTH VIEW ══ */}
      {view==="month" && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
            <button onClick={prev} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"><ChevronLeft className="w-4 h-4"/></button>
            <div className="flex items-center gap-4">
              <h3 className="font-serif text-xl font-semibold">{MONTHS[cm]} <span className="text-primary">{cy}</span></h3>
              <button onClick={()=>{setCy(now.getFullYear());setCm(now.getMonth());}} className="text-xs px-3 py-1 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-all font-medium">Today</button>
            </div>
            <button onClick={next} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"><ChevronRight className="w-4 h-4"/></button>
          </div>
          <div className="grid grid-cols-7 border-b border-border/30">
            {DAYS.map(d=><div key={d} className={cn("py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground",(d==="Sat"||d==="Sun")&&"text-primary/50")}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((day,idx)=>{
              if(!day) return <div key={`e${idx}`} className="min-h-[90px] border-r border-b border-border/20 bg-muted/5"/>;
              const d    = ds(day);
              const evts = dlMap[d]||[];
              const isT  = d===todayStr;
              const isWe = (idx%7)>=5;
              return (
                <div key={d} onClick={()=>evts.length>0&&setSelDay(d)}
                  className={cn("min-h-[90px] border-r border-b border-border/20 p-2 transition-all",
                    isT&&"bg-primary/5", isWe&&!isT&&"bg-muted/10",
                    evts.length>0?"cursor-pointer hover:bg-primary/8":"cursor-default"
                  )}>
                  <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold mb-1.5",
                    isT?"bg-primary text-white shadow-lg shadow-primary/30":"text-foreground/80")}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {evts.slice(0,2).map(e=>(
                      <div key={e.id} className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded truncate",PILL_BG[e.type]||"bg-primary text-white")}>
                        {e.title}
                      </div>
                    ))}
                    {evts.length>2&&<div className="text-[10px] font-bold text-primary/70 pl-1">+{evts.length-2} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ LIST VIEW ══ */}
      {view==="list" && (
        <>
          {overdue.length>0&&(
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Past ({overdue.length})</h3>
              <div className="space-y-2">{overdue.map(d=><DeadlineRow key={d.id} d={d} onDelete={onDelete} overdue/>)}</div>
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Upcoming ({upcoming.length})</h3>
            {upcoming.length===0
              ?<div className="glass-card rounded-2xl p-10 text-center text-sm text-muted-foreground">No upcoming deadlines.</div>
              :<div className="space-y-2">{upcoming.map(d=><DeadlineRow key={d.id} d={d} onDelete={onDelete}/>)}</div>
            }
          </div>
        </>
      )}

      {/* ══ DATE POPUP MODAL ══ */}
      <Dialog open={!!selDay} onOpenChange={o=>!o&&setSelDay(null)}>
        <DialogContent className="glass-card border-border max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="font-serif text-xl">
                {selDay && new Date(selDay+"T00:00:00").toLocaleDateString("en-KE",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
              </DialogTitle>
              <button onClick={()=>setSelDay(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4"/>
              </button>
            </div>
            <p className="text-sm text-muted-foreground">{selDeadlines.length} matter{selDeadlines.length!==1?"s":""} scheduled</p>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scroll py-2">
            {selDeadlines.map(d=>(
              <div key={d.id} className={cn("glass-card rounded-xl p-4 border-l-4",
                d.type==="hearing"?"border-l-primary":
                d.type==="ruling"?"border-l-destructive":
                d.type==="filing"?"border-l-info":"border-l-warning")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",TYPE_COLOR[d.type])}>
                        {d.type==="lsk"?"LSK Event":d.type}
                      </span>
                      {(d as any).time && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-primary/20 text-primary flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5"/>{(d as any).time}
                        </span>
                      )}
                      {(d as any).mode === "online" ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-500/20 text-blue-300 flex items-center gap-1">
                          <Video className="w-2.5 h-2.5"/>Online
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-muted/40 text-muted-foreground flex items-center gap-1">
                          <Building2 className="w-2.5 h-2.5"/>Physical
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-sm">{d.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Building2 className="w-3 h-3"/>
                      {d.court}
                    </p>
                    {(d as any).meetingLink && (
                      <a href={(d as any).meetingLink} target="_blank" rel="noopener noreferrer"
                         className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition">
                        {(d as any).mode === "online"
                          ? <><Video className="w-3 h-3"/> Join meeting →</>
                          : <><Link2 className="w-3 h-3"/> Open link →</>}
                      </a>
                    )}
                    {onUpdate && (linkEditId === d.id ? (
                      <div className="mt-2 flex items-center gap-1.5">
                        <input
                          autoFocus
                          value={linkEditValue}
                          onChange={e=>setLinkEditValue(e.target.value)}
                          placeholder="Paste court / meeting link…"
                          className="flex-1 px-2 py-1 text-xs bg-background border border-border rounded outline-none focus:ring-1 focus:ring-primary"
                        />
                        <button
                          onClick={()=>{ onUpdate(d.id,{meetingLink:linkEditValue.trim()}); setLinkEditId(null); }}
                          className="text-xs px-2 py-1 rounded bg-primary text-white font-bold shrink-0">Save</button>
                        <button onClick={()=>setLinkEditId(null)} className="text-muted-foreground hover:text-foreground shrink-0"><X className="w-3.5 h-3.5"/></button>
                      </div>
                    ) : (
                      <button
                        onClick={()=>{ setLinkEditId(d.id); setLinkEditValue((d as any).meetingLink||""); }}
                        className="mt-2 text-[11px] text-primary hover:underline font-medium flex items-center gap-1"
                      >
                        <Link2 className="w-3 h-3"/> {(d as any).meetingLink ? "Edit link" : "Add link"}
                      </button>
                    ))}
                    {(d as any).judge && (
                      <p className="text-xs text-primary/80 mt-1 flex items-center gap-1">
                        <User className="w-3 h-3"/>
                        {(d as any).judge}
                      </p>
                    )}
                    {(d as any).summary && (
                      <p className="text-xs text-muted-foreground mt-1.5 italic border-l-2 border-border pl-2">
                        {(d as any).summary}
                      </p>
                    )}
                    {d.matter && d.matter!=="General" && (
                      <p className="text-[10px] text-muted-foreground mt-1 font-mono">{d.matter}</p>
                    )}
                  </div>
                  <button onClick={()=>onDelete(d.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                    <Trash2 className="w-3.5 h-3.5"/>
                  </button>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={()=>setSelDay(null)}>Close</Button>
            <Button className="btn-royal" onClick={()=>{setSelDay(null);setForm(p=>({...p,date:selDay||""}));setOpen(true);}}>
              <Plus className="w-4 h-4 mr-1"/> Add to this day
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ ADD DEADLINE DIALOG ══ */}
      <Dialog open={open} onOpenChange={v=>{if(!v)setForm(BLANK);setOpen(v);}}>
        <DialogContent className="glass-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Add Court Date / Deadline</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">

            {/* Title */}
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={form.title} onChange={e=>set("title",e.target.value)} placeholder="e.g. File Defence — Kamau v. Njeri"/>
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v=>set("type",v as Deadline["type"])}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  {["hearing","filing","mention","ruling","deadline","lsk"].map(t=>(
                    <SelectItem key={t} value={t}>{t==="lsk"?"LSK Event":t.charAt(0).toUpperCase()+t.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Court Level */}
            <div className="space-y-1.5">
              <Label>Court Level</Label>
              <Select value={form.courtLevel} onValueChange={v=>setForm(p=>({...p,courtLevel:v as CourtLevel,courtStation:"",customStation:"",useCustomStation:false}))}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  {COURT_LEVEL_ORDER.map((lvl,i)=>(
                    <SelectItem key={lvl} value={lvl}>
                      <span className="inline-flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] flex items-center justify-center font-bold shrink-0">{i+1}</span>
                        {lvl}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Court Station — dropdown OR manual */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Court Station / Registry</Label>
                <button
                  type="button"
                  onClick={()=>set("useCustomStation",!form.useCustomStation as any)}
                  className="text-[11px] text-primary hover:underline font-medium"
                >
                  {form.useCustomStation ? "← Pick from list" : "✎ Type manually"}
                </button>
              </div>
              {form.useCustomStation ? (
                <Input
                  value={form.customStation}
                  onChange={e=>set("customStation",e.target.value)}
                  placeholder="Type exact court station name…"
                />
              ) : (
                <Select value={form.courtStation} onValueChange={v=>set("courtStation",v)}>
                  <SelectTrigger><SelectValue placeholder="Select station…"/></SelectTrigger>
                  <SelectContent>
                    {(courtStationsMap[form.courtLevel]||[]).map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Judge / Magistrate */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><User className="w-3.5 h-3.5"/> Judge / Magistrate (optional)</Label>
              <Input value={form.judge} onChange={e=>set("judge",e.target.value)} placeholder="e.g. Hon. Justice Ngugi, SJ Odhiambo"/>
            </div>

            {/* Summary */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><AlignLeft className="w-3.5 h-3.5"/> Brief Summary (optional)</Label>
              <textarea
                value={form.summary}
                onChange={e=>set("summary",e.target.value)}
                placeholder="e.g. Mention for directions on filing of defence. Client to attend."
                rows={2}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            {/* Linked Matter */}
            <div className="space-y-1.5">
              <Label>Linked Matter</Label>
              <Select value={form.matter} onValueChange={v=>set("matter",v)}>
                <SelectTrigger><SelectValue placeholder="Link to matter (optional)…"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="General">General — not linked to a matter</SelectItem>
                  {matters.map(m=><SelectItem key={m.id} value={m.title}>{m.fileNo?`${m.fileNo} · `:""}{m.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Date + Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date *</Label>
                <Input type="date" value={form.date} onChange={e=>set("date",e.target.value)}/>
              </div>
              <div className="space-y-1.5">
                <Label>Time</Label>
                <Input type="time" value={form.time} onChange={e=>set("time",e.target.value)}/>
              </div>
            </div>

            {/* Mode: Physical / Online */}
            <div className="space-y-1.5">
              <Label>Hearing Mode</Label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={()=>set("mode","physical")}
                  className={cn("flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition",
                    form.mode==="physical"?"border-primary bg-primary/10 text-primary":"border-border text-muted-foreground hover:border-primary/40")}>
                  <Building2 className="w-4 h-4"/> Physical Court
                </button>
                <button type="button" onClick={()=>set("mode","online")}
                  className={cn("flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition",
                    form.mode==="online"?"border-primary bg-primary/10 text-primary":"border-border text-muted-foreground hover:border-primary/40")}>
                  <Video className="w-4 h-4"/> Online / Virtual
                </button>
              </div>
            </div>

            {/* Link — meeting, court portal, e-filing, cause list, any URL */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5"/> Link (optional)</Label>
              <Input value={form.meetingLink} onChange={e=>set("meetingLink",e.target.value)}
                placeholder={form.mode==="online" ? "https://zoom.us/j/... meeting link" : "Court portal, e-filing, cause list, or any URL"}/>
              <p className="text-[10px] text-muted-foreground">Paste a Zoom/Teams link, court portal, e-filing URL, or any reference link.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={()=>{setForm(BLANK);setOpen(false);}}>Cancel</Button>
            <Button onClick={submit} disabled={!form.title||!form.date} className="btn-royal">Save Deadline</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DeadlineRow({d,onDelete,overdue=false}:{d:Deadline;onDelete:(id:string)=>void;overdue?:boolean}) {
  const Icon = TYPE_ICON[d.type]??CalIcon;
  const rank = courtRank(d.court);
  return (
    <div className="glass-card glass-card-hover rounded-xl p-4 flex items-center gap-4">
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center text-xs border shrink-0",TYPE_COLOR[d.type]??TYPE_COLOR.deadline)}>
        <Icon className="w-4 h-4"/>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{d.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {rank<=9&&<span className="w-4 h-4 rounded-full bg-primary/20 text-primary text-[9px] flex items-center justify-center font-bold shrink-0">{rank}</span>}
          <p className="text-xs text-muted-foreground truncate">{d.court}</p>
        </div>
        {(d as any).judge&&<p className="text-xs text-primary/70 mt-0.5 flex items-center gap-1"><User className="w-3 h-3"/>{(d as any).judge}</p>}
        {(d as any).summary&&<p className="text-xs text-muted-foreground mt-0.5 italic truncate">{(d as any).summary}</p>}
      </div>
      <div className="text-right shrink-0">
        <p className={cn("text-sm font-semibold",overdue?"text-muted-foreground":"text-primary")}>
          {formatDate(d.date+"T00:00:00")}
        </p>
        <p className="text-[10px] uppercase text-muted-foreground capitalize mt-0.5">{d.type==="lsk"?"LSK":d.type}</p>
      </div>
      <button onClick={()=>onDelete(d.id)} className="text-muted-foreground hover:text-destructive ml-1 transition-colors"><Trash2 className="w-4 h-4"/></button>
    </div>
  );
}
