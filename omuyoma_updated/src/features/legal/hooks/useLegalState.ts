import { useEffect, useState, useCallback } from "react";
import type { Matter, Role, Task, ViewKey, Deadline, LedgerEntry, StaffMember, VaultDocument, Message, Witness, AuditLog } from "../types";

const STORAGE_KEY = "omuyomaLegalOs.v3";

interface State {
  tasks: Task[]; matters: Matter[]; currentView: ViewKey; role: Role;
  sidebarCollapsed: boolean; deadlines: Deadline[]; ledger: LedgerEntry[];
  staff: StaffMember[]; documents: VaultDocument[]; messages: Message[];
  witnesses: Witness[]; auditLog: AuditLog[];
}

const defaults: State = {
  currentView: "dashboard", role: "partner", sidebarCollapsed: false,
  tasks: [], matters: [], deadlines: [], ledger: [], staff: [], documents: [], messages: [], witnesses: [],
  auditLog: [
    { id: "a1", action: "System initialised", user: "System", timestamp: new Date().toISOString(), module: "System" },
  ],
};

export function useLegalState() {
  const [state, setState] = useState<State>(() => {
    if (typeof window === "undefined") return defaults;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...defaults, ...JSON.parse(raw) };
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

  const moveTask = useCallback((id: string, status: Task["status"]) =>
    setState(s => ({ ...s, tasks: s.tasks.map(t => t.id === id ? { ...t, status } : t) })), []);

  const addTask = useCallback((t: Omit<Task, "id">) =>
    setState(s => ({ ...s, tasks: [...s.tasks, { ...t, id: `t${Date.now()}` }] })), []);

  const addMatter = useCallback((m: Omit<Matter, "id" | "status">) =>
    setState(s => ({ ...s, matters: [...s.matters, { ...m, id: `m${Date.now()}`, status: "active", openedDate: new Date().toISOString().slice(0, 10) }] })), []);

  const addDeadline = useCallback((d: Omit<Deadline, "id">) =>
    setState(s => ({ ...s, deadlines: [...s.deadlines, { ...d, id: `d${Date.now()}` }] })), []);

  const deleteDeadline = useCallback((id: string) =>
    setState(s => ({ ...s, deadlines: s.deadlines.filter(d => d.id !== id) })), []);

  const addLedgerEntry = useCallback((e: Omit<LedgerEntry, "id">) =>
    setState(s => ({ ...s, ledger: [...s.ledger, { ...e, id: `l${Date.now()}` }] })), []);

  const addStaff = useCallback((m: Omit<StaffMember, "id">) =>
    setState(s => ({ ...s, staff: [...s.staff, { ...m, id: `s${Date.now()}` }] })), []);

  const removeStaff = useCallback((id: string) =>
    setState(s => ({ ...s, staff: s.staff.filter(m => m.id !== id) })), []);

  const addDocument = useCallback((d: Omit<VaultDocument, "id">) =>
    setState(s => ({ ...s, documents: [...s.documents, { ...d, id: `doc${Date.now()}` }] })), []);

  const deleteDocument = useCallback((id: string) =>
    setState(s => ({ ...s, documents: s.documents.filter(d => d.id !== id) })), []);

  const sendMessage = useCallback((content: string, from: string, dir: Message["direction"]) =>
    setState(s => ({ ...s, messages: [...s.messages, { id: `msg${Date.now()}`, from, content, timestamp: new Date().toISOString(), direction: dir }] })), []);

  const addWitness = useCallback((w: Omit<Witness, "id">) =>
    setState(s => ({ ...s, witnesses: [...s.witnesses, { ...w, id: `w${Date.now()}` }] })), []);

  const updateWitnessStatus = useCallback((id: string, status: Witness["status"]) =>
    setState(s => ({ ...s, witnesses: s.witnesses.map(w => w.id === id ? { ...w, status } : w) })), []);

  return {
    state, setView, setRole, toggleSidebar, moveTask, addTask, addMatter,
    addDeadline, deleteDeadline, addLedgerEntry, addStaff, removeStaff,
    addDocument, deleteDocument, sendMessage, addWitness, updateWitnessStatus, log
  };
}
