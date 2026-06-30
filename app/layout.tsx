import type { Metadata, Viewport } from "next";
import { CloudSyncProvider } from "@/components/CloudSyncProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bproductive — Objectifs & habitudes",
  description:
    "Bproductive : discipline, objectifs financiers, programme planche et générateur de miniature 9:16 — tout en local sur ton appareil.",
  applicationName: "Bproductive",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Bproductive",
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
