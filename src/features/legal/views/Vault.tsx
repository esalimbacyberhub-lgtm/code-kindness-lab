import { useMemo, useRef, useState } from "react";
import { Upload, Search, Download, Trash2, FolderTree, FileText, Image as ImageIcon, File as FileIcon, ChevronRight } from "lucide-react";
import type { Matter, VaultDocument } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB per file (localStorage limit)
const ACCEPTED = ".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*";

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

function fileIcon(mime: string) {
  if (mime.startsWith("image/")) return ImageIcon;
  if (mime === "application/pdf" || mime.includes("word")) return FileText;
  return FileIcon;
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

interface Props {
  documents: VaultDocument[];
  matters: Matter[];
  onUpload: (d: Omit<VaultDocument, "id" | "uploadedAt">) => void;
  onRemove: (id: string) => void;
}

export function Vault({ documents, matters, onUpload, onRemove }: Props) {
  const [query, setQuery] = useState("");
  const [activeFolder, setActiveFolder] = useState<string>("all");
  const fileRef = useRef<HTMLInputElement>(null);

  const matterName = (id: string) =>
    id === "general" ? "General" : matters.find(m => m.id === id)?.title ?? "Unfiled";

  const folders = useMemo(() => {
    const counts = new Map<string, number>();
    documents.forEach(d => counts.set(d.matter, (counts.get(d.matter) ?? 0) + 1));
    const list = matters.map(m => ({ id: m.id, label: m.title, count: counts.get(m.id) ?? 0 }));
    list.unshift({ id: "general", label: "General", count: counts.get("general") ?? 0 });
    return list;
  }, [documents, matters]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return documents
      .filter(d => activeFolder === "all" || d.matter === activeFolder)
      .filter(d => {
        if (!q) return true;
        return d.name.toLowerCase().includes(q) || matterName(d.matter).toLowerCase().includes(q);
      })
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  }, [documents, activeFolder, query, matters]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const targetMatter = activeFolder === "all" ? "general" : activeFolder;
    for (const file of Array.from(files)) {
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name} exceeds 5 MB limit`);
        continue;
      }
      try {
        const data = await readAsDataURL(file);
        onUpload({
          name: file.name,
          matter: targetMatter,
          size: file.size,
          mime: file.type || "application/octet-stream",
          data,
        });
        toast.success(`Uploaded ${file.name}`);
      } catch {
        toast.error(`Failed to read ${file.name}`);
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const download = (d: VaultDocument) => {
    const a = document.createElement("a");
    a.href = d.data;
    a.download = d.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-serif">Document Vault</h2>
          <p className="text-sm text-muted-foreground mt-1">Secure repository organised per matter.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            multiple
            accept={ACCEPTED}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button onClick={() => fileRef.current?.click()} className="bg-brand-gold text-primary-foreground hover:bg-brand-gold/90">
            <Upload className="w-4 h-4" /> Upload
          </Button>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by document or matter name…"
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* Folder list */}
        <aside className="glass-card rounded-2xl p-3 h-fit">
          <p className="text-[10px] uppercase tracking-[0.2em] text-brand-gold/70 px-2 py-2">Folders</p>
          <button
            onClick={() => setActiveFolder("all")}
            className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition ${
              activeFolder === "all" ? "bg-brand-gold/15 text-brand-gold" : "hover:bg-secondary/40"
            }`}
          >
            <span className="flex items-center gap-2"><FolderTree className="w-4 h-4" /> All Documents</span>
            <span className="text-xs text-muted-foreground">{documents.length}</span>
          </button>
          <div className="h-px bg-border my-2" />
          {folders.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFolder(f.id)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition ${
                activeFolder === f.id ? "bg-brand-gold/15 text-brand-gold" : "hover:bg-secondary/40"
              }`}
            >
              <span className="flex items-center gap-2 min-w-0">
                <ChevronRight className="w-3 h-3 shrink-0" />
                <span className="truncate">{f.label}</span>
              </span>
              <span className="text-xs text-muted-foreground shrink-0">{f.count}</span>
            </button>
          ))}
          {matters.length === 0 && (
            <p className="text-xs text-muted-foreground px-3 py-2">
              Create matters to organise files into dedicated folders.
            </p>
          )}
        </aside>

        {/* File list */}
        <section className="glass-card rounded-2xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <FolderTree className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                {documents.length === 0
                  ? "No documents yet. Click Upload to add PDFs, Word files, or images."
                  : "No documents match your search."}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-secondary/30 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Matter</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Uploaded</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Size</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => {
                  const Icon = fileIcon(d.mime);
                  return (
                    <tr key={d.id} className="border-t border-border/60 hover:bg-secondary/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className="w-4 h-4 text-brand-gold shrink-0" />
                          <span className="truncate font-medium">{d.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{matterName(d.matter)}</td>
                      <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                        {new Date(d.uploadedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{formatBytes(d.size)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => download(d)} aria-label="Download">
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => { onRemove(d.id); toast.success("Document removed"); }}
                            aria-label="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}