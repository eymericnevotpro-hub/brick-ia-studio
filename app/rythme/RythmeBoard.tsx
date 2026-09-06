"use client";

import { useEffect, useMemo, useState } from "react";
import { Btn, Icon, useLS } from "@/components/discipline-ui";
import {
  Completions,
  DEFAULT_TASKS,
  EMOJI_CHOICES,
  Task,
  WEEKDAYS_ORDER,
  currentStreak,
  dayLabelLong,
  lastDaysStats,
  taskTodayIso,
  taskUid,
  tasksForDate,
} from "@/lib/tasks-store";
import {
  COURSE_ITEM,
  FRACTIONNE_ITEM,
  RepLog,
  SESSION_EXOS,
  SportDone,
  SportReps,
  WEEKDAYS_SHORT,
  WEEK_ORDER,
  kindEmoji,
  kindLabel,
  maxRep,
  sportKindForWeekday,
} from "@/lib/sport-store";
import {
  DAY_INITIAL,
  DEFAULT_JOY,
  JOY_EMOJIS,
  JoyActivity,
  JoyDone,
  MOOD_COLORS,
  MOOD_FACES,
  MOOD_LABELS,
  Moods,
  Night,
  PERSONS,
  Person,
  SLEEP_TARGET_MAX,
  SLEEP_TARGET_MIN,
  Sleep,
  Top3,
  isoOf,
  joyUid,
  lastNDays,
  pKey,
  sleepHours,
  sleepVerdict,
} from "@/lib/rythme-store";

type Section = "jour" | "sommeil" | "sport" | "plaisir";

export default function RythmeBoard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  if (!mounted) return <div style={{ minHeight: "100vh", background: "var(--bg)" }} />;
  return <Inner />;
}

function Inner() {
  const [section, setSection] = useLS<Section>("disc.rythme.section", "jour");
  // Device-local (no "disc." prefix) so each phone stays on its own profile.
  const [who, setWho] = useLS<Person>("bproductive.who", "brick");
  const person = PERSONS.find((p) => p.id === who) ?? PERSONS[0];
  const today = useMemo(() => new Date(), []);
  const iso = isoOf(today);

  const SECTIONS: { id: Section; label: string; emoji: string }[] = [
    { id: "jour", label: "Jour", emoji: "☀️" },
    { id: "sommeil", label: "Sommeil", emoji: "🌙" },
    { id: "sport", label: "Sport", emoji: "💪" },
    { id: "plaisir", label: "Plaisir", emoji: "🎮" },
  ];

  return (
    <div style={{ position: "relative", zIndex: 1, padding: "18px 20px 60px", maxWidth: 720, margin: "0 auto" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--ink)", color: person.color, display: "grid", placeItems: "center", boxShadow: "var(--shadow-md)", fontSize: 20 }}>🌱</div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em" }}>Rythme</div>
          <div style={{ fontSize: 12, color: "var(--ink-2)", textTransform: "capitalize" }}>{dayLabelLong(today)}</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "inline-flex", gap: 3, background: "var(--bg-2)", padding: 3, borderRadius: 999, border: "1px solid var(--line)" }}>
          {PERSONS.map((p) => {
            const on = who === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setWho(p.id)}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 700, background: on ? p.color : "transparent", color: on ? "white" : "var(--ink-3)", transition: "all 200ms var(--ease-out)" }}
              >
                <span style={{ fontSize: 13 }}>{p.emoji}</span>{p.label}
              </button>
            );
          })}
        </div>
      </header>

      <div style={{ display: "flex", gap: 4, background: "var(--bg-2)", padding: 4, borderRadius: 999, border: "1px solid var(--line)", marginBottom: 16, overflowX: "auto" }}>
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            style={{ flex: 1, minWidth: 74, padding: "8px 10px", borderRadius: 999, fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", background: section === s.id ? "white" : "transparent", color: section === s.id ? "var(--ink)" : "var(--ink-2)", boxShadow: section === s.id ? "var(--shadow-sm)" : "none" }}
          >
            {s.emoji} {s.label}
          </button>
        ))}
      </div>

      {section === "jour" && <Jour key={who} iso={iso} today={today} who={who} />}
      {section === "sommeil" && <Sommeil key={who} iso={iso} today={today} who={who} />}
      {section === "sport" && <Sport key={who} iso={iso} today={today} who={who} />}
      {section === "plaisir" && <Plaisir key={who} iso={iso} today={today} who={who} />}
    </div>
  );
}

