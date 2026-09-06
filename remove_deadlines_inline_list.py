path = "src/features/legal/views/Dashboard.tsx"
with open(path, "r") as f:
    content = f.read()

old = '''        {upcoming.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <CalIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No upcoming court dates.</p>
            <p className="text-xs mt-1">Add deadlines from Calendar &amp; Deadlines.</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {upcoming.map(d => {
              const Icon = TYPE_ICON[d.type] || CalIcon;
              const dc = daysUntil(d.date);
              return (
                <button
                  key={d.id}
                  onClick={() => openMatterFromDeadline(d)}
                  className="w-full text-left flex items-center gap-3 p-3 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-all border-l-4 border-l-brand-gold/40"
                >
                  <div className={"w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 " + (TYPE_STYLE[d.type] || TYPE_STYLE.deadline)}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{d.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {d.court}{d.matter && d.matter !== "General" ? ` · ${d.matter}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-brand-gold">
                      {new Date(d.date + "T00:00:00").toLocaleDateString("en-KE", { day: "numeric", month: "short" })}
                    </p>
                    <p className={"text-[10px] uppercase font-bold " + dc.color}>{dc.label}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>'''

new = '''        <p className="text-xs text-muted-foreground">
          {allUpcoming.length === 0 ? "No upcoming court dates." : "Click above to view all upcoming court dates and deadlines."}
        </p>
      </div>'''

if old not in content:
    print("❌ Anchor not found — no changes written.")
    raise SystemExit(1)

content = content.replace(old, new, 1)
with open(path, "w") as f:
    f.write(content)

print("✅ Removed the always-visible deadlines list — now click-only via the popup.")
