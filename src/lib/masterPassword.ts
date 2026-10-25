// Delete functions answer { ok: true } on success, or { ok: false, error } for a wrong
// password or a lock-out. Older versions answered a plain true, which is still accepted.
export function interpretDelete(data: unknown): { ok: boolean; error?: string } {
  if (data === true) return { ok: true }
  if (data && typeof data === "object" && (data as any).ok === true) return { ok: true }
  const msg = data && typeof data === "object" ? (data as any).error : undefined
  return { ok: false, error: msg || "Invalid master password" }
}
