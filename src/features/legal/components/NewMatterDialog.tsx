import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FileText, Users } from "lucide-react";
import type { Matter } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreate: (m: Omit<Matter, "id" | "status">) => void;
  matterCount?: number;
}

// ── Matter types with OM/ abbreviations ─────────────────────────────────────
const MATTER_TYPES: { value: Matter["type"]; abbrev: string }[] = [
  { value: "Civil Litigation",         abbrev: "CL"   },
  { value: "Commercial",               abbrev: "COM"  },
  { value: "Family Law",               abbrev: "FL"   },
  { value: "Criminal",                 abbrev: "CR"   },
  { value: "Conveyancing",             abbrev: "CONV" },
  { value: "Intellectual Property",    abbrev: "IP"   },
  { value: "Probate & Administration", abbrev: "PA"   },
];

function genFileNo(
  type: Matter["type"],
  count: number,
  customAbbrev?: string,
): string {
  const abbrev =
    customAbbrev ||
    MATTER_TYPES.find(t => t.value === type)?.abbrev ||
    "OTH";
  return `OM/${abbrev}/${String(count + 1).padStart(3, "0")}`;
}

// ── Blank form state ─────────────────────────────────────────────────────────
const BLANK = {
  client:     "",
  title:      "",
  type:       "Civil Litigation" as Matter["type"],
  customType: "",
  isCustom:   false,
  partyA:     "",
  partyB:     "",
};

export function NewMatterDialog({ open, onOpenChange, onCreate, matterCount = 0 }: Props) {
  const [f, setF] = useState(BLANK);
  const set = (k: keyof typeof BLANK, v: string | boolean) =>
    setF(p => ({ ...p, [k]: v }));

  // Live case number preview
  const fileNo = genFileNo(
    f.type,
    matterCount,
    f.isCustom && f.customType.trim()
      ? f.customType.trim().toUpperCase().replace(/\s+/g, "").slice(0, 6)
      : undefined,
  );

  const reset = () => setF(BLANK);

  const submit = () => {
    if (!f.client.trim() || !f.title.trim()) return;
    const effectiveType = (
      f.isCustom && f.customType.trim() ? f.customType.trim() : f.type
    ) as Matter["type"];

    onCreate({
      client:      f.client.trim(),
      title:       f.title.trim(),
      type:        effectiveType,
      partyA:      f.partyA.trim(),
      partyB:      f.partyB.trim(),
      fileNo,
      openedDate:  new Date().toISOString().split("T")[0],
    });
    reset();
    onOpenChange(false);
  };

  const handleTypeChange = (v: string) => {
    if (v === "__custom__") {
      set("isCustom", true);
    } else {
      setF(p => ({ ...p, isCustom: false, type: v as Matter["type"] }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="glass-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">New Matter</DialogTitle>
          <DialogDescription>
            Open a new client matter. A case number will be auto-assigned.
          </DialogDescription>
        </DialogHeader>

        {/* ── Auto Case Number Badge ── */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 border border-primary/25">
          <FileText className="w-5 h-5 text-primary shrink-0" />
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground font-mono mb-0.5">
              Auto Case Number
            </p>
            <p className="font-mono font-bold text-primary text-xl leading-none tracking-wide">
              {fileNo}
            </p>
          </div>
        </div>

        <div className="space-y-4 py-1">

          {/* ── Client ── */}
          <div className="space-y-1.5">
            <Label htmlFor="nm-client">Client Name *</Label>
            <Input
              id="nm-client"
              value={f.client}
              onChange={e => set("client", e.target.value)}
              placeholder="e.g. Kamau Holdings Ltd"
            />
          </div>

          {/* ── Matter Title ── */}
          <div className="space-y-1.5">
            <Label htmlFor="nm-title">Matter Title *</Label>
            <Input
              id="nm-title"
              value={f.title}
              onChange={e => set("title", e.target.value)}
              placeholder="e.g. Kamau v. Otieno — Land Dispute"
            />
          </div>

          {/* ── Matter Type ── */}
          <div className="space-y-1.5">
            <Label htmlFor="nm-type">Matter Type</Label>
            <Select
              value={f.isCustom ? "__custom__" : f.type}
              onValueChange={handleTypeChange}
            >
              <SelectTrigger id="nm-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MATTER_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    <span className="font-mono text-[11px] text-muted-foreground mr-2">
                      OM/{t.abbrev}
                    </span>
                    {t.value}
                  </SelectItem>
                ))}
                <SelectItem value="__custom__">
                  <span className="text-primary">✎ Other — specify manually</span>
                </SelectItem>
              </SelectContent>
            </Select>
            {f.isCustom && (
              <Input
                value={f.customType}
                onChange={e => set("customType", e.target.value)}
                placeholder="e.g. Admiralty, Arbitration, Regulatory, Employment…"
                className="mt-1.5"
              />
            )}
          </div>

          {/* ── Parties ── */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <Label className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-mono">
                Parties to the Case
              </Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">
                  Plaintiff / Applicant / Petitioner
                </p>
                <Input
                  value={f.partyA}
                  onChange={e => set("partyA", e.target.value)}
                  placeholder="Party A"
                />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">
                  Defendant / Respondent
                </p>
                <Input
                  value={f.partyB}
                  onChange={e => set("partyB", e.target.value)}
                  placeholder="Party B"
                />
              </div>
            </div>

            {/* Live party preview */}
            {(f.partyA || f.partyB) && (
              <div className="px-4 py-2.5 rounded-lg bg-muted/30 border border-border text-center">
                <p className="text-sm font-serif italic text-foreground/90 leading-relaxed">
                  <span className="font-semibold not-italic">{f.partyA || "—"}</span>
                  <span className="text-primary font-sans font-bold not-italic mx-2">v.</span>
                  <span className="font-semibold not-italic">{f.partyB || "—"}</span>
                </p>
                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{fileNo}</p>
              </div>
            )}
          </div>

        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => { reset(); onOpenChange(false); }}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!f.client.trim() || !f.title.trim()}
            className="btn-royal"
          >
            Open Matter →
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
