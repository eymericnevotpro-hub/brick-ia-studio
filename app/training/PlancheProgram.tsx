"use client";

import { ReactNode, useEffect, useState } from "react";
import { Btn, Icon, useLS } from "@/components/discipline-ui";
import MovementArt from "@/components/MovementArt";
import PlancheCoach from "@/components/PlancheCoach";
import { Block, PHASES, Phase, SAFETY_NOTES, WEEKLY_SCHEDULE } from "@/lib/planche-data";

const PHASE_ART: Record<string, "lean" | "tuck" | "adv-tuck" | "straddle" | "full"> = {
  lean: "lean",
  tuck: "tuck",
  "adv-tuck": "adv-tuck",
  straddle: "straddle",
  full: "full",
};

function youtubeSearch(query: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query + " tutorial")}`;
}

const BLOCK_COLORS: Record<Block["kind"], { bg: string; ink: string; label: string }> = {
  warmup: { bg: "#FFF1E2", ink: "#C44A00", label: "Échauffement" },
  skill: { bg: "#FFE0C7", ink: "#A33700", label: "Skill planche" },
  strength: { bg: "#FFEAD6", ink: "#7A2E00", label: "Force droit-bras" },
  gym: { bg: "var(--bg-2)", ink: "var(--ink)", label: "Salle / poids" },
  antagonist: { bg: "#EFE6FF", ink: "#3D2F7A", label: "Antagonistes" },
  mobility: { bg: "#E6F5EC", ink: "#19663F", label: "Mobilité / récup" },
};

export default function PlancheProgram() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  if (!mounted) return <div style={{ minHeight: "100vh", background: "var(--bg)" }} />;
  return <Inner />;
}

function Inner() {
  const [currentIdx, setCurrentIdx] = useLS<number>("disc.planche.currentPhase", 0);
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set([PHASES[Math.min(currentIdx, PHASES.length - 1)].id]));

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const validate = (idx: number) => {
    if (idx >= PHASES.length - 1) return;
    const nextIdx = idx + 1;
    setCurrentIdx(nextIdx);
    setOpenIds(new Set([PHASES[nextIdx].id]));
  };

  const reset = () => {
    setCurrentIdx(0);
    setOpenIds(new Set([PHASES[0].id]));
  };

  const pct = ((currentIdx + 0) / PHASES.length) * 100;

  return (
    <div style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
      <header style={{ maxWidth: 1240, margin: "0 auto", padding: "24px 28px 8px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--ink)", color: "var(--orange)", display: "grid", placeItems: "center", boxShadow: "var(--shadow-md)" }}>
            <Icon name="bolt" size={22} />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em" }}>Planche</div>
            <div style={{ fontSize: 12, color: "var(--ink-2)" }}>De zéro à la full planche · programme structuré</div>
          </div>
        </div>
        <Btn kind="ghost" size="sm" onClick={reset} title="Tout remettre à zéro">
          Reset progression
        </Btn>
      </header>

      <section style={{ maxWidth: 1240, margin: "0 auto", padding: "16px 28px 28px", display: "grid", gridTemplateColumns: "minmax(280px, 360px) 1fr", gap: 24, alignItems: "stretch" }} className="planche-hero">
        <div
          style={{
            background: "var(--ink)",
            color: "white",
            borderRadius: 24,
            padding: 22,
            boxShadow: "var(--shadow-md)",
            display: "flex",
            flexDirection: "column",
            gap: 14,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(255,106,26,0.5), transparent 70%)", pointerEvents: "none" }} />
          <div style={{ fontSize: 11, color: "var(--orange-soft)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>Phase en cours</div>
          <div>
            <div className="mono" style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Étape {currentIdx + 1} / {PHASES.length}</div>
            <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.05, marginTop: 4 }}>{PHASES[currentIdx].name}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 6, lineHeight: 1.45 }}>{PHASES[currentIdx].goal}</div>
          </div>
          <div style={{ height: 10, background: "rgba(255,255,255,0.1)", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: "var(--orange)", borderRadius: 999, transition: "width 600ms var(--bounce)" }} />
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Durée estimée : {PHASES[currentIdx].duration}</div>
        </div>

        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderRadius: 24,
            padding: 22,
            boxShadow: "var(--shadow-sm)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>Schéma hebdomadaire type</h2>
            <span style={{ fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>3 sessions planche / sem.</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }} className="week-grid">
            {WEEKLY_SCHEDULE.map((d) => {
              const isRest = d.focus.toLowerCase().includes("repos");
              return (
                <div
                  key={d.day}
                  title={`${d.day} — ${d.focus}`}
                  style={{
                    background: isRest ? "var(--bg-2)" : "var(--orange-50)",
                    border: `1px solid ${isRest ? "var(--line)" : "var(--orange-100)"}`,
                    borderRadius: 12,
                    padding: "10px 8px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    minHeight: 90,
                  }}
                >
                  <div style={{ fontSize: 10.5, color: "var(--ink-3)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>{d.day.slice(0, 3)}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: isRest ? "var(--ink-2)" : "var(--orange)", lineHeight: 1.25 }}>
                    {isRest ? "Repos" : d.focus.split("+")[0].trim()}
                  </div>
                </div>
              );
            })}
          </div>
          <details style={{ marginTop: 6 }}>
            <summary style={{ cursor: "pointer", fontSize: 12.5, color: "var(--orange)", fontWeight: 600 }}>Voir le détail de chaque jour</summary>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
              {WEEKLY_SCHEDULE.map((d) => (
                <div key={d.day} style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 12, padding: "10px 12px", background: "var(--bg-2)", borderRadius: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{d.day}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{d.focus}</div>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.55 }}>
                    {d.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </details>
        </div>
      </section>

      <section style={{ maxWidth: 1240, margin: "0 auto", padding: "0 28px 28px" }}>
        <PlancheCoach />
      </section>

      <section style={{ maxWidth: 1240, margin: "0 auto", padding: "0 28px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        {PHASES.map((p, idx) => (
          <PhaseCard
            key={p.id}
            phase={p}
            idx={idx}
            current={currentIdx}
            open={openIds.has(p.id)}
            onToggle={() => toggle(p.id)}
            onValidate={() => validate(idx)}
          />
        ))}
      </section>

      <section style={{ maxWidth: 1240, margin: "0 auto", padding: "0 28px 60px" }}>
        <div style={{ background: "linear-gradient(135deg, #FFF1E2 0%, #FFE0C7 100%)", border: "1px solid var(--orange-100)", borderRadius: 20, padding: 20 }}>
          <div style={{ fontSize: 11, color: "var(--orange)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>À garder en tête</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: "var(--ink)", lineHeight: 1.6 }}>
            {SAFETY_NOTES.map((n, i) => (
              <li key={i} style={{ marginBottom: 4 }}>{n}</li>
            ))}
          </ul>
        </div>
      </section>

      <style>{`
        @media (max-width: 900px) {
          .planche-hero { grid-template-columns: 1fr !important; }
          .week-grid { grid-template-columns: repeat(7, 1fr) !important; }
          .phase-head { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .week-grid { grid-template-columns: repeat(4, 1fr) !important; }
        }
      `}</style>
    </div>
  );
}

function PhaseCard({
  phase,
  idx,
  current,
  open,
  onToggle,
  onValidate,
}: {
  phase: Phase;
  idx: number;
  current: number;
  open: boolean;
  onToggle: () => void;
  onValidate: () => void;
}) {
  const isCurrent = idx === current;
  const isDone = idx < current;
  const isLocked = idx > current;
  const isLast = idx === PHASES.length - 1;

  return (
    <div
      style={{
        background: "var(--card)",
        border: `1.5px solid ${isCurrent ? "var(--orange)" : "var(--line)"}`,
        borderRadius: 24,
        boxShadow: isCurrent ? "0 0 0 4px rgba(255,106,26,0.12), var(--shadow-sm)" : "var(--shadow-sm)",
        overflow: "hidden",
        opacity: isLocked ? 0.92 : 1,
        transition: "border-color 220ms, box-shadow 220ms",
      }}
    >
      <button
        onClick={onToggle}
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          gap: 16,
          alignItems: "center",
          width: "100%",
          padding: "18px 22px",
          textAlign: "left",
          background: "transparent",
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: isDone ? "var(--green)" : isCurrent ? "var(--orange)" : "var(--bg-2)",
            color: isDone || isCurrent ? "white" : "var(--ink-2)",
            display: "grid",
            placeItems: "center",
            fontWeight: 700,
            fontSize: 17,
            fontFamily: "Geist Mono, monospace",
            flexShrink: 0,
            transition: "background 220ms",
          }}
        >
          {isDone ? <Icon name="check" size={20} color="white" stroke={2.4} /> : phase.number}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em" }}>{phase.name}</span>
            {isCurrent && (
              <span className="mono" style={{ fontSize: 10.5, fontWeight: 700, color: "var(--orange)", background: "var(--orange-50)", padding: "2px 8px", borderRadius: 999, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Phase en cours
              </span>
            )}
            {isDone && (
              <span className="mono" style={{ fontSize: 10.5, fontWeight: 700, color: "var(--green)", background: "#E6F5EC", padding: "2px 8px", borderRadius: 999, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Acquise
              </span>
            )}
            <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>· {phase.duration}</span>
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 3, lineHeight: 1.45 }}>{phase.goal}</div>
        </div>
        <div style={{ color: "var(--ink-3)", transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 220ms var(--bounce)" }}>
          <Icon name="arrow" size={18} />
        </div>
      </button>

      {open && (
        <div style={{ padding: "0 22px 22px", display: "flex", flexDirection: "column", gap: 18, animation: "fade-up 360ms var(--ease-out)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 18, alignItems: "start" }} className="phase-head">
            <MovementArt phase={PHASE_ART[phase.id]} />
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "var(--ink)" }}>{phase.description}</p>
          </div>

          <Pillared title="Prérequis">
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6 }}>
              {phase.prereqs.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </Pillared>

          {phase.blocks.map((b, i) => (
            <BlockCard key={i} block={b} />
          ))}

          <Pillared title="Critères de validation">
            <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)", background: "var(--orange-50)", border: "1px solid var(--orange-100)", borderRadius: 12, padding: "12px 14px" }}>
              {phase.testOut}
            </div>
          </Pillared>

          {!isLast && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Btn kind={isCurrent ? "primary" : "ghost"} size="md" icon="check" onClick={onValidate} disabled={isDone || isLocked}>
                {isDone ? "Phase déjà acquise" : isLocked ? "Verrouillée" : "Phase acquise — passer à la suivante"}
              </Btn>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Pillared({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function BlockCard({ block }: { block: Block }) {
  const c = BLOCK_COLORS[block.kind];
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 16, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: c.bg }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: c.ink, letterSpacing: "-0.01em" }}>{block.title}</div>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: c.ink, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.8 }}>{c.label}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {block.exercises.map((ex, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 12,
              padding: "12px 14px",
              borderTop: i === 0 ? "none" : "1px dashed var(--line)",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{ex.name}</div>
                <a
                  href={youtubeSearch(ex.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--orange)",
                    textDecoration: "none",
                    background: "var(--orange-50)",
                    padding: "2px 8px",
                    borderRadius: 999,
                  }}
                  title="Ouvrir une recherche YouTube de l'exercice"
                >
                  ▶ démo
                </a>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 2, lineHeight: 1.5 }}>{ex.detail}</div>
              {ex.note && (
                <div style={{ fontSize: 11.5, color: "var(--orange)", marginTop: 4, fontStyle: "italic" }}>↳ {ex.note}</div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, fontFamily: "Geist Mono, monospace", whiteSpace: "nowrap" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{ex.sets}</span>
              {ex.rest && <span style={{ fontSize: 11, color: "var(--ink-3)" }}>repos {ex.rest}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
