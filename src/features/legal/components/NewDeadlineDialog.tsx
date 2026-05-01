import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Deadline, DeadlineType, Matter } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreate: (d: Omit<Deadline, "id">) => void;
  matters: Matter[];
  defaultDate?: string;
}

const TYPES: { value: DeadlineType; label: string }[] = [
  { value: "hearing", label: "Hearing" },
  { value: "filing", label: "Filing" },
  { value: "mention", label: "Mention" },
  { value: "ruling", label: "Ruling" },
  { value: "lsk", label: "LSK Event" },
];

export function NewDeadlineDialog({ open, onOpenChange, onCreate, matters, defaultDate }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [title, setTitle] = useState("");
  const [matter, setMatter] = useState("");
  const [court, setCourt] = useState("");
  const [date, setDate] = useState(defaultDate ?? today);
  const [type, setType] = useState<DeadlineType>("hearing");

  const submit = () => {
    if (!title.trim() || !date) return;
    onCreate({
      title: title.trim(),
      matter: matter.trim() || "—",
      court: court.trim() || "—",
      date,
      type,
    });
    setTitle(""); setMatter(""); setCourt(""); setType("hearing");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-border">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">New Deadline</DialogTitle>
          <DialogDescription>Add a hearing, filing, mention, ruling or LSK event to the docket.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="d-title">Title</Label>
            <Input id="d-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Hearing — plaint amendment" maxLength={120} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="d-matter">Matter</Label>
              {matters.length > 0 ? (
                <Select value={matter} onValueChange={setMatter}>
                  <SelectTrigger id="d-matter"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {matters.map(m => <SelectItem key={m.id} value={m.title}>{m.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input id="d-matter" value={matter} onChange={(e) => setMatter(e.target.value)} placeholder="Matter name" maxLength={120} />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="d-court">Court / Venue</Label>
              <Input id="d-court" value={court} onChange={(e) => setCourt(e.target.value)} placeholder="e.g. Milimani CMCC" maxLength={120} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="d-date">Date</Label>
              <Input id="d-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="d-type">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as DeadlineType)}>
                <SelectTrigger id="d-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} className="bg-primary text-primary-foreground hover:bg-primary/90">Add deadline</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}