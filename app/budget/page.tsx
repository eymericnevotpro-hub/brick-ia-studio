import NavTabs from "@/components/NavTabs";
import BudgetBoard from "./BudgetBoard";

export const metadata = {
  title: "Budget — Dépenses du mois",
  description: "Note chaque soir ce que vous dépensez, par catégorie, pour dépenser moins et épargner plus.",
};

export default function BudgetPage() {
  return (
    <main style={{ position: "relative", minHeight: "100vh" }}>
      <NavTabs current="budget" />
      <BudgetBoard />
    </main>
  );
}
