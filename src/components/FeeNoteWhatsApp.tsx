import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatDate } from "@/lib/formatDate"

const STORE = "omuyoma_whatsapp_numbers"

function loadNumbers(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(STORE) || "{}") } catch { return {} }
}

function saveNumber(client: string, number: string) {
  try {
    const all = loadNumbers()
    all[client.trim().toLowerCase()] = number
    localStorage.setItem(STORE, JSON.stringify(all))
  } catch {}
}

// 0712 345 678, +254 712 345 678, 254712345678 and 712345678 all become 254712345678
export function toWhatsAppNumber(raw: string): string | null {
  let d = raw.replace(/\D/g, "")
  if (d.startsWith("00")) d = d.slice(2)
  if (d.startsWith("0")) d = "254" + d.slice(1)
  else if (/^[17]\d{8}$/.test(d)) d = "254" + d
  return /^\d{10,15}$/.test(d) ? d : null
}

const kes = (n: number) =>
  `KES ${Number(n || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function buildMessage(fn: any): string {
  const lines = [
    `Dear ${fn.client || "Client"},`,
    "",
    `Please find our fee note ${fn.feeNoteNo || ""} dated ${formatDate(fn.date)} for ${kes(fn.total ?? fn.totalAmount)}.`,
  ]
  if (fn.dueDate) lines.push(`Payment is due by ${formatDate(fn.dueDate)}.`)
  lines.push("", "Kind regards,", "Omuyoma & Co. Advocates")
  return lines.join("\n")
}

export function FeeNoteWhatsApp({ feeNote }: { feeNote: any }) {
  const [open, setOpen] = useState(false)
  const [number, setNumber] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const start = () => {
    setNumber(loadNumbers()[String(feeNote.client || "").trim().toLowerCase()] || "")
    setMessage(buildMessage(feeNote))
    setError("")
    setOpen(true)
  }

  const send = () => {
    const wa = toWhatsAppNumber(number)
    if (!wa) { setError("Enter a valid number, e.g. 0712 345 678 or +254 712 345 678."); return }
    saveNumber(String(feeNote.client || ""), number.trim())
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer")
    setOpen(false)
  }

  return (
    <>
      <button
        onClick={start}
        title="Send via WhatsApp"
        style={{ padding: "5px 12px", background: "rgba(37,211,102,0.12)", border: "1px solid rgba(37,211,102,0.3)", color: "#25D366", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
      >
        WhatsApp
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Send fee note via WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Client WhatsApp number *</Label>
              <Input value={number} onChange={e => { setNumber(e.target.value); setError("") }} placeholder="0712 345 678" />
              {error && <p className="text-[11px] text-destructive">{error}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Message</Label>
              <Textarea rows={7} value={message} onChange={e => setMessage(e.target.value)} />
              <p className="text-[11px] text-muted-foreground">
                WhatsApp opens with this message ready. Attach the fee note PDF in the chat before sending.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={send} disabled={!number.trim()} className="btn-royal">Open WhatsApp</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
