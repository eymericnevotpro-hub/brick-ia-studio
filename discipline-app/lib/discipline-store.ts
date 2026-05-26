// Local-first store for the discipline dashboard. Everything lives in
// localStorage so the app works offline with zero backend.

export interface DisciplineSettings {
  goalEur: number; // monthly target (chiffre d'affaires or net, see goalBasis)
  goalBasis: "brut" | "net"; // does the goal track CA brut or net en poche ?
  usdToEur: number; // conversion rate, editable (offline-friendly)
  skoolPriceUsd: number; // monthly price per member, in USD
  skoolMembers: number; // current paying members
  skoolCostUsd: number; // monthly running cost of Skool, in USD (≈ 100)
  shortVideoEur: number; // avg paid per short brand video
  longVideoEur: number; // avg paid per long brand video
  cotisationsRate: number; // URSSAF social contributions (BNC), as a fraction
  impotRate: number; // versement libératoire income tax (BNC), as a fraction
}

export interface MonthRevenue {
  shortVideos: number;
  longVideos: number;
  otherEur: number; // TikTok / Insta sponsorships, misc
}

export interface DisciplineState {
  habits: string[];
  // month key "YYYY-MM" -> habit index -> list of completed day numbers (1..31)
  completions: Record<string, Record<number, number[]>>;
  revenue: Record<string, MonthRevenue>;
  settings: DisciplineSettings;
}

export const DEFAULT_HABITS = [
  "Réveil 6:30",
  "Boire de l'eau",
  "Lire 10 pages",
  "Pas de cigarette",
  "2 fruits",
  "Moins de téléphone",
  "Training",
  "Dormir avant 23:00",
];

export const DEFAULT_SETTINGS: DisciplineSettings = {
  goalEur: 10000,
  goalBasis: "brut",
  usdToEur: 0.92,
  skoolPriceUsd: 50,
  skoolMembers: 0,
  skoolCostUsd: 100,
  shortVideoEur: 80,
  longVideoEur: 150,
  cotisationsRate: 0.246, // BNC micro-entrepreneur 2026 — éditable
  impotRate: 0.022, // versement libératoire BNC (prestations)
};

const STORAGE_KEY = "brick-discipline-v1";

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

export function emptyState(): DisciplineState {
  return {
    habits: [...DEFAULT_HABITS],
    completions: {},
    revenue: {},
    settings: { ...DEFAULT_SETTINGS },
  };
}

export function loadState(): DisciplineState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<DisciplineState>;
    return {
      habits: parsed.habits?.length ? parsed.habits : [...DEFAULT_HABITS],
      completions: parsed.completions ?? {},
      revenue: parsed.revenue ?? {},
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
    };
  } catch {
    return emptyState();
  }
}

export function saveState(state: DisciplineState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage full or unavailable — ignore, the UI keeps working in-memory
  }
}

// ── Finance ─────────────────────────────────────────────────────────────

export interface FinanceBreakdown {
  skoolGrossEur: number; // CA Skool converti en €
  skoolCostEur: number; // coût mensuel Skool en €
  videosEur: number; // revenus vidéos de marque
  otherEur: number;
  caBrut: number; // chiffre d'affaires total (base de calcul URSSAF)
  cotisations: number; // charges sociales URSSAF
  impot: number; // impôt versement libératoire
  charges: number; // cotisations + impôt
  netApresPrelevements: number; // CA − charges
  netEnPoche: number; // net − coût Skool
}

export function computeFinance(
  rev: MonthRevenue,
  s: DisciplineSettings,
): FinanceBreakdown {
  const skoolGrossEur = s.skoolMembers * s.skoolPriceUsd * s.usdToEur;
  const skoolCostEur = s.skoolCostUsd * s.usdToEur;
  const videosEur = rev.shortVideos * s.shortVideoEur + rev.longVideos * s.longVideoEur;
  const otherEur = rev.otherEur;

  const caBrut = skoolGrossEur + videosEur + otherEur;
  const cotisations = caBrut * s.cotisationsRate;
  const impot = caBrut * s.impotRate;
  const charges = cotisations + impot;
  const netApresPrelevements = caBrut - charges;
  const netEnPoche = netApresPrelevements - skoolCostEur;

  return {
    skoolGrossEur,
    skoolCostEur,
    videosEur,
    otherEur,
    caBrut,
    cotisations,
    impot,
    charges,
    netApresPrelevements,
    netEnPoche,
  };
}

export function emptyRevenue(): MonthRevenue {
  return { shortVideos: 0, longVideos: 0, otherEur: 0 };
}

export const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
