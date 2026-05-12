import { useState } from "react";
import { Calculator, Plus, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Deadline, Matter } from "../types";

const KE_HOLIDAYS = [
  "2026-01-01","2026-04-03","2026-04-06","2026-05-01","2026-06-01","2026-10-10","2026-10-20","2026-12-12","2026-12-25","2026-12-26",
  "2027-01-01","2027-03-26","2027-03-29","2027-05-01","2027-06-01","2027-10-10","2027-10-20","2027-12-12","2027-12-25","2027-12-26",
];

function addCourtDays(start: string, days: number): string {
  let d = new Date(start + "T00:00:00");
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const iso = d.toISOString().split("T")[0];
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6 && !KE_HOLIDAYS.includes(iso)) added++;
  }
  return d.toISOString().split("T")[0];
}

interface Rule { name: string; days: number; type: Deadline["type"]; note?: string; fromTrigger?: boolean; }

const PROCEDURES: Record<string, { label: string; description: string; rules: Rule[] }> = {
  civil_high: {
    label: "Civil Suit — High Court",
    description: "Order 5, 7, 9 & 11 Civil Procedure Rules",
    rules: [
      { name: "Serve Summons on Defendant", days: 30, type: "deadline", note: "Order 5 Rule 1", fromTrigger: true },
      { name: "File & Serve Defence", days: 14, type: "filing", note: "Order 7 Rule 1" },
      { name: "File Reply to Defence", days: 7, type: "filing", note: "Order 7 Rule 5" },
      { name: "Close of Pleadings", days: 7, type: "deadline", note: "Automatic closure" },
      { name: "Summons for Directions", days: 14, type: "mention", note: "Order 11 Rule 1" },
      { name: "Comply with Directions", days: 30, type: "deadline" },
      { name: "Set Down for Hearing", days: 14, type: "deadline" },
    ],
  },
  civil_magistrate: {
    label: "Civil Suit — Magistrates Court",
    description: "Magistrates Court Act & Civil Procedure Rules",
    rules: [
      { name: "File & Serve Defence", days: 14, type: "filing", fromTrigger: true },
      { name: "File Reply", days: 7, type: "filing" },
      { name: "Pre-trial Directions", days: 30, type: "hearing" },
      { name: "Discovery & Inspection", days: 14, type: "deadline" },
      { name: "Exchange Witness Statements", days: 30, type: "deadline" },
    ],
  },
  appeal_coa: {
    label: "Appeal — Court of Appeal",
    description: "Court of Appeal Rules 2022",
    rules: [
      { name: "File Notice of Appeal", days: 14, type: "filing", note: "Rule 77", fromTrigger: true },
      { name: "Apply for Certified Copy", days: 14, type: "deadline", note: "Rule 85", fromTrigger: true },
      { name: "File Record of Appeal", days: 60, type: "filing", note: "Rule 82" },
      { name: "Serve Record of Appeal", days: 7, type: "deadline", note: "Rule 83" },
      { name: "Appellant Submissions", days: 21, type: "filing" },
      { name: "Respondent Submissions", days: 21, type: "filing" },
      { name: "Mention for Directions", days: 7, type: "mention" },
    ],
  },
  appeal_high: {
    label: "Appeal — High Court (from Magistrates)",
    description: "Subordinate Courts Appeals Rules",
    rules: [
      { name: "File Notice of Appeal", days: 14, type: "filing", fromTrigger: true },
      { name: "File Memorandum & Record", days: 30, type: "filing", fromTrigger: true },
      { name: "Serve Memorandum", days: 7, type: "deadline" },
      { name: "Grounds of Opposition", days: 14, type: "filing" },
      { name: "Hearing Date", days: 30, type: "hearing" },
    ],
  },
  election_petition: {
    label: "Election Petition",
    description: "Elections Act 2011 — STRICT TIMELINES",
    rules: [
      { name: "File Election Petition (STRICT)", days: 28, type: "filing", note: "Section 75 — NON-EXTENDABLE", fromTrigger: true },
      { name: "Serve Petition", days: 7, type: "deadline" },
      { name: "Security for Costs", days: 7, type: "deadline" },
      { name: "Respondents Answer", days: 21, type: "filing" },
      { name: "Pre-trial Conference", days: 14, type: "mention" },
      { name: "Hearing must commence", days: 60, type: "hearing", note: "Within 60 days" },
      { name: "Judgment (STRICT)", days: 180, type: "ruling", note: "Section 75(4)" },
    ],
  },
  land_elc: {
    label: "Land / ELC Matter",
    description: "Environment & Land Court Act",
    rules: [
      { name: "File Defence", days: 15, type: "filing", note: "ELC Practice Directions", fromTrigger: true },
      { name: "File Replying Affidavit", days: 7, type: "filing" },
      { name: "Consent Summons / Directions", days: 30, type: "mention" },
      { name: "Site Visit / Inspection", days: 21, type: "deadline" },
      { name: "File Survey Reports", days: 45, type: "deadline" },
      { name: "Hearing", days: 30, type: "hearing" },
    ],
  },
  judicial_review: {
    label: "Judicial Review",
    description: "Law Reform Act Cap 26",
    rules: [
      { name: "File Application for Leave (STRICT)", days: 90, type: "filing", note: "Must be prompt; 6 months max", fromTrigger: true },
      { name: "Serve Leave Application", days: 3, type: "deadline" },
      { name: "Hearing of Leave", days: 14, type: "hearing" },
      { name: "File Substantive Motion", days: 14, type: "filing" },
      { name: "Serve Substantive Motion", days: 7, type: "deadline" },
      { name: "Grounds of Opposition", days: 14, type: "filing" },
      { name: "Hearing of Motion", days: 30, type: "hearing" },
    ],
  },
  criminal: {
    label: "Criminal Matter",
    description: "Criminal Procedure Code & Constitution",
    rules: [
      { name: "Bail / Bond Application", days: 1, type: "hearing", note: "Article 49", fromTrigger: true },
      { name: "First Mention / Plea", days: 3, type: "mention", fromTrigger: true },
      { name: "Prosecution Witness List", days: 14, type: "deadline", note: "Section 215 CPC" },
      { name: "Prosecution Case", days: 30, type: "hearing" },
      { name: "Defence Hearing", days: 30, type: "hearing" },
      { name: "Judgment", days: 14, type: "ruling", note: "Section 184" },
    ],
  },
  succession: {
    label: "Succession / Probate",
    description: "Law of Succession Act Cap 160",
    rules: [
      { name: "File Petition for Grant", days: 0, type: "filing", fromTrigger: true },
      { name: "Gazette Advertisement", days: 7, type: "deadline" },
      { name: "Objection Period Expires", days: 30, type: "deadline" },
      { name: "Hearing of Petition", days: 14, type: "hearing" },
      { name: "Confirmation of Grant", days: 30, type: "deadline", note: "After 6 months — Section 71" },
    ],
  },
};

