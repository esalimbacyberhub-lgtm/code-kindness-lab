path = "src/features/legal/components/NewMatterDialog.tsx"
with open(path, "r") as f:
    content = f.read()

old = '''                    <Select value={f.courtStation} onValueChange={v => set("courtStation", v)}>
                      <SelectTrigger><SelectValue placeholder="Select station…" /></SelectTrigger>
                      <SelectContent>
                        {(courtStationsMap[f.courtLevel] || []).map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                        <SelectItem value="__custom__" onSelect={() => set("useCustomStation", true)}>
                          <span className="text-primary">✎ Other — specify manually</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>'''

new = '''                    <Select
                      value={f.courtStation}
                      onValueChange={v => {
                        if (v === "__custom__") {
                          setF(p => ({ ...p, useCustomStation: true, courtStation: "" }));
                        } else {
                          set("courtStation", v);
                        }
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Select station…" /></SelectTrigger>
                      <SelectContent>
                        {(courtStationsMap[f.courtLevel] || []).map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                        <SelectItem value="__custom__">
                          <span className="text-primary">✎ Other — specify manually</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>'''

if old not in content:
    print("❌ Anchor not found — no changes written.")
    raise SystemExit(1)

content = content.replace(old, new, 1)
with open(path, "w") as f:
    f.write(content)

print("✅ Fixed: 'Other — specify manually' now works via onValueChange.")
