import { useCallback } from "react";
import { supabase } from "@/lib/supabase";

export type MilestoneType =
  | "plaint_filed"
  | "appearance_entered"
  | "defence_served"
  | "judgment_delivered";

export function useCaseMilestones() {
  const addMilestone = useCallback(async (
    matterId: string,
    milestoneType: MilestoneType,
    eventDate: string,
    includesCounterclaim = false,
  ) => {
    const { data: { session } } = await supabase.auth.getSession();
    const row: any = {
      matter_id: matterId,
      milestone_type: milestoneType,
      event_date: eventDate,
      includes_counterclaim: includesCounterclaim,
    };
    if (session) row.recorded_by = session.user.id;
    const { error } = await supabase.from("case_milestones").insert([row]);
    if (error) {
      console.error("addMilestone:", error);
      alert("Could not record milestone: " + error.message);
      return false;
    }
    return true;
  }, []);

  return { addMilestone };
}
