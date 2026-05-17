import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

function rowToMessage(row: any, matters: any[]): any {
  const matter = matters.find((m: any) => m.id === row.matter_id);
  return {
    id: row.id,
    matter: matter?.fileNo || "",
    from: row.from_name || "",
    content: row.content || "",
    direction: row.direction || "sent",
    timestamp: row.created_at,
  };
}

export function useSupabaseMessages(matters: any[]) {
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.from("messages").select("*").order("created_at", { ascending: true });
      if (mounted) setMessages((data || []).map((r: any) => rowToMessage(r, matters)));
    };
    load();
    const ch = supabase.channel("messages_changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (p: any) => {
        setMessages(prev => prev.find(m => m.id === p.new.id) ? prev : [...prev, rowToMessage(p.new, matters)]);
      })
      .subscribe();
    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") load();
      else if (event === "SIGNED_OUT") setMessages([]);
    });
    return () => { mounted = false; supabase.removeChannel(ch); authSub.subscription.unsubscribe(); };
  }, [matters]);

  const sendMessage = useCallback(async (msg: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const matter = matters.find((m: any) => m.fileNo === msg.matter);
    const row: any = {
      content: msg.content,
      from_name: msg.from || "Unknown",
      direction: msg.direction || "sent",
    };
    if (matter) row.matter_id = matter.id;
    if (session) row.from_user = session.user.id;
    const { error } = await supabase.from("messages").insert([row]);
    if (error) console.error("sendMessage:", error);
  }, [matters]);

  return { messages, sendMessage };
}
