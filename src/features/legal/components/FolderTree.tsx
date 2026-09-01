import { useState, useMemo } from "react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronRight, ChevronDown, Folder, FolderOpen, GripVertical,
  MoreVertical, Plus, Pencil, Trash2, FolderTree as FolderTreeIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useMatterFolders } from "../hooks/useMatterFolders";
import type { MatterFolder } from "../types";

interface FolderTreeProps {
  matterId: string;
  documentCounts: Record<string, number>;
  activeFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
}

interface TreeNode extends MatterFolder {
  children: TreeNode[];
}

function buildTree(folders: MatterFolder[]): TreeNode[] {
  const byId: Record<string, TreeNode> = {};
  folders.forEach(f => { byId[f.id] = { ...f, children: [] }; });
  const roots: TreeNode[] = [];
  folders.forEach(f => {
    const node = byId[f.id];
    if (f.parentFolderId && byId[f.parentFolderId]) {
      byId[f.parentFolderId].children.push(node);
    } else {
      roots.push(node);
    }
  });
  const sortRec = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.position - b.position);
    nodes.forEach(n => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

function FolderRow({
  node, depth, expanded, onToggleExpand, activeFolderId, onSelectFolder,
  documentCounts, onRename, onDelete, onAddChild,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
  activeFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  documentCounts: Record<string, number>;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string, name: string) => void;
  onAddChild: (parentId: string) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(node.name);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id);
  const isActive = activeFolderId === node.id;
  const count = documentCounts[node.id] || 0;

  const commitRename = () => {
    const clean = draftName.trim();
    if (clean && clean !== node.name) onRename(node.id, clean);
    setRenaming(false);
  };

  return (
    <div>
      <div
        ref={setNodeRef}
        style={{ ...style, paddingLeft: `${depth * 18}px` }}
        className={cn(
          "group flex items-center gap-1 rounded-lg px-2 py-1.5 cursor-pointer transition-colors",
          isActive ? "bg-primary/15 text-primary" : "hover:bg-muted/60"
        )}
      >
        <button
          type="button"
          className="p-0.5 text-muted-foreground/50 hover:text-muted-foreground cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => hasChildren && onToggleExpand(node.id)}
          className={cn("p-0.5", !hasChildren && "opacity-0 pointer-events-none")}
        >
          {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {isOpen ? <FolderOpen className="w-4 h-4 shrink-0" /> : <Folder className="w-4 h-4 shrink-0" />}

        {renaming ? (
          <Input
            autoFocus
            value={draftName}
            onChange={e => setDraftName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") { setDraftName(node.name); setRenaming(false); }
            }}
            className="h-6 text-sm py-0 px-1"
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span
            className="text-sm flex-1 truncate"
            onClick={() => onSelectFolder(node.id)}
          >
            {node.name}
          </span>
        )}

        {count > 0 && !renaming && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
            {count}
          </span>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="p-0.5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
              onClick={e => e.stopPropagation()}
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onAddChild(node.id)}>
              <Plus className="w-3.5 h-3.5 mr-2" /> New subfolder
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setRenaming(true)}>
              <Pencil className="w-3.5 h-3.5 mr-2" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(node.id, node.name)} className="text-destructive">
              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {hasChildren && isOpen && (
        <SortableContext items={node.children.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {node.children.map(child => (
            <FolderRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggleExpand={onToggleExpand}
              activeFolderId={activeFolderId}
              onSelectFolder={onSelectFolder}
              documentCounts={documentCounts}
              onRename={onRename}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))}
        </SortableContext>
      )}
    </div>
  );
}

export function FolderTree({ matterId, documentCounts, activeFolderId, onSelectFolder }: FolderTreeProps) {
  const { folders, createFolder, renameFolder, reorderFolders, deleteFolder } = useMatterFolders(matterId);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [newFolderParent, setNewFolderParent] = useState<string | null | undefined>(undefined);
  const [newFolderName, setNewFolderName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const tree = useMemo(() => buildTree(folders), [folders]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeFolder = folders.find(f => f.id === active.id);
    const overFolder = folders.find(f => f.id === over.id);
    if (!activeFolder || !overFolder) return;
    if ((activeFolder.parentFolderId || null) !== (overFolder.parentFolderId || null)) return;

    const siblings = folders
      .filter(f => (f.parentFolderId || null) === (activeFolder.parentFolderId || null))
      .sort((a, b) => a.position - b.position);

    const oldIndex = siblings.findIndex(f => f.id === active.id);
    const newIndex = siblings.findIndex(f => f.id === over.id);
    const reordered = arrayMove(siblings, oldIndex, newIndex);

    reorderFolders(reordered.map(f => f.id), reordered.map((_, i) => i));
  };

  const submitNewFolder = async () => {
    if (!newFolderName.trim()) { setNewFolderParent(undefined); return; }
    await createFolder(newFolderName, newFolderParent ?? null);
    if (newFolderParent) setExpanded(prev => new Set(prev).add(newFolderParent));
    setNewFolderName("");
    setNewFolderParent(undefined);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    const result = await deleteFolder(deleteTarget.id, deletePassword);
    setDeleting(false);
    if (!result.ok) {
      setDeleteError(result.error || "Failed to delete folder");
      return;
    }
    if (activeFolderId === deleteTarget.id) onSelectFolder(null);
    setDeleteTarget(null);
    setDeletePassword("");
  };

  const rootIds = tree.map(n => n.id);

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        onClick={() => onSelectFolder(null)}
        className={cn(
          "w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
          activeFolderId === null ? "bg-primary/15 text-primary" : "hover:bg-muted/60"
        )}
      >
        <FolderTreeIcon className="w-4 h-4" />
        All Documents
      </button>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={rootIds} strategy={verticalListSortingStrategy}>
          {tree.map(node => (
            <FolderRow
              key={node.id}
              node={node}
              depth={0}
              expanded={expanded}
              onToggleExpand={toggleExpand}
              activeFolderId={activeFolderId}
              onSelectFolder={onSelectFolder}
              documentCounts={documentCounts}
              onRename={renameFolder}
              onDelete={(id, name) => { setDeleteTarget({ id, name }); setDeleteError(""); setDeletePassword(""); }}
              onAddChild={(parentId) => { setNewFolderParent(parentId); setNewFolderName(""); setExpanded(prev => new Set(prev).add(parentId)); }}
            />
          ))}
        </SortableContext>
      </DndContext>

      {newFolderParent !== undefined ? (
        <div className="flex items-center gap-1 px-2 py-1" style={{ paddingLeft: newFolderParent ? "36px" : "8px" }}>
          <Input
            autoFocus
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") submitNewFolder();
              if (e.key === "Escape") { setNewFolderParent(undefined); setNewFolderName(""); }
            }}
            placeholder="Folder name..."
            className="h-7 text-sm"
          />
          <Button size="sm" className="h-7 px-2" onClick={submitNewFolder}>Add</Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => { setNewFolderParent(null); setNewFolderName(""); }}
          className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> New Folder
        </button>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeletePassword(""); setDeleteError(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete "{deleteTarget?.name}"?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This folder must be empty (no subfolders or documents). Enter the master password to confirm deletion.
            </p>
            <Input
              type="password"
              autoFocus
              value={deletePassword}
              onChange={e => setDeletePassword(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") confirmDelete(); }}
              placeholder="Master password"
            />
            {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="destructive" size="sm" disabled={deleting || !deletePassword} onClick={confirmDelete}>
                {deleting ? "Deleting..." : "Delete Folder"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
