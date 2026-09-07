path = "src/features/legal/views/Matters.tsx"
with open(path, "r") as f:
    content = f.read()

edits = [
    (
        'import type { Matter, StaffMember, Role, VaultDocument } from "../types";',
        'import type { Matter, StaffMember, Role, VaultDocument, Deadline } from "../types";\nimport { useSupabaseCaseActivities, LITIGIOUS_ACTIVITY_TYPES, type CaseActivity } from "../hooks/useSupabaseCaseActivities";\nimport {\n  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,\n} from "@/components/ui/select";'
    ),
    (
        '''  onUpdateMatter?: (id: string, updates: Partial<Matter>) => void;
  onUpdateDocument?: (id: string, updates: any) => void;
  onDeleteMatter?: (id: string) => void;
  onDeleteMatterWithPassword?: (id: string, password: string) => Promise<{ ok: boolean; error?: string }>;
}''',
        '''  onUpdateMatter?: (id: string, updates: Partial<Matter>) => void;
  onUpdateDocument?: (id: string, updates: any) => void;
  onDeleteMatter?: (id: string) => void;
  onDeleteMatterWithPassword?: (id: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  onAddDeadline?: (d: Omit<Deadline, "id">) => void;
}

// Court code -> whether this matter is litigious (mirrors getMatterCourtGroup's
// prefix-matching, kept local since it's only needed for the Activities tab)
function isLitigiousMatter(m: Matter): boolean {
  const code = m.fileNo?.split("/")[1];
  if (!code) return false;
  const knownCourtCodes = ["SC", "COA", "HC", "ELC", "ELRC", "MC", "KC", "SCC", "TRB"];
  return knownCourtCodes.some(c => code.startsWith(c));
}

// Activity type -> matching deadline type, for the auto-created calendar entry
function activityToDeadlineType(activityType: string): Deadline["type"] {
  const t = activityType.toLowerCase();
  if (t.includes("mention")) return "mention";
  if (t.includes("hearing")) return "hearing";
  if (t.includes("ruling") || t.includes("judgment")) return "ruling";
  if (t.includes("filing")) return "filing";
  return "deadline";
}'''
    ),
    (
        '''export const Matters = ({
  onNewMatter, matters, staff, role, onAssign,
  documents, onAddDocument, onDeleteDocument, onDeleteDocumentWithPassword, onRenameDocument, onReorderDocuments,
  onUpdateMatter, onUpdateDocument, onDeleteMatter, onDeleteMatterWithPassword,
}: Props) => {''',
        '''export const Matters = ({
  onNewMatter, matters, staff, role, onAssign,
  documents, onAddDocument, onDeleteDocument, onDeleteDocumentWithPassword, onRenameDocument, onReorderDocuments,
  onUpdateMatter, onUpdateDocument, onDeleteMatter, onDeleteMatterWithPassword, onAddDeadline,
}: Props) => {'''
    ),
]

for i, (old, new) in enumerate(edits, 1):
    if old not in content:
        print(f"❌ Edit {i} FAILED — anchor text not found. Stopping, no changes written.")
        raise SystemExit(1)
    content = content.replace(old, new, 1)
    print(f"✅ Edit {i} applied")

with open(path, "w") as f:
    f.write(content)

print("\nAll edits applied successfully.")
