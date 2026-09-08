path = "src/features/legal/views/Matters.tsx"
with open(path, "r") as f:
    content = f.read()

edits = [
    (
        '''  // Reset folder view when switching matters
  useEffect(() => { setActiveFolder(null); }, [selected]);''',
        '''  // Reset folder view when switching matters
  useEffect(() => { setActiveFolder(null); }, [selected]);
  const [detailTab, setDetailTab] = useState<"documents" | "activities">("documents");
  useEffect(() => { setDetailTab("documents"); }, [selected?.id]);'''
    ),
    (
        '''        {/* ── Document Folder System ── */}
        <div className="glass-card rounded-xl overflow-hidden">''',
        '''        {/* ── Tab Switcher ── */}
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
        <div className="glass-card rounded-xl overflow-hidden">'''
    ),
    (
        '''            </Dialog>
          </div>
          </div>
        </div>
      </div>
    );
  }''',
        '''            </Dialog>
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
  }'''
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
