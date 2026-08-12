import { useState, useEffect } from "react";
import { CaseStatusDialog } from "../components/CaseStatusDialog";
import {
  Briefcase, Upload, Trash2, FileText, Link as LinkIcon, Download,
  ArrowLeft, FolderOpen, Folder, Plus, Edit3, Users, Receipt,
  ClipboardList, ChevronRight, Search, Filter, Eye,
} from "lucide-react";
import type { Matter, StaffMember, Role, VaultDocument } from "../types";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

// ── Types ─────────────────────────────────────────────────────────────────────
interface SubfolderStore {
  [matterId: string]: {
    folders:    string[];
    docFolders: { [docId: string]: string };
  };
}

// ── Constants ────────────────────────────────────────────────────────────────
const TYPE_TONE: Record<string, string> = {
  "Civil Litigation":        "bg-primary/15 text-primary border-primary/30",
  "Commercial":              "bg-info/15 text-info border-info/30",
  "Family Law":              "bg-warning/15 text-warning border-warning/30",
  "Criminal":                "bg-destructive/15 text-destructive border-destructive/30",
  "Conveyancing":            "bg-success/15 text-success border-success/30",
  "Intellectual Property":   "bg-accent/15 text-accent border-accent/30",
  "Probate & Administration":"bg-muted/60 text-foreground border-border",
};

const TYPE_BORDER: Record<string, string> = {
  "Civil Litigation":        "border-l-primary",
  "Commercial":              "border-l-info",
  "Family Law":              "border-l-warning",
  "Criminal":                "border-l-destructive",
  "Conveyancing":            "border-l-success",
  "Intellectual Property":   "border-l-accent",
  "Probate & Administration":"border-l-muted-foreground",
};

// Standard document categories every matter starts with
const DEFAULT_FOLDERS = ["Pleadings", "Correspondence", "Court Orders", "Financial Documents"];

// Matter type display order (keeps type folders in a consistent order)
const TYPE_ORDER = Object.keys(TYPE_TONE);

// Filing year — derived from the file number (…/2026), falls back to opened date
function getMatterYear(m: Matter): string {
  const fromFileNo = m.fileNo?.match(/\/(\d{4})$/)?.[1];
  if (fromFileNo) return fromFileNo;
  if (m.openedDate) return m.openedDate.slice(0, 4);
  return "Unfiled";
}

