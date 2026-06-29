import type { Metadata, Viewport } from "next";
import { CloudSyncProvider } from "@/components/CloudSyncProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Discipline — Emploi du temps",
  description:
    "Ton emploi du temps anti-procrastination : rituels avec XP, série de jours et rappels sur l'écran verrouillé pour tenir ta discipline.",
  applicationName: "Discipline",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Discipline",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#FF6A1A",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
        <CloudSyncProvider>{children}</CloudSyncProvider>
      </body>
    </html>
  );
}
