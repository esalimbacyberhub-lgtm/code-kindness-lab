path = "src/features/legal/views/Matters.tsx"
with open(path, "r") as f:
    content = f.read()

old = '''  const [docDeleteTarget,  setDocDeleteTarget]  = useState<{ id: string; name: string } | null>(null);
  const [docDeletePassword, setDocDeletePassword] = useState("");
  const [docDeleteError,  setDocDeleteError]  = useState("");
  const [docDeleting,     setDocDeleting]     = useState(false);
  const docSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));'''

new = '''  const [docDeleteTarget,  setDocDeleteTarget]  = useState<{ id: string; name: string } | null>(null);
  const [docDeletePassword, setDocDeletePassword] = useState("");
  const [docDeleteError,  setDocDeleteError]  = useState("");
  const [docDeleting,     setDocDeleting]     = useState(false);
  const docSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const [matterDeleteTarget,  setMatterDeleteTarget]  = useState<Matter | null>(null);
  const [matterDeletePassword, setMatterDeletePassword] = useState("");
  const [matterDeleteError,  setMatterDeleteError]  = useState("");
  const [matterDeleting,     setMatterDeleting]     = useState(false);

  const confirmMatterDelete = async () => {
    if (!matterDeleteTarget || !onDeleteMatterWithPassword) return;
    setMatterDeleting(true);
    setMatterDeleteError("");
    const result = await onDeleteMatterWithPassword(matterDeleteTarget.id, matterDeletePassword);
    setMatterDeleting(false);
    if (!result.ok) {
      setMatterDeleteError(result.error || "Failed to delete matter");
      return;
    }
    setMatterDeleteTarget(null);
    setMatterDeletePassword("");
    setSelected(null);
  };'''

if old not in content:
    print("❌ Anchor not found — no changes written. Paste the file contents and I'll fix the anchor.")
    raise SystemExit(1)

content = content.replace(old, new, 1)
with open(path, "w") as f:
    f.write(content)

print("✅ Missing matterDeleteTarget state and confirmMatterDelete restored.")
