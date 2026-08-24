// Workout program + rep tracking for the Sport tab.

export type SportKind = "muscu" | "course" | "fractionne";

// Lun/Mer/Ven/Dim → séance muscu ; Mar/Sam → course ; Jeu → fractionné.
export function sportKindForWeekday(wd: number): SportKind {
  if (wd === 1 || wd === 3 || wd === 5 || wd === 0) return "muscu";
  if (wd === 4) return "fractionne";
  return "course"; // 2 (mardi), 6 (samedi)
}

export interface Exo {
  id: string;
  label: string;
  detail: string;
  log?: boolean; // track reps for progression
}

export const SESSION_EXOS: Exo[] = [
  { id: "tractions", label: "Tractions", detail: "3 séries · max reps −1", log: true },
  { id: "dips", label: "Dips", detail: "3 séries · max reps −1", log: true },
  { id: "fentes", label: "Fentes bulgares", detail: "3 × 10 par jambe" },
  { id: "gainage", label: "Gainage planche", detail: "3 × 30-45 s" },
];

export const COURSE_ITEM = { id: "course", label: "Course tranquille", detail: "25-30 min tranquille" };
export const FRACTIONNE_ITEM = { id: "fractionne", label: "Fractionné", detail: "8 × (30 s vite / 90 s marche)" };

export const WEEKDAYS_SHORT = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon → Sun

export function sportTodayIso(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function dayLabel(d = new Date()): string {
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

// Per-date rep log for tractions & dips (3 series each).
export interface RepLog {
  tractions: number[];
  dips: number[];
}

export type SportReps = Record<string, RepLog>;
export type SportDone = Record<string, string[]>; // dateISO -> exo/activity ids done

export function maxRep(series: number[]): number {
  return series.reduce((m, v) => Math.max(m, v || 0), 0);
}

export function kindLabel(k: SportKind): string {
  return k === "muscu" ? "Séance muscu" : k === "fractionne" ? "Fractionné (course)" : "Course tranquille";
}
export function kindEmoji(k: SportKind): string {
  return k === "muscu" ? "💪" : k === "fractionne" ? "🏃‍♂️💨" : "🏃";
}
