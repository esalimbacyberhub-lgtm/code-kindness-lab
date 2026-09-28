import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Purchase } from "../types";

function rowToPurchase(row: any): Purchase {
  return {
    id: row.id,
    purchaseDate: row.purchase_date || "",
    supplierName: row.supplier_name || "",
    description: row.description || "",
    category: row.category || "",
    amount: Number(row.amount) || 0,
    vatAmount: Number(row.vat_amount) || 0,
    paid: row.paid !== false,
    matterId: row.matter_id || undefined,
  } as Purchase;
}

function purchaseToRow(p: any): any {
  const row: any = {};
  if (p.purchaseDate !== undefined) row.purchase_date = p.purchaseDate;
  if (p.supplierName !== undefined) row.supplier_name = p.supplierName;
  if (p.description !== undefined) row.description = p.description;
  if (p.category !== undefined) row.category = p.category;
  if (p.amount !== undefined) row.amount = p.amount;
  if (p.vatAmount !== undefined) row.vat_amount = p.vatAmount;
  if (p.paid !== undefined) row.paid = p.paid;
  if (p.matterId !== undefined) row.matter_id = p.matterId;
  return row;
}

export function useSupabasePurchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const { data, error } = await supabase
        .from("purchases")
        .select("*")
        .order("purchase_date", { ascending: false });

      if (!mounted) return;
      if (error) console.error("loadPurchases error:", error);
      setPurchases((data || []).map(rowToPurchase));
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel("purchases_changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "purchases" }, (payload: any) => {
        setPurchases(prev => prev.find(p => p.id === payload.new.id) ? prev : [rowToPurchase(payload.new), ...prev]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "purchases" }, (payload: any) => {
        setPurchases(prev => prev.map(p => p.id === payload.new.id ? rowToPurchase(payload.new) : p));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "purchases" }, (payload: any) => {
        setPurchases(prev => prev.filter(p => p.id !== payload.old.id));
      })
      .subscribe();

    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") load();
      else if (event === "SIGNED_OUT") setPurchases([]);
    });

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
      authSub.subscription.unsubscribe();
    };
  }, []);

  const addPurchase = useCallback(async (purchase: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const row = purchaseToRow(purchase);
    if (session) row.created_by = session.user.id;
    const { error } = await supabase.from("purchases").insert([row]);
    if (error) { console.error("addPurchase:", error); alert("Could not save purchase: " + error.message); }
  }, []);

  const deletePurchase = useCallback(async (id: string) => {
    const { error } = await supabase.from("purchases").delete().eq("id", id);
    if (error) { console.error("deletePurchase:", error); alert("Could not delete purchase: " + error.message); }
  }, []);

  return { purchases, loading, addPurchase, deletePurchase };
}
