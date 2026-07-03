"use client";

import { CSSProperties, useEffect, useState } from "react";
import { AnimatedNumber, Btn, Icon, useLS } from "@/components/discipline-ui";
import {
  DEFAULT_INVESTMENT,
  DEFAULT_STATE,
  GoalsState,
  Goal,
  InvestmentSettings,
  QUICK_AMOUNTS,
  SIDEQUEST_QUICK,
  Sidequest,
  TIMEFRAMES,
  Transaction,
  etaFor,
  etaFromMonths,
  fmtDateShort,
  fmtEur,
  fmtMonths,
  monthlyRate,
  monthsToReachWithInvestment,
  progressOf,
  sidequestProgress,
  todayIso,
  totalSaved,
  uid,
} from "@/lib/goals-store";

export default function GoalsBoard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  if (!mounted) return <div style={{ minHeight: "100vh", background: "var(--bg)" }} />;
  return <Inner />;
}

function Inner() {
  const [state, setState] = useLS<GoalsState>("disc.goals.v2", DEFAULT_STATE);
  const [inv, setInv] = useLS<InvestmentSettings>("disc.goals.investment", DEFAULT_INVESTMENT);
  const [editingId, setEditingId] = useState<string | null>(null);

  const total = totalSaved(state);
  const rate = monthlyRate(state);
  const progresses = progressOf(state);
  const totalTarget = state.goals.reduce((s, g) => s + g.target, 0);
  const totalPct = totalTarget > 0 ? Math.min(1, total / totalTarget) : 0;

  const enableInvestment = () => {
    setInv((prev) => ({
      ...prev,
      enabled: true,
      // Auto-fill smart defaults the first time we flip the switch.
      initial: prev.initial > 0 ? prev.initial : total,
      monthly: prev.monthly > 0 ? prev.monthly : Math.round(rate),
    }));
  };

  const addTx = (amount: number, note?: string) => {
    if (!amount) return;
    const t: Transaction = { id: uid(), date: todayIso(), amount, note };
    setState((prev) => ({ ...prev, transactions: [...prev.transactions, t] }));
  };
  const removeTx = (id: string) => {
    setState((prev) => ({ ...prev, transactions: prev.transactions.filter((t) => t.id !== id) }));
  };
  const updateGoal = (id: string, patch: Partial<Goal>) => {
    setState((prev) => ({ ...prev, goals: prev.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) }));
  };
  const removeGoal = (id: string) => {
    setState((prev) => ({ ...prev, goals: prev.goals.filter((g) => g.id !== id) }));
    if (editingId === id) setEditingId(null);
  };
  const addGoal = () => {
    const g: Goal = { id: uid(), emoji: "🎯", name: "Nouvel objectif", target: 1000, color: "#FF6A1A" };
    setState((prev) => ({ ...prev, goals: [...prev.goals, g] }));
    setEditingId(g.id);
  };
  const moveGoal = (id: string, delta: number) => {
    setState((prev) => {
      const idx = prev.goals.findIndex((g) => g.id === id);
      if (idx < 0) return prev;
      const target = Math.max(0, Math.min(prev.goals.length - 1, idx + delta));
      if (target === idx) return prev;
      const next = [...prev.goals];
      const [removed] = next.splice(idx, 1);
      next.splice(target, 0, removed);
      return { ...prev, goals: next };
    });
  };

  // ── sidequests ──
  const sidequests = state.sidequests ?? [];
  const addSidequest = (emoji: string, name: string, target: number) => {
    if (target <= 0) return;
    const sq: Sidequest = { id: uid(), emoji, name: name.trim() || "Sidequest", target, baseline: total, createdAt: todayIso() };
    setState((prev) => ({ ...prev, sidequests: [...(prev.sidequests ?? []), sq] }));
  };
  const updateSidequest = (id: string, patch: Partial<Sidequest>) => {
    setState((prev) => ({ ...prev, sidequests: (prev.sidequests ?? []).map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  };
  const removeSidequest = (id: string) => {
    setState((prev) => ({ ...prev, sidequests: (prev.sidequests ?? []).filter((s) => s.id !== id) }));
  };
  const claimSidequest = (sq: Sidequest) => {
    // A sidequest is a challenge, not a purchase: marking it done does NOT
    // touch the cagnotte. It just records the achievement.
    setState((prev) => ({
      ...prev,
      sidequests: (prev.sidequests ?? []).map((s) => (s.id === sq.id ? { ...s, claimed: true, claimedAt: todayIso() } : s)),
    }));
  };

  const recent = [...state.transactions].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8);

  return (
    <div style={{ position: "relative", zIndex: 1, padding: "20px 28px 60px", maxWidth: 1240, margin: "0 auto" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 22, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--ink)", color: "var(--orange)", display: "grid", placeItems: "center", boxShadow: "var(--shadow-md)" }}>
            <Icon name="target" size={22} />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em" }}>Objectifs</div>
            <div style={{ fontSize: 12, color: "var(--ink-2)" }}>Une cagnotte unique · les rêves se remplissent dans l&apos;ordre</div>
          </div>
        </div>
        <Btn kind="primary" size="md" icon="plus" onClick={addGoal}>Nouvel objectif</Btn>
      </header>

      {/* CAGNOTTE — global pot with quick +/- buttons */}
      <section style={{ marginBottom: 18 }}>
        <div
          style={{
            background: "var(--ink)",
            color: "white",
            borderRadius: 24,
            padding: 22,
            boxShadow: "var(--shadow-md)",
            display: "grid",
            gridTemplateColumns: "minmax(220px, 320px) 1fr",
            gap: 24,
            alignItems: "center",
            position: "relative",
            overflow: "hidden",
          }}
          className="cagnotte"
        >
          <div style={{ position: "absolute", top: -40, right: -40, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(255,106,26,0.5), transparent 70%)", pointerEvents: "none" }} />
          <div style={{ position: "relative" }}>
            <div style={{ fontSize: 11, color: "var(--orange-soft)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>Ma cagnotte</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
              <div style={{ fontSize: 48, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--orange)" }}>
                <AnimatedNumber value={total} format={fmtEur} />
              </div>
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>
              sur {fmtEur(totalTarget)} cumulés ({Math.round(totalPct * 100)}%)
            </div>
            <div style={{ height: 10, background: "rgba(255,255,255,0.1)", borderRadius: 999, marginTop: 12, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${totalPct * 100}%`, background: "var(--orange)", borderRadius: 999, transition: "width 600ms var(--bounce)" }} />
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 10 }}>
              {rate > 0
                ? <>Rythme actuel · <b style={{ color: "var(--orange-soft)" }}>{fmtEur(rate)}/mois</b></>
                : <>Aucun dépôt récent — ajoute de l&apos;argent pour voir ton rythme.</>}
            </div>
          </div>

          <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>
              Ajouter à la cagnotte
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }} className="quick-row">
              {QUICK_AMOUNTS.map((a) => (
                <QuickBtn key={`p${a}`} variant="plus" onClick={() => addTx(a)}>
                  +{a}€
                </QuickBtn>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }} className="quick-row">
              {QUICK_AMOUNTS.map((a) => (
                <QuickBtn key={`m${a}`} variant="minus" onClick={() => addTx(-a)}>
                  −{a}€
                </QuickBtn>
              ))}
            </div>
            <CustomAmount onAdd={addTx} />
          </div>
        </div>

        {recent.length > 0 && (
          <details style={{ marginTop: 10 }}>
            <summary style={{ cursor: "pointer", fontSize: 12, color: "var(--ink-2)", fontWeight: 600 }}>
              Historique ({state.transactions.length} mouvement{state.transactions.length > 1 ? "s" : ""})
            </summary>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 6, marginTop: 8 }}>
              {recent.map((d) => (
                <div key={d.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: d.amount >= 0 ? "var(--ink)" : "#C44A00" }}>
                      {d.amount >= 0 ? "+" : ""}{fmtEur(d.amount)}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink-3)" }}>
                      {new Date(d.date).toLocaleDateString("fr-FR")}{d.note ? ` · ${d.note}` : ""}
                    </div>
                  </div>
                  <button onClick={() => removeTx(d.id)} title="Annuler" style={{ fontSize: 11, color: "var(--ink-3)", padding: "4px 8px" }}>✕</button>
                </div>
              ))}
              {state.transactions.length > 8 && (
                <div style={{ fontSize: 11, color: "var(--ink-3)", padding: 8 }}>
                  … {state.transactions.length - 8} mouvement{state.transactions.length - 8 > 1 ? "s" : ""} de plus
                </div>
              )}
            </div>
          </details>
        )}
      </section>

      {/* SIDEQUESTS */}
      <SidequestsSection
        sidequests={sidequests}
        total={total}
        rate={rate}
        onAdd={addSidequest}
        onUpdate={updateSidequest}
        onRemove={removeSidequest}
        onClaim={claimSidequest}
      />

      {/* INVESTMENT SIMULATION */}
      <InvestmentCard
        inv={inv}
        onChange={(patch) => setInv((prev) => ({ ...prev, ...patch }))}
        onEnable={enableInvestment}
        currentTotal={total}
        currentRate={rate}
      />

      {/* GOALS — filled in priority order */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 18 }} className="goals-grid">
        {progresses.length === 0 && (
          <div style={{ background: "var(--card)", border: "1px dashed var(--line)", borderRadius: 18, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Aucun objectif</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 14 }}>Ajoute un rêve chiffré pour commencer.</div>
            <Btn kind="primary" size="md" icon="plus" onClick={addGoal}>Créer mon premier objectif</Btn>
          </div>
        )}
        {progresses.map((p, i) => (
          <GoalCard
            key={p.goal.id}
            p={p}
            rate={rate}
            inv={inv}
            index={i}
            isLast={i === progresses.length - 1}
            editing={editingId === p.goal.id}
            onEdit={() => setEditingId(editingId === p.goal.id ? null : p.goal.id)}
            onUpdate={(patch) => updateGoal(p.goal.id, patch)}
            onDelete={() => removeGoal(p.goal.id)}
            onMove={(d) => moveGoal(p.goal.id, d)}
          />
        ))}
      </section>

      <style>{`
        @media (max-width: 900px) {
          .cagnotte { grid-template-columns: 1fr !important; }
          .goals-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 520px) {
          .quick-row { grid-template-columns: repeat(3, 1fr) !important; }
          .eta-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

/* ── investment simulator card ─────────────────────────────────────── */

function InvestmentCard({
  inv,
  onChange,
  onEnable,
  currentTotal,
  currentRate,
}: {
  inv: InvestmentSettings;
  onChange: (patch: Partial<InvestmentSettings>) => void;
  onEnable: () => void;
  currentTotal: number;
  currentRate: number;
}) {
  return (
    <section style={{ marginBottom: 18 }}>
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--line)",
          borderRadius: 24,
          padding: 22,
          boxShadow: "var(--shadow-sm)",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: inv.enabled ? "var(--green)" : "var(--ink-3)" }} />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>
                Simulation placement (bourse, ETF, livret…)
              </h3>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ink-3)", background: "var(--bg-2)", padding: "2px 8px", borderRadius: 999, letterSpacing: "0.06em", textTransform: "uppercase" }}>Optionnel</span>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 4 }}>
              Voir combien de temps il faut avec un capital et un rendement annuel (intérêts composés).
            </div>
          </div>
          <button
            onClick={() => inv.enabled ? onChange({ enabled: false }) : onEnable()}
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              background: inv.enabled ? "var(--green)" : "var(--bg-2)",
              color: inv.enabled ? "white" : "var(--ink-2)",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            {inv.enabled ? "✓ Activé" : "Activer"}
          </button>
        </div>

        {inv.enabled && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
              <Label name="Capital de départ (€)" small>
                <input
                  type="number"
                  value={inv.initial}
                  onChange={(e) => onChange({ initial: Math.max(0, Number(e.target.value) || 0) })}
                  style={inputBase({ fontFamily: "Geist Mono, monospace", fontWeight: 700, fontSize: 16, background: "var(--bg-2)" })}
                />
              </Label>
              <Label name="Rendement annuel (%)" small>
                <input
                  type="number"
                  step={0.1}
                  value={inv.annualRatePct}
                  onChange={(e) => onChange({ annualRatePct: Math.max(0, Number(e.target.value) || 0) })}
                  style={inputBase({ fontFamily: "Geist Mono, monospace", fontWeight: 700, fontSize: 16, background: "var(--bg-2)" })}
                />
              </Label>
              <Label name="Versement mensuel (€)" small>
                <input
                  type="number"
                  value={inv.monthly}
                  onChange={(e) => onChange({ monthly: Math.max(0, Number(e.target.value) || 0) })}
                  style={inputBase({ fontFamily: "Geist Mono, monospace", fontWeight: 700, fontSize: 16, background: "var(--bg-2)" })}
                />
              </Label>
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                onClick={() => onChange({ initial: Math.round(currentTotal), monthly: Math.round(currentRate) })}
                style={presetBtn()}
              >
                Utiliser ma situation actuelle ({fmtEur(currentTotal)} · {fmtEur(currentRate)}/mois)
              </button>
              <button onClick={() => onChange({ annualRatePct: 3 })} style={presetBtn(inv.annualRatePct === 3)}>3% (livret)</button>
              <button onClick={() => onChange({ annualRatePct: 5 })} style={presetBtn(inv.annualRatePct === 5)}>5% (obligations)</button>
              <button onClick={() => onChange({ annualRatePct: 7 })} style={presetBtn(inv.annualRatePct === 7)}>7% (ETF World)</button>
              <button onClick={() => onChange({ annualRatePct: 10 })} style={presetBtn(inv.annualRatePct === 10)}>10% (offensif)</button>
            </div>

            <div style={{ fontSize: 11.5, color: "var(--ink-3)", lineHeight: 1.55 }}>
              Le rendement est une <i>hypothèse</i> — un ETF World fait ≈7% par an sur le très long terme, mais peut faire −20% une année et +25% l&apos;année suivante. La simulation ne tient pas compte de l&apos;inflation ni de la fiscalité.
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function presetBtn(active = false): CSSProperties {
  return {
    padding: "6px 12px",
    borderRadius: 999,
    background: active ? "var(--orange)" : "var(--bg-2)",
    color: active ? "white" : "var(--ink-2)",
    fontSize: 12,
    fontWeight: 600,
  };
}

/* ── goal card ─────────────────────────────────────────────────────── */

function GoalCard({
  p,
  rate,
  inv,
  index,
  isLast,
  editing,
  onEdit,
  onUpdate,
  onDelete,
  onMove,
}: {
  p: ReturnType<typeof progressOf>[number];
  rate: number;
  inv: InvestmentSettings;
  index: number;
  isLast: boolean;
  editing: boolean;
  onEdit: () => void;
  onUpdate: (patch: Partial<Goal>) => void;
  onDelete: () => void;
  onMove: (delta: number) => void;
}) {
  const { goal, saved, remaining, remainingTotal, pct, reached } = p;
  const [confirmDelete, setConfirmDelete] = useState(false);
  // ETA and "in X months" projections both count what's still missing from
  // the cagnotte until this goal is fully funded — including everything that
  // sits above it in priority.
  const eta = etaFor(remainingTotal, rate);

  // Target balance the investment needs to hit (from `inv.initial`) to reach
  // this goal. Counted from the same priority pile as the linear ETA.
  const targetForInv = p.cumulativeStart + goal.target;
  const invMonths = inv.enabled
    ? monthsToReachWithInvestment(inv.initial, inv.monthly, inv.annualRatePct, targetForInv)
    : null;
  const invEta = invMonths != null ? etaFromMonths(invMonths) : null;

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--line)",
        borderRadius: 24,
        padding: 22,
        boxShadow: "var(--shadow-sm)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: goal.color }} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <div style={{ fontSize: 34, lineHeight: 1, flexShrink: 0 }}>{goal.emoji}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.2 }}>{goal.name}</div>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ink-3)", background: "var(--bg-2)", padding: "2px 8px", borderRadius: 999, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Priorité #{index + 1}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>Cible : {fmtEur(goal.target)}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <IconBtn title="Reculer dans la priorité" onClick={() => onMove(1)} disabled={isLast}>↓</IconBtn>
          <IconBtn title="Avancer dans la priorité" onClick={() => onMove(-1)} disabled={index === 0}>↑</IconBtn>
          <IconBtn title="Modifier" onClick={onEdit}>✎</IconBtn>
          <IconBtn title="Supprimer" onClick={() => setConfirmDelete(true)} danger>✕</IconBtn>
        </div>
      </div>

      {/* Edit panel */}
      {editing && (
        <div style={{ background: "var(--bg-2)", borderRadius: 14, padding: 14, display: "grid", gridTemplateColumns: "auto 1fr 1fr", gap: 10, alignItems: "end" }}>
          <Label name="Emoji" small>
            <input
              value={goal.emoji}
              onChange={(e) => onUpdate({ emoji: e.target.value.slice(0, 4) || "🎯" })}
              style={{ ...inputBase({}), width: 70, fontSize: 22, textAlign: "center", padding: "8px 6px" }}
            />
          </Label>
          <Label name="Nom" small>
            <input
              value={goal.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              style={inputBase({ fontSize: 14 })}
            />
          </Label>
          <Label name="Cible (€)" small>
            <input
              type="number"
              value={goal.target}
              onChange={(e) => onUpdate({ target: Math.max(0, Number(e.target.value) || 0) })}
              style={inputBase({ fontSize: 14, fontFamily: "Geist Mono, monospace", fontWeight: 600 })}
            />
          </Label>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div style={{ background: "rgba(196,74,0,0.08)", border: "1px solid rgba(196,74,0,0.25)", borderRadius: 12, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, color: "#C44A00" }}>Supprimer cet objectif ? (la cagnotte n&apos;est pas touchée)</div>
          <div style={{ display: "flex", gap: 6 }}>
            <Btn kind="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Annuler</Btn>
            <button
              onClick={() => { onDelete(); setConfirmDelete(false); }}
              style={{ padding: "8px 14px", borderRadius: 999, background: "#C44A00", color: "white", fontSize: 13, fontWeight: 600 }}
            >Supprimer</button>
          </div>
        </div>
      )}

      {/* Progress */}
      <div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--ink)" }}>
            <AnimatedNumber value={saved} format={fmtEur} />
          </div>
          <div className="mono" style={{ fontSize: 13, color: "var(--ink-2)" }}>
            sur {fmtEur(goal.target)} ({Math.round(pct * 100)}%)
          </div>
        </div>
        <div style={{ height: 12, background: "var(--bg-2)", borderRadius: 999, marginTop: 8, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct * 100}%`, background: `linear-gradient(90deg, ${goal.color}, var(--orange))`, borderRadius: 999, transition: "width 500ms var(--bounce)" }} />
        </div>
        <div style={{ fontSize: 13, color: reached ? "var(--green)" : "var(--ink-2)", marginTop: 8, fontWeight: 500 }}>
          {reached
            ? "🎉 Objectif atteint !"
            : remainingTotal > remaining
              ? `Reste ${fmtEur(remaining)} dans ce palier · ${fmtEur(remainingTotal)} au total avant de l'avoir.`
              : `Reste ${fmtEur(remaining)} à mettre de côté.`}
        </div>
      </div>

      {/* Dynamic ETA from real saving rate */}
      {!reached && (
        <div style={{ display: "grid", gridTemplateColumns: inv.enabled ? "1fr 1fr" : "1fr", gap: 8 }} className="eta-row">
          <div style={{ background: rate > 0 ? "var(--orange-50)" : "var(--bg-2)", border: `1px solid ${rate > 0 ? "var(--orange-100)" : "var(--line)"}`, borderRadius: 14, padding: "12px 14px" }}>
            <div style={{ fontSize: 10.5, color: rate > 0 ? "var(--orange)" : "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>
              Sans placement · cagnotte
            </div>
            {rate <= 0 ? (
              <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 4 }}>
                Mets quelque chose dans la cagnotte pour estimer un délai.
              </div>
            ) : eta == null ? (
              <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 4 }}>—</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "var(--orange)", letterSpacing: "-0.02em" }}>
                  {fmtMonths(eta.months)}
                </div>
                <div className="mono" style={{ fontSize: 12, color: "var(--ink-2)" }}>
                  ≈ {fmtDateShort(eta.date)} · {fmtEur(rate)}/mois
                </div>
              </div>
            )}
          </div>

          {inv.enabled && (
            <div style={{ background: "#E6F5EC", border: "1px solid #B7E0C6", borderRadius: 14, padding: "12px 14px" }}>
              <div style={{ fontSize: 10.5, color: "var(--green)", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>
                Avec placement · {inv.annualRatePct}%/an
              </div>
              {invEta == null ? (
                <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 4 }}>Hors d&apos;atteinte avec ces paramètres.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "var(--green)", letterSpacing: "-0.02em" }}>
                    {fmtMonths(invEta.months)}
                  </div>
                  <div className="mono" style={{ fontSize: 12, color: "var(--ink-2)" }}>
                    ≈ {fmtDateShort(invEta.date)} · {fmtEur(inv.initial)} + {fmtEur(inv.monthly)}/mois
                  </div>
                  {eta && invEta.months < eta.months && (
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--green)", marginTop: 2 }}>
                      − {fmtMonths(eta.months - invEta.months)} gagnés grâce au placement
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Manual timeframes (how much/month to hit a chosen window) */}
      {!reached && (
        <div>
          <div style={{ fontSize: 10.5, color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700, marginBottom: 6 }}>
            Pour viser plus court
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 6 }}>
            {TIMEFRAMES.map((t) => {
              const monthly = remainingTotal / t.months;
              return (
                <div key={t.label} style={{ background: "var(--bg-2)", borderRadius: 10, padding: "8px 10px" }}>
                  <div style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>en {t.label}</div>
                  <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", marginTop: 1 }}>
                    {fmtEur(monthly)}<span style={{ fontSize: 10, color: "var(--ink-3)", fontWeight: 500 }}>/mois</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── quick add buttons + custom amount ────────────────────────────── */

function QuickBtn({ children, onClick, variant }: { children: React.ReactNode; onClick: () => void; variant: "plus" | "minus" }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 4px",
        borderRadius: 12,
        background: variant === "plus" ? "var(--orange)" : "rgba(255,255,255,0.06)",
        color: variant === "plus" ? "white" : "rgba(255,255,255,0.85)",
        border: variant === "plus" ? "1px solid var(--orange)" : "1px solid rgba(255,255,255,0.15)",
        fontFamily: "Geist Mono, monospace",
        fontSize: 14,
        fontWeight: 700,
        transition: "transform 220ms var(--bounce-strong), background 160ms ease",
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.92)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {children}
    </button>
  );
}

function CustomAmount({ onAdd }: { onAdd: (amount: number, note?: string) => void }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const submit = (sign: 1 | -1) => {
    const v = Number(amount.replace(",", "."));
    if (!Number.isFinite(v) || v === 0) return;
    onAdd(sign * Math.abs(v), note.trim() || undefined);
    setAmount("");
    setNote("");
  };

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 4 }}>
      <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 12px", width: 130 }}>
        <input
          type="number"
          placeholder="Montant"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit(1)}
          style={{ flex: 1, width: "100%", background: "transparent", border: "none", outline: "none", fontSize: 14, fontFamily: "Geist Mono, monospace", fontWeight: 700, color: "white" }}
        />
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>€</span>
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit(1)}
        placeholder="note (optionnel)"
        style={{ flex: "1 1 120px", minWidth: 0, padding: "9px 12px", background: "rgba(255,255,255,0.08)", border: "1px solid transparent", borderRadius: 10, outline: "none", fontSize: 13, color: "white" }}
      />
      <button
        onClick={() => submit(1)}
        title="Ajouter"
        style={{ padding: "8px 14px", borderRadius: 10, background: "var(--orange)", color: "white", fontWeight: 700, fontSize: 14 }}
      >+</button>
      <button
        onClick={() => submit(-1)}
        title="Retirer"
        style={{ padding: "8px 14px", borderRadius: 10, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.15)", fontWeight: 700, fontSize: 14 }}
      >−</button>
    </div>
  );
}

/* ── small helpers ────────────────────────────────────────────────── */

function Label({ name, children, small }: { name: string; children: React.ReactNode; small?: boolean }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: small ? 10 : 11, color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>{name}</span>
      {children}
    </label>
  );
}

function inputBase(extra: CSSProperties): CSSProperties {
  return {
    width: "100%",
    padding: "10px 12px",
    background: "white",
    border: "1px solid transparent",
    borderRadius: 10,
    outline: "none",
    color: "var(--ink)",
    ...extra,
  };
}

function IconBtn({ children, onClick, title, danger, disabled }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        width: 30,
        height: 30,
        borderRadius: 8,
        background: danger ? "rgba(196,74,0,0.08)" : "var(--bg-2)",
        color: danger ? "#C44A00" : "var(--ink-2)",
        fontSize: 14,
        fontWeight: 700,
        display: "grid",
        placeItems: "center",
        opacity: disabled ? 0.3 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

/* ── sidequests section ───────────────────────────────────────────── */

function SidequestsSection({
  sidequests,
  total,
  rate,
  onAdd,
  onUpdate,
  onRemove,
  onClaim,
}: {
  sidequests: Sidequest[];
  total: number;
  rate: number;
  onAdd: (emoji: string, name: string, target: number) => void;
  onUpdate: (id: string, patch: Partial<Sidequest>) => void;
  onRemove: (id: string) => void;
  onClaim: (sq: Sidequest) => void;
}) {
  const [emoji, setEmoji] = useState("🪑");
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const submit = () => {
    const v = Number(String(target).replace(",", "."));
    if (!Number.isFinite(v) || v <= 0) return;
    onAdd(emoji || "🎯", name, v);
    setName("");
    setTarget("");
    setEmoji("🪑");
  };

  const active = sidequests.filter((s) => !s.claimed);
  const done = sidequests.filter((s) => s.claimed);

  return (
    <section style={{ marginBottom: 18 }}>
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 24, padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>🗺️</span>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>Sidequests</h3>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ink-3)", background: "var(--bg-2)", padding: "2px 8px", borderRadius: 999, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                récompenses rapides
              </span>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 4, maxWidth: 640, lineHeight: 1.5 }}>
              Des défis à côté de tes gros rêves. Une sidequest est relevée quand ta cagnotte a grimpé de son montant <b>en plus</b> depuis sa création. C&apos;est un objectif à atteindre — la cagnotte n&apos;est pas touchée.
            </div>
          </div>
        </div>

        {/* Quick presets */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {SIDEQUEST_QUICK.map((q) => (
            <button
              key={q.name}
              onClick={() => onAdd(q.emoji, q.name, q.target)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 999, background: "var(--bg-2)", color: "var(--ink)", fontSize: 12.5, fontWeight: 600, border: "1px solid transparent" }}
            >
              <span>{q.emoji}</span> {q.name} · {fmtEur(q.target)}
            </button>
          ))}
        </div>

        {/* Custom add */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", background: "var(--bg-2)", borderRadius: 14, padding: 12 }}>
          <input
            value={emoji}
            onChange={(e) => setEmoji(e.target.value.slice(0, 4) || "🎯")}
            style={{ width: 56, textAlign: "center", fontSize: 20, padding: "8px 6px", background: "white", border: "1px solid transparent", borderRadius: 10, outline: "none" }}
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Nom de la sidequest (ex : bureau minimaliste)"
            style={{ flex: "1 1 200px", minWidth: 0, padding: "10px 12px", background: "white", border: "1px solid transparent", borderRadius: 10, outline: "none", fontSize: 14, color: "var(--ink)" }}
          />
          <div style={{ display: "flex", alignItems: "center", background: "white", borderRadius: 10, padding: "8px 12px", width: 130 }}>
            <input
              type="number"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="8000"
              style={{ flex: 1, width: "100%", background: "transparent", border: "none", outline: "none", fontSize: 15, fontFamily: "Geist Mono, monospace", fontWeight: 700, color: "var(--ink)" }}
            />
            <span style={{ fontSize: 13, color: "var(--ink-2)" }}>€</span>
          </div>
          <Btn kind="primary" size="sm" icon="plus" onClick={submit}>Ajouter</Btn>
        </div>

        {/* Active sidequests */}
        {active.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }} className="sq-grid">
            {active.map((sq) => (
              <SidequestCard
                key={sq.id}
                sq={sq}
                total={total}
                rate={rate}
                editing={editingId === sq.id}
                onEdit={() => setEditingId(editingId === sq.id ? null : sq.id)}
                onUpdate={(patch) => onUpdate(sq.id, patch)}
                onRemove={() => onRemove(sq.id)}
                onClaim={() => onClaim(sq)}
              />
            ))}
          </div>
        )}

        {active.length === 0 && (
          <div style={{ fontSize: 13, color: "var(--ink-3)", textAlign: "center", padding: "8px 0" }}>
            Aucune sidequest en cours — ajoute-en une ci-dessus.
          </div>
        )}

        {/* Claimed sidequests (trophies) */}
        {done.length > 0 && (
          <details>
            <summary style={{ cursor: "pointer", fontSize: 12.5, color: "var(--ink-2)", fontWeight: 600 }}>
              🏆 Offertes ({done.length})
            </summary>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              {done.map((sq) => (
                <div key={sq.id} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#E6F5EC", border: "1px solid #B7E0C6", borderRadius: 12 }}>
                  <span style={{ fontSize: 18 }}>{sq.emoji}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{sq.name}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-3)" }}>
                      {fmtEur(sq.target)}{sq.claimedAt ? ` · ${new Date(sq.claimedAt).toLocaleDateString("fr-FR")}` : ""}
                    </div>
                  </div>
                  <button onClick={() => onRemove(sq.id)} title="Retirer de la liste" style={{ fontSize: 11, color: "var(--ink-3)", padding: "4px 6px" }}>✕</button>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      <style>{`
        @media (max-width: 520px) { .sq-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
}

function SidequestCard({
  sq,
  total,
  rate,
  editing,
  onEdit,
  onUpdate,
  onRemove,
  onClaim,
}: {
  sq: Sidequest;
  total: number;
  rate: number;
  editing: boolean;
  onEdit: () => void;
  onUpdate: (patch: Partial<Sidequest>) => void;
  onRemove: () => void;
  onClaim: () => void;
}) {
  const { saved, remaining, pct, reached } = sidequestProgress(sq, total);
  const eta = etaFor(remaining, rate);

  return (
    <div style={{ background: "var(--bg-2)", border: `1.5px solid ${reached ? "var(--green)" : "var(--line)"}`, borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span style={{ fontSize: 26, lineHeight: 1 }}>{sq.emoji}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.2 }}>{sq.name}</div>
            <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 1 }}>{fmtEur(sq.target)} en plus</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <IconBtn title="Modifier" onClick={onEdit}>✎</IconBtn>
          <IconBtn title="Supprimer" onClick={onRemove} danger>✕</IconBtn>
        </div>
      </div>

      {editing && (
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr", gap: 8, alignItems: "end" }}>
          <input
            value={sq.emoji}
            onChange={(e) => onUpdate({ emoji: e.target.value.slice(0, 4) || "🎯" })}
            style={{ width: 54, textAlign: "center", fontSize: 18, padding: "6px", background: "white", border: "1px solid transparent", borderRadius: 8, outline: "none" }}
          />
          <input
            value={sq.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            style={{ ...inputBase({ fontSize: 13 }) }}
          />
          <input
            type="number"
            value={sq.target}
            onChange={(e) => onUpdate({ target: Math.max(0, Number(e.target.value) || 0) })}
            style={{ ...inputBase({ fontSize: 13, fontFamily: "Geist Mono, monospace", fontWeight: 700 }) }}
          />
        </div>
      )}

      <div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
          <span className="mono" style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>{fmtEur(saved)}</span>
          <span className="mono" style={{ fontSize: 12, color: "var(--ink-2)" }}>/ {fmtEur(sq.target)} ({Math.round(pct * 100)}%)</span>
        </div>
        <div style={{ height: 10, background: "white", borderRadius: 999, marginTop: 6, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct * 100}%`, background: reached ? "var(--green)" : "linear-gradient(90deg, var(--orange-soft), var(--orange))", borderRadius: 999, transition: "width 500ms var(--bounce)" }} />
        </div>
      </div>

      {reached ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 12.5, color: "var(--green)", fontWeight: 600 }}>🎉 Défi relevé ! Tu as mis les {fmtEur(sq.target)} de côté.</div>
          <button
            onClick={onClaim}
            style={{ padding: "9px 14px", borderRadius: 999, background: "var(--green)", color: "white", fontWeight: 700, fontSize: 13 }}
          >
            Marquer comme accompli 🏆
          </button>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: "var(--ink-2)" }}>
          Reste {fmtEur(remaining)}{eta ? ` · à ton rythme, ${fmtMonths(eta.months)}` : ""}
        </div>
      )}
    </div>
  );
}
