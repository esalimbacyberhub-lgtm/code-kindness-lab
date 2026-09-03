path = "src/features/legal/views/Matters.tsx"
with open(path, "r") as f:
    content = f.read()

old = '''// Court group — derived from the file number prefix (…/HC/003/2026 -> "High Court")
function getMatterCourtGroup(m: Matter): string {
  const code = m.fileNo?.split("/")[1];
  if (code && COURT_CODE_LABELS[code]) return COURT_CODE_LABELS[code];
  return "Non-Litigious";
}'''

new = '''// Court group — derived from the file number prefix (…/HC/003/2026 -> "High Court").
// Falls back to a PREFIX match for legacy matters filed before the court-trigger
// existed, whose custom type codes embed a court hint (e.g. "HCCOMM", "ELCLMISC").
// Checked longest-code-first so e.g. "ELRC..." isn't wrongly caught by "ELC".
// NOTE: "COA" is intentionally excluded — "COACA"/"COACAPPL" are ambiguous
// (Court of Appeal vs. Companies Act) and need manual confirmation from Omuyoma
// before being auto-classified. Add "COA" back into this list once confirmed.
const LEGACY_PREFIX_CODES = ["ELRC", "ELC", "HC", "SCC", "SC", "MC", "KC", "TRB"];

function getMatterCourtGroup(m: Matter): string {
  const code = m.fileNo?.split("/")[1];
  if (!code) return "Non-Litigious";
  if (COURT_CODE_LABELS[code]) return COURT_CODE_LABELS[code];
  const prefixMatch = LEGACY_PREFIX_CODES.find(p => code.startsWith(p));
  if (prefixMatch) return COURT_CODE_LABELS[prefixMatch];
  return "Non-Litigious";
}'''

if old not in content:
    print("❌ Anchor not found — no changes written.")
    raise SystemExit(1)

content = content.replace(old, new, 1)
with open(path, "w") as f:
    f.write(content)

print("✅ Court grouping now does prefix matching for legacy matter codes.")
