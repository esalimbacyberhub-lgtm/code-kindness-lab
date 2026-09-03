path = "src/features/legal/views/Matters.tsx"
with open(path, "r") as f:
    content = f.read()

edits = [
    # 1. Add dnd-kit + extra icon imports
    (
        '''import { useState, useEffect } from "react";
import { CaseStatusDialog } from "../components/CaseStatusDialog";
import { RecordMilestoneDialog } from "../components/RecordMilestoneDialog";
import { useCaseMilestones } from "../hooks/useCaseMilestones";
import { useMatterFolders } from "../hooks/useMatterFolders";
import { FolderTree } from "../components/FolderTree";
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
} from "@/components/ui/dialog";''',
        '''import { useState, useEffect } from "react";
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
import { useCaseMilestones } from "../hooks/useCaseMilestones";
import { useMatterFolders } from "../hooks/useMatterFolders";
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
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";'''
    ),
    # 2. New DocRow component, placed right before the Matters component's Props interface
    (
        '''// ── Props ────────────────────────────────────────────────────────────────────
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
}''',
        '''// ── Document row (rename + drag-reorder), mirrors FolderRow in FolderTree.tsx ─
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
          {doc.clientVisible ? "Shared \\u2713" : "Share with client"}
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
}'''
    ),
    # 3. Accept the new props in the component signature
    (
        '''export const Matters = ({
  onNewMatter, matters, staff, role, onAssign,
  documents, onAddDocument, onDeleteDocument, onUpdateMatter, onUpdateDocument, onDeleteMatter,
}: Props) => {''',
        '''export const Matters = ({
  onNewMatter, matters, staff, role, onAssign,
  documents, onAddDocument, onDeleteDocument, onDeleteDocumentWithPassword, onRenameDocument, onReorderDocuments,
  onUpdateMatter, onUpdateDocument, onDeleteMatter,
}: Props) => {'''
    ),
    # 4. Add doc-delete dialog state + sensors, right after the existing preview state
    (
        '''  const [preview,        setPreview]        = useState<{ doc: any; url: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);''',
        '''  const [preview,        setPreview]        = useState<{ doc: any; url: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [docDeleteTarget,  setDocDeleteTarget]  = useState<{ id: string; name: string } | null>(null);
  const [docDeletePassword, setDocDeletePassword] = useState("");
  const [docDeleteError,  setDocDeleteError]  = useState("");
  const [docDeleting,     setDocDeleting]     = useState(false);
  const docSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

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
  };''',
    ),
    # 5. Sort searched docs by position, and add drag-end handler (placed right
    #    before the doc-list render block)
    (
        '''            {/* Document list */}
            {searchedDocs.length === 0 ? (''',
        '''            {(() => {
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

              return sortedDocs.length === 0 ? (''',
    ),
    # 6. Close the IIFE and swap in the sortable list + DocRow usage
    (
        '''              </div>
            ) : (
              <ul className="space-y-2">
                {searchedDocs.map(d => {
                  const folderName = getFolderName(d.folderId || null);
                  const colorCls = docColorClass(d.name, folderName);
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
                              {folderName}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-3 shrink-0">
                        {/* Move to folder */}
                        <select
                          value={d.folderId || ""}
                          onChange={e => setDocFolder(selected.id, d.id, e.target.value || null)}
                          onClick={e => e.stopPropagation()}
                          className="text-[11px] bg-background border border-border rounded px-1.5 py-0.5 text-muted-foreground"
                        >
                          <option value="">Uncategorised</option>
                          {matterFolders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
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
                          {d.clientVisible ? "Shared \\u2713" : "Share with client"}
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
            )}''',
        '''              </div>
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
            </Dialog>''',
    ),
]

for i, (old, new) in enumerate(edits, 1):
    if old not in content:
        print(f"❌ Edit {i} FAILED — anchor text not found. Stopping, no changes written.")
        raise SystemExit(1)
    content = content.replace(old, new, 1)
    print(f"✅ Edit {i} applied")

with open(path, "w") as f:
    f.write(content)

print("\\nAll edits applied successfully.")