interface Result { name: string; date: string; type: Deadline["type"]; note: string; isStrict: boolean; }

function calculate(procKey: string, trigger: string): Result[] {
  const proc = PROCEDURES[procKey];
  if (!proc || !trigger) return [];
  const out: Result[] = [];
  let prev = trigger;
  proc.rules.forEach(r => {
    if (r.days === 0) {
      out.push({ name: r.name, date: trigger, type: r.type, note: r.note || "", isStrict: r.name.includes("STRICT") });
      return;
    }
    const base = r.fromTrigger ? trigger : prev;
    const date = addCourtDays(base, r.days);
    out.push({ name: r.name, date, type: r.type, note: r.note || "", isStrict: r.name.includes("STRICT") });
    prev = date;
  });
  return out;
}

const fmtDate = (d: string) => d ? new Date(d + "T00:00:00").toLocaleDateString("en-KE", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }) : "—";

const daysFromNow = (d: string) => {
  const diff = Math.ceil((new Date(d + "T00:00:00").getTime() - new Date().setHours(0,0,0,0)) / 86400000);
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, color: "text-destructive" };
  if (diff === 0) return { label: "Today", color: "text-warning" };
  if (diff <= 7) return { label: `${diff}d`, color: "text-warning" };
  return { label: `${diff}d`, color: "text-muted-foreground" };
};

const TYPE_COLOR: Record<string, string> = {
  filing: "bg-info/15 text-info border-info/30",
  hearing: "bg-primary/15 text-primary border-primary/30",
  mention: "bg-accent/15 text-accent border-accent/30",
  ruling: "bg-destructive/15 text-destructive border-destructive/30",
  deadline: "bg-warning/15 text-warning border-warning/30",
};

interface Props {
  open: boolean;
  onClose: () => void;
  matters: Matter[];
  onAddDeadlines: (deadlines: Omit<Deadline,"id">[]) => void;
}

