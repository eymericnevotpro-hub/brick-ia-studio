// Pure logic + types for the savings goals page. Data is stored in
// localStorage via the client component (no backend).

export interface Deposit {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number; // €, can be negative for withdrawals
  note?: string;
}

export interface Goal {
  id: string;
  emoji: string;
  name: string;
  target: number; // €
  deposits: Deposit[];
  color: string; // accent
  createdAt: string; // YYYY-MM-DD
}

export const DEFAULT_GOALS: Goal[] = [
  {
    id: "car",
    emoji: "🚗",
    name: "Voiture de rêve",
    target: 40000,
    deposits: [],
    color: "#FF6A1A",
    createdAt: "2026-01-01",
  },
  {
    id: "house",
    emoji: "🏡",
    name: "Maison de rêve avec mon amoureuse",
    target: 250000,
    deposits: [],
    color: "#1A1208",
    createdAt: "2026-01-01",
  },
];

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

export function savedFor(g: Goal): number {
  return g.deposits.reduce((s, d) => s + d.amount, 0);
}

export function remainingFor(g: Goal): number {
  return Math.max(0, g.target - savedFor(g));
}

export function pctFor(g: Goal): number {
  if (g.target <= 0) return 0;
  return Math.min(1, savedFor(g) / g.target);
}

export const fmtEur = (n: number) =>
  Math.round(n).toLocaleString("fr-FR") + " €";

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2, 10);
}
