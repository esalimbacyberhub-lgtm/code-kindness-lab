path = "src/pages/Index.tsx"
with open(path, "r") as f:
    content = f.read()

old = 'onUpdateMatter={updateMatter} onUpdateDocument={updateDocument} onDeleteMatter={deleteMatter} onDeleteMatterWithPassword={deleteMatterWithPassword} />'
new = 'onUpdateMatter={updateMatter} onUpdateDocument={updateDocument} onDeleteMatter={deleteMatter} onDeleteMatterWithPassword={deleteMatterWithPassword} onAddDeadline={addDeadline} />'

if old not in content:
    print("❌ Anchor not found — no changes written.")
    raise SystemExit(1)

content = content.replace(old, new, 1)
with open(path, "w") as f:
    f.write(content)

print("✅ addDeadline now threaded to MatterHub.")
