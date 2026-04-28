import AnimatedBackground from "@/components/AnimatedBackground";
import Navbar from "@/components/Navbar";
import PrankStudio from "@/components/PrankStudio";
import { Zap, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <main className="relative min-h-screen" style={{ background: "#080401" }}>
      <AnimatedBackground />
      <Navbar />

      <div className="relative z-10 pt-28 pb-20 px-4">
        <div className="max-w-2xl mx-auto">

          {/* ── Hero ── */}
          <div className="text-center mb-10 animate-fade-up" style={{ animationFillMode: "both", opacity: 0 }}>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-3 leading-tight">
              Modifie n&apos;importe<br />
              <span className="shimmer-text">quelle photo.</span>
            </h1>
            <p style={{ color: "#8a6040", fontSize: "1rem" }}>
              Transforme, vieillit, change le style — ou mets-toi en scène avec une célébrité.<br />
              <span style={{ color: "#FFB347" }}>Aucune limite.</span>
            </p>
          </div>

          {/* ── Prank tool ── */}
          <div className="animate-fade-up" style={{ animationDelay: "0.15s", animationFillMode: "both", opacity: 0 }}>
            <PrankStudio />
          </div>

          {/* ── Studio Pro CTA ── */}
          <div
            className="mt-10 animate-fade-up"
            style={{ animationDelay: "0.3s", animationFillMode: "both", opacity: 0 }}
          >
            <div
              className="rounded-2xl p-6 flex items-center gap-5"
              style={{
                background: "linear-gradient(135deg, #120700 0%, #1A0B00 100%)",
                border: "1px solid #3D1A00",
              }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: "#FF7A0022", border: "1px solid #FF7A0044" }}
              >
                🎬
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-black text-base">Studio Pro</span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{ background: "#FF7A0022", border: "1px solid #FF7A0044", color: "#FF7A00" }}
                  >
                    Pour créateurs
                  </span>
                </div>
                <p style={{ color: "#6a4020", fontSize: "0.82rem" }}>
                  Génère tes propres vidéos & images IA avec des modèles pro — HunyuanVideo, FLUX, Recraft…
                </p>
              </div>
              <a
                href="/studio"
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #FF7A00, #FF5500)", color: "white" }}
              >
                Accéder <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="mt-12 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div
                className="w-5 h-5 rounded-lg flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #FF7A00, #FF5500)" }}
              >
                <Zap className="w-3 h-3 text-white" />
              </div>
              <span className="font-bold text-sm" style={{ color: "#FF7A00" }}>Brick IA Studio</span>
            </div>
            <p style={{ color: "#2a1000", fontSize: "0.72rem" }}>
              © 2025 Brick IA Academy · Tous droits réservés
            </p>
          </div>

        </div>
      </div>
    </main>
  );
}
