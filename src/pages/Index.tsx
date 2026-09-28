import { useState } from "react";
import { Header } from "@/features/legal/components/Header";
import { Sidebar } from "@/features/legal/components/Sidebar";
import { Dashboard } from "@/features/legal/views/Dashboard";
import { MatterHub } from "@/features/legal/views/Matters";
import { Finance } from "@/features/legal/views/Finance";
import { AccountsHub } from "@/features/legal/views/AccountsHub";
import { Calendar } from "@/features/legal/views/Calendar";
import { FirmDirectory } from "@/features/legal/views/FirmDirectory";
import { Invoices } from "@/features/legal/views/Invoices";
import { ClientPortal } from "@/features/legal/views/ClientPortal";
import FinancialsModule from "@/components/FinancialsModule";
import { AdminAudit } from "@/features/legal/views/AdminAudit";
import { NewMatterDialog } from "@/features/legal/components/NewMatterDialog";
import { Login } from "@/features/auth/Login";
import { UserManagement } from "@/features/legal/views/UserManagement";
import { AccountSettings } from "@/features/legal/views/AccountSettings";
import { useAuth } from "@/features/auth/useAuth";
import { useLegalState } from "@/features/legal/hooks/useLegalState";
import type { Role } from "@/features/legal/types";

const Index = () => {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const { state, setView, setRole, toggleSidebar, moveTask, addDeadline, deleteDeadline, updateDeadline, addLedgerEntry, addStaff, removeStaff, addDocument, deleteDocument, deleteDocumentWithPassword, renameDocument, reorderDocuments, updateDocument, addInvoice, addMessage, addMatter, updateMatter, deleteMatter, deleteMatterWithPassword, assignMatter, addTask, deleteTask } = useLegalState();
  const [matterDialogOpen, setMatterDialogOpen] = useState(false);
  const handleLogout = () => { signOut(); };
  const renderView = () => {
    switch (state.currentView) {
      case "dashboard": return <Dashboard tasks={state.tasks} deadlines={state.deadlines||[]} matters={state.matters||[]} invoices={(state as any).financials?.invoices||[]} onMoveTask={moveTask} onAddTask={addTask} onDeleteTask={deleteTask} onNewMatter={() => setMatterDialogOpen(true)} onGoToCalendar={() => setView("calendar")} onGoToMatters={() => setView("matters")} />;
      case "matters": return <MatterHub onNewMatter={() => setMatterDialogOpen(true)} matters={state.matters} staff={state.staff} role={state.role} onAssign={assignMatter} documents={state.documents} onAddDocument={addDocument} onDeleteDocument={deleteDocument} onDeleteDocumentWithPassword={deleteDocumentWithPassword} onRenameDocument={renameDocument} onReorderDocuments={reorderDocuments} onUpdateMatter={updateMatter} onUpdateDocument={updateDocument} onDeleteMatter={deleteMatter} onDeleteMatterWithPassword={deleteMatterWithPassword} onAddDeadline={addDeadline} />
      case "finance": return <AccountsHub matters={state.matters} />;
      case "calendar": return <Calendar deadlines={state.deadlines} matters={state.matters} onAdd={addDeadline} onDelete={deleteDeadline} onUpdate={updateDeadline} />;
      case "vault": return null; // Document Vault removed — documents now live inside each Matter's own folder
      case "directory": return <FirmDirectory staff={state.staff} currentRole={state.role} onAdd={addStaff} onRemove={removeStaff} />;
      case "invoices": return null; // Financials moved to Admin & Audit
      case "users": return <UserManagement matters={state.matters} />;
      case "account": return <AccountSettings />;
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

  // ── Client accounts are locked to the Client Portal only ──
  if (profile?.role === "client") {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="mesh-bg" aria-hidden />
        <Header role="client" onRoleChange={() => {}} onLogout={handleLogout} userName={profile?.full_name || user?.email || ""} hideRoleSwitcher />
        <main className="flex-1 overflow-y-auto custom-scroll p-6 md:p-8 relative z-10">
          <ClientPortal
            messages={state.messages || []}
            matters={state.matters || []}
            role="client"
            documents={state.documents || []}
            invoices={state.invoices || []}
            onSend={addMessage}
            clientUserId={user.id}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="mesh-bg" aria-hidden />
      <Header role={state.role} onRoleChange={setRole} onLogout={handleLogout} userName={profile?.full_name || user?.email || ""} />
      <div className="flex flex-1 overflow-hidden relative z-10 min-h-0">
        <Sidebar current={state.currentView} role={state.role} collapsed={state.sidebarCollapsed} onToggle={toggleSidebar} onNavigate={setView} />
        <main className="flex-1 overflow-y-auto custom-scroll p-6 md:p-8">{renderView()}</main>
      </div>
      <NewMatterDialog open={matterDialogOpen} onOpenChange={setMatterDialogOpen} matterCount={state.matters.length} onCreate={(m) => { addMatter(m); setMatterDialogOpen(false); }} />
    </div>
  );
};

export default Index;
