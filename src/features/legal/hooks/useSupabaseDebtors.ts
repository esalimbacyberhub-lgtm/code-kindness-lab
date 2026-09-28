import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Debtor } from "../types";

function rowToDebtor(row: any): Debtor {
  return {
    id: row.id,
    clientName: row.client_name || "",
    invoiceRef: row.invoice_ref || "",
    amount: Number(row.amount) || 0,
    amountReceived: Number(row.amount_received) || 0,
    vatAmount: Number(row.vat_amount) || 0,
    dueDate: row.due_date || undefined,
    matterId: row.matter_id || undefined,
    status: row.status || "outstanding",
  } as Debtor;
}

function debtorToRow(d: any): any {
  const row: any = {};
  if (d.clientName !== undefined) row.client_name = d.clientName;
  if (d.invoiceRef !== undefined) row.invoice_ref = d.invoiceRef;
  if (d.amount !== undefined) row.amount = d.amount;
  if (d.amountReceived !== undefined) row.amount_received = d.amountReceived;
  if (d.vatAmount !== undefined) row.vat_amount = d.vatAmount;
  if (d.dueDate !== undefined) row.due_date = d.dueDate;
  if (d.matterId !== undefined) row.matter_id = d.matterId;
  if (d.status !== undefined) row.status = d.status;
  return row;
}

export function useSupabaseDebtors() {
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const { data, error } = await supabase
        .from("debtors")
        .select("*")
        .order("created_at", { ascending: false });

      if (!mounted) return;
      if (error) console.error("loadDebtors error:", error);
      setDebtors((data || []).map(rowToDebtor));
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel("debtors_changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "debtors" }, (payload: any) => {
        setDebtors(prev => prev.find(d => d.id === payload.new.id) ? prev : [rowToDebtor(payload.new), ...prev]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "debtors" }, (payload: any) => {
        setDebtors(prev => prev.map(d => d.id === payload.new.id ? rowToDebtor(payload.new) : d));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "debtors" }, (payload: any) => {
        setDebtors(prev => prev.filter(d => d.id !== payload.old.id));
      })
      .subscribe();

    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") load();
      else if (event === "SIGNED_OUT") setDebtors([]);
    });

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
      authSub.subscription.unsubscribe();
    };
  }, []);

  const addDebtor = useCallback(async (debtor: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const row = debtorToRow(debtor);
    if (session) row.created_by = session.user.id;
    const { error } = await supabase.from("debtors").insert([row]);
    if (error) { console.error("addDebtor:", error); alert("Could not save debtor: " + error.message); }
  }, []);

  const updateDebtor = useCallback(async (id: string, updates: any) => {
    const { error } = await supabase.from("debtors").update(debtorToRow(updates)).eq("id", id);
    if (error) { console.error("updateDebtor:", error); alert("Could not update debtor: " + error.message); }
  }, []);

  const deleteDebtor = useCallback(async (id: string) => {
    const { error } = await supabase.from("debtors").delete().eq("id", id);
    if (error) { console.error("deleteDebtor:", error); alert("Could not delete debtor: " + error.message); }
  }, []);

  return { debtors, loading, addDebtor, updateDebtor, deleteDebtor };
}
