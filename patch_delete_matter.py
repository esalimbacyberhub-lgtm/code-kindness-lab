#!/usr/bin/env python3
"""
Patch: wire up matter (case file) deletion end-to-end.
Run from the repo root: python3 patch_delete_matter.py
"""
import sys

def apply(path, old, new, label):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    count = content.count(old)
    if count != 1:
        print(f"  FAILED [{label}]: expected 1 match, found {count} in {path}")
        sys.exit(1)
    content = content.replace(old, new, 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"  OK [{label}]")

STATE   = "src/features/legal/hooks/useLegalState.ts"
INDEX   = "src/pages/Index.tsx"
MATTERS = "src/features/legal/views/Matters.tsx"

print("== Patching useLegalState.ts (expose deleteMatter) ==")
apply(STATE,
'''  return {
    state: stateWithSb, setView, setRole, toggleSidebar, moveTask, addTask, deleteTask, addMatter, updateMatter: sb.updateMatter,
    addDeadline, deleteDeadline, updateDeadline, addLedgerEntry, addStaff, removeStaff,
    addDocument, deleteDocument, updateDocument, addInvoice, assignMatter, sendMessage, addWitness, updateWitnessStatus, log
  };''',
'''  return {
    state: stateWithSb, setView, setRole, toggleSidebar, moveTask, addTask, deleteTask, addMatter, updateMatter: sb.updateMatter, deleteMatter: sb.deleteMatter,
    addDeadline, deleteDeadline, updateDeadline, addLedgerEntry, addStaff, removeStaff,
    addDocument, deleteDocument, updateDocument, addInvoice, assignMatter, sendMessage, addWitness, updateWitnessStatus, log
  };''',
"expose deleteMatter from state hook")

print("\n== Patching Index.tsx (thread deleteMatter through to Matter Hub) ==")
apply(INDEX,
'''  const { state, setView, setRole, toggleSidebar, moveTask, addDeadline, deleteDeadline, updateDeadline, addLedgerEntry, addStaff, removeStaff, addDocument, deleteDocument, updateDocument, addInvoice, addMessage, addMatter, updateMatter, assignMatter, addTask, deleteTask } = useLegalState();''',
'''  const { state, setView, setRole, toggleSidebar, moveTask, addDeadline, deleteDeadline, updateDeadline, addLedgerEntry, addStaff, removeStaff, addDocument, deleteDocument, updateDocument, addInvoice, addMessage, addMatter, updateMatter, deleteMatter, assignMatter, addTask, deleteTask } = useLegalState();''',
"destructure deleteMatter")

apply(INDEX,
'''      case "matters": return <MatterHub onNewMatter={() => setMatterDialogOpen(true)} matters={state.matters} staff={state.staff} role={state.role} onAssign={assignMatter} documents={state.documents} onAddDocument={addDocument} onDeleteDocument={deleteDocument} onUpdateMatter={updateMatter} onUpdateDocument={updateDocument} />''',
'''      case "matters": return <MatterHub onNewMatter={() => setMatterDialogOpen(true)} matters={state.matters} staff={state.staff} role={state.role} onAssign={assignMatter} documents={state.documents} onAddDocument={addDocument} onDeleteDocument={deleteDocument} onUpdateMatter={updateMatter} onUpdateDocument={updateDocument} onDeleteMatter={deleteMatter} />''',
"pass onDeleteMatter to MatterHub")

print("\n== Patching Matters.tsx (Props + Delete button + confirm handler) ==")
apply(MATTERS,
'''  onUpdateMatter?: (id: string, updates: Partial<Matter>) => void;
  onUpdateDocument?: (id: string, updates: any) => void;
}''',
'''  onUpdateMatter?: (id: string, updates: Partial<Matter>) => void;
  onUpdateDocument?: (id: string, updates: any) => void;
  onDeleteMatter?: (id: string) => void;
}''',
"add onDeleteMatter to Props")

apply(MATTERS,
'''export const Matters = ({
  onNewMatter, matters, staff, role, onAssign,
  documents, onAddDocument, onDeleteDocument, onUpdateMatter, onUpdateDocument,
}: Props) => {''',
'''export const Matters = ({
  onNewMatter, matters, staff, role, onAssign,
  documents, onAddDocument, onDeleteDocument, onUpdateMatter, onUpdateDocument, onDeleteMatter,
}: Props) => {''',
"destructure onDeleteMatter")

apply(MATTERS,
'''  const handleGenerateInvoice = (matter: Matter) => {
    // Navigate to Financials → pre-fill matter
    sessionStorage.setItem("omuyoma_prefill_invoice", JSON.stringify({
      client: matter.client, matter: matter.fileNo, matterTitle: matter.title,
      partyA: matter.partyA, partyB: matter.partyB,
    }));
    alert(`Go to Admin & Audit → Financials to raise an invoice for: ${matter.title || matter.client || "this matter"}`);
  };''',
'''  const handleGenerateInvoice = (matter: Matter) => {
    // Navigate to Financials → pre-fill matter
    sessionStorage.setItem("omuyoma_prefill_invoice", JSON.stringify({
      client: matter.client, matter: matter.fileNo, matterTitle: matter.title,
      partyA: matter.partyA, partyB: matter.partyB,
    }));
    alert(`Go to Admin & Audit → Financials to raise an invoice for: ${matter.title || matter.client || "this matter"}`);
  };

  // ── Delete a matter (case file) entirely ──────────────────────────────────
  const handleDeleteMatter = (matter: Matter) => {
    if (!confirm(`Delete matter "${matter.title}" (${matter.fileNo})?\\n\\nThis permanently removes the case file and cannot be undone.`)) return;
    onDeleteMatter?.(matter.id);
    setSelected(null);
  };''',
"add handleDeleteMatter")

apply(MATTERS,
'''              {/* Generate Fee Note */}
              <button
                onClick={() => {
                  sessionStorage.setItem("omuyoma_prefill_feenote", JSON.stringify({
                    client: selected.client, matterRef: selected.fileNo,
                    matterTitle: selected.title, partyA: selected.partyA, partyB: selected.partyB,
                  }));
                  alert(`Go to Admin & Audit → Financials → Fee Notes to raise a fee note for: ${selected.title || selected.client || "this matter"}`);
                }}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20 transition-all"
              >
                <ClipboardList className="w-3.5 h-3.5" /> Issue Fee Note
              </button>
            </div>
          </div>
        </div>''',
'''              {/* Generate Fee Note */}
              <button
                onClick={() => {
                  sessionStorage.setItem("omuyoma_prefill_feenote", JSON.stringify({
                    client: selected.client, matterRef: selected.fileNo,
                    matterTitle: selected.title, partyA: selected.partyA, partyB: selected.partyB,
                  }));
                  alert(`Go to Admin & Audit → Financials → Fee Notes to raise a fee note for: ${selected.title || selected.client || "this matter"}`);
                }}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20 transition-all"
              >
                <ClipboardList className="w-3.5 h-3.5" /> Issue Fee Note
              </button>

              {/* Delete Matter */}
              {role !== "client" && onDeleteMatter && (
                <button
                  onClick={() => handleDeleteMatter(selected)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Matter
                </button>
              )}
            </div>
          </div>
        </div>''',
"add Delete Matter button to action bar")

print("\nAll edits applied successfully.")
