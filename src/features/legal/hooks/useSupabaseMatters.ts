import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Matter } from "../types";

// Map Supabase row (snake_case) → Matter (camelCase)
function rowToMatter(row: any): Matter {
  return {
    id: row.id,
    fileNo: row.file_no || "",
    title: row.title || "",
    type: row.type || "",
    client: row.client_name || "",
    clientUserId: row.client_user_id || undefined,
    partyA: row.party_a || "",
    partyB: row.party_b || "",
    court: row.court || "",
    openedDate: row.opened_date || "",
    status: row.status || "active",
    caseStatus: row.case_status || "pending",
    nextHearingDate: row.next_hearing_date || undefined,
    result: row.result || undefined,
    resultNote: row.result_note || undefined,
    resultDate: row.result_date || undefined,
    notes: row.notes || undefined,
    folders: row.folders || [],
    assignedTo: row.assigned_to || undefined,
  } as any;
}

// Map Matter → Supabase row (only set defined fields)
function matterToRow(matter: any): any {
  const row: any = {};
  if (matter.fileNo !== undefined) row.file_no = matter.fileNo;
  if (matter.title !== undefined) row.title = matter.title;
  if (matter.type !== undefined) row.type = matter.type;
  if (matter.client !== undefined) row.client_name = matter.client;
  if (matter.clientUserId !== undefined) row.client_user_id = matter.clientUserId;
  if (matter.partyA !== undefined) row.party_a = matter.partyA;
  if (matter.partyB !== undefined) row.party_b = matter.partyB;
  if (matter.court !== undefined) row.court = matter.court;
  if (matter.openedDate !== undefined) row.opened_date = matter.openedDate;
  if (matter.status !== undefined) row.status = matter.status;
  if (matter.caseStatus !== undefined) row.case_status = matter.caseStatus;
  if (matter.nextHearingDate !== undefined) row.next_hearing_date = matter.nextHearingDate;
  if (matter.result !== undefined) row.result = matter.result;
  if (matter.resultNote !== undefined) row.result_note = matter.resultNote;
  if (matter.resultDate !== undefined) row.result_date = matter.resultDate;
  if (matter.notes !== undefined) row.notes = matter.notes;
  if (matter.folders !== undefined) row.folders = matter.folders;
  if (matter.assignedTo !== undefined) row.assigned_to = matter.assignedTo;
  return row;
}

export function useSupabaseMatters() {
  const [matters, setMatters] = useState<Matter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const { data, error } = await supabase
        .from("matters")
        .select("*")
        .order("created_at", { ascending: false });

      if (!mounted) return;
      if (error) console.error("loadMatters error:", error);
      setMatters((data || []).map(rowToMatter));
      setLoading(false);
    };

    load();

    // Real-time subscription
    const channel = supabase
      .channel("matters_changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "matters" }, (payload: any) => {
        setMatters(prev => prev.find(m => m.id === payload.new.id) ? prev : [rowToMatter(payload.new), ...prev]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "matters" }, (payload: any) => {
        setMatters(prev => prev.map(m => m.id === payload.new.id ? rowToMatter(payload.new) : m));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "matters" }, (payload: any) => {
        setMatters(prev => prev.filter(m => m.id !== payload.old.id));
      })
      .subscribe();

    // Re-load when auth changes
    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") load();
      else if (event === "SIGNED_OUT") setMatters([]);
    });

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
      authSub.subscription.unsubscribe();
    };
  }, []);

  const addMatter = useCallback(async (matter: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const row = matterToRow(matter);
    if (session) row.created_by = session.user.id;
    const { data, error } = await supabase.from("matters").insert([row]).select("id").single();
    if (error) { console.error("addMatter:", error); alert("Could not save matter: " + error.message); return null; }
    return (data?.id as string | undefined) ?? null;
  }, []);

  const updateMatter = useCallback(async (id: string, updates: any) => {
    const { error } = await supabase.from("matters").update(matterToRow(updates)).eq("id", id);
    if (error) { console.error("updateMatter:", error); alert("Could not update matter: " + error.message); }
  }, []);

  const deleteMatter = useCallback(async (id: string) => {
    const { error } = await supabase.from("matters").delete().eq("id", id);
    if (error) { console.error("deleteMatter:", error); alert("Could not delete matter: " + error.message); }
  }, []);

  // Password-gated matter delete — same security_settings-backed check used
  // for folders and documents.
  const deleteMatterWithPassword = useCallback(async (id: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    const { error } = await supabase.rpc("delete_matter_with_password", {
      p_matter_id: id,
      p_password: password,
    });
    if (error) {
      return { ok: false, error: error.message || "Failed to delete matter" };
    }
    return { ok: true };
  }, []);

  const assignMatter = useCallback(async (id: string, assigneeId: string) => {
    const { error } = await supabase.from("matters").update({ assigned_to: assigneeId }).eq("id", id);
    if (error) console.error("assignMatter:", error);
  }, []);

  return { matters, loading, addMatter, updateMatter, deleteMatter, deleteMatterWithPassword, assignMatter };
}
