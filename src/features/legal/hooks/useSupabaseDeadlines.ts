import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Deadline } from "../types";

function rowToDeadline(row: any, matters: any[]): Deadline {
  const matter = matters.find((m: any) => m.id === row.matter_id);
  return {
    id: row.id,
    title: row.title || "",
    type: row.type || "",
    court: row.court || "",
    date: row.date,
    time: row.time || "",
    mode: row.mode || "physical",
    meetingLink: row.meeting_link || undefined,
    judge: row.judge || "",
    summary: row.summary || "",
    matter: matter?.fileNo || "General",
    matterId: matter?.id || undefined,
  } as Deadline;
}

function deadlineToRow(d: any, matters: any[]): any {
  const row: any = {};
  if (d.title !== undefined) row.title = d.title;
  if (d.type !== undefined) row.type = d.type;
  if (d.court !== undefined) row.court = d.court;
  if (d.date !== undefined) row.date = d.date;
  if (d.time !== undefined) row.time = d.time;
  if (d.mode !== undefined) row.mode = d.mode;
  if (d.meetingLink !== undefined) row.meeting_link = d.meetingLink;
  if (d.judge !== undefined) row.judge = d.judge;
  if (d.summary !== undefined) row.summary = d.summary;
  if (d.matter !== undefined && d.matter !== "General") {
    const m = matters.find((mm: any) => mm.fileNo === d.matter);
    if (m) row.matter_id = m.id;
  }
  return row;
}

export function useSupabaseDeadlines(matters: any[]) {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const { data, error } = await supabase
        .from("deadlines").select("*").order("date", { ascending: true });
      if (!mounted) return;
      if (error) console.error("loadDeadlines:", error);
      setDeadlines((data || []).map((r: any) => rowToDeadline(r, matters)));
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel("deadlines_changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "deadlines" }, (p: any) => {
        setDeadlines(prev => prev.find(d => d.id === p.new.id) ? prev : [...prev, rowToDeadline(p.new, matters)]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "deadlines" }, (p: any) => {
        setDeadlines(prev => prev.map(d => d.id === p.new.id ? rowToDeadline(p.new, matters) : d));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "deadlines" }, (p: any) => {
        setDeadlines(prev => prev.filter(d => d.id !== p.old.id));
      })
      .subscribe();

    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") load();
      else if (event === "SIGNED_OUT") setDeadlines([]);
    });

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
      authSub.subscription.unsubscribe();
    };
  }, [matters]);

  const addDeadline = useCallback(async (d: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const row = deadlineToRow(d, matters);
    if (session) row.created_by = session.user.id;
    const { error } = await supabase.from("deadlines").insert([row]);
    if (error) { console.error("addDeadline:", error); alert("Could not save deadline: " + error.message); }
  }, [matters]);

  const deleteDeadline = useCallback(async (id: string) => {
    const { error } = await supabase.from("deadlines").delete().eq("id", id);
    if (error) console.error("deleteDeadline:", error);
  }, []);

  const updateDeadline = useCallback(async (id: string, updates: any) => {
    const row = deadlineToRow(updates, matters);
    const { error } = await supabase.from("deadlines").update(row).eq("id", id);
    if (error) { console.error("updateDeadline:", error); alert("Could not update: " + error.message); }
  }, [matters]);

  return { deadlines, loading, addDeadline, deleteDeadline, updateDeadline };
}
