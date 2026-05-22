import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

function rowToPayment(row: any): any {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    amount: parseFloat(row.amount) || 0,
    date: row.date,
    method: row.method || "cash",
    note: row.note || "",
  };
}

export function useSupabasePayments() {
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.from("payments").select("*").order("date", { ascending: false });
      if (mounted) setPayments((data || []).map(rowToPayment));
    };
    load();
    const ch = supabase.channel("payments_changes_" + Math.random().toString(36).slice(2))
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => load())
      .subscribe();
    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") load();
      else if (event === "SIGNED_OUT") setPayments([]);
    });
    return () => { mounted = false; supabase.removeChannel(ch); authSub.subscription.unsubscribe(); };
  }, []);

  const addPayment = useCallback(async (p: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const row: any = {
      invoice_id: p.invoiceId,
      amount: p.amount,
      date: p.date,
      method: p.method || "cash",
      note: p.note || "",
    };
    if (session) row.recorded_by = session.user.id;
    const { error } = await supabase.from("payments").insert([row]);
    if (error) { console.error("addPayment:", error); alert("Could not record payment: " + error.message); }
  }, []);

  const deletePayment = useCallback(async (id: string) => {
    const { error } = await supabase.from("payments").delete().eq("id", id);
    if (error) console.error("deletePayment:", error);
  }, []);

  // total received for one invoice
  const paidFor = useCallback((invoiceId: string) =>
    payments.filter(p => p.invoiceId === invoiceId).reduce((s, p) => s + p.amount, 0),
  [payments]);

  return { payments, addPayment, deletePayment, paidFor };
}
