import { useState } from "react";
import {
  Plus, Trash2, Calendar as CalIcon, Scale,
  FileText, Gavel, AlertCircle, Building2,
} from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import {
  Select, SelectContent, SelectGroup, SelectItem,
  SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { Deadline, Matter } from "../types";
import { DeadlineCalculator } from "./DeadlineCalculator";
import { cn } from "@/lib/utils";

// ── Icons & colours per deadline type ────────────────────────────────────────
const TYPE_ICON: Record<string, typeof Gavel> = {
  hearing:  Gavel,
  filing:   FileText,
  mention:  CalIcon,
  ruling:   Scale,
  deadline: AlertCircle,
  lsk:      Building2,
};
const TYPE_COLOR: Record<string, string> = {
  hearing:  "text-primary bg-primary/10 border-primary/30",
  filing:   "text-info bg-info/10 border-info/30",
  mention:  "text-accent bg-accent/10 border-accent/30",
  ruling:   "text-destructive bg-destructive/10 border-destructive/30",
  deadline: "text-warning bg-warning/10 border-warning/30",
  lsk:      "text-success bg-success/10 border-success/30",
};

// ── Kenya Court Hierarchy ─────────────────────────────────────────────────────
// 8 levels as required, each with specific stations
const COURT_LEVELS = [
  "Supreme Court",
  "Court of Appeal",
  "High Court",
  "Environment & Land Court",
  "Employment & Labour Relations Court",
  "Magistrates Court",
  "Kadhis Court",
  "Tribunal",
  "Small Claims Court",
] as const;

type CourtLevel = (typeof COURT_LEVELS)[number];

const COURT_STATIONS: Record<CourtLevel, string[]> = {
  "Supreme Court": [
    "Nairobi — Principal Registry",
  ],
  "Court of Appeal": [
    "Nairobi", "Mombasa", "Kisumu", "Nyeri",
    "Eldoret", "Malindi", "Nakuru",
  ],
  "High Court": [
    "Nairobi — Constitutional & Human Rights Division",
    "Nairobi — Commercial & Tax Division",
    "Nairobi — Family Division",
    "Nairobi — Criminal Division",
    "Nairobi — Anti-Corruption & Economic Crimes Division",
    "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Nyeri",
    "Kakamega", "Malindi", "Garissa", "Machakos",
    "Thika", "Bungoma", "Kericho", "Homabay",
  ],
  "Environment & Land Court": [
    "Nairobi", "Mombasa", "Kisumu", "Nakuru",
    "Eldoret", "Nyeri", "Machakos", "Malindi", "Garissa",
    "Bungoma", "Kericho",
  ],
  "Employment & Labour Relations Court": [
    "Nairobi", "Mombasa", "Kisumu", "Nakuru",
    "Eldoret", "Nyeri", "Kakamega",
  ],
  "Magistrates Court": [
    "Milimani — Chief Magistrates Court",
    "Milimani — Criminal Courts",
    "Makadara", "Kibera", "Mombasa", "Kisumu",
    "Nakuru", "Eldoret", "Nyeri", "Kakamega",
    "Garissa", "Machakos", "Thika", "Bungoma",
    "Malindi", "Kericho", "Homabay", "Kitale",
  ],
  "Kadhis Court": [
    "Nairobi", "Mombasa", "Kisumu",
    "Malindi", "Garissa", "Lamu", "Wajir", "Mandera",
  ],
  "Small Claims Court": ["Nairobi","Mombasa","Kisumu","Nakuru","Eldoret","Thika","Machakos","Nyeri","Bungoma","Malindi"],
  "Tribunal": [
    "Business Premises Rent Tribunal",
    "Rent Restriction Tribunal",
    "Tax Appeals Tribunal",
    "Cooperative Tribunal",
    "National Environment Tribunal",
    "Public Procurement Administrative Review Board",
    "Sports Disputes Tribunal",
    "Retirement Benefits Appeals Tribunal",
    "Capital Markets Tribunal",
    "Financial Centre Tribunal",
    "Other (specify below)",
  ],
};

// Combine level + station into the stored court string
const buildCourtString = (level: CourtLevel, station: string, custom: string) => {
  if (station === "Other (specify below)" && custom.trim()) return `${level} — ${custom.trim()}`;
  if (level === "Supreme Court") return station; // single court
  return `${level} — ${station}`;
};

// ── Court hierarchy number badge ─────────────────────────────────────────────
const LEVEL_RANK: Record<string, number> = {
  "Supreme Court": 1,
  "Court of Appeal": 2,
  "High Court": 3,
  "Environment & Land Court": 4,
  "Employment & Labour Relations Court": 5,
  "Magistrates Court": 6,
  "Kadhis Court": 7,
  "Tribunal": 8, "Small Claims Court": 9,
};

function courtRank(courtStr: string): number {
  for (const [lvl, rank] of Object.entries(LEVEL_RANK)) {
    if (courtStr.startsWith(lvl)) return rank;
  }
  return 9;
}

// ── Blank form ────────────────────────────────────────────────────────────────
const BLANK_FORM = {
  title:        "",
  matter:       "",
  courtLevel:   "High Court" as CourtLevel,
  courtStation: "",
  customStation:"",
  date:         "",
  type:         "hearing" as Deadline["type"],
};

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  deadlines: Deadline[];
  matters:   Matter[];
  onAdd:     (d: Omit<Deadline, "id">) => void;
  onDelete:  (id: string) => void;
}

