// App-wide date display: year-month-day, e.g. 2026-10-24.
const pad = (n: number) => String(n).padStart(2, "0");

export function formatDate(input?: string | number | Date | null): string {
  if (input === null || input === "") return "—";
  if (typeof input === "string") {
    // Plain dates (optionally with a midnight time) are used as written, so a
    // timezone shift can never move them to another day.
    const m = input.match(/^(\d{4})-(\d{2})-(\d{2})(?:T00:00:00)?$/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  }
  const d = input === undefined ? new Date() : new Date(input);
  if (isNaN(d.getTime())) return "—";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
