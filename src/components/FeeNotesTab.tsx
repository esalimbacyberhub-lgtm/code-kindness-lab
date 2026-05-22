import { useState, useMemo } from "react"
import { FirmLetterhead, FirmFooter, FIRM } from "./FirmLetterhead"

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface FeeItem {
  id:          string
  description: string
  hours:       number
  rate:        number
}

interface FeeNote {
  id:          string
  feeNoteNo:   string        // FN/2026/001
  client:      string
  clientAddr:  string
  matterRef:   string        // e.g. OM/CL/001
  matterTitle: string
  partyA:      string
  partyB:      string
  date:        string
  dueDate:     string
  items:       FeeItem[]
  disbursements: FeeItem[]
  vatEnabled:  boolean
  subtotal:    number
  vat:         number
  total:       number
  status:      "draft" | "issued" | "settled"
  notes:       string
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────────────────────
const VAT        = 0.16
const uid        = () => Math.random().toString(36).slice(2, 9).toUpperCase()
const isoToday   = () => new Date().toISOString().split("T")[0]
const kes        = (n: number) =>
  `KES ${(+n || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtDate    = (d: string) =>
  d ? new Date(d).toLocaleDateString("en-KE", { day: "2-digit", month: "long", year: "numeric" }) : "—"

const genFeeNoteNo = (count: number) =>
  `FN/${new Date().getFullYear()}/${String(count + 1).padStart(3, "0")}`

const BLANK_ITEM = (): FeeItem => ({ id: uid(), description: "", hours: 1, rate: 0 })

// ─────────────────────────────────────────────────────────────────────────────
// FEE NOTE PRINT VIEW
// ─────────────────────────────────────────────────────────────────────────────
function FeeNoteDocument({ fn, onClose }: { fn: FeeNote; onClose: () => void }) {
  const S = {
    page:    { background: "#0d1424", minHeight: "100vh", padding: "32px 28px", fontFamily: "'Georgia', serif", color: "#e8eaf0" } as React.CSSProperties,
    header:  { borderBottom: "3px solid #4169E1", paddingBottom: 20, marginBottom: 24 } as React.CSSProperties,
    section: { marginBottom: 20 } as React.CSSProperties,
    tbl:     { width: "100%", borderCollapse: "collapse" as const, fontSize: 13, marginBottom: 16 },
    th:      { textAlign: "left" as const, padding: "8px 12px", background: "rgba(65,105,225,0.15)", color: "#93c5fd", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, borderBottom: "1px solid rgba(65,105,225,0.3)" },
    td:      { padding: "9px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)", color: "#cbd5e8", fontSize: 13 } as React.CSSProperties,
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 2000, overflowY: "auto" }}>
      <div style={{ maxWidth: 820, margin: "24px auto", padding: "0 16px" }}>
        {/* Toolbar */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, justifyContent: "flex-end" }}>
          <button
            onClick={() => window.print()}
            style={{ padding: "9px 22px", background: "#4169E1", border: "none", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            🖨 Print / Save PDF
          </button>
          <button
            onClick={onClose}
            style={{ padding: "9px 18px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#94a3b8", borderRadius: 8, fontSize: 13, cursor: "pointer" }}
          >
            ✕ Close
          </button>
        </div>

        {/* Document */}
        <div id="fee-note-print" style={{ ...S.page, background: "#0c1527", border: "1px solid rgba(65,105,225,0.25)", borderRadius: 14, borderLeft: "6px solid #4169E1" }}>

          {/* Firm Letterhead */}
          <FirmLetterhead docRef={fn.feeNoteNo} docDate={fn.date} docTitle="FEE NOTE" />

          {/* Client + Matter */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#4169E1", marginBottom: 6 }}>
                Billed To
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#e8eaf0" }}>{fn.client}</div>
              {fn.clientAddr && <div style={{ fontSize: 12, color: "#6b7fa3", marginTop: 2 }}>{fn.clientAddr}</div>}
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#4169E1", marginBottom: 6 }}>
                Matter
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e8eaf0", fontFamily: "monospace" }}>{fn.matterRef}</div>
              <div style={{ fontSize: 12, color: "#6b7fa3", marginTop: 2 }}>{fn.matterTitle}</div>
              {(fn.partyA || fn.partyB) && (
                <div style={{ fontSize: 12, color: "#93c5fd", marginTop: 4, fontStyle: "italic" }}>
                  {fn.partyA || "—"} <strong style={{ fontStyle: "normal" }}>v.</strong> {fn.partyB || "—"}
                </div>
              )}
            </div>
          </div>

          {/* Professional fees */}
          <div style={S.section}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#4169E1", marginBottom: 10 }}>
              Professional Fees
            </div>
            <table style={S.tbl}>
              <thead>
                <tr>
                  {["Description of Services", "Hrs", "Rate (KES)", "Amount (KES)"].map(h => (
                    <th key={h} style={{ ...S.th, textAlign: h === "Description of Services" ? "left" : "right" as "left" | "right" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fn.items.map(item => (
                  <tr key={item.id}>
                    <td style={S.td}>{item.description}</td>
                    <td style={{ ...S.td, textAlign: "right" }}>{item.hours}</td>
                    <td style={{ ...S.td, textAlign: "right" }}>{kes(item.rate)}</td>
                    <td style={{ ...S.td, textAlign: "right", fontWeight: 700, color: "#e8eaf0" }}>{kes(item.hours * item.rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Disbursements */}
          {fn.disbursements.length > 0 && (
            <div style={S.section}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#4169E1", marginBottom: 10 }}>
                Disbursements
              </div>
              <table style={S.tbl}>
                <thead>
                  <tr>
                    {["Description", "", "Amount (KES)"].map((h, i) => (
                      <th key={i} style={{ ...S.th, textAlign: i === 2 ? "right" : "left" as "left" | "right" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fn.disbursements.map(d => (
                    <tr key={d.id}>
                      <td colSpan={2} style={S.td}>{d.description}</td>
                      <td style={{ ...S.td, textAlign: "right", fontWeight: 700, color: "#e8eaf0" }}>{kes(d.rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
            <div style={{ width: 300 }}>
              {[
                ["Professional Fees Subtotal", kes(fn.items.reduce((s, i) => s + i.hours * i.rate, 0))],
                ...(fn.disbursements.length > 0 ? [["Disbursements", kes(fn.disbursements.reduce((s, d) => s + d.rate, 0))]] : []),
                ...(fn.vatEnabled ? [["VAT (16%)", kes(fn.vat)]] : []),
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 13, color: "#6b7fa3" }}>
                  <span>{k}</span><span>{v}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 0", marginTop: 8, borderTop: "2px solid #4169E1", fontSize: 16, fontWeight: 900, color: "#4169E1" }}>
                <span>TOTAL DUE</span><span>{kes(fn.total)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {fn.notes && (
            <div style={{ padding: "12px 16px", background: "rgba(65,105,225,0.06)", borderRadius: 8, border: "1px solid rgba(65,105,225,0.15)", fontSize: 12, color: "#6b7fa3", marginBottom: 20 }}>
              {fn.notes}
            </div>
          )}

          {/* Legal footer */}
          <div style={{ borderTop: "1px solid rgba(65,105,225,0.2)", paddingTop: 16, fontSize: 11, color: "#6b7fa3", lineHeight: 1.7 }}>
            <p>This fee note is issued pursuant to the <em>Advocates (Remuneration) Order</em> and the retainer agreement between the parties.</p>
            <p style={{ marginTop: 8 }}>Payment is due within 30 days of the date of this fee note. For queries please contact the fee earner directly.</p>
            <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
              <div>
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 8 }}>
                  <p style={{ color: "#e8eaf0", fontWeight: 700, marginBottom: 2 }}>For: Omuyoma &amp; Co. Advocates</p>
                  <p>Authorised Signatory &amp; Date</p>
                </div>
              </div>
              <div>
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 8 }}>
                  <p style={{ color: "#e8eaf0", fontWeight: 700, marginBottom: 2 }}>Acknowledged by Client</p>
                  <p>Signature &amp; Date</p>
                </div>
              </div>
            </div>
          </div>

          {/* Status watermark */}
          {fn.status === "draft" && (
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%) rotate(-30deg)", fontSize: 72, fontWeight: 900, color: "rgba(65,105,225,0.08)", pointerEvents: "none", userSelect: "none", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>
              DRAFT
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FEE NOTE FORM
// ─────────────────────────────────────────────────────────────────────────────
function FeeNoteForm({ onSave, onClose, count }: { onSave: (fn: FeeNote) => void; onClose: () => void; count: number }) {
  const [f, setF] = useState({
    client: "", clientAddr: "", matterRef: "", matterTitle: "",
    partyA: "", partyB: "", date: isoToday(), dueDate: "", notes: "", vatEnabled: true,
    items: [BLANK_ITEM()], disbursements: [] as FeeItem[],
  })
  const set = (k: string, v: unknown) => setF(p => ({ ...p, [k]: v }))

  const profSubtotal = f.items.reduce((s, i) => s + i.hours * i.rate, 0)
  const disburseTotal = f.disbursements.reduce((s, d) => s + d.rate, 0)
  const subtotal = profSubtotal + disburseTotal
  const vat   = f.vatEnabled ? subtotal * VAT : 0
  const total = subtotal + vat

  const setItem = (arr: "items" | "disbursements", id: string, k: string, v: unknown) =>
    set(arr, (f[arr] as FeeItem[]).map(i => i.id === id ? { ...i, [k]: typeof v === "string" && k !== "description" ? +v : v } : i))

  const save = () => {
    if (!f.client.trim() || !f.matterRef.trim()) return alert("Client and Matter Reference are required.")
    onSave({
      id: uid(), feeNoteNo: genFeeNoteNo(count),
      ...f, subtotal, vat, total, status: "draft",
    })
    onClose()
  }

  const inp: React.CSSProperties = { background: "#080f1c", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, padding: "9px 12px", color: "#e8eaf0", fontSize: 13, width: "100%", boxSizing: "border-box", outline: "none", fontFamily: "inherit" }
  const lbl: React.CSSProperties = { display: "block", marginBottom: 5, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6b7fa3" }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#0c1527", border: "1px solid rgba(65,105,225,0.3)", borderRadius: 14, width: "min(860px, 96vw)", maxHeight: "92vh", overflowY: "auto", padding: 28 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", color: "#4169E1", marginBottom: 4 }}>NEW FEE NOTE</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#e8eaf0" }}>{genFeeNoteNo(count)}</div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", borderRadius: 8, padding: "7px 16px", cursor: "pointer", fontSize: 13 }}>✕ Close</button>
        </div>

        {/* Client + Matter */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div><label style={lbl}>Client Name *</label><input style={inp} value={f.client} onChange={e => set("client", e.target.value)} placeholder="e.g. Kamau Holdings Ltd" /></div>
          <div><label style={lbl}>Client Address</label><input style={inp} value={f.clientAddr} onChange={e => set("clientAddr", e.target.value)} placeholder="P.O. Box 1234, Nairobi" /></div>
          <div><label style={lbl}>Matter Reference * (Case No.)</label><input style={inp} value={f.matterRef} onChange={e => set("matterRef", e.target.value)} placeholder="e.g. OM/CL/001" /></div>
          <div><label style={lbl}>Matter Title</label><input style={inp} value={f.matterTitle} onChange={e => set("matterTitle", e.target.value)} placeholder="e.g. Kamau v. Otieno — Land Dispute" /></div>
          <div><label style={lbl}>Plaintiff / Applicant</label><input style={inp} value={f.partyA} onChange={e => set("partyA", e.target.value)} placeholder="Party A" /></div>
          <div><label style={lbl}>Defendant / Respondent</label><input style={inp} value={f.partyB} onChange={e => set("partyB", e.target.value)} placeholder="Party B" /></div>
          <div><label style={lbl}>Fee Note Date</label><input type="date" style={inp} value={f.date} onChange={e => set("date", e.target.value)} /></div>
          <div><label style={lbl}>Payment Due Date</label><input type="date" style={inp} value={f.dueDate} onChange={e => set("dueDate", e.target.value)} /></div>
        </div>

        {/* Professional Fee Items */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <label style={{ ...lbl, margin: 0 }}>Professional Fees</label>
            <button onClick={() => set("items", [...f.items, BLANK_ITEM()])} style={{ background: "rgba(65,105,225,0.1)", border: "1px solid rgba(65,105,225,0.3)", color: "#4169E1", padding: "5px 14px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Add Line</button>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{["Description of Services", "Hrs", "Rate (KES)", "Amount", ""].map(h => <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6b7fa3", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {f.items.map(item => (
                <tr key={item.id}>
                  <td style={{ padding: "5px 5px 5px 10px" }}><input style={inp} value={item.description} onChange={e => setItem("items", item.id, "description", e.target.value)} placeholder="e.g. Drafting Lease Agreement" /></td>
                  <td style={{ padding: "5px", width: 70 }}><input type="number" style={inp} value={item.hours} onChange={e => setItem("items", item.id, "hours", e.target.value)} min={0} step={0.5} /></td>
                  <td style={{ padding: "5px", width: 130 }}><input type="number" style={inp} value={item.rate} onChange={e => setItem("items", item.id, "rate", e.target.value)} min={0} /></td>
                  <td style={{ padding: "5px 12px", fontWeight: 700, color: "#4169E1", fontSize: 13, whiteSpace: "nowrap" }}>{kes(item.hours * item.rate)}</td>
                  <td><button onClick={() => f.items.length > 1 && set("items", f.items.filter(i => i.id !== item.id))} style={{ background: "rgba(239,68,68,0.1)", border: "none", color: "#ef4444", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Disbursements */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <label style={{ ...lbl, margin: 0 }}>Disbursements (optional)</label>
            <button onClick={() => set("disbursements", [...f.disbursements, BLANK_ITEM()])} style={{ background: "rgba(65,105,225,0.1)", border: "1px solid rgba(65,105,225,0.3)", color: "#4169E1", padding: "5px 14px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Add Disbursement</button>
          </div>
          {f.disbursements.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["Description", "Amount (KES)", ""].map(h => <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6b7fa3", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{h}</th>)}</tr></thead>
              <tbody>
                {f.disbursements.map(d => (
                  <tr key={d.id}>
                    <td style={{ padding: "5px 5px 5px 10px" }}><input style={inp} value={d.description} onChange={e => setItem("disbursements", d.id, "description", e.target.value)} placeholder="e.g. Filing Fees, Stamp Duty…" /></td>
                    <td style={{ padding: "5px", width: 150 }}><input type="number" style={inp} value={d.rate} onChange={e => setItem("disbursements", d.id, "rate", e.target.value)} min={0} /></td>
                    <td><button onClick={() => set("disbursements", f.disbursements.filter(i => i.id !== d.id))} style={{ background: "rgba(239,68,68,0.1)", border: "none", color: "#ef4444", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Totals + VAT */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 18 }}>
          <div style={{ width: 300, background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "14px 18px", border: "1px solid rgba(255,255,255,0.07)" }}>
            {[["Professional Fees", kes(profSubtotal)], ...(disburseTotal > 0 ? [["Disbursements", kes(disburseTotal)]] : []), ...(f.vatEnabled ? [["VAT (16%)", kes(vat)]] : [])].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13, color: "#6b7fa3" }}><span>{k}</span><span>{v}</span></div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 0", marginTop: 8, borderTop: "2px solid #4169E1", fontSize: 16, fontWeight: 900, color: "#4169E1" }}>
              <span>TOTAL DUE</span><span>{kes(total)}</span>
            </div>
          </div>
        </div>

        {/* VAT + Notes */}
        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 16, marginBottom: 24, alignItems: "start" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#94a3b8", marginTop: 8 }}>
            <input type="checkbox" checked={f.vatEnabled} onChange={e => set("vatEnabled", e.target.checked)} style={{ accentColor: "#4169E1" }} />
            Apply VAT @ 16%
          </label>
          <div><label style={lbl}>Notes / Payment Terms</label><textarea style={{ ...inp, resize: "vertical" as const }} rows={2} value={f.notes} onChange={e => set("notes", e.target.value)} placeholder="Payment due within 30 days. Issued pursuant to the Advocates (Remuneration) Order." /></div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 22px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          <button onClick={save} style={{ padding: "10px 28px", background: "#4169E1", border: "none", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 900, cursor: "pointer" }}>Issue Fee Note →</button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT — drop this as the 7th tab inside FinancialsModule
// ─────────────────────────────────────────────────────────────────────────────
export function FeeNotesTab() {
  const { feeNotes, addFeeNote, updateFeeNote, deleteFeeNote } = useSupabaseFeeNotes()
  const [showForm, setShowForm]   = useState(false)
  const [viewing, setViewing]     = useState<FeeNote | null>(null)

  const save = async (fn: FeeNote) => {
    await addFeeNote(fn)
  }

  const deleteFN = async (id: string) => {
    if (!confirm("Delete this fee note?")) return
    await deleteFeeNote(id)
  }

  const markIssued = async (id: string) => {
    await updateFeeNote(id, { status: "issued" })
  }

  const statusStyle = (s: string) => {
    if (s === "issued")   return { bg: "rgba(65,105,225,0.12)",  col: "#93c5fd" }
    if (s === "settled")  return { bg: "rgba(34,197,94,0.12)",   col: "#22c55e" }
    return                       { bg: "rgba(148,163,184,0.1)",  col: "#94a3b8" }
  }

  const C = { panel: "#141d30", border: "rgba(255,255,255,0.07)", gold: "#4169E1", muted: "#6b7fa3", text: "#e8eaf0" }

  return (
    <>
      {/* Summary strip */}
      <div style={{ display: "flex", gap: 12, marginBottom: 22 }}>
        {[
          { label: "Total Fee Notes", value: feeNotes.length,                                               color: "#4169E1" },
          { label: "Draft",           value: feeNotes.filter(f => f.status === "draft").length,            color: "#94a3b8" },
          { label: "Issued",          value: feeNotes.filter(f => f.status === "issued").length,           color: "#93c5fd" },
          { label: "Total Value",     value: `KES ${feeNotes.reduce((s,f) => s+f.total,0).toLocaleString("en-KE")}`, color: "#22c55e" },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px" }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 19, fontWeight: 900, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* New Fee Note button */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button onClick={() => setShowForm(true)} style={{ padding: "9px 22px", background: "#4169E1", border: "none", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 900, cursor: "pointer" }}>
          + New Fee Note
        </button>
      </div>

      {/* Fee notes list */}
      <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
        {feeNotes.length === 0 ? (
          <div style={{ textAlign: "center", padding: "52px 20px", color: C.muted }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: "#94a3b8" }}>No fee notes yet</div>
            <div style={{ fontSize: 13 }}>Issue fee notes for individual matters — serialized FN/YYYY/NNN</div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["Fee Note #","Client","Matter Ref","Date","Total","Status",""].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...feeNotes].reverse().map(fn => {
                const ss = statusStyle(fn.status)
                return (
                  <tr key={fn.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "12px 14px", fontWeight: 800, color: "#4169E1" }}>{fn.feeNoteNo}</td>
                    <td style={{ padding: "12px 14px" }}>{fn.client}</td>
                    <td style={{ padding: "12px 14px", color: C.muted, fontFamily: "monospace", fontSize: 12 }}>{fn.matterRef}</td>
                    <td style={{ padding: "12px 14px", color: C.muted }}>{fmtDate(fn.date)}</td>
                    <td style={{ padding: "12px 14px", fontWeight: 800 }}>{kes(fn.total)}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ background: ss.bg, color: ss.col, padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>{fn.status}</span>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => setViewing(fn)} style={{ padding: "5px 12px", background: "rgba(65,105,225,0.12)", border: "1px solid rgba(65,105,225,0.25)", color: "#93c5fd", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>View</button>
                        {fn.status === "draft" && <button onClick={() => markIssued(fn.id)} style={{ padding: "5px 12px", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Issue</button>}
                        <button onClick={() => deleteFN(fn.id)} style={{ padding: "5px 12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Del</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {showForm  && <FeeNoteForm onSave={save} onClose={() => setShowForm(false)} count={feeNotes.length} />}
      {viewing   && <FeeNoteDocument fn={viewing} onClose={() => setViewing(null)} />}
    </>
  )
}
