import { useState, useRef, useEffect } from "react";
import { Send, Lock, FileText, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Message, Matter, Role } from "../types";
import { cn } from "@/lib/utils";

interface Props { messages: Message[]; matters: Matter[]; role: Role; onSend: (content: string, from: string, dir: Message["direction"]) => void; }

export function ClientPortal({ messages, matters, role, onSend }: Props) {
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const activeMatter = matters.find(m => m.status === "active");

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = () => {
    if (!text.trim()) return;
    const isClient = role === "client";
    onSend(text.trim(), isClient ? "Client" : "Omuyoma & Co.", isClient ? "sent" : "received");
    setText("");
  };

  if (role === "associate" || role === "paralegal") {
    return (
      <div className="text-center py-24">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-destructive/15 flex items-center justify-center mb-4"><Lock className="w-7 h-7 text-destructive" /></div>
        <h2 className="text-2xl font-serif mb-2">Access Restricted</h2>
        <p className="text-muted-foreground">The Client Portal is accessible to Partners and Clients only.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-brand-gold/80 font-mono mb-2">Secure Channel</p>
          <h2 className="text-4xl font-serif">Client <span className="text-gradient-gold">Portal</span></h2>
        </div>
        <span className="flex items-center gap-2 text-xs text-success bg-success/10 border border-success/30 px-3 py-1.5 rounded-full"><Lock className="w-3 h-3" /> End-to-end encrypted</span>
      </div>
      <div className="gold-divider mb-6" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Messaging */}
        <div className="lg:col-span-2 glass-card rounded-2xl flex flex-col" style={{minHeight: 480}}>
          <div className="p-4 border-b border-border/50">
            <h3 className="font-semibold text-sm">Secure Messages</h3>
            <p className="text-xs text-muted-foreground">Direct communication with the firm</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No messages yet. Start a conversation.</p>}
            {messages.map(m => (
              <div key={m.id} className={cn("flex", m.direction === "sent" ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[75%] rounded-2xl px-4 py-2.5 text-sm", m.direction === "sent" ? "bg-brand-gold text-primary-foreground rounded-br-sm" : "glass-card rounded-bl-sm")}>
                  <p className="font-medium text-[10px] mb-1 opacity-70">{m.from}</p>
                  <p>{m.content}</p>
                  <p className="text-[10px] opacity-60 mt-1 text-right">{new Date(m.timestamp).toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"})}</p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <div className="p-4 border-t border-border/50 flex gap-2">
            <Input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Type a message..." className="flex-1" />
            <Button onClick={send} className="bg-brand-gold text-primary-foreground hover:bg-brand-gold/90"><Send className="w-4 h-4" /></Button>
          </div>
        </div>

        {/* Active matters */}
        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><Briefcase className="w-4 h-4 text-brand-gold" /> Active Matters</h3>
            {matters.filter(m=>m.status==="active").length === 0
              ? <p className="text-xs text-muted-foreground text-center py-4">No active matters.</p>
              : matters.filter(m=>m.status==="active").map(m => (
                <div key={m.id} className="p-3 rounded-lg bg-secondary/30 mb-2">
                  <p className="text-sm font-medium">{m.title}</p>
                  <p className="text-xs text-muted-foreground">{m.client} · {m.type}</p>
                  <span className="text-[10px] text-success bg-success/10 px-2 py-0.5 rounded-full">Active</span>
                </div>
              ))
            }
          </div>
          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-brand-gold" /> Shared Documents</h3>
            <p className="text-xs text-muted-foreground text-center py-4">Documents shared by the firm will appear here.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
