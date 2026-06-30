"use client";

import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AnimatedNumber,
  Btn,
  Confetti,
  Dots,
  FloatLabel,
  Icon,
  useLS,
  useSpring,
} from "@/components/discipline-ui";
import {
  DEFAULT_FISCAL,
  DEFAULT_HABITS,
  DEFAULT_MEMBERS,
  DEFAULT_PRICES,
  Fiscal,
  GOAL,
  Habit,
  ICON_CHOICES,
  IconName,
  MonthCounters,
  Prices,
  ServiceEntry,
  computeFinance,
  dayLabel,
  emptyCounters,
  fmtEur,
  fmtUsd,
  monthKey,
  monthLabel,
  newHabit,
  todayKey,
} from "@/lib/discipline-store";
import { InstallPrompt, RemindersCard, useReminders } from "@/components/pwa";

type Breakdown = { key: string; color: string; value: number };

/* ====================================================================== */
/*  REVENUE RING                                                          */
/* ====================================================================== */
function RevenueRing({
  total,
  goal,
  breakdown,
  modeLabel,
  monthDate,
}: {
  total: number;
  goal: number;
  breakdown: Breakdown[];
  modeLabel: string;
  monthDate?: Date;
}) {
  const size = 380;
  const stroke = 26;
  const r = (size - stroke) / 2 - 12;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, total / goal);
  const tweenedTotal = useSpring(total, { stiffness: 90, damping: 18 });
  const tweenedPct = useSpring(pct, { stiffness: 90, damping: 18 });

  const segs = useMemo(
    () =>
      breakdown.map((b, i) => {
        const portion = Math.min(1, b.value / goal);
        const offset = breakdown.slice(0, i).reduce((sum, prev) => sum + Math.min(1, prev.value / goal), 0);
        return { ...b, offset, portion };
      }),
    [breakdown, goal],
  );

  const reached = total >= goal;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <div
        style={{
          position: "absolute",
          inset: -20,
          background: "radial-gradient(closest-side, rgba(255,106,26,0.18), transparent 70%)",
          animation: reached ? "pulse-ring 1.6s ease-in-out infinite" : "none",
          pointerEvents: "none",
        }}
      />
      <svg width={size} height={size} style={{ display: "block", transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(26,18,8,0.06)" strokeWidth={stroke} fill="none" />
        {segs.map((s) => (
          <circle
            key={s.key}
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={s.color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${s.portion * circ} ${circ}`}
            strokeDashoffset={-s.offset * circ}
            style={{ transition: "stroke-dasharray 700ms var(--bounce), stroke-dashoffset 700ms var(--bounce)" }}
          />
        ))}
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
        }}
      >
        <div style={{ fontSize: 11, color: "var(--orange)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>
          {modeLabel || "Total"}
        </div>
        <div style={{ fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 500, marginTop: -2 }}>
          {monthLabel(monthDate)}
        </div>
        <div style={{ fontSize: 60, fontWeight: 600, letterSpacing: "-0.04em", lineHeight: 1, fontFamily: "Geist", display: "flex", alignItems: "baseline" }}>
          <AnimatedNumber value={tweenedTotal} />
          <span style={{ fontSize: 28, marginLeft: 4, color: "var(--orange)" }}>€</span>
        </div>
        <div className="mono" style={{ fontSize: 14, color: "var(--ink-2)", marginTop: 4 }}>
          {Math.round(tweenedPct * 100)}% <span style={{ color: "var(--ink-3)" }}>· {fmtEur(goal)}</span>
        </div>
        {reached && (
          <div
            style={{
              marginTop: 8,
              padding: "4px 10px",
              background: "var(--green)",
              color: "white",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              animation: "pop-in 500ms var(--bounce)",
            }}
          >
            Objectif atteint
          </div>
        )}
      </div>
    </div>
  );
}

/* ====================================================================== */
/*  STREAM CARD                                                           */
/* ====================================================================== */
interface StreamLine {
  label: string;
  hint?: string;
  value: number;
  plusLabel?: string;
  onPlus?: () => void;
  onMinus?: () => void;
}

function StreamCard({
  title,
  sub,
  color,
  dot,
  total,
  lines,
  footer,
}: {
  title: string;
  sub: string;
  color: string;
  dot?: string;
  total: number;
  lines: StreamLine[];
  footer?: ReactNode;
}) {
  const [burst, setBurst] = useState<{ id: number; text: string } | null>(null);
  const trigger = (text: string) => {
    const id = Math.random();
    setBurst({ id, text });
    setTimeout(() => setBurst(null), 900);
  };
  return (
    <div
      style={{
        position: "relative",
        background: "var(--card)",
        borderRadius: 24,
        padding: 22,
        boxShadow: "var(--shadow-sm)",
        border: "1px solid var(--line)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        animation: "fade-up 600ms var(--ease-out) backwards",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: dot || color }} />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>{title}</h3>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 4, marginLeft: 16 }}>{sub}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="mono" style={{ fontSize: 22, fontWeight: 600, color, letterSpacing: "-0.02em", lineHeight: 1 }}>
            <AnimatedNumber value={total} format={(n) => fmtEur(n)} />
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>ce mois</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {lines.map((ln, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 12px",
              background: "var(--bg-2)",
              borderRadius: 14,
              position: "relative",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{ln.label}</div>
              {ln.hint && <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{ln.hint}</div>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="mono" style={{ fontSize: 16, fontWeight: 600, minWidth: 36, textAlign: "right" }}>
                <AnimatedNumber value={ln.value} />
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  onClick={() => ln.onMinus?.()}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "white",
                    border: "1px solid var(--line)",
                    display: "grid",
                    placeItems: "center",
                    transition: "transform 200ms var(--bounce), background 160ms",
                  }}
                  onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.85)")}
                  onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  <Icon name="minus" size={14} />
                </button>
                <button
                  onClick={() => {
                    ln.onPlus?.();
                    trigger(ln.plusLabel || "+1");
                  }}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: color,
                    color: "white",
                    border: "1px solid transparent",
                    display: "grid",
                    placeItems: "center",
                    transition: "transform 220ms var(--bounce-strong)",
                  }}
                  onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.85)")}
                  onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1.12)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  <Icon name="plus" size={14} color="white" />
                </button>
              </div>
            </div>
            {burst && i === lines.length - 1 && <FloatLabel key={burst.id} text={burst.text} color={color} />}
          </div>
        ))}
      </div>

      {footer}
    </div>
  );
}

/* ====================================================================== */
/*  TIMER CARD — live hourly rate                                         */
/* ====================================================================== */
type TimerType = "short" | "long" | "custom";

interface TimerState {
  running: boolean;
  startedAt: number | null;
  accumulated: number; // ms
  type: TimerType;
  customLabel: string;
  customAmount: number;
}

const DEFAULT_TIMER: TimerState = {
  running: false,
  startedAt: null,
  accumulated: 0,
  type: "short",
  customLabel: "",
  customAmount: 0,
};

function fmtHMS(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function TimerCard({
  prices,
  fiscal,
  onCountShort,
  onCountLong,
  onAddService,
}: {
  prices: Prices;
  fiscal: Fiscal;
  onCountShort: () => void;
  onCountLong: () => void;
  onAddService: (label: string, amount: number) => void;
}) {
  const [timer, setTimer] = useLS<TimerState>("disc.timer", DEFAULT_TIMER);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!timer.running) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [timer.running]);

  const elapsed = timer.running && timer.startedAt ? timer.accumulated + (now - timer.startedAt) : timer.accumulated;
  const amount = timer.type === "short" ? prices.shortVid : timer.type === "long" ? prices.longVid : timer.customAmount;
  const hours = elapsed / 3_600_000;
  const netRatio = 1 - (fiscal.urssaf + fiscal.impot) / 100;
  const brutPerHour = hours > 0 ? amount / hours : 0;
  const netPerHour = brutPerHour * netRatio;
  const hasRate = hours > 0 && amount > 0;
  const paused = !timer.running && timer.accumulated > 0;
  const canSave = elapsed > 0 && amount > 0;

  const start = () => setTimer({ ...timer, running: true, startedAt: Date.now() });
  const pause = () => setTimer({ ...timer, running: false, startedAt: null, accumulated: elapsed });
  const reset = () => setTimer({ ...DEFAULT_TIMER, type: timer.type, customLabel: timer.customLabel, customAmount: timer.customAmount });
  const save = () => {
    if (!canSave) return;
    if (timer.type === "short") onCountShort();
    else if (timer.type === "long") onCountLong();
    else onAddService(timer.customLabel || "Prestation", timer.customAmount);
    reset();
  };
  const switchType = (t: TimerType) => {
    // Switching type mid-session resets the clock to avoid mis-attribution.
    setTimer({ ...DEFAULT_TIMER, type: t, customLabel: timer.customLabel, customAmount: timer.customAmount });
  };

  const types: { id: TimerType; label: string; hint: string }[] = [
    { id: "short", label: "Vidéo courte", hint: fmtEur(prices.shortVid) },
    { id: "long", label: "Vidéo longue", hint: fmtEur(prices.longVid) },
    { id: "custom", label: "Prestation libre", hint: timer.customAmount > 0 ? fmtEur(timer.customAmount) : "—" },
  ];

  return (
    <div
      style={{
        position: "relative",
        background: "var(--card)",
        borderRadius: 24,
        padding: 22,
        boxShadow: "var(--shadow-sm)",
        border: "1px solid var(--line)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        animation: "fade-up 600ms var(--ease-out) backwards",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: timer.running ? "var(--orange)" : "var(--ink-3)", boxShadow: timer.running ? "0 0 0 4px rgba(255,106,26,0.18)" : "none", transition: "box-shadow 220ms, background 220ms" }} />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>
              Chronomètre · taux horaire en direct
            </h3>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 4, marginLeft: 16 }}>
            Choisis la tâche, démarre, vois ton €/h en temps réel.
          </div>
        </div>
        {timer.running && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--orange)",
              fontFamily: "Geist Mono, monospace",
              animation: "nudge 1.5s ease-in-out infinite",
            }}
          >
            ● en cours
          </span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {types.map((t) => {
          const active = timer.type === t.id;
          return (
            <button
              key={t.id}
              onClick={() => switchType(t.id)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 2,
                padding: "10px 14px",
                background: active ? "var(--orange-50)" : "var(--bg-2)",
                border: active ? "1.5px solid var(--orange)" : "1.5px solid transparent",
                borderRadius: 14,
                textAlign: "left",
                transition: "all 220ms var(--ease-out)",
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: active ? "var(--orange)" : "var(--ink)" }}>{t.label}</span>
              <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{t.hint}</span>
            </button>
          );
        })}
      </div>

      {timer.type === "custom" && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            value={timer.customLabel}
            onChange={(e) => setTimer({ ...timer, customLabel: e.target.value })}
            placeholder="Libellé de la presta (optionnel)"
            style={{
              flex: "1 1 160px",
              minWidth: 0,
              background: "var(--bg-2)",
              border: "1px solid transparent",
              borderRadius: 12,
              padding: "10px 14px",
              fontSize: 13.5,
              color: "var(--ink)",
              outline: "none",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", background: "var(--bg-2)", borderRadius: 12, padding: "10px 14px", width: 130 }}>
            <input
              type="number"
              min={0}
              value={timer.customAmount || ""}
              onChange={(e) => setTimer({ ...timer, customAmount: Math.max(0, Number(e.target.value) || 0) })}
              placeholder="Montant"
              style={{ flex: 1, width: "100%", background: "transparent", border: "none", outline: "none", fontSize: 15, fontFamily: "Geist Mono, monospace", fontWeight: 600, color: "var(--ink)" }}
            />
            <span style={{ fontSize: 13, color: "var(--ink-2)" }}>€</span>
          </div>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(180px, 1fr) 1fr 1fr",
          gap: 12,
          alignItems: "stretch",
        }}
        className="timer-grid"
      >
        <div
          style={{
            background: "var(--ink)",
            color: "white",
            borderRadius: 16,
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 4,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -30,
              right: -30,
              width: 120,
              height: 120,
              borderRadius: "50%",
              background: "radial-gradient(closest-side, rgba(255,106,26,0.45), transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <div style={{ fontSize: 10.5, color: "var(--orange-soft)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, position: "relative" }}>
            Temps écoulé
          </div>
          <div className="mono" style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.1, position: "relative" }}>
            {fmtHMS(elapsed)}
          </div>
        </div>

        <RateTile label="Taux horaire brut" value={hasRate ? brutPerHour : null} accent />
        <RateTile label="Taux horaire net" value={hasRate ? netPerHour : null} />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {!timer.running && (
          <Btn kind="primary" size="md" icon="play" onClick={start}>
            {paused ? "Reprendre" : "Démarrer"}
          </Btn>
        )}
        {timer.running && (
          <Btn kind="dark" size="md" onClick={pause}>
            Pause
          </Btn>
        )}
        {canSave && (
          <Btn kind="soft" size="md" icon="check" onClick={save}>
            Valider {timer.type === "short" ? "+1 courte" : timer.type === "long" ? "+1 longue" : "la presta"}
          </Btn>
        )}
        {(timer.accumulated > 0 || timer.running) && (
          <Btn kind="ghost" size="md" onClick={reset}>
            Annuler
          </Btn>
        )}
      </div>
    </div>
  );
}

function RateTile({ label, value, accent }: { label: string; value: number | null; accent?: boolean }) {
  return (
    <div
      style={{
        background: "var(--bg-2)",
        borderRadius: 16,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 4,
      }}
    >
      <div style={{ fontSize: 10.5, color: "var(--ink-3)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>{label}</div>
      <div className="mono" style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", color: accent ? "var(--orange)" : "var(--ink)", lineHeight: 1.05 }}>
        {value == null ? "—" : `${Math.round(value).toLocaleString("fr-FR")} €/h`}
      </div>
    </div>
  );
}

/* ====================================================================== */
/*  SERVICES CARD — custom one-off prestation payments                    */
/* ====================================================================== */
function ServicesCard({
  services,
  total,
  onAdd,
  onRemove,
}: {
  services: ServiceEntry[];
  total: number;
  onAdd: (label: string, amount: number) => void;
  onRemove: (id: string) => void;
}) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");

  const submit = () => {
    const a = Math.max(0, Number(amount) || 0);
    if (a <= 0) return;
    onAdd(label, a);
    setLabel("");
    setAmount("");
  };

  return (
    <div
      style={{
        position: "relative",
        background: "var(--card)",
        borderRadius: 24,
        padding: 22,
        boxShadow: "var(--shadow-sm)",
        border: "1px solid var(--line)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        animation: "fade-up 600ms var(--ease-out) backwards",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: "#FF9A3C" }} />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>Prestations de services</h3>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 4, marginLeft: 16 }}>
            Tes paies ponctuelles · montants libres
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="mono" style={{ fontSize: 22, fontWeight: 600, color: "#FF9A3C", letterSpacing: "-0.02em", lineHeight: 1 }}>
            <AnimatedNumber value={total} format={(n) => fmtEur(n)} />
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            {services.length} presta{services.length > 1 ? "s" : ""} · ce mois
          </div>
        </div>
      </div>

      {services.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {services.map((s) => (
            <div
              key={s.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "10px 12px",
                background: "var(--bg-2)",
                borderRadius: 14,
              }}
            >
              <div style={{ fontSize: 13.5, fontWeight: 500, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <span className="mono" style={{ fontSize: 15, fontWeight: 600 }}>{fmtEur(s.amount)}</span>
                <button
                  onClick={() => onRemove(s.id)}
                  title="Supprimer"
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: "white",
                    border: "1px solid var(--line)",
                    display: "grid",
                    placeItems: "center",
                    color: "var(--ink-3)",
                    transition: "transform 200ms var(--bounce), color 160ms",
                  }}
                  onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.85)")}
                  onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  <Icon name="x" size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Ex : logo IA pour client X"
          style={{
            flex: "1 1 160px",
            minWidth: 0,
            background: "var(--bg-2)",
            border: "1px solid transparent",
            borderRadius: 12,
            padding: "10px 14px",
            fontSize: 13.5,
            color: "var(--ink)",
            outline: "none",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", background: "var(--bg-2)", borderRadius: 12, padding: "10px 14px", width: 120 }}>
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="0"
            style={{ flex: 1, width: "100%", background: "transparent", border: "none", outline: "none", fontSize: 15, fontFamily: "Geist Mono, monospace", fontWeight: 600, color: "var(--ink)" }}
          />
          <span style={{ fontSize: 13, color: "var(--ink-2)" }}>€</span>
        </div>
        <Btn kind="primary" size="sm" icon="plus" onClick={submit}>
          Ajouter
        </Btn>
      </div>
    </div>
  );
}

/* ====================================================================== */
/*  HABIT TIMELINE ROW                                                    */
/* ====================================================================== */
function HabitTile({
  habit,
  done,
  onToggle,
  isCurrent,
  isPast,
}: {
  habit: Habit;
  done: boolean;
  onToggle: () => void;
  isCurrent: boolean;
  isPast: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        position: "relative",
        display: "grid",
        gridTemplateColumns: "62px 32px 1fr auto",
        alignItems: "center",
        gap: 14,
        padding: "14px 16px",
        background: done ? "var(--ink)" : isCurrent ? "var(--orange-50)" : "var(--card)",
        borderRadius: 16,
        border: "1.5px solid",
        borderColor: done ? "var(--ink)" : isCurrent ? "var(--orange)" : "var(--line)",
        textAlign: "left",
        transition: "background 220ms var(--ease-out), border-color 220ms, transform 220ms var(--bounce)",
        width: "100%",
        color: done ? "white" : "var(--ink)",
        overflow: "hidden",
        boxShadow: isCurrent && !done ? "0 0 0 4px rgba(255,106,26,0.12)" : "none",
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.985)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.005)")}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 1,
          fontFamily: "Geist Mono, monospace",
          opacity: done ? 0.6 : isPast && !done ? 0.5 : 1,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em", color: done ? "var(--orange-soft)" : isCurrent ? "var(--orange)" : "var(--ink)" }}>
          {habit.time}
        </span>
        <span style={{ fontSize: 10.5, color: done ? "rgba(255,255,255,0.5)" : "var(--ink-3)", letterSpacing: "0.04em" }}>{habit.duration}min</span>
      </div>

      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: done ? "var(--orange)" : "transparent",
          border: "1.8px solid",
          borderColor: done ? "var(--orange)" : isCurrent ? "var(--orange)" : "var(--line)",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          transition: "background 220ms var(--bounce-strong), border-color 220ms",
        }}
      >
        {done && (
          <span style={{ animation: "pop-in 360ms var(--bounce-strong)", display: "grid", placeItems: "center" }}>
            <Icon name="check" size={16} color="white" stroke={2.4} />
          </span>
        )}
      </div>

      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 14.5,
            fontWeight: 500,
            textDecoration: done ? "line-through" : "none",
            textDecorationColor: "rgba(255,255,255,0.4)",
            opacity: done ? 0.7 : isPast && !done ? 0.55 : 1,
            transition: "opacity 220ms",
          }}
        >
          {habit.label}
        </div>
        {isCurrent && !done && (
          <div
            style={{
              fontSize: 11,
              color: "var(--orange)",
              fontWeight: 600,
              marginTop: 2,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              animation: "nudge 1.5s ease-in-out infinite",
            }}
          >
            ● en cours
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          className="mono"
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: done ? "var(--orange-soft)" : "var(--orange)",
            background: done ? "rgba(255,255,255,0.08)" : "var(--orange-50)",
            padding: "2px 7px",
            borderRadius: 999,
            whiteSpace: "nowrap",
          }}
        >
          +{habit.xp} XP
        </span>
        <Icon name={habit.icon} size={18} color={done ? "var(--orange-soft)" : isCurrent ? "var(--orange)" : "var(--ink-3)"} />
      </div>
    </button>
  );
}

/* ====================================================================== */
/*  STREAK + HEATMAP                                                      */
/* ====================================================================== */
function StreakStrip({ history, habits }: { history: Record<string, string[]>; habits: Habit[] }) {
  const days = useMemo(() => {
    const arr: { k: string; t: Date; ratio: number }[] = [];
    const d = new Date();
    for (let i = 27; i >= 0; i--) {
      const t = new Date(d);
      t.setDate(d.getDate() - i);
      const k = todayKey(t);
      const checks = history[k] || [];
      const ratio = habits.length ? checks.length / habits.length : 0;
      arr.push({ k, t, ratio });
    }
    return arr;
  }, [history, habits.length]);

  const streak = useMemo(() => {
    let s = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
      const t = new Date(d);
      t.setDate(d.getDate() - i);
      const k = todayKey(t);
      const checks = history[k] || [];
      if (checks.length >= Math.ceil(habits.length / 2)) s++;
      else break;
    }
    return s;
  }, [history, habits.length]);

  return (
    <div
      style={{
        background: "var(--card)",
        borderRadius: 24,
        padding: 22,
        border: "1px solid var(--line)",
        boxShadow: "var(--shadow-sm)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 13, color: "var(--ink-2)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 500 }}>Série en cours</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 42, fontWeight: 600, letterSpacing: "-0.03em", color: "var(--orange)" }}>{streak}</span>
            <span style={{ fontSize: 16, color: "var(--ink-2)" }}>jour{streak > 1 ? "s" : ""}</span>
            <Icon name="flame" color="var(--orange)" size={22} />
          </div>
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-3)", textAlign: "right", maxWidth: 160 }}>28 derniers jours</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(28, 1fr)", gap: 4 }}>
        {days.map((d, i) => {
          const alpha = d.ratio === 0 ? 0.08 : 0.25 + d.ratio * 0.75;
          return (
            <div
              key={d.k}
              title={`${d.t.toLocaleDateString("fr-FR")} · ${Math.round(d.ratio * 100)}%`}
              style={{
                aspectRatio: "1 / 1",
                background: d.ratio === 0 ? "rgba(26,18,8,0.06)" : `rgba(255,106,26,${alpha})`,
                borderRadius: 4,
                animation: `pop-in 400ms ${i * 12}ms var(--bounce) backwards`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ====================================================================== */
/*  HABITS SECTION (schedule view)                                        */
/* ====================================================================== */
function HabitsSection({
  habits,
  todayChecks,
  setTodayChecks,
  onEdit,
}: {
  habits: Habit[];
  todayChecks: string[];
  setTodayChecks: (next: string[] | ((p: string[]) => string[])) => void;
  onEdit?: () => void;
}) {
  const toggle = (id: string) => {
    setTodayChecks((prev) => {
      const has = prev.includes(id);
      return has ? prev.filter((x) => x !== id) : [...prev, id];
    });
  };
  const done = todayChecks.length;
  const total = habits.length;
  const pct = total ? done / total : 0;
  const tweenPct = useSpring(pct, { stiffness: 110, damping: 20 });
  const all = done === total && total > 0;
  const earnedXp = habits.filter((h) => todayChecks.includes(h.id)).reduce((sum, h) => sum + h.xp, 0);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  const nowMins = now.getHours() * 60 + now.getMinutes();

  const items = useMemo(() => {
    const toMin = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };
    const sorted = [...habits].sort((a, b) => toMin(a.time) - toMin(b.time));
    return sorted.map((h) => {
      const start = toMin(h.time);
      const end = start + (h.duration || 30);
      const isCurrent = nowMins >= start && nowMins < end;
      const isPast = nowMins >= end;
      return { habit: h, start, end, isCurrent, isPast };
    });
  }, [habits, nowMins]);

  const nextIdx = items.findIndex((i) => !i.isPast && !i.isCurrent);
  const currentIdx = items.findIndex((i) => i.isCurrent);
  const highlightIdx = currentIdx >= 0 ? currentIdx : nextIdx;

  return (
    <div
      style={{
        background: "var(--card)",
        borderRadius: 24,
        padding: 22,
        border: "1px solid var(--line)",
        boxShadow: "var(--shadow-sm)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>Emploi du temps</h2>
          <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 4, textTransform: "capitalize" }}>
            {dayLabel()} · {now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {onEdit && (
            <button
              onClick={onEdit}
              title="Modifier l'emploi du temps"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                background: "var(--bg-2)",
                color: "var(--ink-2)",
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: 500,
                border: "1px solid var(--line)",
                transition: "transform 200ms var(--bounce), color 160ms",
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.94)")}
              onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              <Icon name="calendar" size={14} />
              Éditer
            </button>
          )}
          <span
            className="mono"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "6px 11px",
              background: "var(--orange-50)",
              color: "var(--orange)",
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 700,
            }}
          >
            <Icon name="flame" size={13} color="var(--orange)" />+{earnedXp} XP
          </span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "6px 12px 6px 8px",
              background: all ? "var(--green)" : "var(--orange-50)",
              color: all ? "white" : "var(--orange)",
              borderRadius: 999,
              fontFamily: "Geist Mono, monospace",
              fontSize: 13,
              fontWeight: 600,
              transition: "background 280ms var(--ease-out), color 280ms",
            }}
          >
            <div style={{ position: "relative", width: 22, height: 22 }}>
              <svg width="22" height="22" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="11" cy="11" r="9" stroke="rgba(255,106,26,0.18)" strokeWidth="3" fill="none" />
                <circle
                  cx="11"
                  cy="11"
                  r="9"
                  stroke={all ? "white" : "var(--orange)"}
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${tweenPct * (2 * Math.PI * 9)} ${2 * Math.PI * 9}`}
                  style={{ transition: "stroke-dasharray 500ms var(--bounce)" }}
                />
              </svg>
            </div>
            {done}/{total}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, position: "relative" }}>
        {items.map((it, i) => (
          <div key={it.habit.id} style={{ animation: `fade-up 400ms ${i * 40}ms var(--ease-out) backwards` }}>
            <HabitTile
              habit={it.habit}
              done={todayChecks.includes(it.habit.id)}
              onToggle={() => toggle(it.habit.id)}
              isCurrent={i === highlightIdx && !todayChecks.includes(it.habit.id)}
              isPast={it.isPast}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ====================================================================== */
/*  SETTINGS DRAWER                                                       */
/* ====================================================================== */
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  suffix,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  step?: number;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", background: "var(--bg-2)", borderRadius: 12, padding: "10px 14px" }}>
        <input
          type="number"
          value={value}
          min={0}
          step={step}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 15, fontFamily: "Geist Mono, monospace", fontWeight: 600, color: "var(--ink)", width: "100%" }}
        />
        {suffix && <span style={{ fontSize: 13, color: "var(--ink-2)" }}>{suffix}</span>}
      </div>
    </label>
  );
}

function Settings({
  open,
  onClose,
  prices,
  setPrices,
  members,
  setMembers,
  fiscal,
  setFiscal,
  goalMode,
  setGoalMode,
}: {
  open: boolean;
  onClose: () => void;
  prices: Prices;
  setPrices: (v: Prices | ((p: Prices) => Prices)) => void;
  members: number;
  setMembers: (v: number | ((p: number) => number)) => void;
  fiscal: Fiscal;
  setFiscal: (v: Fiscal | ((p: Fiscal) => Fiscal)) => void;
  goalMode: "net" | "brut";
  setGoalMode: (v: "net" | "brut") => void;
}) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(26,18,8,0.32)",
        display: "grid",
        placeItems: "center",
        animation: "fade-up 240ms var(--ease-out)",
        overflow: "auto",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--card)",
          width: "min(480px, 92vw)",
          borderRadius: 24,
          padding: 28,
          boxShadow: "var(--shadow-lg)",
          animation: "pop-in 360ms var(--bounce)",
          maxHeight: "92vh",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, position: "sticky", top: -28, background: "var(--card)", paddingTop: 4, paddingBottom: 12, zIndex: 2 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>Mes paramètres</h3>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--bg-2)", display: "grid", placeItems: "center" }}>
            <Icon name="x" size={16} />
          </button>
        </div>

        <SectionLabel>Objectif</SectionLabel>
        <div style={{ display: "flex", gap: 6, background: "var(--bg-2)", padding: 4, borderRadius: 12, marginBottom: 14 }}>
          {[
            { id: "net" as const, label: "Net en poche" },
            { id: "brut" as const, label: "CA brut" },
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => setGoalMode(opt.id)}
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: 9,
                background: goalMode === opt.id ? "white" : "transparent",
                boxShadow: goalMode === opt.id ? "var(--shadow-sm)" : "none",
                color: goalMode === opt.id ? "var(--ink)" : "var(--ink-2)",
                fontWeight: 500,
                fontSize: 13,
                transition: "all 220ms var(--ease-out)",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 18, lineHeight: 1.5 }}>
          {goalMode === "net"
            ? "L'anneau suit le net après URSSAF, impôt libératoire et coût Skool."
            : "L'anneau suit le chiffre d'affaires brut, avant déductions."}
        </div>

        <SectionLabel>Skool — abonnement membre</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
          <Field label="Prix par membre / mois" value={prices.skoolUsd} onChange={(v) => setPrices((p) => ({ ...p, skoolUsd: v }))} suffix="$" />
          <Field label="Membres actifs" value={members} onChange={(v) => setMembers(v)} />
          <Field label="Coût plateforme Skool (mensuel)" value={prices.skoolCostUsd} onChange={(v) => setPrices((p) => ({ ...p, skoolCostUsd: v }))} suffix="$" />
          <Field label="Taux de change USD → EUR" value={prices.fx} onChange={(v) => setPrices((p) => ({ ...p, fx: v }))} step={0.01} suffix="€/$" />
        </div>

        <SectionLabel>Vidéos marques</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
          <Field label="Prix vidéo courte" value={prices.shortVid} onChange={(v) => setPrices((p) => ({ ...p, shortVid: v }))} suffix="€" />
          <Field label="Prix vidéo longue" value={prices.longVid} onChange={(v) => setPrices((p) => ({ ...p, longVid: v }))} suffix="€" />
        </div>

        <SectionLabel>URSSAF · Versement libératoire BNC</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Cotisations sociales (URSSAF)" value={fiscal.urssaf} onChange={(v) => setFiscal((f) => ({ ...f, urssaf: v }))} step={0.1} suffix="%" />
          <Field label="Impôt libératoire" value={fiscal.impot} onChange={(v) => setFiscal((f) => ({ ...f, impot: v }))} step={0.1} suffix="%" />
        </div>
        <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 10, lineHeight: 1.5 }}>Calculés sur le chiffre d&apos;affaires brut (avant coût plateforme).</div>
      </div>
    </div>
  );
}

