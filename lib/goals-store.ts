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
  saved: number; // € allocated to this goal's slot
  remaining: number; // € left in this slot
  remainingTotal: number; // € left in cagnotte until this goal is fully done (incl. priors)
  pct: number; // 0..1, slot only
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
    const remainingTotal = Math.max(0, acc - total);
    return {
      goal: g,
      saved,
      remaining,
      remainingTotal,
      pct: g.target > 0 ? Math.min(1, saved / g.target) : 0,
      reached: saved >= g.target,
      cumulativeStart: start,
    };
  });
}

// Monthly saving rate = net mouvements over the last 30 days, no extrapolation.
// If the user put 10 000 € aside today, the rate is 10 000 €/mois — that's
// literally what landed in the cagnotte this month. Projecting a half-day
// of activity onto a full month would lie.
export function monthlyRate(s: GoalsState): number {
  const now = Date.now();
  const cutoff = now - 30 * 24 * 60 * 60 * 1000;
  const recent = s.transactions.filter((t) => new Date(t.date).getTime() >= cutoff);
  const net = recent.reduce((sum, t) => sum + t.amount, 0);
  return Math.max(0, net);
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

/* ── investment simulation (compound interest) ─────────────────────── */

export interface InvestmentSettings {
  enabled: boolean;
  initial: number; // capital de départ placé (€)
  annualRatePct: number; // rendement annuel attendu, en %
  monthly: number; // versement mensuel (€)
}

export const DEFAULT_INVESTMENT: InvestmentSettings = {
  enabled: false,
  initial: 0,
  annualRatePct: 7, // moyenne historique d'un ETF actions mondial long terme
  monthly: 0,
};

// Iteratively grow the balance month by month until the target is reached.
// Returns null if it would take more than maxMonths (default = 50 years).
export function monthsToReachWithInvestment(
  initial: number,
  monthly: number,
  annualRatePct: number,
  target: number,
  maxMonths = 600,
): number | null {
  if (initial >= target) return 0;
  if (monthly <= 0 && annualRatePct <= 0) return null;
  const r = annualRatePct / 100 / 12; // monthly rate
  let balance = initial;
  for (let m = 1; m <= maxMonths; m++) {
    balance = balance * (1 + r) + monthly;
    if (balance >= target) return m;
  }
  return null;
}

// Project balance after a given number of months — used for a small "courbe" preview.
export function balanceAfter(
  initial: number,
  monthly: number,
  annualRatePct: number,
  months: number,
): number {
  const r = annualRatePct / 100 / 12;
  let balance = initial;
  for (let m = 0; m < months; m++) {
    balance = balance * (1 + r) + monthly;
  }
  return balance;
}

export function etaFromMonths(months: number): Eta {
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
