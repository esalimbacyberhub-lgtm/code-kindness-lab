path = "src/features/legal/views/Matters.tsx"
with open(path, "r") as f:
    content = f.read()

edits = [
    # 3. Accept onDeleteMatterWithPassword in the destructuring
    (
        '''  documents, onAddDocument, onDeleteDocument, onDeleteDocumentWithPassword, onRenameDocument, onReorderDocuments,
  onUpdateMatter, onUpdateDocument, onDeleteMatter,
}: Props) => {''',
        '''  documents, onAddDocument, onDeleteDocument, onDeleteDocumentWithPassword, onRenameDocument, onReorderDocuments,
  onUpdateMatter, onUpdateDocument, onDeleteMatter, onDeleteMatterWithPassword,
}: Props) => {'''
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
