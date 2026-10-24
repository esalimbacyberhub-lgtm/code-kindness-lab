import { useState, useEffect } from "react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CaseStatusDialog } from "../components/CaseStatusDialog";
import { RecordMilestoneDialog } from "../components/RecordMilestoneDialog";
import { ActivityDraftTools } from "../components/ActivityDraftTools";
import { useCaseMilestones } from "../hooks/useCaseMilestones";
import { useMatterFolders } from "../hooks/useMatterFolders";
import { useSupabaseCaseActivities, LITIGIOUS_ACTIVITY_TYPES } from "../hooks/useSupabaseCaseActivities";
import { FolderTree } from "../components/FolderTree";
import {
  Briefcase, Upload, Trash2, FileText, Link as LinkIcon, Download,
  ArrowLeft, FolderOpen, Folder, Plus, Edit3, Users, Receipt,
  ClipboardList, ChevronRight, Search, Filter, Eye, GripVertical, Pencil,
} from "lucide-react";
import type { Matter, StaffMember, Role, VaultDocument } from "../types";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
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

// Litigious court-code → display label (matches set_matter_file_no() prefixes)
const COURT_CODE_LABELS: Record<string, string> = {
  SC:   "Supreme Court",
  COA:  "Court of Appeal",
  HC:   "High Court",
  ELC:  "Environment & Land Court",
  ELRC: "Employment & Labour Relations Court",
  MC:   "Magistrates Court",
  KC:   "Kadhis Court",
  SCC:  "Small Claims Court",
  TRB:  "Tribunal",
};

const COURT_GROUP_ORDER = [...Object.values(COURT_CODE_LABELS), "Non-Litigious"];

// Court group — derived from the file number prefix (…/HC/003/2026 -> "High Court").
// Falls back to a PREFIX match for legacy matters filed before the court-trigger
// existed, whose custom type codes embed a court hint (e.g. "HCCOMM", "ELCLMISC").
// Checked longest-code-first so e.g. "ELRC..." isn't wrongly caught by "ELC".
// "COA" confirmed by Omuyoma as Court of Appeal (covers COACA/COACAPPL).
const LEGACY_PREFIX_CODES = ["ELRC", "ELC", "HC", "SCC", "SC", "MC", "KC", "TRB", "COA"];

