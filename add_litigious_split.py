path = "src/features/legal/views/Matters.tsx"
with open(path, "r") as f:
    content = f.read()

edits = [
    (
        '''  const [viewMode,    setViewMode]    = useState<"year" | "court">("year");
  const [browseCourt, setBrowseCourt] = useState<string | null>(null);''',
        '''  const [viewMode,    setViewMode]    = useState<"year" | "court">("year");
  const [browseCourt, setBrowseCourt] = useState<string | null>(null);
  const [browseCourtCategory, setBrowseCourtCategory] = useState<"litigious" | "non-litigious" | null>(null);'''
    ),
    (
        '''  const currentCourtMatters = browseCourt ? (courtGroups.find(([c]) => c === browseCourt)?.[1] ?? []) : [];''',
        '''  const currentCourtMatters = browseCourt ? (courtGroups.find(([c]) => c === browseCourt)?.[1] ?? []) : [];
  const litigiousCourtGroups = courtGroups.filter(([c]) => c !== "Non-Litigious");
  const nonLitigiousMatters = courtGroups.find(([c]) => c === "Non-Litigious")?.[1] ?? [];
  const litigiousTotal = litigiousCourtGroups.reduce((sum, [, list]) => sum + list.length, 0);'''
    ),
    (
        '''            <button
              onClick={() => { setViewMode("year"); setBrowseCourt(null); }}''',
        '''            <button
              onClick={() => { setViewMode("year"); setBrowseCourt(null); setBrowseCourtCategory(null); }}'''
    ),
    (
        '''            <button
              onClick={() => { setViewMode("court"); setBrowseYear(null); setBrowseType(null); }}''',
        '''            <button
              onClick={() => { setViewMode("court"); setBrowseYear(null); setBrowseType(null); setBrowseCourtCategory(null); setBrowseCourt(null); }}'''
    ),
    (
        '''              <>
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
              </>''',
        '''              <>
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
              </>'''
    ),
    (
        '''              {/* Level 1: Court folders */}
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
                )''',
        '''              {/* Level 1: Litigious / Non-Litigious */}
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
                )'''
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

print("\nAll edits applied successfully.")
