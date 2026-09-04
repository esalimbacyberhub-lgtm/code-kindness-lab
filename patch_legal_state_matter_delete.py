path = "src/features/legal/hooks/useLegalState.ts"
with open(path, "r") as f:
    content = f.read()

old = "state: stateWithSb, setView, setRole, toggleSidebar, moveTask, addTask, deleteTask, addMatter, updateMatter: sb.updateMatter, deleteMatter: sb.deleteMatter,"
new = "state: stateWithSb, setView, setRole, toggleSidebar, moveTask, addTask, deleteTask, addMatter, updateMatter: sb.updateMatter, deleteMatter: sb.deleteMatter, deleteMatterWithPassword: sb.deleteMatterWithPassword,"

if old not in content:
    print("❌ Anchor not found — no changes written.")
    raise SystemExit(1)

content = content.replace(old, new, 1)
with open(path, "w") as f:
    f.write(content)

print("✅ Threaded deleteMatterWithPassword through useLegalState.ts")
