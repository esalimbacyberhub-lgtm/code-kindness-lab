path = "src/features/legal/components/NewMatterDialog.tsx"
with open(path, "r") as f:
    content = f.read()

edits = [
    # 1. Add useCourtRegistries import
    (
        'import type { Matter } from "../types";',
        '''import type { Matter } from "../types";
import { useCourtRegistries } from "../hooks/useCourtRegistries";'''
    ),
    # 2. Add court-code map (mirrors backend set_matter_file_no()) for accurate live preview
    (
        '''function genFileNo(
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
}''',
        '''// Court category -> code, mirrors set_matter_file_no() on the backend so the
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
}'''
    ),
    # 3. Extend BLANK state with litigious/court fields
    (
        '''const BLANK = {
  client:     "",
  title:      "",
  type:       "Civil Litigation" as Matter["type"],
  customType: "",
  isCustom:   false,
  plaintiffs: [""] as string[],
  defendants: [""] as string[],
};''',
        '''const BLANK = {
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
};'''
    ),
    # 4. Wire up useCourtRegistries + compute effective court code for preview
    (
        '''export function NewMatterDialog({ open, onOpenChange, onCreate, matters = [], matterCount = 0 }: Props) {
  const [f, setF] = useState(BLANK);
  const set = (k: keyof typeof BLANK, v: string | boolean) =>
    setF(p => ({ ...p, [k]: v }));

  // Live case number preview
  const fileNo = genFileNo(
    f.type,
    matters,
    f.isCustom && f.customType.trim()
      ? f.customType.trim().toUpperCase().replace(/\\s+/g, "").slice(0, 6)
      : undefined,
  );''',
        '''export function NewMatterDialog({ open, onOpenChange, onCreate, matters = [], matterCount = 0 }: Props) {
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
          ? f.customType.trim().toUpperCase().replace(/\\s+/g, "").slice(0, 6)
          : undefined),
  );'''
    ),
    # 5. On submit, pass court through + register a custom station if used
    (
        '''  const submit = () => {
    if (!f.client.trim() || !f.title.trim()) return;
    const effectiveType = (
      f.isCustom && f.customType.trim() ? f.customType.trim() : f.type
    ) as Matter["type"];

    onCreate({
      client:      f.client.trim(),
      title:       f.title.trim(),
      type:        effectiveType,
      partyA:      partyAPreview,
      partyB:      partyBPreview,
      // fileNo intentionally omitted -- DB trigger assigns it atomically on insert
      openedDate:  new Date().toISOString().split("T")[0],
    });
    reset();
    onOpenChange(false);
  };''',
        '''  const submit = () => {
    if (!f.client.trim() || !f.title.trim()) return;
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
      // fileNo intentionally omitted -- DB trigger assigns it atomically on insert
      openedDate:  new Date().toISOString().split("T")[0],
    });
    reset();
    onOpenChange(false);
  };'''
    ),
    # 6. Add the Court Level / Station UI section, right after Matter Type block
    (
        '''            {f.isCustom && (
              <Input
                value={f.customType}
                onChange={e => set("customType", e.target.value)}
                placeholder="e.g. Admiralty, Arbitration, Regulatory, Employment…"
                className="mt-1.5"
              />
            )}
          </div>

          {/* ── Parties ── */}''',
        '''            {f.isCustom && (
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
              <div className="grid grid-cols-2 gap-3 pl-6">
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
                    <Select value={f.courtStation} onValueChange={v => set("courtStation", v)}>
                      <SelectTrigger><SelectValue placeholder="Select station…" /></SelectTrigger>
                      <SelectContent>
                        {(courtStationsMap[f.courtLevel] || []).map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                        <SelectItem value="__custom__" onSelect={() => set("useCustomStation", true)}>
                          <span className="text-primary">✎ Other — specify manually</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Parties ── */}'''
    ),
]

for i, (old, new) in enumerate(edits, 1):
    if old not in content:
        print(f"❌ Edit {i} FAILED — anchor text not found. Stopping, no changes written.")
        raise SystemExit(1)
    content = content.replace(old, new, 1)
    print(f"✅ Edit {i} applied")

with open(path, "w") as f:
    f.write(content)

print("\nAll edits applied successfully.")