/* ══════════════════════════════ JOUR ══════════════════════════════ */

function Jour({ iso, today, who }: { iso: string; today: Date; who: Person }) {
  const [tasks, setTasks] = useLS<Task[]>(pKey("disc.tasks.v2", who), DEFAULT_TASKS);
  const [done, setDone] = useLS<Completions>(pKey("disc.tasksDone.v1", who), {});
  const [moods, setMoods] = useLS<Moods>(pKey("disc.mood.v1", who), {});
  const [top3, setTop3] = useLS<Top3>(pKey("disc.top3.v1", who), {});
  const [editing, setEditing] = useState(false);

  const todayTasks = useMemo(() => tasksForDate(tasks, today), [tasks, today]);
  const doneToday = done[iso] || [];
  const doneCount = todayTasks.filter((t) => doneToday.includes(t.id)).length;
  const pct = todayTasks.length ? doneCount / todayTasks.length : 0;
  const streak = useMemo(() => currentStreak(tasks, done, today), [tasks, done, today]);
  const days = useMemo(() => lastDaysStats(tasks, done, 14, today), [tasks, done, today]);

  const toggle = (id: string) => {
    setDone((prev) => {
      const list = new Set(prev[iso] || []);
      if (list.has(id)) list.delete(id);
      else list.add(id);
      return { ...prev, [iso]: [...list] };
    });
  };

  const mood = moods[iso] ?? 0;
  const priorities = top3[iso] ?? ["", "", ""];
  const setPriority = (i: number, v: string) =>
    setTop3((prev) => {
      const cur = [...(prev[iso] ?? ["", "", ""])];
      cur[i] = v;
      return { ...prev, [iso]: cur };
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Mood */}
      <Card>
        <Label>Comment tu te sens aujourd&apos;hui ?</Label>
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          {MOOD_FACES.map((face, i) => {
            const v = i + 1;
            const on = mood === v;
            return (
              <button
                key={v}
                onClick={() => setMoods((prev) => ({ ...prev, [iso]: v }))}
                style={{ flex: 1, padding: "10px 4px", borderRadius: 14, background: on ? MOOD_COLORS[i] : "var(--bg-2)", border: "1px solid transparent", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, transition: "all 180ms var(--ease-out)", transform: on ? "scale(1.04)" : "none" }}
              >
                <span style={{ fontSize: 22, filter: on ? "none" : "grayscale(0.5)", opacity: on ? 1 : 0.75 }}>{face}</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: on ? "white" : "var(--ink-3)" }}>{MOOD_LABELS[i]}</span>
              </button>
            );
          })}
        </div>
        <MoodTrend moods={moods} today={today} />
      </Card>

      {/* Routine */}
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
          <Label>Ta routine du jour</Label>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {streak > 0 && <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--orange)" }}>🔥 {streak}j</span>}
            <span className="mono" style={{ fontSize: 13, fontWeight: 700 }}>{doneCount}/{todayTasks.length}</span>
            <Btn kind="ghost" size="sm" onClick={() => setEditing((v) => !v)}>{editing ? "Terminé" : "Éditer"}</Btn>
          </div>
        </div>
        <div style={{ height: 6, background: "var(--bg-2)", borderRadius: 99, overflow: "hidden", marginBottom: 12 }}>
          <div style={{ height: "100%", width: `${pct * 100}%`, background: pct === 1 ? "var(--green)" : "var(--orange)", borderRadius: 99, transition: "width 400ms var(--ease-out)" }} />
        </div>
        {editing ? (
          <RoutineEditor tasks={tasks} setTasks={setTasks} />
        ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {todayTasks.map((t) => {
            const on = doneToday.includes(t.id);
            return (
              <button key={t.id} onClick={() => toggle(t.id)} style={{ display: "flex", alignItems: "center", gap: 11, textAlign: "left", background: on ? "var(--bg-2)" : "transparent", borderRadius: 12, padding: "9px 10px" }}>
                <span style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0, background: on ? "var(--orange)" : "transparent", border: "1.8px solid", borderColor: on ? "var(--orange)" : "var(--line)", display: "grid", placeItems: "center" }}>
                  {on && <Icon name="check" size={13} color="white" stroke={2.6} />}
                </span>
                <span style={{ fontSize: 17 }}>{t.emoji}</span>
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500, textDecoration: on ? "line-through" : "none", color: on ? "var(--ink-3)" : "var(--ink)" }}>{t.label}</span>
              </button>
            );
          })}
        </div>
        )}
        {!editing && pct === 1 && todayTasks.length > 0 && (
          <div style={{ marginTop: 10, background: "#E6F5EC", borderRadius: 12, padding: "10px 12px", fontSize: 13, fontWeight: 600, color: "var(--green)", textAlign: "center" }}>
            🎉 Journée complète. C&apos;est exactement comme ça que ça remonte.
          </div>
        )}
        {/* 14-day strip */}
        <div style={{ display: "flex", gap: 3, marginTop: 12 }}>
          {days.map((d) => (
            <div key={d.iso} style={{ flex: 1 }}>
              <div title={`${d.done}/${d.scheduled}`} style={{ height: 22, borderRadius: 5, background: d.scheduled === 0 ? "var(--bg-2)" : d.ratio === 0 ? "var(--bg-2)" : `rgba(255,106,26,${0.22 + d.ratio * 0.78})` }} />
              <div style={{ fontSize: 8.5, color: "var(--ink-3)", textAlign: "center", marginTop: 2 }}>{DAY_INITIAL[d.date.getDay()]}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Top 3 */}
      <Card>
        <Label>Les 3 choses du jour</Label>
        <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 3, marginBottom: 10 }}>Décidées le matin. Trois, pas plus — trois c&apos;est déjà une bonne journée.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span className="mono" style={{ fontSize: 12, color: "var(--ink-3)", width: 14 }}>{i + 1}.</span>
              <input
                value={priorities[i] ?? ""}
                onChange={(e) => setPriority(i, e.target.value)}
                placeholder="…"
                style={{ flex: 1, background: "var(--bg-2)", border: "1px solid transparent", borderRadius: 10, padding: "9px 11px", fontSize: 13.5, outline: "none", color: "var(--ink)" }}
              />
            </div>
          ))}
        </div>
      </Card>

      <SupportCard />
    </div>
  );
}

