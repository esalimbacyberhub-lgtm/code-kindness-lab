import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface CourtRegistry {
  id: string;
  name: string;
  category: string;
  isCustom: boolean;
}

// Map Supabase row (snake_case) → CourtRegistry (camelCase)
function rowToRegistry(row: any): CourtRegistry {
  return {
    id: row.id,
    name: row.name || "",
    category: row.category || "",
    isCustom: row.is_custom || false,
  };
}

export function useCourtRegistries() {
  const [registries, setRegistries] = useState<CourtRegistry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const { data, error } = await supabase
        .from("court_registries")
        .select("*")
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (!mounted) return;
      if (error) console.error("loadCourtRegistries error:", error);
      setRegistries((data || []).map(rowToRegistry));
      setLoading(false);
    };

    load();

    // Real-time subscription — so a custom registry added by one staff
    // member (e.g. a new registry opened this year) shows up live for
    // everyone else without a page refresh
    const channel = supabase
      .channel(`court_registries_changes_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "court_registries" }, (payload: any) => {
        setRegistries(prev => prev.find(r => r.id === payload.new.id) ? prev : [...prev, rowToRegistry(payload.new)]);
      })
      .subscribe();

    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") load();
      else if (event === "SIGNED_OUT") setRegistries([]);
    });

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
      authSub.subscription.unsubscribe();
    };
  }, []);

  // Group registries by category for easy use in a two-level Select
  // (matches Calendar.tsx's COURT_LEVELS -> COURT_STATIONS shape)
  const byCategory = useCallback((): Record<string, string[]> => {
    const map: Record<string, string[]> = {};
    registries.forEach(r => {
      if (!map[r.category]) map[r.category] = [];
      map[r.category].push(r.name);
    });
    return map;
  }, [registries]);

  // Add a new custom registry (staff-only per RLS — e.g. a newly opened
  // court station not yet in the seed list)
  const addCustomRegistry = useCallback(async (name: string, category: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const row: any = { name, category, is_custom: true };
    if (session) row.created_by = session.user.id;
    const { error } = await supabase.from("court_registries").insert([row]);
    if (error) console.error("addCustomRegistry:", error);
  }, []);

  return { registries, loading, byCategory, addCustomRegistry };
}
