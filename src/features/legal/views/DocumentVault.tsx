import { useState } from "react";
import { Plus, Trash2, Download, FolderOpen, Folder, ChevronRight, ChevronDown, File as FileIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { VaultDocument, Matter } from "../types";

const FILE_ICON: Record<string, string> = {
  pdf: "text-red-400", doc: "text-blue-400", docx: "text-blue-400",
  xlsx: "text-green-400", xls: "text-green-400",
  jpg: "text-yellow-400", jpeg: "text-yellow-400", png: "text-yellow-400",
};
const extOf = (name: string) => (name.split(".").pop() || "").toLowerCase();

function DocRow({ d, onDownload, onDelete }: {
  d: VaultDocument;
  onDownload: (d: VaultDocument) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-5 py-3 items-center border-b border-border/40 hover:bg-secondary/20 text-sm">
      <FileIcon className={`w-4 h-4 ${FILE_ICON[extOf(d.name)] || "text-muted-foreground"}`} />
      <span className="font-medium truncate">{d.name}</span>
      <span className="text-muted-foreground text-xs truncate">{d.uploadedBy}</span>
      <span className="text-muted-foreground text-xs">{d.date}</span>
      <div className="flex gap-1">
        <button onClick={() => onDownload(d)} className="p-1 hover:text-brand-gold text-muted-foreground" title="Download"><Download className="w-3.5 h-3.5" /></button>
        <button onClick={() => onDelete(d.id)} className="p-1 hover:text-destructive text-muted-foreground" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

interface Props {
  documents: VaultDocument[];
  matters: Matter[];
  onAdd: (d: Omit<VaultDocument, "id">) => void;
  onDelete: (id: string) => void;
}

export function DocumentVault({ documents, matters, onAdd, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [matterId, setMatterId] = useState("general");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const searching = search.trim().length > 0;
  const q = search.toLowerCase();

  const filtered = documents.filter(d =>
    d.name.toLowerCase().includes(q) ||
    (d.matter || "").toLowerCase().includes(q) ||
    (d.folder || "").toLowerCase().includes(q)
  );

  type Group = { id: string; name: string; folders: string[]; docs: VaultDocument[] };
  const groups: Record<string, Group> = {};
  for (const d of filtered) {
    const key = d.matterId || "general";
    if (!groups[key]) {
      const m = matters.find(mm => mm.id === d.matterId);
      groups[key] = {
        id: key,
        name: m ? (m.fileNo ? `${m.fileNo} — ${m.title}` : m.title) : "General",
        folders: m?.folders || [],
        docs: [],
      };
    }
    groups[key].docs.push(d);
  }
  const groupList = Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));

  const submit = () => {
    if (!file) return;
    onAdd({
      file,
      name: file.name,
      matter: "",
      matterId: matterId === "general" ? undefined : matterId,
      date: new Date().toISOString().slice(0, 10),
    });
    setFile(null);
    setMatterId("general");
    setOpen(false);
  };

  const download = async (d: VaultDocument) => {
    if (!d.storagePath) { alert("No file is attached to this document yet."); return; }
    const { data, error } = await supabase.storage
      .from("matter-documents")
      .createSignedUrl(d.storagePath, 3600);
    if (error || !data?.signedUrl) { alert("Could not open the file. Please try again."); return; }
    window.open(data.signedUrl, "_blank");
  };

  const toggle = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }));

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
        <Input placeholder="Search by name, matter or folder..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-md" />
      </div>

      {groupList.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center text-sm text-muted-foreground">
          {searching ? "No documents match your search." : "No documents yet. Add your first document to the vault."}
        </div>
      ) : groupList.map(g => {
        const isOpen = searching || !!expanded[g.id];
        const buckets: Record<string, VaultDocument[]> = {};
        for (const f of g.folders) buckets[f] = [];
        const uncat: VaultDocument[] = [];
        for (const d of g.docs) {
          const f = d.folder || "";
          if (f && g.folders.includes(f)) buckets[f].push(d);
          else uncat.push(d);
        }
        return (
          <div key={g.id} className="mb-4 glass-card rounded-2xl overflow-hidden">
            <button
              onClick={() => toggle(g.id)}
              className="w-full flex items-center gap-2 px-5 py-3.5 hover:bg-secondary/20 transition text-left"
            >
              {isOpen
                ? <ChevronDown className="w-4 h-4 text-brand-gold shrink-0" />
                : <ChevronRight className="w-4 h-4 text-brand-gold shrink-0" />}
              <FolderOpen className="w-4 h-4 text-brand-gold shrink-0" />
              <span className="text-sm font-semibold text-brand-gold flex-1 truncate">{g.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {g.docs.length} {g.docs.length === 1 ? "file" : "files"}
              </span>
            </button>

            {isOpen && (
              <div className="border-t border-border">
                {g.folders.map(f => (
                  <div key={f}>
                    <div className="flex items-center gap-2 px-5 py-2 bg-secondary/15 border-b border-border/40">
                      <Folder className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold text-muted-foreground">{f}</span>
                      <span className="text-[10px] text-muted-foreground">({buckets[f].length})</span>
                    </div>
                    {buckets[f].length === 0
                      ? <div className="px-5 py-3 text-xs text-muted-foreground/60 italic border-b border-border/40">No documents in this folder.</div>
                      : buckets[f].map(d => <DocRow key={d.id} d={d} onDownload={download} onDelete={onDelete} />)}
                  </div>
                ))}
                {uncat.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 px-5 py-2 bg-secondary/15 border-b border-border/40">
                      <Folder className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold text-muted-foreground">Uncategorised</span>
                      <span className="text-[10px] text-muted-foreground">({uncat.length})</span>
                    </div>
                    {uncat.map(d => <DocRow key={d.id} d={d} onDownload={download} onDelete={onDelete} />)}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setFile(null); setMatterId("general"); } }}>
        <DialogContent className="glass-card border-border">
          <DialogHeader><DialogTitle className="font-serif text-2xl">Add Document</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Choose File</Label>
              <input
                type="file"
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-brand-gold file:text-primary-foreground file:font-semibold file:cursor-pointer cursor-pointer"
              />
              {file && <p className="text-xs text-muted-foreground">Selected: {file.name} ({Math.max(1, Math.round(file.size / 1024))} KB)</p>}
            </div>
            <div className="space-y-2">
              <Label>Matter / Case</Label>
              <Select value={matterId} onValueChange={setMatterId}>
                <SelectTrigger><SelectValue placeholder="Link to a case..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General (no specific case)</SelectItem>
                  {matters.map(m => <SelectItem key={m.id} value={m.id}>{m.fileNo ? `${m.fileNo} — ${m.title}` : m.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={!file} className="bg-brand-gold text-primary-foreground">Add to Vault</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
