"use client";

import {
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AnimatedNumber,
  Btn,
  Confetti,
  FloatLabel,
  Icon,
  useLS,
  useSpring,
} from "@/components/discipline-ui";
import {
  DEFAULT_FISCAL,
  DEFAULT_MEMBERS,
  DEFAULT_PARTNER_LABELS,
  DEFAULT_PRICES,
  Fiscal,
  FixedExpense,
  GOAL,
  MonthCounters,
  Prices,
  ServiceEntry,
  computeFinance,
  emptyCounters,
  fmtEur,
  fmtUsd,
  monthKey,
  monthLabel,
} from "@/lib/discipline-store";
import { InstallPrompt } from "@/components/pwa";

type Breakdown = { key: string; color: string; value: number };

/* ====================================================================== */
/*  REVENUE RING                                                          */
/* ====================================================================== */
type RevenueView = "both" | "me" | "partner";
const PARTNER_COLOR = "#FF4F9D";

function RevenueRing({
  goal,
  breakdown,
  myTotal,
  partnerTotal,
  view,
  onCycle,
  monthDate,
}: {
  goal: number;
  breakdown: Breakdown[];
  myTotal: number;
  partnerTotal: number;
  view: RevenueView;
  onCycle: (dir: -1 | 1) => void;
  monthDate?: Date;
}) {
  const size = 380;
  const stroke = 22;
  const gap = 8;
  const rOuter = (size - stroke) / 2 - 12;
  const rInner = rOuter - stroke - gap;
  const circOuter = 2 * Math.PI * rOuter;
  const circInner = 2 * Math.PI * rInner;

  const shownTotal = view === "both" ? myTotal + partnerTotal : view === "me" ? myTotal : partnerTotal;
  const tweenedTotal = useSpring(shownTotal, { stiffness: 90, damping: 18 });
  const pct = Math.min(1, shownTotal / goal);
  const tweenedPct = useSpring(pct, { stiffness: 90, damping: 18 });

  const showMine = view !== "partner";
  const showPartner = view !== "me";

  const segs = useMemo(
    () =>
      breakdown.map((b, i) => {
        const portion = Math.min(1, b.value / goal);
        const offset = breakdown.slice(0, i).reduce((sum, prev) => sum + Math.min(1, prev.value / goal), 0);
        return { ...b, offset, portion };
      }),
    [breakdown, goal],
  );
  const partnerPortion = Math.min(1, partnerTotal / goal);

  const reached = shownTotal >= goal;
  const accent = view === "partner" ? PARTNER_COLOR : "var(--orange)";
  const label = view === "both" ? "Total commun" : view === "me" ? "Revenus de Brick" : "Revenus de Suzy";

  // Responsive scaling: keep the internal 380px coordinate system, shrink the
  // whole ring to fit narrow screens so nothing overflows / looks zoomed.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / size));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Swipe left/right to change the view (touch).
  const touchX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) > 40) onCycle(dx < 0 ? 1 : -1);
  };

  return (
    <div
      ref={wrapRef}
      style={{ position: "relative", width: "min(380px, 86vw)", aspectRatio: "1 / 1", touchAction: "pan-y" }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* left / right arrows on the wrapper so they stay full-size on mobile */}
      <button onClick={() => onCycle(-1)} title="Vue précédente" style={ringArrowStyle("left")}>‹</button>
      <button onClick={() => onCycle(1)} title="Vue suivante" style={ringArrowStyle("right")}>›</button>

      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: size,
          height: size,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: "center",
        }}
      >
      <div
        style={{
          position: "absolute",
          inset: -20,
          background: `radial-gradient(closest-side, ${view === "partner" ? "rgba(255,79,157,0.18)" : "rgba(255,106,26,0.18)"}, transparent 70%)`,
          animation: reached ? "pulse-ring 1.6s ease-in-out infinite" : "none",
          pointerEvents: "none",
        }}
      />
      <svg width={size} height={size} style={{ display: "block", transform: "rotate(-90deg)" }}>
        {/* tracks */}
        {showMine && <circle cx={size / 2} cy={size / 2} r={rOuter} stroke="rgba(26,18,8,0.06)" strokeWidth={stroke} fill="none" />}
        {showPartner && <circle cx={size / 2} cy={size / 2} r={rInner} stroke="rgba(255,79,157,0.10)" strokeWidth={stroke} fill="none" />}
        {/* my segments — outer ring */}
        {showMine &&
          segs.map((s) => (
            <circle
              key={s.key}
              cx={size / 2}
              cy={size / 2}
              r={rOuter}
              stroke={s.color}
              strokeWidth={stroke}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${s.portion * circOuter} ${circOuter}`}
              strokeDashoffset={-s.offset * circOuter}
              style={{ transition: "stroke-dasharray 700ms var(--bounce), stroke-dashoffset 700ms var(--bounce)" }}
            />
          ))}
        {/* Suzy — inner ring (pink) */}
        {showPartner && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={rInner}
            stroke={PARTNER_COLOR}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${partnerPortion * circInner} ${circInner}`}
            style={{ transition: "stroke-dasharray 700ms var(--bounce)" }}
          />
        )}
      </svg>

      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
        <div style={{ fontSize: 11, color: accent, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 500, marginTop: -2 }}>
          {monthLabel(monthDate)}
        </div>
        <div style={{ fontSize: 56, fontWeight: 600, letterSpacing: "-0.04em", lineHeight: 1, fontFamily: "Geist", display: "flex", alignItems: "baseline" }}>
          <AnimatedNumber value={tweenedTotal} />
          <span style={{ fontSize: 26, marginLeft: 4, color: accent }}>€</span>
        </div>
        <div className="mono" style={{ fontSize: 14, color: "var(--ink-2)", marginTop: 4 }}>
          {Math.round(tweenedPct * 100)}% <span style={{ color: "var(--ink-3)" }}>· {fmtEur(goal)}</span>
        </div>
        {view === "both" && (
          <div className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 4, display: "flex", gap: 10 }}>
            <span style={{ color: "var(--orange)" }}>● {fmtEur(myTotal)}</span>
            <span style={{ color: PARTNER_COLOR }}>● {fmtEur(partnerTotal)}</span>
          </div>
        )}
        {reached && (
          <div style={{ marginTop: 8, padding: "4px 10px", background: "var(--green)", color: "white", borderRadius: 999, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", animation: "pop-in 500ms var(--bounce)" }}>
            Objectif atteint
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

function ringArrowStyle(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute",
    top: "50%",
    [side]: -6,
    transform: "translateY(-50%)",
    width: 34,
    height: 34,
    borderRadius: "50%",
    background: "var(--card)",
    border: "1px solid var(--line)",
    boxShadow: "var(--shadow-sm)",
    color: "var(--ink-2)",
    fontSize: 20,
    fontWeight: 700,
    lineHeight: 1,
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    zIndex: 3,
  };
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
/*  PARTNER CARD — Suzy's income, 3 accumulator lines                     */
/* ====================================================================== */
function PartnerCard({
  labels,
  setLabels,
  values,
  total,
  onAdd,
}: {
  labels: string[];
  setLabels: (v: string[] | ((p: string[]) => string[])) => void;
  values: number[];
  total: number;
  onAdd: (i: number, amount: number) => void;
}) {
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
            <span style={{ width: 8, height: 8, borderRadius: 4, background: PARTNER_COLOR }} />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>Revenus de Suzy</h3>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 4, marginLeft: 16 }}>Salaire, prestations… montants libres</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="mono" style={{ fontSize: 22, fontWeight: 600, color: PARTNER_COLOR, letterSpacing: "-0.02em", lineHeight: 1 }}>
            <AnimatedNumber value={total} format={(n) => fmtEur(n)} />
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>ce mois</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[0, 1, 2].map((i) => (
          <PartnerLine
            key={i}
            label={labels[i] ?? ""}
            value={values[i] ?? 0}
            onLabel={(v) => setLabels((prev) => { const next = [...prev]; next[i] = v; return next; })}
            onAdd={(amount) => onAdd(i, amount)}
          />
        ))}
      </div>
    </div>
  );
}

