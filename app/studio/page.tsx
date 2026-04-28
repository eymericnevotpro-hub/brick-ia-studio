import AnimatedBackground from "@/components/AnimatedBackground";
import Navbar from "@/components/Navbar";
import ToolCard from "@/components/ToolCard";
import { VIDEO_TOOLS, IMAGE_TOOLS } from "@/lib/tools";
import { Film, ImageIcon, Zap, ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function StudioPage() {
  return (
    <main className="relative min-h-screen" style={{ background: "#080401" }}>
      <AnimatedBackground />
      <Navbar />

      <div className="relative z-10 pt-28 pb-20 px-4">
        <div className="max-w-6xl mx-auto">

          {/* Back */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm mb-8"
            style={{ color: "#6a4020" }}
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </Link>

          {/* Header */}
          <div className="mb-12 animate-fade-up" style={{ animationFillMode: "both", opacity: 0 }}>
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4"
              style={{ background: "#FF7A0022", border: "1px solid #FF7A0044" }}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: "#FF7A00", boxShadow: "0 0 8px #FF7A00" }} />
              <span style={{ color: "#FFB347", fontSize: "0.8rem", fontWeight: 600 }}>Studio Pro — Outils IA avancés</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-3 leading-tight">
              Crée du contenu IA<br />
              <span className="shimmer-text">qui cartonne.</span>
            </h1>
            <p style={{ color: "#6a4020", fontSize: "0.95rem" }}>
              Génère vidéos et images avec les meilleurs modèles open source.
              Décris ce que tu veux — l&apos;IA fait le reste.
            </p>
          </div>

          {/* ── Video Tools ── */}
          <section className="mb-14">
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "#FF7A0022", border: "1px solid #FF7A0044" }}
              >
                <Film className="w-4 h-4" style={{ color: "#FF7A00" }} />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#FF7A00" }}>
                Vidéos IA
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {VIDEO_TOOLS.map((tool, i) => (
                <ToolCard key={tool.id} tool={tool} index={i} />
              ))}
            </div>
          </section>

          {/* ── Image Tools ── */}
          <section className="mb-14">
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "#FFB34722", border: "1px solid #FFB34744" }}
              >
                <ImageIcon className="w-4 h-4" style={{ color: "#FFB347" }} />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#FFB347" }}>
                Images IA
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {IMAGE_TOOLS.map((tool, i) => (
                <ToolCard key={tool.id} tool={tool} index={i} />
              ))}
            </div>
          </section>

          {/* ── Editor CTA ── */}
          <Link
            href="/editor"
            className="flex items-center gap-5 rounded-2xl p-6 mb-10 transition-all hover:scale-[1.01] group"
            style={{
              background: "linear-gradient(135deg, #120700 0%, #1A0B00 100%)",
              border: "1px solid #3D1A00",
            }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{ background: "#FF7A0022", border: "1px solid #FF7A0044" }}
            >
              ✂️
            </div>
            <div className="flex-1">
              <h3 className="text-white font-bold text-base">Éditeur Vidéo intégré</h3>
              <p className="text-sm mt-0.5" style={{ color: "#6a4020" }}>
                Monte tes rendus IA directement — arrange les clips, coupe, exporte.
              </p>
            </div>
            <div
              className="px-4 py-2 rounded-xl text-sm font-bold flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #FF7A00, #FF5500)", color: "white" }}
            >
              Ouvrir →
            </div>
          </Link>

          {/* ── Academy CTA ── */}
          <div
            className="rounded-3xl p-8 text-center relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #1A0B00 0%, #120700 50%, #1A0500 100%)",
              border: "1px solid #FF7A0033",
              boxShadow: "0 0 60px #FF7A0015",
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(ellipse 60% 40% at 50% 50%, #FF7A0012 0%, transparent 70%)" }}
            />
            <div className="relative z-10">
              <div className="text-4xl mb-3">🚀</div>
              <h2 className="text-2xl md:text-3xl font-black text-white mb-3">
                Passe au niveau supérieur avec<br />
                <span className="shimmer-text">Brick IA Academy</span>
              </h2>
              <p className="text-sm mb-2 max-w-lg mx-auto" style={{ color: "#8a6040" }}>
                Rejoins la communauté et apprends à créer du contenu viral avec l&apos;IA.
              </p>
              <p className="text-sm mb-6 font-semibold" style={{ color: "#FFB347" }}>
                💰 1 € par tranche de 1 000 vues cumulées — ton abonnement se paye tout seul
              </p>
              <a
                href="https://www.skool.com/brick-ia-academy"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl text-base"
              >
                <Zap className="w-4 h-4" />
                Rejoindre l&apos;Academy
                <ArrowRight className="w-4 h-4" />
              </a>
              <p className="mt-3 text-xs" style={{ color: "#4a2a1a" }}>
                Résiliation à tout moment · 0,55€/jour · Accès immédiat
              </p>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
