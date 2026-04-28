import { getTool, TOOLS } from "@/lib/tools";
import { notFound } from "next/navigation";
import ToolWorkspace from "./ToolWorkspace";
import Navbar from "@/components/Navbar";
import AnimatedBackground from "@/components/AnimatedBackground";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return TOOLS.map((t) => ({ id: t.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const tool = getTool(id);
  if (!tool) return { title: "Outil introuvable" };
  return {
    title: `${tool.name} — Brick IA Studio`,
    description: tool.description,
  };
}

export default async function ToolPage({ params }: Props) {
  const { id } = await params;
  const tool = getTool(id);
  if (!tool) notFound();

  return (
    <main className="relative min-h-screen" style={{ background: "#080401" }}>
      <AnimatedBackground />
      <Navbar />
      <ToolWorkspace tool={tool} />
    </main>
  );
}
