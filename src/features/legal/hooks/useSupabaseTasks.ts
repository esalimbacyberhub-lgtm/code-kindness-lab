import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface MatterLike { id: string; fileNo?: string; title?: string }

function rowToTask(row: any, matters: MatterLike[] = []): any {
  const matter = matters.find(m => m.id === row.matter_id);
  const status = row.status === "in-progress" ? "inprogress" : (row.status || "todo");
  const priority = row.priority === "normal" ? "medium" : (row.priority || "medium");
  const due = row.due_date || "";
  return {
    id: row.id,
    title: row.title || "",
    description: row.description || "",
    matter: matter ? (matter.title || matter.fileNo || "") : "",
    matterId: row.matter_id || null,
    assignedTo: row.assigned_to || "",
    status,
    priority,
    due,
    dueDate: due,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function taskToRow(t: any, matters: MatterLike[] = []): any {
  const row: any = {};
  if (t.title !== undefined) row.title = t.title;
  if (t.description !== undefined) row.description = t.description;
  if (t.matterId !== undefined) row.matter_id = t.matterId || null;
  if (t.matter !== undefined && !t.matterId) {
    if (!t.matter) row.matter_id = null;
    else if (matters.length) {
      const m = matters.find(mm => mm.fileNo === t.matter || mm.title === t.matter);
      if (m) row.matter_id = m.id;
    }
  }
  if (t.assignedTo !== undefined) row.assigned_to = t.assignedTo || null;
  if (t.status !== undefined) row.status = t.status === "inprogress" ? "in-progress" : t.status;
  if (t.priority !== undefined) row.priority = t.priority === "medium" ? "normal" : t.priority;
  if (t.due !== undefined) row.due_date = t.due || null;
  if (t.dueDate !== undefined) row.due_date = t.dueDate || null;
  return row;
}

export function useSupabaseTasks(matters: MatterLike[] = []) {
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    supabase.from("tasks").select("*").order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error("[tasks load]", error);
        if (mounted && data) setTasks(data.map(r => rowToTask(r, matters)));
      });
    return () => { mounted = false; };
  }, [matters.length]);

  useEffect(() => {
    const chan = supabase.channel("tasks-changes-" + Math.random().toString(36).slice(2))
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, (payload: any) => {
        if (payload.eventType === "INSERT") {
          setTasks(prev => prev.some(t => t.id === payload.new.id) ? prev : [rowToTask(payload.new, matters), ...prev]);
        } else if (payload.eventType === "UPDATE") {
          setTasks(prev => prev.map(t => t.id === payload.new.id ? rowToTask(payload.new, matters) : t));
        } else if (payload.eventType === "DELETE") {
          setTasks(prev => prev.filter(t => t.id !== payload.old.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(chan); };
  }, [matters]);

  const addTask = useCallback(async (t: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    const row = { ...taskToRow(t, matters), created_by: user?.id };
    const { data, error } = await supabase.from("tasks").insert(row).select().single();
    if (error) { console.error("[addTask]", error); return null; }
    return data ? rowToTask(data, matters) : null;
  }, [matters]);

  const updateTask = useCallback(async (id: string, updates: any) => {
    const { error } = await supabase.from("tasks").update(taskToRow(updates, matters)).eq("id", id);
    if (error) console.error("[updateTask]", error);
  }, [matters]);

  const moveTask = useCallback(async (id: string, status: string) => {
    const dbStatus = status === "inprogress" ? "in-progress" : status;
    const { error } = await supabase.from("tasks").update({ status: dbStatus }).eq("id", id);
    if (error) console.error("[moveTask]", error);
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) console.error("[deleteTask]", error);
  }, []);

  return { tasks, addTask, updateTask, moveTask, deleteTask };
}
