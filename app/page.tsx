import AnimatedBackground from "@/components/AnimatedBackground";
import DisciplineDashboard from "./DisciplineDashboard";

export default function Home() {
  return (
    <main className="relative min-h-screen" style={{ background: "#080401" }}>
      <AnimatedBackground />

      <nav className="fixed top-0 left-0 right-0 z-40">
        <div
          className="mx-4 mt-4 rounded-2xl px-5 py-3 flex items-center justify-center"
          style={{
            background: "rgba(8,4,1,0.88)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid #3D1A0088",
          }}
        >
          <span className="font-black text-sm tracking-wide" style={{ color: "#FF7A00" }}>
            🎯 DISCIPLINE
          </span>
        </div>
      </nav>

      <DisciplineDashboard />
    </main>
  );
}
