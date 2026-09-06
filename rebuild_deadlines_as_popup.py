path = "src/features/legal/views/Dashboard.tsx"
with open(path, "r") as f:
    content = f.read()

edits = [
    (
        'import { Plus, Download, Calendar as CalIcon, Gavel, FileText, AlertCircle, Scale, Building2, ArrowRight } from "lucide-react";\nimport { Button } from "@/components/ui/button";',
        'import { useState } from "react";\nimport { Plus, Download, Calendar as CalIcon, Gavel, FileText, AlertCircle, Scale, Building2, ArrowRight } from "lucide-react";\nimport { Button } from "@/components/ui/button";\nimport { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";'
    ),
    (
        '''  const openMatterFromDeadline = (d: Deadline) => {
    if (d.matterId) {
      sessionStorage.setItem("omuyoma_open_matter_id", d.matterId);
    }
    onGoToMatters?.();
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const upcoming = [...deadlines]
    .filter(d => d.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);''',
        '''  const openMatterFromDeadline = (d: Deadline) => {
    if (d.matterId) {
      sessionStorage.setItem("omuyoma_open_matter_id", d.matterId);
    }
    onGoToMatters?.();
  };

  const [deadlinesOpen, setDeadlinesOpen] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);
  const allUpcoming = [...deadlines]
    .filter(d => d.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = allUpcoming.slice(0, 6);'''
    ),
    (
        '''          <button
            onClick={() => onGoToMatters?.()}
            className="flex items-center gap-2 hover:opacity-80 transition"
          >''',
        '''          <button
            onClick={() => setDeadlinesOpen(true)}
            className="flex items-center gap-2 hover:opacity-80 transition"
          >'''
    ),
    (
        '''      <TaskBoard tasks={tasks} matters={matters} deadlines={deadlines} invoices={invoices} onMove={onMoveTask} onAdd={onAddTask} onDelete={onDeleteTask} />
    </div>
  );
}''',
        '''      <TaskBoard tasks={tasks} matters={matters} deadlines={deadlines} invoices={invoices} onMove={onMoveTask} onAdd={onAddTask} onDelete={onDeleteTask} />

      {/* Full Deadlines popup — every upcoming item, not just the preview 6 */}
      <Dialog open={deadlinesOpen} onOpenChange={setDeadlinesOpen}>
        <DialogContent className="glass-card max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center gap-2">
              <CalIcon className="w-5 h-5 text-brand-gold" /> All Deadlines
            </DialogTitle>
          </DialogHeader>
          {allUpcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No upcoming court dates.</p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {allUpcoming.map(d => {
                const Icon = TYPE_ICON[d.type] || CalIcon;
                const dc = daysUntil(d.date);
                return (
                  <button
                    key={d.id}
                    onClick={() => { setDeadlinesOpen(false); openMatterFromDeadline(d); }}
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
          {onGoToCalendar && (
            <button onClick={() => { setDeadlinesOpen(false); onGoToCalendar(); }} className="flex items-center gap-1 text-xs text-brand-gold hover:underline mt-2 self-start">
              Open Calendar <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}'''
    ),
]

for i, (old, new) in enumerate(edits, 1):
    if old not in content:
        print(f"❌ Edit {i} FAILED — anchor text not found. Stopping, no changes written.")
        raise SystemExit(1)
    content = content.replace(old, new, 1)
    print(f"✅ Edit {i} applied")

with open(path, "w") as f:
    f.write(content)

print("\nAll edits applied successfully.")
