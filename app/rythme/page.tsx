import NavTabs from "@/components/NavTabs";
import RythmeBoard from "./RythmeBoard";

export const metadata = {
  title: "Rythme — Jour, sommeil, sport, plaisir",
  description: "Un rythme de vie simple et régulier : routine du jour, humeur, sommeil, sport et activités plaisir.",
};

export default function RythmePage() {
  return (
    <main style={{ position: "relative", minHeight: "100vh" }}>
      <NavTabs current="rythme" />
      <RythmeBoard />
    </main>
  );
}
