path = "src/features/legal/views/Dashboard.tsx"
with open(path, "r") as f:
    content = f.read()

old = '''          <div className="flex items-center gap-2">
            <CalIcon className="w-4 h-4 text-brand-gold" />
            <h3 className="font-semibold text-sm">Deadlines</h3>
            {upcoming.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-gold/15 text-brand-gold font-bold">
                {upcoming.length}
              </span>
            )}
          </div>'''

new = '''          <button
            onClick={() => onGoToMatters?.()}
            className="flex items-center gap-2 hover:opacity-80 transition"
          >
            <CalIcon className="w-4 h-4 text-brand-gold" />
            <h3 className="font-semibold text-sm">Deadlines</h3>
            {upcoming.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-gold/15 text-brand-gold font-bold">
                {upcoming.length}
              </span>
            )}
          </button>'''

if old not in content:
    print("❌ Anchor not found — no changes written.")
    raise SystemExit(1)

content = content.replace(old, new, 1)
with open(path, "w") as f:
    f.write(content)

print("✅ 'Deadlines' heading is now clickable and takes you to Matter Hub.")
