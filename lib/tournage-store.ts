// Video ideas to film ("Tournage"). Stored in localStorage / synced.

export interface VideoIdea {
  id: string;
  title: string;
  note?: string;
  ref?: string; // reference URL (YouTube / Instagram / …)
  done?: boolean;
  createdAt: string; // YYYY-MM-DD
}

export function ideaUid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2, 10);
}

export function ideaTodayIso(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const DEFAULT_IDEAS: VideoIdea[] = [
  {
    id: "motion-remotion",
    title: "Motion design avec Claude + Remotion",
    note: "Montrer qu'on peut faire du motion design avec Claude + Remotion.",
    ref: "https://www.youtube.com/shorts/_RWpJSvAAAU",
    createdAt: "2026-01-01",
  },
  {
    id: "gauntlet-loop",
    title: "Gauntlet Loop Claude",
    note: "Faire des jeux (et plein d'autres choses) avec le Gauntlet Loop de Claude.",
    ref: "https://www.youtube.com/watch?v=BNjzXcEXmg4",
    createdAt: "2026-01-01",
  },
  {
    id: "seeclic",
    title: "Vidéo SeeClic",
    note: "",
    ref: "https://www.instagram.com/p/DbOchs-oDVT/",
    createdAt: "2026-01-01",
  },
  {
    id: "porsche-fx",
    title: "Effet spécial : ma voiture → Porsche",
    note: "Effet spécial où je change ma voiture en Porsche.",
    ref: "",
    createdAt: "2026-01-01",
  },
  {
    id: "seedance-muscle",
    title: "Modification physique / muscle (viral)",
    note: "Contenu viral : transformation physique / muscle avec Seedance 2.0.",
    ref: "https://www.youtube.com/watch?v=L6s1A4EcUYo",
    createdAt: "2026-01-01",
  },
];

export type RefKind = "youtube" | "instagram" | "tiktok" | "link" | null;

export function refKind(url?: string): RefKind {
  if (!url) return null;
  const u = url.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("instagram.com")) return "instagram";
  if (u.includes("tiktok.com")) return "tiktok";
  return "link";
}

// Extract a YouTube video id from watch / youtu.be / shorts URLs.
export function youtubeId(url?: string): string | null {
  if (!url) return null;
  const patterns = [
    /[?&]v=([\w-]{6,})/,
    /youtu\.be\/([\w-]{6,})/,
    /youtube\.com\/shorts\/([\w-]{6,})/,
    /youtube\.com\/embed\/([\w-]{6,})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export function youtubeThumb(url?: string): string | null {
  const id = youtubeId(url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}
