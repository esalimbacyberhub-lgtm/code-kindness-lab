import { useState } from "react";
import { Plus, Trash2, Mail, Phone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { StaffMember, Role } from "../types";

const ROLE_COLOR: Record<Role, string> = {
  partner: "bg-brand-gold/15 text-brand-gold border-brand-gold/30",
  associate: "bg-primary/15 text-primary border-primary/30",
  paralegal: "bg-info/15 text-info border-info/30",
  accountant: "bg-success/15 text-success border-success/30",
  client: "bg-muted/40 text-muted-foreground border-border",
};
const ROLE_LABEL: Record<Role, string> = { partner: "Partner", associate: "Associate", paralegal: "Paralegal", accountant: "Accounts", client: "Client" };

const PRACTICES = ["Litigation", "Conveyancing", "Corporate & Commercial", "Family Law", "Criminal", "Intellectual Property", "Probate & Administration"];

interface Props { staff: StaffMember[]; currentRole: Role; onAdd: (m: Omit<StaffMember,"id">) => void; onRemove: (id: string) => void; }

export function FirmDirectory({ staff, currentRole, onAdd, onRemove }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", role: "associate" as Role, email: "", phone: "", practice: "Litigation", initials: "" });

  const grouped = (["partner","associate","paralegal"] as Role[]).map(r => ({ role: r, members: staff.filter(m => m.role === r) }));

  const submit = () => {
    if (!form.name || !form.email) return;
    const initials = form.initials || form.name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase();
    onAdd({ ...form, initials });
    setForm({ name:"", role:"associate", email:"", phone:"", practice:"Litigation", initials:"" });
    setOpen(false);
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-brand-gold/80 font-mono mb-2">Our Team</p>
          <h2 className="text-4xl font-serif">Firm <span className="text-gradient-gold">Directory</span></h2>
        </div>
        {currentRole === "partner" && (
          <Button onClick={() => setOpen(true)} className="bg-brand-gold text-primary-foreground hover:bg-brand-gold/90"><Plus className="w-4 h-4 mr-2" /> Add Member</Button>
        )}
      </div>
      <div className="gold-divider mb-6" />

      {staff.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center text-sm text-muted-foreground">
          No staff added yet. Add your first team member.
        </div>
      ) : grouped.map(({ role, members }) => members.length > 0 && (
        <div key={role} className="mb-8">
          <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4 font-mono">{ROLE_LABEL[role]}s</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map(m => (
              <div key={m.id} className="glass-card glass-card-hover rounded-2xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-gold to-brand-burgundy flex items-center justify-center font-serif text-primary-foreground font-bold">
                      {m.initials}
                    </div>
                    <div>
                      <p className="font-serif font-semibold">{m.name}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${ROLE_COLOR[m.role]}`}>{ROLE_LABEL[m.role]}</span>
                    </div>
                  </div>
                  {currentRole === "partner" && (
                    <button onClick={() => onRemove(m.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2"><Mail className="w-3 h-3" /><span className="truncate">{m.email}</span></div>
                  <div className="flex items-center gap-2"><Phone className="w-3 h-3" /><span>{m.phone}</span></div>
                  <div className="flex items-center gap-2"><User className="w-3 h-3" /><span>{m.practice}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass-card border-border">
          <DialogHeader><DialogTitle className="font-serif text-2xl">Add Team Member</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Full Name</Label><Input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Amukhono Omuyoma" /></div>
            <div className="space-y-2"><Label>Initials (optional)</Label><Input value={form.initials} onChange={e=>setForm(f=>({...f,initials:e.target.value}))} placeholder="e.g. AO" maxLength={3} /></div>
            <div className="space-y-2"><Label>Role</Label>
              <Select value={form.role} onValueChange={v=>setForm(f=>({...f,role:v as Role}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="partner">Partner</SelectItem><SelectItem value="associate">Associate</SelectItem><SelectItem value="paralegal">Paralegal</SelectItem></SelectContent>
              </Select></div>
            <div className="space-y-2"><Label>Practice Area</Label>
              <Select value={form.practice} onValueChange={v=>setForm(f=>({...f,practice:v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRACTICES.map(p=><SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="email@omuyomaadvocates.co.ke" /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="+254 7XX XXX XXX" /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} className="bg-brand-gold text-primary-foreground">Add Member</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
