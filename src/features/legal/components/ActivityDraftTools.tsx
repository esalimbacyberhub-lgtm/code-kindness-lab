import { useRef, useState } from "react";
import { Pencil, MessageSquarePlus, Paperclip, FileText, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CaseActivity } from "../hooks/useSupabaseCaseActivities";

interface Props {
  activity: CaseActivity;
  onUpdate: (id: string, updates: Partial<CaseActivity>) => Promise<void>;
  onUpload: (id: string, file: File) => Promise<boolean>;
  getUrl: (path: string) => Promise<string | null>;
}

const toForm = (a: CaseActivity) => ({
  activityType: a.activityType,
  activityDate: a.activityDate,
  courtRoom: a.courtRoom,
  actionedTo: a.actionedTo,
  outcome: a.outcome,
  nextDate: a.nextDate,
  clientVisible: a.clientVisible,
});

export function ActivityDraftTools({ activity, onUpdate, onUpload, getUrl }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<null | "edit" | "update">(null);
  const [form, setForm] = useState(() => toForm(activity));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const close = () => { setMode(null); setNote(""); };

  const saveEdit = async () => {
    if (!form.activityType.trim()) return;
    setBusy(true);
    await onUpdate(activity.id, { ...form, activityType: form.activityType.trim() });
    setBusy(false);
    close();
  };

  const saveUpdate = async () => {
    const text = note.trim();
    if (!text) return;
    const stamp = new Date().toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
    const next = [activity.outcome, `${stamp}: ${text}`].filter(Boolean).join("\n\n");
    setBusy(true);
    await onUpdate(activity.id, { outcome: next });
    setBusy(false);
    close();
  };

  const openDraft = async () => {
    if (!activity.draftPath) return;
    // Open the tab first so the browser's popup blocker allows it
    const w = window.open("", "_blank");
    const url = await getUrl(activity.draftPath);
    if (url && w) w.location.href = url;
    else if (w) w.close();
  };

  const iconBtn = "text-muted-foreground hover:text-primary align-middle";

  return (
    <span className="inline-flex items-center gap-2 mr-2 align-middle">
      {activity.draftPath && (
        <button onClick={openDraft} className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline max-w-[140px]" title="Open draft">
          <FileText className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{activity.draftName || "Draft"}</span>
        </button>
      )}

      <button className={iconBtn} title={activity.draftPath ? "Replace draft" : "Upload draft"} onClick={() => fileRef.current?.click()} disabled={uploading}>
        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.doc,.docx,.odt,.rtf,.txt"
        className="hidden"
        onChange={async e => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setUploading(true);
          await onUpload(activity.id, f);
          setUploading(false);
        }}
      />

      <button className={iconBtn} title="Add update" onClick={() => { setNote(""); setMode("update"); }}>
        <MessageSquarePlus className="w-3.5 h-3.5" />
      </button>
      <button className={iconBtn} title="Edit activity" onClick={() => { setForm(toForm(activity)); setMode("edit"); }}>
        <Pencil className="w-3.5 h-3.5" />
      </button>

      <Dialog open={mode === "update"} onOpenChange={o => { if (!o) close(); }}>
        <DialogContent className="glass-card border-border max-w-lg">
          <DialogHeader><DialogTitle className="font-serif text-xl">Add update</DialogTitle></DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-xs text-muted-foreground">
              Adds a dated paragraph to "{activity.activityType}". Existing outcome text is kept.
            </p>
            <Textarea rows={5} value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Draft reviewed, clause 4 amended per client comments" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button onClick={saveUpdate} disabled={busy || !note.trim()} className="btn-royal">{busy ? "Saving..." : "Add update"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mode === "edit"} onOpenChange={o => { if (!o) close(); }}>
        <DialogContent className="glass-card border-border max-w-lg">
          <DialogHeader><DialogTitle className="font-serif text-xl">Edit activity</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Activity Type *</Label>
              <Input value={form.activityType} onChange={e => setForm(f => ({ ...f, activityType: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Activity Date</Label>
                <Input type="date" value={form.activityDate} onChange={e => setForm(f => ({ ...f, activityDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Court Room</Label>
                <Input value={form.courtRoom} onChange={e => setForm(f => ({ ...f, courtRoom: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Actioned To</Label>
              <Input value={form.actionedTo} onChange={e => setForm(f => ({ ...f, actionedTo: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Outcome</Label>
              <Textarea rows={5} value={form.outcome} onChange={e => setForm(f => ({ ...f, outcome: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Next Date</Label>
              <Input type="date" value={form.nextDate} onChange={e => setForm(f => ({ ...f, nextDate: e.target.value }))} />
              <p className="text-[11px] text-muted-foreground">Editing the date here does not change calendar deadlines already created.</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.clientVisible} onChange={e => setForm(f => ({ ...f, clientVisible: e.target.checked }))} className="rounded border-border" />
              <span className="text-sm">Visible to client</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button onClick={saveEdit} disabled={busy || !form.activityType.trim()} className="btn-royal">{busy ? "Saving..." : "Save changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </span>
  );
}