function PartnerLine({
  label,
  value,
  onLabel,
  onAdd,
}: {
  label: string;
  value: number;
  onLabel: (v: string) => void;
  onAdd: (amount: number) => void;
}) {
  const [amount, setAmount] = useState("");
  const [burst, setBurst] = useState<{ id: number; text: string } | null>(null);

  const submit = (sign: 1 | -1) => {
    const v = Number(String(amount).replace(",", "."));
    if (!Number.isFinite(v) || v === 0) return;
    onAdd(sign * Math.abs(v));
    if (sign > 0) {
      const id = Math.random();
      setBurst({ id, text: `+${fmtEur(Math.abs(v))}` });
      setTimeout(() => setBurst(null), 900);
    }
    setAmount("");
  };

  return (
    <div style={{ position: "relative", background: "var(--bg-2)", borderRadius: 14, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <input
          value={label}
          onChange={(e) => onLabel(e.target.value)}
          placeholder="Nom (ex : Salaire, Ménage…)"
          title="Clique pour renommer"
          style={{ flex: 1, minWidth: 0, background: "white", border: "1px solid var(--line)", borderRadius: 8, padding: "6px 10px", outline: "none", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}
        />
        <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: PARTNER_COLOR }}>{fmtEur(value)}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", background: "white", borderRadius: 10, padding: "7px 10px", flex: 1 }}>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit(1)}
            placeholder="Montant"
            style={{ flex: 1, width: "100%", background: "transparent", border: "none", outline: "none", fontSize: 14, fontFamily: "Geist Mono, monospace", fontWeight: 600, color: "var(--ink)" }}
          />
          <span style={{ fontSize: 12, color: "var(--ink-2)" }}>€</span>
        </div>
        <button
          onClick={() => submit(-1)}
          title="Retirer ce montant"
          style={{ width: 32, height: 32, borderRadius: "50%", background: "white", border: "1px solid var(--line)", display: "grid", placeItems: "center", flexShrink: 0 }}
        >
          <Icon name="minus" size={14} />
        </button>
        <button
          onClick={() => submit(1)}
          title="Ajouter ce montant"
          style={{ padding: "0 14px", height: 32, borderRadius: 999, background: PARTNER_COLOR, color: "white", fontSize: 13, fontWeight: 600, flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 4 }}
        >
          <Icon name="plus" size={14} color="white" /> Ajouter
        </button>
      </div>
      {burst && <FloatLabel key={burst.id} text={burst.text} color={PARTNER_COLOR} />}
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
  goalEur,
  setGoalEur,
  fixedExpenses,
  setFixedExpenses,
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
  goalEur: number;
  setGoalEur: (v: number) => void;
  fixedExpenses: FixedExpense[];
  setFixedExpenses: (v: FixedExpense[] | ((p: FixedExpense[]) => FixedExpense[])) => void;
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

        <SectionLabel>Objectif mensuel</SectionLabel>
        <div style={{ marginBottom: 14 }}>
          <Field label="Montant à atteindre / mois" value={goalEur} onChange={(v) => setGoalEur(v)} step={500} suffix="€" />
        </div>
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

        <SectionLabel>Frais fixes mensuels (€)</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 6 }}>
          {fixedExpenses.map((fe) => (
            <div key={fe.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                value={fe.label}
                onChange={(e) => setFixedExpenses((prev) => prev.map((x) => (x.id === fe.id ? { ...x, label: e.target.value } : x)))}
                placeholder="Ex : abonnement Adobe"
                style={{ flex: 1, minWidth: 0, background: "var(--bg-2)", border: "1px solid transparent", borderRadius: 10, padding: "9px 12px", fontSize: 13.5, outline: "none", color: "var(--ink)" }}
              />
              <div style={{ display: "flex", alignItems: "center", background: "var(--bg-2)", borderRadius: 10, padding: "9px 12px", width: 110 }}>
                <input
                  type="number"
                  min={0}
                  value={fe.amount}
                  onChange={(e) => setFixedExpenses((prev) => prev.map((x) => (x.id === fe.id ? { ...x, amount: Math.max(0, Number(e.target.value) || 0) } : x)))}
                  style={{ flex: 1, width: "100%", background: "transparent", border: "none", outline: "none", fontSize: 14, fontFamily: "Geist Mono, monospace", fontWeight: 600, color: "var(--ink)" }}
                />
                <span style={{ fontSize: 12, color: "var(--ink-2)" }}>€</span>
              </div>
              <button
                onClick={() => setFixedExpenses((prev) => prev.filter((x) => x.id !== fe.id))}
                title="Supprimer"
                style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(196,74,0,0.08)", color: "#C44A00", fontSize: 14, fontWeight: 700, display: "grid", placeItems: "center", flexShrink: 0 }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => setFixedExpenses((prev) => [...prev, { id: crypto.randomUUID(), label: "", amount: 0 }])}
          style={{ marginBottom: 18, padding: "8px 14px", borderRadius: 999, background: "var(--orange-50)", color: "var(--orange)", fontSize: 13, fontWeight: 600, border: "1px solid var(--orange-100)" }}
        >
          + Ajouter un frais fixe
        </button>

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
  fixedEur,
  netEur,
}: {
  caBrut: number;
  urssafEur: number;
  impotEur: number;
  urssafPct: number;
  impotPct: number;
  platformEur: number;
  platformUsd: number;
  fixedEur: number;
  netEur: number;
}) {
  const cols = fixedEur > 0
    ? "1fr auto 1fr auto 1fr auto 1fr auto 1fr auto 1fr"
    : "1fr auto 1fr auto 1fr auto 1fr auto 1fr";
  return (
    <div
      className="charges"
      style={{
        background: "var(--card)",
        border: "1px solid var(--line)",
        borderRadius: 18,
        padding: "14px 18px",
        display: "grid",
        gridTemplateColumns: cols,
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
      {fixedEur > 0 && <ChargeSep>−</ChargeSep>}
      {fixedEur > 0 && <ChargeCell label="Frais fixes" value={fixedEur} color="var(--ink-2)" small />}
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
  // Monthly income target — editable in settings, defaults to 10 000 €.
  const [goalEur, setGoalEur] = useLS<number>("disc.goalEur", GOAL);
  // Recurring monthly fixed costs (subscriptions, tools…) beyond Skool.
  const [fixedExpenses, setFixedExpenses] = useLS<FixedExpense[]>("disc.fixedExpenses", []);
  // Partner income line labels + which revenues the ring shows.
  const [partnerLabels, setPartnerLabels] = useLS<string[]>("disc.partnerLabels", DEFAULT_PARTNER_LABELS);
  const [revenueView, setRevenueView] = useLS<RevenueView>("disc.revenueView", "both");

  const [counters, setCounters] = useLS<Record<string, MonthCounters>>("disc.counters", {});
  const cur: MonthCounters = { ...emptyCounters(), ...(counters[mk] ?? {}) };
  const setCur = (next: Partial<MonthCounters>) => setCounters((prev) => ({ ...prev, [mk]: { ...cur, ...next } }));

  const addService = (label: string, amount: number) =>
    setCur({ services: [...cur.services, { id: crypto.randomUUID(), label: label.trim() || "Prestation", amount }] });
  const removeService = (id: string) => setCur({ services: cur.services.filter((s) => s.id !== id) });
  const addShort = () => setCur({ shortVids: cur.shortVids + 1 });
  const addLong = () => setCur({ longVids: cur.longVids + 1 });

  // Partner (Suzy) income — 3 accumulator lines; adding an amount adds to the line.
  const partnerVals = cur.partner && cur.partner.length === 3 ? cur.partner : [0, 0, 0];
  const bumpPartner = (i: number, delta: number) => {
    const next = [...partnerVals];
    next[i] = Math.max(0, (next[i] || 0) + delta);
    setCur({ partner: next });
  };

  const fin = computeFinance({ prices, members, fiscal, counters: cur, fixedExpenses });
  const { skoolGrossUsd, skoolGrossEur, skoolPlatformEur, fixedExpensesEur, brandGrossEur, servicesEur, caBrut, urssafEur, impotEur, netEur } = fin;

  const myTotal = goalMode === "net" ? Math.max(0, netEur) : caBrut;
  const partnerTotal = partnerVals.reduce((s, v) => s + (v || 0), 0);
  // The figure the hero / need-tiles follow depends on the ring's view.
  const displayTotal = revenueView === "both" ? myTotal + partnerTotal : revenueView === "me" ? myTotal : partnerTotal;

  const [confetti, setConfetti] = useState(false);
  const prevReachedRef = useRef(displayTotal >= goalEur);
  useEffect(() => {
    const reached = displayTotal >= goalEur;
    if (reached && !prevReachedRef.current) {
      setConfetti(true);
      setTimeout(() => setConfetti(false), 1800);
    }
    prevReachedRef.current = reached;
  }, [displayTotal, goalEur]);

  const cycleView = (dir: -1 | 1) => {
    const order: RevenueView[] = ["both", "me", "partner"];
    const idx = order.indexOf(revenueView);
    setRevenueView(order[(idx + dir + order.length) % order.length]);
  };

  const [settingsOpen, setSettingsOpen] = useState(false);

  const netRatio = 1 - (fiscal.urssaf + fiscal.impot) / 100;
  const breakdown: Breakdown[] = [
    { key: "skool", color: "#FF6A1A", value: (skoolGrossEur - (goalMode === "net" ? skoolPlatformEur : 0)) * (goalMode === "net" ? netRatio : 1) },
    { key: "brand", color: "#1A1208", value: brandGrossEur * (goalMode === "net" ? netRatio : 1) },
    { key: "services", color: "#FF9A3C", value: servicesEur * (goalMode === "net" ? netRatio : 1) },
  ];

  const remaining = Math.max(0, goalEur - displayTotal);
  const eurPerShort = goalMode === "net" ? prices.shortVid * netRatio : prices.shortVid;
  const eurPerLong = goalMode === "net" ? prices.longVid * netRatio : prices.longVid;
  const eurPerMember = goalMode === "net" ? prices.skoolUsd * prices.fx * netRatio : prices.skoolUsd * prices.fx;

  const shortsNeeded = eurPerShort > 0 ? Math.ceil(remaining / eurPerShort) : 0;
  const longsNeeded = eurPerLong > 0 ? Math.ceil(remaining / eurPerLong) : 0;
  const membersNeeded = eurPerMember > 0 ? Math.ceil(remaining / eurPerMember) : 0;

  const modeLabel = goalMode === "net" ? "Net en poche" : "CA brut";

  return (
    <div className="dash" style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
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
            <div style={{ fontSize: 12, color: "var(--ink-2)" }}>Vers {fmtEur(goalEur)} {goalMode === "net" ? "net" : "brut"} / mois</div>
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
          <RevenueRing
            goal={goalEur}
            breakdown={breakdown}
            myTotal={myTotal}
            partnerTotal={partnerTotal}
            view={revenueView}
            onCycle={cycleView}
            monthDate={viewMonth}
          />
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
            fixedEur={fixedExpensesEur}
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

        <PartnerCard
          labels={partnerLabels}
          setLabels={setPartnerLabels}
          values={partnerVals}
          total={partnerTotal}
          onAdd={(i, amount) => bumpPartner(i, amount)}
        />
      </section>

      <section style={{ maxWidth: 1240, margin: "0 auto", padding: "18px 28px 0" }}>
        <TimerCard prices={prices} fiscal={fiscal} onCountShort={addShort} onCountLong={addLong} onAddService={addService} />
      </section>

      <section style={{ maxWidth: 1240, margin: "0 auto", padding: "18px 28px 0" }}>
        <ServicesCard services={cur.services} total={servicesEur} onAdd={addService} onRemove={removeService} />
      </section>

      <section style={{ maxWidth: 1240, margin: "0 auto", padding: "22px 28px 60px" }}>
        <PaceWidget displayTotal={displayTotal} goal={goalEur} modeLabel={modeLabel} />
      </section>

      <footer style={{ maxWidth: 1240, margin: "0 auto", padding: "0 28px 40px", fontSize: 12, color: "var(--ink-3)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Icon name="dot" size={10} color="var(--orange)" />
        <span>Tout est enregistré localement sur ton appareil. Reviens chaque jour.</span>
        <span style={{ color: "var(--ink-3)" }}>·</span>
        <a href="/install" style={{ color: "var(--orange)", textDecoration: "none", fontWeight: 600 }}>Sync &amp; backup</a>
      </footer>

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
        goalEur={goalEur}
        setGoalEur={setGoalEur}
        fixedExpenses={fixedExpenses}
        setFixedExpenses={setFixedExpenses}
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
        @media (max-width: 640px) {
          .dash > header, .dash > section, .dash > footer {
            padding-left: 14px !important;
            padding-right: 14px !important;
          }
          .dash .hero { gap: 16px !important; }
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