/* ====================================================================== */
/*  CHARGES BREAKDOWN STRIP                                               */
/* ====================================================================== */
function ChargeCell({ label, value, color, small }: { label: string; value: number; color: string; small?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: "var(--ink-3)", letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 500, marginBottom: 2 }}>{label}</div>
      <div className="mono" style={{ fontSize: small ? 15 : 19, fontWeight: 600, color, letterSpacing: "-0.01em" }}>
        <AnimatedNumber value={value} format={fmtEur} />
      </div>
    </div>
  );
}

function ChargeSep({ children }: { children: ReactNode }) {
  return <span style={{ color: "var(--ink-3)", fontSize: 18, fontWeight: 400, userSelect: "none" }}>{children}</span>;
}

function ChargesStrip({
  caBrut,
  urssafEur,
  impotEur,
  urssafPct,
  impotPct,
  platformEur,
  platformUsd,
  netEur,
}: {
  caBrut: number;
  urssafEur: number;
  impotEur: number;
  urssafPct: number;
  impotPct: number;
  platformEur: number;
  platformUsd: number;
  netEur: number;
}) {
  return (
    <div
      className="charges"
      style={{
        background: "var(--card)",
        border: "1px solid var(--line)",
        borderRadius: 18,
        padding: "14px 18px",
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr auto 1fr auto 1fr auto 1fr",
        alignItems: "center",
        gap: 12,
        boxShadow: "var(--shadow-sm)",
        animation: "fade-up 600ms var(--ease-out) 200ms backwards",
      }}
    >
      <ChargeCell label="CA brut" value={caBrut} color="var(--ink)" />
      <ChargeSep>−</ChargeSep>
      <ChargeCell label={`URSSAF · ${urssafPct}%`} value={urssafEur} color="var(--ink-2)" small />
      <ChargeSep>−</ChargeSep>
      <ChargeCell label={`Impôt · ${impotPct}%`} value={impotEur} color="var(--ink-2)" small />
      <ChargeSep>−</ChargeSep>
      <ChargeCell label={`Skool · ${fmtUsd(platformUsd)}`} value={platformEur} color="var(--ink-2)" small />
      <ChargeSep>=</ChargeSep>
      <ChargeCell label="Net en poche" value={Math.max(0, netEur)} color="var(--orange)" />
    </div>
  );
}

