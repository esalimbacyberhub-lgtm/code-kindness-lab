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
import { FileText, Users, Plus, X } from "lucide-react";
import type { Matter } from "../types";
import { useCourtRegistries } from "../hooks/useCourtRegistries";
import { supabase } from "@/lib/supabase";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreate: (m: Omit<Matter, "id" | "status">) => void;
  matters?: any[];
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

// Court category -> code, mirrors set_matter_file_no() on the backend so the
// live preview matches what the DB trigger will actually assign.
const COURT_CATEGORY_CODES: Record<string, string> = {
  "Supreme Court":                        "SC",
  "Court of Appeal":                      "COA",
  "High Court":                           "HC",
  "Environment & Land Court":             "ELC",
  "Employment & Labour Relations Court":  "ELRC",
  "Magistrates Court":                    "MC",
  "Kadhis Court":                         "KC",
  "Small Claims Court":                   "SCC",
  "Tribunal":                             "TRB",
};

function genFileNo(
  type: Matter["type"],
  matters: any[],
  customAbbrev?: string,
): string {
  const abbrev =
    customAbbrev ||
    MATTER_TYPES.find(t => t.value === type)?.abbrev ||
    "OTH";
  const year = new Date().getFullYear();
  // Count only matters of THIS type filed THIS year — auto-reset every January
  const yearTypeCount = matters.filter((m: any) => {
    if (!m.fileNo) return false;
    return m.fileNo.startsWith(`OM/${abbrev}/`) && m.fileNo.endsWith(`/${year}`);
  }).length;
  return `OM/${abbrev}/${String(yearTypeCount + 1).padStart(3, "0")}/${year}`;
}

// ── Blank form state ─────────────────────────────────────────────────────────
const BLANK = {
  client:         "",
  title:          "",
  type:           "Civil Litigation" as Matter["type"],
  customType:     "",
  isCustom:       false,
  plaintiffs:     [""] as string[],
  defendants:     [""] as string[],
  isLitigious:    false,
  courtLevel:     "High Court",
  courtStation:   "",
  customStation:  "",
  useCustomStation: false,
  manualNo:       false,
  manualSeq:      "",
  manualYear:     String(new Date().getFullYear()),
};

