path = "src/features/legal/hooks/useSupabaseMatters.ts"
with open(path, "r") as f:
    content = f.read()

old = '''  const deleteMatter = useCallback(async (id: string) => {
    const { error } = await supabase.from("matters").delete().eq("id", id);
    if (error) { console.error("deleteMatter:", error); alert("Could not delete matter: " + error.message); }
  }, []);'''

new = '''  const deleteMatter = useCallback(async (id: string) => {
    const { error } = await supabase.from("matters").delete().eq("id", id);
    if (error) { console.error("deleteMatter:", error); alert("Could not delete matter: " + error.message); }
  }, []);

  // Password-gated matter delete — same security_settings-backed check used
  // for folders and documents.
  const deleteMatterWithPassword = useCallback(async (id: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    const { error } = await supabase.rpc("delete_matter_with_password", {
      p_matter_id: id,
      p_password: password,
    });
    if (error) {
      return { ok: false, error: error.message || "Failed to delete matter" };
    }
    return { ok: true };
  }, []);'''

if old not in content:
    print("❌ Anchor not found — no changes written.")
    raise SystemExit(1)

content = content.replace(old, new, 1)

old2 = "return { matters, loading, addMatter, updateMatter, deleteMatter, assignMatter };"
new2 = "return { matters, loading, addMatter, updateMatter, deleteMatter, deleteMatterWithPassword, assignMatter };"

if old2 not in content:
    print("❌ Second anchor not found — no changes written.")
    raise SystemExit(1)

content = content.replace(old2, new2, 1)

with open(path, "w") as f:
    f.write(content)

print("✅ Added deleteMatterWithPassword to useSupabaseMatters.ts")
