import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

function rowToNote(row: any): any {
  return {
    id: row.id,
    date: row.date,
    category: row.category || "general",
    title: row.title,
    body: row.body,
    relatedRef: row.related_ref || "",
    createdAt: row.created_at,
  };
}

function noteToRow(n: any): any {
  const row: any = {};
  if (n.date !== undefined) row.date = n.date;
  if (n.category !== undefined) row.category = n.category;
  if (n.title !== undefined) row.title = n.title;
  if (n.body !== undefined) row.body = n.body;
  if (n.relatedRef !== undefined) row.related_ref = n.relatedRef;
  return row;
}

export function useSupabaseFinancialNotes() {
  const [notes, setNotes] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.from("financial_notes").select("*").order("created_at", { ascending: false });
      if (mounted) setNotes((data || []).map(rowToNote));
    };
    load();
    const ch = supabase.channel("financial_notes_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "financial_notes" }, () => load())
      .subscribe();
    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") load();
      else if (event === "SIGNED_OUT") setNotes([]);
    });
    return () => { mounted = false; supabase.removeChannel(ch); authSub.subscription.unsubscribe(); };
  }, []);

  const addNote = useCallback(async (n: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const row = noteToRow(n);
    if (session) row.created_by = session.user.id;
    const { error } = await supabase.from("financial_notes").insert([row]);
    if (error) console.error("addNote:", error);
  }, []);

  const updateNote = useCallback(async (id: string, updates: any) => {
    const { error } = await supabase.from("financial_notes").update(noteToRow(updates)).eq("id", id);
    if (error) console.error("updateNote:", error);
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    const { error } = await supabase.from("financial_notes").delete().eq("id", id);
    if (error) console.error("deleteNote:", error);
  }, []);

  return { notes, addNote, updateNote, deleteNote };
}
