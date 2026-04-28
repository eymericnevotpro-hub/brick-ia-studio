import Navbar from "@/components/Navbar";
import AnimatedBackground from "@/components/AnimatedBackground";
import VideoEditor from "./VideoEditor";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Éditeur Vidéo — Brick IA Studio",
  description: "Monte tes vidéos IA directement dans le navigateur. Arrange, coupe, exporte.",
};

export default function EditorPage() {
  return (
    <main className="relative min-h-screen" style={{ background: "#080401" }}>
      <AnimatedBackground />
      <Navbar />
      <VideoEditor />
    </main>
  );
}
