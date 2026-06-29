// Pure logic + types for the savings page. One shared pool ("cagnotte"),
// goals are filled in priority order (first goal gets every euro until it's
// done, then the next one starts filling). All data lives in localStorage.

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number; // € (positive = deposit, negative = withdrawal)
  note?: string;
}

export interface Goal {
  id: string;
  emoji: string;
  name: string;
  target: number; // €
  color: string;
}

export interface GoalsState {
  transactions: Transaction[];
  goals: Goal[]; // ordered by priority (first = filled first)
}

export const DEFAULT_STATE: GoalsState = {
  transactions: [],
  goals: [
    { id: "car", emoji: "🚗", name: "Voiture de rêve", target: 40000, color: "#FF6A1A" },
    { id: "house", emoji: "🏡", name: "Maison de rêve avec mon amoureuse", target: 250000, color: "#1A1208" },
  ],
};

export interface Timeframe {
  label: string;
  months: number;
}

export const TIMEFRAMES: Timeframe[] = [
  { label: "6 mois", months: 6 },
  { label: "1 an", months: 12 },
  { label: "2 ans", months: 24 },
  { label: "3 ans", months: 36 },
  { label: "5 ans", months: 60 },
];

export const QUICK_AMOUNTS = [10, 50, 100, 500, 1000];

export function totalSaved(s: GoalsState): number {
  return s.transactions.reduce((sum, t) => sum + t.amount, 0);
}

export interface GoalProgress {
  goal: Goal;
  saved: number; // € allocated to this goal in the cumulative model
  remaining: number;
  pct: number; // 0..1
  reached: boolean;
  cumulativeStart: number; // € required to *start* filling this goal
}

export function progressOf(s: GoalsState): GoalProgress[] {
  const total = totalSaved(s);
  let acc = 0;
  return s.goals.map((g) => {
    const start = acc;
    const saved = Math.max(0, Math.min(g.target, total - start));
    acc += g.target;
    const remaining = Math.max(0, g.target - saved);
    return {
      goal: g,
      saved,
      remaining,
      pct: g.target > 0 ? Math.min(1, saved / g.target) : 0,
      reached: saved >= g.target,
      cumulativeStart: start,
    };
  });
}

// Monthly saving rate from net positive deposits in the last 90 days.
export function monthlyRate(s: GoalsState): number {
  const now = Date.now();
  const cutoff = now - 90 * 24 * 60 * 60 * 1000;
  const recent = s.transactions.filter((t) => new Date(t.date).getTime() >= cutoff);
  const net = recent.reduce((sum, t) => sum + t.amount, 0);
  if (net <= 0) return 0;
  // Use the window length we actually observed, capped at 3 months, to avoid
  // wildly overestimating after a single big deposit on day 1.
  const first = recent.reduce((min, t) => Math.min(min, new Date(t.date).getTime()), now);
  const days = Math.max(7, Math.min(90, (now - first) / (24 * 60 * 60 * 1000) + 1));
  return (net / days) * (365.25 / 12);
}

export interface Eta {
  months: number;
  date: Date;
}

export function etaFor(remaining: number, rate: number): Eta | null {
  if (rate <= 0 || remaining <= 0) return null;
  const months = remaining / rate;
  const d = new Date();
  d.setMonth(d.getMonth() + Math.ceil(months));
  return { months, date: d };
}

export const fmtEur = (n: number) => Math.round(n).toLocaleString("fr-FR") + " €";

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2, 10);
}

export function fmtMonths(months: number): string {
  if (months < 1) return "moins d'un mois";
  const m = Math.ceil(months);
  if (m < 12) return `${m} mois`;
  const years = Math.floor(m / 12);
  const rem = m % 12;
  if (rem === 0) return `${years} an${years > 1 ? "s" : ""}`;
  return `${years} an${years > 1 ? "s" : ""} et ${rem} mois`;
}

export function fmtDateShort(d: Date): string {
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}
