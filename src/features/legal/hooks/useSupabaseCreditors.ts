import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Creditor } from "../types";

function rowToCreditor(row: any): Creditor {
  return {
    id: row.id,
    supplierName: row.supplier_name || "",
    invoiceRef: row.invoice_ref || "",
    amount: Number(row.amount) || 0,
    amountPaid: Number(row.amount_paid) || 0,
    vatAmount: Number(row.vat_amount) || 0,
    dueDate: row.due_date || undefined,
    matterId: row.matter_id || undefined,
    status: row.status || "outstanding",
  } as Creditor;
}

function creditorToRow(c: any): any {
  const row: any = {};
  if (c.supplierName !== undefined) row.supplier_name = c.supplierName;
  if (c.invoiceRef !== undefined) row.invoice_ref = c.invoiceRef;
  if (c.amount !== undefined) row.amount = c.amount;
  if (c.amountPaid !== undefined) row.amount_paid = c.amountPaid;
  if (c.vatAmount !== undefined) row.vat_amount = c.vatAmount;
  if (c.dueDate !== undefined) row.due_date = c.dueDate;
  if (c.matterId !== undefined) row.matter_id = c.matterId;
  if (c.status !== undefined) row.status = c.status;
  return row;
}

export function useSupabaseCreditors() {
  const [creditors, setCreditors] = useState<Creditor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const { data, error } = await supabase
        .from("creditors")
        .select("*")
        .order("created_at", { ascending: false });

      if (!mounted) return;
      if (error) console.error("loadCreditors error:", error);
      setCreditors((data || []).map(rowToCreditor));
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel("creditors_changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "creditors" }, (payload: any) => {
        setCreditors(prev => prev.find(c => c.id === payload.new.id) ? prev : [rowToCreditor(payload.new), ...prev]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "creditors" }, (payload: any) => {
        setCreditors(prev => prev.map(c => c.id === payload.new.id ? rowToCreditor(payload.new) : c));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "creditors" }, (payload: any) => {
        setCreditors(prev => prev.filter(c => c.id !== payload.old.id));
      })
      .subscribe();

    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") load();
      else if (event === "SIGNED_OUT") setCreditors([]);
    });

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
      authSub.subscription.unsubscribe();
    };
  }, []);

  const addCreditor = useCallback(async (creditor: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const row = creditorToRow(creditor);
    if (session) row.created_by = session.user.id;
    const { error } = await supabase.from("creditors").insert([row]);
    if (error) { console.error("addCreditor:", error); alert("Could not save creditor: " + error.message); }
  }, []);

  const updateCreditor = useCallback(async (id: string, updates: any) => {
    const { error } = await supabase.from("creditors").update(creditorToRow(updates)).eq("id", id);
    if (error) { console.error("updateCreditor:", error); alert("Could not update creditor: " + error.message); }
  }, []);

  const deleteCreditor = useCallback(async (id: string) => {
    const { error } = await supabase.from("creditors").delete().eq("id", id);
    if (error) { console.error("deleteCreditor:", error); alert("Could not delete creditor: " + error.message); }
  }, []);

  return { creditors, loading, addCreditor, updateCreditor, deleteCreditor };
}
