import re

path = "src/features/legal/views/AccountSettings.tsx"
with open(path, "r") as f:
    content = f.read()

old = '''  const startEnroll = async () => {
    setTwofaError("");
    setTwofaSuccess(false);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    if (error) { setTwofaError(error.message); return; }
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setPendingFactorId(data.id);
    setEnrolling(true);
  };'''

new = '''  const startEnroll = async () => {
    setTwofaError("");
    setTwofaSuccess(false);

    // Clean up any stale/abandoned unverified factors first — Supabase
    // blocks re-enrollment if one already exists with the same friendly name.
    const { data: existing } = await supabase.auth.mfa.listFactors();
    const stale = existing?.totp.filter(f => f.status === "unverified") || [];
    for (const f of stale) {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `totp-${Date.now()}`,
    });
    if (error) { setTwofaError(error.message); return; }
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setPendingFactorId(data.id);
    setEnrolling(true);
  };'''

if old not in content:
    print("❌ Anchor not found — file may have changed. Aborting.")
else:
    content = content.replace(old, new)
    with open(path, "w") as f:
        f.write(content)
    print("✅ startEnroll patched: stale unverified factors now cleaned up automatically, and each enrollment gets a unique friendly name.")
