import NavTabs from "@/components/NavTabs";
import DisciplineDashboard from "./DisciplineDashboard";

export default function Home() {
  return (
    <main style={{ position: "relative", minHeight: "100vh" }}>
      <NavTabs current="dashboard" />
      <DisciplineDashboard />
    </main>
  );
}
