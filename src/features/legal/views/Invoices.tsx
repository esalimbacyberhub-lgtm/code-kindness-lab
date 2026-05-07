import { useState } from "react";
import type { Invoice, InvoiceItem, Matter } from "../types";

interface Props { invoices: Invoice[]; matters: Matter[]; onAdd: (inv: Invoice) => void; }

const genId = () => Math.random().toString(36).slice(2,9);
const genNo = (invoices: Invoice[]) => {
  const year = new Date().getFullYear();
  const seq = String(invoices.length + 1).padStart(3, "0");
  return `INV/${year}/${seq}`;
};

export const Invoices = ({ invoices, matters, onAdd }: Props) => {
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

  if (selected) return (
    <div className="space-y-6">
      <button onClick={() => setSelected(null)} className="text-sm text-blue-400 hover:underline">← Back to Invoices</button>
      <div className="glass-card p-8 rounded-xl space-y-6 max-w-3xl">
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
        <div className="text-right space-y-1">
          <p className="text-gray-400 text-sm">Total Due</p>
          <p className="text-2xl font-bold text-amber-400">KES {selected.totalAmount.toLocaleString()}</p>
          <p className={`text-sm capitalize ${statusColor(selected.status)}`}>Status: {selected.status}</p>
        </div>
        {selected.notes && (
          <div className="border-t border-white/10 pt-4">
            <p className="text-gray-400 text-sm">Notes</p>
            <p className="text-white text-sm whitespace-pre-wrap">{selected.notes}</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Invoices</h1>
        <button onClick={() => setShowForm(s => !s)} className="px-4 py-2 rounded-lg bg-amber-500 text-black font-semibold hover:bg-amber-400">
          {showForm ? "Cancel" : "+ New Invoice"}
        </button>
      </div>

      {showForm && (
        <div className="glass-card p-6 rounded-xl space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <input value={client} onChange={e => setClient(e.target.value)} placeholder="Client name" className="px-3 py-2 rounded bg-black/30 border border-white/10 text-white" />
            <select value={matter} onChange={e => setMatter(e.target.value)} className="px-3 py-2 rounded bg-black/30 border border-white/10 text-white">
              <option value="">Select matter</option>
              {matters.map(m => <option key={m.id} value={m.title}>{m.title}</option>)}
            </select>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="px-3 py-2 rounded bg-black/30 border border-white/10 text-white" />
          </div>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={item.id} className="grid grid-cols-12 gap-2">
                <input value={item.description} onChange={e => updateItem(idx, "description", e.target.value)} placeholder="Description" className="col-span-6 px-3 py-2 rounded bg-black/30 border border-white/10 text-white" />
                <input type="number" value={item.quantity} onChange={e => updateItem(idx, "quantity", Number(e.target.value))} placeholder="Qty" className="col-span-2 px-3 py-2 rounded bg-black/30 border border-white/10 text-white" />
                <input type="number" value={item.rate} onChange={e => updateItem(idx, "rate", Number(e.target.value))} placeholder="Rate" className="col-span-2 px-3 py-2 rounded bg-black/30 border border-white/10 text-white" />
                <div className="col-span-2 flex items-center text-amber-400 font-semibold">{item.amount.toLocaleString()}</div>
              </div>
            ))}
            <button onClick={() => setItems(prev => [...prev, { id: genId(), description: "", quantity: 1, rate: 0, amount: 0 }])} className="text-sm text-blue-400 hover:underline">
              + Add line item
            </button>
          </div>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" className="w-full px-3 py-2 rounded bg-black/30 border border-white/10 text-white" rows={2} />
          <div className="flex justify-between items-center">
            <p className="text-white">Total: <span className="text-amber-400 font-bold">KES {total.toLocaleString()}</span></p>
            <button onClick={handleSubmit} className="px-4 py-2 rounded-lg bg-green-500 text-black font-semibold hover:bg-green-400">Create Invoice</button>
          </div>
        </div>
      )}

      <div className="glass-card rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-black/30 text-gray-400">
            <tr>
              <th className="text-left p-3">Invoice #</th>
              <th className="text-left p-3">Client</th>
              <th className="text-left p-3">Matter</th>
              <th className="text-left p-3">Due</th>
              <th className="text-right p-3">Amount</th>
              <th className="text-left p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-gray-400">No invoices yet</td></tr>
            ) : invoices.map(inv => (
              <tr key={inv.id} onClick={() => setSelected(inv)} className="border-t border-white/5 text-white hover:bg-white/5 cursor-pointer">
                <td className="p-3 text-amber-400">{inv.invoiceNo}</td>
                <td className="p-3">{inv.client}</td>
                <td className="p-3">{inv.matter}</td>
                <td className="p-3">{inv.dueDate}</td>
                <td className="p-3 text-right">KES {inv.totalAmount.toLocaleString()}</td>
                <td className={`p-3 capitalize ${statusColor(inv.status)}`}>{inv.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
