import NavTabs from "@/components/NavTabs";
import MiniatureMaker from "./MiniatureMaker";

export const metadata = {
  title: "Miniature — Overlay 9:16",
  description: "Génère ta miniature Brick IA Academy : glisse ton image en fond, change les textes, télécharge en PNG.",
};

export default function MiniaturePage() {
  return (
    <main style={{ position: "relative", minHeight: "100vh" }}>
      <NavTabs current="miniature" />
      <MiniatureMaker />
    </main>
  );
}