export function NewMatterDialog({ open, onOpenChange, onCreate, matters = [], matterCount = 0 }: Props) {
  const [f, setF] = useState(BLANK);
  const set = (k: keyof typeof BLANK, v: string | boolean) =>
    setF(p => ({ ...p, [k]: v }));

  const { byCategory, addCustomRegistry } = useCourtRegistries();
  const courtStationsMap = byCategory();

  const effectiveStation = f.useCustomStation ? f.customStation.trim() : f.courtStation;

  // Live case number preview — uses the court code when this is a litigious
  // matter with a station picked, otherwise falls back to the type-based code
  // (mirrors exactly what set_matter_file_no() does server-side)
  const fileNo = genFileNo(
    f.type,
    matters,
    f.isLitigious && effectiveStation
      ? COURT_CATEGORY_CODES[f.courtLevel]
      : (f.isCustom && f.customType.trim()
          ? f.customType.trim().toUpperCase().replace(/\s+/g, "").slice(0, 6)
          : undefined),
  );

  const reset = () => setF(BLANK);

  // Manual case number: the prefix mirrors what set_matter_file_no() would use
  const [busy, setBusy] = useState(false);
  const caseCode =
    f.isLitigious && effectiveStation
      ? COURT_CATEGORY_CODES[f.courtLevel]
      : (f.isCustom && f.customType.trim()
          ? f.customType.trim().toUpperCase().replace(/\s+/g, "").slice(0, 6)
          : (MATTER_TYPES.find(t => t.value === f.type)?.abbrev || "OTH"));
  const seqNum  = parseInt(f.manualSeq, 10);
  const yearNum = parseInt(f.manualYear, 10);
  const manualValid =
    Number.isInteger(seqNum) && seqNum >= 1 && seqNum <= 9999 &&
    Number.isInteger(yearNum) && yearNum >= 1990 && yearNum <= new Date().getFullYear() + 1;
  const manualFileNo = manualValid
    ? `OM/${caseCode}/${String(seqNum).padStart(3, "0")}/${yearNum}`
    : "";
  const shownFileNo = f.manualNo
    ? (manualFileNo || `OM/${caseCode}/___/${f.manualYear}`)
    : fileNo;

  // Multi-party helpers
  const updateParty = (side: "plaintiffs" | "defendants", idx: number, value: string) =>
    setF(p => {
      const arr = [...(p as any)[side]];
      arr[idx] = value;
      return { ...p, [side]: arr };
    });
  const addParty = (side: "plaintiffs" | "defendants") =>
    setF(p => ({ ...p, [side]: [...(p as any)[side], ""] }));
  const removeParty = (side: "plaintiffs" | "defendants", idx: number) =>
    setF(p => {
      const arr = (p as any)[side].filter((_: any, i: number) => i !== idx);
      return { ...p, [side]: arr.length ? arr : [""] };
    });
  const partyAPreview = f.plaintiffs.map((s: string) => s.trim()).filter(Boolean).join(" & ");
  const partyBPreview = f.defendants.map((s: string) => s.trim()).filter(Boolean).join(" & ");

  const submit = async () => {
    if (!f.client.trim() || !f.title.trim()) return;
    let reservedNo: string | undefined;
    if (f.manualNo) {
      if (!manualValid) { alert("Enter a valid sequence number (1-9999) and year."); return; }
      setBusy(true);
      const { data, error } = await supabase.rpc("reserve_matter_number", {
        p_code: caseCode, p_year: yearNum, p_seq: seqNum,
      });
      setBusy(false);
      if (error) { alert("Could not reserve that case number: " + error.message); return; }
      reservedNo = (data as string) || manualFileNo;
    }
    const effectiveType = (
      f.isCustom && f.customType.trim() ? f.customType.trim() : f.type
    ) as Matter["type"];

    if (f.isLitigious && f.useCustomStation && f.customStation.trim()) {
      addCustomRegistry(f.customStation.trim(), f.courtLevel);
    }

    onCreate({
      client:      f.client.trim(),
      title:       f.title.trim(),
      type:        effectiveType,
      partyA:      partyAPreview,
      partyB:      partyBPreview,
      // court: exact court_registries.name so the DB trigger's category lookup matches
      court:       f.isLitigious && effectiveStation ? effectiveStation : undefined,
      // Automatic: fileNo omitted and the DB trigger assigns it atomically on insert.
      // Manual: the number was validated and reserved above.
      ...(reservedNo ? { fileNo: reservedNo } : {}),
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
              {f.manualNo ? "Manual Case Number" : "Auto Case Number"}
            </p>
            <p className="font-mono font-bold text-primary text-xl leading-none tracking-wide">
              {shownFileNo}
            </p>
          </div>
        </div>

        {/* ── Manual case number (optional) ── */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={f.manualNo}
              onChange={e => set("manualNo", e.target.checked)}
              className="rounded border-border"
            />
            <span className="text-sm">Enter case number manually</span>
          </label>
          {f.manualNo && (
            <div className="grid grid-cols-3 gap-3 pl-6">
              <div className="space-y-1.5">
                <Label>Prefix</Label>
                <Input value={`OM/${caseCode}`} disabled className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label>Sequence</Label>
                <Input
                  inputMode="numeric"
                  value={f.manualSeq}
                  onChange={e => set("manualSeq", e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="e.g. 012"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Year</Label>
                <Input
                  inputMode="numeric"
                  value={f.manualYear}
                  onChange={e => set("manualYear", e.target.value.replace(/\D/g, "").slice(0, 4))}
                />
              </div>
              <p className="col-span-3 text-[11px] text-muted-foreground">
                The prefix follows the court or matter type chosen below, so the matter stays in the right court group.
              </p>
            </div>
          )}
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

          {/* ── Litigious / Court matter toggle ── */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={f.isLitigious}
                onChange={e => set("isLitigious", e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-sm">This is a litigious matter filed in court</span>
            </label>

            {f.isLitigious && (
              <div className="grid grid-cols-2 gap-3 pl-6 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="space-y-1.5">
                  <Label>Court Level</Label>
                  <Select
                    value={f.courtLevel}
                    onValueChange={v => setF(p => ({ ...p, courtLevel: v, courtStation: "", customStation: "", useCustomStation: false }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(COURT_CATEGORY_CODES).map(level => (
                        <SelectItem key={level} value={level}>
                          <span className="font-mono text-[11px] text-muted-foreground mr-2">
                            {COURT_CATEGORY_CODES[level]}
                          </span>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Court Station / Registry</Label>
                  {f.useCustomStation ? (
                    <Input
                      value={f.customStation}
                      onChange={e => set("customStation", e.target.value)}
                      placeholder="Type exact court station name…"
                    />
                  ) : (
                    <Select
                      value={f.courtStation}
                      onValueChange={v => {
                        if (v === "__custom__") {
                          setF(p => ({ ...p, useCustomStation: true, courtStation: "" }));
                        } else {
                          set("courtStation", v);
                        }
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Select station…" /></SelectTrigger>
                      <SelectContent>
                        {(courtStationsMap[f.courtLevel] || []).map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                        <SelectItem value="__custom__">
                          <span className="text-primary">✎ Other — specify manually</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
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
              <div className="space-y-1.5">
                <p className="text-[11px] text-muted-foreground">
                  Plaintiff / Applicant / Petitioner
                </p>
                {f.plaintiffs.map((name: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <Input
                      value={name}
                      onChange={e => updateParty("plaintiffs", idx, e.target.value)}
                      placeholder={f.plaintiffs.length > 1 ? `Plaintiff ${idx + 1}` : "Party A"}
                    />
                    {f.plaintiffs.length > 1 && (
                      <button type="button" onClick={() => removeParty("plaintiffs", idx)}
                        className="text-muted-foreground hover:text-destructive shrink-0" title="Remove">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => addParty("plaintiffs")}
                  className="text-[11px] text-primary hover:underline font-medium flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add plaintiff
                </button>
              </div>
              <div className="space-y-1.5">
                <p className="text-[11px] text-muted-foreground">
                  Defendant / Respondent
                </p>
                {f.defendants.map((name: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <Input
                      value={name}
                      onChange={e => updateParty("defendants", idx, e.target.value)}
                      placeholder={f.defendants.length > 1 ? `Defendant ${idx + 1}` : "Party B"}
                    />
                    {f.defendants.length > 1 && (
                      <button type="button" onClick={() => removeParty("defendants", idx)}
                        className="text-muted-foreground hover:text-destructive shrink-0" title="Remove">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => addParty("defendants")}
                  className="text-[11px] text-primary hover:underline font-medium flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add defendant
                </button>
              </div>
            </div>

            {/* Live party preview */}
            {(partyAPreview || partyBPreview) && (
              <div className="px-4 py-2.5 rounded-lg bg-muted/30 border border-border text-center">
                <p className="text-sm font-serif italic text-foreground/90 leading-relaxed">
                  <span className="font-semibold not-italic">{partyAPreview || "—"}</span>
                  <span className="text-primary font-sans font-bold not-italic mx-2">v.</span>
                  <span className="font-semibold not-italic">{partyBPreview || "—"}</span>
                </p>
                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{shownFileNo}</p>
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
            disabled={!f.client.trim() || !f.title.trim() || busy}
            className="btn-royal"
          >
            Open Matter →
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
