import { useEffect, useState, useCallback } from "react";
import type { Matter, Role, Task, ViewKey, Deadline, LedgerEntry, StaffMember, VaultDocument, Message, Witness, AuditLog, Invoice } from "../types";
import { useSupabaseMatters } from "./useSupabaseMatters";
import { useSupabaseDeadlines } from "./useSupabaseDeadlines";
import { useSupabaseDocuments } from "./useSupabaseDocuments";
import { useSupabaseInvoices } from "./useSupabaseInvoices";
import { useSupabaseTasks } from "./useSupabaseTasks";
import { useSupabaseMessages } from "./useSupabaseMessages";

const STORAGE_KEY = "omuyomaLegalOs.v3";

interface State {
  tasks: Task[]; matters: Matter[]; currentView: ViewKey; role: Role;
  sidebarCollapsed: boolean; deadlines: Deadline[]; ledger: LedgerEntry[];
  staff: StaffMember[]; documents: VaultDocument[]; messages: Message[]; invoices: Invoice[];
  witnesses: Witness[]; auditLog: AuditLog[];
}

const defaults: State = {
  currentView: "dashboard", role: "partner", sidebarCollapsed: false,
  tasks: [], matters: [
    { id: "m1", client: "Kariuki Enterprises Ltd", title: "Commercial Dispute vs Equity Bank", type: "Commercial", status: "active", fileNo: "OM/COMM/2026/001", court: "High Court - Commercial & Tax Division", partyA: "Kariuki Enterprises Ltd", partyB: "Equity Bank Kenya", openedDate: "2026-01-15" },
    { id: "m2", client: "Jane Wanjiku", title: "Divorce Petition", type: "Family Law", status: "active", fileNo: "OM/FAM/2026/002", court: "High Court - Family Division", partyA: "Jane Wanjiku", partyB: "Peter Wanjiku", openedDate: "2026-02-20" },
    { id: "m3", client: "Mombasa Properties Ltd", title: "Land Dispute - LR No. 4521", type: "Conveyancing", status: "pending", fileNo: "OM/CONV/2026/003", court: "Environment & Land Court - Nairobi", partyA: "Mombasa Properties Ltd", partyB: "County Government of Mombasa", openedDate: "2026-03-10" }
  ], deadlines: [], ledger: [], staff: [], documents: [], messages: [], witnesses: [], invoices: [],
  auditLog: [
    { id: "a1", action: "System initialised", user: "System", timestamp: new Date().toISOString(), module: "System" },
  ],
};

export function useLegalState() {
  const sb = useSupabaseMatters();
  const sbDl = useSupabaseDeadlines(sb.matters);
  const sbDoc = useSupabaseDocuments(sb.matters);
  const sbInv = useSupabaseInvoices(sb.matters);
  const sbTask = useSupabaseTasks(sb.matters);
  const sbMsg = useSupabaseMessages(sb.matters);
  const [state, setState] = useState<State>(() => {
    if (typeof window === "undefined") return defaults;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...defaults, ...JSON.parse(raw) , addMessage};
    } catch {}
    return defaults;
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }, [state]);

  const log = useCallback((action: string, module: string, userRole: Role) => {
    setState(s => ({
      ...s, auditLog: [{ id: `a${Date.now()}`, action, user: userRole, timestamp: new Date().toISOString(), module }, ...s.auditLog].slice(0, 100)
    }));
  }, []);

  const setView = useCallback((v: ViewKey) => setState(s => ({ ...s, currentView: v })), []);
  const setRole = useCallback((r: Role) => setState(s => ({ ...s, role: r })), []);
  const toggleSidebar = useCallback(() => setState(s => ({ ...s, sidebarCollapsed: !s.sidebarCollapsed })), []);

  const moveTask = useCallback((id: string, status: Task["status"]) => { sbTask.moveTask(id, status); }, [sbTask]);

  const addTask = useCallback((t: Omit<Task, "id">) => { sbTask.addTask(t); }, [sbTask]);
  const deleteTask = useCallback((id: string) => { sbTask.deleteTask(id); }, [sbTask]);

  const addMatter = useCallback((m: Omit<Matter, "id" | "status">) => {
    sb.addMatter({ ...m, openedDate: new Date().toISOString().slice(0, 10) });
  }, [sb]);

  const addDeadline = useCallback((d: any) => { sbDl.addDeadline(d); }, [sbDl]);

  const deleteDeadline = useCallback((id: string) => { sbDl.deleteDeadline(id); }, [sbDl]);
  const updateDeadline = useCallback((id: string, updates: any) => { sbDl.updateDeadline(id, updates); }, [sbDl]);

  const addLedgerEntry = useCallback((e: Omit<LedgerEntry, "id">) =>
    setState(s => ({ ...s, ledger: [...s.ledger, { ...e, id: `l${Date.now()}` }] })), []);

  const addStaff = useCallback((m: Omit<StaffMember, "id">) =>
    setState(s => ({ ...s, staff: [...s.staff, { ...m, id: `s${Date.now()}` }] })), []);

  const removeStaff = useCallback((id: string) =>
    setState(s => ({ ...s, staff: s.staff.filter(m => m.id !== id) })), []);

  const assignMatter = useCallback((matterId: string, staffName: string) => {
    sb.assignMatter(matterId, staffName);
  }, [sb]);
  const addMessage = useCallback((msg: any) => { sbMsg.sendMessage(msg); }, [sbMsg]);

  const addInvoice = useCallback((i: any) => { sbInv.addInvoice(i); }, [sbInv]);
  const addDocument = useCallback((d: any) => { sbDoc.addDocument(d); }, [sbDoc]);

  const deleteDocument = useCallback((id: string) => { sbDoc.deleteDocument(id); }, [sbDoc]);
  const updateDocument = useCallback((id: string, updates: any) => { sbDoc.updateDocument(id, updates); }, [sbDoc]);
  const deleteDocumentWithPassword = useCallback((id: string, password: string) => sbDoc.deleteDocumentWithPassword(id, password), [sbDoc]);
  const renameDocument = useCallback((id: string, name: string) => sbDoc.renameDocument(id, name), [sbDoc]);
  const reorderDocuments = useCallback((documentIds: string[], positions: number[]) => sbDoc.reorderDocuments(documentIds, positions), [sbDoc]);

  const sendMessage = useCallback((msg: any) => { sbMsg.sendMessage(msg); }, [sbMsg]);

  const addWitness = useCallback((w: Omit<Witness, "id">) =>
    setState(s => ({ ...s, witnesses: [...s.witnesses, { ...w, id: `w${Date.now()}` }] })), []);

  const updateWitnessStatus = useCallback((id: string, status: Witness["status"]) =>
    setState(s => ({ ...s, witnesses: s.witnesses.map(w => w.id === id ? { ...w, status } : w) })), []);

  const stateWithSb = { ...state, matters: sb.matters, tasks: sbTask.tasks, deadlines: sbDl.deadlines, documents: sbDoc.documents, messages: sbMsg.messages, financials: { ...(state as any).financials, invoices: sbInv.invoices } };
  return {
    state: stateWithSb, setView, setRole, toggleSidebar, moveTask, addTask, deleteTask, addMatter, updateMatter: sb.updateMatter, deleteMatter: sb.deleteMatter,
    addDeadline, deleteDeadline, updateDeadline, addLedgerEntry, addStaff, removeStaff,
    addDocument, deleteDocument, deleteDocumentWithPassword, renameDocument, reorderDocuments, updateDocument, addInvoice, assignMatter, sendMessage, addWitness, updateWitnessStatus, log
  };
}
