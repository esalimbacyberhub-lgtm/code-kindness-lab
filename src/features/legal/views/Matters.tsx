import { useState } from "react";
import { Briefcase, Upload, Trash2, FileText, Link as LinkIcon, ArrowLeft } from "lucide-react";
import type { Matter, StaffMember, Role, VaultDocument } from "../types";

const TYPE_TONE: Record<Matter["type"], string> = {
  "Civil Litigation": "bg-accent/15 text-accent",
  "Commercial": "bg-primary/15 text-primary",
  "Family Law": "bg-warning/15 text-warning",
  "Criminal": "bg-destructive/15 text-destructive",
  "Conveyancing": "bg-success/15 text-success",
  "Intellectual Property": "bg-primary/15 text-primary",
  "Probate & Administration": "bg-muted text-foreground",
};

interface Props {
  matters: Matter[]; staff: StaffMember[]; role: Role;
  onAssign: (matterId: string, staffName: string) => void;
  documents: VaultDocument[]; onAddDocument: (d: Omit<VaultDocument, "id">) => void;
  onDeleteDocument: (id: string) => void;
}

export const Matters = ({ matters, staff, role, onAssign, documents, onAddDocument, onDeleteDocument }: Props) => {
  const [selected, setSelected] = useState<Matter | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>, matter: Matter) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onAddDocument({
      name: file.name, matter: matter.id, fileType: file.type || "application/octet-stream",
      date: new Date().toISOString().split("T")[0], uploadedBy: role,
    });
    e.target.value = "";
  };

  const handleCopyLink = (matter: Matter) => {
    const link = `${window.location.origin}/client-portal?matter=${matter.id}&token=${btoa(matter.id + Date.now())}`;
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  if (selected) {
    const matterDocs = documents.filter(d => d.matter === selected.id);
    return (
      <div className="space-y-6">
        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-sm text-primary hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to matters
        </button>
        <div className="glass-card p-6 rounded-xl space-y-4">
          <div className="flex justify-between items-start gap-4 flex-wrap">
            <div>
              <p className="text-xs text-muted-foreground font-mono">{selected.fileNo}</p>
              <h2 className="text-xl font-bold">{selected.title}</h2>
              <p className="text-muted-foreground text-sm">{selected.client}</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded ${TYPE_TONE[selected.type] ?? "bg-muted"}`}>{selected.type}</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm text-muted-foreground">Assign to:</label>
            <select
              value={selected.assignedTo ?? ""}
              onChange={(e) => { onAssign(selected.id, e.target.value); setSelected({ ...selected, assignedTo: e.target.value }); }}
              className="bg-background border border-border rounded px-2 py-1 text-sm"
            >
              <option value="">Unassigned</option>
              {staff.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
            <button onClick={() => handleCopyLink(selected)} className="ml-auto flex items-center gap-2 text-sm px-3 py-1.5 rounded bg-primary/15 text-primary hover:bg-primary/25">
              <LinkIcon className="w-4 h-4" /> {linkCopied ? "Copied!" : "Copy client link"}
            </button>
          </div>
        </div>

        <div className="glass-card p-6 rounded-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Documents</h3>
            <label className="flex items-center gap-2 text-sm px-3 py-1.5 rounded bg-primary text-primary-foreground hover:opacity-90 cursor-pointer">
              <Upload className="w-4 h-4" /> Upload
              <input type="file" className="hidden" onChange={(e) => handleUpload(e, selected)} />
            </label>
          </div>
          {matterDocs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents yet.</p>
          ) : (
            <ul className="space-y-2">
              {matterDocs.map(d => (
                <li key={d.id} className="flex items-center justify-between p-3 rounded bg-muted/30">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm truncate">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{d.date} · {d.uploadedBy}</p>
                    </div>
                  </div>
                  <button onClick={() => onDeleteDocument(d.id)} className="text-destructive hover:opacity-80">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold flex items-center gap-2"><Briefcase className="w-6 h-6 text-primary" /> Matters</h2>
      {matters.length === 0 ? (
        <div className="glass-card p-10 rounded-xl text-center text-muted-foreground">No matters yet.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {matters.map(m => (
            <button key={m.id} onClick={() => setSelected(m)} className="glass-card p-4 rounded-xl text-left hover:border-primary/50 transition">
              <p className="text-xs text-muted-foreground font-mono">{m.fileNo}</p>
              <h3 className="font-semibold mt-1">{m.title}</h3>
              <p className="text-sm text-muted-foreground">{m.client}</p>
              <span className={`inline-block mt-2 text-xs px-2 py-1 rounded ${TYPE_TONE[m.type] ?? "bg-muted"}`}>{m.type}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const MatterHub = Matters;
