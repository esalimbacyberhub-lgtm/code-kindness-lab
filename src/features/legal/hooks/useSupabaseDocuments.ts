import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

const BUCKET = "matter-documents";

function rowToDoc(row: any, matters: any[]): any {
  const matter = matters.find((m: any) => m.id === row.matter_id);
  return {
    id: row.id,
    name: row.name || "",
    folder: row.folder || "",
    uploadedBy: row.uploaded_by || "",
    date: row.date,
    sizeKb: row.size_kb || 0,
    url: row.url || "",
    storagePath: row.storage_path || "",
    matterId: row.matter_id || null,
    matter: matter?.fileNo || "General",
  };
}

function docToRow(d: any, matters: any[]): any {
  const row: any = {};
  if (d.name !== undefined) row.name = d.name;
  if (d.folder !== undefined) row.folder = d.folder;
  if (d.sizeKb !== undefined) row.size_kb = d.sizeKb;
  if (d.url !== undefined) row.url = d.url;
  if (d.storagePath !== undefined) row.storage_path = d.storagePath;
  if (d.date !== undefined) row.date = d.date;
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
    const ch = supabase.channel("documents_changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "documents" }, (p: any) => setDocuments(prev => prev.find(d => d.id === p.new.id) ? prev : [rowToDoc(p.new, matters), ...prev]))
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "documents" }, (p: any) => setDocuments(prev => prev.filter(d => d.id !== p.old.id)))
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
    if (session) row.uploaded_by = session.user.id;
    const { error } = await supabase.from("documents").insert([row]);
    if (error) {
      console.error("addDocument:", error);
      alert("File uploaded but could not be linked to the matter: " + error.message);
    }
  }, [matters]);

  // Delete the DB record and the stored file
  const deleteDocument = useCallback(async (id: string) => {
    const { data: row } = await supabase.from("documents").select("storage_path").eq("id", id).single();
    if (row?.storage_path) {
      const { error: rmErr } = await supabase.storage.from(BUCKET).remove([row.storage_path]);
      if (rmErr) console.error("storage remove:", rmErr);
    }
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) console.error("deleteDocument:", error);
  }, []);

  // Temporary signed link to view/download a stored file
  const getDownloadUrl = useCallback(async (storagePath: string): Promise<string | null> => {
    if (!storagePath) return null;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 3600);
    if (error) { console.error("signed url:", error); return null; }
    return data?.signedUrl || null;
  }, []);

  return { documents, addDocument, deleteDocument, getDownloadUrl };
}
