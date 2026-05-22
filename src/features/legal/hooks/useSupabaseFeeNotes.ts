import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

function rowToFn(row: any, matters: any[]): any {
  const matter = matters.find((m: any) => m.id === row.matter_id);
  return {
    id: row.id,
    feeNoteNo: row.fee_note_no,
    date: row.date,
    dueDate: row.due_date || "",
    client: row.client_name || "",
    matter: matter?.fileNo || "",
    totalAmount: parseFloat(row.total_amount) || 0,
    total: parseFloat(row.total_amount) || 0,
    status: row.status || "draft",
    lineItems: row.line_items || [],
  };
}

function fnToRow(fn: any, matters: any[]): any {
  const row: any = {};
  if (fn.feeNoteNo !== undefined) row.fee_note_no = fn.feeNoteNo;
  if (fn.date !== undefined) row.date = fn.date;
  if (fn.dueDate !== undefined && fn.dueDate !== "") row.due_date = fn.dueDate;
  if (fn.client !== undefined) row.client_name = fn.client;
  if (fn.totalAmount !== undefined) row.total_amount = fn.totalAmount;
  if (fn.total !== undefined) row.total_amount = fn.total;
  if (fn.status !== undefined) row.status = fn.status;
  if (fn.lineItems !== undefined) row.line_items = fn.lineItems;
  if (fn.matter !== undefined) {
    const m = matters.find((mm: any) => mm.fileNo === fn.matter);
    if (m) row.matter_id = m.id;
  }
  return row;
}

export function useSupabaseFeeNotes(matters: any[] = []) {
  const [feeNotes, setFeeNotes] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.from("fee_notes").select("*").order("date", { ascending: false });
      if (mounted) setFeeNotes((data || []).map((r: any) => rowToFn(r, matters)));
    };
    load();
    const ch = supabase.channel("fee_notes_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "fee_notes" }, () => load())
      .subscribe();
    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") load();
      else if (event === "SIGNED_OUT") setFeeNotes([]);
    });
    return () => { mounted = false; supabase.removeChannel(ch); authSub.subscription.unsubscribe(); };
  }, [matters]);

  const addFeeNote = useCallback(async (fn: any) => {
    const { error } = await supabase.from("fee_notes").insert([fnToRow(fn, matters)]);
    if (error) console.error("addFeeNote:", error);
  }, [matters]);

  const updateFeeNote = useCallback(async (id: string, updates: any) => {
    const { error } = await supabase.from("fee_notes").update(fnToRow(updates, matters)).eq("id", id);
    if (error) console.error("updateFeeNote:", error);
  }, [matters]);

  const deleteFeeNote = useCallback(async (id: string) => {
    const { error } = await supabase.from("fee_notes").delete().eq("id", id);
    if (error) console.error("deleteFeeNote:", error);
  }, []);

  return { feeNotes, addFeeNote, updateFeeNote, deleteFeeNote };
}
