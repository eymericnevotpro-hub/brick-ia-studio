import NavTabs from "@/components/NavTabs";
import TournageBoard from "./TournageBoard";

export const metadata = {
  title: "Tournage — Mes idées de vidéos",
  description: "Ta liste d'idées de vidéos à tourner, avec des références pour t'inspirer.",
};

export default function TournagePage() {
  return (
    <main style={{ position: "relative", minHeight: "100vh" }}>
      <NavTabs current="tournage" />
      <TournageBoard />
    </main>
  );
}
