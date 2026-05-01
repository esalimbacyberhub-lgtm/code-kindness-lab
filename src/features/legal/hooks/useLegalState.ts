import { useEffect, useState, useCallback } from "react";
import type { Deadline, Matter, Role, Task, ViewKey, VaultDocument } from "../types";

const STORAGE_KEY = "omuyomaLegalOs.v2";

interface State {
  tasks: Task[];
  matters: Matter[];
  deadlines: Deadline[];
  documents: VaultDocument[];
  currentView: ViewKey;
  role: Role;
  sidebarCollapsed: boolean;
}

const defaults: State = {
  currentView: "dashboard",
  role: "partner",
  sidebarCollapsed: false,
  tasks: [],
  matters: [],
  deadlines: [],
  documents: [],
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

  const setView = useCallback((v: ViewKey) => setState(s => ({ ...s, currentView: v })), []);
  const setRole = useCallback((r: Role) => setState(s => ({ ...s, role: r })), []);
  const toggleSidebar = useCallback(() => setState(s => ({ ...s, sidebarCollapsed: !s.sidebarCollapsed })), []);

  const moveTask = useCallback((id: string, status: Task["status"]) => {
    setState(s => ({ ...s, tasks: s.tasks.map(t => t.id === id ? { ...t, status } : t) }));
  }, []);

  const addMatter = useCallback((m: Omit<Matter, "id" | "status">) => {
    setState(s => ({
      ...s,
      matters: [...s.matters, { ...m, id: `m${Date.now()}`, status: "active" }],
    }));
  }, []);

  const addDeadline = useCallback((d: Omit<Deadline, "id">) => {
    setState(s => ({
      ...s,
      deadlines: [...s.deadlines, { ...d, id: `d${Date.now()}` }],
    }));
  }, []);

  const removeDeadline = useCallback((id: string) => {
    setState(s => ({ ...s, deadlines: s.deadlines.filter(d => d.id !== id) }));
  }, []);

  const addDocument = useCallback((d: Omit<VaultDocument, "id" | "uploadedAt">) => {
    setState(s => ({
      ...s,
      documents: [
        ...s.documents,
        { ...d, id: `doc${Date.now()}`, uploadedAt: new Date().toISOString() },
      ],
    }));
  }, []);

  const removeDocument = useCallback((id: string) => {
    setState(s => ({ ...s, documents: s.documents.filter(d => d.id !== id) }));
  }, []);

  return {
    state,
    setView,
    setRole,
    toggleSidebar,
    moveTask,
    addMatter,
    addDeadline,
    removeDeadline,
    addDocument,
    removeDocument,
  };
}
