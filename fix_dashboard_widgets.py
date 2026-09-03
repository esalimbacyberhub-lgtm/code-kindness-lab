import re

path = "src/features/legal/components/PriorityWidgets.tsx"
with open(path, "r") as f:
    content = f.read()

edits = [
    (
        'import { CalendarDays, AlertTriangle, Clock, Coins, ArrowRight } from "lucide-react";',
        'import { CalendarDays, AlertTriangle, ArrowRight } from "lucide-react";'
    ),
    (
        'type PopupKind = null | "today" | "priority" | "pending" | "billables";',
        'type PopupKind = null | "today" | "priority";'
    ),
    (
        '''  // ── PENDING: matters with caseStatus pending or empty
  const pendingMatters = matters.filter((m: any) => !m.caseStatus || m.caseStatus === "pending");
  const pendingCount = pendingMatters.length;

  // ── BILLABLES: sum of invoice amounts
  const billables = invoices.reduce(
    (sum: number, i: any) => sum + (Number(i.amount) || Number(i.total) || 0),
    0
  );

  const cards = [
    { kind: "today" as const,     label: "Today",     value: todayCount,                                  sub: "Hearings & mentions", Icon: CalendarDays,   tone: "info"   },
    { kind: "priority" as const,  label: "Priority",  value: priorityCount,                               sub: "Deadlines (3 days)",   Icon: AlertTriangle, tone: "accent" },
    { kind: "pending" as const,   label: "Pending",   value: pendingCount,                                sub: "Matters",              Icon: Clock,         tone: "ivory"  },
    { kind: "billables" as const, label: "Billables", value: `KES ${billables.toLocaleString("en-KE")}`,  sub: `${invoices.length} invoiced`, Icon: Coins,  tone: "gold"   },
  ];''',
        '''  const cards = [
    { kind: "today" as const,     label: "Today",     value: todayCount,    sub: "Hearings & mentions", Icon: CalendarDays,  tone: "info"   },
    { kind: "priority" as const,  label: "Priority",  value: priorityCount, sub: "Deadlines (3 days)",  Icon: AlertTriangle, tone: "accent" },
  ];'''
    ),
    (
        'className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6"',
        'className="grid grid-cols-2 gap-3 mb-6"'
    ),
    (
        '''      {/* PENDING popup */}
      <Dialog open={popup === "pending"} onOpenChange={o => !o && setPopup(null)}>
        <DialogContent className="glass-card max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center gap-2">
              <Clock className="w-5 h-5 text-brand-ivory" /> Pending Matters
            </DialogTitle>
          </DialogHeader>
          {pendingMatters.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No pending matters.</p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {pendingMatters.map((m: any) => (
                <div key={m.id} className="glass-card rounded-lg p-3 border-l-4 border-l-brand-ivory">
                  <p className="font-semibold text-sm">{m.fileNo ? m.fileNo + " · " : ""}{m.title}</p>
                  <p className="text-xs text-muted-foreground">{m.client}</p>
                </div>
              ))}
            </div>
          )}
          {onGoToMatters && (
            <button onClick={() => { setPopup(null); onGoToMatters(); }} className="flex items-center gap-1 text-xs text-brand-gold hover:underline mt-2 self-start">
              Open Matter Hub <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </DialogContent>
      </Dialog>

      {/* BILLABLES popup */}
      <Dialog open={popup === "billables"} onOpenChange={o => !o && setPopup(null)}>
        <DialogContent className="glass-card max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center gap-2">
              <Coins className="w-5 h-5 text-brand-gold" /> Billables
            </DialogTitle>
          </DialogHeader>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No invoices yet.</p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {invoices.map((i: any) => (
                <div key={i.id} className="glass-card rounded-lg p-3 border-l-4 border-l-brand-gold flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{i.matter || i.client || i.invoiceNo || "Invoice"}</p>
                    <p className="text-[10px] uppercase text-muted-foreground">{i.status || "unpaid"}</p>
                  </div>
                  <p className="text-sm font-bold text-brand-gold shrink-0">KES {(i.amount || i.total || 0).toLocaleString("en-KE")}</p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
''',
        ''
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
