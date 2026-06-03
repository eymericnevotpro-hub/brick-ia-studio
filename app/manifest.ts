import type { MetadataRoute } from "next";

// Web App Manifest — makes "Discipline" installable on the Android home screen
// as a standalone app. Next links this automatically from app/manifest.ts.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Discipline — Emploi du temps",
    short_name: "Discipline",
    description:
      "Ton emploi du temps anti-procrastination : rituels, série de jours et rappels sur l'écran verrouillé pour tenir ta discipline.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFF4E8",
    theme_color: "#FF6A1A",
    categories: ["productivity", "lifestyle"],
    lang: "fr",
    dir: "ltr",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Aujourd'hui",
        short_name: "Aujourd'hui",
        description: "Voir l'emploi du temps du jour",
        url: "/?vue=jour",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
