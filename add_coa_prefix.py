path = "src/features/legal/views/Matters.tsx"
with open(path, "r") as f:
    content = f.read()

old = '''// Court group — derived from the file number prefix (…/HC/003/2026 -> "High Court").
// Falls back to a PREFIX match for legacy matters filed before the court-trigger
// existed, whose custom type codes embed a court hint (e.g. "HCCOMM", "ELCLMISC").
// Checked longest-code-first so e.g. "ELRC..." isn't wrongly caught by "ELC".
// NOTE: "COA" is intentionally excluded — "COACA"/"COACAPPL" are ambiguous
// (Court of Appeal vs. Companies Act) and need manual confirmation from Omuyoma
// before being auto-classified. Add "COA" back into this list once confirmed.
const LEGACY_PREFIX_CODES = ["ELRC", "ELC", "HC", "SCC", "SC", "MC", "KC", "TRB"];'''

new = '''// Court group — derived from the file number prefix (…/HC/003/2026 -> "High Court").
// Falls back to a PREFIX match for legacy matters filed before the court-trigger
// existed, whose custom type codes embed a court hint (e.g. "HCCOMM", "ELCLMISC").
// Checked longest-code-first so e.g. "ELRC..." isn't wrongly caught by "ELC".
// "COA" confirmed by Omuyoma as Court of Appeal (covers COACA/COACAPPL).
const LEGACY_PREFIX_CODES = ["ELRC", "ELC", "HC", "SCC", "SC", "MC", "KC", "TRB", "COA"];'''

if old not in content:
    print("❌ Anchor not found — no changes written.")
    raise SystemExit(1)

content = content.replace(old, new, 1)
with open(path, "w") as f:
    f.write(content)

print("✅ Added COA to legacy prefix matching.")
