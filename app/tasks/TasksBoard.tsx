"use client";

import { useEffect, useMemo, useState } from "react";
import { Btn, Confetti, Icon, useLS, useSpring } from "@/components/discipline-ui";
import {
  Completions,
  DEFAULT_TASKS,
  EMOJI_CHOICES,
  Task,
  WEEKDAYS_ORDER,
  WEEKDAYS_SHORT,
  currentStreak,
  dayLabelLong,
  lastDaysStats,
  perTaskScores,
  taskTodayIso,
  taskUid,
  tasksForDate,
} from "@/lib/tasks-store";

export default function TasksBoard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  if (!mounted) return <div style={{ minHeight: "100vh", background: "var(--bg)" }} />;
  return <Inner />;
}

function Inner() {
  const [tasks, setTasks] = useLS<Task[]>("disc.tasks.v1", DEFAULT_TASKS);
  const [done, setDone] = useLS<Completions>("disc.tasksDone.v1", {});
  const [editing, setEditing] = useState(false);

  const today = useMemo(() => new Date(), []);
  const iso = taskTodayIso(today);
  const todayTasks = useMemo(() => tasksForDate(tasks, today), [tasks, today]);
  const doneToday = done[iso] || [];

  const [celebrate, setCelebrate] = useState(false);
  const toggle = (id: string) => {
    setDone((prev) => {
      const list = new Set(prev[iso] || []);
      if (list.has(id)) list.delete(id);
      else list.add(id);
      return { ...prev, [iso]: [...list] };
    });
  };

  const doneCount = todayTasks.filter((t) => doneToday.includes(t.id)).length;
  const allDone = todayTasks.length > 0 && doneCount === todayTasks.length;
  useEffect(() => {
    if (!allDone) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCelebrate(true);
    const t = setTimeout(() => setCelebrate(false), 1800);
    return () => clearTimeout(t);
  }, [allDone]);

  const streak = useMemo(() => currentStreak(tasks, done), [tasks, done]);
  const stats28 = useMemo(() => lastDaysStats(tasks, done, 28), [tasks, done]);
  const scores = useMemo(() => perTaskScores(tasks, done, 28), [tasks, done]);

  return (
    <div style={{ position: "relative", zIndex: 1, padding: "18px 20px 60px", maxWidth: 720, margin: "0 auto" }}>
      <Confetti active={celebrate} />

      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--ink)", color: "var(--orange)", display: "grid", placeItems: "center", boxShadow: "var(--shadow-md)" }}>
            <Icon name="check" size={22} stroke={2.4} />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em" }}>Tâches</div>
            <div style={{ fontSize: 12, color: "var(--ink-2)", textTransform: "capitalize" }}>{dayLabelLong(today)}</div>
          </div>
        </div>
        <Btn kind={editing ? "primary" : "ghost"} size="sm" icon={editing ? "check" : "target"} onClick={() => setEditing((e) => !e)}>
          {editing ? "Terminé" : "Éditer"}
        </Btn>
      </header>

      {editing ? (
        <Editor tasks={tasks} setTasks={setTasks} />
      ) : (
        <>
          {/* Today */}
          <TodayCard tasks={todayTasks} doneToday={doneToday} onToggle={toggle} doneCount={doneCount} allDone={allDone} />

          {/* Discipline tracking */}
          <div style={{ height: 16 }} />
          <StreakCard streak={streak} stats={stats28} />

          {/* Per-task follow-up */}
          <div style={{ height: 16 }} />
          <ScoresCard scores={scores} />
        </>
      )}

      <footer style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 20, textAlign: "center" }}>
        Coche chaque jour. Le suivi te dira si tu tiens ta discipline. Tout est synchronisé entre tes appareils.
      </footer>
    </div>
  );
}

/* ── today's checklist ─────────────────────────────────────────────── */

