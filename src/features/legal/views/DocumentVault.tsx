import { useState } from "react";
import { Plus, Trash2, Download, FolderOpen, FileText, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { VaultDocument, Matter } from "../types";

const FILE_ICON: Record<string, string> = { pdf: "text-red-400", doc: "text-blue-400", docx: "text-blue-400", xlsx: "text-green-400", jpg: "text-yellow-400", png: "text-yellow-400" };

interface Props { documents: VaultDocument[]; matters: Matter[]; onAdd: (d: Omit<VaultDocument,"id">) => void; onDelete: (id:string) => void; }

export function DocumentVault({ documents, matters, onAdd, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", matter: "", fileType: "pdf", date: new Date().toISOString().slice(0,10), uploadedBy: "Omuyoma & Co." });

  const filtered = documents.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.matter.toLowerCase().includes(search.toLowerCase())
  );

  const byMatter = filtered.reduce<Record<string, VaultDocument[]>>((acc, d) => {
    const key = d.matter || "General";
    acc[key] = [...(acc[key] || []), d];
    return acc;
  }, {});

  const submit = () => {
    if (!form.name) return;
    onAdd(form);
    setForm({ name: "", matter: "", fileType: "pdf", date: new Date().toISOString().slice(0,10), uploadedBy: "Omuyoma & Co." });
    setOpen(false);
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-brand-gold/80 font-mono mb-2">Secure Storage</p>
          <h2 className="text-4xl font-serif">Document <span className="text-gradient-gold">Vault</span></h2>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-brand-gold text-primary-foreground hover:bg-brand-gold/90"><Plus className="w-4 h-4 mr-2" /> Add Document</Button>
      </div>
      <div className="gold-divider mb-6" />

      <div className="mb-4">
        <Input placeholder="Search by name or matter..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-md" />
      </div>

      {documents.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center text-sm text-muted-foreground">
          No documents yet. Add your first document to the vault.
        </div>
      ) : Object.entries(byMatter).map(([matter, docs]) => (
        <div key={matter} className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <FolderOpen className="w-4 h-4 text-brand-gold" />
            <h3 className="text-sm font-semibold text-brand-gold">{matter}</h3>
            <span className="text-xs text-muted-foreground">({docs.length})</span>
          </div>
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-5 py-3 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
              <span>Type</span><span>Document Name</span><span>Uploaded By</span><span>Date</span><span></span>
            </div>
            {docs.map(d => (
              <div key={d.id} className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-5 py-3 items-center border-b border-border/40 hover:bg-secondary/20 text-sm">
                <File className={`w-4 h-4 ${FILE_ICON[d.fileType] || "text-muted-foreground"}`} />
                <span className="font-medium truncate">{d.name}</span>
                <span className="text-muted-foreground text-xs">{d.uploadedBy}</span>
                <span className="text-muted-foreground text-xs">{d.date}</span>
                <div className="flex gap-1">
                  <button className="p-1 hover:text-brand-gold text-muted-foreground"><Download className="w-3.5 h-3.5" /></button>
                  <button onClick={() => onDelete(d.id)} className="p-1 hover:text-destructive text-muted-foreground"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass-card border-border">
          <DialogHeader><DialogTitle className="font-serif text-2xl">Add Document</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Document Name</Label>
              <Input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Plaint — Kamau v Njeri.pdf" /></div>
            <div className="space-y-2"><Label>File Type</Label>
              <Select value={form.fileType} onValueChange={v => setForm(f=>({...f,fileType:v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["pdf","docx","doc","xlsx","jpg","png"].map(t=><SelectItem key={t} value={t}>.{t.toUpperCase()}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="space-y-2"><Label>Matter</Label>
              <Select value={form.matter} onValueChange={v => setForm(f=>({...f,matter:v}))}>
                <SelectTrigger><SelectValue placeholder="Link to matter..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="General">General</SelectItem>
                  {matters.map(m=><SelectItem key={m.id} value={m.title}>{m.title}</SelectItem>)}
                </SelectContent>
              </Select></div>
            <div className="space-y-2"><Label>Uploaded By</Label>
              <Input value={form.uploadedBy} onChange={e => setForm(f=>({...f,uploadedBy:e.target.value}))} /></div>
            <div className="space-y-2"><Label>Date</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f=>({...f,date:e.target.value}))} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} className="bg-brand-gold text-primary-foreground">Add to Vault</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
