import { useState, useEffect, useMemo } from "react"
import { FirmLetterhead, FirmFooter, FIRM } from "./FirmLetterhead"
import { FinancialsOverview } from "./FinancialsOverview";
import { FinancialNotes } from "./FinancialNotes";
import { FeeNotesTab } from "./FeeNotesTab"
import { useSupabaseInvoices } from "@/features/legal/hooks/useSupabaseInvoices"
import { useSupabasePayments } from "@/features/legal/hooks/useSupabasePayments"

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS & UTILITIES
// ─────────────────────────────────────────────────────────────────────────────
const STORAGE_KEY = "omuyoma_financials_v1"
const VAT_RATE = 0.16

const kes = (n) =>
  `KES ${(+n || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" }) : "—"

const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase()

const isoToday = () => new Date().toISOString().split("T")[0]

const addDays = (dateStr, n) => {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return d.toISOString().split("T")[0]
}

const daysBetween = (a, b) =>
  Math.floor((new Date(b) - new Date(a)) / 86_400_000)

// ─────────────────────────────────────────────────────────────────────────────
// DOUBLE-ENTRY GL DERIVATION
// Auto-generates journal entries from every invoice event & trust transaction
// ─────────────────────────────────────────────────────────────────────────────
function buildGL(invoices, trustTxns) {
  const rows = []

  invoices.forEach((inv) => {
    const vat = inv.vatEnabled ? inv.subtotal * VAT_RATE : 0
    const gross = inv.subtotal + vat

    // EVENT 1 — Invoice raised → DR Receivables / CR Revenue + VAT
    rows.push({
      date: inv.date,
      ref: inv.number,
      narration: `Invoice raised — ${inv.client} / ${inv.matter}`,
      source: "invoice",
      lines: [
        { code: "1100", account: "Accounts Receivable", dr: gross, cr: 0 },
        { code: "4001", account: "Legal Fees Revenue", dr: 0, cr: inv.subtotal },
        ...(vat > 0 ? [{ code: "2200", account: "VAT Payable (16%)", dr: 0, cr: vat }] : []),
      ],
    })

    // EVENT 2 — Payment received → DR Cash / CR Receivables
    if (inv.status === "paid" && inv.paidDate) {
      rows.push({
        date: inv.paidDate,
        ref: `PMT-${inv.number}`,
        narration: `Receipt — ${inv.client}`,
        source: "payment",
        lines: [
          { code: "1001", account: "Cash at Bank", dr: gross, cr: 0 },
          { code: "1100", account: "Accounts Receivable", dr: 0, cr: gross },
        ],
      })
    }
  })

  trustTxns.forEach((t) => {
    const isDeposit = t.type === "deposit"
    rows.push({
      date: t.date,
      ref: t.ref || `TRU-${t.id.slice(0, 6)}`,
      narration: `Trust ${t.type} — ${t.client}`,
      source: "trust",
      lines: isDeposit
        ? [
            { code: "1200", account: "Trust Bank Account", dr: t.amount, cr: 0 },
            { code: "2100", account: "Client Trust Liability", dr: 0, cr: t.amount },
          ]
        : [
            { code: "2100", account: "Client Trust Liability", dr: t.amount, cr: 0 },
            { code: "1200", account: "Trust Bank Account", dr: 0, cr: t.amount },
          ],
    })
  })

  return rows.sort((a, b) => new Date(a.date) - new Date(b.date))
}

// ─────────────────────────────────────────────────────────────────────────────
// CHART OF ACCOUNTS & BALANCE COMPUTATION
// ─────────────────────────────────────────────────────────────────────────────
const CHART = {
  "1001": { name: "Cash at Bank",           category: "Current Assets",       normal: "dr", bs: "asset" },
  "1100": { name: "Accounts Receivable",    category: "Current Assets",       normal: "dr", bs: "asset" },
  "1200": { name: "Trust Bank Account",     category: "Current Assets",       normal: "dr", bs: "asset" },
  "2100": { name: "Client Trust Liability", category: "Current Liabilities",  normal: "cr", bs: "liability" },
  "2200": { name: "VAT Payable (16%)",       category: "Current Liabilities",  normal: "cr", bs: "liability" },
  "4001": { name: "Legal Fees Revenue",     category: "Revenue",              normal: "cr", bs: "income" },
}

function computeBalances(gl) {
  const acc = {}
  Object.entries(CHART).forEach(([code, meta]) => {
    acc[code] = { ...meta, code, dr: 0, cr: 0, balance: 0 }
  })
  gl.forEach((entry) =>
    entry.lines.forEach((line) => {
      if (!acc[line.code]) return
      acc[line.code].dr += line.dr
      acc[line.code].cr += line.cr
    })
  )
  Object.values(acc).forEach((a) => {
    a.balance = a.normal === "dr" ? a.dr - a.cr : a.cr - a.dr
  })
  return acc
}

// ─────────────────────────────────────────────────────────────────────────────
// AGED DEBTORS
// ─────────────────────────────────────────────────────────────────────────────
function buildAgedDebtors(invoices) {
  const today = isoToday()
  return invoices
    .filter((i) => i.status !== "paid")
    .map((inv) => {
      const gross = inv.subtotal * (1 + (inv.vatEnabled ? VAT_RATE : 0))
      const overdue = Math.max(0, daysBetween(inv.dueDate, today))
      const bucket =
        overdue === 0
          ? "Current"
          : overdue <= 30
          ? "1–30 Days"
          : overdue <= 60
          ? "31–60 Days"
          : overdue <= 90
          ? "61–90 Days"
          : "90+ Days"
      return { ...inv, gross, overdue, bucket }
    })
    .sort((a, b) => b.overdue - a.overdue)
}

// ─────────────────────────────────────────────────────────────────────────────
// INVOICE FORM MODAL
// ─────────────────────────────────────────────────────────────────────────────
const BLANK_LINE = () => ({ id: uid(), desc: "", qty: 1, rate: 0 })

function InvoiceForm({ onSave, onClose, count }) {
  const num = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`
  const [form, setForm] = useState({
    number: num,
    client: "",
    matter: "",
    date: isoToday(),
    dueDate: addDays(isoToday(), 30),
    items: [BLANK_LINE()],
    vatEnabled: true,
    notes: "",
    status: "draft",
  })

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))
  const setLine = (id, k, v) =>
    set("items", form.items.map((l) => (l.id === id ? { ...l, [k]: ["qty", "rate"].includes(k) ? +v : v } : l)))
  const addLine = () => set("items", [...form.items, BLANK_LINE()])
  const rmLine = (id) => form.items.length > 1 && set("items", form.items.filter((l) => l.id !== id))

  const subtotal = form.items.reduce((s, l) => s + l.qty * l.rate, 0)
  const vat = form.vatEnabled ? subtotal * VAT_RATE : 0
  const total = subtotal + vat

  const save = () => {
    if (!form.client.trim() || !form.matter.trim()) return alert("Client and Matter are required.")
    onSave({ ...form, id: uid(), subtotal, total, createdAt: isoToday() })
    onClose()
  }

  const inp = {
    style: {
      background: "#080f1c",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 7,
      padding: "9px 12px",
      color: "#e8eaf0",
      fontSize: 13,
      width: "100%",
      boxSizing: "border-box",
      outline: "none",
      fontFamily: "inherit",
    },
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#0c1527", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 14, width: "min(820px,96vw)", maxHeight: "92vh", overflowY: "auto", padding: 28 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#c9a84c", marginBottom: 4 }}>NEW INVOICE</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#e8eaf0" }}>{form.number}</div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", borderRadius: 8, padding: "7px 16px", cursor: "pointer", fontSize: 13 }}>✕ Close</button>
        </div>

        {/* Row 1 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
          {[["Client *", "client", "text", "e.g. Kamau Holdings Ltd"], ["Matter / File Ref *", "matter", "text", "e.g. Conveyancing — Karen"], ["Invoice No.", "number", "text", ""]].map(([label, key, type, ph]) => (
            <div key={key}>
              <label style={{ display: "block", marginBottom: 5, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6b7fa3" }}>{label}</label>
              <input type={type} {...inp} value={form[key]} onChange={(e) => set(key, e.target.value)} placeholder={ph} />
            </div>
          ))}
        </div>

        {/* Row 2 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 20 }}>
          {[["Invoice Date", "date", "date"], ["Due Date", "dueDate", "date"]].map(([label, key, type]) => (
            <div key={key}>
              <label style={{ display: "block", marginBottom: 5, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6b7fa3" }}>{label}</label>
              <input type={type} {...inp} value={form[key]} onChange={(e) => set(key, e.target.value)} />
            </div>
          ))}
          <div>
            <label style={{ display: "block", marginBottom: 5, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6b7fa3" }}>Status</label>
            <select {...inp} value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="draft">Draft</option>
              <option value="sent">Sent to Client</option>
            </select>
          </div>
        </div>

        {/* Line Items */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <label style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6b7fa3" }}>Fee Items & Disbursements</label>
            <button onClick={addLine} style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)", color: "#c9a84c", padding: "5px 14px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Add Line</button>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Description", "Hrs / Qty", "Rate (KES)", "Amount", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6b7fa3", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {form.items.map((item) => (
                <tr key={item.id}>
                  <td style={{ padding: "5px 5px 5px 10px" }}>
                    <input {...inp} value={item.desc} onChange={(e) => setLine(item.id, "desc", e.target.value)} placeholder="e.g. Drafting Sale Agreement" />
                  </td>
                  <td style={{ padding: "5px", width: 80 }}>
                    <input type="number" {...inp} value={item.qty} onChange={(e) => setLine(item.id, "qty", e.target.value)} min={0} />
                  </td>
                  <td style={{ padding: "5px", width: 130 }}>
                    <input type="number" {...inp} value={item.rate} onChange={(e) => setLine(item.id, "rate", e.target.value)} min={0} />
                  </td>
                  <td style={{ padding: "5px 12px", fontWeight: 700, color: "#c9a84c", fontSize: 13, whiteSpace: "nowrap" }}>
                    {kes(item.qty * item.rate)}
                  </td>
                  <td style={{ padding: "5px" }}>
                    <button onClick={() => rmLine(item.id)} style={{ background: "rgba(239,68,68,0.1)", border: "none", color: "#ef4444", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals block */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
          <div style={{ width: 300, background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "16px 20px", border: "1px solid rgba(255,255,255,0.07)" }}>
            {[["Subtotal", kes(subtotal)], ...(form.vatEnabled ? [["VAT (16%)", kes(vat)]] : [])].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13, color: "#8899aa" }}>
                <span>{k}</span><span>{v}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 0", marginTop: 8, borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: 16, fontWeight: 900, color: "#c9a84c" }}>
              <span>TOTAL DUE</span><span>{kes(total)}</span>
            </div>
          </div>
        </div>

        {/* VAT + Notes */}
        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 16, marginBottom: 24, alignItems: "start" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#94a3b8", marginTop: 8 }}>
            <input type="checkbox" checked={form.vatEnabled} onChange={(e) => set("vatEnabled", e.target.checked)} style={{ accentColor: "#c9a84c" }} />
            Apply VAT @ 16%
          </label>
          <div>
            <label style={{ display: "block", marginBottom: 5, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6b7fa3" }}>Notes / Payment Terms</label>
            <textarea {...inp} rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Bank: KCB Nairobi. Acc: 1234567890. Payable within 30 days." style={{ ...inp.style, resize: "vertical" }} />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 22px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          <button onClick={save} style={{ padding: "10px 28px", background: "#c9a84c", border: "none", color: "#0d1424", borderRadius: 8, fontSize: 13, fontWeight: 900, cursor: "pointer" }}>Save Invoice →</button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN FINANCIALS MODULE
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview', label: 'Overview', icon: null },
  { id: "invoices", label: "Invoices" },
  { id: "gl",       label: "General Ledger" },
  { id: "bs",       label: "Balance Sheet" },
  { id: "is",       label: "Income Statement" },
  { id: "trust",    label: "Trust Account" },
  { id: "aged",     label: "Aged Debtors" },
  { id: "feenotes", label: "Fee Notes" },
  { id: "statements", label: "Statements" },
]

export default function FinancialsModule() {
  const [tab, setTab]           = useState("invoices")
  const { invoices: dbInvoices, addInvoice: sbAddInvoice, updateInvoice: sbUpdateInvoice, deleteInvoice: sbDeleteInvoice } = useSupabaseInvoices([])
  const invoices = dbInvoices.map((i) => ({ ...i, total: i.totalAmount, number: i.invoiceNo }))
  const { payments, addPayment, paidFor } = useSupabasePayments()
  const [payFor, setPayFor] = useState(null)
  const [stmtClient, setStmtClient] = useState("")
  const [payForm, setPayForm] = useState({ amount: "", date: isoToday(), method: "M-Pesa", note: "" })
  const [trustTxns, setTrustTxns] = useState([])
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [showTrustForm, setShowTrustForm]     = useState(false)
  const [trustForm, setTrustForm] = useState({
    client: "", amount: "", type: "deposit", date: isoToday(), ref: "",
  })

  // ── Persistence ──────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
      if (d.trustTxns) setTrustTxns(d.trustTxns)
    } catch {}
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ trustTxns }))
  }, [trustTxns])

  // ── Derived state — all auto-computed from invoices + trustTxns ──────────
  const gl       = useMemo(() => buildGL(invoices, trustTxns), [invoices, trustTxns])
  const balances = useMemo(() => computeBalances(gl), [gl])
  const aged     = useMemo(() => buildAgedDebtors(invoices), [invoices])

  // ── Actions ──────────────────────────────────────────────────────────────
  const addInvoice  = (inv) => sbAddInvoice({ ...inv, totalAmount: inv.total ?? inv.totalAmount, invoiceNo: inv.number ?? inv.invoiceNo })
  const recordPayment = async (inv) => {
    const amt = parseFloat(payForm.amount)
    if (!amt || amt <= 0) return alert("Enter a valid payment amount.")
    await addPayment({ invoiceId: inv.id, amount: amt, date: payForm.date, method: payForm.method, note: payForm.note })
    const newPaid = paidFor(inv.id) + amt
    if (newPaid >= (inv.total || 0)) {
      await sbUpdateInvoice(inv.id, { status: "paid", paidDate: payForm.date })
    }
    setPayFor(null)
    setPayForm({ amount: "", date: isoToday(), method: "M-Pesa", note: "" })
  }
  const markPaid    = (id)  => sbUpdateInvoice(id, { status: "paid", paidDate: isoToday() })
  const deleteInv   = (id)  => { if (confirm("Delete this invoice?")) sbDeleteInvoice(id) }

  const saveTrust = () => {
    if (!trustForm.client.trim() || !trustForm.amount) return alert("Client and amount are required.")
    setTrustTxns((p) => [...p, { ...trustForm, amount: +trustForm.amount, id: uid() }])
    setTrustForm({ client: "", amount: "", type: "deposit", date: isoToday(), ref: "" })
    setShowTrustForm(false)
  }

  // ── Enriched invoices (display status) ──────────────────────────────────
  const enriched = invoices.map((inv) => ({
    ...inv,
    ds: inv.status === "paid" ? "paid" : daysBetween(inv.dueDate, isoToday()) > 0 ? "overdue" : inv.status,
  }))

  // ── Summary KPIs ─────────────────────────────────────────────────────────
  const totalBilled      = invoices.reduce((s, i) => s + (i.total || 0), 0)
  const totalCollected   = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + (i.total || 0), 0)
  const totalOutstanding = totalBilled - totalCollected

  // ── Shared style helpers ─────────────────────────────────────────────────
  const C = {
    bg:     "#0d1424",
    panel:  "#141d30",
    border: "rgba(255,255,255,0.07)",
    gold:   "#c9a84c",
    muted:  "#6b7fa3",
    text:   "#e8eaf0",
    sub:    "#94a3b8",
  }

  const s = {
    card:    { background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 24px", marginBottom: 16 },
    tbl:     { width: "100%", borderCollapse: "collapse", fontSize: 13 },
    th:      { textAlign: "left", padding: "10px 14px", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, borderBottom: `1px solid ${C.border}` },
    td:      { padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)", color: "#cbd5e8", verticalAlign: "middle" },
    goldBtn: { padding: "9px 22px", background: C.gold, border: "none", color: "#0d1424", borderRadius: 8, fontSize: 13, fontWeight: 900, cursor: "pointer" },
    ghostBtn:{ padding: "7px 14px", background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, color: C.sub, borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer" },
    paidBtn: { padding: "6px 13px", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e", borderRadius: 7, fontSize: 11, fontWeight: 800, cursor: "pointer" },
    delBtn:  { padding: "6px 13px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", borderRadius: 7, fontSize: 11, fontWeight: 800, cursor: "pointer" },
    inp:     { background: "#080f1c", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, padding: "9px 12px", color: "#e8eaf0", fontSize: 13, width: "100%", boxSizing: "border-box", outline: "none", fontFamily: "inherit" },
    lbl:     { display: "block", marginBottom: 5, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted },
  }

  const Badge = ({ status }) => {
    const map = {
      paid:    ["rgba(34,197,94,0.12)",   "#22c55e"],
      sent:    ["rgba(59,130,246,0.12)",  "#60a5fa"],
      draft:   ["rgba(148,163,184,0.08)", "#94a3b8"],
      overdue: ["rgba(239,68,68,0.12)",   "#ef4444"],
    }
    const [bg, col] = map[status] || map.draft
    return (
      <span style={{ background: bg, color: col, padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 800, letterSpacing: "0.06em" }}>
        {status.toUpperCase()}
      </span>
    )
  }

  const StatCard = ({ label, value, color = C.gold }) => (
    <div style={{ flex: 1, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px" }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 900, color }}>{value}</div>
    </div>
  )

  const AutoBadge = () => (
    <div style={{ marginBottom: 16, padding: "10px 16px", background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.18)", borderRadius: 9, fontSize: 12, color: "#c9a84c", display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 15 }}>⚡</span>
      <span>Auto-generated from invoices using double-entry bookkeeping. Updates instantly when you add or pay an invoice.</span>
    </div>
  )

  const EmptyState = ({ icon, title, sub }) => (
    <div style={{ textAlign: "center", padding: "52px 20px", color: C.muted }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: C.sub }}>{title}</div>
      <div style={{ fontSize: 13 }}>{sub}</div>
    </div>
  )

  // ─── Balance Sheet helper ────────────────────────────────────────────────
  const bsSection = (title, codes) => {
    const rows = codes.map((c) => balances[c]).filter((r) => r?.balance !== 0)
    const total = rows.reduce((s, r) => s + r.balance, 0)
    return (
      <div style={s.card} key={title}>
        <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.14em", color: C.gold, marginBottom: 14 }}>{title}</div>
        {rows.length === 0 ? (
          <div style={{ color: C.muted, fontSize: 13 }}>No balances recorded.</div>
        ) : (
          <>
            {rows.map((r) => (
              <div key={r.code} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 13 }}>
                <span style={{ color: "#cbd5e8" }}>{r.name}</span>
                <span style={{ fontWeight: 700, color: C.text }}>{kes(r.balance)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 0", marginTop: 6, fontSize: 15, fontWeight: 900, color: C.gold, borderTop: `1px solid ${C.border}` }}>
              <span>Total {title.charAt(0) + title.slice(1).toLowerCase().replace(" accounts","")}</span>
              <span>{kes(total)}</span>
            </div>
          </>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'DM Sans', system-ui, sans-serif", color: C.text }}>
      {/* ── Module Header ── */}
      <div style={{ padding: "20px 28px 0", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.14em", color: C.gold, marginBottom: 4 }}>FINANCIALS</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: C.text, marginBottom: 2 }}>Finance & Billing</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
              Invoices auto-generate the General Ledger, Balance Sheet, Income Statement &amp; Aged Debtors
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            {tab === "invoices" && (
              <button style={s.goldBtn} onClick={() => setShowInvoiceForm(true)}>+ New Invoice</button>
            )}
            {tab === "trust" && (
              <button style={s.goldBtn} onClick={() => setShowTrustForm(true)}>+ Trust Entry</button>
            )}
          </div>
        </div>
        {/* Tabs */}
        <div style={{ display: "flex" }}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "10px 18px",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.04em",
              color: tab === t.id ? C.gold : C.muted,
              background: "none",
              border: "none",
              borderBottom: tab === t.id ? `2px solid ${C.gold}` : "2px solid transparent",
              cursor: "pointer",
              transition: "all 0.18s",
            }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Body ── */}
      <div style={{ padding: "24px 28px" }}>

        {/* ════════════════════ INVOICES ════════════════════ */}
        {tab === "invoices" && (
          <>
            <div style={{ display: "flex", gap: 12, marginBottom: 22 }}>
              <StatCard label="Total Billed"      value={kes(totalBilled)} />
              <StatCard label="Collected"         value={kes(totalCollected)}   color="#22c55e" />
              <StatCard label="Outstanding"       value={kes(totalOutstanding)} color="#ef4444" />
              <StatCard label="Total Invoices"    value={invoices.length}        color="#60a5fa" />
            </div>
            <div style={s.card}>
              {enriched.length === 0 ? (
                <EmptyState icon="📄" title="No invoices yet" sub="Create your first invoice — the GL, Balance Sheet and all statements will auto-generate." />
              ) : (
                <table style={s.tbl}>
                  <thead>
                    <tr>
                      {["Invoice #","Client","Matter","Date","Due Date","Amount","Paid","Balance","Status",""].map((h) => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {enriched.map((inv) => (
                      <tr key={inv.id} style={{ transition: "background 0.15s" }}>
                        <td style={{ ...s.td, fontWeight: 800, color: C.gold }}>{inv.number}</td>
                        <td style={s.td}>{inv.client}</td>
                        <td style={{ ...s.td, color: C.muted }}>{inv.matter}</td>
                        <td style={{ ...s.td, color: C.muted }}>{fmtDate(inv.date)}</td>
                        <td style={{ ...s.td, color: inv.ds === "overdue" ? "#ef4444" : C.muted }}>{fmtDate(inv.dueDate)}</td>
                        <td style={{ ...s.td, fontWeight: 800 }}>{kes(inv.total)}</td>
                        <td style={{ ...s.td, color: "#22c55e" }}>{kes(paidFor(inv.id))}</td>
                        <td style={{ ...s.td, fontWeight: 800, color: (inv.total || 0) - paidFor(inv.id) <= 0 ? "#22c55e" : "#f59e0b" }}>{kes(Math.max(0, (inv.total || 0) - paidFor(inv.id)))}</td>
                        <td style={s.td}><Badge status={inv.ds} /></td>
                        <td style={s.td}>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {(inv.total || 0) - paidFor(inv.id) > 0 && (
                              <button style={s.paidBtn} onClick={() => { setPayFor(inv); setPayForm({ amount: "", date: isoToday(), method: "M-Pesa", note: "" }); }}>+ Record Payment</button>
                            )}
                            <button style={s.delBtn} onClick={() => deleteInv(inv.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ════════════════════ GENERAL LEDGER ════════════════════ */}
        {tab === "gl" && (
          <>
            <AutoBadge />
            <div style={s.card}>
              {gl.length === 0 ? (
                <EmptyState icon="📒" title="General Ledger is empty" sub="Create an invoice to auto-post the first journal entry." />
              ) : (
                <table style={s.tbl}>
                  <thead>
                    <tr>
                      {["Date","Reference","Narration","Account","Dr (KES)","Cr (KES)"].map((h) => (
                        <th key={h} style={{ ...s.th, textAlign: h.includes("KES") ? "right" : "left" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {gl.flatMap((entry, ei) =>
                      entry.lines.map((line, li) => (
                        <tr key={`${ei}-${li}`} style={{ background: li === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                          <td style={{ ...s.td, color: C.muted }}>{li === 0 ? fmtDate(entry.date) : ""}</td>
                          <td style={{ ...s.td, fontWeight: li === 0 ? 800 : 400, color: li === 0 ? C.gold : "transparent" }}>{li === 0 ? entry.ref : ""}</td>
                          <td style={{ ...s.td, color: C.muted, fontSize: 12 }}>{li === 0 ? entry.narration : ""}</td>
                          <td style={s.td}>{line.account}</td>
                          <td style={{ ...s.td, color: "#22c55e", fontWeight: line.dr > 0 ? 800 : 400, textAlign: "right" }}>{line.dr > 0 ? kes(line.dr) : "—"}</td>
                          <td style={{ ...s.td, color: "#60a5fa", fontWeight: line.cr > 0 ? 800 : 400, textAlign: "right" }}>{line.cr > 0 ? kes(line.cr) : "—"}</td>
                        </tr>
                      ))
                    )}
                    {/* Totals row */}
                    {(() => {
                      const totalDr = gl.flatMap((e) => e.lines).reduce((s, l) => s + l.dr, 0)
                      const totalCr = gl.flatMap((e) => e.lines).reduce((s, l) => s + l.cr, 0)
                      return (
                        <tr style={{ borderTop: `1px solid ${C.border}` }}>
                          <td colSpan={4} style={{ ...s.td, fontWeight: 800, color: C.gold, fontSize: 11, letterSpacing: "0.08em" }}>TOTALS</td>
                          <td style={{ ...s.td, fontWeight: 900, color: "#22c55e", textAlign: "right" }}>{kes(totalDr)}</td>
                          <td style={{ ...s.td, fontWeight: 900, color: "#60a5fa", textAlign: "right" }}>{kes(totalCr)}</td>
                        </tr>
                      )
                    })()}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ════════════════════ BALANCE SHEET ════════════════════ */}
        {tab === "bs" && (
          <div style={{ maxWidth: 680 }}>
            <AutoBadge />
            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 18, letterSpacing: "0.06em" }}>
              AS AT {new Date().toLocaleDateString("en-KE", { day: "2-digit", month: "long", year: "numeric" }).toUpperCase()}
            </div>
            {bsSection("ASSETS", ["1001", "1100", "1200"])}
            {bsSection("LIABILITIES", ["2100", "2200"])}
            {/* Equity / Net */}
            {(() => {
              const assets = ["1001","1100","1200"].reduce((s, c) => s + (balances[c]?.balance || 0), 0)
              const liabs  = ["2100","2200"].reduce((s, c) => s + (balances[c]?.balance || 0), 0)
              const equity = assets - liabs
              return (
                <div style={{ ...s.card, background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.2)" }}>
                  <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.14em", color: C.gold, marginBottom: 14 }}>EQUITY / NET POSITION</div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 900 }}>
                    <span style={{ color: C.text }}>Partners' Net Equity</span>
                    <span style={{ color: equity >= 0 ? "#22c55e" : "#ef4444" }}>{kes(equity)}</span>
                  </div>
                  <div style={{ marginTop: 10, fontSize: 11, color: C.muted }}>Assets − Liabilities = {kes(assets)} − {kes(liabs)} = {kes(equity)}</div>
                </div>
              )
            })()}
          </div>
        )}

        {/* ════════════════════ INCOME STATEMENT ════════════════════ */}
        {tab === "is" && (
          <div style={{ maxWidth: 680 }}>
            <AutoBadge />
            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 18, letterSpacing: "0.06em" }}>
              FOR THE PERIOD ENDING {new Date().toLocaleDateString("en-KE", { day: "2-digit", month: "long", year: "numeric" }).toUpperCase()}
            </div>
            {/* Revenue */}
            <div style={s.card}>
              <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.14em", color: C.gold, marginBottom: 14 }}>REVENUE</div>
              {(() => {
                const rev = balances["4001"]?.balance || 0
                const vatCollected = balances["2200"]?.balance || 0
                return (
                  <>
                    {[["Legal Fees (net of VAT)", rev], ["VAT Collected", vatCollected]].map(([k, v]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 13 }}>
                        <span style={{ color: "#cbd5e8" }}>{k}</span>
                        <span style={{ fontWeight: 700, color: "#22c55e" }}>{kes(v)}</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 0", marginTop: 6, borderTop: `1px solid ${C.border}`, fontSize: 15, fontWeight: 900, color: C.gold }}>
                      <span>Total Revenue</span><span>{kes(rev)}</span>
                    </div>
                  </>
                )
              })()}
            </div>
            {/* Expenses */}
            <div style={s.card}>
              <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.14em", color: C.muted, marginBottom: 14 }}>EXPENSES</div>
              <div style={{ color: C.muted, fontSize: 13, padding: "8px 0" }}>
                No expenses recorded. Add disbursements and overhead entries to see a full Profit &amp; Loss statement.
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 0", marginTop: 6, borderTop: `1px solid ${C.border}`, fontSize: 14, fontWeight: 900, color: C.muted }}>
                <span>Total Expenses</span><span>{kes(0)}</span>
              </div>
            </div>
            {/* Net Profit */}
            {(() => {
              const rev = balances["4001"]?.balance || 0
              return (
                <div style={{ ...s.card, background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.2)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 17, fontWeight: 900 }}>
                    <span style={{ color: C.gold }}>NET PROFIT / (LOSS)</span>
                    <span style={{ color: rev >= 0 ? "#22c55e" : "#ef4444" }}>{kes(rev)}</span>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 11, color: C.muted }}>Revenue {kes(rev)} − Expenses {kes(0)} = {kes(rev)}</div>
                </div>
              )
            })()}
          </div>
        )}

        {/* ════════════════════ TRUST ACCOUNT ════════════════════ */}
        {tab === "trust" && (
          <>
            <div style={{ display: "flex", gap: 12, marginBottom: 22 }}>
              {(() => {
                const trustBal     = balances["1200"]?.balance || 0
                const totalDeposits = trustTxns.filter((t) => t.type === "deposit").reduce((s, t) => s + t.amount, 0)
                const totalWithdrawals = trustTxns.filter((t) => t.type === "withdrawal").reduce((s, t) => s + t.amount, 0)
                return (
                  <>
                    <StatCard label="Trust Balance"      value={kes(trustBal)} />
                    <StatCard label="Total Deposits"     value={kes(totalDeposits)}     color="#22c55e" />
                    <StatCard label="Total Withdrawals"  value={kes(totalWithdrawals)}  color="#ef4444" />
                    <StatCard label="Transactions"       value={trustTxns.length}        color="#60a5fa" />
                  </>
                )
              })()}
            </div>

            {/* Trust entry form */}
            {showTrustForm && (
              <div style={{ ...s.card, border: "1px solid rgba(201,168,76,0.25)", marginBottom: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", color: C.gold, marginBottom: 16 }}>NEW TRUST ENTRY</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 130px", gap: 12, alignItems: "end" }}>
                  {[
                    { label: "Client",       key: "client",  ph: "Client name",         type: "text" },
                    { label: "Amount (KES)", key: "amount",  ph: "0.00",                type: "number" },
                    { label: "Date",         key: "date",    ph: "",                    type: "date" },
                    { label: "Reference",    key: "ref",     ph: "e.g. TRU-2026-001",  type: "text" },
                  ].map((f) => (
                    <div key={f.key}>
                      <label style={s.lbl}>{f.label}</label>
                      <input type={f.type} placeholder={f.ph} value={trustForm[f.key]} onChange={(e) => setTrustForm((p) => ({ ...p, [f.key]: e.target.value }))} style={s.inp} />
                    </div>
                  ))}
                  <div>
                    <label style={s.lbl}>Type</label>
                    <select value={trustForm.type} onChange={(e) => setTrustForm((p) => ({ ...p, type: e.target.value }))} style={s.inp}>
                      <option value="deposit">Deposit</option>
                      <option value="withdrawal">Withdrawal</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button onClick={saveTrust} style={s.goldBtn}>Save Entry</button>
                  <button onClick={() => setShowTrustForm(false)} style={s.ghostBtn}>Cancel</button>
                </div>
              </div>
            )}

            <div style={s.card}>
              {trustTxns.length === 0 ? (
                <EmptyState icon="🏦" title="No trust transactions" sub="Record client deposits and withdrawals to maintain your trust account ledger." />
              ) : (
                <table style={s.tbl}>
                  <thead>
                    <tr>{["Date","Client","Reference","Type","Amount"].map((h) => <th key={h} style={{ ...s.th, textAlign: h === "Amount" ? "right" : "left" }}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {[...trustTxns].sort((a, b) => new Date(b.date) - new Date(a.date)).map((t) => (
                      <tr key={t.id}>
                        <td style={{ ...s.td, color: C.muted }}>{fmtDate(t.date)}</td>
                        <td style={s.td}>{t.client}</td>
                        <td style={{ ...s.td, color: C.gold, fontWeight: 800 }}>{t.ref || t.id}</td>
                        <td style={s.td}>
                          <span style={{ background: t.type === "deposit" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", color: t.type === "deposit" ? "#22c55e" : "#ef4444", padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 800 }}>
                            {t.type.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ ...s.td, fontWeight: 800, color: t.type === "deposit" ? "#22c55e" : "#ef4444", textAlign: "right" }}>
                          {t.type === "deposit" ? "+" : "−"}{kes(t.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ════════════════════ AGED DEBTORS ════════════════════ */}
        {tab === "aged" && (
          <>
            <AutoBadge />
            {/* Age bucket summary */}
            <div style={{ display: "flex", gap: 12, marginBottom: 22 }}>
              {[
                { label: "Current",     key: "Current",   color: "#22c55e" },
                { label: "1–30 Days",   key: "1–30 Days", color: C.gold },
                { label: "31–60 Days",  key: "31–60 Days",color: "#f59e0b" },
                { label: "61–90 Days",  key: "61–90 Days",color: "#fb923c" },
                { label: "90+ Days",    key: "90+ Days",  color: "#ef4444" },
              ].map((b) => {
                const items = aged.filter((i) => i.bucket === b.key)
                return (
                  <div key={b.key} style={{ flex: 1, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: C.muted, marginBottom: 6 }}>{b.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: b.color }}>{kes(items.reduce((s, i) => s + i.gross, 0))}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{items.length} invoice{items.length !== 1 ? "s" : ""}</div>
                  </div>
                )
              })}
            </div>
            <div style={s.card}>
              {aged.length === 0 ? (
                <EmptyState icon="✅" title="No outstanding invoices" sub="All invoices are paid. Great work!" />
              ) : (
                <table style={s.tbl}>
                  <thead>
                    <tr>
                      {["Invoice #","Client","Matter","Due Date","Days Overdue","Amount","Age"].map((h) => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {aged.map((inv) => {
                      const ageColor =
                        inv.bucket === "90+ Days"  ? "#ef4444" :
                        inv.bucket === "61–90 Days" ? "#fb923c" :
                        inv.bucket === "31–60 Days" ? "#f59e0b" : C.gold
                      return (
                        <tr key={inv.id}>
                          <td style={{ ...s.td, fontWeight: 800, color: C.gold }}>{inv.number}</td>
                          <td style={s.td}>{inv.client}</td>
                          <td style={{ ...s.td, color: C.muted }}>{inv.matter}</td>
                          <td style={{ ...s.td, color: C.muted }}>{fmtDate(inv.dueDate)}</td>
                          <td style={{ ...s.td, fontWeight: 800, color: inv.overdue > 0 ? ageColor : "#22c55e" }}>
                            {inv.overdue > 0 ? `${inv.overdue}d` : "Current"}
                          </td>
                          <td style={{ ...s.td, fontWeight: 800 }}>{kes(inv.gross)}</td>
                          <td style={s.td}>
                            <span style={{ background: `${ageColor}18`, color: ageColor, padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 800 }}>
                              {inv.bucket}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                    {/* Grand total */}
                    <tr style={{ borderTop: `1px solid ${C.border}` }}>
                      <td colSpan={5} style={{ ...s.td, fontWeight: 800, color: C.gold, fontSize: 11, letterSpacing: "0.08em" }}>TOTAL OUTSTANDING</td>
                      <td style={{ ...s.td, fontWeight: 900, color: "#ef4444", fontSize: 14 }}>{kes(aged.reduce((s, i) => s + i.gross, 0))}</td>
                      <td style={s.td} />
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {tab === "feenotes" && (
          <FeeNotesTab invoices={invoices} addInvoice={addInvoice} />
        )}

        {tab === "statements" && (() => {
          const clients = Array.from(new Set(invoices.map((i) => i.client).filter(Boolean))).sort()
          const cInvoices = invoices.filter((i) => i.client === stmtClient)
          const cInvIds = new Set(cInvoices.map((i) => i.id))
          const cPayments = payments.filter((p) => cInvIds.has(p.invoiceId))
          const billed = cInvoices.reduce((s, i) => s + (i.total || 0), 0)
          const received = cPayments.reduce((s, p) => s + p.amount, 0)
          const outstanding = billed - received

          // build a dated, running-balance ledger
          const rows = [
            ...cInvoices.map((i) => ({ date: i.date, kind: "invoice", ref: i.number, desc: `Invoice — ${i.matter || ""}`, debit: i.total || 0, credit: 0 })),
            ...cPayments.map((p) => {
              const inv = cInvoices.find((i) => i.id === p.invoiceId)
              return { date: p.date, kind: "payment", ref: inv ? inv.number : "", desc: `Payment received (${p.method})${p.note ? " — " + p.note : ""}`, debit: 0, credit: p.amount }
            }),
          ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          let run = 0
          const ledger = rows.map((r) => { run += r.debit - r.credit; return { ...r, balance: run } })

          return (
            <div style={s.card}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 18, flexWrap: "wrap" }}>
                <div>
                  <label style={{ display: "block", marginBottom: 5, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted }}>Select Client</label>
                  <select value={stmtClient} onChange={(e) => setStmtClient(e.target.value)} style={{ background: "#080f1c", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, padding: "9px 12px", color: "#e8eaf0", fontSize: 13, minWidth: 260, outline: "none" }}>
                    <option value="">— Choose a client —</option>
                    {clients.map((cl) => <option key={cl} value={cl}>{cl}</option>)}
                  </select>
                </div>
                {stmtClient && (
                  <button onClick={() => window.print()} style={{ padding: "9px 22px", background: "#c9a84c", border: "none", color: "#0d1424", borderRadius: 8, fontSize: 13, fontWeight: 900, cursor: "pointer" }}>⬇ Download / Print Statement</button>
                )}
              </div>

              {!stmtClient ? (
                <EmptyState icon="📑" title="Statement of Account" sub="Choose a client to see every invoice, every payment, and the running balance." />
              ) : (
                <div id="client-statement" style={{ background: "#fff", color: "#1a1a1a", borderRadius: 10, padding: 32 }}>
                  <FirmLetterhead docRef={`STATEMENT — ${stmtClient}`} docDate={isoToday()} docTitle="STATEMENT OF ACCOUNT" />
                  <div style={{ display: "flex", gap: 16, margin: "18px 0" }}>
                    <div style={{ flex: 1, border: "1px solid #ddd", borderRadius: 8, padding: "12px 14px" }}>
                      <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: "#888" }}>Total Billed</div>
                      <div style={{ fontSize: 17, fontWeight: 900 }}>{kes(billed)}</div>
                    </div>
                    <div style={{ flex: 1, border: "1px solid #ddd", borderRadius: 8, padding: "12px 14px" }}>
                      <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: "#888" }}>Payments Received</div>
                      <div style={{ fontSize: 17, fontWeight: 900, color: "#138a36" }}>{kes(received)}</div>
                    </div>
                    <div style={{ flex: 1, border: "1px solid #ddd", borderRadius: 8, padding: "12px 14px" }}>
                      <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: "#888" }}>Balance Outstanding</div>
                      <div style={{ fontSize: 17, fontWeight: 900, color: outstanding > 0 ? "#c0392b" : "#138a36" }}>{kes(outstanding)}</div>
                    </div>
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #1a1a1a" }}>
                        {["Date","Reference","Description","Billed","Paid","Balance"].map((h) => (
                          <th key={h} style={{ textAlign: h === "Date" || h === "Reference" || h === "Description" ? "left" : "right", padding: "8px 10px", fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.length === 0 ? (
                        <tr><td colSpan={6} style={{ padding: 20, textAlign: "center", color: "#888" }}>No invoices or payments for this client yet.</td></tr>
                      ) : ledger.map((r, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #eee" }}>
                          <td style={{ padding: "7px 10px" }}>{fmtDate(r.date)}</td>
                          <td style={{ padding: "7px 10px", fontWeight: 700 }}>{r.ref}</td>
                          <td style={{ padding: "7px 10px" }}>{r.desc}</td>
                          <td style={{ padding: "7px 10px", textAlign: "right" }}>{r.debit ? kes(r.debit) : "—"}</td>
                          <td style={{ padding: "7px 10px", textAlign: "right", color: "#138a36" }}>{r.credit ? kes(r.credit) : "—"}</td>
                          <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: 800 }}>{kes(r.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: "2px solid #1a1a1a" }}>
                        <td colSpan={5} style={{ padding: "9px 10px", fontWeight: 900, textTransform: "uppercase", fontSize: 11 }}>Balance Due</td>
                        <td style={{ padding: "9px 10px", textAlign: "right", fontWeight: 900, fontSize: 14, color: outstanding > 0 ? "#c0392b" : "#138a36" }}>{kes(outstanding)}</td>
                      </tr>
                    </tfoot>
                  </table>
                  <p style={{ fontSize: 11, color: "#666", marginTop: 16 }}>This statement reflects all invoices and payments recorded as at {fmtDate(isoToday())}. Please settle any outstanding balance at your earliest convenience.</p>
                  <FirmFooter />
                </div>
              )}
            </div>
          )
        })()}

      </div>

      {/* ── Modals ── */}
      {showInvoiceForm && (
        <InvoiceForm onSave={addInvoice} onClose={() => setShowInvoiceForm(false)} count={invoices.length} />
      )}
      {payFor && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setPayFor(null)}>
          <div style={{ background: "#0c1527", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 14, width: "min(440px, 96vw)", padding: 26 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#c9a84c", marginBottom: 4 }}>RECORD PAYMENT</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#e8eaf0", marginBottom: 2 }}>{payFor.number} — {payFor.client}</div>
            <div style={{ fontSize: 12, color: "#6b7fa3", marginBottom: 16 }}>Outstanding balance: {kes(Math.max(0, (payFor.total || 0) - paidFor(payFor.id)))}</div>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={{ display: "block", marginBottom: 5, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6b7fa3" }}>Amount Received (KES)</label>
                <input type="number" min={0} value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} placeholder="e.g. 25000" style={{ background: "#080f1c", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, padding: "9px 12px", color: "#e8eaf0", fontSize: 13, width: "100%", boxSizing: "border-box", outline: "none" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 5, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6b7fa3" }}>Date Received</label>
                <input type="date" value={payForm.date} onChange={(e) => setPayForm({ ...payForm, date: e.target.value })} style={{ background: "#080f1c", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, padding: "9px 12px", color: "#e8eaf0", fontSize: 13, width: "100%", boxSizing: "border-box", outline: "none" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 5, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6b7fa3" }}>Method</label>
                <select value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })} style={{ background: "#080f1c", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, padding: "9px 12px", color: "#e8eaf0", fontSize: 13, width: "100%", boxSizing: "border-box", outline: "none" }}>
                  {["M-Pesa","Bank Transfer","Cheque","Cash"].map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 5, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6b7fa3" }}>Reference / Note (optional)</label>
                <input value={payForm.note} onChange={(e) => setPayForm({ ...payForm, note: e.target.value })} placeholder="e.g. M-Pesa code, cheque no." style={{ background: "#080f1c", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, padding: "9px 12px", color: "#e8eaf0", fontSize: 13, width: "100%", boxSizing: "border-box", outline: "none" }} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
              <button onClick={() => setPayFor(null)} style={{ padding: "9px 18px", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "#94a3b8", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => recordPayment(payFor)} style={{ padding: "9px 22px", background: "#c9a84c", border: "none", color: "#0d1424", borderRadius: 8, fontSize: 13, fontWeight: 900, cursor: "pointer" }}>Save Payment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
