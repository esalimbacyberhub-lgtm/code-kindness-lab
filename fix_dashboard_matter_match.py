path = "src/features/legal/views/Dashboard.tsx"
with open(path, "r") as f:
    content = f.read()

old = '''  const openMatterFromDeadline = (d: Deadline) => {
    const match = d.matter && d.matter !== "General" ? matters.find((m: any) => m.title === d.matter) : null;
    if (match) {
      sessionStorage.setItem("omuyoma_open_matter_id", match.id);
    }
    onGoToMatters?.();
  };'''

new = '''  const openMatterFromDeadline = (d: Deadline) => {
    if (d.matterId) {
      sessionStorage.setItem("omuyoma_open_matter_id", d.matterId);
    }
    onGoToMatters?.();
  };'''

if old not in content:
    print("❌ Anchor not found — no changes written.")
    raise SystemExit(1)

content = content.replace(old, new, 1)
with open(path, "w") as f:
    f.write(content)

print("✅ Dashboard now links deadlines to matters by ID, not by guessing text.")