/* ====================================================================== */
/*  PACE WIDGET — dynamic micro-objectives                                */
/* ====================================================================== */
function PaceTile({ label, big, hint, accent, color }: { label: string; big: string; hint: string; accent?: boolean; color?: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "12px 14px" }}>
      <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <div className="mono" style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", color: color || (accent ? "var(--orange)" : "white"), lineHeight: 1 }}>{big}</div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>{hint}</div>
    </div>
  );
}

function PaceWidget({ displayTotal, goal, modeLabel }: { displayTotal: number; goal: number; modeLabel: string }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysLeft = Math.max(1, daysInMonth - today + 1);
  const elapsed = today;
  const remaining = Math.max(0, goal - displayTotal);
  const dailyTarget = remaining / daysLeft;
  const expectedNow = (goal / daysInMonth) * elapsed;
  const onPace = displayTotal >= expectedNow;
  const paceDelta = displayTotal - expectedNow;
  const weeklyTarget = Math.max(0, dailyTarget * 7);

  return (
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
        animation: "fade-up 600ms var(--ease-out) backwards",
      }}
    >
      <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(255,106,26,0.5), transparent 70%)", pointerEvents: "none" }} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--orange-soft)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>Pace · {modeLabel.toLowerCase()}</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>
            {daysLeft} jour{daysLeft > 1 ? "s" : ""} restant{daysLeft > 1 ? "s" : ""} ce mois
          </div>
        </div>
        <div
          style={{
            padding: "6px 12px",
            background: onPace ? "var(--green)" : "rgba(255,106,26,0.18)",
            color: onPace ? "white" : "var(--orange-soft)",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontFamily: "Geist Mono, monospace",
          }}
        >
          {onPace ? "✓ Dans les temps" : "⚠ En retard"}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, position: "relative" }}>
        <PaceTile label="Reste à faire" big={fmtEur(remaining)} hint={remaining > 0 ? `pour atteindre ${fmtEur(goal)}` : "Objectif atteint 🔥"} accent />
        <PaceTile label="Par jour" big={fmtEur(Math.max(0, dailyTarget))} hint={`× ${daysLeft} jour${daysLeft > 1 ? "s" : ""}`} />
        <PaceTile label="Cette semaine" big={fmtEur(weeklyTarget)} hint="rythme nécessaire" />
        <PaceTile
          label={paceDelta >= 0 ? "Avance" : "Retard"}
          big={(paceDelta >= 0 ? "+" : "") + fmtEur(Math.abs(paceDelta))}
          hint={paceDelta >= 0 ? "sur le rythme" : "à rattraper"}
          color={paceDelta >= 0 ? "var(--green)" : "var(--orange-soft)"}
        />
      </div>
    </div>
  );
}