function getMatterCourtGroup(m: Matter): string {
  const code = m.fileNo?.split("/")[1];
  if (!code) return "Non-Litigious";
  if (COURT_CODE_LABELS[code]) return COURT_CODE_LABELS[code];
  const prefixMatch = LEGACY_PREFIX_CODES.find(p => code.startsWith(p));
  if (prefixMatch) return COURT_CODE_LABELS[prefixMatch];
  return "Non-Litigious";
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

// ── Document row (rename + drag-reorder), mirrors FolderRow in FolderTree.tsx ─
function DocRow({
  doc, folderName, colorCls, matterFolders,
  onView, onDownload, onToggleShare, onMoveFolder, onRename, onDeleteRequest,
}: {
  doc: any;
  folderName: string;
  colorCls: string;
  matterFolders: any[];
  onView: (d: any) => void;
  onDownload: (d: any) => void;
  onToggleShare: (d: any) => void;
  onMoveFolder: (docId: string, folderId: string | null) => void;
  onRename: (id: string, name: string) => void;
  onDeleteRequest: (id: string, name: string) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(doc.name);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: doc.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const commitRename = () => {
    const clean = draftName.trim();
    if (clean && clean !== doc.name) onRename(doc.id, clean);
    setRenaming(false);
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-all",
        colorCls,
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <button
          type="button"
          className="p-0.5 text-muted-foreground/50 hover:text-muted-foreground cursor-grab active:cursor-grabbing shrink-0"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <span className="text-lg shrink-0">{fileIcon(doc.name)}</span>
        <div className="min-w-0 flex-1">
          {renaming ? (
            <Input
              autoFocus
              value={draftName}
              onChange={e => setDraftName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") { setDraftName(doc.name); setRenaming(false); }
              }}
              className="h-7 text-sm py-0 px-1"
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <p className="text-sm font-medium truncate">{doc.name}</p>
          )}
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-muted-foreground">{doc.date} · {doc.uploadedBy}</p>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground font-mono">
              {folderName}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-3 shrink-0">
        <select
          value={doc.folderId || ""}
          onChange={e => onMoveFolder(doc.id, e.target.value || null)}
          onClick={e => e.stopPropagation()}
          className="text-[11px] bg-background border border-border rounded px-1.5 py-0.5 text-muted-foreground"
        >
          <option value="">Uncategorised</option>
          {matterFolders.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <button
          onClick={() => setRenaming(true)}
          className="text-muted-foreground hover:text-primary transition-colors"
          title="Rename"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={() => onView(doc)}
          className="text-muted-foreground hover:text-primary transition-colors"
          title="View"
        >
          <Eye className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDownload(doc)}
          className="text-muted-foreground hover:text-brand-gold transition-colors"
          title="Download"
        >
          <Download className="w-4 h-4" />
        </button>
        <button
          onClick={() => onToggleShare(doc)}
          className={cn(
            "text-[10px] font-semibold px-2 py-0.5 rounded border transition-colors",
            doc.clientVisible
              ? "bg-success/15 text-success border-success/30"
              : "bg-muted/30 text-muted-foreground border-border hover:border-primary/40"
          )}
          title={doc.clientVisible ? "Shared with client — click to unshare" : "Share this document with the client"}
        >
          {doc.clientVisible ? "Shared \u2713" : "Share with client"}
        </button>
        <button
          onClick={() => onDeleteRequest(doc.id, doc.name)}
          className="text-muted-foreground hover:text-destructive transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </li>
  );
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
  onDeleteDocumentWithPassword?: (id: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  onRenameDocument?: (id: string, name: string) => void;
  onReorderDocuments?: (documentIds: string[], positions: number[]) => void;
  onUpdateMatter?: (id: string, updates: Partial<Matter>) => void;
  onUpdateDocument?: (id: string, updates: any) => void;
  onDeleteMatter?: (id: string) => void;
  onDeleteMatterWithPassword?: (id: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  onAddDeadline?: (d: Omit<Deadline, "id">) => void;
}

// Court code -> whether this matter is litigious (mirrors getMatterCourtGroup's
// prefix-matching, kept local since it's only needed for the Activities tab)
function isLitigiousMatter(m: Matter): boolean {
  const code = m.fileNo?.split("/")[1];
  if (!code) return false;
  const knownCourtCodes = ["SC", "COA", "HC", "ELC", "ELRC", "MC", "KC", "SCC", "TRB"];
  return knownCourtCodes.some(c => code.startsWith(c));
}

// Activity type -> matching deadline type, for the auto-created calendar entry
function activityToDeadlineType(activityType: string): Deadline["type"] {
  const t = activityType.toLowerCase();
  if (t.includes("mention")) return "mention";
  if (t.includes("hearing")) return "hearing";
  if (t.includes("ruling") || t.includes("judgment")) return "ruling";
  if (t.includes("filing")) return "filing";
  return "deadline";
}

// ════════════════════════════════════════════════════════════════════════════
export const Matters = ({
  onNewMatter, matters, staff, role, onAssign,
  documents, onAddDocument, onDeleteDocument, onDeleteDocumentWithPassword, onRenameDocument, onReorderDocuments,
  onUpdateMatter, onUpdateDocument, onDeleteMatter, onDeleteMatterWithPassword, onAddDeadline,
}: Props) => {
  const [selected,    setSelected]    = useState<Matter | null>(null);
  const [statusEdit,  setStatusEdit]  = useState<Matter | null>(null);
  const [milestoneEdit, setMilestoneEdit] = useState<Matter | null>(null);
  const { addMilestone } = useCaseMilestones();
  const [linkCopied,  setLinkCopied]  = useState(false);
  const [activeFolder,setActiveFolder]= useState<string | null>(null);
  const [search,      setSearch]      = useState("");
  const [browseYear,  setBrowseYear]  = useState<string | null>(null);
  const [browseType,  setBrowseType]  = useState<string | null>(null);
  const [viewMode,    setViewMode]    = useState<"year" | "court">("year");
  const [browseCourt, setBrowseCourt] = useState<string | null>(null);
  const [browseCourtCategory, setBrowseCourtCategory] = useState<"litigious" | "non-litigious" | null>(null);
  const [preview,        setPreview]        = useState<{ doc: any; url: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [docDeleteTarget,  setDocDeleteTarget]  = useState<{ id: string; name: string } | null>(null);
  const [docDeletePassword, setDocDeletePassword] = useState("");
  const [docDeleteError,  setDocDeleteError]  = useState("");
  const [docDeleting,     setDocDeleting]     = useState(false);
  const docSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const [matterDeleteTarget,  setMatterDeleteTarget]  = useState<Matter | null>(null);
  const [matterDeletePassword, setMatterDeletePassword] = useState("");
  const [matterDeleteError,  setMatterDeleteError]  = useState("");
  const [matterDeleting,     setMatterDeleting]     = useState(false);

  const confirmMatterDelete = async () => {
    if (!matterDeleteTarget || !onDeleteMatterWithPassword) return;
    setMatterDeleting(true);
    setMatterDeleteError("");
    const result = await onDeleteMatterWithPassword(matterDeleteTarget.id, matterDeletePassword);
    setMatterDeleting(false);
    if (!result.ok) {
      setMatterDeleteError(result.error || "Failed to delete matter");
      return;
    }
    setMatterDeleteTarget(null);
    setMatterDeletePassword("");
    setSelected(null);
  };

  const confirmDocDelete = async () => {
    if (!docDeleteTarget || !onDeleteDocumentWithPassword) return;
    setDocDeleting(true);
    setDocDeleteError("");
    const result = await onDeleteDocumentWithPassword(docDeleteTarget.id, docDeletePassword);
    setDocDeleting(false);
    if (!result.ok) {
      setDocDeleteError(result.error || "Failed to delete document");
      return;
    }
    setDocDeleteTarget(null);
    setDocDeletePassword("");
  };
  // Reset folder view when switching matters
  useEffect(() => { setActiveFolder(null); }, [selected]);
  const [detailTab, setDetailTab] = useState<"documents" | "activities">("documents");
  useEffect(() => { setDetailTab("documents"); }, [selected?.id]);

  // If the Dashboard's "Deadlines" list was clicked, jump straight into that matter
  useEffect(() => {
    const targetId = sessionStorage.getItem("omuyoma_open_matter_id");
    if (!targetId) return;
    const match = matters.find(m => m.id === targetId);
    if (match) {
      setSelected(match);
      sessionStorage.removeItem("omuyoma_open_matter_id");
    }
  }, [matters]);

  // Flat folder list for this matter (name lookups, move-to dropdown)
  const { folders: matterFolders } = useMatterFolders(selected?.id ?? null);

  // ── Subfolder helpers ──────────────────────────────────────────────────────
  const getFolderName = (folderId: string | null): string =>
    matterFolders.find(f => f.id === folderId)?.name || "Uncategorised";

  const setDocFolder = (_matterId: string, docId: string, folderId: string | null) => {
    onUpdateDocument?.(docId, { folderId });
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
      folderId: activeFolder,
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
    if (onDeleteMatterWithPassword) {
      setMatterDeleteTarget(matter);
      setMatterDeleteError("");
      setMatterDeletePassword("");
      return;
    }
    if (!confirm(`Delete matter "${matter.title}" (${matter.fileNo})?\n\nThis permanently removes the case file and cannot be undone.`)) return;
    onDeleteMatter?.(matter.id);
    setSelected(null);
  };

  // ── Matter detail view ───────────────────────────────────────────────────
  if (selected) {
    const allMatterDocs = documents.filter(d => d.matterId === selected.id);

    const filteredDocs = activeFolder === null
      ? allMatterDocs
      : allMatterDocs.filter(d => (d.folderId || null) === activeFolder);

    const searchedDocs = search.trim()
      ? filteredDocs.filter(d => d.name.toLowerCase().includes(search.toLowerCase()))
      : filteredDocs;

    // Count docs per folder (for the folder tree sidebar)
    const folderDocCounts: Record<string, number> = {};
    allMatterDocs.forEach(d => {
      if (d.folderId) folderDocCounts[d.folderId] = (folderDocCounts[d.folderId] || 0) + 1;
    });

    return (
      <div className="space-y-5">
      <CaseStatusDialog matter={statusEdit} open={!!statusEdit} onClose={() => setStatusEdit(null)} onSave={updates => statusEdit && onUpdateMatter && onUpdateMatter(statusEdit.id, updates)} />
      <RecordMilestoneDialog matter={milestoneEdit} open={!!milestoneEdit} onClose={() => setMilestoneEdit(null)} onSave={(milestoneType, eventDate, includesCounterclaim) => milestoneEdit && addMilestone(milestoneEdit.id, milestoneType, eventDate, includesCounterclaim)} />
        <Dialog open={!!matterDeleteTarget} onOpenChange={(open) => { if (!open) { setMatterDeleteTarget(null); setMatterDeletePassword(""); setMatterDeleteError(""); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete "{matterDeleteTarget?.title}" ({matterDeleteTarget?.fileNo})?</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                This permanently removes the entire case file, including its documents and folders, and cannot be undone. Enter the master password to confirm.
              </p>
              <Input
                type="password"
                autoFocus
                value={matterDeletePassword}
                onChange={e => setMatterDeletePassword(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") confirmMatterDelete(); }}
                placeholder="Master password"
              />
              {matterDeleteError && <p className="text-sm text-destructive">{matterDeleteError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setMatterDeleteTarget(null)}>Cancel</Button>
                <Button variant="destructive" size="sm" disabled={matterDeleting || !matterDeletePassword} onClick={confirmMatterDelete}>
                  {matterDeleting ? "Deleting..." : "Delete Matter"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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

        {/* ── Tab Switcher ── */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDetailTab("documents")}
            className={cn(
              "text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors",
              detailTab === "documents" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/40",
            )}
          >
            Documents
          </button>
          <button
            onClick={() => setDetailTab("activities")}
            className={cn(
              "text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors",
              detailTab === "activities" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/40",
            )}
          >
            Case Activities
          </button>
        </div>

        {detailTab === "documents" && (
        <>
        {/* ── Document Folder System ── */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-[240px_1fr]">
            {/* Folder tree sidebar */}
            <div className="border-b md:border-b-0 md:border-r border-border/50 bg-secondary/20 p-3">
              <FolderTree
                matterId={selected.id}
                documentCounts={folderDocCounts}
                activeFolderId={activeFolder}
                onSelectFolder={setActiveFolder}
              />
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
                Upload to {activeFolder === null ? "root" : getFolderName(activeFolder)}
                <input type="file" className="hidden" onChange={e => handleUpload(e, selected)} />
              </label>
            </div>

            {(() => {
              const sortedDocs = [...searchedDocs].sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0));
              const canReorder = !search && !!onReorderDocuments;

              const handleDocDragEnd = (event: DragEndEvent) => {
                const { active, over } = event;
                if (!over || active.id === over.id || !onReorderDocuments) return;
                const oldIndex = sortedDocs.findIndex((d: any) => d.id === active.id);
                const newIndex = sortedDocs.findIndex((d: any) => d.id === over.id);
                if (oldIndex === -1 || newIndex === -1) return;
                const reordered = arrayMove(sortedDocs, oldIndex, newIndex);
                onReorderDocuments(reordered.map((d: any) => d.id), reordered.map((_: any, i: number) => i));
              };

              return sortedDocs.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">
                  {search ? "No documents match your search." : `No documents in ${activeFolder === null ? "this matter" : getFolderName(activeFolder)} yet.`}
                </p>
              </div>
              ) : (
                <DndContext sensors={docSensors} collisionDetection={closestCenter} onDragEnd={handleDocDragEnd}>
                  <SortableContext items={sortedDocs.map((d: any) => d.id)} strategy={verticalListSortingStrategy} disabled={!canReorder}>
                    <ul className="space-y-2">
                      {sortedDocs.map((d: any) => {
                        const folderName = getFolderName(d.folderId || null);
                        const colorCls = docColorClass(d.name, folderName);
                        return (
                          <DocRow
                            key={d.id}
                            doc={d}
                            folderName={folderName}
                            colorCls={colorCls}
                            matterFolders={matterFolders}
                            onView={handleView}
                            onDownload={handleDownload}
                            onToggleShare={(doc) => onUpdateDocument?.(doc.id, { clientVisible: !doc.clientVisible })}
                            onMoveFolder={(docId, folderId) => setDocFolder(selected.id, docId, folderId)}
                            onRename={(id, name) => onRenameDocument ? onRenameDocument(id, name) : onUpdateDocument?.(id, { name })}
                            onDeleteRequest={(id, name) => {
                              if (onDeleteDocumentWithPassword) {
                                setDocDeleteTarget({ id, name });
                                setDocDeleteError("");
                                setDocDeletePassword("");
                              } else {
                                onDeleteDocument(id);
                              }
                            }}
                          />
                        );
                      })}
                    </ul>
                  </SortableContext>
                </DndContext>
              );
            })()}

            {/* Password-gated document delete */}
            <Dialog open={!!docDeleteTarget} onOpenChange={(open) => { if (!open) { setDocDeleteTarget(null); setDocDeletePassword(""); setDocDeleteError(""); } }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete "{docDeleteTarget?.name}"?</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    This permanently removes the document and its stored file. Enter the master password to confirm.
                  </p>
                  <Input
                    type="password"
                    autoFocus
                    value={docDeletePassword}
                    onChange={e => setDocDeletePassword(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") confirmDocDelete(); }}
                    placeholder="Master password"
                  />
                  {docDeleteError && <p className="text-sm text-destructive">{docDeleteError}</p>}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => setDocDeleteTarget(null)}>Cancel</Button>
                    <Button variant="destructive" size="sm" disabled={docDeleting || !docDeletePassword} onClick={confirmDocDelete}>
                      {docDeleting ? "Deleting..." : "Delete Document"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          </div>
        </div>
        </>
        )}

        {detailTab === "activities" && (
          <CaseActivitiesPanel matter={selected} onAddDeadline={onAddDeadline} />
        )}
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

  const courtGroups: [string, Matter[]][] = (() => {
    const map = new Map<string, Matter[]>();
    matters.forEach(m => {
      const g = getMatterCourtGroup(m);
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(m);
    });
    return Array.from(map.entries()).sort((a, b) => {
      const ia = COURT_GROUP_ORDER.indexOf(a[0]);
      const ib = COURT_GROUP_ORDER.indexOf(b[0]);
      if (ia === -1 && ib === -1) return a[0].localeCompare(b[0]);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  })();

  const currentCourtMatters = browseCourt ? (courtGroups.find(([c]) => c === browseCourt)?.[1] ?? []) : [];
  const litigiousCourtGroups = courtGroups.filter(([c]) => c !== "Non-Litigious");
  const nonLitigiousMatters = courtGroups.find(([c]) => c === "Non-Litigious")?.[1] ?? [];
  const litigiousTotal = litigiousCourtGroups.reduce((sum, [, list]) => sum + list.length, 0);

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
          <>
            <button onClick={(e) => { e.stopPropagation(); setStatusEdit(m); }} className="text-[10px] text-primary hover:underline mt-1 font-semibold">Update status →</button>
            <button onClick={(e) => { e.stopPropagation(); setMilestoneEdit(m); }} className="text-[10px] text-primary hover:underline mt-1 ml-3 font-semibold">Record milestone →</button>
          </>
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
          {/* View mode toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setViewMode("year"); setBrowseCourt(null); setBrowseCourtCategory(null); }}
              className={cn(
                "text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors",
                viewMode === "year" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/40",
              )}
            >
              By Year
            </button>
            <button
              onClick={() => { setViewMode("court"); setBrowseYear(null); setBrowseType(null); setBrowseCourtCategory(null); setBrowseCourt(null); }}
              className={cn(
                "text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors",
                viewMode === "court" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/40",
              )}
            >
              By Court
            </button>
          </div>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            {viewMode === "year" ? (
              <>
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
              </>
            ) : (
              <>
                <button
                  onClick={() => { setBrowseCourtCategory(null); setBrowseCourt(null); }}
                  className={cn("hover:underline", !browseCourtCategory ? "text-primary font-semibold" : "text-muted-foreground")}
                >
                  All Courts
                </button>
                {browseCourtCategory && (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    <button
                      onClick={() => setBrowseCourt(null)}
                      className={cn("hover:underline", !browseCourt ? "text-primary font-semibold" : "text-muted-foreground")}
                    >
                      {browseCourtCategory === "litigious" ? "Litigious" : "Non-Litigious"}
                    </button>
                  </>
                )}
                {browseCourt && (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-primary font-semibold">{browseCourt}</span>
                  </>
                )}
              </>
            )}
          </div>

          {viewMode === "year" ? (
            <>
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
          ) : (
            <>
              {/* Level 1: Litigious / Non-Litigious */}
              {!browseCourtCategory && (
                matters.length === 0 ? (
                  <div className="glass-card p-10 rounded-xl text-center text-muted-foreground">
                    No matters yet. Create your first matter using the + New Matter button.
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    <button
                      onClick={() => setBrowseCourtCategory("litigious")}
                      className="glass-card glass-card-hover p-5 rounded-xl text-left group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Folder className="w-5 h-5 text-primary" />
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <h3 className="font-semibold text-sm">Litigious</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {litigiousTotal} matter{litigiousTotal === 1 ? "" : "s"} filed in court
                      </p>
                    </button>
                    <button
                      onClick={() => setBrowseCourtCategory("non-litigious")}
                      className="glass-card glass-card-hover p-5 rounded-xl text-left group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Folder className="w-5 h-5 text-primary" />
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <h3 className="font-semibold text-sm">Non-Litigious</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {nonLitigiousMatters.length} matter{nonLitigiousMatters.length === 1 ? "" : "s"}
                      </p>
                    </button>
                  </div>
                )
              )}

              {/* Level 2a: Court folders, only under Litigious */}
              {browseCourtCategory === "litigious" && !browseCourt && (
                litigiousCourtGroups.length === 0 ? (
                  <div className="glass-card p-10 rounded-xl text-center text-muted-foreground">
                    No litigious matters yet.
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
                    {litigiousCourtGroups.map(([court, list]) => (
                      <button
                        key={court}
                        onClick={() => setBrowseCourt(court)}
                        className="glass-card glass-card-hover p-5 rounded-xl text-left group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Folder className="w-5 h-5 text-primary" />
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <h3 className="font-semibold text-sm">{court}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {list.length} matter{list.length === 1 ? "" : "s"}
                        </p>
                      </button>
                    ))}
                  </div>
                )
              )}

              {/* Level 2b: Matters directly under Non-Litigious */}
              {browseCourtCategory === "non-litigious" && (
                nonLitigiousMatters.length === 0 ? (
                  <div className="glass-card p-10 rounded-xl text-center text-muted-foreground">
                    No non-litigious matters yet.
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {nonLitigiousMatters.map(renderMatterCard)}
                  </div>
                )
              )}

              {/* Level 2: Matters inside a court */}
              {browseCourt && (
                currentCourtMatters.length === 0 ? (
                  <div className="glass-card p-10 rounded-xl text-center text-muted-foreground">
                    No matters here yet.
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {currentCourtMatters.map(renderMatterCard)}
                  </div>
                )
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

// ── Case Activities panel ──────────────────────────────────────────────────
const ACTIVITY_TABLE_COLS = ["Activity", "Activity Date", "Court Room", "Actioned To", "Outcomes"];

function CaseActivitiesPanel({ matter, onAddDeadline }: { matter: Matter; onAddDeadline?: (d: Omit<Deadline, "id">) => void }) {
  const { activities, addActivity, updateActivity, deleteActivity, uploadDraft, getDraftUrl } = useSupabaseCaseActivities(matter.id);
  const litigious = isLitigiousMatter(matter);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [isCustomType, setIsCustomType] = useState(!litigious);
  const [form, setForm] = useState({
    activityType: litigious ? LITIGIOUS_ACTIVITY_TYPES[0] : "",
    activityDate: new Date().toISOString().slice(0, 10),
    courtRoom: "",
    actionedTo: "",
    outcome: "",
    nextDate: "",
    clientVisible: false,
  });

  const resetForm = () => setForm({
    activityType: litigious ? LITIGIOUS_ACTIVITY_TYPES[0] : "",
    activityDate: new Date().toISOString().slice(0, 10),
    courtRoom: "",
    actionedTo: "",
    outcome: "",
    nextDate: "",
    clientVisible: false,
  });

  const submit = async () => {
    if (!form.activityType.trim()) return;
    const saved = await addActivity(form);
    if (saved && form.nextDate) {
      onAddDeadline?.({
        title: `${form.activityType} — ${matter.title}`,
        matter: matter.fileNo || "General",
        court: form.courtRoom || matter.court || "",
        date: form.nextDate,
        type: activityToDeadlineType(form.activityType),
      });
    }
    setDialogOpen(false);
    resetForm();
  };

  return (
    <div className="glass-card rounded-xl overflow-hidden p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Case Activities</h3>
        </div>
        <button
          onClick={() => { resetForm(); setDialogOpen(true); }}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 font-semibold"
        >
          <Plus className="w-3.5 h-3.5" /> Add Activity
        </button>
      </div>

      {activities.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">No activities logged yet for this matter.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/50">
                {ACTIVITY_TABLE_COLS.map(c => <th key={c} className="pb-2 pr-4 font-semibold">{c}</th>)}
                <th className="pb-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {activities.map((a: CaseActivity) => (
                <tr key={a.id} className="border-b border-border/30 last:border-0">
                  <td className="py-2.5 pr-4 font-medium">{a.activityType}</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">
                    {a.activityDate ? new Date(a.activityDate + "T00:00:00").toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                  </td>
                  <td className="py-2.5 pr-4 text-muted-foreground">{a.courtRoom || "—"}</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">{a.actionedTo || "—"}</td>
                  <td className="py-2.5 pr-4 text-muted-foreground min-w-[220px] whitespace-pre-wrap break-words">{a.outcome || "—"}</td>
                  <td className="py-2.5">
                    <ActivityDraftTools activity={a} onUpdate={updateActivity} onUpload={uploadDraft} getUrl={getDraftUrl} />
                    <button onClick={() => { if (confirm("Delete this activity?")) deleteActivity(a.id); }} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={o => { if (!o) resetForm(); setDialogOpen(o); }}>
        <DialogContent className="glass-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Log Case Activity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Activity Type *</Label>
              {litigious && !isCustomType ? (
                <Select
                  value={form.activityType}
                  onValueChange={v => v === "__custom__" ? setIsCustomType(true) : setForm(f => ({ ...f, activityType: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LITIGIOUS_ACTIVITY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    <SelectItem value="__custom__">✎ Other — specify manually</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={form.activityType}
                  onChange={e => setForm(f => ({ ...f, activityType: e.target.value }))}
                  placeholder={litigious ? "e.g. Site visit" : "e.g. Transaction milestone reached"}
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Activity Date</Label>
                <Input type="date" value={form.activityDate} onChange={e => setForm(f => ({ ...f, activityDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Court Room</Label>
                <Input value={form.courtRoom} onChange={e => setForm(f => ({ ...f, courtRoom: e.target.value }))} placeholder="e.g. Courtroom 4" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Actioned To</Label>
              <Input value={form.actionedTo} onChange={e => setForm(f => ({ ...f, actionedTo: e.target.value }))} placeholder="Firm member assigned" />
            </div>

            <div className="space-y-1.5">
              <Label>Outcome</Label>
              <Input value={form.outcome} onChange={e => setForm(f => ({ ...f, outcome: e.target.value }))} placeholder="e.g. Mention date set (in court)" />
            </div>

            <div className="space-y-1.5">
              <Label>Next Date (optional)</Label>
              <Input type="date" value={form.nextDate} onChange={e => setForm(f => ({ ...f, nextDate: e.target.value }))} />
              <p className="text-[11px] text-muted-foreground">If set, a matching deadline is created automatically on the Calendar.</p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.clientVisible} onChange={e => setForm(f => ({ ...f, clientVisible: e.target.checked }))} className="rounded border-border" />
              <span className="text-sm">Visible to client</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={!form.activityType.trim()} className="btn-royal">Save Activity</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const MatterHub = Matters;
