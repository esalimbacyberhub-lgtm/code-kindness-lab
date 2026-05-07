import { useState } from "react";
import type { Invoice, InvoiceItem, Matter, LedgerEntry } from "../types";

interface Props { invoices: Invoice[]; matters: Matter[]; onAdd: (inv: Invoice) => void; ledger: LedgerEntry[]; }

const genId = () => Math.random().toString(36).slice(2,9);
const genNo = (invoices: Invoice[]) => {
  const year = new Date().getFullYear();
  const seq = String(invoices.length + 1).padStart(3, "0");
  return `INV/${year}/${seq}`;
};

type Tab = "invoices" | "ledger" | "balance" | "income" | "trust" | "debtors";

export const Invoices = ({ invoices, matters, onAdd, ledger }: Props) => {
  const [tab, setTab] = useState<Tab>("invoices");
  const [showForm, setShowForm] = useState(false);
  const [client, setClient] = useState("");
  const [matter, setMatter] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([{ id: genId(), description: "", quantity: 1, rate: 0, amount: 0 }]);
  const [selected, setSelected] = useState<Invoice|null>(null);

  const updateItem = (idx: number, field: keyof InvoiceItem, val: string | number) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: val };
      updated.amount = Number(updated.quantity) * Number(updated.rate);
      return updated;
    }));
  };

  const total = items.reduce((s, i) => s + i.amount, 0);

  const handleSubmit = () => {
    if (!client || !matter || !dueDate) return;
    const inv: Invoice = {
      id: genId(), invoiceNo: genNo(invoices), client, matter,
      date: new Date().toISOString().split("T")[0], dueDate,
      items, status: "draft", notes, totalAmount: total,
    };
    onAdd(inv);
    setShowForm(false);
    setClient(""); setMatter(""); setDueDate(""); setNotes("");
    setItems([{ id: genId(), description: "", quantity: 1, rate: 0, amount: 0 }]);
  };

  const statusColor = (s: string) =>
    s === "paid" ? "text-green-400" : s === "overdue" ? "text-red-400" : s === "sent" ? "text-yellow-400" : "text-gray-400";

  // Financial calculations
  const totalRevenue = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.totalAmount, 0);
  const totalOutstanding = invoices.filter(i => i.status !== "paid").reduce((s, i) => s + i.totalAmount, 0);
  const totalDisbursements = ledger.filter(e => e.type === "disbursement").reduce((s, e) => s + e.debit, 0);
  const trustBalance = ledger.filter(e => e.type === "trust").reduce((s, e) => s + e.credit - e.debit, 0);
  const netIncome = totalRevenue - totalDisbursements;

  const tabs: { key: Tab; label: string }[] = [
    { key: "invoices", label: "Invoices" },
    { key: "ledger", label: "General Ledger" },
    { key: "balance", label: "Balance Sheet" },
    { key: "income", label: "Income Statement" },
    { key: "trust", label: "Trust Account" },
    { key: "debtors", label: "Aged Debtors" },
  ];

  if (selected) return (
    <div className="space-y-6">
      <button onClick={() => setSelected(null)} className="text-sm text-blue-400 hover:underline">← Back to Financials</button>
      <div className="glass-card p-8 rounded-xl space-y-6 max-w-3xl" style={{color: "white"}}>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-white">OMUYOMA & CO. ADVOCATES</h1>
            <p className="text-gray-400 text-sm">Nairobi · Kenya · Law Society of Kenya</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-amber-400">{selected.invoiceNo}</p>
            <p className="text-gray-400 text-sm">Date: {selected.date}</p>
            <p className="text-gray-400 text-sm">Due: {selected.dueDate}</p>
          </div>
        </div>
        <div className="border-t border-white/10 pt-4">
          <p className="text-gray-400 text-sm">Billed To</p>
          <p className="text-white font-semibold">{selected.client}</p>
          <p className="text-gray-400 text-sm">Matter: {selected.matter}</p>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="text-gray-400 border-b border-white/10">
            <th className="text-left py-2">Description</th>
            <th className="text-right py-2">Qty</th>
            <th className="text-right py-2">Rate (KES)</th>
            <th className="text-right py-2">Amount (KES)</th>
          </tr></thead>
          <tbody>{selected.items.map(item => (
            <tr key={item.id} className="border-b border-white/5 text-white">
              <td className="py-2">{item.description}</td>
              <td className="text-right py-2">{item.quantity}</td>
              <td className="text-right py-2">{item.rate.toLocaleString()}</td>
              <td className="text-right py-2">{item.amount.toLocaleString()}</td>
            </tr>
          ))}</tbody>
        </table>
        <div className="text-right">
          <p className="text-gray-400 text-sm">Total</p>
          <p className="text-2xl font-bold text-amber-400">KES {selected.totalAmount.toLocaleString()}</p>
        </div>
        {selected.notes && <p className="text-gray-400 text-sm border-t border-white/10 pt-4">{selected.notes}</p>}
        <div className="flex gap-3">
          <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full border ${statusColor(selected.status)} border-current`}>{selected.status}</span>
          <button onClick={() => window.print()} className="btn-secondary text-sm px-4 py-1 rounded-lg">Print / PDF</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Financials</h2>
          <p className="text-gray-400 text-sm">Partner-only financial overview</p>
        </div>
        {tab === "invoices" && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary px-4 py-2 rounded-lg text-sm font-semibold">
            {showForm ? "Cancel" : "+ New Invoice"}
          </button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t.key ? "bg-blue-600 text-white" : "glass-card text-gray-400 hover:text-white"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "invoices" && (
        <div className="space-y-4">
          {showForm && (
            <div className="glass-card p-6 rounded-xl space-y-4">
              <h3 className="text-lg font-semibold text-white">New Invoice — {genNo(invoices)}</h3>
              <div className="grid grid-cols-2 gap-4">
                <input value={client} onChange={e => setClient(e.target.value)} placeholder="Client name" className="input-field" />
                <select value={matter} onChange={e => setMatter(e.target.value)} className="input-field">
                  <option value="">Select matter</option>
                  {matters.map(m => <option key={m.id} value={m.title}>{m.fileNo} — {m.title}</option>)}
                </select>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="input-field" />
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" className="input-field" />
              </div>
              <div className="space-y-2">
                <p className="text-gray-400 text-sm font-semibold">Line Items</p>
                {items.map((item, idx) => (
                  <div key={item.id} className="grid grid-cols-4 gap-2">
                    <input value={item.description} onChange={e => updateItem(idx, "description", e.target.value)} placeholder="Description" className="input-field col-span-2" />
                    <input type="number" value={item.quantity} onChange={e => updateItem(idx, "quantity", Number(e.target.value))} placeholder="Qty" className="input-field" />
                    <input type="number" value={item.rate} onChange={e => updateItem(idx, "rate", Number(e.target.value))} placeholder="Rate (KES)" className="input-field" />
                  </div>
                ))}
                <button onClick={() => setItems(p => [...p, { id: genId(), description: "", quantity: 1, rate: 0, amount: 0 }])}
                  className="text-sm text-blue-400 hover:underline">+ Add line item</button>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-white/10">
                <p className="text-white font-bold">Total: KES {total.toLocaleString()}</p>
                <button onClick={handleSubmit} className="btn-primary px-6 py-2 rounded-lg text-sm font-semibold">Save Invoice</button>
              </div>
            </div>
          )}
          {invoices.length === 0 && !showForm && <div className="glass-card p-8 rounded-xl text-center text-gray-400">No invoices yet.</div>}
          {invoices.map(inv => (
            <div key={inv.id} onClick={() => setSelected(inv)} className="glass-card p-4 rounded-xl flex justify-between items-center cursor-pointer hover:border-blue-500/50 border border-transparent transition-all">
              <div>
                <p className="text-white font-semibold">{inv.invoiceNo}</p>
                <p className="text-gray-400 text-sm">{inv.client} · {inv.matter}</p>
              </div>
              <div className="text-right">
                <p className="text-amber-400 font-bold">KES {inv.totalAmount.toLocaleString()}</p>
                <p className={`text-xs font-bold uppercase ${statusColor(inv.status)}`}>{inv.status}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "ledger" && (
        <div className="space-y-3">
          <div className="glass-card p-4 rounded-xl" style={{borderLeft: "4px solid #3b82f6"}}>
            <h3 className="text-blue-400 font-bold text-lg mb-4">General Ledger</h3>
            <table className="w-full text-sm">
              <thead><tr className="text-gray-400 border-b border-white/10">
                <th className="text-left py-2">Date</th>
                <th className="text-left py-2">Description</th>
                <th className="text-left py-2">Matter</th>
                <th className="text-left py-2">Type</th>
                <th className="text-right py-2">Debit (KES)</th>
                <th className="text-right py-2">Credit (KES)</th>
              </tr></thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} className="border-b border-white/5 text-white">
                    <td className="py-2">{inv.date}</td>
                    <td className="py-2">{inv.invoiceNo} — {inv.client}</td>
                    <td className="py-2 text-gray-400">{inv.matter}</td>
                    <td className="py-2"><span className="text-blue-400 text-xs">Billable</span></td>
                    <td className="text-right py-2">—</td>
                    <td className="text-right py-2 text-green-400">{inv.totalAmount.toLocaleString()}</td>
                  </tr>
                ))}
                {ledger.map(e => (
                  <tr key={e.id} className="border-b border-white/5 text-white">
                    <td className="py-2">{e.date}</td>
                    <td className="py-2">{e.description}</td>
                    <td className="py-2 text-gray-400">{e.matter}</td>
                    <td className="py-2"><span className="text-xs text-gray-400">{e.type}</span></td>
                    <td className="text-right py-2 text-red-400">{e.debit > 0 ? e.debit.toLocaleString() : "—"}</td>
                    <td className="text-right py-2 text-green-400">{e.credit > 0 ? e.credit.toLocaleString() : "—"}</td>
                  </tr>
                ))}
                {invoices.length === 0 && ledger.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400">No ledger entries yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "balance" && (
        <div className="glass-card p-6 rounded-xl space-y-6" style={{borderLeft: "4px solid #3b82f6"}}>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-blue-400 font-bold text-lg">Balance Sheet</h3>
              <p className="text-gray-400 text-sm">As at {new Date().toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}</p>
            </div>
            <button onClick={() => window.print()} className="btn-secondary text-sm px-4 py-1 rounded-lg">Print</button>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-3">
              <h4 className="text-white font-semibold border-b border-white/10 pb-2">ASSETS</h4>
              <div className="flex justify-between text-sm"><span className="text-gray-400">Accounts Receivable</span><span className="text-white">KES {totalOutstanding.toLocaleString()}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-400">Trust Account</span><span className="text-white">KES {trustBalance.toLocaleString()}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-400">Cash & Bank</span><span className="text-white">KES {totalRevenue.toLocaleString()}</span></div>
              <div className="flex justify-between font-bold border-t border-white/10 pt-2"><span className="text-blue-400">TOTAL ASSETS</span><span className="text-blue-400">KES {(totalOutstanding + trustBalance + totalRevenue).toLocaleString()}</span></div>
            </div>
            <div className="space-y-3">
              <h4 className="text-white font-semibold border-b border-white/10 pb-2">EQUITY & LIABILITIES</h4>
              <div className="flex justify-between text-sm"><span className="text-gray-400">Client Trust Liabilities</span><span className="text-white">KES {trustBalance.toLocaleString()}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-400">Disbursements Payable</span><span className="text-white">KES {totalDisbursements.toLocaleString()}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-400">Retained Earnings</span><span className="text-white">KES {netIncome.toLocaleString()}</span></div>
              <div className="flex justify-between font-bold border-t border-white/10 pt-2"><span className="text-blue-400">TOTAL EQUITY</span><span className="text-blue-400">KES {(trustBalance + totalDisbursements + netIncome).toLocaleString()}</span></div>
            </div>
          </div>
        </div>
      )}

      {tab === "income" && (
        <div className="glass-card p-6 rounded-xl space-y-4" style={{borderLeft: "4px solid #3b82f6"}}>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-blue-400 font-bold text-lg">Income Statement</h3>
              <p className="text-gray-400 text-sm">For the period ending {new Date().toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}</p>
            </div>
            <button onClick={() => window.print()} className="btn-secondary text-sm px-4 py-1 rounded-lg">Print</button>
          </div>
          <div className="space-y-2">
            <h4 className="text-white font-semibold">INCOME</h4>
            <div className="flex justify-between text-sm"><span className="text-gray-400">Legal Fees (Paid Invoices)</span><span className="text-green-400">KES {totalRevenue.toLocaleString()}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-400">Outstanding Fees</span><span className="text-yellow-400">KES {totalOutstanding.toLocaleString()}</span></div>
            <div className="flex justify-between font-semibold border-t border-white/10 pt-2"><span className="text-white">Total Income</span><span className="text-white">KES {(totalRevenue + totalOutstanding).toLocaleString()}</span></div>
          </div>
          <div className="space-y-2">
            <h4 className="text-white font-semibold">EXPENSES</h4>
            <div className="flex justify-between text-sm"><span className="text-gray-400">Disbursements</span><span className="text-red-400">KES {totalDisbursements.toLocaleString()}</span></div>
            <div className="flex justify-between font-semibold border-t border-white/10 pt-2"><span className="text-white">Total Expenses</span><span className="text-red-400">KES {totalDisbursements.toLocaleString()}</span></div>
          </div>
          <div className="flex justify-between font-bold text-lg border-t-2 border-blue-500/50 pt-4">
            <span className="text-blue-400">NET INCOME</span>
            <span className={netIncome >= 0 ? "text-green-400" : "text-red-400"}>KES {netIncome.toLocaleString()}</span>
          </div>
        </div>
      )}

      {tab === "trust" && (
        <div className="glass-card p-6 rounded-xl space-y-4" style={{borderLeft: "4px solid #3b82f6"}}>
          <h3 className="text-blue-400 font-bold text-lg">Trust Account Statement</h3>
          <table className="w-full text-sm">
            <thead><tr className="text-gray-400 border-b border-white/10">
              <th className="text-left py-2">Date</th>
              <th className="text-left py-2">Description</th>
              <th className="text-left py-2">Matter</th>
              <th className="text-right py-2">Debit</th>
              <th className="text-right py-2">Credit</th>
              <th className="text-right py-2">Balance</th>
            </tr></thead>
            <tbody>
              {ledger.filter(e => e.type === "trust").length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">No trust transactions yet.</td></tr>
              )}
              {(() => {
                let bal = 0;
                return ledger.filter(e => e.type === "trust").map(e => {
                  bal += e.credit - e.debit;
                  return (
                    <tr key={e.id} className="border-b border-white/5 text-white">
                      <td className="py-2">{e.date}</td>
                      <td className="py-2">{e.description}</td>
                      <td className="py-2 text-gray-400">{e.matter}</td>
                      <td className="text-right py-2 text-red-400">{e.debit > 0 ? e.debit.toLocaleString() : "—"}</td>
                      <td className="text-right py-2 text-green-400">{e.credit > 0 ? e.credit.toLocaleString() : "—"}</td>
                      <td className="text-right py-2 text-blue-400">{bal.toLocaleString()}</td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
          <div className="flex justify-between font-bold border-t border-white/10 pt-4">
            <span className="text-blue-400">Trust Balance</span>
            <span className="text-blue-400">KES {trustBalance.toLocaleString()}</span>
          </div>
        </div>
      )}

      {tab === "debtors" && (
        <div className="glass-card p-6 rounded-xl space-y-4" style={{borderLeft: "4px solid #3b82f6"}}>
          <h3 className="text-blue-400 font-bold text-lg">Aged Debtors Report</h3>
          <table className="w-full text-sm">
            <thead><tr className="text-gray-400 border-b border-white/10">
              <th className="text-left py-2">Client</th>
              <th className="text-left py-2">Invoice</th>
              <th className="text-left py-2">Due Date</th>
              <th className="text-left py-2">Days Overdue</th>
              <th className="text-right py-2">Amount (KES)</th>
              <th className="text-left py-2">Status</th>
            </tr></thead>
            <tbody>
              {invoices.filter(i => i.status !== "paid").length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-green-400">No outstanding debtors. All invoices paid! ✓</td></tr>
              )}
              {invoices.filter(i => i.status !== "paid").map(inv => {
                const days = Math.floor((Date.now() - new Date(inv.dueDate).getTime()) / 86400000);
                const color = days > 90 ? "text-red-400" : days > 60 ? "text-orange-400" : days > 30 ? "text-yellow-400" : "text-gray-400";
                return (
                  <tr key={inv.id} className="border-b border-white/5 text-white">
                    <td className="py-2">{inv.client}</td>
                    <td className="py-2 text-amber-400">{inv.invoiceNo}</td>
                    <td className="py-2">{inv.dueDate}</td>
                    <td className={`py-2 font-bold ${color}`}>{days > 0 ? `${days} days` : "Not due"}</td>
                    <td className="text-right py-2">{inv.totalAmount.toLocaleString()}</td>
                    <td className="py-2"><span className={`text-xs font-bold uppercase ${color}`}>{inv.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {invoices.filter(i => i.status !== "paid").length > 0 && (
            <div className="flex justify-between font-bold border-t border-white/10 pt-4">
              <span className="text-blue-400">Total Outstanding</span>
              <span className="text-red-400">KES {totalOutstanding.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
