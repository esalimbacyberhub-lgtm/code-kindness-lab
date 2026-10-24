import { useState, useRef, useEffect } from "react";
import { formatDate } from "@/lib/formatDate";
import { Send, Lock, FileText, Briefcase, CreditCard, MessageSquare, Clock, CheckCircle2, Download, Eye, Phone, Mail, Building2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Message, Matter, Role, VaultDocument, Invoice } from "../types";
import { cn } from "@/lib/utils";
import { ShieldLogo } from "@/components/FirmLetterhead";
import { supabase } from "@/lib/supabase";
import { useLawyerAvailability } from "../hooks/useLawyerAvailability";

interface Props {
  messages: Message[];
  matters: Matter[];
  role: Role;
  documents: VaultDocument[];
  invoices: Invoice[];
  onSend: (content: string, from: string, dir: Message["direction"]) => void;
  clientUserId?: string;
}

const fmtDate = (d: string) => d ? formatDate(d) : "—";
const kes = (n: number) => `KES ${(+n||0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;

const PORTAL_TABS = [
  { id: "case", label: "My Case", icon: Briefcase },
  { id: "docs", label: "Documents", icon: FileText },
  { id: "availability", label: "Availability", icon: Clock },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "payments", label: "Payments", icon: CreditCard },
] as const;
type PortalTab = (typeof PORTAL_TABS)[number]["id"];

export function ClientPortal({ messages, matters, role, documents, invoices, onSend, clientUserId }: Props) {
  const [tab, setTab] = useState<PortalTab>("case");
  const [text, setText] = useState("");
  const [selectedMatter, setSelectedMatter] = useState<Matter | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  const myMatters = clientUserId
    ? matters.filter((m: any) => m.clientUserId === clientUserId)
    : matters;

  useEffect(() => {
    if (!selectedMatter) {
      const first = myMatters.find(m => m.status === "active") || myMatters[0];
      if (first) setSelectedMatter(first);
    }
  }, [matters, clientUserId]);

  const send = () => {
    if (!text.trim()) return;
    const isClient = role === "client";
    onSend(text.trim(), isClient ? (selectedMatter?.client || "Client") : "Omuyoma & Co.", isClient ? "sent" : "received");
    setText("");
  };

  const matterDocs = documents.filter(
    d => d.matterId === selectedMatter?.id && d.clientVisible === true
  );
  const handleDownload = async (doc: any) => {
    if (!doc.storagePath) { alert("This document has no file attached yet."); return; }
    const { data, error } = await supabase.storage
      .from("matter-documents")
      .createSignedUrl(doc.storagePath, 3600);
    if (error || !data?.signedUrl) { alert("Could not open the file. Please try again."); return; }
    window.open(data.signedUrl, "_blank");
  };

  const { slots: availabilitySlots, loading: availabilityLoading } = useLawyerAvailability(selectedMatter?.id);
  const matterInvoices = invoices.filter(i => i.matter === selectedMatter?.title || i.matter === selectedMatter?.fileNo);
  const unpaidTotal = matterInvoices.filter(i => i.status !== "paid").reduce((s, i) => s + (i.totalAmount || 0), 0);

  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-primary/80 font-mono mb-2">Secure Channel</p>
          <h2 className="text-4xl font-serif">Client <span className="text-gradient-blue">Portal</span></h2>
        </div>
        <span className="flex items-center gap-2 text-xs text-success bg-success/10 border border-success/30 px-3 py-1.5 rounded-full">
          <Lock className="w-3 h-3" /> Secure &amp; Encrypted
        </span>
      </div>
      <div className="blue-divider mb-6" />

      {myMatters.length > 1 && (
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <span className="text-xs text-muted-foreground font-mono">MATTER:</span>
          {myMatters.map(m => (
            <button key={m.id} onClick={() => setSelectedMatter(m)}
              className={cn("flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium transition-all",
                selectedMatter?.id === m.id ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40")}>
              <span className="font-mono">{m.fileNo || m.id}</span>
            </button>
          ))}
        </div>
      )}

      {!selectedMatter ? (
        <div className="glass-card rounded-2xl p-10 text-center text-muted-foreground">
          <Briefcase className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p>No matters linked to this portal.</p>
        </div>
      ) : (
        <>
          <div className="glass-card rounded-2xl p-5 mb-6 border-l-4 border-l-primary">
            <div className="flex items-center gap-4">
              <ShieldLogo size={44} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{selectedMatter.fileNo || "—"}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/30 font-semibold">{selectedMatter.status}</span>
                </div>
                <h3 className="font-serif text-lg font-semibold">{selectedMatter.title}</h3>
                <p className="text-sm text-muted-foreground">{selectedMatter.client} · {selectedMatter.type}</p>
                {(selectedMatter.partyA || selectedMatter.partyB) && (
                  <p className="text-xs text-primary/70 font-serif italic mt-1">{selectedMatter.partyA || "—"} v. {selectedMatter.partyB || "—"}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex border-b border-border/50 mb-6">
            {PORTAL_TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={cn("flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all border-b-2",
                  tab === t.id ? "text-primary border-primary -mb-px" : "text-muted-foreground border-transparent hover:text-foreground")}>
                <t.icon className="w-4 h-4" /> {t.label}
                {t.id === "payments" && unpaidTotal > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-warning/20 text-warning font-bold">Due</span>
                )}
              </button>
            ))}
          </div>

          {tab === "case" && (
            <div className="space-y-6">
              {/* Prominent Case Status Banner */}
              {selectedMatter.caseStatus === "pending" && (
                <div className="glass-card rounded-2xl p-5 border-l-4 border-l-warning bg-warning/5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center text-2xl">⏳</div>
                    <div>
                      <p className="text-[11px] uppercase font-bold tracking-wider text-warning">Current Status</p>
                      <h3 className="text-xl font-serif font-semibold mt-0.5">Case Pending</h3>
                      <p className="text-xs text-muted-foreground mt-1">Your case is active. We will update you as soon as a court date is set.</p>
                    </div>
                  </div>
                </div>
              )}
              {selectedMatter.caseStatus === "hearing-scheduled" && selectedMatter.nextHearingDate && (
                <div className="glass-card rounded-2xl p-5 border-l-4 border-l-info bg-info/5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-info/20 flex items-center justify-center text-2xl">⚖️</div>
                    <div>
                      <p className="text-[11px] uppercase font-bold tracking-wider text-info">Current Status</p>
                      <h3 className="text-xl font-serif font-semibold mt-0.5">Hearing Scheduled</h3>
                      <p className="text-sm text-info font-semibold mt-1">{new Date(selectedMatter.nextHearingDate).toLocaleDateString("en-KE",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p>
                    </div>
                  </div>
                </div>
              )}
              {selectedMatter.caseStatus === "completed" && (
                <div className="glass-card rounded-2xl p-5 border-l-4 border-l-success bg-success/5">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center text-2xl shrink-0">✓</div>
                    <div className="flex-1">
                      <p className="text-[11px] uppercase font-bold tracking-wider text-success">Case Completed</p>
                      <h3 className="text-xl font-serif font-semibold mt-0.5">Result: {(selectedMatter.result || "").toUpperCase()}</h3>
                      {selectedMatter.resultDate && (
                        <p className="text-xs text-muted-foreground mt-1">Concluded on {new Date(selectedMatter.resultDate).toLocaleDateString("en-KE",{day:"numeric",month:"long",year:"numeric"})}</p>
                      )}
                      {selectedMatter.resultNote && (
                        <p className="text-sm mt-3 p-3 bg-success/10 rounded-lg border border-success/20">{selectedMatter.resultNote}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass-card rounded-2xl p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2 text-sm"><Briefcase className="w-4 h-4 text-primary" /> Case Details</h3>
                {[["File Reference", selectedMatter.fileNo || "—"], ["Matter Type", selectedMatter.type], ["Client", selectedMatter.client], ["Status", selectedMatter.status], ["Opened", fmtDate(selectedMatter.openedDate || "")], ["Assigned To", selectedMatter.assignedTo || "Unassigned"]].map(([k,v]) => (
                  <div key={k} className="flex justify-between py-2.5 border-b border-border/30 last:border-0 text-sm">
                    <span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span>
                  </div>
                ))}
              </div>
              <div className="glass-card rounded-2xl p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2 text-sm"><Building2 className="w-4 h-4 text-primary" /> Your Legal Team</h3>
                <div className="flex items-center gap-4">
                  <ShieldLogo size={48} />
                  <div>
                    <p className="font-serif font-semibold">Omuyoma &amp; Company Advocates</p>
                    <p className="text-xs text-muted-foreground mt-1">Summit House, 4th Floor, Room 410, Nairobi</p>
                    <div className="flex items-center gap-4 mt-2">
                      <a href="tel:0741159158" className="flex items-center gap-1.5 text-xs text-primary hover:underline"><Phone className="w-3 h-3" /> 0741 159 158</a>
                      <a href="mailto:omuyomaadvocates@gmail.com" className="flex items-center gap-1.5 text-xs text-primary hover:underline"><Mail className="w-3 h-3" /> Email</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </div>
          )}

          {tab === "docs" && (
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border/50">
                <h3 className="font-semibold text-sm">Case Documents ({matterDocs.length})</h3>
              </div>
              {matterDocs.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground"><FileText className="w-8 h-8 mx-auto mb-3 opacity-40" /><p className="text-sm">No documents shared yet.</p></div>
              ) : (
                <div className="divide-y divide-border/30">
                  {matterDocs.map(d => (
                    <div key={d.id} className="flex items-center justify-between p-4 hover:bg-secondary/20">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><FileText className="w-4 h-4 text-primary" /></div>
                        <div>
                          <p className="text-sm font-medium">{d.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Uploaded {fmtDate(d.date || "")} · {d.uploadedBy}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleDownload(d)} className="flex items-center gap-1.5 text-xs text-primary hover:underline px-2 py-1"><Eye className="w-3.5 h-3.5" /> View</button>
                        <button onClick={() => handleDownload(d)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1"><Download className="w-3.5 h-3.5" /> Download</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "availability" && (
            <div className="space-y-5">
              <div className="glass-card rounded-2xl p-5 border-l-4 border-l-primary bg-primary/5">
                <p className="text-sm text-muted-foreground">
                  Below are times your assigned lawyer is already booked. Anything not listed is likely open —
                  message us on the <button onClick={() => setTab("messages")} className="text-primary hover:underline font-semibold">Messages</button> tab to confirm and book a slot.
                </p>
              </div>
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border/50">
                  <h3 className="font-semibold text-sm">Busy Times</h3>
                </div>
                {availabilityLoading ? (
                  <div className="p-10 text-center text-muted-foreground text-sm">Loading…</div>
                ) : availabilitySlots.length === 0 ? (
                  <div className="p-10 text-center text-muted-foreground">
                    <Clock className="w-8 h-8 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">No upcoming busy times on record — your lawyer looks open. Message us to arrange a time.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/30">
                    {availabilitySlots.map((s, i) => (
                      <div key={i} className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center"><Clock className="w-4 h-4 text-warning" /></div>
                          <p className="text-sm font-medium">{fmtDate(s.date)}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{s.time ? s.time : "All day"}{s.endTime ? ` – ${s.endTime}` : ""}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "messages" && (
            <div className="glass-card rounded-2xl flex flex-col" style={{ minHeight: 520 }}>
              <div className="px-5 py-4 border-b border-border/50">
                <h3 className="font-semibold text-sm">Secure Messages</h3>
                <p className="text-xs text-muted-foreground">Direct communication with Omuyoma &amp; Co.</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[360px] max-h-[400px]">
                {messages.length === 0 && <div className="text-center py-12"><MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-30" /><p className="text-sm text-muted-foreground">No messages yet.</p></div>}
                {messages.map(m => (
                  <div key={m.id} className={cn("flex", m.direction === "sent" ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[75%] rounded-2xl px-4 py-2.5 text-sm", m.direction === "sent" ? "bg-primary text-white rounded-br-sm" : "glass-card rounded-bl-sm")}>
                      <p className="font-semibold text-[10px] mb-1 opacity-70">{m.from}</p>
                      <p>{m.content}</p>
                      <p className="text-[10px] opacity-60 mt-1 text-right">{new Date(m.timestamp).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <div className="p-4 border-t border-border/50 flex gap-2">
                <Input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Type a message…" className="flex-1" />
                <Button onClick={send} className="btn-royal px-4"><Send className="w-4 h-4" /></Button>
              </div>
            </div>
          )}

          {tab === "payments" && (
            <div className="space-y-5">
              {unpaidTotal > 0 && (
                <div className="glass-card rounded-2xl p-5 border border-warning/30 bg-warning/5">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-mono mb-1">Total Outstanding</p>
                      <p className="text-3xl font-bold text-warning">{kes(unpaidTotal)}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white"
                        style={{ background: "linear-gradient(135deg,#00A651,#007A3D)", boxShadow: "0 4px 16px rgba(0,166,81,0.3)" }}
                        onClick={() => alert("M-Pesa Paybill — contact firm for reference")}>
                        📱 Pay via M-Pesa
                      </button>
                      <button className="flex items-center gap-2 px-6 py-3 rounded-xl btn-glass font-semibold text-sm"><CreditCard className="w-4 h-4" /> Bank Transfer</button>
                    </div>
                  </div>
                  <div className="mt-4 p-3 rounded-lg bg-secondary/30 text-xs text-muted-foreground">
                    <p><strong>Tel:</strong> 0741 159 158 · <strong>Email:</strong> omuyomaadvocates@gmail.com</p>
                  </div>
                </div>
              )}
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border/50"><h3 className="font-semibold text-sm">Invoices &amp; Fee Notes</h3></div>
                {matterInvoices.length === 0 ? (
                  <div className="p-10 text-center text-muted-foreground"><CreditCard className="w-8 h-8 mx-auto mb-3 opacity-40" /><p className="text-sm">No invoices issued yet.</p></div>
                ) : (
                  <div className="divide-y divide-border/30">
                    {matterInvoices.map(inv => (
                      <div key={inv.id} className="flex items-center justify-between p-4">
                        <div>
                          <p className="text-sm font-semibold font-mono text-primary">{inv.invoiceNo}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Issued {fmtDate(inv.date)} · Due {fmtDate(inv.dueDate)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{kes(inv.totalAmount)}</p>
                          <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold", inv.status === "paid" ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>{inv.status.toUpperCase()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