function TodayCard({
  tasks,
  doneToday,
  onToggle,
  doneCount,
  allDone,
}: {
  tasks: Task[];
  doneToday: string[];
  onToggle: (id: string) => void;
  doneCount: number;
  allDone: boolean;
}) {
  const pct = tasks.length ? doneCount / tasks.length : 0;
  const tween = useSpring(pct, { stiffness: 120, damping: 20 });

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 24, padding: 20, boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Aujourd&apos;hui</div>
        <div
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "6px 12px 6px 8px",
            background: allDone ? "var(--green)" : "var(--orange-50)", color: allDone ? "white" : "var(--orange)",
            borderRadius: 999, fontFamily: "Geist Mono, monospace", fontSize: 13, fontWeight: 700,
            transition: "background 280ms var(--ease-out), color 280ms",
          }}
        >
          <div style={{ position: "relative", width: 22, height: 22 }}>
            <svg width="22" height="22" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="11" cy="11" r="9" stroke="rgba(255,106,26,0.18)" strokeWidth="3" fill="none" />
              <circle cx="11" cy="11" r="9" stroke={allDone ? "white" : "var(--orange)"} strokeWidth="3" fill="none" strokeLinecap="round"
                strokeDasharray={`${tween * (2 * Math.PI * 9)} ${2 * Math.PI * 9}`} style={{ transition: "stroke-dasharray 400ms var(--bounce)" }} />
            </svg>
          </div>
          {doneCount}/{tasks.length}
        </div>
      </div>

      {tasks.length === 0 ? (
        <div style={{ fontSize: 13.5, color: "var(--ink-2)", textAlign: "center", padding: "12px 0" }}>
          Aucune tâche prévue aujourd&apos;hui. Clique « Éditer » pour en ajouter.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tasks.map((t) => {
            const isDone = doneToday.includes(t.id);
            return (
              <button
                key={t.id}
                onClick={() => onToggle(t.id)}
                style={{
                  display: "grid", gridTemplateColumns: "32px 1fr 30px", alignItems: "center", gap: 12,
                  padding: "14px 16px", borderRadius: 16, width: "100%", textAlign: "left",
                  background: isDone ? "var(--ink)" : "var(--bg-2)", color: isDone ? "white" : "var(--ink)",
                  border: "1.5px solid", borderColor: isDone ? "var(--ink)" : "transparent",
                  transition: "background 220ms var(--ease-out), transform 180ms var(--bounce)",
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.99)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                <span style={{ fontSize: 22 }}>{t.emoji}</span>
                <span style={{ fontSize: 15, fontWeight: 500, textDecoration: isDone ? "line-through" : "none", opacity: isDone ? 0.7 : 1 }}>{t.label}</span>
                <span
                  style={{
                    width: 28, height: 28, borderRadius: "50%", display: "grid", placeItems: "center",
                    background: isDone ? "var(--orange)" : "transparent",
                    border: "1.8px solid", borderColor: isDone ? "var(--orange)" : "var(--line)",
                    transition: "background 220ms var(--bounce-strong)",
                  }}
                >
                  {isDone && (
                    <span style={{ animation: "pop-in 360ms var(--bounce-strong)", display: "grid", placeItems: "center" }}>
                      <Icon name="check" size={16} color="white" stroke={2.6} />
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {allDone && <div style={{ fontSize: 13, color: "var(--green)", fontWeight: 600, textAlign: "center" }}>🎉 Journée parfaite !</div>}
    </div>
  );
}

/* ── streak + heatmap ──────────────────────────────────────────────── */

function StreakCard({ streak, stats }: { streak: number; stats: ReturnType<typeof lastDaysStats> }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 24, padding: 20, boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--ink-2)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>Série en cours</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--orange)" }}>{streak}</span>
            <span style={{ fontSize: 15, color: "var(--ink-2)" }}>jour{streak > 1 ? "s" : ""} parfait{streak > 1 ? "s" : ""}</span>
            <Icon name="flame" color="var(--orange)" size={22} />
          </div>
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-3)", textAlign: "right" }}>28 derniers jours</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(14, 1fr)", gap: 5 }}>
        {stats.map((d) => {
          const alpha = d.scheduled === 0 ? 0 : d.ratio === 0 ? 0.08 : 0.25 + d.ratio * 0.75;
          return (
            <div
              key={d.iso}
              title={`${d.date.toLocaleDateString("fr-FR")} · ${d.scheduled ? Math.round(d.ratio * 100) + "%" : "repos"}`}
              style={{
                aspectRatio: "1 / 1", borderRadius: 5,
                background: d.scheduled === 0 ? "repeating-linear-gradient(45deg, var(--bg-2), var(--bg-2) 3px, transparent 3px, transparent 6px)" : d.ratio === 0 ? "rgba(26,18,8,0.06)" : `rgba(255,106,26,${alpha})`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ── per-task follow-up ────────────────────────────────────────────── */

function ScoresCard({ scores }: { scores: ReturnType<typeof perTaskScores> }) {
  const active = scores.filter((s) => s.scheduled > 0);
  if (active.length === 0) return null;
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 24, padding: 20, boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 12, color: "var(--ink-2)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>Régularité par tâche (28 j)</div>
      {active.map((s) => (
        <div key={s.task.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>{s.task.emoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.task.label}</span>
              <span className="mono" style={{ fontSize: 12, color: "var(--ink-2)" }}>{s.done}/{s.scheduled} · {Math.round(s.pct * 100)}%</span>
            </div>
            <div style={{ height: 8, background: "var(--bg-2)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${s.pct * 100}%`, background: s.pct >= 0.8 ? "var(--green)" : "linear-gradient(90deg, var(--orange-soft), var(--orange))", borderRadius: 999, transition: "width 500ms var(--bounce)" }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── editor ────────────────────────────────────────────────────────── */

function Editor({ tasks, setTasks }: { tasks: Task[]; setTasks: (v: Task[] | ((p: Task[]) => Task[])) => void }) {
  const update = (id: string, patch: Partial<Task>) => setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const remove = (id: string) => setTasks((prev) => prev.filter((t) => t.id !== id));
  const add = () => setTasks((prev) => [...prev, { id: taskUid(), label: "Nouvelle tâche", emoji: "🎯", days: [], createdAt: taskTodayIso() }]);
  const toggleDay = (t: Task, day: number) => {
    const has = t.days.includes(day);
    update(t.id, { days: has ? t.days.filter((d) => d !== day) : [...t.days, day] });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {tasks.map((t) => (
        <div key={t.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 18, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select
              value={t.emoji}
              onChange={(e) => update(t.id, { emoji: e.target.value })}
              style={{ fontSize: 20, padding: "6px", background: "var(--bg-2)", border: "1px solid transparent", borderRadius: 10, outline: "none" }}
            >
              {[t.emoji, ...EMOJI_CHOICES.filter((e) => e !== t.emoji)].map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
            <input
              value={t.label}
              onChange={(e) => update(t.id, { label: e.target.value })}
              placeholder="Nom de la tâche"
              style={{ flex: 1, minWidth: 0, background: "var(--bg-2)", border: "1px solid transparent", borderRadius: 10, padding: "10px 12px", fontSize: 14, outline: "none", color: "var(--ink)" }}
            />
            <button onClick={() => remove(t.id)} title="Supprimer" style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(196,74,0,0.08)", color: "#C44A00", fontSize: 15, fontWeight: 700, display: "grid", placeItems: "center", flexShrink: 0 }}>✕</button>
          </div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {WEEKDAYS_ORDER.map((day) => {
              const on = t.days.length === 0 || t.days.includes(day);
              const everyday = t.days.length === 0;
              return (
                <button
                  key={day}
                  onClick={() => toggleDay(t, day)}
                  style={{
                    padding: "6px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                    background: on ? (everyday ? "var(--orange-50)" : "var(--orange)") : "var(--bg-2)",
                    color: on ? (everyday ? "var(--orange)" : "white") : "var(--ink-3)",
                    border: "1px solid transparent",
                  }}
                >
                  {WEEKDAYS_SHORT[day]}
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-3)" }}>
            {t.days.length === 0 ? "Tous les jours" : "Jours sélectionnés uniquement"}
          </div>
        </div>
      ))}
      <button onClick={add} style={{ padding: "12px", borderRadius: 14, background: "var(--orange-50)", color: "var(--orange)", fontSize: 14, fontWeight: 600, border: "1px dashed var(--orange-100)" }}>
        + Ajouter une tâche
      </button>
    </div>
  );
}
