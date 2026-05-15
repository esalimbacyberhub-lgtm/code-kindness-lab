import { useState, useEffect } from "react";
import { CheckCircle2, Clock, Gavel, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Matter } from "../types";

interface Props {
  matter: Matter | null;
  open: boolean;
  onClose: () => void;
  onSave: (updates: Partial<Matter>) => void;
}

export function CaseStatusDialog({ matter, open, onClose, onSave }: Props) {
  const [caseStatus, setCaseStatus] = useState<"pending" | "hearing-scheduled" | "completed">("pending");
  const [nextHearingDate, setNextHearingDate] = useState("");
  const [result, setResult] = useState<"won" | "lost" | "settled" | "withdrawn" | "dismissed" | "">("");
  const [resultNote, setResultNote] = useState("");
  const [resultDate, setResultDate] = useState("");

  useEffect(() => {
    if (matter) {
      setCaseStatus(matter.caseStatus || "pending");
      setNextHearingDate(matter.nextHearingDate || "");
      setResult((matter.result as any) || "");
      setResultNote(matter.resultNote || "");
      setResultDate(matter.resultDate || "");
    }
  }, [matter]);

  if (!matter) return null;

  const save = () => {
    const updates: Partial<Matter> = { caseStatus };
    if (caseStatus === "hearing-scheduled") updates.nextHearingDate = nextHearingDate;
    if (caseStatus === "completed") {
      updates.result = (result as any) || undefined;
      updates.resultNote = resultNote;
      updates.resultDate = resultDate || new Date().toISOString().slice(0, 10);
    }
    onSave(updates);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="glass-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Update Case Status</DialogTitle>
          <p className="text-xs text-muted-foreground">{matter.fileNo} - {matter.title}</p>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "pending", label: "Pending", icon: Clock, color: "warning" },
              { id: "hearing-scheduled", label: "Hearing", icon: Gavel, color: "info" },
              { id: "completed", label: "Completed", icon: CheckCircle2, color: "success" },
            ].map(s => (
              <button key={s.id} onClick={() => setCaseStatus(s.id as any)}
                className={cn("flex flex-col items-center gap-1 p-3 rounded-lg border text-xs font-semibold transition-all",
                  caseStatus === s.id ? `border-${s.color} bg-${s.color}/10 text-${s.color}` : "border-border text-muted-foreground hover:border-primary/40")}>
                <s.icon className="w-4 h-4" />
                {s.label}
              </button>
            ))}
          </div>

          {caseStatus === "hearing-scheduled" && (
            <div className="space-y-1.5">
              <Label>Next Hearing Date</Label>
              <Input type="date" value={nextHearingDate} onChange={e => setNextHearingDate(e.target.value)} />
            </div>
          )}

          {caseStatus === "completed" && (
            <>
              <div className="space-y-1.5">
                <Label>Result</Label>
                <Select value={result} onValueChange={v => setResult(v as any)}>
                  <SelectTrigger><SelectValue placeholder="Select outcome..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="won">Won / Allowed</SelectItem>
                    <SelectItem value="lost">Lost / Dismissed</SelectItem>
                    <SelectItem value="settled">Settled Out of Court</SelectItem>
                    <SelectItem value="withdrawn">Withdrawn</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Result Date</Label>
                <Input type="date" value={resultDate} onChange={e => setResultDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Brief Note (visible to client)</Label>
                <textarea value={resultNote} onChange={e => setResultNote(e.target.value)} rows={3}
                  placeholder="e.g. Judgment delivered in favour of the client. Damages of KES 500,000 awarded."
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary resize-none" />
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} className="btn-royal">Save Status</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
