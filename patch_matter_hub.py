
#!/usr/bin/env python3
"""
Patch: Matter Hub year/type auto-folders + doc preview + remove Document Vault.
Run from the repo root: python3 patch_matter_hub.py
"""
import sys

def apply(path, old, new, label):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    count = content.count(old)
    if count != 1:
        print(f"  FAILED [{label}]: expected 1 match, found {count} in {path}")
        sys.exit(1)
    content = content.replace(old, new, 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"  OK [{label}]")

MATTERS = "src/features/legal/views/Matters.tsx"
SIDEBAR = "src/features/legal/components/Sidebar.tsx"
INDEX   = "src/pages/Index.tsx"

print("== Patching Index.tsx (remove Document Vault route) ==")
apply(INDEX,
'''import { DocumentVault } from "@/features/legal/views/DocumentVault";
''',
'', "remove DocumentVault import")

apply(INDEX,
'''      case "vault": return <DocumentVault documents={state.documents} matters={state.matters} onAdd={addDocument} onDelete={deleteDocument} />;''',
'''      case "vault": return null; // Document Vault removed — documents now live inside each Matter's own folder''',
"neutralize vault route")

print("\n== Patching Sidebar.tsx (remove Document Vault nav) ==")
apply(SIDEBAR,
'''  { key: "matters", label: "Matter Hub", Icon: Briefcase },
  { key: "calendar", label: "Calendar & Deadlines", Icon: Calendar },
  { key: "vault", label: "Document Vault", Icon: FolderTree },
  { key: "directory", label: "Firm Directory", Icon: BookUser },''',
'''  { key: "matters", label: "Matter Hub", Icon: Briefcase },
  { key: "calendar", label: "Calendar & Deadlines", Icon: Calendar },
  { key: "directory", label: "Firm Directory", Icon: BookUser },''',
"remove vault nav entry")

print("\n== Patching Matters.tsx ==")

apply(MATTERS,
'''  ClipboardList, ChevronRight, Search, Filter,
} from "lucide-react";
import type { Matter, StaffMember, Role, VaultDocument } from "../types";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";''',
'''  ClipboardList, ChevronRight, Search, Filter, Eye,
} from "lucide-react";
import type { Matter, StaffMember, Role, VaultDocument } from "../types";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";''',
"imports")

apply(MATTERS,
'''  "Probate & Administration":"border-l-muted-foreground",
};

// Document type → color class from index.css''',
'''  "Probate & Administration":"border-l-muted-foreground",
};

// Standard document categories every matter starts with
const DEFAULT_FOLDERS = ["Pleadings", "Correspondence", "Court Orders", "Financial Documents"];

// Matter type display order (keeps type folders in a consistent order)
const TYPE_ORDER = Object.keys(TYPE_TONE);

// Filing year — derived from the file number (…/2026), falls back to opened date
function getMatterYear(m: Matter): string {
  const fromFileNo = m.fileNo?.match(/\\/(\\d{4})$/)?.[1];
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

// Document type → color class from index.css''',
"DEFAULT_FOLDERS + year/type helpers")

apply(MATTERS,
'''  const [activeFolder,setActiveFolder]= useState<string>("All");
  const [newFolderMode,setNewFolderMode] = useState(false);
  const [newFolderName,setNewFolderName] = useState("");
  const [search,      setSearch]      = useState("");
  // Reset folder view when switching matters
  useEffect(() => { setActiveFolder("All"); }, [selected]);''',
'''  const [activeFolder,setActiveFolder]= useState<string>("All");
  const [newFolderMode,setNewFolderMode] = useState(false);
  const [newFolderName,setNewFolderName] = useState("");
  const [search,      setSearch]      = useState("");
  const [browseYear,  setBrowseYear]  = useState<string | null>(null);
  const [browseType,  setBrowseType]  = useState<string | null>(null);
  const [preview,        setPreview]        = useState<{ doc: any; url: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  // Reset folder view when switching matters
  useEffect(() => { setActiveFolder("All"); }, [selected]);''',
"component state")

apply(MATTERS,
'''  const handleDownload = async (doc: any) => {
    if (!doc.storagePath) { alert("No file is attached to this document yet."); return; }
    const { data, error } = await supabase.storage
      .from("matter-documents")
      .createSignedUrl(doc.storagePath, 3600);
    if (error || !data?.signedUrl) { alert("Could not open the file. Please try again."); return; }
    window.open(data.signedUrl, "_blank");
  };''',
'''  const handleDownload = async (doc: any) => {
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
  };''',
"handleView")

apply(MATTERS,
'''    const allMatterDocs = documents.filter(d => d.matterId === selected.id);
    const folders       = getMatterFolders(selected.id);''',
'''    const allMatterDocs = documents.filter(d => d.matterId === selected.id);
    const customFolders = getMatterFolders(selected.id);
    const folders        = [...DEFAULT_FOLDERS, ...customFolders.filter(f => !DEFAULT_FOLDERS.includes(f))];''',
"folders merge")

apply(MATTERS,
'''      <CaseStatusDialog matter={statusEdit} open={!!statusEdit} onClose={() => setStatusEdit(null)} onSave={updates => statusEdit && onUpdateMatter && onUpdateMatter(statusEdit.id, updates)} />''',
'''      <CaseStatusDialog matter={statusEdit} open={!!statusEdit} onClose={() => setStatusEdit(null)} onSave={updates => statusEdit && onUpdateMatter && onUpdateMatter(statusEdit.id, updates)} />
        <Dialog open={!!preview} onOpenChange={o => !o && setPreview(null)}>
          <DialogContent className="glass-card border-border max-w-3xl">
            <DialogHeader>
              <DialogTitle className="font-serif text-lg truncate">{preview?.doc?.name}</DialogTitle>
            </DialogHeader>
            {preview && (
              /\\.(jpe?g|png|gif|webp)$/i.test(preview.doc.name) ? (
                <img src={preview.url} alt={preview.doc.name} className="max-h-[75vh] w-full object-contain rounded-lg" />
              ) : /\\.pdf$/i.test(preview.doc.name) ? (
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
        </Dialog>''',
"preview modal")

apply(MATTERS,
'''                        <button
                          onClick={() => handleDownload(d)}
                          className="text-muted-foreground hover:text-brand-gold transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>''',
'''                        <button
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
                        </button>''',
"View button")

OLD_LIST_VIEW = '''  // ── Matter list view ──────────────────────────────────────────────────────
  const filteredMatters = search.trim()
    ? matters.filter(m =>
        m.title.toLowerCase().includes(search.toLowerCase()) ||
        m.client.toLowerCase().includes(search.toLowerCase()) ||
        (m.fileNo ?? "").toLowerCase().includes(search.toLowerCase()),
      )
    : matters;

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

      {/* Matter cards */}
      {filteredMatters.length === 0 ? (
        <div className="glass-card p-10 rounded-xl text-center text-muted-foreground">
          {search ? "No matters match your search." : "No matters yet. Create your first matter using the + New Matter button."}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filteredMatters.map(m => {
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
          })}
        </div>
      )}
    </div>
  );
};

export const MatterHub = Matters;'''

NEW_LIST_VIEW = '''  // ── Matter list view ──────────────────────────────────────────────────────
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

export const MatterHub = Matters;'''

apply(MATTERS, OLD_LIST_VIEW, NEW_LIST_VIEW, "Year/Type drill-down list view")

print("\nAll edits applied successfully.")
