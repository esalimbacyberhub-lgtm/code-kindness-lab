import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

function rowToInvoice(row: any, matters: any[]): any {
  const matter = matters.find((m: any) => m.id === row.matter_id);
  return {
    id: row.id,
    invoiceNo: row.invoice_no,
    date: row.date,
    dueDate: row.due_date,
    paidDate: row.paid_date,
    client: row.client_name || "",
    matter: matter?.fileNo || "",
    totalAmount: parseFloat(row.total_amount) || 0,
    status: row.status || "draft",
    sourceFeeNoteId: row.source_fee_note_id || null,
    lineItems: row.line_items || [],
  };
}

function invoiceToRow(i: any, matters: any[]): any {
  const row: any = {};
  if (i.invoiceNo !== undefined) row.invoice_no = i.invoiceNo;
  if (i.date !== undefined) row.date = i.date;
  if (i.dueDate !== undefined) row.due_date = i.dueDate;
  if (i.paidDate !== undefined) row.paid_date = i.paidDate;
  if (i.client !== undefined) row.client_name = i.client;
  if (i.totalAmount !== undefined) row.total_amount = i.totalAmount;
  if (i.status !== undefined) row.status = i.status;
  if (i.lineItems !== undefined) row.line_items = i.lineItems;
  if (i.sourceFeeNoteId !== undefined) row.source_fee_note_id = i.sourceFeeNoteId;
  if (i.matter !== undefined) {
    const m = matters.find((mm: any) => mm.fileNo === i.matter);
    if (m) row.matter_id = m.id;
  }
  return row;
}

export function useSupabaseInvoices(matters: any[]) {
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.from("invoices").select("*").order("date", { ascending: false });
      if (mounted) setInvoices((data || []).map((r: any) => rowToInvoice(r, matters)));
    };
    load();
    const ch = supabase.channel("invoices_changes_" + Math.random().toString(36).slice(2))
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, () => load())
      .subscribe();
    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") load();
      else if (event === "SIGNED_OUT") setInvoices([]);
    });
    return () => { mounted = false; supabase.removeChannel(ch); authSub.subscription.unsubscribe(); };
  }, [matters]);

  const addInvoice = useCallback(async (inv: any) => {
    const row = invoiceToRow(inv, matters);
    const { error } = await supabase.from("invoices").insert([row]);
    if (error) { console.error("addInvoice:", error); alert("Could not save the invoice: " + error.message); return false; }
    return true;
  }, [matters]);

  const updateInvoice = useCallback(async (id: string, updates: any) => {
    const { error } = await supabase.from("invoices").update(invoiceToRow(updates, matters)).eq("id", id);
    if (error) console.error("updateInvoice:", error);
  }, [matters]);

  const deleteInvoice = useCallback(async (id: string) => {
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) console.error("deleteInvoice:", error);
  }, []);

  return { invoices, addInvoice, updateInvoice, deleteInvoice };
}
