import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface AvailabilitySlot {
  date: string;
  time: string | null;
  endTime: string | null;
}

export function useLawyerAvailability(matterId: string | undefined) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!matterId) { setSlots([]); return; }
    let mounted = true;
    setLoading(true);
    setError(null);

    supabase
      .rpc("get_assigned_lawyer_availability", { p_matter_id: matterId })
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) {
          console.error("useLawyerAvailability:", error);
          setError(error.message);
          setSlots([]);
        } else {
          setSlots((data || []).map((row: any) => ({
            date: row.event_date,
            time: row.event_time,
            endTime: row.event_end_time,
          })));
        }
        setLoading(false);
      });

    return () => { mounted = false; };
  }, [matterId]);

  return { slots, loading, error };
}
