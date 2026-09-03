path = "src/pages/Index.tsx"
with open(path, "r") as f:
    content = f.read()

edits = [
    (
        'const { state, setView, setRole, toggleSidebar, moveTask, addDeadline, deleteDeadline, updateDeadline, addLedgerEntry, addStaff, removeStaff, addDocument, deleteDocument, updateDocument, addInvoice, addMessage, addMatter, updateMatter, deleteMatter, assignMatter, addTask, deleteTask } = useLegalState();',
        'const { state, setView, setRole, toggleSidebar, moveTask, addDeadline, deleteDeadline, updateDeadline, addLedgerEntry, addStaff, removeStaff, addDocument, deleteDocument, deleteDocumentWithPassword, renameDocument, reorderDocuments, updateDocument, addInvoice, addMessage, addMatter, updateMatter, deleteMatter, assignMatter, addTask, deleteTask } = useLegalState();'
    ),
    (
        'onAddDocument={addDocument} onDeleteDocument={deleteDocument} onUpdateMatter={updateMatter} onUpdateDocument={updateDocument} onDeleteMatter={deleteMatter} />',
        'onAddDocument={addDocument} onDeleteDocument={deleteDocument} onDeleteDocumentWithPassword={deleteDocumentWithPassword} onRenameDocument={renameDocument} onReorderDocuments={reorderDocuments} onUpdateMatter={updateMatter} onUpdateDocument={updateDocument} onDeleteMatter={deleteMatter} />'
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
