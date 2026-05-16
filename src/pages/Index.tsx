import { useState } from "react";
import { Header } from "@/features/legal/components/Header";
import { Sidebar } from "@/features/legal/components/Sidebar";
import { Dashboard } from "@/features/legal/views/Dashboard";
import { MatterHub } from "@/features/legal/views/Matters";
import { Finance } from "@/features/legal/views/Finance";
import { Calendar } from "@/features/legal/views/Calendar";
import { DocumentVault } from "@/features/legal/views/DocumentVault";
import { FirmDirectory } from "@/features/legal/views/FirmDirectory";
import { Invoices } from "@/features/legal/views/Invoices";
import { ClientPortal } from "@/features/legal/views/ClientPortal";
import FinancialsModule from "@/components/FinancialsModule";
import { AdminAudit } from "@/features/legal/views/AdminAudit";
import { Login } from "@/features/legal/views/Login";
import { NewMatterDialog } from "@/features/legal/components/NewMatterDialog";
import { Login } from "@/features/auth/Login";
import { useAuth } from "@/features/auth/useAuth";
import { useLegalState } from "@/features/legal/hooks/useLegalState";
import type { Role } from "@/features/legal/types";

const Index = () => {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const { state, setView, setRole, toggleSidebar, moveTask, addDeadline, deleteDeadline, addLedgerEntry, addStaff, removeStaff, addDocument, deleteDocument, addInvoice, addMessage, addMatter, assignMatter } = useLegalState();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [matterDialogOpen, setMatterDialogOpen] = useState(false);
  const [loggedInName, setLoggedInName] = useState("");
  const handleLogin = (role: Role, name: string) => { setRole(role); setIsLoggedIn(true); setLoggedInName(name); };
  const handleLogout = () => { setIsLoggedIn(false); setLoggedInName(""); };
  if (!isLoggedIn) return <Login onLogin={handleLogin} />;
  const renderView = () => {
    switch (state.currentView) {
      case "dashboard": return <Dashboard tasks={state.tasks} deadlines={state.deadlines||[]} onMoveTask={moveTask} onNewMatter={() => setMatterDialogOpen(true)} onGoToCalendar={() => setView("calendar")} />;
      case "matters": return <MatterHub onNewMatter={() => setMatterDialogOpen(true)} matters={state.matters} staff={state.staff} role={state.role} onAssign={assignMatter} documents={state.documents} onAddDocument={addDocument} onDeleteDocument={deleteDocument} />
      case "finance": return <Finance ledger={state.ledger} matters={state.matters} onAdd={addLedgerEntry} />;
      case "calendar": return <Calendar deadlines={state.deadlines} matters={state.matters} onAdd={addDeadline} onDelete={deleteDeadline} />;
      case "vault": return <DocumentVault documents={state.documents} matters={state.matters} onAdd={addDocument} onDelete={deleteDocument} />;
      case "directory": return <FirmDirectory staff={state.staff} currentRole={state.role} onAdd={addStaff} onRemove={removeStaff} />;
      case "invoices": return null; // Financials moved to Admin & Audit
      case "admin": return <AdminAudit logs={state.auditLog} matters={state.matters} staff={state.staff} ledger={state.ledger} deadlines={state.deadlines} role={state.role} />;
      case "clientportal": return <ClientPortal messages={state.messages||[]} matters={state.matters||[]} role={state.role} documents={state.documents||[]} invoices={state.invoices||[]} onSend={addMessage} />;
      default: return null;
    }
  };
  // Auth gate
  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="text-sm text-muted-foreground">Loading...</div></div>;
  }
  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="mesh-bg" aria-hidden />
      <Header role={state.role} onRoleChange={setRole} onLogout={handleLogout} userName={loggedInName} />
      <div className="flex flex-1 overflow-hidden relative z-10 min-h-0">
        <Sidebar current={state.currentView} role={state.role} collapsed={state.sidebarCollapsed} onToggle={toggleSidebar} onNavigate={setView} />
        <main className="flex-1 overflow-y-auto custom-scroll p-6 md:p-8">{renderView()}</main>
      </div>
      <NewMatterDialog open={matterDialogOpen} onOpenChange={setMatterDialogOpen} matterCount={state.matters.length} onCreate={(m) => { addMatter(m); setMatterDialogOpen(false); }} />
    </div>
  );
};

export default Index;
