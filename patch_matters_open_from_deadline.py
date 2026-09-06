path = "src/features/legal/views/Matters.tsx"
with open(path, "r") as f:
    content = f.read()

old = '''  // Reset folder view when switching matters
  useEffect(() => { setActiveFolder(null); }, [selected]);'''

new = '''  // Reset folder view when switching matters
  useEffect(() => { setActiveFolder(null); }, [selected]);

  // If the Dashboard's "Deadlines" list was clicked, jump straight into that matter
  useEffect(() => {
    const targetId = sessionStorage.getItem("omuyoma_open_matter_id");
    if (!targetId) return;
    const match = matters.find(m => m.id === targetId);
    if (match) {
      setSelected(match);
      sessionStorage.removeItem("omuyoma_open_matter_id");
    }
  }, [matters]);'''

if old not in content:
    print("❌ Anchor not found — no changes written.")
    raise SystemExit(1)

content = content.replace(old, new, 1)
with open(path, "w") as f:
    f.write(content)

print("✅ Matters.tsx now auto-opens the matter linked from a clicked deadline.")
