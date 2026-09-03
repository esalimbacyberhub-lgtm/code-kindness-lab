path = "src/features/legal/views/Dashboard.tsx"
with open(path, "r") as f:
    content = f.read()

old = '<h3 className="font-semibold text-sm">Upcoming Court Dates &amp; Deadlines</h3>'
new = '<h3 className="font-semibold text-sm">Deadlines</h3>'

if old not in content:
    print("❌ Anchor not found — no changes written.")
    raise SystemExit(1)

content = content.replace(old, new, 1)
with open(path, "w") as f:
    f.write(content)

print("✅ Heading renamed.")
