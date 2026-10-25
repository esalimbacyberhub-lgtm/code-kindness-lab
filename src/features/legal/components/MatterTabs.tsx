import { useMemo, useState } from "react";
import { Plus, FileText, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Deadline, Matter } from "../types";
import { useSupabaseCaseActivities } from "../hooks/useSupabaseCaseActivities";
import { formatDate } from "@/lib/formatDate";

const TYPE_LABEL: Record<string, string> = {
  hearing: "Hearing", filing: "Filing", mention: "Mention",
  ruling: "Ruling", deadline: "Deadline", lsk: "LSK",
};

function dayLabel(date: string): { text: string; cls: string } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const diff = Math.round((new Date(date + "T00:00:00").getTime() - start.getTime()) / 86400000);
  if (diff === 0) return { text: "Today", cls: "text-warning" };
  if (diff === 1) return { text: "Tomorrow", cls: "text-warning" };
  if (diff > 1) return { text: `${diff}d`, cls: diff <= 7 ? "text-warning" : diff <= 14 ? "text-info" : "text-muted-foreground" };
  return { text: `${-diff}d ago`, cls: "text-muted-foreground" };
}

const DRAFT_KINDS = [
  { key: "defence", label: "Defence" },
  { key: "motion", label: "Response to motion" },
  { key: "submissions", label: "Submissions" },
  { key: "other", label: "Other draft" },
] as const;
type DraftKind = (typeof DRAFT_KINDS)[number]["key"];

// Draft deadlines are titled "Draft: ..." (added here) or "Drafting — ..." (from a Drafting case activity)
const isDraftDeadline = (d: Deadline) => /^draft/i.test(String(d.title || ""));

interface DeadlinesProps {
  matter: Matter;
  deadlines: Deadline[];
  onAddDeadline?: (d: Omit<Deadline, "id">) => void;
  onAddTask?: (t: any) => void;
  canEdit: boolean;
}

export function MatterDeadlinesPanel({ matter, deadlines, onAddDeadline, onAddTask, canEdit }: DeadlinesProps) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<DraftKind>("defence");
  const [customName, setCustomName] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const today = formatDate(new Date());

  // Deadlines created from the calendar may be linked by id or only by file number
  const mine = useMemo(
    () => deadlines
      .filter(d => d.matterId === matter.id || (!!matter.fileNo && d.matter === matter.fileNo))
      .sort((a, b) => a.date.localeCompare(b.date)),
    [deadlines, matter.id, matter.fileNo],
  );
  const draftList = mine.filter(isDraftDeadline);
  const otherList = mine.filter(d => !isDraftDeadline(d));

  const label = kind === "other" ? customName.trim() : DRAFT_KINDS.find(k => k.key === kind)!.label;
  const canSave = !!date && !!label;

  const close = () => { setOpen(false); setKind("defence"); setCustomName(""); setDate(""); setNotes(""); };

  const submit = () => {
    if (!canSave || !onAddDeadline) return;
    const title = `Draft: ${label} — ${matter.title}`;
    onAddDeadline({
      title,
      matter: matter.fileNo || "General",
      matterId: matter.id,
      court: matter.court || "",
      date,
      type: "filing",
      summary: notes.trim() || undefined,
    });
    // A real task, so the draft can be worked through To Do, In Progress, Review and Done
    onAddTask?.({
      title,
      matter: matter.title || matter.fileNo || "",
      matterId: matter.id,
      priority: "high",
      status: "todo",
      due: date,
    });
    close();
  };

  const row = (d: Deadline, muted: boolean) => {
    const dl = dayLabel(d.date);
    return (
      <li key={d.id} className={cn("flex items-center gap-3 p-3 rounded-lg bg-secondary/20 border-l-4", muted ? "border-l-border opacity-70" : "border-l-brand-gold/40")}>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{d.title}</p>
          <p className="text-[11px] text-muted-foreground truncate">
            {[TYPE_LABEL[d.type] || d.type, d.court, d.summary].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-mono">{formatDate(d.date)}</p>
          <p className={cn("text-[11px] font-semibold", dl.cls)}>{dl.text}</p>
        </div>
      </li>
    );
  };

  const group = (list: Deadline[]) => {
    const upcoming = list.filter(d => d.date >= today);
    const past = list.filter(d => d.date < today).reverse();
    return (
      <div className="space-y-3">
        {upcoming.length > 0 && <ul className="space-y-2">{upcoming.map(d => row(d, false))}</ul>}
        {past.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-muted-foreground mb-2">Past</p>
            <ul className="space-y-2">{past.map(d => row(d, true))}</ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h3 className="font-semibold text-sm">Deadlines for this matter</h3>
        {canEdit && onAddDeadline && (
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 whitespace-nowrap text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 font-semibold"
          >
            <Plus className="w-3.5 h-3.5" /> Add draft deadline
          </button>
        )}
      </div>

      <div className="space-y-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-muted-foreground mb-2">Draft deadlines</p>
          {draftList.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No draft deadlines yet. One added here also appears in To Do on the Command Deck.
            </p>
          ) : group(draftList)}
        </div>
        {otherList.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-muted-foreground mb-2">Other court dates</p>
            {group(otherList)}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={o => { if (!o) close(); }}>
        <DialogContent className="glass-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Add draft deadline</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Draft *</Label>
              <Select value={kind} onValueChange={v => setKind(v as DraftKind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DRAFT_KINDS.map(k => <SelectItem key={k.key} value={k.key}>{k.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {kind === "other" && (
              <div className="space-y-1.5">
                <Label>Draft name *</Label>
                <Input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="e.g. Written submissions on costs" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Due date *</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Note (optional)</Label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Served on 2026-10-20" />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Added to this matter's Deadlines, the Calendar, and your To Do list.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button onClick={submit} disabled={!canSave} className="btn-royal">Add deadline</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function MatterDraftsPanel({ matter }: { matter: Matter }) {
  const { activities, loading, getDraftUrl } = useSupabaseCaseActivities(matter.id);
  const [opening, setOpening] = useState<string | null>(null);
  const drafts = activities.filter(a => !!a.draftPath);

  const open = async (id: string, path: string) => {
    setOpening(id);
    // Open the tab first so the browser's popup blocker allows it
    const w = window.open("", "_blank");
    const url = await getDraftUrl(path);
    if (url && w) w.location.href = url;
    else if (w) w.close();
    setOpening(null);
  };

  return (
    <div className="glass-card rounded-xl p-5">
      <h3 className="font-semibold text-sm mb-4">Drafts for this matter</h3>
      {loading && drafts.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Loading drafts...</p>
      ) : drafts.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No drafts attached yet. Attach one with the paperclip on a case activity.
        </p>
      ) : (
        <ul className="space-y-2">
          {drafts.map(a => (
            <li key={a.id}>
              <button
                onClick={() => open(a.id, a.draftPath as string)}
                className="w-full text-left flex items-center gap-3 p-3 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  {opening === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{a.draftName || "Draft"}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{a.activityType}</p>
                </div>
                <span className="text-xs font-mono text-muted-foreground shrink-0">{formatDate(a.activityDate)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
