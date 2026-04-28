import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Brick IA Studio — Outils IA pour créateurs",
  description:
    "Les meilleurs outils IA pour créer des vidéos et images virales. Seedance 2.0, Kling 3.0, Veo3, Grok, Nano Banana Pro et plus — ultra simple, même pour débutants.",
  keywords: ["IA", "intelligence artificielle", "vidéo IA", "influenceur IA", "créateur de contenu"],
  openGraph: {
    title: "Brick IA Studio",
    description: "Outils IA pour créateurs de contenu — vidéos et images virales",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={inter.variable}>
      <body style={{ background: "#080401" }}>{children}</body>
    </html>
  );
}
