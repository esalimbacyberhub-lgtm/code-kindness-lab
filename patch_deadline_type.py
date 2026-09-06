path = "src/features/legal/types.ts"
with open(path, "r") as f:
    content = f.read()

old = '''export interface Deadline {
  id: string; title: string; matter: string; court: string; date: string;'''

new = '''export interface Deadline {
  id: string; title: string; matter: string; matterId?: string; court: string; date: string;'''

if old not in content:
    print("❌ Anchor not found — no changes written.")
    raise SystemExit(1)

content = content.replace(old, new, 1)
with open(path, "w") as f:
    f.write(content)

print("✅ Added matterId to Deadline type.")