export function DeadlineCalculator({ open, onClose, matters, onAddDeadlines }: Props) {
  const [procedure, setProcedure] = useState("");
  const [triggerDate, setTriggerDate] = useState("");
  const [linkedMatter, setLinkedMatter] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [calculated, setCalculated] = useState(false);

  const proc = PROCEDURES[procedure];

  const handleCalculate = () => {
    if (!procedure || !triggerDate) return;
    const res = calculate(procedure, triggerDate);
    setResults(res);
    setSelected(new Set(res.map((_, i) => i)));
    setCalculated(true);
  };

  const toggleSelect = (i: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const handleAdd = () => {
    const toAdd = results
      .filter((_, i) => selected.has(i))
      .map(r => ({
        title: r.name.replace(" (STRICT)", ""),
        court: proc?.label || "",
        matter: linkedMatter || "General",
        date: r.date,
        type: r.type,
      }));
    onAddDeadlines(toAdd);
    reset();
    onClose();
  };

  const reset = () => {
    setCalculated(false);
    setResults([]);
    setProcedure("");
    setTriggerDate("");
    setLinkedMatter("");
    setSelected(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="glass-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl flex items-center gap-2">
            <Calculator className="w-6 h-6 text-primary" /> Deadline Calculator
          </DialogTitle>
          <p className="text-sm text-muted-foreground">Auto-calculates Kenya court procedural deadlines. Excludes weekends &amp; public holidays.</p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Procedure Type *</Label>
            <Select value={procedure} onValueChange={v => { setProcedure(v); setCalculated(false); setResults([]); }}>
              <SelectTrigger><SelectValue placeholder="Select procedure…" /></SelectTrigger>
              <SelectContent>
                {Object.entries(PROCEDURES).map(([key, p]) => (
                  <SelectItem key={key} value={key}>
                    <div>
                      <p className="font-medium">{p.label}</p>
                      <p className="text-[11px] text-muted-foreground">{p.description}</p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Trigger Date *</Label>
              <Input type="date" value={triggerDate} onChange={e => { setTriggerDate(e.target.value); setCalculated(false); }} />
            </div>
            <div className="space-y-1.5">
              <Label>Link to Matter</Label>
              <Select value={linkedMatter} onValueChange={setLinkedMatter}>
                <SelectTrigger><SelectValue placeholder="Optional…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="General">General</SelectItem>
                  {matters.map(m => (
                    <SelectItem key={m.id} value={m.title}>{m.fileNo ? `${m.fileNo} · ` : ""}{m.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleCalculate} disabled={!procedure || !triggerDate} className="btn-royal w-full">
            <Calculator className="w-4 h-4 mr-2" /> Calculate Deadlines
          </Button>

          {calculated && results.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-sm">{results.length} deadlines · {selected.size} selected</p>
                <div className="flex gap-2 text-xs">
                  <button onClick={() => setSelected(new Set(results.map((_,i)=>i)))} className="text-primary hover:underline">All</button>
                  <span className="text-muted-foreground">·</span>
                  <button onClick={() => setSelected(new Set())} className="text-muted-foreground hover:underline">None</button>
                </div>
              </div>
              <div className="space-y-2">
                {results.map((r, i) => {
                  const dc = daysFromNow(r.date);
                  return (
                    <div key={i} onClick={() => toggleSelect(i)}
                      className={cn("p-3 rounded-xl border cursor-pointer transition-all",
                        selected.has(i) ? "border-primary/40 bg-primary/5" : "border-border/40 bg-secondary/10 opacity-60",
                        r.isStrict && "border-warning/40 bg-warning/5")}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 flex-1">
                          <div className={cn("w-4 h-4 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center",
                            selected.has(i) ? "border-primary bg-primary" : "border-muted-foreground")}>
                            {selected.has(i) && <span className="text-white text-[9px]">✓</span>}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {r.isStrict && <AlertCircle className="w-3.5 h-3.5 text-warning" />}
                              <p className="text-sm font-semibold">{r.name.replace(" (STRICT)", "")}</p>
                            </div>
                            {r.note && <p className="text-xs text-muted-foreground">{r.note}</p>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold">{fmtDate(r.date)}</p>
                          <div className="flex items-center gap-2 justify-end mt-0.5">
                            <span className={cn("text-[10px] font-semibold", dc.color)}>{dc.label}</span>
                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded border capitalize", TYPE_COLOR[r.type])}>{r.type}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 p-3 rounded-lg bg-warning/5 border border-warning/20 text-xs text-warning/90">
                <p className="font-semibold mb-1">⚠ Disclaimer</p>
                <p>Based on Kenya Civil Procedure Rules, Court of Appeal Rules 2022, Elections Act and other legislation. Always verify against current rules &amp; specific court orders. Strict deadlines cannot be extended.</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          {calculated && selected.size > 0 && (
            <Button onClick={handleAdd} className="btn-royal">
              <Plus className="w-4 h-4 mr-2" /> Add {selected.size} to Calendar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
