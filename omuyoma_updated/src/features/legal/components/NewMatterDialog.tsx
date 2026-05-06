import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Matter } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreate: (m: Omit<Matter, "id" | "status">) => void;
}

const TYPES: Matter["type"][] = ["Civil Litigation", "Commercial", "Family Law", "Criminal", "Conveyancing"];

export function NewMatterDialog({ open, onOpenChange, onCreate }: Props) {
  const [client, setClient] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<Matter["type"]>("Civil Litigation");

  const submit = () => {
    if (!client.trim() || !title.trim()) return;
    onCreate({ client: client.trim(), title: title.trim(), type });
    setClient(""); setTitle(""); setType("Civil Litigation");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-border">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">New Matter</DialogTitle>
          <DialogDescription>Open a new client matter on the firm's docket.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="client">Client name</Label>
            <Input id="client" value={client} onChange={(e) => setClient(e.target.value)} placeholder="e.g. Acme Ltd" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Matter title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Acme contract dispute" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Matter type</Label>
            <Select value={type} onValueChange={(v) => setType(v as Matter["type"])}>
              <SelectTrigger id="type"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} className="bg-primary text-primary-foreground hover:bg-primary/90">Create matter</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
