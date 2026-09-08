path = "src/features/legal/views/Matters.tsx"
with open(path, "r") as f:
    content = f.read()

old = '''export const MatterHub = Matters;'''

new = '''// ── Case Activities panel ──────────────────────────────────────────────────
const ACTIVITY_TABLE_COLS = ["Activity", "Activity Date", "Court Room", "Actioned To", "Outcomes"];

function CaseActivitiesPanel({ matter, onAddDeadline }: { matter: Matter; onAddDeadline?: (d: Omit<Deadline, "id">) => void }) {
  const { activities, addActivity, deleteActivity } = useSupabaseCaseActivities(matter.id);
  const litigious = isLitigiousMatter(matter);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [isCustomType, setIsCustomType] = useState(!litigious);
  const [form, setForm] = useState({
    activityType: litigious ? LITIGIOUS_ACTIVITY_TYPES[0] : "",
    activityDate: new Date().toISOString().slice(0, 10),
    courtRoom: "",
    actionedTo: "",
    outcome: "",
    nextDate: "",
    clientVisible: false,
  });

  const resetForm = () => setForm({
    activityType: litigious ? LITIGIOUS_ACTIVITY_TYPES[0] : "",
    activityDate: new Date().toISOString().slice(0, 10),
    courtRoom: "",
    actionedTo: "",
    outcome: "",
    nextDate: "",
    clientVisible: false,
  });

  const submit = async () => {
    if (!form.activityType.trim()) return;
    const saved = await addActivity(form);
    if (saved && form.nextDate) {
      onAddDeadline?.({
        title: `${form.activityType} — ${matter.title}`,
        matter: matter.fileNo || "General",
        court: form.courtRoom || matter.court || "",
        date: form.nextDate,
        type: activityToDeadlineType(form.activityType),
      });
    }
    setDialogOpen(false);
    resetForm();
  };

  return (
    <div className="glass-card rounded-xl overflow-hidden p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Case Activities</h3>
        </div>
        <button
          onClick={() => { resetForm(); setDialogOpen(true); }}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 font-semibold"
        >
          <Plus className="w-3.5 h-3.5" /> Add Activity
        </button>
      </div>

      {activities.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">No activities logged yet for this matter.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/50">
                {ACTIVITY_TABLE_COLS.map(c => <th key={c} className="pb-2 pr-4 font-semibold">{c}</th>)}
                <th className="pb-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {activities.map((a: CaseActivity) => (
                <tr key={a.id} className="border-b border-border/30 last:border-0">
                  <td className="py-2.5 pr-4 font-medium">{a.activityType}</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">
                    {a.activityDate ? new Date(a.activityDate + "T00:00:00").toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                  </td>
                  <td className="py-2.5 pr-4 text-muted-foreground">{a.courtRoom || "—"}</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">{a.actionedTo || "—"}</td>
                  <td className="py-2.5 pr-4 text-muted-foreground max-w-[220px] truncate" title={a.outcome}>{a.outcome || "—"}</td>
                  <td className="py-2.5">
                    <button onClick={() => { if (confirm("Delete this activity?")) deleteActivity(a.id); }} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={o => { if (!o) resetForm(); setDialogOpen(o); }}>
        <DialogContent className="glass-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Log Case Activity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Activity Type *</Label>
              {litigious && !isCustomType ? (
                <Select
                  value={form.activityType}
                  onValueChange={v => v === "__custom__" ? setIsCustomType(true) : setForm(f => ({ ...f, activityType: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LITIGIOUS_ACTIVITY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    <SelectItem value="__custom__">✎ Other — specify manually</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={form.activityType}
                  onChange={e => setForm(f => ({ ...f, activityType: e.target.value }))}
                  placeholder={litigious ? "e.g. Site visit" : "e.g. Transaction milestone reached"}
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Activity Date</Label>
                <Input type="date" value={form.activityDate} onChange={e => setForm(f => ({ ...f, activityDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Court Room</Label>
                <Input value={form.courtRoom} onChange={e => setForm(f => ({ ...f, courtRoom: e.target.value }))} placeholder="e.g. Courtroom 4" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Actioned To</Label>
              <Input value={form.actionedTo} onChange={e => setForm(f => ({ ...f, actionedTo: e.target.value }))} placeholder="Firm member assigned" />
            </div>

            <div className="space-y-1.5">
              <Label>Outcome</Label>
              <Input value={form.outcome} onChange={e => setForm(f => ({ ...f, outcome: e.target.value }))} placeholder="e.g. Mention date set (in court)" />
            </div>

            <div className="space-y-1.5">
              <Label>Next Date (optional)</Label>
              <Input type="date" value={form.nextDate} onChange={e => setForm(f => ({ ...f, nextDate: e.target.value }))} />
              <p className="text-[11px] text-muted-foreground">If set, a matching deadline is created automatically on the Calendar.</p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.clientVisible} onChange={e => setForm(f => ({ ...f, clientVisible: e.target.checked }))} className="rounded border-border" />
              <span className="text-sm">Visible to client</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={!form.activityType.trim()} className="btn-royal">Save Activity</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const MatterHub = Matters;'''

if old not in content:
    print("❌ Anchor not found — no changes written.")
    raise SystemExit(1)

content = content.replace(old, new, 1)
with open(path, "w") as f:
    f.write(content)

print("✅ CaseActivitiesPanel component added.")
