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
        <div className="text-right
