import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type AccountType = "asset" | "liability" | "equity" | "income" | "expense";

export interface LedgerAccount { id: string; code: string; name: string; type: AccountType; }
export interface JournalLine { account_id: string; debit: number; credit: number; }
export interface JournalEntry {
  id: string; entry_date: string; description: string;
  matter_id: string | null; source: string; lines: JournalLine[];
}
export interface SaveEntryInput {
  id: string | null; date: string; description: string;
  matterId: string | null; lines: JournalLine[];
}

// Reads the same tables as the Accounts page (chart_of_accounts, journal_entries,
// journal_lines). All writes go through the SQL functions from 03_manual_ledger.sql,
// which enforce the role check and that debits equal credits.
export function useManualLedger() {
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    const [acc, ent, lin] = await Promise.all([
      supabase.from("chart_of_accounts").select("id, code, name, type").order("code"),
      supabase.from("journal_entries")
        .select("id, entry_date, description, matter_id, source")
        .order("entry_date", { ascending: false }),
      supabase.from("journal_lines").select("entry_id, account_id, debit, credit"),
    ]);

    const failed = acc.error || ent.error || lin.error;
    if (failed) { setError(failed.message); setLoading(false); return; }

    const byEntry = new Map<string, JournalLine[]>();
    (lin.data || []).forEach((l: any) => {
      const list = byEntry.get(l.entry_id) || [];
      list.push({ account_id: l.account_id, debit: Number(l.debit), credit: Number(l.credit) });
      byEntry.set(l.entry_id, list);
    });

    setAccounts((acc.data || []) as LedgerAccount[]);
    setEntries((ent.data || []).map((e: any) => ({
      id: e.id,
      entry_date: e.entry_date,
      description: e.description,
      matter_id: e.matter_id ?? null,
      source: e.source ?? "",
      lines: byEntry.get(e.id) || [],
    })));
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    load();

    const channel = supabase
      .channel("manual_ledger_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "journal_entries" }, () => { if (mounted) load(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "journal_lines" }, () => { if (mounted) load(); })
      .subscribe();

    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") load();
      else if (event === "SIGNED_OUT") { setEntries([]); setAccounts([]); }
    });

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
      authSub.subscription.unsubscribe();
    };
  }, [load]);

  const saveEntry = useCallback(async (input: SaveEntryInput) => {
    const { error: err } = await supabase.rpc("save_manual_journal", {
      p_entry_id: input.id,
      p_date: input.date,
      p_description: input.description,
      p_matter_id: input.matterId,
      p_lines: input.lines,
    });
    if (err) throw new Error(err.message);
    await load();
  }, [load]);

  const deleteEntry = useCallback(async (id: string) => {
    const { error: err } = await supabase.rpc("delete_manual_journal", { p_entry_id: id });
    if (err) throw new Error(err.message);
    await load();
  }, [load]);

  const addAccount = useCallback(async (code: string, name: string, type: AccountType) => {
    const { error: err } = await supabase.rpc("add_ledger_account", {
      p_code: code, p_name: name, p_type: type,
    });
    if (err) throw new Error(err.message);
    await load();
  }, [load]);

  return { accounts, entries, loading, error, saveEntry, deleteEntry, addAccount };
}
