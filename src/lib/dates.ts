export const WEEKS = ["W1", "W2", "W3", "W4"] as const;
export type WeekKey = (typeof WEEKS)[number];

export function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function monthKeyLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, 1));
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function todayDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function monthKeyFromDateStr(dateStr: string): string {
  return dateStr.slice(0, 7);
}
