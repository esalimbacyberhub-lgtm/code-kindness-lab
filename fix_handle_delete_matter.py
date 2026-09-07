path = "src/features/legal/views/Matters.tsx"
with open(path, "r") as f:
    content = f.read()

old = '''  const handleDeleteMatter = (matter: Matter) => {
    if (!confirm(`Delete matter "${matter.title}" (${matter.fileNo})?\\n\\nThis permanently removes the case file and cannot be undone.`)) return;
    onDeleteMatter?.(matter.id);
    setSelected(null);
  };'''

new = '''  const handleDeleteMatter = (matter: Matter) => {
    if (onDeleteMatterWithPassword) {
      setMatterDeleteTarget(matter);
      setMatterDeleteError("");
      setMatterDeletePassword("");
      return;
    }
    if (!confirm(`Delete matter "${matter.title}" (${matter.fileNo})?\\n\\nThis permanently removes the case file and cannot be undone.`)) return;
    onDeleteMatter?.(matter.id);
    setSelected(null);
  };'''

if old not in content:
    print("❌ Anchor not found — no changes written.")
    raise SystemExit(1)

content = content.replace(old, new, 1)
with open(path, "w") as f:
    f.write(content)

print("✅ handleDeleteMatter now correctly opens the password dialog.")
