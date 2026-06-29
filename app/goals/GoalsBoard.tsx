"use client";

import { CSSProperties, useEffect, useState } from "react";
import { AnimatedNumber, Btn, Icon, useLS } from "@/components/discipline-ui";
import {
  DEFAULT_GOALS,
  Deposit,
  Goal,
  TIMEFRAMES,
  fmtEur,
  pctFor,
  remainingFor,
  savedFor,
  todayIso,
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
  const [goals, setGoals] = useLS<Goal[]>("disc.goals", DEFAULT_GOALS);
  const [editingId, setEditingId] = useState<string | null>(null);

  const totalTarget = goals.reduce((s, g) => s + g.target, 0);
  const totalSaved = goals.reduce((s, g) => s + savedFor(g), 0);
  const totalRemaining = Math.max(0, totalTarget - totalSaved);
  const totalPct = totalTarget > 0 ? Math.min(1, totalSaved / totalTarget) : 0;

  const updateGoal = (id: string, patch: Partial<Goal>) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  };
  const deleteGoal = (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    if (editingId === id) setEditingId(null);
  };
  const addGoal = () => {
    const g: Goal = {
      id: uid(),
      emoji: "🎯",
      name: "Nouvel objectif",
      target: 1000,
      deposits: [],
      color: "#FF6A1A",
      createdAt: todayIso(),
    };
    setGoals((prev) => [...prev, g]);
    setEditingId(g.id);
  };
  const addDeposit = (id: string, amount: number, note: string) => {
    if (!amount) return;
    const d: Deposit = { id: uid(), date: todayIso(), amount, note: note.trim() || undefined };
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, deposits: [...g.deposits, d] } : g)));
  };
  const removeDeposit = (gid: string, did: string) => {
    setGoals((prev) => prev.map((g) => (g.id === gid ? { ...g, deposits: g.deposits.filter((d) => d.id !== did) } : g)));
  };

  return (
    <div style={{ position: "relative", zIndex: 1, padding: "20px 28px 60px", maxWidth: 1240, margin: "0 auto" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 22, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--ink)", color: "var(--orange)", display: "grid", placeItems: "center", boxShadow: "var(--shadow-md)" }}>
            <Icon name="target" size={22} />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em" }}>Objectifs</div>
            <div style={{ fontSize: 12, color: "var(--ink-2)" }}>Ce que tu veux acheter · ce que tu mets de côté · combien il manque</div>
          </div>
        </div>
        <Btn kind="primary" size="md" icon="plus" onClick={addGoal}>Nouvel objectif</Btn>
      </header>

      {/* Combined summary */}
      <section style={{ marginBottom: 22 }}>
        <div
          style={{
            background: "var(--ink)",
            color: "white",
            borderRadius: 24,
            padding: 22,
            boxShadow: "var(--shadow-md)",
            display: "grid",
            gridTemplateColumns: "minmax(220px, 360px) 1fr",
            gap: 24,
            alignItems: "center",
            position: "relative",
            overflow: "hidden",
          }}
          className="goals-summary"
        >
          <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(255,106,26,0.5), transparent 70%)", pointerEvents: "none" }} />
          <div style={{ position: "relative" }}>
            <div style={{ fontSize: 11, color: "var(--orange-soft)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>Mes rêves cumulés</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
              <div style={{ fontSize: 44, fontWeight: 600, letterSpacing: "-0.03em", color: "var(--orange)" }}>
                <AnimatedNumber value={totalSaved} format={fmtEur} />
              </div>
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>
              sur {fmtEur(totalTarget)} ({Math.round(totalPct * 100)}%)
            </div>
            <div style={{ height: 10, background: "rgba(255,255,255,0.1)", borderRadius: 999, marginTop: 12, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${totalPct * 100}%`, background: "var(--orange)", borderRadius: 999, transition: "width 600ms var(--bounce)" }} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, position: "relative" }} className="goals-tiles">
            <Tile label="Reste total" big={fmtEur(totalRemaining)} accent />
            <Tile label="Objectifs actifs" big={String(goals.length)} />
            <Tile label="Déjà encaissé" big={fmtEur(totalSaved)} good={totalSaved > 0} />
          </div>
        </div>
      </section>

      {/* Goals grid */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 18 }} className="goals-grid">
        {goals.length === 0 && (
          <div style={{ background: "var(--card)", border: "1px dashed var(--line)", borderRadius: 18, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Aucun objectif pour l&apos;instant</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 14 }}>Ajoute un rêve chiffré pour commencer.</div>
            <Btn kind="primary" size="md" icon="plus" onClick={addGoal}>Créer mon premier objectif</Btn>
          </div>
        )}
        {goals.map((g) => (
          <GoalCard
            key={g.id}
            goal={g}
            editing={editingId === g.id}
            onEdit={() => setEditingId(editingId === g.id ? null : g.id)}
            onUpdate={(p) => updateGoal(g.id, p)}
            onDelete={() => deleteGoal(g.id)}
            onDeposit={(amount, note) => addDeposit(g.id, amount, note)}
            onRemoveDeposit={(did) => removeDeposit(g.id, did)}
          />
        ))}
      </section>

      <style>{`
        @media (max-width: 900px) {
          .goals-summary { grid-template-columns: 1fr !important; }
          .goals-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 520px) {
          .goals-tiles { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </div>
  );
}

/* ── goal card ─────────────────────────────────────────────────────── */

function GoalCard({
  goal,
  editing,
  onEdit,
  onUpdate,
  onDelete,
  onDeposit,
  onRemoveDeposit,
}: {
  goal: Goal;
  editing: boolean;
  onEdit: () => void;
  onUpdate: (patch: Partial<Goal>) => void;
  onDelete: () => void;
  onDeposit: (amount: number, note: string) => void;
  onRemoveDeposit: (id: string) => void;
}) {
  const saved = savedFor(goal);
  const remaining = remainingFor(goal);
  const pct = pctFor(goal);
  const reached = saved >= goal.target;
  const [depositAmount, setDepositAmount] = useState("");
  const [depositNote, setDepositNote] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const submitDeposit = () => {
    const v = Number(depositAmount.replace(",", "."));
    if (!Number.isFinite(v) || v === 0) return;
    onDeposit(v, depositNote);
    setDepositAmount("");
    setDepositNote("");
  };

  const recent = [...goal.deposits].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5);

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
        gap: 16,
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
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.2 }}>{goal.name}</div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>Cible : {fmtEur(goal.target)}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
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
          <div style={{ fontSize: 13, color: "#C44A00" }}>Supprimer cet objectif et tous les dépôts associés ?</div>
          <div style={{ display: "flex", gap: 6 }}>
            <Btn kind="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Annuler</Btn>
            <button
              onClick={() => { onDelete(); setConfirmDelete(false); }}
              style={{ padding: "8px 14px", borderRadius: 999, background: "#C44A00", color: "white", fontSize: 13, fontWeight: 600 }}
            >Supprimer</button>
          </div>
        </div>
      )}

      {/* Saved / progress */}
      <div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--ink)" }}>
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
          {reached ? "🎉 Objectif atteint !" : `Reste ${fmtEur(remaining)} à mettre de côté.`}
        </div>
      </div>

      {/* Projections */}
      {!reached && (
        <div>
          <div style={{ fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>
            Pour y arriver, mets de côté :
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
            {TIMEFRAMES.map((t) => {
              const monthly = remaining / t.months;
              const weekly = monthly / (52 / 12);
              return (
                <div key={t.label} style={{ background: "var(--bg-2)", borderRadius: 12, padding: "10px 12px" }}>
                  <div style={{ fontSize: 10.5, color: "var(--ink-3)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>en {t.label}</div>
                  <div className="mono" style={{ fontSize: 17, fontWeight: 700, color: "var(--orange)", marginTop: 2, letterSpacing: "-0.02em" }}>{fmtEur(monthly)}<span style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 500 }}>/mois</span></div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>≈ {fmtEur(weekly)}/sem.</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Deposit input */}
      <div style={{ background: "var(--bg-2)", borderRadius: 14, padding: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", background: "white", borderRadius: 10, padding: "8px 12px", width: 130 }}>
          <input
            type="number"
            placeholder="100"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitDeposit()}
            style={{ flex: 1, width: "100%", background: "transparent", border: "none", outline: "none", fontSize: 16, fontFamily: "Geist Mono, monospace", fontWeight: 700, color: "var(--ink)" }}
          />
          <span style={{ fontSize: 13, color: "var(--ink-2)" }}>€</span>
        </div>
        <input
          value={depositNote}
          onChange={(e) => setDepositNote(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitDeposit()}
          placeholder="note (optionnel)"
          style={{ flex: "1 1 120px", minWidth: 0, padding: "10px 12px", background: "white", border: "1px solid transparent", borderRadius: 10, outline: "none", fontSize: 13, color: "var(--ink)" }}
        />
        <Btn kind="primary" size="sm" icon="plus" onClick={submitDeposit}>Ajouter</Btn>
      </div>

      {/* Recent deposits */}
      {recent.length > 0 && (
        <details>
          <summary style={{ cursor: "pointer", fontSize: 12, color: "var(--ink-2)", fontWeight: 600 }}>
            Historique ({goal.deposits.length} dépôt{goal.deposits.length > 1 ? "s" : ""})
          </summary>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
            {recent.map((d) => (
              <div key={d.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", background: "var(--bg-2)", borderRadius: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: d.amount >= 0 ? "var(--ink)" : "#C44A00" }}>
                    {d.amount >= 0 ? "+" : ""}{fmtEur(d.amount)}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)" }}>
                    {new Date(d.date).toLocaleDateString("fr-FR")}{d.note ? ` · ${d.note}` : ""}
                  </div>
                </div>
                <button onClick={() => onRemoveDeposit(d.id)} title="Retirer ce dépôt" style={{ fontSize: 11, color: "var(--ink-3)", padding: "4px 8px" }}>✕</button>
              </div>
            ))}
            {goal.deposits.length > 5 && (
              <div style={{ fontSize: 11, color: "var(--ink-3)" }}>… {goal.deposits.length - 5} autre{goal.deposits.length - 5 > 1 ? "s" : ""} non affiché·s.</div>
            )}
          </div>
        </details>
      )}
    </div>
  );
}

/* ── small helpers ────────────────────────────────────────────────── */

function Tile({ label, big, accent, good }: { label: string; big: string; accent?: boolean; good?: boolean }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "12px 14px" }}>
      <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 500 }}>{label}</div>
      <div className="mono" style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", color: accent ? "var(--orange)" : good ? "var(--green)" : "white", lineHeight: 1.05, marginTop: 4 }}>{big}</div>
    </div>
  );
}

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

function IconBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
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
      }}
    >
      {children}
    </button>
  );
}
