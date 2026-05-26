import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Discipline — Objectifs & habitudes",
  description:
    "Tableau de bord ludique pour autoentrepreneur : roue d'habitudes, objectif de revenus 10 000 € et calcul URSSAF en temps réel.",
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
