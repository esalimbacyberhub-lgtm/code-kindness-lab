path = "src/features/legal/views/Matters.tsx"
with open(path, "r") as f:
    content = f.read()

edits = [
    # 1. Add matter-delete dialog state, next to the doc-delete state
    (
        '''  const [docDeleteTarget,  setDocDeleteTarget]  = useState<{ id: string; name: string } | null>(null);
  const [docDeletePassword, setDocDeletePassword] = useState("");
  const [docDeleteError,  setDocDeleteError]  = useState("");
  const [docDeleting,     setDocDeleting]     = useState(false);
  const docSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));''',
        '''  const [docDeleteTarget,  setDocDeleteTarget]  = useState<{ id: string; name: string } | null>(null);
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
  };'''
    ),
    # 2. Accept the new prop
    (
        '''  onDeleteDocument: (id: string) => void;
  onDeleteDocumentWithPassword?: (id: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  onRenameDocument?: (id: string, name: string) => void;
  onReorderDocuments?: (documentIds: string[], positions: number[]) => void;
  onUpdateMatter?: (id: string, updates: Partial<Matter>) => void;
  onUpdateDocument?: (id: string, updates: any) => void;
  onDeleteMatter?: (id: string) => void;
}''',
        '''  onDeleteDocument: (id: string) => void;
  onDeleteDocumentWithPassword?: (id: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  onRenameDocument?: (id: string, name: string) => void;
  onReorderDocuments?: (documentIds: string[], positions: number[]) => void;
  onUpdateMatter?: (id: string, updates: Partial<Matter>) => void;
  onUpdateDocument?: (id: string, updates: any) => void;
  onDeleteMatter?: (id: string) => void;
  onDeleteMatterWithPassword?: (id: string, password: string) => Promise<{ ok: boolean; error?: string }>;
}'''
    ),
    (
        '''  onDeleteDocument, onDeleteDocumentWithPassword, onRenameDocument, onReorderDocuments,
  onUpdateMatter, onUpdateDocument, onDeleteMatter,
}: Props) => {''',
        '''  onDeleteDocument, onDeleteDocumentWithPassword, onRenameDocument, onReorderDocuments,
  onUpdateMatter, onUpdateDocument, onDeleteMatter, onDeleteMatterWithPassword,
}: Props) => {'''
    ),
    # 3. Replace the confirm()-based handler with one that opens the password dialog
    (
        '''  // ── Delete a matter (case file) entirely ──────────────────────────────────
  const handleDeleteMatter = (matter: Matter) => {
    if (!confirm(`Delete matter "${matter.title}" (${matter.fileNo})?\\n\\nThis permanently removes the case file and cannot be undone.`)) return;
    onDeleteMatter?.(matter.id);
    setSelected(null);
  };''',
        '''  // ── Delete a matter (case file) entirely — password-gated when available,
  //    falls back to a plain confirm() only if the password RPC isn't wired ──
  const handleDeleteMatter = (matter: Matter) => {
    if (onDeleteMatterWithPassword) {
      setMatterDeleteTarget(matter);
      setMatterDeleteError("");
      setMatterDeletePassword("");
      return;
    }
    if (!confirm(`Delete matter "${matter.title}" (${matter.fileNo})?\\n\\nThis permanently removes the case file and cannot be undone.`)) return;
    onDeleteMatter?.(matter.id);
    setSelected(null);
  };'''
    ),
    # 4. Render the password dialog — placed right after the existing preview Dialog
    (
        '''        <Dialog open={!!preview} onOpenChange={o => !o && setPreview(null)}>''',
        '''        <Dialog open={!!matterDeleteTarget} onOpenChange={(open) => { if (!open) { setMatterDeleteTarget(null); setMatterDeletePassword(""); setMatterDeleteError(""); } }}>
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

        <Dialog open={!!preview} onOpenChange={o => !o && setPreview(null)}>'''
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
