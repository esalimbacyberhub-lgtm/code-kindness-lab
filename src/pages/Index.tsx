import { useState } from "react";
import { Header } from "@/features/legal/components/Header";
import { Sidebar } from "@/features/legal/components/Sidebar";
import { NewMatterDialog } from "@/features/legal/components/NewMatterDialog";
import { Dashboard } from "@/features/legal/views/Dashboard";
import { Matters } from "@/features/legal/views/Matters";
import { Finance } from "@/features/legal/views/Finance";
import { CalendarView } from "@/features/legal/views/CalendarView";
import { Vault } from "@/features/legal/views/Vault";
import { Placeholder } from "@/features/legal/views/Placeholder";
import { useLegalState } from "@/features/legal/hooks/useLegalState";

const VIEW_LABELS: Record<string, string> = {
  clientportal: "Client Portal",
  drafting: "Legal Drafting",
  witness: "Witness & Experts",
  directory: "Firm Directory",
  admin: "Admin & Audit",
};

const Index = () => {
  const {
    state, setView, setRole, toggleSidebar, moveTask, addMatter,
    addDeadline, removeDeadline, addDocument, removeDocument,
  } = useLegalState();
  const [newMatterOpen, setNewMatterOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="mesh-bg" aria-hidden />

      <Header role={state.role} onRoleChange={setRole} />

      <div className="flex flex-1 overflow-hidden relative z-10 min-h-0">
        <Sidebar
          current={state.currentView}
          role={state.role}
          collapsed={state.sidebarCollapsed}
          onToggle={toggleSidebar}
          onNavigate={setView}
        />
        <main className="flex-1 overflow-y-auto custom-scroll p-6 md:p-8" id="main">
          {state.currentView === "dashboard" && (
            <Dashboard
              tasks={state.tasks}
              onMoveTask={moveTask}
              onNewMatter={() => setNewMatterOpen(true)}
            />
          )}
          {state.currentView === "matters" && <Matters matters={state.matters} />}
          {state.currentView === "finance" && <Finance />}
          {state.currentView === "calendar" && (
            <CalendarView
              deadlines={state.deadlines}
              matters={state.matters}
              onCreate={addDeadline}
              onRemove={removeDeadline}
            />
          )}
          {state.currentView === "vault" && (
            <Vault
              documents={state.documents}
              matters={state.matters}
              onUpload={addDocument}
              onRemove={removeDocument}
            />
          )}
          {!["dashboard", "matters", "finance", "calendar", "vault"].includes(state.currentView) && (
            <Placeholder name={VIEW_LABELS[state.currentView] ?? state.currentView} />
          )}
        </main>
      </div>

      <NewMatterDialog
        open={newMatterOpen}
        onOpenChange={setNewMatterOpen}
        onCreate={addMatter}
      />
    </div>
  );
};

export default Index;
