import { useState } from "react";
import { Briefcase, Upload, Trash2, FileText, Link, ArrowLeft, Plus } from "lucide-react";
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

const genId = () => Math.random().toString(36).slice(2, 9);

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
        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-sm text-blue-400 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to matters
        </button>
        <div className="glass-card p-6 rounded-xl space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-400 font-mono">{selected.fileNo}</p>
              <h2 className="text-xl font-bold text-white">{selected.title}</h2>
              <p className="text-gray-400 text-sm">{selected.client}</p>
