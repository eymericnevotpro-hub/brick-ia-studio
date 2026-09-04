import NavTabs from "@/components/NavTabs";
import FacturesBoard from "./FacturesBoard";

export const metadata = {
  title: "Factures — Créateur de factures",
  description: "Crée, numérote et imprime tes factures d'autoentrepreneur.",
};

export default function FacturesPage() {
  return (
    <main style={{ position: "relative", minHeight: "100vh" }}>
      <div className="no-print">
        <NavTabs current="factures" />
      </div>
      <FacturesBoard />
    </main>
  );
}
