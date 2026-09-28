import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { AccountBalance } from "../types";

export function useSupabaseLedger() {
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    const { data: accounts, error: acctErr } = await supabase
      .from("chart_of_accounts")
      .select("*")
      .order("code");

    if (acctErr) { console.error("loadAccounts error:", acctErr); setLoading(false); return; }

    const { data: lines, error: lineErr } = await supabase
      .from("journal_lines")
      .select("account_id, debit, credit");

    if (lineErr) { console.error("loadJournalLines error:", lineErr); setLoading(false); return; }

    const result: AccountBalance[] = (accounts || []).map((a: any) => {
      const acctLines = (lines || []).filter((l: any) => l.account_id === a.id);
      const totalDebit = acctLines.reduce((sum: number, l: any) => sum + Number(l.debit), 0);
      const totalCredit = acctLines.reduce((sum: number, l: any) => sum + Number(l.credit), 0);
      return {
        id: a.id,
        code: a.code,
        name: a.name,
        type: a.type,
        debit: totalDebit,
        credit: totalCredit,
        balance: totalDebit - totalCredit,
      };
    });

    setBalances(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    load();

    const channel = supabase
      .channel("journal_lines_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "journal_lines" }, () => {
        if (mounted) load();
      })
      .subscribe();

    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") load();
      else if (event === "SIGNED_OUT") setBalances([]);
    });

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
      authSub.subscription.unsubscribe();
    };
  }, [load]);

  return { balances, loading };
}
