// Pure logic + types for the discipline dashboard. No React here.
// Everything the UI persists lives in localStorage (see useLS), so the
// app works offline with zero backend.

export const GOAL = 10000;

export type IconName =
  | "spark"
  | "bolt"
  | "play"
  | "wave"
  | "users"
  | "target"
  | "calendar";

export interface Habit {
  id: string;
  label: string;
  icon: IconName;
  time: string; // "HH:MM"
  duration: number; // minutes
  xp: number; // reward when checked (gamification)
}

export interface Prices {
  skoolUsd: number; // $/member/month
  skoolCostUsd: number; // Skool platform cost $/month
  fx: number; // 1 USD = X EUR
  shortVid: number; // € per short brand video
  longVid: number; // € per long brand video
}

export interface Fiscal {
  urssaf: number; // social contributions, percent
  impot: number; // versement libératoire, percent
}

export interface ServiceEntry {
  id: string;
  label: string;
  amount: number; // € for this one-off service payment
}

export interface MonthCounters {
  shortVids: number;
  longVids: number;
  posts: number;
  services: ServiceEntry[];
}

export type GoalMode = "net" | "brut";

export const DEFAULT_HABITS: Habit[] = [
  { id: "wake", label: "Réveil + 10 min sans téléphone", icon: "spark", time: "07:30", duration: 30, xp: 10 },
  { id: "learn", label: "30 min de veille IA", icon: "spark", time: "08:00", duration: 30, xp: 15 },
  { id: "deep", label: "Deep work — script + tournage", icon: "bolt", time: "09:00", duration: 120, xp: 40 },
  { id: "post", label: "Poster 1 vidéo TikTok/Insta", icon: "play", time: "12:00", duration: 30, xp: 20 },
  { id: "lunch", label: "Pause déjeuner", icon: "wave", time: "12:30", duration: 60, xp: 5 },
  { id: "skool", label: "Engagement Skool (DM, post)", icon: "users", time: "14:00", duration: 60, xp: 50 },
  { id: "outreach", label: "Prospecter 5 marques", icon: "target", time: "15:00", duration: 60, xp: 30 },
  { id: "edit", label: "Montage / livraison vidéo", icon: "bolt", time: "16:30", duration: 90, xp: 25 },
  { id: "review", label: "Bilan du jour + plan demain", icon: "calendar", time: "18:30", duration: 15, xp: 15 },
];

export const DEFAULT_PRICES: Prices = {
  skoolUsd: 30,
  skoolCostUsd: 100,
  fx: 0.92,
  shortVid: 80,
  longVid: 150,
};

export const DEFAULT_FISCAL: Fiscal = { urssaf: 24, impot: 2.2 };
export const DEFAULT_MEMBERS = 24;

export function emptyCounters(): MonthCounters {
  return { shortVids: 0, longVids: 0, posts: 0, services: [] };
}

// ── date helpers ──────────────────────────────────────────────────────────

export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function monthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(d = new Date()): string {
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

export function dayLabel(d = new Date()): string {
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

// ── formatting ──────────────────────────────────────────────────────────

export const fmtEur = (n: number) => Math.round(n).toLocaleString("fr-FR") + " €";
export const fmtUsd = (n: number) => "$" + Math.round(n).toLocaleString("fr-FR");

// ── finance ──────────────────────────────────────────────────────────────

export interface FinanceInput {
  prices: Prices;
  members: number;
  fiscal: Fiscal;
  counters: MonthCounters;
}

export interface Finance {
  skoolGrossUsd: number;
  skoolGrossEur: number;
  skoolPlatformEur: number;
  brandGrossEur: number;
  servicesEur: number;
  caBrut: number;
  urssafEur: number;
  impotEur: number;
  chargesEur: number;
  netEur: number;
}

export function computeFinance({ prices, members, fiscal, counters }: FinanceInput): Finance {
  const skoolGrossUsd = members * prices.skoolUsd;
  const skoolGrossEur = skoolGrossUsd * prices.fx;
  const skoolPlatformEur = prices.skoolCostUsd * prices.fx;
  const brandGrossEur = counters.shortVids * prices.shortVid + counters.longVids * prices.longVid;
  const servicesEur = (counters.services ?? []).reduce((sum, s) => sum + (s.amount || 0), 0);
  const caBrut = skoolGrossEur + brandGrossEur + servicesEur;
  const urssafEur = caBrut * (fiscal.urssaf / 100);
  const impotEur = caBrut * (fiscal.impot / 100);
  const chargesEur = urssafEur + impotEur;
  const netEur = caBrut - chargesEur - skoolPlatformEur;
  return {
    skoolGrossUsd,
    skoolGrossEur,
    skoolPlatformEur,
    brandGrossEur,
    servicesEur,
    caBrut,
    urssafEur,
    impotEur,
    chargesEur,
    netEur,
  };
}

export function daysInMonth(d = new Date()): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}