/* ====================================================================== */
/*  AI COACH                                                              */
/* ====================================================================== */
interface CoachContext {
  displayTotal: number;
  goal: number;
  remaining: number;
  daysLeft: number;
  doneCount: number;
  totalCount: number;
  onPace: boolean;
  modeLabel: string;
}

const QUICK_ACTIONS: { focus: string; label: string }[] = [
  { focus: "hook", label: "💡 5 idées de hook" },
  { focus: "script", label: "✍️ Script court" },
  { focus: "pitch", label: "📩 Pitch marque" },
];

function AICoach({ context }: { context: CoachContext }) {
  const [message, setMessage] = useLS<{ date: string; text: string } | null>("disc.aimsg", null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tk = todayKey();
  const stale = !message || message.date !== tk;

  const generate = useCallback(
    async (focus?: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/coach", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ context, focus }),
        });
        if (!res.ok) throw new Error("bad status");
        const data = await res.json();
        if (!data?.text) throw new Error("empty");
        setMessage({ date: tk, text: data.text.trim() });
      } catch {
        setError("Impossible de générer le message. Réessaie.");
      } finally {
        setLoading(false);
      }
    },
    [context, tk, setMessage],
  );

  useEffect(() => {
    // Fetch the daily coach message once per day on mount / day change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stale && !loading) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stale]);

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #FFF1E2 0%, #FFE0C7 100%)",
        border: "1px solid var(--orange-100)",
        borderRadius: 24,
        padding: 22,
        boxShadow: "var(--shadow-sm)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        position: "relative",
        overflow: "hidden",
        animation: "fade-up 600ms var(--ease-out) 120ms backwards",
      }}
    >
      <div style={{ position: "absolute", top: -30, right: -30, width: 140, height: 140, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(255,106,26,0.25), transparent 70%)", pointerEvents: "none" }} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "var(--orange)",
              color: "white",
              display: "grid",
              placeItems: "center",
              boxShadow: "0 6px 16px rgba(255,106,26,0.3)",
              animation: loading ? "pulse-ring 1.4s ease-in-out infinite" : "none",
            }}
          >
            <Icon name="spark" size={16} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em" }}>Ton coach du jour</div>
            <div style={{ fontSize: 11, color: "var(--ink-2)" }}>{loading ? "Réflexion en cours…" : "Mise à jour quotidienne"}</div>
          </div>
        </div>
        <button
          onClick={() => generate()}
          disabled={loading}
          title="Régénérer"
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "white",
            border: "1px solid var(--line)",
            display: "grid",
            placeItems: "center",
            transition: "transform 220ms var(--bounce)",
            opacity: loading ? 0.5 : 1,
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.88) rotate(-180deg)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1) rotate(0deg)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1) rotate(0deg)")}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
      </div>

      <div style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--ink)", position: "relative", minHeight: 60 }}>
        {loading && !message && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--ink-2)" }}>
            <Dots />
            <span style={{ fontSize: 13 }}>Je prépare ton brief…</span>
          </div>
        )}
        {error && <div style={{ fontSize: 13, color: "var(--ink-2)" }}>{error}</div>}
        {message?.text && <span style={{ animation: "fade-up 600ms var(--ease-out)" }}>{message.text}</span>}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {QUICK_ACTIONS.map((a) => (
          <button
            key={a.focus}
            onClick={() => generate(a.focus)}
            disabled={loading}
            style={{
              fontSize: 12,
              fontWeight: 500,
              padding: "7px 12px",
              borderRadius: 999,
              background: "white",
              border: "1px solid var(--orange-100)",
              color: "var(--orange)",
              transition: "transform 200ms var(--bounce), background 160ms",
              opacity: loading ? 0.5 : 1,
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.94)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ====================================================================== */
/*  NEED TILE                                                             */
/* ====================================================================== */
function NeedTile({ big, label, sub }: { big: number; label: string; sub: string }) {
  return (
    <div style={{ background: "var(--card)", borderRadius: 16, padding: "14px 16px", border: "1px solid var(--line)", animation: "fade-up 500ms var(--ease-out) backwards" }}>
      <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1, color: "var(--ink)" }}>
        <AnimatedNumber value={big} />
      </div>
      <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 6 }}>{label}</div>
      <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2, fontFamily: "Geist Mono, monospace" }}>{sub}</div>
    </div>
  );
}

