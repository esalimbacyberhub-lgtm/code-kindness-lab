import { useEffect, useState, useCallback } from "react";
import type { Matter, Role, Task, ViewKey } from "../types";

const STORAGE_KEY = "legalOsStateNextGen";

interface State {
  tasks: Task[];
  matters: Matter[];
  currentView: ViewKey;
  role: Role;
  sidebarCollapsed: boolean;
}

const defaults: State = {
  currentView: "dashboard",
  role: "partner",
  sidebarCollapsed: false,
  tasks: [
    { id: "1", title: "Draft response in Kamau matter", priority: "high", status: "todo", due: "2026-05-03T17:00", matter: "Kamau vs Njeri" },
    { id: "2", title: "Review Acme contract amendments", priority: "medium", status: "todo", due: "2026-05-04", matter: "Acme Ltd" },
    { id: "3", title: "Prepare for Supreme Court hearing", priority: "high", status: "inprogress", due: "2026-05-05", matter: "Republic v. Ochieng" },
    { id: "4", title: "File appeal in Muthoni case", priority: "low", status: "review", due: "2026-05-06", matter: "Muthoni case" },
  ],
  matters: [
    { id: "m1", client: "Kamau", title: "Kamau vs Njeri", type: "Civil Litigation", status: "active" },
    { id: "m2", client: "Acme Ltd", title: "Acme contract", type: "Commercial", status: "active" },
    { id: "m3", client: "Republic", title: "Republic v. Ochieng", type: "Criminal", status: "active" },
    { id: "m4", client: "Muthoni", title: "Muthoni case", type: "Family Law", status: "active" },
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

  return { state, setView, setRole, toggleSidebar, moveTask, addMatter };
}
