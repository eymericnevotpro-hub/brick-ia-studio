import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Discipline — Vers 10 000 € / mois",
  description:
    "Tableau de bord ludique pour autoentrepreneur : objectif de revenus, emploi du temps, rituels avec XP, charges URSSAF et coach IA quotidien.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        <div className="bg-blob a" />
        <div className="bg-blob b" />
        {children}
      </body>
    </html>
  );
}
