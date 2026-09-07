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
    const { error } = await supabase.from("case_activities").delete().eq("id", id);
    if (error) console.error("deleteActivity:", error);
    await refetch();
  }, [refetch]);

  return { activities, loading, addActivity, updateActivity, deleteActivity };
}
