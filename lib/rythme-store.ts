// Life-rhythm data: mood, sleep, and pleasant activities ("plaisir").
// Behavioural activation — doing one enjoyable thing a day — is one of the
// best-supported self-help levers for low mood, hence the Plaisir section.

/* ── humeur ──────────────────────────────────────────────────────── */

export type Moods = Record<string, number>; // dateISO -> 1..5

export const MOOD_FACES = ["😞", "🙁", "😐", "🙂", "😄"];
export const MOOD_LABELS = ["Très bas", "Bas", "Moyen", "Bien", "Très bien"];
export const MOOD_COLORS = ["#C44A00", "#E0762B", "#C9A227", "#7FB069", "#19A36A"];

/* ── sommeil ─────────────────────────────────────────────────────── */

export interface Night {
  bed: string; // "23:30" — heure de coucher
  wake: string; // "07:00" — heure de réveil
  quality?: number; // 1..5
}

export type Sleep = Record<string, Night>; // dateISO (jour du réveil) -> nuit

export const SLEEP_TARGET_MIN = 7;
export const SLEEP_TARGET_MAX = 8;

// Hours slept, handling the midnight crossing.
export function sleepHours(n?: Night): number {
  if (!n || !n.bed || !n.wake) return 0;
  const [bh, bm] = n.bed.split(":").map(Number);
  const [wh, wm] = n.wake.split(":").map(Number);
  if ([bh, bm, wh, wm].some((v) => Number.isNaN(v))) return 0;
  const bed = bh * 60 + bm;
  const wake = wh * 60 + wm;
  const mins = (wake - bed + 1440) % 1440;
  return Math.round((mins / 60) * 10) / 10;
}

export function sleepVerdict(h: number): { label: string; color: string } {
  if (h === 0) return { label: "—", color: "var(--ink-3)" };
  if (h < 6) return { label: "Trop court", color: "#C44A00" };
  if (h < SLEEP_TARGET_MIN) return { label: "Un peu court", color: "#E0762B" };
  if (h <= 9) return { label: "Bon", color: "var(--green)" };
  return { label: "Très long", color: "#E0762B" };
}

/* ── plaisir / jeux ──────────────────────────────────────────────── */

export interface JoyActivity {
  id: string;
  label: string;
  emoji: string;
}

export type JoyDone = Record<string, string[]>; // dateISO -> activity ids

export const DEFAULT_JOY: JoyActivity[] = [
  { id: "jeuvideo", label: "Jeu vidéo (une partie)", emoji: "🎮" },
  { id: "societe", label: "Jeu de société avec Suzy", emoji: "🎲" },
  { id: "echecs", label: "Échecs / puzzle", emoji: "♟️" },
  { id: "film", label: "Film ou série à deux", emoji: "🎬" },
  { id: "balade", label: "Balade dehors", emoji: "🚶" },
  { id: "musique", label: "Musique à fond", emoji: "🎧" },
  { id: "cuisine", label: "Cuisiner un truc bon", emoji: "🍳" },
  { id: "appel", label: "Appeler un pote / la famille", emoji: "📞" },
  { id: "lecture", label: "Lire 20 min", emoji: "📖" },
  { id: "creer", label: "Créer sans but pro (dessin, montage fun)", emoji: "✏️" },
  { id: "sortir", label: "Sortir voir des gens", emoji: "☕" },
  { id: "rien", label: "Ne rien faire, vraiment", emoji: "🛋️" },
];

export const JOY_EMOJIS = ["🎮", "🎲", "♟️", "🎬", "🚶", "🎧", "🍳", "📞", "📖", "✏️", "☕", "🛋️", "🎸", "🏓", "🧩", "🌳"];

export function joyUid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2, 10);
}

/* ── shared date helpers ─────────────────────────────────────────── */

export function isoOf(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function lastNDays(n: number, from = new Date()): { iso: string; date: Date }[] {
  const out: { iso: string; date: Date }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(from);
    d.setDate(from.getDate() - i);
    out.push({ iso: isoOf(d), date: d });
  }
  return out;
}

export const DAY_INITIAL = ["D", "L", "M", "M", "J", "V", "S"];

/* ── top 3 du jour ───────────────────────────────────────────────── */

export type Top3 = Record<string, string[]>; // dateISO -> 3 strings

/* ── profils (Brick / Suzy) ──────────────────────────────────────── */

export type Person = "brick" | "suzy";

export const PERSONS: { id: Person; label: string; color: string; emoji: string }[] = [
  { id: "brick", label: "Brick", color: "#FF6A1A", emoji: "🧱" },
  { id: "suzy", label: "Suzy", color: "#FF4F9D", emoji: "🌸" },
];

// Namespace a storage key per person. Brick keeps the original keys so his
// existing history is untouched; Suzy gets a ".suzy" suffix. The "disc."
// prefix is preserved either way, so both still sync and back up.
export function pKey(base: string, who: Person): string {
  return who === "brick" ? base : `${base}.suzy`;
}
