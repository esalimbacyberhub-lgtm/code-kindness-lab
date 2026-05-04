import { useState } from "react";
import { Header } from "@/features/legal/components/Header";
import { Sidebar } from "@/features/legal/components/Sidebar";
import { NewMatterDialog } from "@/features/legal/components/NewMatterDialog";
import { Dashboard } from "@/features/legal/views/Dashboard";
import { Matters } from "@/features/legal/views/Matters";
import { Finance } from "@/features/legal/views/Finance";
import { Calendar } from "@/features/legal/views/Calendar";
import { ClientPortal } from "@/features/legal/views/ClientPortal";
import { DocumentVault } from "@/features/legal/views/DocumentVault";
import { LegalDrafting } from "@/features/legal/views/LegalDrafting";
import { WitnessExperts } from "@/features/legal/views/WitnessExperts";
import { FirmDirectory } from "@/features/legal/views/FirmDirectory";
import { AdminAudit } from "@/features/legal/views/AdminAudit";
import { Login } from "@/features/legal/views/Login";
import { useLegalState } from "@/features/legal/hooks/useLegalState";
import type { Role } from "@/features/legal/types";

const Index = () => {
  const { state, setView, setRole, toggleSidebar, moveTask, addTask, addMatter, addDeadline, deleteDeadline, addLedgerEntry, addStaff, removeStaff, addDocument, deleteDocument, sendMessage, addWitness, updateWitnessStatus } = useLegalState();
  const [newMatterOpen, setNewMatterOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loggedInName, setLoggedInName] = useState("");

  const handleLogin = (role: Role, name: string) => { setRole(role); setIsLoggedIn(true); setLoggedInName(name); };
  const handleLogout = () => { setIsLoggedIn(false); setLoggedInName(""); };

  if (!isLoggedIn) return <Login onLogin={handleLogin} />;

  const renderView = () => {
    switch (state.currentView) {
      case "dashboard": return <Dashboard tasks={state.tasks} onMoveTask={moveTask} onNewMatter={() => setNewMatterOpen(true)} />;
      case "matters": return <Matters matters={state.matters} />;
      case "finance": return <Finance ledger={state.ledger} matters={state.matters} onAdd={addLedgerEntry} />;
      case "calendar": return <Calendar deadlines={state.deadlines} matters={state.matters} onAdd={addDeadline} onDelete={deleteDeadline} />;
      case "clientportal": return <ClientPortal messages={state.messages} matters={state.matters} role={state.role} onSend={sendMessage} />;
      case "vault": return <DocumentVault documents={state.documents} matters={state.matters} onAdd={addDocument} onDelete={deleteDocument} />;
      case "drafting": return <LegalDrafting />;
      case "witness": return <WitnessExperts witnesses={state.witnesses} matters={state.matters} onAdd={addWitness} onUpdateStatus={updateWitnessStatus} />;
      case "directory": return <FirmDirectory staff={state.staff} currentRole={state.role} onAdd={addStaff} onRemove={removeStaff} />;
      case "admin": return <AdminAudit logs={state.auditLog} matters={state.matters} staff={state.staff} ledger={state.ledger} role={state.role} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="mesh-bg" aria-hidden />
      <Header role={state.role} onRoleChange={setRole} onLogout={handleLogout} userName={loggedInName} />
      <div className="flex flex-1 overflow-hidden relative z-10 min-h-0">
        <Sidebar current={state.currentView} role={state.role} collapsed={state.sidebarCollapsed} onToggle={toggleSidebar} onNavigate={setView} />
        <main className="flex-1 overflow-y-auto custom-scroll p-6 md:p-8" id="main">{renderView()}</main>
      </div>
      <NewMatterDialog open={newMatterOpen} onOpenChange={setNewMatterOpen} onCreate={addMatter} />
    </div>
  );
};

export default Index;