/* ====================================================================== */
/*  SCHEDULE EDITOR                                                       */
/* ====================================================================== */
function HabitEditorRow({
  habit,
  onChange,
  onRemove,
}: {
  habit: Habit;
  onChange: (next: Habit) => void;
  onRemove: () => void;
}) {
  const inputBase: React.CSSProperties = {
    background: "var(--bg-2)",
    border: "1px solid transparent",
    borderRadius: 10,
    padding: "9px 11px",
    fontSize: 13.5,
    color: "var(--ink)",
    outline: "none",
  };
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: 14,
        background: "var(--card)",
        border: "1px solid var(--line)",
        borderRadius: 16,
      }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="time"
          value={habit.time}
          onChange={(e) => onChange({ ...habit, time: e.target.value })}
          className="mono"
          style={{ ...inputBase, width: 110, fontWeight: 600 }}
        />
        <input
          value={habit.label}
          onChange={(e) => onChange({ ...habit, label: e.target.value })}
          placeholder="Nom de la tâche"
          style={{ ...inputBase, flex: 1, minWidth: 0 }}
        />
        <button
          onClick={onRemove}
          title="Supprimer"
          style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--bg-2)", border: "1px solid var(--line)", display: "grid", placeItems: "center", color: "var(--ink-3)", flexShrink: 0 }}
        >
          <Icon name="x" size={14} />
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4, background: "var(--bg-2)", borderRadius: 10, padding: 4 }}>
          {ICON_CHOICES.map((ic) => {
            const sel = habit.icon === ic;
            return (
              <button
                key={ic}
                onClick={() => onChange({ ...habit, icon: ic as IconName })}
                title={ic}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  display: "grid",
                  placeItems: "center",
                  background: sel ? "var(--orange)" : "transparent",
                  color: sel ? "white" : "var(--ink-3)",
                  transition: "all 160ms",
                }}
              >
                <Icon name={ic} size={16} color={sel ? "white" : "var(--ink-3)"} />
              </button>
            );
          })}
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-2)", borderRadius: 10, padding: "7px 10px" }}>
          <input
            type="number"
            min={5}
            step={5}
            value={habit.duration}
            onChange={(e) => onChange({ ...habit, duration: Math.max(5, Number(e.target.value) || 0) })}
            className="mono"
            style={{ width: 42, background: "transparent", border: "none", outline: "none", fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}
          />
          <span style={{ fontSize: 12, color: "var(--ink-3)" }}>min</span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-2)", borderRadius: 10, padding: "7px 10px" }}>
          <input
            type="number"
            min={0}
            step={5}
            value={habit.xp}
            onChange={(e) => onChange({ ...habit, xp: Math.max(0, Number(e.target.value) || 0) })}
            className="mono"
            style={{ width: 42, background: "transparent", border: "none", outline: "none", fontSize: 13.5, fontWeight: 600, color: "var(--orange)" }}
          />
          <span style={{ fontSize: 12, color: "var(--ink-3)" }}>XP</span>
        </label>
        <button
          onClick={() => onChange({ ...habit, remind: habit.remind === false })}
          title="Rappel sur l'écran verrouillé"
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 12px",
            borderRadius: 999,
            fontSize: 12.5,
            fontWeight: 500,
            background: habit.remind === false ? "var(--bg-2)" : "var(--orange-50)",
            color: habit.remind === false ? "var(--ink-3)" : "var(--orange)",
            border: "1px solid transparent",
          }}
        >
          {habit.remind === false ? "🔕 Sans rappel" : "🔔 Rappel"}
        </button>
      </div>
    </div>
  );
}

