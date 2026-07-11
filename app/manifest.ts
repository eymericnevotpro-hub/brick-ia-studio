import type { MetadataRoute } from "next";

// Web App Manifest — makes "Bproductive" installable on the Android home screen
// as a standalone app, and consumable by PWABuilder / Bubblewrap to wrap into
// a real .apk / .aab for Play Store.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bproductive — Objectifs & habitudes",
    short_name: "Bproductive",
    description:
      "Bproductive : discipline, objectifs financiers et générateur de miniature 9:16 — tout en local sur ton appareil.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#FFF4E8",
    theme_color: "#FF6A1A",
    categories: ["productivity", "lifestyle", "finance", "health", "fitness"],
    lang: "fr",
    dir: "ltr",
    prefer_related_applications: false,
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
        url: "/",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Objectifs",
        short_name: "Objectifs",
        description: "Cagnotte et rêves chiffrés",
        url: "/goals",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Miniature",
        short_name: "Miniature",
        description: "Générateur d'overlay 9:16",
        url: "/miniature",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
