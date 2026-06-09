import NavTabs from "@/components/NavTabs";
import PlancheProgram from "./PlancheProgram";

export const metadata = {
  title: "Planche — Programme complet",
  description: "Programme calisthenics structuré pour passer de zéro à la full planche, avec exercices, accessoires de salle et planning hebdomadaire.",
};

export default function TrainingPage() {
  return (
    <main style={{ position: "relative", minHeight: "100vh" }}>
      <NavTabs current="planche" />
      <PlancheProgram />
    </main>
  );
}