function ScheduleEditor({
  open,
  onClose,
  habits,
  setHabits,
}: {
  open: boolean;
  onClose: () => void;
  habits: Habit[];
  setHabits: (v: Habit[] | ((p: Habit[]) => Habit[])) => void;
}) {
  if (!open) return null;
  const sorted = [...habits].sort((a, b) => a.time.localeCompare(b.time));
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(26,18,8,0.32)",
        display: "grid",
        placeItems: "center",
        animation: "fade-up 240ms var(--ease-out)",
        overflow: "auto",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--card)",
          width: "min(560px, 94vw)",
          borderRadius: 24,
          padding: 28,
          boxShadow: "var(--shadow-lg)",
          animation: "pop-in 360ms var(--bounce)",
          maxHeight: "92vh",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, position: "sticky", top: -28, background: "var(--card)", paddingTop: 4, paddingBottom: 12, zIndex: 2 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>Mon emploi du temps</h3>
            <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 2 }}>{habits.length} tâche{habits.length > 1 ? "s" : ""} · trié par heure</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--bg-2)", display: "grid", placeItems: "center" }}>
            <Icon name="x" size={16} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {sorted.map((h) => (
            <HabitEditorRow
              key={h.id}
              habit={h}
              onChange={(next) => setHabits((prev) => prev.map((x) => (x.id === h.id ? next : x)))}
              onRemove={() => setHabits((prev) => prev.filter((x) => x.id !== h.id))}
            />
          ))}
          {habits.length === 0 && (
            <div style={{ fontSize: 13, color: "var(--ink-3)", textAlign: "center", padding: "24px 0" }}>
              Aucune tâche. Ajoute ta première ci-dessous.
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          <Btn kind="primary" size="md" icon="plus" onClick={() => setHabits((prev) => [...prev, newHabit()])}>
            Ajouter une tâche
          </Btn>
          <Btn
            kind="ghost"
            size="md"
            onClick={() => {
              if (confirm("Revenir à l'emploi du temps par défaut ? Tes tâches personnalisées seront remplacées.")) {
                setHabits(DEFAULT_HABITS.map((h) => ({ ...h })));
              }
            }}
          >
            Réinitialiser
          </Btn>
        </div>
      </div>
    </div>
  );
}