// Group a list of matters by type, in standard practice-area order
function groupByType(list: Matter[]): [string, Matter[]][] {
  const map = new Map<string, Matter[]>();
  list.forEach(m => {
    const t = m.type || "Other";
    if (!map.has(t)) map.set(t, []);
    map.get(t)!.push(m);
  });
  return Array.from(map.entries()).sort((a, b) => {
    const ia = TYPE_ORDER.indexOf(a[0]);
    const ib = TYPE_ORDER.indexOf(b[0]);
    if (ia === -1 && ib === -1) return a[0].localeCompare(b[0]);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

// Document type → color class from index.css
function docColorClass(name: string, folder: string): string {
  const n = name.toLowerCase();
  const f = folder.toLowerCase();
  if (f === "financial documents" || n.includes("invoice") || n.includes("fee note") || n.includes("receipt"))
    return "doc-financial";
  if (f === "court orders" || f === "pleadings" && (n.includes("docket") || n.includes("order")))
    return "doc-docket";
  if (f === "pleadings")
    return "doc-pleading";
  if (f === "correspondence")
    return "doc-correspondence";
  return "";
}

function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (["pdf"].includes(ext || ""))         return "📄";
  if (["doc","docx"].includes(ext || ""))  return "📝";
  if (["xls","xlsx"].includes(ext || ""))  return "📊";
  if (["jpg","jpeg","png"].includes(ext || "")) return "🖼️";
  return "📎";
}

// ── Props ────────────────────────────────────────────────────────────────────
interface Props {
  onNewMatter?:     () => void;
  matters:          Matter[];
  staff:            StaffMember[];
  role:             Role;
  onAssign:         (matterId: string, staffName: string) => void;
  documents:        VaultDocument[];
  onAddDocument:    (d: Omit<VaultDocument, "id">) => void;
  onDeleteDocument: (id: string) => void;
  onUpdateMatter?: (id: string, updates: Partial<Matter>) => void;
  onUpdateDocument?: (id: string, updates: any) => void;
  onDeleteMatter?: (id: string) => void;
}

// ════════════════════════════════════════════════════════════════════════════
export const Matters = ({
  onNewMatter, matters, staff, role, onAssign,
  documents, onAddDocument, onDeleteDocument, onUpdateMatter, onUpdateDocument, onDeleteMatter,
}: Props) => {
  const [selected,    setSelected]    = useState<Matter | null>(null);
  const [statusEdit,  setStatusEdit]  = useState<Matter | null>(null);
  const [linkCopied,  setLinkCopied]  = useState(false);
  const [activeFolder,setActiveFolder]= useState<string>("All");
  const [newFolderMode,setNewFolderMode] = useState(false);
  const [newFolderName,setNewFolderName] = useState("");
  const [search,      setSearch]      = useState("");
  const [browseYear,  setBrowseYear]  = useState<string | null>(null);
  const [browseType,  setBrowseType]  = useState<string | null>(null);
  const [preview,        setPreview]        = useState<{ doc: any; url: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  // Reset folder view when switching matters
  useEffect(() => { setActiveFolder("All"); }, [selected]);

  // ── Subfolder helpers ──────────────────────────────────────────────────────
  const getMatterFolders = (matterId: string): string[] =>
    matters.find(m => m.id === matterId)?.folders ?? [];

  const getDocFolder = (_matterId: string, docId: string): string =>
    documents.find(d => d.id === docId)?.folder || "Uncategorised";

  const setDocFolder = (_matterId: string, docId: string, folder: string) => {
    onUpdateDocument?.(docId, { folder });
  };

  const addFolder = (matterId: string, name: string) => {
    const clean = name.trim();
    if (!clean) return;
    const current = matters.find(m => m.id === matterId)?.folders ?? [];
    if (!current.includes(clean)) {
      onUpdateMatter?.(matterId, { folders: [...current, clean] });
    }
    setNewFolderName("");
    setNewFolderMode(false);
    setActiveFolder(clean);
  };

  const deleteFolder = (matterId: string, folder: string) => {
    if (!confirm(`Delete folder "${folder}"? Documents inside will move to Uncategorised.`)) return;
    const current = matters.find(m => m.id === matterId)?.folders ?? [];
    onUpdateMatter?.(matterId, { folders: current.filter(f => f !== folder) });
    documents
      .filter(d => d.matterId === matterId && d.folder === folder)
      .forEach(d => onUpdateDocument?.(d.id, { folder: "" }));
    setActiveFolder("All");
  };

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>, matter: Matter) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onAddDocument({
      file,
      name: file.name,
      matter: "",
      matterId: matter.id,
      folder: activeFolder === "All" ? "Uncategorised" : activeFolder,
      fileType: file.type || "application/octet-stream",
      date: new Date().toISOString().split("T")[0],
      uploadedBy: role,
    });
    e.target.value = "";
  };

  const handleDownload = async (doc: any) => {
    if (!doc.storagePath) { alert("No file is attached to this document yet."); return; }
    const { data, error } = await supabase.storage
      .from("matter-documents")
      .createSignedUrl(doc.storagePath, 3600);
    if (error || !data?.signedUrl) { alert("Could not open the file. Please try again."); return; }
    window.open(data.signedUrl, "_blank");
  };

  // Open an in-app preview (image/PDF) instead of forcing a download
  const handleView = async (doc: any) => {
    if (!doc.storagePath) { alert("No file is attached to this document yet."); return; }
    setPreviewLoading(true);
    const { data, error } = await supabase.storage
      .from("matter-documents")
      .createSignedUrl(doc.storagePath, 3600);
    setPreviewLoading(false);
    if (error || !data?.signedUrl) { alert("Could not open the file. Please try again."); return; }
    setPreview({ doc, url: data.signedUrl });
  };

  // ── Client secure link ────────────────────────────────────────────────────
  const handleCopyLink = (matter: Matter) => {
    const link = `${window.location.origin}/client-portal?matter=${matter.id}&token=${btoa(matter.id + Date.now())}`;
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  };

  // ── Generate invoice / fee note links ────────────────────────────────────
  const handleGenerateInvoice = (matter: Matter) => {
    // Navigate to Financials → pre-fill matter
    sessionStorage.setItem("omuyoma_prefill_invoice", JSON.stringify({
      client: matter.client, matter: matter.fileNo, matterTitle: matter.title,
      partyA: matter.partyA, partyB: matter.partyB,
    }));
    alert(`Go to Admin & Audit → Financials to raise an invoice for: ${matter.title || matter.client || "this matter"}`);
  };

  // ── Delete a matter (case file) entirely ──────────────────────────────────
  const handleDeleteMatter = (matter: Matter) => {
    if (!confirm(`Delete matter "${matter.title}" (${matter.fileNo})?\n\nThis permanently removes the case file and cannot be undone.`)) return;
    onDeleteMatter?.(matter.id);
    setSelected(null);
  };

  // ── Matter detail view ───────────────────────────────────────────────────
  if (selected) {
    const allMatterDocs = documents.filter(d => d.matterId === selected.id);
    const customFolders = getMatterFolders(selected.id);
    const folders        = [...DEFAULT_FOLDERS, ...customFolders.filter(f => !DEFAULT_FOLDERS.includes(f))];

    const filteredDocs = activeFolder === "All"
      ? allMatterDocs
      : activeFolder === "Uncategorised"
        ? allMatterDocs.filter(d => {
            const f = getDocFolder(selected.id, d.id);
            return f === "Uncategorised" || (!folders.includes(f) && f !== "");
          })
        : allMatterDocs.filter(d => getDocFolder(selected.id, d.id) === activeFolder);

    const searchedDocs = search.trim()
      ? filteredDocs.filter(d => d.name.toLowerCase().includes(search.toLowerCase()))
      : filteredDocs;

    // Count docs per folder
    const folderCount = (f: string) => {
      if (f === "All") return allMatterDocs.length;
      return allMatterDocs.filter(d => getDocFolder(selected.id, d.id) === f).length;
    };

    return (
      <div className="space-y-5">
      <CaseStatusDialog matter={statusEdit} open={!!statusEdit} onClose={() => setStatusEdit(null)} onSave={updates => statusEdit && onUpdateMatter && onUpdateMatter(statusEdit.id, updates)} />
        <Dialog open={!!preview} onOpenChange={o => !o && setPreview(null)}>
          <DialogContent className="glass-card border-border max-w-3xl">
            <DialogHeader>
              <DialogTitle className="font-serif text-lg truncate">{preview?.doc?.name}</DialogTitle>
            </DialogHeader>
            {preview && (
              /\.(jpe?g|png|gif|webp)$/i.test(preview.doc.name) ? (
                <img src={preview.url} alt={preview.doc.name} className="max-h-[75vh] w-full object-contain rounded-lg" />
              ) : /\.pdf$/i.test(preview.doc.name) ? (
                <iframe src={preview.url} className="w-full h-[75vh] rounded-lg border border-border" title={preview.doc.name} />
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <p className="text-sm mb-3">Preview isn't available for this file type.</p>
                  <a href={preview.url} target="_blank" rel="noreferrer" className="text-primary text-sm hover:underline">
                    Open in new tab instead →
                  </a>
                </div>
              )
            )}
          </DialogContent>
        </Dialog>
        {/* ── Back ── */}
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Matter Hub
        </button>

        {/* ── Case Header ── */}
        <div className={cn(
          "glass-card p-6 rounded-xl border-l-4",
          TYPE_BORDER[selected.type] ?? "border-l-primary",
        )}>
          <div className="flex justify-between items-start gap-4 flex-wrap mb-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                  {selected.fileNo ?? "No Ref"}
                </span>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded border",
                  TYPE_TONE[selected.type] ?? "bg-muted",
                )}>
                  {selected.type}
                </span>
              </div>
              <h2 className="text-xl font-bold mt-1">{selected.title}</h2>
              <p className="text-muted-foreground text-sm mt-0.5">{selected.client}</p>

              {/* Parties */}
              {(selected.partyA || selected.partyB) && (
                <div className="mt-3 px-3 py-2 rounded-lg bg-primary/5 border border-primary/15 inline-block">
                  <p className="text-sm font-serif">
                    <span className="font-semibold">{selected.partyA || "—"}</span>
                    <span className="text-primary font-bold mx-2">v.</span>
                    <span className="font-semibold">{selected.partyB || "—"}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Status badge */}
            <div className={cn(
              "text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wider border",
              selected.status === "active"  ? "bg-success/10 text-success border-success/30" :
              selected.status === "closed"  ? "bg-muted/40 text-muted-foreground border-border" :
              "bg-warning/10 text-warning border-warning/30",
            )}>
              {selected.status ?? "active"}
            </div>
          </div>

          {/* ── Action bar ── */}
          <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-border/40">
            {/* Staff assignment */}
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <select
                value={selected.assignedTo ?? ""}
                onChange={e => {
                  onAssign(selected.id, e.target.value);
                  setSelected({ ...selected, assignedTo: e.target.value });
                }}
                className="bg-background border border-border rounded px-2 py-1 text-sm"
              >
                <option value="">Unassigned</option>
                {staff.map(s => (
                  <option key={s.id} value={s.name}>{s.name} — {s.role}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 ml-auto flex-wrap">
              {/* Secure client link */}
              <button
                onClick={() => handleCopyLink(selected)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-all"
              >
                <LinkIcon className="w-3.5 h-3.5" />
                {linkCopied ? "Link Copied! ✓" : "Copy Client Link"}
              </button>

              {/* Generate Invoice */}
              <button
                onClick={() => handleGenerateInvoice(selected)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-info/10 text-info hover:bg-info/20 border border-info/20 transition-all"
              >
                <Receipt className="w-3.5 h-3.5" /> Generate Invoice
              </button>

              {/* Generate Fee Note */}
              <button
                onClick={() => {
                  sessionStorage.setItem("omuyoma_prefill_feenote", JSON.stringify({
                    client: selected.client, matterRef: selected.fileNo,
                    matterTitle: selected.title, partyA: selected.partyA, partyB: selected.partyB,
                  }));
                  alert(`Go to Admin & Audit → Financials → Fee Notes to raise a fee note for: ${selected.title || selected.client || "this matter"}`);
                }}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20 transition-all"
              >
                <ClipboardList className="w-3.5 h-3.5" /> Issue Fee Note
              </button>

              {/* Delete Matter */}
              {role !== "client" && onDeleteMatter && (
                <button
                  onClick={() => handleDeleteMatter(selected)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Matter
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Document Folder System ── */}
        <div className="glass-card rounded-xl overflow-hidden">
          {/* Folder tabs header */}
          <div className="border-b border-border/50 bg-secondary/20">
            <div className="flex items-center gap-0 overflow-x-auto custom-scroll px-3 pt-2">
              {/* All tab */}
              <button
                onClick={() => setActiveFolder("All")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-xs font-semibold whitespace-nowrap transition-all border-b-2",
                  activeFolder === "All"
                    ? "text-primary border-primary"
                    : "text-muted-foreground border-transparent hover:text-foreground",
                )}
              >
                <Folder className="w-3.5 h-3.5" />
                All
                <span className="bg-primary/15 text-primary px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                  {allMatterDocs.length}
                </span>
              </button>

              {/* Folder tabs */}
              {folders.map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFolder(f)}
                  className={cn(
                    "group flex items-center gap-1.5 px-3 py-2 text-xs font-semibold whitespace-nowrap transition-all border-b-2",
                    activeFolder === f
                      ? "text-primary border-primary"
                      : "text-muted-foreground border-transparent hover:text-foreground",
                  )}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  {f}
                  {folderCount(f) > 0 && (
                    <span className="bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                      {folderCount(f)}
                    </span>
                  )}
                  {/* Delete folder button */}
                  {!DEFAULT_FOLDERS.includes(f) && (
                    <span
                      onClick={e => { e.stopPropagation(); deleteFolder(selected.id, f); }}
                      className="hidden group-hover:inline text-destructive/60 hover:text-destructive ml-1 text-[10px]"
                    >
                      ✕
                    </span>
                  )}
                </button>
              ))}

              {/* Add folder */}
              {newFolderMode ? (
                <div className="flex items-center gap-1 px-2 py-1">
                  <input
                    autoFocus
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") addFolder(selected.id, newFolderName);
                      if (e.key === "Escape") { setNewFolderMode(false); setNewFolderName(""); }
                    }}
                    placeholder="Folder name..."
                    className="text-xs bg-background border border-border rounded px-2 py-1 w-32 outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    onClick={() => addFolder(selected.id, newFolderName)}
                    className="text-xs text-primary hover:underline"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => { setNewFolderMode(false); setNewFolderName(""); }}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setNewFolderMode(true)}
                  className="flex items-center gap-1 px-3 py-2 text-xs text-muted-foreground hover:text-primary transition-all whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" /> New Folder
                </button>
              )}
            </div>
          </div>

          {/* Folder content */}
          <div className="p-5">
            {/* Search + Upload bar */}
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search documents..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <label className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 cursor-pointer font-semibold">
                <Upload className="w-3.5 h-3.5" />
                Upload to {activeFolder === "All" ? "Folder" : activeFolder}
                <input type="file" className="hidden" onChange={e => handleUpload(e, selected)} />
              </label>
            </div>

            {/* Document list */}
            {searchedDocs.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">
                  {search ? "No documents match your search." : `No documents in ${activeFolder === "All" ? "this matter" : activeFolder} yet.`}
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {searchedDocs.map(d => {
                  const folder  = getDocFolder(selected.id, d.id);
                  const colorCls = docColorClass(d.name, folder);
                  return (
                    <li
                      key={d.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-all",
                        colorCls,
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-lg shrink-0">{fileIcon(d.name)}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{d.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-muted-foreground">{d.date} · {d.uploadedBy}</p>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground font-mono">
                              {folder}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-3 shrink-0">
                        {/* Move to folder */}
                        <select
                          value={folder}
                          onChange={e => setDocFolder(selected.id, d.id, e.target.value)}
                          onClick={e => e.stopPropagation()}
                          className="text-[11px] bg-background border border-border rounded px-1.5 py-0.5 text-muted-foreground"
                        >
                          <option value="Uncategorised">Uncategorised</option>
                          {folders.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                        <button
                          onClick={() => handleView(d)}
                          className="text-muted-foreground hover:text-primary transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(d)}
                          className="text-muted-foreground hover:text-brand-gold transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onUpdateDocument?.(d.id, { clientVisible: !d.clientVisible })}
                          className={cn(
                            "text-[10px] font-semibold px-2 py-0.5 rounded border transition-colors",
                            d.clientVisible
                              ? "bg-success/15 text-success border-success/30"
                              : "bg-muted/30 text-muted-foreground border-border hover:border-primary/40"
                          )}
                          title={d.clientVisible ? "Shared with client — click to unshare" : "Share this document with the client"}
                        >
                          {d.clientVisible ? "Shared \u2713" : "Share with client"}
                        </button>
                        <button
                          onClick={() => onDeleteDocument(d.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Matter list view ──────────────────────────────────────────────────────
  const isSearching = !!search.trim();
  const filteredMatters = isSearching
    ? matters.filter(m =>
        m.title.toLowerCase().includes(search.toLowerCase()) ||
        m.client.toLowerCase().includes(search.toLowerCase()) ||
        (m.fileNo ?? "").toLowerCase().includes(search.toLowerCase()),
      )
    : matters;

  const yearGroups: [string, Matter[]][] = (() => {
    const map = new Map<string, Matter[]>();
    matters.forEach(m => {
      const y = getMatterYear(m);
      if (!map.has(y)) map.set(y, []);
      map.get(y)!.push(m);
    });
    return Array.from(map.entries()).sort((a, b) => {
      if (a[0] === "Unfiled") return 1;
      if (b[0] === "Unfiled") return -1;
      return b[0].localeCompare(a[0]);
    });
  })();

  const currentYearMatters = browseYear ? (yearGroups.find(([y]) => y === browseYear)?.[1] ?? []) : [];
  const currentTypeMatters = browseType ? currentYearMatters.filter(m => (m.type || "Other") === browseType) : [];

  const renderMatterCard = (m: Matter) => {
    const docCount = documents.filter(d => d.matterId === m.id).length;
    return (
      <button
        key={m.id}
        onClick={() => { setSelected(m); setSearch(""); }}
        className={cn(
          "glass-card glass-card-hover p-5 rounded-xl text-left border-l-4 group",
          TYPE_BORDER[m.type] ?? "border-l-primary",
        )}
      >
        {/* File no */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
            {m.fileNo ?? "—"}
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>

        {/* Title + client */}
        <h3 className="font-semibold text-sm leading-tight">{m.title}</h3>
        <p className="text-xs text-muted-foreground mt-1">{m.client}</p>
        {(m as any).caseStatus === "hearing-scheduled" && (m as any).nextHearingDate && (
          <p className="text-[10px] text-info font-semibold mt-1">⚖️ Hearing: {new Date((m as any).nextHearingDate).toLocaleDateString("en-KE",{day:"numeric",month:"short",year:"numeric"})}</p>
        )}
        {(m as any).caseStatus === "completed" && (m as any).result && (
          <p className="text-[10px] text-success font-semibold mt-1">✓ Completed — {((m as any).result || "").toUpperCase()}</p>
        )}
        {(!((m as any).caseStatus) || (m as any).caseStatus === "pending") && (
          <p className="text-[10px] text-warning font-semibold mt-1">⏳ Pending</p>
        )}
        {role !== "client" && onUpdateMatter && (
          <button onClick={(e) => { e.stopPropagation(); setStatusEdit(m); }} className="text-[10px] text-primary hover:underline mt-1 font-semibold">Update status →</button>
        )}

        {/* Parties */}
        {(m.partyA || m.partyB) && (
          <p className="text-[11px] text-primary/70 font-serif italic mt-1.5">
            {m.partyA || "—"} v. {m.partyB || "—"}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/30">
          <span className={cn(
            "text-[10px] px-2 py-0.5 rounded border",
            TYPE_TONE[m.type] ?? "bg-muted",
          )}>
            {m.type}
          </span>
          <div className="flex items-center gap-3">
            {m.assignedTo && (
              <span className="text-[10px] text-muted-foreground">{m.assignedTo}</span>
            )}
            {docCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <FileText className="w-3 h-3" /> {docCount}
              </span>
            )}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-primary/80 font-mono mb-2">Client Files</p>
          <h2 className="text-4xl font-serif">
            Matter <span className="text-gradient-blue">Hub</span>
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {onNewMatter && (
            <button onClick={onNewMatter} className="btn-royal flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold">
              <Plus className="w-4 h-4" /> New Matter
            </button>
          )}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search matters..."
            className="pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary w-56"
          />
        </div>
        </div>
      </div>
      <div className="blue-divider" />

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Active",  count: matters.filter(m => m.status === "active").length,  color: "text-success" },
          { label: "Pending", count: matters.filter(m => m.status === "pending").length, color: "text-warning" },
          { label: "Closed",  count: matters.filter(m => m.status === "closed").length,  color: "text-muted-foreground" },
        ].map(s => (
          <div key={s.label} className="glass-card rounded-xl p-4 text-center">
            <p className={cn("text-2xl font-bold font-serif", s.color)}>{s.count}</p>
            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {isSearching ? (
        filteredMatters.length === 0 ? (
          <div className="glass-card p-10 rounded-xl text-center text-muted-foreground">
            No matters match your search.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filteredMatters.map(renderMatterCard)}
          </div>
        )
      ) : (
        <>
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => { setBrowseYear(null); setBrowseType(null); }}
              className={cn("hover:underline", !browseYear ? "text-primary font-semibold" : "text-muted-foreground")}
            >
              All Years
            </button>
            {browseYear && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                <button
                  onClick={() => setBrowseType(null)}
                  className={cn("hover:underline", !browseType ? "text-primary font-semibold" : "text-muted-foreground")}
                >
                  {browseYear}
                </button>
              </>
            )}
            {browseType && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-primary font-semibold">{browseType}</span>
              </>
            )}
          </div>

          {/* Level 1: Year folders */}
          {!browseYear && (
            matters.length === 0 ? (
              <div className="glass-card p-10 rounded-xl text-center text-muted-foreground">
                No matters yet. Create your first matter using the + New Matter button.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
                {yearGroups.map(([year, list]) => (
                  <button
                    key={year}
                    onClick={() => setBrowseYear(year)}
                    className="glass-card glass-card-hover p-5 rounded-xl text-left group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Folder className="w-5 h-5 text-primary" />
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <h3 className="font-serif text-2xl font-bold">{year}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {list.length} matter{list.length === 1 ? "" : "s"} filed
                    </p>
                  </button>
                ))}
              </div>
            )
          )}

          {/* Level 2: Matter-type folders within a year */}
          {browseYear && !browseType && (
            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
              {groupByType(currentYearMatters).map(([type, list]) => (
                <button
                  key={type}
                  onClick={() => setBrowseType(type)}
                  className={cn(
                    "glass-card glass-card-hover p-5 rounded-xl text-left border-l-4 group",
                    TYPE_BORDER[type] ?? "border-l-primary",
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <FolderOpen className="w-5 h-5" />
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <h3 className="font-semibold text-sm">{type}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {list.length} matter{list.length === 1 ? "" : "s"}
                  </p>
                </button>
              ))}
            </div>
          )}

          {/* Level 3: Matters inside a year + type */}
          {browseYear && browseType && (
            currentTypeMatters.length === 0 ? (
              <div className="glass-card p-10 rounded-xl text-center text-muted-foreground">
                No matters here yet.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {currentTypeMatters.map(renderMatterCard)}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
};

export const MatterHub = Matters;
