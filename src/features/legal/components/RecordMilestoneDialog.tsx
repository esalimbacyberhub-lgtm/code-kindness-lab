import { useState, useEffect } from "react";
import { FileText, UserCheck, FileCheck, Scale } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Matter } from "../types";
import type { MilestoneType } from "../hooks/useCaseMilestones";

interface Props {
  matter: Matter | null;
  open: boolean;
  onClose: () => void;
  onSave: (milestoneType: MilestoneType, eventDate: string, includesCounterclaim: boolean) => void;
}

const MILESTONES: { id: MilestoneType; label: string; icon: typeof FileText; preview: string }[] = [
  {
    id: "plaint_filed",
    label: "Plaint Filed",
    icon: FileText,
    preview: "Will auto-generate: Service of Summons (+30 days), Entering Appearance estimate (+45 days).",
  },
  {
    id: "appearance_entered",
    label: "Appearance Entered",
    icon: UserCheck,
    preview: "Will auto-generate: File Defence (+14 days), Counterclaim reminder (+14 days).",
  },
  {
    id: "defence_served",
    label: "Defence Served",
    icon: FileCheck,
    preview: "Will auto-generate: File Reply (+14 days).",
  },
  {
    id: "judgment_delivered",
    label: "Judgment Delivered",
    icon: Scale,
    preview: "Will auto-generate: Notice of Appeal (+14 days), Memorandum of Appeal (+30 or 60 days depending on court), Record of Appeal (+60 days).",
  },
];

export function RecordMilestoneDialog({ matter, open, onClose, onSave }: Props) {
  const [milestoneType, setMilestoneType] = useState<MilestoneType>("plaint_filed");
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10));
  const [includesCounterclaim, setIncludesCounterclaim] = useState(false);

  useEffect(() => {
    if (open) {
      setMilestoneType("plaint_filed");
      setEventDate(new Date().toISOString().slice(0, 10));
      setIncludesCounterclaim(false);
    }
  }, [open]);

  if (!matter) return null;

  const selected = MILESTONES.find(m => m.id === milestoneType)!;

  const save = () => {
    if (!eventDate) return;
    onSave(milestoneType, eventDate, includesCounterclaim);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="glass-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Record Case Milestone</DialogTitle>
          <p className="text-xs text-muted-foreground">{matter.fileNo} - {matter.title}</p>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-2">
            {MILESTONES.map(m => (
              <button key={m.id} onClick={() => setMilestoneType(m.id)}
                className={cn("flex flex-col items-center gap-1 p-3 rounded-lg border text-xs font-semibold transition-all text-center",
                  milestoneType === m.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40")}>
                <m.icon className="w-4 h-4" />
                {m.label}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} />
          </div>

          {milestoneType === "defence_served" && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={includesCounterclaim}
                onChange={e => setIncludesCounterclaim(e.target.checked)}
                className="w-4 h-4 rounded border-border" />
              Includes a Counterclaim (adds Defence to Counterclaim deadline, +15 days)
            </label>
          )}

          <div className="text-xs text-muted-foreground bg-background/40 rounded-lg p-3 border border-border/60">
            {selected.preview} These are estimates — verify against the actual court documents.
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={!eventDate} className="btn-royal">Record & Generate Deadlines</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
