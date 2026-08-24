import NavTabs from "@/components/NavTabs";
import SportBoard from "./SportBoard";

export const metadata = {
  title: "Sport — Séance & courses",
  description: "Ta séance du jour, ton suivi de reps, et ta liste de courses alimentation.",
};

export default function SportPage() {
  return (
    <main style={{ position: "relative", minHeight: "100vh" }}>
      <NavTabs current="sport" />
      <SportBoard />
    </main>
  );
}
