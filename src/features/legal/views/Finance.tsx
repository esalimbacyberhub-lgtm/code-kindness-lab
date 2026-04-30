const ENTRIES: { date: string; desc: string; matter: string; debit: number; credit: number }[] = [];

export function Finance() {
  const total = ENTRIES.reduce((a, e) => a + e.debit - e.credit, 0);
  return (
    <div>
      <h2 className="text-3xl font-serif mb-6">Financial Ledger</h2>
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_2fr_1.5fr_1fr_1fr] gap-4 px-5 py-3 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
          <span>Date</span><span>Description</span><span>Matter</span>
          <span className="text-right">Debit</span><span className="text-right">Credit</span>
        </div>
        {ENTRIES.length === 0 && (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            No ledger entries yet.
          </div>
        )}
        {ENTRIES.map((e, i) => (
          <div key={i} className="grid grid-cols-[1fr_2fr_1.5fr_1fr_1fr] gap-4 px-5 py-3 text-sm border-b border-border/40 hover:bg-secondary/30">
            <time className="text-muted-foreground">{e.date}</time>
            <span>{e.desc}</span>
            <span className="text-muted-foreground">{e.matter}</span>
            <span className="text-right text-success">{e.debit ? `KES ${e.debit.toLocaleString()}` : "—"}</span>
            <span className="text-right text-destructive">{e.credit ? `KES ${e.credit.toLocaleString()}` : "—"}</span>
          </div>
        ))}
        {ENTRIES.length > 0 && (
          <div className="px-5 py-3 flex justify-between items-center text-sm font-semibold">
            <span>Net</span>
            <span className={total >= 0 ? "text-success" : "text-destructive"}>KES {total.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
