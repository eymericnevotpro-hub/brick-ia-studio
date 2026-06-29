import NavTabs from "@/components/NavTabs";
import GoalsBoard from "./GoalsBoard";

export const metadata = {
  title: "Objectifs — Mes rêves chiffrés",
  description: "Suivre l'argent mis de côté pour chaque objectif (voiture, maison, projet…) avec des projections concrètes pour rester motivé.",
};

export default function GoalsPage() {
  return (
    <main style={{ position: "relative", minHeight: "100vh" }}>
      <NavTabs current="goals" />
      <GoalsBoard />
    </main>
  );
}