// ══════════════════════════════════════════════════════════════════════════════
export function Calendar({ deadlines, matters, onAdd, onDelete }: Props) {
  const [open, setOpen]  = useState(false);
  const [form, setForm]  = useState(BLANK_FORM);
  const set = <K extends keyof typeof BLANK_FORM>(k: K, v: (typeof BLANK_FORM)[K]) =>
    setForm(p => ({ ...p, [k]: v }));

  const today    = new Date().toISOString().slice(0, 10);
  const sorted   = [...deadlines].sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = sorted.filter(d => d.date >= today);
  const overdue  = sorted.filter(d => d.date < today);

  // When court level changes, reset station
  const handleLevelChange = (v: string) => {
    setForm(p => ({ ...p, courtLevel: v as CourtLevel, courtStation: "", customStation: "" }));
  };

  const submit = () => {
    if (!form.title || !form.date || !form.courtStation) return;
    const court = buildCourtString(form.courtLevel, form.courtStation, form.customStation);
    onAdd({ title: form.title, matter: form.matter, court, date: form.date, type: form.type });
    setForm(BLANK_FORM);
    setOpen(false);
  };

  const stations = COURT_STATIONS[form.courtLevel] || [];

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-primary/80 font-mono mb-2">
            Kenyan Judiciary
          </p>
          <h2 className="text-4xl font-serif">
            Calendar <span className="text-gradient-blue">&amp; Deadlines</span>
          </h2>
        </div>
        <Button onClick={() => setOpen(true)} className="btn-royal">
          <Plus className="w-4 h-4 mr-2" /> Add Deadline
        </Button>
      </div>
      <div className="blue-divider mb-6" />

      {/* ── Court Hierarchy Legend ── */}
      

      {/* ── Overdue ── */}
      {overdue.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-destructive mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> Overdue ({overdue.length})
          </h3>
          <div className="space-y-2">
            {overdue.map(d => <DeadlineRow key={d.id} d={d} onDelete={onDelete} overdue />)}
          </div>
        </div>
      )}

      {/* ── Upcoming ── */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
          Upcoming ({upcoming.length})
        </h3>
        {upcoming.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 text-center text-sm text-muted-foreground">
            No upcoming deadlines. Add your first court date or filing deadline.
          </div>
        ) : (
          <div className="space-y-2">
            {upcoming.map(d => <DeadlineRow key={d.id} d={d} onDelete={onDelete} />)}
          </div>
        )}
      </div>

      {/* ── Add Deadline Dialog ── */}
      <Dialog open={open} onOpenChange={v => { if (!v) setForm(BLANK_FORM); setOpen(v); }}>
        <DialogContent className="glass-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Add Court Date / Deadline</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">

            {/* Title */}
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={e => set("title", e.target.value)}
                placeholder="e.g. File Defence — Kamau v. Njeri"
              />
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => set("type", v as Deadline["type"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["hearing","filing","mention","ruling","deadline","lsk"].map(t => (
                    <SelectItem key={t} value={t} className="capitalize">{t === "lsk" ? "LSK Event" : t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ── Court Hierarchy: Step 1 — Level ── */}
            <div className="space-y-1.5">
              <Label>Court Level *</Label>
              <Select value={form.courtLevel} onValueChange={handleLevelChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COURT_LEVELS.map((lvl, i) => (
                    <SelectItem key={lvl} value={lvl}>
                      <span className="inline-flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] flex items-center justify-center font-bold shrink-0">
                          {i + 1}
                        </span>
                        {lvl}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ── Court Hierarchy: Step 2 — Station ── */}
            <div className="space-y-1.5">
              <Label>Court Station / Registry *</Label>
              <Select
                value={form.courtStation}
                onValueChange={v => set("courtStation", v)}
                disabled={!form.courtLevel}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select station..." />
                </SelectTrigger>
                <SelectContent>
                  {stations.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Custom station input (for "Other" or Tribunals) */}
              {(form.courtStation === "Other (specify below)") && (
                <Input
                  value={form.customStation}
                  onChange={e => set("customStation", e.target.value)}
                  placeholder="Enter tribunal or court name..."
                  className="mt-1.5"
                />
              )}

              {/* Preview of the full court string */}
              {form.courtStation && form.courtStation !== "Other (specify below)" && (
                <p className="text-[11px] text-primary/70 font-mono mt-1 pl-1">
                  → {buildCourtString(form.courtLevel, form.courtStation, form.customStation)}
                </p>
              )}
            </div>

            {/* Matter */}
            <div className="space-y-1.5">
              <Label>Linked Matter</Label>
              <Select value={form.matter} onValueChange={v => set("matter", v)}>
                <SelectTrigger><SelectValue placeholder="Link to matter (optional)..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="General">General — not linked to a matter</SelectItem>
                  {matters.map(m => (
                    <SelectItem key={m.id} value={m.title}>
                      {m.fileNo ? `${m.fileNo} · ` : ""}{m.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input
                type="date"
                value={form.date}
                onChange={e => set("date", e.target.value)}
              />
            </div>

          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => { setForm(BLANK_FORM); setOpen(false); }}>
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={!form.title || !form.date || !form.courtStation}
              className="btn-royal"
            >
              Save Deadline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Deadline Row ──────────────────────────────────────────────────────────────
function DeadlineRow({
  d, onDelete, overdue = false,
}: {
  d: Deadline; onDelete: (id: string) => void; overdue?: boolean;
}) {
  const Icon = TYPE_ICON[d.type] ?? CalIcon;
  const rank = courtRank(d.court);

  return (
    <div className={cn(
      "glass-card glass-card-hover rounded-xl p-4 flex items-center gap-4",
      overdue && "border border-destructive/30",
    )}>
      {/* Type icon */}
      <div className={cn(
        "w-9 h-9 rounded-lg flex items-center justify-center text-xs border shrink-0",
        TYPE_COLOR[d.type] ?? TYPE_COLOR.deadline,
      )}>
        <Icon className="w-4 h-4" />
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{d.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {/* Court hierarchy rank badge */}
          {rank <= 8 && (
            <span className="w-4 h-4 rounded-full bg-primary/20 text-primary text-[9px] flex items-center justify-center font-bold shrink-0">
              {rank}
            </span>
          )}
          <p className="text-xs text-muted-foreground truncate">
            {d.court}
            {d.matter && d.matter !== "General" ? ` · ${d.matter}` : ""}
          </p>
        </div>
      </div>

      {/* Date + type */}
      <div className="text-right shrink-0">
        <p className={cn(
          "text-sm font-semibold",
          overdue ? "text-destructive" : "text-primary",
        )}>
          {new Date(d.date + "T00:00:00").toLocaleDateString("en-KE", {
            day: "numeric", month: "short", year: "numeric",
          })}
        </p>
        <p className="text-[10px] uppercase text-muted-foreground capitalize mt-0.5">
          {d.type === "lsk" ? "LSK Event" : d.type}
        </p>
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(d.id)}
        className="text-muted-foreground hover:text-destructive ml-1 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
