import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { AccountBalance } from "../types";

// Optional date range (inclusive, YYYY-MM-DD). Omit for an all-time (cumulative)
// balance — used by Trial Balance. Pass one for a period balance — used by VAT
// Analysis, since VAT returns are filed monthly and "you owe KRA" must reflect
// only that period's Output/Input VAT, not the running total since day one.
export function useSupabaseLedger(range?: { from: string; to: string }) {
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

    let entryIds: string[] = [];
    const filterByEntries = !!range;
    if (range) {
      const { data: entries, error: entryErr } = await supabase
        .from("journal_entries")
        .select("id")
        .gte("entry_date", range.from)
        .lte("entry_date", range.to);
      if (entryErr) { console.error("loadJournalEntries error:", entryErr); setLoading(false); return; }
      entryIds = (entries || []).map((e: any) => e.id);
      if (entryIds.length === 0) {
        setBalances((accounts || []).map((a: any) => ({
          id: a.id, code: a.code, name: a.name, type: a.type, debit: 0, credit: 0, balance: 0,
        })));
        setLoading(false);
        return;
      }
    }

    let lineQuery = supabase.from("journal_lines").select("account_id, debit, credit, entry_id");
    if (filterByEntries) lineQuery = lineQuery.in("entry_id", entryIds);
    const { data: lines, error: lineErr } = await lineQuery;

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
  }, [range?.from, range?.to]);

  useEffect(() => {
    let mounted = true;
    load();

    // Unique per hook instance — AccountsHub calls this hook twice (all-time for
    // Trial Balance, one month-filtered for VAT), and two channels with the same
    // name collide in Supabase realtime.
    const channelName = `journal_lines_changes_${range ? range.from + "_" + range.to : "all"}`;
    const channel = supabase
      .channel(channelName)
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
