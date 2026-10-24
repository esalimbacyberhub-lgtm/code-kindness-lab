import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface CaseActivity {
  id: string;
  matterId: string;
  activityType: string;
  activityDate: string;
  courtRoom: string;
  actionedTo: string;
  outcome: string;
  nextDate: string;
  clientVisible: boolean;
  draftPath?: string;
  draftName?: string;
  createdAt: string;
}

// Preset activity types for litigious matters — matches the spec exactly
export const LITIGIOUS_ACTIVITY_TYPES = [
  "Receipt of initial instructions",
  "Court filing",
  "Mention",
  "Interparty hearing",
  "Drafting",
  "Ruling",
  "Hearings",
  "Judgment",
];

function rowToActivity(row: any): CaseActivity {
  return {
    id: row.id,
    matterId: row.matter_id,
    activityType: row.activity_type || "",
    activityDate: row.activity_date || "",
    courtRoom: row.court_room || "",
    actionedTo: row.actioned_to || "",
    outcome: row.outcome || "",
    nextDate: row.next_date || "",
    clientVisible: row.client_visible === true,
    draftPath: row.draft_path || "",
    draftName: row.draft_name || "",
    createdAt: row.created_at || "",
  };
}

export function useSupabaseCaseActivities(matterId: string | null) {
  const [activities, setActivities] = useState<CaseActivity[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!matterId) { setActivities([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("case_activities")
      .select("*")
      .eq("matter_id", matterId)
      .order("activity_date", { ascending: false });
    if (error) {
      console.error("fetch case_activities:", error);
      setActivities([]);
    } else {
      setActivities((data || []).map(rowToActivity));
    }
    setLoading(false);
  }, [matterId]);

  useEffect(() => { refetch(); }, [refetch]);

  useEffect(() => {
    if (!matterId) return;
    const channel = supabase
      .channel(`case_activities_changes_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "case_activities", filter: `matter_id=eq.${matterId}` }, () => {
        refetch();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [matterId, refetch]);

  const addActivity = useCallback(async (a: Omit<CaseActivity, "id" | "matterId" | "createdAt">) => {
    if (!matterId) return null;
    const { data: { session } } = await supabase.auth.getSession();
    const row: any = {
      matter_id: matterId,
      activity_type: a.activityType,
      activity_date: a.activityDate,
      court_room: a.courtRoom || null,
      actioned_to: a.actionedTo || null,
      outcome: a.outcome || null,
      next_date: a.nextDate || null,
      client_visible: a.clientVisible,
    };
    if (session) row.created_by = session.user.id;
    const { data, error } = await supabase.from("case_activities").insert([row]).select().single();
    if (error) { console.error("addActivity:", error); alert("Could not save activity: " + error.message); return null; }
    await refetch();
    return data ? rowToActivity(data) : null;
  }, [matterId, refetch]);

  const updateActivity = useCallback(async (id: string, updates: Partial<CaseActivity>) => {
    const row: any = {};
    if (updates.activityType !== undefined) row.activity_type = updates.activityType;
    if (updates.activityDate !== undefined) row.activity_date = updates.activityDate;
    if (updates.courtRoom !== undefined) row.court_room = updates.courtRoom;
    if (updates.actionedTo !== undefined) row.actioned_to = updates.actionedTo;
    if (updates.outcome !== undefined) row.outcome = updates.outcome;
    if (updates.nextDate !== undefined) row.next_date = updates.nextDate;
    if (updates.clientVisible !== undefined) row.client_visible = updates.clientVisible;
    const { error } = await supabase.from("case_activities").update(row).eq("id", id);
    if (error) { console.error("updateActivity:", error); alert("Could not update activity: " + error.message); }
    await refetch();
  }, [refetch]);

  const deleteActivity = useCallback(async (id: string) => {
    const { data: drow } = await supabase.from("case_activities").select("draft_path").eq("id", id).single();
    if (drow?.draft_path) await supabase.storage.from("matter-documents").remove([drow.draft_path]);
    const { error } = await supabase.from("case_activities").delete().eq("id", id);
    if (error) console.error("deleteActivity:", error);
    await refetch();
  }, [refetch]);

  // Upload (or replace) the draft file attached to an activity
  const uploadDraft = useCallback(async (id: string, file: File): Promise<boolean> => {
    if (!matterId) return false;
    const safe = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${matterId}/activity-drafts/${id}_${Date.now()}_${safe}`;
    const { data: prev } = await supabase.from("case_activities").select("draft_path").eq("id", id).single();
    const { error: upErr } = await supabase.storage
      .from("matter-documents")
      .upload(path, file, { upsert: false, contentType: file.type || undefined });
    if (upErr) { alert("Could not upload the draft: " + upErr.message); return false; }
    const { error } = await supabase.from("case_activities")
      .update({ draft_path: path, draft_name: file.name }).eq("id", id);
    if (error) {
      await supabase.storage.from("matter-documents").remove([path]);
      alert("Could not attach the draft: " + error.message);
      return false;
    }
    if (prev?.draft_path) await supabase.storage.from("matter-documents").remove([prev.draft_path]);
    await refetch();
    return true;
  }, [matterId, refetch]);

  const getDraftUrl = useCallback(async (path: string): Promise<string | null> => {
    const { data, error } = await supabase.storage.from("matter-documents").createSignedUrl(path, 3600);
    if (error) { alert("Could not open the draft: " + error.message); return null; }
    return data?.signedUrl ?? null;
  }, []);

  return { activities, loading, addActivity, updateActivity, deleteActivity, uploadDraft, getDraftUrl };
}
