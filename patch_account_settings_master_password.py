path = "src/features/legal/views/AccountSettings.tsx"
with open(path, "r") as f:
    content = f.read()

edits = [
    (
        'import { KeyRound, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";',
        'import { KeyRound, CheckCircle2, AlertCircle, Eye, EyeOff, ShieldAlert } from "lucide-react";'
    ),
    (
        '''  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email || ""));
  }, []);''',
        '''  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [currentMasterPw, setCurrentMasterPw] = useState("");
  const [newMasterPw, setNewMasterPw] = useState("");
  const [confirmMasterPw, setConfirmMasterPw] = useState("");
  const [showMasterCurrent, setShowMasterCurrent] = useState(false);
  const [showMasterNew, setShowMasterNew] = useState(false);
  const [mpSaving, setMpSaving] = useState(false);
  const [mpError, setMpError] = useState("");
  const [mpSuccess, setMpSuccess] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setEmail(data.user?.email || "");
      if (data.user?.id) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
        setRole(profile?.role || "");
      }
    });
  }, []);

  const submitMasterPassword = async () => {
    setMpError("");
    setMpSuccess(false);
    if (newMasterPw.length < 6) { setMpError("Password must be at least 6 characters."); return; }
    if (newMasterPw !== confirmMasterPw) { setMpError("Passwords do not match."); return; }
    setMpSaving(true);
    const { error: rpcErr } = await supabase.rpc("set_master_password", {
      p_current_password: currentMasterPw || null,
      p_new_password: newMasterPw,
    });
    setMpSaving(false);
    if (rpcErr) { setMpError(rpcErr.message || "Could not update master password"); return; }
    setMpSuccess(true);
    setCurrentMasterPw("");
    setNewMasterPw("");
    setConfirmMasterPw("");
  };'''
    ),
    (
        '''      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Change Password</h3>
        </div>''',
        '''      {role === "partner" && (
        <div className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-4 h-4 text-brand-gold" />
            <h3 className="font-semibold text-sm">Master Password</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Used firm-wide to confirm deletion of matters, folders, and documents. Only partners can set or change it.
          </p>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Current Master Password</Label>
              <div className="relative">
                <Input
                  type={showMasterCurrent ? "text" : "password"}
                  value={currentMasterPw}
                  onChange={e => setCurrentMasterPw(e.target.value)}
                  placeholder="Leave blank if setting for the first time"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowMasterCurrent(s => !s)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showMasterCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>New Master Password</Label>
              <div className="relative">
                <Input
                  type={showMasterNew ? "text" : "password"}
                  value={newMasterPw}
                  onChange={e => setNewMasterPw(e.target.value)}
                  placeholder="At least 6 characters"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowMasterNew(s => !s)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showMasterNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Confirm New Master Password</Label>
              <Input
                type="password"
                value={confirmMasterPw}
                onChange={e => setConfirmMasterPw(e.target.value)}
                placeholder="Re-enter new master password"
              />
            </div>
            {mpError && (
              <p className="text-xs text-destructive font-medium flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> {mpError}
              </p>
            )}
            {mpSuccess && (
              <p className="text-xs text-success font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Master password updated successfully.
              </p>
            )}
            <Button onClick={submitMasterPassword} className="btn-royal w-full" disabled={mpSaving || !newMasterPw || !confirmMasterPw}>
              {mpSaving ? "Updating..." : "Update Master Password"}
            </Button>
          </div>
        </div>
      )}

      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Change Password</h3>
        </div>'''
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
