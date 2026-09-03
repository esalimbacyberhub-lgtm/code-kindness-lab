path = "src/features/legal/views/Matters.tsx"
with open(path, "r") as f:
    content = f.read()

edits = [
    # 1. Add court-code label map + grouping helper, right after getMatterYear()
    (
        '''function getMatterYear(m: Matter): string {
  const fromFileNo = m.fileNo?.match(/\\/(\\d{4})$/)?.[1];
  if (fromFileNo) return fromFileNo;
  if (m.openedDate) return m.openedDate.slice(0, 4);
  return "Unfiled";
}''',
        '''function getMatterYear(m: Matter): string {
  const fromFileNo = m.fileNo?.match(/\\/(\\d{4})$/)?.[1];
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

// Court group — derived from the file number prefix (…/HC/003/2026 -> "High Court")
function getMatterCourtGroup(m: Matter): string {
  const code = m.fileNo?.split("/")[1];
  if (code && COURT_CODE_LABELS[code]) return COURT_CODE_LABELS[code];
  return "Non-Litigious";
}'''
    ),
    # 2. Add viewMode + browseCourt state
    (
        '''  const [browseYear,  setBrowseYear]  = useState<string | null>(null);
  const [browseType,  setBrowseType]  = useState<string | null>(null);''',
        '''  const [browseYear,  setBrowseYear]  = useState<string | null>(null);
  const [browseType,  setBrowseType]  = useState<string | null>(null);
  const [viewMode,    setViewMode]    = useState<"year" | "court">("year");
  const [browseCourt, setBrowseCourt] = useState<string | null>(null);'''
    ),
    # 3. Add courtGroups computation after yearGroups/currentYearMatters/currentTypeMatters
    (
        '''  const currentYearMatters = browseYear ? (yearGroups.find(([y]) => y === browseYear)?.[1] ?? []) : [];
  const currentTypeMatters = browseType ? currentYearMatters.filter(m => (m.type || "Other") === browseType) : [];''',
        '''  const currentYearMatters = browseYear ? (yearGroups.find(([y]) => y === browseYear)?.[1] ?? []) : [];
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

  const currentCourtMatters = browseCourt ? (courtGroups.find(([c]) => c === browseCourt)?.[1] ?? []) : [];'''
    ),
    # 4. Replace breadcrumb + 3-level drilldown with a dual-mode toggle (Year / Court)
    (
        '''          {/* Breadcrumb */}
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
      )}''',
        '''          {/* View mode toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setViewMode("year"); setBrowseCourt(null); }}
              className={cn(
                "text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors",
                viewMode === "year" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/40",
              )}
            >
              By Year
            </button>
            <button
              onClick={() => { setViewMode("court"); setBrowseYear(null); setBrowseType(null); }}
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
                  onClick={() => setBrowseCourt(null)}
                  className={cn("hover:underline", !browseCourt ? "text-primary font-semibold" : "text-muted-foreground")}
                >
                  All Courts
                </button>
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
              {/* Level 1: Court folders */}
              {!browseCourt && (
                matters.length === 0 ? (
                  <div className="glass-card p-10 rounded-xl text-center text-muted-foreground">
                    No matters yet. Create your first matter using the + New Matter button.
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
                    {courtGroups.map(([court, list]) => (
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
      )}'''
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