function MoodTrend({ moods, today }: { moods: Moods; today: Date }) {
  const days = useMemo(() => lastNDays(14, today), [today]);
  const vals = days.map((d) => moods[d.iso] ?? 0);
  const rated = vals.filter((v) => v > 0);
  const avg = rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : 0;
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 44 }}>
        {days.map((d, i) => {
          const v = vals[i];
          return (
            <div key={d.iso} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
              <div
                title={v ? MOOD_LABELS[v - 1] : "non noté"}
                style={{ height: v ? `${(v / 5) * 100}%` : 4, borderRadius: 4, background: v ? MOOD_COLORS[v - 1] : "var(--bg-2)", opacity: v ? 0.9 : 1 }}
              />
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 6 }}>
        14 derniers jours{avg > 0 && <> · moyenne <b style={{ color: "var(--ink-2)" }}>{avg.toFixed(1)}/5</b></>}
      </div>
    </div>
  );
}

function SupportCard() {
  return (
    <div style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 18, padding: 14, fontSize: 12, color: "var(--ink-2)", lineHeight: 1.6 }}>
      Cette app aide à tenir un rythme — elle ne remplace pas un soignant. Si ça reste lourd, parles-en à ton médecin (le dispositif <b>Mon soutien psy</b> rembourse des séances de psy sans avance de frais).
      <br />
      <span style={{ color: "var(--ink-3)" }}>Si tu vas vraiment mal : <b style={{ color: "var(--ink-2)" }}>3114</b> — gratuit, 24h/24, 7j/7.</span>
    </div>
  );
}

