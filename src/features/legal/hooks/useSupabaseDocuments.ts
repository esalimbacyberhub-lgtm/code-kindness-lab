import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

const BUCKET = "matter-documents";

function rowToDoc(row: any, matters: any[]): any {
  const matter = matters.find((m: any) => m.id === row.matter_id);
  return {
    id: row.id,
    name: row.name || "",
    folder: row.folder || "",
    folderId: row.folder_id || null,
    uploadedBy: row.uploaded_by_name || row.uploaded_by || "",
    date: row.date,
    sizeKb: row.size_kb || 0,
    url: row.url || "",
    storagePath: row.storage_path || "",
    matterId: row.matter_id || null,
    matter: matter?.fileNo || "General",
    clientVisible: row.client_visible === true,
    position: row.position ?? 0,
  };
}

function docToRow(d: any, matters: any[]): any {
  const row: any = {};
  if (d.name !== undefined) row.name = d.name;
  if (d.folder !== undefined) row.folder = d.folder;
  if (d.folderId !== undefined) row.folder_id = d.folderId;
  if (d.sizeKb !== undefined) row.size_kb = d.sizeKb;
  if (d.url !== undefined) row.url = d.url;
  if (d.storagePath !== undefined) row.storage_path = d.storagePath;
  if (d.clientVisible !== undefined) row.client_visible = d.clientVisible;
  if (d.date !== undefined) row.date = d.date;
  if (d.position !== undefined) row.position = d.position;
  // Prefer an explicit matter UUID; fall back to a fileNo lookup
  if (d.matterId) {
    row.matter_id = d.matterId;
  } else if (d.matter !== undefined && d.matter !== "General" && d.matter !== "") {
    const m = matters.find((mm: any) => mm.fileNo === d.matter);
    if (m) row.matter_id = m.id;
  }
  return row;
}

export function useSupabaseDocuments(matters: any[]) {
  const [documents, setDocuments] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.from("documents").select("*").order("created_at", { ascending: false });
      if (mounted) setDocuments((data || []).map((r: any) => rowToDoc(r, matters)));
    };
    load();
    const ch = supabase.channel("documents_changes_" + Math.random().toString(36).slice(2))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "documents" }, (p: any) => setDocuments(prev => prev.find(d => d.id === p.new.id) ? prev : [rowToDoc(p.new, matters), ...prev]))
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "documents" }, (p: any) => setDocuments(prev => prev.filter(d => d.id !== p.old.id)))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "documents" }, (p: any) => setDocuments(prev => prev.map(d => d.id === p.new.id ? rowToDoc(p.new, matters) : d)))
      .subscribe();
    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") load();
      else if (event === "SIGNED_OUT") setDocuments([]);
    });
    return () => { mounted = false; supabase.removeChannel(ch); authSub.subscription.unsubscribe(); };
  }, [matters]);

  // Upload the actual file to Storage, then record it in the documents table
  const addDocument = useCallback(async (d: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    let storagePath = "";
    let sizeKb = d.sizeKb || 0;

    if (d.file) {
      const file: File = d.file;
      sizeKb = Math.max(1, Math.round(file.size / 1024));
      const folderId = d.matterId || "general";
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      storagePath = `${folderId}/${Date.now()}_${safeName}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, { upsert: false, contentType: file.type || undefined });
      if (upErr) {
        console.error("storage upload:", upErr);
        alert("Could not upload the file: " + upErr.message);
        return;
      }
    }

    const row = docToRow({ ...d, sizeKb, storagePath }, matters);
    if (session) {
      row.uploaded_by = session.user.id;
      const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", session.user.id).single();
      row.uploaded_by_name = prof?.full_name || session.user.email || "";
    }
    const { error } = await supabase.from("documents").insert([row]);
    if (error) {
      console.error("addDocument:", error);
      alert("File uploaded but could not be linked to the matter: " + error.message);
    }
  }, [matters]);

  // Delete the DB record and the stored file (no password check — kept for
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
  }, []);

  // Temporary signed link to view/download a stored file
  const getDownloadUrl = useCallback(async (storagePath: string): Promise<string | null> => {
    if (!storagePath) return null;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 3600);
    if (error) { console.error("signed url:", error); return null; }
    return data?.signedUrl || null;
  }, []);

  const updateDocument = useCallback(async (id: string, updates: any) => {
    const row = docToRow(updates, matters);
    const { error } = await supabase.from("documents").update(row).eq("id", id);
    if (error) console.error("updateDocument:", error);
  }, [matters]);

  return { documents, addDocument, deleteDocument, deleteDocumentWithPassword, renameDocument, reorderDocuments, updateDocument, getDownloadUrl };
}