/* ====================================================================== */
/*  APP                                                                   */
/* ====================================================================== */
export default function DisciplineDashboard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div style={{ minHeight: "100vh", background: "var(--bg)" }} />;
  }
  return <DashboardInner />;
}

function DashboardInner() {
  // Date currently being viewed (revenue panels follow it). Defaults to today.
  const [viewMonth, setViewMonth] = useState<Date>(() => new Date());
  const mk = monthKey(viewMonth);
  const realMk = monthKey();
  const isCurrentMonth = mk === realMk;
  const navMonth = (delta: number) => {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };
  const goToCurrent = () => setViewMonth(new Date());

  const [prices, setPrices] = useLS<Prices>("disc.prices.v2", DEFAULT_PRICES);
  const [members, setMembers] = useLS<number>("disc.members", DEFAULT_MEMBERS);
  const [fiscal, setFiscal] = useLS<Fiscal>("disc.fiscal", DEFAULT_FISCAL);
  const [goalMode, setGoalMode] = useLS<"net" | "brut">("disc.goalMode", "net");

  const [counters, setCounters] = useLS<Record<string, MonthCounters>>("disc.counters", {});
  const cur: MonthCounters = { ...emptyCounters(), ...(counters[mk] ?? {}) };
  const setCur = (next: Partial<MonthCounters>) => setCounters((prev) => ({ ...prev, [mk]: { ...cur, ...next } }));

  const addService = (label: string, amount: number) =>
    setCur({ services: [...cur.services, { id: crypto.randomUUID(), label: label.trim() || "Prestation", amount }] });
  const removeService = (id: string) => setCur({ services: cur.services.filter((s) => s.id !== id) });
  const addShort = () => setCur({ shortVids: cur.shortVids + 1 });
  const addLong = () => setCur({ longVids: cur.longVids + 1 });

  const [habits, setHabits] = useLS<Habit[]>("disc.habits.v1", DEFAULT_HABITS);
  const reminders = useReminders(habits);
  const [editorOpen, setEditorOpen] = useState(false);
  const [history, setHistory] = useLS<Record<string, string[]>>("disc.history", {});
  const tk = todayKey();
  const todayChecks = history[tk] || [];
  const setTodayChecks = (next: string[] | ((p: string[]) => string[])) => {
    const value = typeof next === "function" ? (next as (p: string[]) => string[])(todayChecks) : next;
    setHistory((prev) => ({ ...prev, [tk]: value }));
  };

  const fin = computeFinance({ prices, members, fiscal, counters: cur });
  const { skoolGrossUsd, skoolGrossEur, skoolPlatformEur, brandGrossEur, servicesEur, caBrut, urssafEur, impotEur, netEur } = fin;

  const displayTotal = goalMode === "net" ? Math.max(0, netEur) : caBrut;

  const [confetti, setConfetti] = useState(false);
  const prevReachedRef = useRef(displayTotal >= GOAL);
  useEffect(() => {
    const reached = displayTotal >= GOAL;
    if (reached && !prevReachedRef.current) {
      setConfetti(true);
      setTimeout(() => setConfetti(false), 1800);
    }
    prevReachedRef.current = reached;
  }, [displayTotal]);

  const [settingsOpen, setSettingsOpen] = useState(false);

  const netRatio = 1 - (fiscal.urssaf + fiscal.impot) / 100;
  const breakdown: Breakdown[] = [
    { key: "skool", color: "#FF6A1A", value: (skoolGrossEur - (goalMode === "net" ? skoolPlatformEur : 0)) * (goalMode === "net" ? netRatio : 1) },
    { key: "brand", color: "#1A1208", value: brandGrossEur * (goalMode === "net" ? netRatio : 1) },
    { key: "services", color: "#FF9A3C", value: servicesEur * (goalMode === "net" ? netRatio : 1) },
  ];

  const remaining = Math.max(0, GOAL - displayTotal);
  const eurPerShort = goalMode === "net" ? prices.shortVid * netRatio : prices.shortVid;
  const eurPerLong = goalMode === "net" ? prices.longVid * netRatio : prices.longVid;
  const eurPerMember = goalMode === "net" ? prices.skoolUsd * prices.fx * netRatio : prices.skoolUsd * prices.fx;

  const shortsNeeded = eurPerShort > 0 ? Math.ceil(remaining / eurPerShort) : 0;
  const longsNeeded = eurPerLong > 0 ? Math.ceil(remaining / eurPerLong) : 0;
  const membersNeeded = eurPerMember > 0 ? Math.ceil(remaining / eurPerMember) : 0;

  const daysLeft = Math.max(1, new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate() + 1);
  const onPace = displayTotal >= (GOAL / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()) * new Date().getDate();
  const modeLabel = goalMode === "net" ? "Net en poche" : "CA brut";

  return (
    <div style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
      <Confetti active={confetti} />

      <div style={{ paddingTop: 8 }}>
        <InstallPrompt />
      </div>

      <header style={{ maxWidth: 1240, margin: "0 auto", padding: "24px 28px 8px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--ink)", color: "var(--orange)", display: "grid", placeItems: "center", boxShadow: "var(--shadow-md)" }}>
            <Icon name="flame" size={22} />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em" }}>Discipline</div>
            <div style={{ fontSize: 12, color: "var(--ink-2)" }}>Vers 10 000 € {goalMode === "net" ? "net" : "brut"} / mois</div>
          </div>
        </div>

        {/* Month navigator */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-2)", padding: "4px 6px", borderRadius: 999 }}>
          <button
            onClick={() => navMonth(-1)}
            title="Mois précédent"
            style={monthNavBtn()}
          >‹</button>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 130, padding: "2px 6px" }}>
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ink)", textTransform: "capitalize" }}>{monthLabel(viewMonth)}</span>
            {!isCurrentMonth && (
              <button onClick={goToCurrent} style={{ fontSize: 10.5, color: "var(--orange)", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                ← Aujourd&apos;hui
              </button>
            )}
          </div>
          <button
            onClick={() => navMonth(1)}
            title="Mois suivant"
            disabled={isCurrentMonth}
            style={monthNavBtn(isCurrentMonth)}
          >›</button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", gap: 4, background: "var(--bg-2)", padding: 4, borderRadius: 999 }}>
            {[
              { id: "net" as const, label: "Net" },
              { id: "brut" as const, label: "Brut" },
            ].map((o) => (
              <button
                key={o.id}
                onClick={() => setGoalMode(o.id)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 999,
                  fontSize: 12.5,
                  fontWeight: 500,
                  background: goalMode === o.id ? "white" : "transparent",
                  color: goalMode === o.id ? "var(--ink)" : "var(--ink-2)",
                  boxShadow: goalMode === o.id ? "var(--shadow-sm)" : "none",
                  transition: "all 220ms var(--ease-out)",
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
          <Btn kind="ghost" size="sm" icon="target" onClick={() => setSettingsOpen(true)}>
            Paramètres
          </Btn>
        </div>
      </header>

      <section
        className="hero"
        style={{ maxWidth: 1240, margin: "0 auto", padding: "16px 28px 28px", display: "grid", gridTemplateColumns: "minmax(380px, 460px) 1fr", gap: 36, alignItems: "center" }}
      >
        <div style={{ display: "grid", placeItems: "center" }}>
          <RevenueRing total={displayTotal} goal={GOAL} breakdown={breakdown} modeLabel={modeLabel} monthDate={viewMonth} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, paddingLeft: 8 }}>
          <div>
            <div style={{ fontSize: 13, color: "var(--orange)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Objectif du mois</div>
            <h1 style={{ margin: "8px 0 0", fontSize: "clamp(36px, 4.5vw, 56px)", fontWeight: 600, letterSpacing: "-0.035em", lineHeight: 1.05, maxWidth: 520 }}>
              Encore <span className="serif" style={{ color: "var(--orange)" }}>{fmtEur(remaining)}</span> à aller chercher.
            </h1>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            <NeedTile big={shortsNeeded} label="vidéos courtes" sub={`${fmtEur(eurPerShort)} ${goalMode === "net" ? "net" : ""}/u`} />
            <NeedTile big={longsNeeded} label="vidéos longues" sub={`${fmtEur(eurPerLong)} ${goalMode === "net" ? "net" : ""}/u`} />
            <NeedTile big={membersNeeded} label="nouveaux membres" sub={`${fmtEur(eurPerMember)} ${goalMode === "net" ? "net" : ""}/mois`} />
          </div>

          <ChargesStrip
            caBrut={caBrut}
            urssafEur={urssafEur}
            impotEur={impotEur}
            urssafPct={fiscal.urssaf}
            impotPct={fiscal.impot}
            platformEur={skoolPlatformEur}
            platformUsd={prices.skoolCostUsd}
            netEur={netEur}
          />
        </div>
      </section>

      <section className="streams" style={{ maxWidth: 1240, margin: "0 auto", padding: "0 28px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
        <StreamCard
          title="Skool — Communauté IA"
          sub={`${fmtUsd(prices.skoolUsd)} / membre · récurrent`}
          color="#FF6A1A"
          dot="#FF6A1A"
          total={skoolGrossEur}
          lines={[
            {
              label: "Membres actifs",
              hint: `${fmtUsd(prices.skoolUsd)} → ${fmtEur(prices.skoolUsd * prices.fx)} / mois`,
              value: members,
              plusLabel: `+${fmtEur(prices.skoolUsd * prices.fx)}`,
              onPlus: () => setMembers((m) => m + 1),
              onMinus: () => setMembers((m) => Math.max(0, m - 1)),
            },
          ]}
          footer={
            <div style={{ fontSize: 11.5, color: "var(--ink-2)", padding: "10px 12px", background: "var(--orange-50)", borderRadius: 10, lineHeight: 1.5, fontFamily: "Geist Mono, monospace" }}>
              <div>{members} × {fmtUsd(prices.skoolUsd)} = {fmtUsd(skoolGrossUsd)}</div>
              <div style={{ color: "var(--ink-3)" }}>− {fmtUsd(prices.skoolCostUsd)} plateforme · × {prices.fx} €/$</div>
              <div style={{ color: "var(--orange)", fontWeight: 600, marginTop: 4 }}>= {fmtEur(skoolGrossEur - skoolPlatformEur)} après plateforme</div>
            </div>
          }
        />

        <StreamCard
          title="Vidéos marques"
          sub="Pubs IA livrées"
          color="#1A1208"
          dot="#1A1208"
          total={brandGrossEur}
          lines={[
            {
              label: "Vidéos courtes",
              hint: `${fmtEur(prices.shortVid)} / vidéo`,
              value: cur.shortVids,
              plusLabel: `+${fmtEur(prices.shortVid)}`,
              onPlus: () => setCur({ shortVids: cur.shortVids + 1 }),
              onMinus: () => setCur({ shortVids: Math.max(0, cur.shortVids - 1) }),
            },
            {
              label: "Vidéos longues",
              hint: `${fmtEur(prices.longVid)} / vidéo`,
              value: cur.longVids,
              plusLabel: `+${fmtEur(prices.longVid)}`,
              onPlus: () => setCur({ longVids: cur.longVids + 1 }),
              onMinus: () => setCur({ longVids: Math.max(0, cur.longVids - 1) }),
            },
          ]}
        />

        <StreamCard
          title="Contenu TikTok / Insta"
          sub="Carburant de l'algo"
          color="#C44A00"
          dot="#C44A00"
          total={0}
          lines={[
            {
              label: "Posts publiés",
              hint: "ce mois-ci",
              value: cur.posts,
              plusLabel: "+1 post",
              onPlus: () => setCur({ posts: cur.posts + 1 }),
              onMinus: () => setCur({ posts: Math.max(0, cur.posts - 1) }),
            },
          ]}
          footer={
            <div style={{ fontSize: 12, color: "var(--ink-2)", display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="bolt" size={14} color="var(--ink-3)" />
              Pas de revenu direct, mais le moteur de tout le reste.
            </div>
          }
        />
      </section>

      <section style={{ maxWidth: 1240, margin: "0 auto", padding: "18px 28px 0" }}>
        <TimerCard prices={prices} fiscal={fiscal} onCountShort={addShort} onCountLong={addLong} onAddService={addService} />
      </section>

      <section style={{ maxWidth: 1240, margin: "0 auto", padding: "18px 28px 0" }}>
        <ServicesCard services={cur.services} total={servicesEur} onAdd={addService} onRemove={removeService} />
      </section>

      <section className="coach-row" style={{ maxWidth: 1240, margin: "0 auto", padding: "22px 28px 22px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <PaceWidget displayTotal={displayTotal} goal={GOAL} modeLabel={modeLabel} />
        <AICoach
          context={{
            displayTotal,
            goal: GOAL,
            remaining,
            daysLeft,
            doneCount: todayChecks.length,
            totalCount: habits.length,
            onPace,
            modeLabel,
          }}
        />
      </section>

      <section className="habits-row" style={{ maxWidth: 1240, margin: "0 auto", padding: "0 28px 60px", display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 18 }}>
        <HabitsSection habits={habits} todayChecks={todayChecks} setTodayChecks={setTodayChecks} onEdit={() => setEditorOpen(true)} />
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <StreakStrip history={history} habits={habits} />
          <RemindersCard api={reminders} />
        </div>
      </section>

      <footer style={{ maxWidth: 1240, margin: "0 auto", padding: "0 28px 40px", fontSize: 12, color: "var(--ink-3)", display: "flex", alignItems: "center", gap: 6 }}>
        <Icon name="dot" size={10} color="var(--orange)" />
        Tout est enregistré localement sur ton appareil. Reviens chaque jour.
      </footer>

      <ScheduleEditor open={editorOpen} onClose={() => setEditorOpen(false)} habits={habits} setHabits={setHabits} />

      <Settings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        prices={prices}
        setPrices={setPrices}
        members={members}
        setMembers={setMembers}
        fiscal={fiscal}
        setFiscal={setFiscal}
        goalMode={goalMode}
        setGoalMode={setGoalMode}
      />

      <style>{`
        @media (max-width: 900px) {
          .hero { grid-template-columns: 1fr !important; }
          .streams { grid-template-columns: 1fr !important; }
          .habits-row { grid-template-columns: 1fr !important; }
          .coach-row { grid-template-columns: 1fr !important; }
          .charges { grid-template-columns: 1fr 1fr !important; row-gap: 14px !important; }
          .charges > span { display: none !important; }
          .timer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function monthNavBtn(disabled = false): React.CSSProperties {
  return {
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "white",
    border: "1px solid var(--line)",
    color: "var(--ink-2)",
    fontSize: 18,
    fontWeight: 700,
    lineHeight: 1,
    display: "grid",
    placeItems: "center",
    opacity: disabled ? 0.35 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}
