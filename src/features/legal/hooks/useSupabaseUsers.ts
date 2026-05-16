import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface UserRow {
  id: string;
  email: string;
  full_name: string;
  role: "partner" | "associate" | "paralegal" | "client";
  phone?: string;
  created_at?: string;
}

export function useSupabaseUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const { data, error } = await supabase
        .from("profiles").select("*").order("created_at", { ascending: false });
      if (!mounted) return;
      if (error) console.error("loadUsers:", error);
      setUsers((data || []) as UserRow[]);
      setLoading(false);
    };
    load();

    const ch = supabase.channel("profiles_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => load())
      .subscribe();
    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") load();
      else if (event === "SIGNED_OUT") setUsers([]);
    });
    return () => { mounted = false; supabase.removeChannel(ch); authSub.subscription.unsubscribe(); };
  }, []);

  const updateUser = useCallback(async (id: string, updates: Partial<UserRow>) => {
    const { error } = await supabase.from("profiles").update(updates).eq("id", id);
    if (error) { console.error("updateUser:", error); alert("Could not update: " + error.message); }
  }, []);

  const deleteUser = useCallback(async (id: string) => {
    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (error) console.error("deleteUser:", error);
  }, []);

  const linkClientToMatter = useCallback(async (matterId: string, clientUserId: string) => {
    const { error } = await supabase.from("matters").update({ client_user_id: clientUserId }).eq("id", matterId);
    if (error) console.error("linkClientToMatter:", error);
  }, []);

  return { users, loading, updateUser, deleteUser, linkClientToMatter };
}
