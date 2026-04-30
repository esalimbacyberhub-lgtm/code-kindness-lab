const ENTRIES = [
  { date: "2026-04-28", desc: "Filing fee — Kamau v Njeri", matter: "Kamau v Njeri", debit: 0, credit: 12500 },
  { date: "2026-04-26", desc: "Retainer — Acme Ltd", matter: "Acme contract", debit: 250000, credit: 0 },
  { date: "2026-04-22", desc: "Court bundle printing", matter: "Republic v Ochieng", debit: 0, credit: 4800 },
  { date: "2026-04-20", desc: "Consultation hours", matter: "Muthoni case", debit: 45000, credit: 0 },
];

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
        {ENTRIES.map((e, i) => (
          <div key={i} className="grid grid-cols-[1fr_2fr_1.5fr_1fr_1fr] gap-4 px-5 py-3 text-sm border-b border-border/40 hover:bg-secondary/30">
            <time className="text-muted-foreground">{e.date}</time>
            <span>{e.desc}</span>
            <span className="text-muted-foreground">{e.matter}</span>
            <span className="text-right text-success">{e.debit ? `KES ${e.debit.toLocaleString()}` : "—"}</span>
            <span className="text-right text-destructive">{e.credit ? `KES ${e.credit.toLocaleString()}` : "—"}</span>
          </div>
        ))}
        <div className="px-5 py-3 flex justify-between items-center text-sm font-semibold">
          <span>Net</span>
          <span className={total >= 0 ? "text-success" : "text-destructive"}>KES {total.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
