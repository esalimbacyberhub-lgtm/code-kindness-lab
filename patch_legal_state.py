path = "src/features/legal/hooks/useLegalState.ts"
with open(path, "r") as f:
    content = f.read()

edits = [
    (
        '''  const deleteDocument = useCallback((id: string) => { sbDoc.deleteDocument(id); }, [sbDoc]);
  const updateDocument = useCallback((id: string, updates: any) => { sbDoc.updateDocument(id, updates); }, [sbDoc]);''',
        '''  const deleteDocument = useCallback((id: string) => { sbDoc.deleteDocument(id); }, [sbDoc]);
  const updateDocument = useCallback((id: string, updates: any) => { sbDoc.updateDocument(id, updates); }, [sbDoc]);
  const deleteDocumentWithPassword = useCallback((id: string, password: string) => sbDoc.deleteDocumentWithPassword(id, password), [sbDoc]);
  const renameDocument = useCallback((id: string, name: string) => sbDoc.renameDocument(id, name), [sbDoc]);
  const reorderDocuments = useCallback((documentIds: string[], positions: number[]) => sbDoc.reorderDocuments(documentIds, positions), [sbDoc]);'''
    ),
    (
        '''    addDocument, deleteDocument, updateDocument, addInvoice, assignMatter, sendMessage, addWitness, updateWitnessStatus, log''',
        '''    addDocument, deleteDocument, deleteDocumentWithPassword, renameDocument, reorderDocuments, updateDocument, addInvoice, assignMatter, sendMessage, addWitness, updateWitnessStatus, log'''
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
