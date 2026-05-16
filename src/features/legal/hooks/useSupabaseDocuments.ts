import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

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
    matter: matter?.fileNo || "General",
  };
}

function docToRow(d: any, matters: any[]): any {
  const row: any = {};
  if (d.name !== undefined) row.name = d.name;
  if (d.folder !== undefined) row.folder = d.folder;
  if (d.sizeKb !== undefined) row.size_kb = d.sizeKb;
  if (d.url !== undefined) row.url = d.url;
  if (d.date !== undefined) row.date = d.date;
  if (d.matter !== undefined && d.matter !== "General") {
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

  const addDocument = useCallback(async (d: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const row = docToRow(d, matters);
    if (session) row.uploaded_by = session.user.id;
    const { error } = await supabase.from("documents").insert([row]);
    if (error) console.error("addDocument:", error);
  }, [matters]);

  const deleteDocument = useCallback(async (id: string) => {
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) console.error("deleteDocument:", error);
  }, []);

  return { documents, addDocument, deleteDocument };
}
