path = "src/features/legal/hooks/useSupabaseDeadlines.ts"
with open(path, "r") as f:
    content = f.read()

old = '''    matter: matter?.fileNo || "General",
  } as Deadline;'''

new = '''    matter: matter?.fileNo || "General",
    matterId: matter?.id || undefined,
  } as Deadline;'''

if old not in content:
    print("❌ Anchor not found — no changes written.")
    raise SystemExit(1)

content = content.replace(old, new, 1)
with open(path, "w") as f:
    f.write(content)

print("✅ Deadline rows now carry the real matterId.")