/* ═════════════════════════════ SOMMEIL ═════════════════════════════ */

function Sommeil({ iso, today, who }: { iso: string; today: Date; who: Person }) {
  const [sleep, setSleep] = useLS<Sleep>(pKey("disc.sleep.v1", who), {});
  const nights = useMemo(() => lastNDays(7, today), [today]);

  const tonight: Night = sleep[iso] ?? { bed: "23:00", wake: "07:00" };
  const h = sleepHours(tonight);
  const verdict = sleepVerdict(h);

  const setNight = (patch: Partial<Night>) =>
    setSleep((prev) => ({ ...prev, [iso]: { ...(prev[iso] ?? { bed: "23:00", wake: "07:00" }), ...patch } }));

  const rated = nights.map((n) => sleepHours(sleep[n.iso])).filter((v) => v > 0);
  const avg = rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card>
        <Label>Ta nuit dernière</Label>
        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <TimeField label="Couché à" value={tonight.bed} onChange={(v) => setNight({ bed: v })} />
          <TimeField label="Réveillé à" value={tonight.wake} onChange={(v) => setNight({ wake: v })} />
          <div style={{ flex: 1, minWidth: 110, background: "var(--bg-2)", borderRadius: 12, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Durée</div>
            <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: verdict.color, marginTop: 2 }}>{h > 0 ? `${h} h` : "—"}</div>
            <div style={{ fontSize: 11, color: verdict.color, fontWeight: 600 }}>{verdict.label}</div>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 5 }}>Qualité ressentie</div>
          <div style={{ display: "flex", gap: 5 }}>
            {[1, 2, 3, 4, 5].map((q) => {
              const on = tonight.quality === q;
              return (
                <button key={q} onClick={() => setNight({ quality: q })} style={{ flex: 1, padding: "8px 0", borderRadius: 10, fontSize: 17, background: on ? "var(--orange-50)" : "var(--bg-2)", border: on ? "1.5px solid var(--orange)" : "1.5px solid transparent" }}>
                  {MOOD_FACES[q - 1]}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Label>7 dernières nuits</Label>
          {avg > 0 && <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-2)" }}>moy. {avg.toFixed(1)} h</span>}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 96, marginTop: 14 }}>
          {nights.map((n) => {
            const hh = sleepHours(sleep[n.iso]);
            const pct = Math.min(hh / 10, 1);
            const v = sleepVerdict(hh);
            return (
              <div key={n.iso} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end" }}>
                <span className="mono" style={{ fontSize: 9.5, color: "var(--ink-3)" }}>{hh > 0 ? hh : ""}</span>
                <div style={{ width: "100%", height: `${Math.max(pct * 100, 3)}%`, borderRadius: 6, background: hh > 0 ? v.color : "var(--bg-2)", opacity: hh > 0 ? 0.85 : 1 }} />
                <span style={{ fontSize: 9.5, color: "var(--ink-3)" }}>{DAY_INITIAL[n.date.getDay()]}</span>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 10, lineHeight: 1.55 }}>
          Cible : <b style={{ color: "var(--ink-2)" }}>{SLEEP_TARGET_MIN}-{SLEEP_TARGET_MAX} h</b>. Ce qui compte le plus, c&apos;est <b style={{ color: "var(--ink-2)" }}>l&apos;heure de réveil fixe</b> — même le week-end. Elle cale tout le reste.
        </div>
      </Card>

      <Card>
        <Label>Les 3 règles qui font le sommeil</Label>
        <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 10 }}>
          {[
            { e: "☀️", t: "Lumière du jour le matin", d: "20 min dehors dans l'heure qui suit le réveil. C'est le signal qui déclenche l'endormissement 16 h plus tard." },
            { e: "☕", t: "Zéro caféine après 14h", d: "La demi-vie est de 5-6 h : un café à 16 h agit encore à minuit." },
            { e: "📵", t: "Écrans coupés 45 min avant le lit", d: "Le sommeil profond de la 1re moitié de nuit est celui qui répare le moral." },
          ].map((r) => (
            <div key={r.t} style={{ display: "flex", gap: 10, background: "var(--bg-2)", borderRadius: 12, padding: 11 }}>
              <span style={{ fontSize: 18 }}>{r.e}</span>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{r.t}</div>
                <div style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.45, marginTop: 1 }}>{r.d}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ flex: 1, minWidth: 110, background: "var(--bg-2)", borderRadius: 12, padding: "10px 12px" }}>
      <div style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{label}</div>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mono"
        style={{ background: "transparent", border: "none", outline: "none", fontSize: 21, fontWeight: 700, color: "var(--ink)", marginTop: 2, width: "100%", padding: 0 }}
      />
    </div>
  );
}

/* ══════════════════════════════ SPORT ══════════════════════════════ */

function Sport({ iso, today, who }: { iso: string; today: Date; who: Person }) {
  const [reps, setReps] = useLS<SportReps>(pKey("disc.sportReps.v1", who), {});
  const [done, setDone] = useLS<SportDone>(pKey("disc.sportDone.v1", who), {});

  const wd = today.getDay();
  const kind = sportKindForWeekday(wd);
  const doneToday = done[iso] || [];

  const toggle = (id: string) => {
    setDone((prev) => {
      const list = new Set(prev[iso] || []);
      if (list.has(id)) list.delete(id);
      else list.add(id);
      return { ...prev, [iso]: [...list] };
    });
  };

  const repToday: RepLog = reps[iso] || { tractions: [0, 0, 0], dips: [0, 0, 0] };
  const setRep = (exo: "tractions" | "dips", i: number, v: number) => {
    setReps((prev) => {
      const cur: RepLog = prev[iso] || { tractions: [0, 0, 0], dips: [0, 0, 0] };
      const next = [...cur[exo]];
      next[i] = Math.max(0, v);
      return { ...prev, [iso]: { ...cur, [exo]: next } };
    });
  };

  const over12 = maxRep(repToday.tractions) > 12 || maxRep(repToday.dips) > 12;
  const history = useMemo(
    () =>
      Object.entries(reps)
        .map(([d, r]) => ({ d, tractions: maxRep(r.tractions), dips: maxRep(r.dips) }))
        .filter((h) => h.tractions > 0 || h.dips > 0)
        .sort((a, b) => (a.d < b.d ? 1 : -1))
        .slice(0, 6),
    [reps]
  );

  const activity = kind === "fractionne" ? FRACTIONNE_ITEM : COURSE_ITEM;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 12 }}>{kindEmoji(kind)} {kindLabel(kind)}</div>

        {kind === "muscu" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {SESSION_EXOS.map((ex) => {
              const isDone = doneToday.includes(ex.id);
              return (
                <div key={ex.id} style={{ background: "var(--bg-2)", borderRadius: 14, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  <button onClick={() => toggle(ex.id)} style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left", background: "transparent" }}>
                    <span style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, background: isDone ? "var(--orange)" : "transparent", border: "1.8px solid", borderColor: isDone ? "var(--orange)" : "var(--line)", display: "grid", placeItems: "center" }}>
                      {isDone && <Icon name="check" size={14} color="white" stroke={2.6} />}
                    </span>
                    <span style={{ flex: 1 }}>
                      <span style={{ display: "block", fontSize: 14.5, fontWeight: 600 }}>{ex.label}</span>
                      <span style={{ display: "block", fontSize: 12, color: "var(--ink-3)" }}>{ex.detail}</span>
                    </span>
                  </button>
                  {ex.log && (
                    <div style={{ display: "flex", gap: 6, alignItems: "center", paddingLeft: 38 }}>
                      <span style={{ fontSize: 11, color: "var(--ink-3)", width: 44 }}>reps :</span>
                      {[0, 1, 2].map((i) => (
                        <input
                          key={i}
                          type="number"
                          min={0}
                          value={repToday[ex.id as "tractions" | "dips"][i] || ""}
                          onChange={(e) => setRep(ex.id as "tractions" | "dips", i, Number(e.target.value) || 0)}
                          placeholder={`S${i + 1}`}
                          style={{ width: 52, textAlign: "center", background: "white", border: "1px solid var(--line)", borderRadius: 8, padding: "6px 4px", fontSize: 14, fontFamily: "Geist Mono, monospace", fontWeight: 600, outline: "none", color: "var(--ink)" }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {over12 && (
              <div style={{ background: "var(--orange-50)", border: "1px solid var(--orange-100)", borderRadius: 12, padding: "10px 12px", fontSize: 12.5, color: "var(--orange)", fontWeight: 500 }}>
                🎯 Tu dépasses 12 reps → ralentis la descente (3 s) ou ajoute un sac à dos lesté.
              </div>
            )}
          </div>
        ) : (
          <button onClick={() => toggle(activity.id)} style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left", background: "var(--bg-2)", borderRadius: 14, padding: 14, width: "100%" }}>
            <span style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: doneToday.includes(activity.id) ? "var(--orange)" : "transparent", border: "1.8px solid", borderColor: doneToday.includes(activity.id) ? "var(--orange)" : "var(--line)", display: "grid", placeItems: "center" }}>
              {doneToday.includes(activity.id) && <Icon name="check" size={16} color="white" stroke={2.6} />}
            </span>
            <span>
              <span style={{ display: "block", fontSize: 15, fontWeight: 600 }}>{activity.label}</span>
              <span style={{ display: "block", fontSize: 12.5, color: "var(--ink-3)" }}>{activity.detail}</span>
            </span>
          </button>
        )}
      </Card>

      <Card>
        <Label>Ta semaine</Label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5, marginTop: 10 }}>
          {WEEK_ORDER.map((day) => {
            const k = sportKindForWeekday(day);
            const isToday = day === wd;
            return (
              <div key={day} style={{ background: isToday ? "var(--orange-50)" : "var(--bg-2)", border: isToday ? "1px solid var(--orange)" : "1px solid transparent", borderRadius: 10, padding: "8px 4px", textAlign: "center" }}>
                <div style={{ fontSize: 10.5, color: "var(--ink-3)", fontWeight: 600 }}>{WEEKDAYS_SHORT[day]}</div>
                <div style={{ fontSize: 18, marginTop: 2 }}>{k === "muscu" ? "💪" : k === "fractionne" ? "💨" : "🏃"}</div>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 10, lineHeight: 1.5 }}>
          💪 séance · 🏃 course tranquille (25-30 min) · 💨 fractionné. Tu bouges 7j/7, tu construis du muscle 4j/7.
        </div>
      </Card>

      {history.length > 0 && (
        <Card>
          <Label>Progression (max reps)</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, fontSize: 10.5, color: "var(--ink-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              <span>Date</span><span>Tractions</span><span>Dips</span>
            </div>
            {history.map((h) => (
              <div key={h.d} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, fontSize: 13, alignItems: "center" }}>
                <span style={{ color: "var(--ink-2)" }}>{new Date(h.d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
                <span className="mono" style={{ fontWeight: 700, textAlign: "right", color: h.tractions > 12 ? "var(--orange)" : "var(--ink)" }}>{h.tractions}</span>
                <span className="mono" style={{ fontWeight: 700, textAlign: "right", color: h.dips > 12 ? "var(--orange)" : "var(--ink)" }}>{h.dips}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ═════════════════════════════ PLAISIR ═════════════════════════════ */

function Plaisir({ iso, today, who }: { iso: string; today: Date; who: Person }) {
  const [acts, setActs] = useLS<JoyActivity[]>(pKey("disc.joy.v1", who), DEFAULT_JOY);
  const [done, setDone] = useLS<JoyDone>(pKey("disc.joyDone.v1", who), {});
  const [editing, setEditing] = useState(false);
  const [pick, setPick] = useState<string | null>(null);

  const doneToday = done[iso] || [];
  const days = useMemo(() => lastNDays(7, today), [today]);
  const weekCount = days.filter((d) => (done[d.iso] || []).length > 0).length;

  const toggle = (id: string) => {
    setDone((prev) => {
      const list = new Set(prev[iso] || []);
      if (list.has(id)) list.delete(id);
      else list.add(id);
      return { ...prev, [iso]: [...list] };
    });
  };

  const draw = () => {
    if (acts.length === 0) return;
    const pool = acts.filter((a) => !doneToday.includes(a.id));
    const from = pool.length ? pool : acts;
    setPick(from[Math.floor(Math.random() * from.length)].id);
  };

  const picked = acts.find((a) => a.id === pick) || null;

  const addAct = () => setActs((prev) => [...prev, { id: joyUid(), label: "Nouvelle activité", emoji: "🎮" }]);
  const updateAct = (id: string, patch: Partial<JoyActivity>) => setActs((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const removeAct = (id: string) => setActs((prev) => prev.filter((a) => a.id !== id));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ background: "linear-gradient(135deg, #FFF1E2 0%, #FFE0C7 100%)", border: "1px solid var(--orange-100)", borderRadius: 24, padding: 18 }}>
        <div style={{ fontSize: 11, color: "var(--orange)", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>Un truc pour toi, chaque jour</div>
        <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55, marginTop: 6 }}>
          Quand le moral est bas, l&apos;envie ne revient pas avant l&apos;action — elle revient <b>pendant</b>. Donc on ne se demande pas si on en a envie : on en pioche un, on le fait 10 minutes.
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
          <Btn kind="primary" size="md" onClick={draw}>🎲 Pioche-moi un truc</Btn>
          <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
            {doneToday.length > 0 ? `✓ ${doneToday.length} aujourd'hui` : "rien encore aujourd'hui"} · {weekCount}/7 jours cette semaine
          </span>
        </div>
        {picked && (
          <div style={{ marginTop: 12, background: "white", borderRadius: 14, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 30 }}>{picked.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{picked.label}</div>
              <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>10 minutes suffisent pour commencer.</div>
            </div>
            <Btn kind="soft" size="sm" icon="check" onClick={() => { toggle(picked.id); setPick(null); }}>Fait</Btn>
          </div>
        )}
      </div>

      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
          <Label>Ta liste</Label>
          <Btn kind="ghost" size="sm" onClick={() => setEditing((v) => !v)}>{editing ? "Terminé" : "Éditer"}</Btn>
        </div>

        {editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {acts.map((a) => (
              <div key={a.id} style={{ display: "flex", gap: 6, alignItems: "center", background: "var(--bg-2)", borderRadius: 12, padding: 7 }}>
                <select value={a.emoji} onChange={(e) => updateAct(a.id, { emoji: e.target.value })} style={{ fontSize: 17, background: "white", border: "1px solid transparent", borderRadius: 8, padding: "5px 3px" }}>
                  {[a.emoji, ...JOY_EMOJIS.filter((e) => e !== a.emoji)].map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
                <input value={a.label} onChange={(e) => updateAct(a.id, { label: e.target.value })} style={{ flex: 1, minWidth: 0, background: "white", border: "1px solid transparent", borderRadius: 8, padding: "8px 10px", fontSize: 13, outline: "none", color: "var(--ink)" }} />
                <button onClick={() => removeAct(a.id)} style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(196,74,0,0.08)", color: "#C44A00", fontSize: 13, display: "grid", placeItems: "center" }}>✕</button>
              </div>
            ))}
            <button onClick={addAct} style={{ alignSelf: "flex-start", padding: "8px 14px", borderRadius: 999, background: "var(--orange-50)", color: "var(--orange)", fontSize: 12.5, fontWeight: 600, border: "1px dashed var(--orange-100)" }}>
              + Ajouter une activité
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 7 }}>
            {acts.map((a) => {
              const on = doneToday.includes(a.id);
              return (
                <button key={a.id} onClick={() => toggle(a.id)} style={{ display: "flex", alignItems: "center", gap: 9, textAlign: "left", background: on ? "#E6F5EC" : "var(--bg-2)", border: on ? "1px solid #B7E0C6" : "1px solid transparent", borderRadius: 12, padding: "10px 11px" }}>
                  <span style={{ fontSize: 19, filter: on ? "none" : "grayscale(0.25)" }}>{a.emoji}</span>
                  <span style={{ flex: 1, fontSize: 12.5, fontWeight: 500, lineHeight: 1.3, color: on ? "var(--green)" : "var(--ink)" }}>{a.label}</span>
                  {on && <Icon name="check" size={14} color="var(--green)" stroke={2.6} />}
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <Label>7 derniers jours</Label>
        <div style={{ display: "flex", gap: 5, marginTop: 10 }}>
          {days.map((d) => {
            const n = (done[d.iso] || []).length;
            return (
              <div key={d.iso} style={{ flex: 1, textAlign: "center" }}>
                <div title={`${n} activité(s)`} style={{ height: 34, borderRadius: 8, background: n === 0 ? "var(--bg-2)" : `rgba(25,163,106,${0.3 + Math.min(n, 3) * 0.23})`, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, color: n === 0 ? "var(--ink-3)" : "white" }}>
                  {n > 0 ? n : ""}
                </div>
                <div style={{ fontSize: 9.5, color: "var(--ink-3)", marginTop: 3 }}>{DAY_INITIAL[d.date.getDay()]}</div>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 10, lineHeight: 1.5 }}>
          L&apos;objectif n&apos;est pas de tout cocher — c&apos;est d&apos;avoir <b style={{ color: "var(--ink-2)" }}>au moins une case verte par jour</b>.
        </div>
      </Card>
    </div>
  );
}

function RoutineEditor({ tasks, setTasks }: { tasks: Task[]; setTasks: (fn: (prev: Task[]) => Task[]) => void }) {
  const update = (id: string, patch: Partial<Task>) => setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const remove = (id: string) => setTasks((prev) => prev.filter((t) => t.id !== id));
  const add = () =>
    setTasks((prev) => [...prev, { id: taskUid(), label: "Nouvelle habitude", emoji: "🎯", days: [], createdAt: taskTodayIso() }]);
  const toggleDay = (t: Task, d: number) =>
    update(t.id, { days: t.days.includes(d) ? t.days.filter((x) => x !== d) : [...t.days, d] });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      {tasks.map((t) => (
        <div key={t.id} style={{ background: "var(--bg-2)", borderRadius: 12, padding: 9, display: "flex", flexDirection: "column", gap: 7 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <select value={t.emoji} onChange={(e) => update(t.id, { emoji: e.target.value })} style={{ fontSize: 16, background: "white", border: "1px solid transparent", borderRadius: 8, padding: "5px 3px" }}>
              {[t.emoji, ...EMOJI_CHOICES.filter((e) => e !== t.emoji)].map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
            <input value={t.label} onChange={(e) => update(t.id, { label: e.target.value })} style={{ flex: 1, minWidth: 0, background: "white", border: "1px solid transparent", borderRadius: 8, padding: "8px 10px", fontSize: 13, outline: "none", color: "var(--ink)" }} />
            <button onClick={() => remove(t.id)} style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(196,74,0,0.08)", color: "#C44A00", fontSize: 13, display: "grid", placeItems: "center", flexShrink: 0 }}>✕</button>
          </div>
          <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
            {WEEKDAYS_ORDER.map((d) => {
              const on = t.days.length === 0 || t.days.includes(d);
              return (
                <button key={d} onClick={() => toggleDay(t, d)} style={{ padding: "4px 9px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: on ? "var(--orange)" : "white", color: on ? "white" : "var(--ink-3)" }}>
                  {WEEKDAYS_SHORT[d]}
                </button>
              );
            })}
            {t.days.length === 0 && <span style={{ fontSize: 10.5, color: "var(--ink-3)", alignSelf: "center", marginLeft: 4 }}>tous les jours</span>}
          </div>
        </div>
      ))}
      <button onClick={add} style={{ alignSelf: "flex-start", padding: "8px 14px", borderRadius: 999, background: "var(--orange-50)", color: "var(--orange)", fontSize: 12.5, fontWeight: 600, border: "1px dashed var(--orange-100)" }}>
        + Ajouter une habitude
      </button>
    </div>
  );
}

/* ── shared bits ── */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 24, padding: 18, boxShadow: "var(--shadow-sm)" }}>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11.5, color: "var(--ink-2)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700 }}>{children}</div>;
}
