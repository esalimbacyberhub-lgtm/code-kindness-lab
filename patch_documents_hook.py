path = "src/features/legal/hooks/useSupabaseDocuments.ts"
with open(path, "r") as f:
    content = f.read()

edits = [
    # 1. Map position both directions
    (
        '''    clientVisible: row.client_visible === true,
  };
}''',
        '''    clientVisible: row.client_visible === true,
    position: row.position ?? 0,
  };
}'''
    ),
    (
        '''  if (d.date !== undefined) row.date = d.date;''',
        '''  if (d.date !== undefined) row.date = d.date;
  if (d.position !== undefined) row.position = d.position;'''
    ),
    # 2. Replace plain deleteDocument with a password-gated version (keeps the
    #    old name available as an alias in case anything else still calls it
    #    directly, but the UI will be switched to the new one).
    (
        '''  // Delete the DB record and the stored file
  const deleteDocument = useCallback(async (id: string) => {
    const { data: row } = await supabase.from("documents").select("storage_path").eq("id", id).single();
    if (row?.storage_path) {
      const { error: rmErr } = await supabase.storage.from(BUCKET).remove([row.storage_path]);
      if (rmErr) console.error("storage remove:", rmErr);
    }
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) console.error("deleteDocument:", error);
  }, []);''',
        '''  // Delete the DB record and the stored file (no password check — kept for
  // any internal/legacy callers; the UI uses deleteDocumentWithPassword instead)
  const deleteDocument = useCallback(async (id: string) => {
    const { data: row } = await supabase.from("documents").select("storage_path").eq("id", id).single();
    if (row?.storage_path) {
      const { error: rmErr } = await supabase.storage.from(BUCKET).remove([row.storage_path]);
      if (rmErr) console.error("storage remove:", rmErr);
    }
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) console.error("deleteDocument:", error);
  }, []);

  // Password-gated delete — verifies the master password via the same
  // security_settings-backed RPC pattern used for folders, then removes the
  // stored file from Storage once the DB row is confirmed deleted.
  const deleteDocumentWithPassword = useCallback(async (id: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    const { data: row } = await supabase.from("documents").select("storage_path").eq("id", id).single();
    const { error } = await supabase.rpc("delete_document_with_password", {
      p_document_id: id,
      p_password: password,
    });
    if (error) {
      return { ok: false, error: error.message || "Failed to delete document" };
    }
    if (row?.storage_path) {
      const { error: rmErr } = await supabase.storage.from(BUCKET).remove([row.storage_path]);
      if (rmErr) console.error("storage remove:", rmErr);
    }
    return { ok: true };
  }, []);

  // Rename a document
  const renameDocument = useCallback(async (id: string, name: string) => {
    const clean = name.trim();
    if (!clean) return;
    const { error } = await supabase.from("documents").update({ name: clean }).eq("id", id);
    if (error) console.error("renameDocument:", error);
  }, []);

  // Reorder documents within a folder
  const reorderDocuments = useCallback(async (documentIds: string[], positions: number[]) => {
    const { error } = await supabase.rpc("reorder_documents", {
      p_document_ids: documentIds,
      p_positions: positions,
    });
    if (error) console.error("reorderDocuments:", error);
  }, []);'''
    ),
    # 3. Export the new functions
    (
        '''  return { documents, addDocument, deleteDocument, updateDocument, getDownloadUrl };''',
        '''  return { documents, addDocument, deleteDocument, deleteDocumentWithPassword, renameDocument, reorderDocuments, updateDocument, getDownloadUrl };'''
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
