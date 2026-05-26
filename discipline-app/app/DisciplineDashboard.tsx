"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  Plus,
  Minus,
  Trash2,
  Target,
  Flame,
  Sparkles,
  X,
} from "lucide-react";
import HabitWheel from "@/components/HabitWheel";
import {
  DisciplineState,
  MonthRevenue,
  computeFinance,
  daysInMonth,
  emptyRevenue,
  emptyState,
  eur,
  loadState,
  monthKey,
  saveState,
} from "@/lib/discipline-store";

const MONTHS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

const RING_COLORS = ["#FF7A00", "#FF8C1A", "#FF9A3C", "#FFA94D", "#FFB347", "#FFC066", "#FFCB80", "#FFD080"];

export default function DisciplineDashboard() {
  const [state, setState] = useState<DisciplineState>(emptyState);
  const [mounted, setMounted] = useState(false);
  const [viewDate, setViewDate] = useState(() => new Date(2026, 4, 1));
  const [showSettings, setShowSettings] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const prevPct = useRef(0);

  useEffect(() => {
    // Hydrate from localStorage after mount to avoid SSR/client mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(loadState());
    setViewDate(new Date());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) saveState(state);
  }, [state, mounted]);

  const key = monthKey(viewDate);
  const nbDays = daysInMonth(viewDate.getFullYear(), viewDate.getMonth());
  const now = new Date();
  const isCurrentMonth =
    now.getFullYear() === viewDate.getFullYear() && now.getMonth() === viewDate.getMonth();
  const today = isCurrentMonth ? now.getDate() : null;

  const completions = useMemo(() => state.completions[key] ?? {}, [state.completions, key]);
  const revenue: MonthRevenue = useMemo(() => state.revenue[key] ?? emptyRevenue(), [state.revenue, key]);
  const finance = useMemo(() => computeFinance(revenue, state.settings), [revenue, state.settings]);

  const goalTarget = state.settings.goalEur;
  const goalValue = state.settings.goalBasis === "net" ? finance.netEnPoche : finance.caBrut;
  const goalPct = goalTarget > 0 ? Math.min(100, (goalValue / goalTarget) * 100) : 0;

  const streak = useMemo(() => {
    let count = 0;
    for (let d = 1; d <= nbDays; d++) {
      const all = state.habits.every((_, h) => (completions[h] ?? []).includes(d));
      if (all && state.habits.length > 0) count++;
    }
    return count;
  }, [completions, state.habits, nbDays]);

  useEffect(() => {
    if (mounted && goalPct >= 100 && prevPct.current < 100) {
      setCelebrate(true);
      const t = setTimeout(() => setCelebrate(false), 3200);
      return () => clearTimeout(t);
    }
    prevPct.current = goalPct;
  }, [goalPct, mounted]);

  const toggleHabit = (h: number, d: number) => {
    setState((prev) => {
      const month = { ...(prev.completions[key] ?? {}) };
      const list = new Set(month[h] ?? []);
      if (list.has(d)) list.delete(d);
      else list.add(d);
      month[h] = [...list].sort((a, b) => a - b);
      return { ...prev, completions: { ...prev.completions, [key]: month } };
    });
  };

  const updateRevenue = (patch: Partial<MonthRevenue>) => {
    setState((prev) => ({
      ...prev,
      revenue: { ...prev.revenue, [key]: { ...(prev.revenue[key] ?? emptyRevenue()), ...patch } },
    }));
  };

  const updateSettings = (patch: Partial<DisciplineState["settings"]>) => {
    setState((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
  };

  if (!mounted) {
    return <div className="min-h-screen" style={{ background: "#080401" }} />;
  }

  return (
    <div className="relative z-10 max-w-3xl mx-auto px-4 pt-24 pb-24">
      {celebrate && <Confetti />}

      <div className="flex items-center justify-between mb-6 animate-fade-up" style={{ animationFillMode: "both" }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105"
            style={{ background: "#1A0B00", border: "1px solid #3D1A00", color: "#FFB347" }}
            aria-label="Mois précédent"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center min-w-[150px]">
            <div className="text-xl font-black text-white capitalize leading-none">
              {MONTHS_FR[viewDate.getMonth()]}
            </div>
            <div className="text-xs" style={{ color: "#8a5a2a" }}>{viewDate.getFullYear()}</div>
          </div>
          <button
            onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105"
            style={{ background: "#1A0B00", border: "1px solid #3D1A00", color: "#FFB347" }}
            aria-label="Mois suivant"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105"
          style={{ background: "#1A0B00", border: "1px solid #3D1A00", color: "#8a5a2a" }}
          aria-label="Réglages"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 120, damping: 16 }}
        className="rounded-3xl p-6 mb-6"
        style={{
          background: "linear-gradient(135deg, #120700 0%, #1A0B00 100%)",
          border: "1px solid #3D1A00",
          boxShadow: goalPct >= 100 ? "0 0 50px #FF7A0055" : "0 0 30px #FF7A0011",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5" style={{ color: "#FF7A00" }} />
            <span className="font-bold text-white">Objectif du mois</span>
            <span className="tag-badge">{state.settings.goalBasis === "net" ? "Net en poche" : "CA brut"}</span>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1.5 text-sm font-bold" style={{ color: "#FFB347" }}>
              <Flame className="w-4 h-4" /> {streak} {streak > 1 ? "jours parfaits" : "jour parfait"}
            </div>
          )}
        </div>

        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="text-4xl font-black text-white leading-none">{eur(goalValue)}</div>
            <div className="text-sm mt-1" style={{ color: "#8a5a2a" }}>sur {eur(goalTarget)}</div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black" style={{ color: goalPct >= 100 ? "#FFB347" : "#FF7A00" }}>
              {Math.round(goalPct)}%
            </div>
            {goalPct >= 100 && (
              <div className="flex items-center gap-1 text-xs font-bold" style={{ color: "#FFB347" }}>
                <Sparkles className="w-3 h-3" /> Objectif atteint !
              </div>
            )}
          </div>
        </div>

        <div className="h-4 rounded-full overflow-hidden" style={{ background: "#0D0500", border: "1px solid #3D1A00" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #FF6A00, #FFB347)" }}
            initial={{ width: 0 }}
            animate={{ width: `${goalPct}%` }}
            transition={{ type: "spring", stiffness: 90, damping: 14 }}
          />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 120, damping: 16 }}
        className="rounded-3xl p-5 mb-6"
        style={{ background: "linear-gradient(135deg, #120700 0%, #1A0B00 100%)", border: "1px solid #3D1A00" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="font-bold text-white">Mes habitudes</span>
          <span className="text-xs" style={{ color: "#8a5a2a" }}>· clique pour cocher ta journée</span>
        </div>

        <HabitWheel
          habits={state.habits}
          days={nbDays}
          today={today}
          completed={completions}
          onToggle={toggleHabit}
        />

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4">
          {state.habits.map((h, i) => {
            const count = (completions[i] ?? []).length;
            return (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: RING_COLORS[i % RING_COLORS.length] }}
                />
                <span className="text-white truncate flex-1">{h}</span>
                <span style={{ color: "#8a5a2a" }} className="text-xs font-semibold">{count}/{nbDays}</span>
              </div>
            );
          })}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, type: "spring", stiffness: 120, damping: 16 }}
        className="rounded-3xl p-5 mb-6"
        style={{ background: "linear-gradient(135deg, #120700 0%, #1A0B00 100%)", border: "1px solid #3D1A00" }}
      >
        <div className="font-bold text-white mb-4">Revenus du mois</div>

        <div className="space-y-3">
          <RevenueRow label="Membres Skool" hint={`${state.settings.skoolPriceUsd}$/mois · ${eur(finance.skoolGrossEur)}`}>
            <Stepper value={state.settings.skoolMembers} onChange={(v) => updateSettings({ skoolMembers: v })} />
          </RevenueRow>

          <RevenueRow label="Vidéos courtes" hint={`${state.settings.shortVideoEur}€ / vidéo`}>
            <Stepper value={revenue.shortVideos} onChange={(v) => updateRevenue({ shortVideos: v })} />
          </RevenueRow>

          <RevenueRow label="Vidéos longues" hint={`${state.settings.longVideoEur}€ / vidéo`}>
            <Stepper value={revenue.longVideos} onChange={(v) => updateRevenue({ longVideos: v })} />
          </RevenueRow>

          <RevenueRow label="Autre (TikTok / Insta…)" hint="sponsos, divers">
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                value={revenue.otherEur || ""}
                onChange={(e) => updateRevenue({ otherEur: Math.max(0, Number(e.target.value)) })}
                placeholder="0"
                className="input-brand rounded-lg px-3 py-1.5 w-24 text-right text-sm font-semibold"
              />
              <span className="text-sm" style={{ color: "#8a5a2a" }}>€</span>
            </div>
          </RevenueRow>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 120, damping: 16 }}
        className="rounded-3xl p-5"
        style={{ background: "linear-gradient(135deg, #120700 0%, #1A0B00 100%)", border: "1px solid #3D1A00" }}
      >
        <div className="font-bold text-white mb-4">Ce qu&apos;il te reste vraiment</div>

        <div className="space-y-2 text-sm">
          <Line label="Skool (brut)" value={eur(finance.skoolGrossEur)} muted />
          <Line label="Vidéos de marque" value={eur(finance.videosEur)} muted />
          <Line label="Autre" value={eur(finance.otherEur)} muted />
          <Divider />
          <Line label="Chiffre d'affaires" value={eur(finance.caBrut)} bold />
          <Line
            label={`URSSAF (${(state.settings.cotisationsRate * 100).toFixed(1)}%)`}
            value={`− ${eur(finance.cotisations)}`}
            neg
          />
          <Line
            label={`Impôt libératoire (${(state.settings.impotRate * 100).toFixed(1)}%)`}
            value={`− ${eur(finance.impot)}`}
            neg
          />
          <Line label="Coût Skool" value={`− ${eur(finance.skoolCostEur)}`} neg />
          <Divider />
          <div className="flex items-center justify-between pt-1">
            <span className="font-bold text-white">Net en poche</span>
            <span className="text-2xl font-black" style={{ color: "#FFB347" }}>{eur(finance.netEnPoche)}</span>
          </div>
        </div>

        <p className="text-xs mt-4 leading-relaxed" style={{ color: "#6a4020" }}>
          Conversion 1$ = {state.settings.usdToEur.toFixed(2)}€. L&apos;URSSAF et l&apos;impôt se calculent sur le
          chiffre d&apos;affaires brut (régime micro-BNC, versement libératoire). Le coût du Skool est une charge
          déduite après. Ajuste les taux dans les réglages.
        </p>
      </motion.div>

      <AnimatePresence>
        {showSettings && (
          <SettingsModal
            state={state}
            onClose={() => setShowSettings(false)}
            onUpdateSettings={updateSettings}
            onUpdateHabits={(habits) => setState((prev) => ({ ...prev, habits }))}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function RevenueRow({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div className="min-w-0">
        <div className="text-white text-sm font-semibold truncate">{label}</div>
        <div className="text-xs" style={{ color: "#8a5a2a" }}>{hint}</div>
      </div>
      {children}
    </div>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90 hover:scale-105"
        style={{ background: "#0D0500", border: "1px solid #3D1A00", color: "#FFB347" }}
        aria-label="Moins"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <motion.span
        key={value}
        initial={{ scale: 1.3 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 12 }}
        className="w-8 text-center font-black text-white tabular-nums"
      >
        {value}
      </motion.span>
      <button
        onClick={() => onChange(value + 1)}
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90 hover:scale-105"
        style={{ background: "linear-gradient(135deg, #FF7A00, #FF5500)", color: "white" }}
        aria-label="Plus"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function Line({ label, value, muted, bold, neg }: { label: string; value: string; muted?: boolean; bold?: boolean; neg?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: muted ? "#8a5a2a" : neg ? "#a86a3a" : "#fff" }} className={bold ? "font-bold" : ""}>
        {label}
      </span>
      <span
        className={bold ? "font-bold" : "font-semibold"}
        style={{ color: neg ? "#c97b3a" : bold ? "#fff" : "#c9a06a" }}
      >
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return <div className="h-px my-1" style={{ background: "#3D1A0088" }} />;
}

function NumberField({ label, value, onChange, step = 1, suffix }: { label: string; value: number; onChange: (v: number) => void; step?: number; suffix?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold" style={{ color: "#8a5a2a" }}>{label}</span>
      <div className="flex items-center gap-1 mt-1">
        <input
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="input-brand rounded-lg px-3 py-2 w-full text-sm font-semibold"
        />
        {suffix && <span className="text-sm" style={{ color: "#8a5a2a" }}>{suffix}</span>}
      </div>
    </label>
  );
}

function SettingsModal({
  state,
  onClose,
  onUpdateSettings,
  onUpdateHabits,
}: {
  state: DisciplineState;
  onClose: () => void;
  onUpdateSettings: (patch: Partial<DisciplineState["settings"]>) => void;
  onUpdateHabits: (habits: string[]) => void;
}) {
  const s = state.settings;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-t-3xl md:rounded-3xl p-6"
        style={{ background: "#120700", border: "1px solid #3D1A00" }}
      >
        <div className="flex items-center justify-between mb-5">
          <span className="text-lg font-black text-white">Réglages</span>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#1A0B00", color: "#8a5a2a" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <NumberField label="Objectif mensuel" value={s.goalEur} onChange={(v) => onUpdateSettings({ goalEur: v })} step={500} suffix="€" />
          <div>
            <span className="text-xs font-semibold" style={{ color: "#8a5a2a" }}>Base de l&apos;objectif</span>
            <div className="flex gap-2 mt-1">
              {(["brut", "net"] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => onUpdateSettings({ goalBasis: b })}
                  className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                  style={
                    s.goalBasis === b
                      ? { background: "#FF7A0022", border: "1px solid #FF7A00", color: "#FF7A00" }
                      : { background: "#0D0500", border: "1px solid #3D1A00", color: "#8a5a2a" }
                  }
                >
                  {b === "brut" ? "CA brut" : "Net en poche"}
                </button>
              ))}
            </div>
          </div>
          <NumberField label="Prix Skool / membre" value={s.skoolPriceUsd} onChange={(v) => onUpdateSettings({ skoolPriceUsd: v })} suffix="$" />
          <NumberField label="Coût Skool / mois" value={s.skoolCostUsd} onChange={(v) => onUpdateSettings({ skoolCostUsd: v })} suffix="$" />
          <NumberField label="Taux 1$ → €" value={s.usdToEur} onChange={(v) => onUpdateSettings({ usdToEur: v })} step={0.01} />
          <NumberField label="Vidéo courte" value={s.shortVideoEur} onChange={(v) => onUpdateSettings({ shortVideoEur: v })} suffix="€" />
          <NumberField label="Vidéo longue" value={s.longVideoEur} onChange={(v) => onUpdateSettings({ longVideoEur: v })} suffix="€" />
          <NumberField label="URSSAF (%)" value={+(s.cotisationsRate * 100).toFixed(1)} onChange={(v) => onUpdateSettings({ cotisationsRate: v / 100 })} step={0.1} />
          <NumberField label="Impôt libératoire (%)" value={+(s.impotRate * 100).toFixed(1)} onChange={(v) => onUpdateSettings({ impotRate: v / 100 })} step={0.1} />
        </div>

        <div className="font-bold text-white mb-2 text-sm">Mes habitudes</div>
        <div className="space-y-2">
          {state.habits.map((h, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: RING_COLORS[i % RING_COLORS.length] }} />
              <input
                value={h}
                onChange={(e) => {
                  const next = [...state.habits];
                  next[i] = e.target.value;
                  onUpdateHabits(next);
                }}
                className="input-brand rounded-lg px-3 py-1.5 flex-1 text-sm"
              />
              <button
                onClick={() => onUpdateHabits(state.habits.filter((_, idx) => idx !== i))}
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "#1A0B00", border: "1px solid #3D1A00", color: "#a86a3a" }}
                aria-label="Supprimer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        {state.habits.length < 8 && (
          <button
            onClick={() => onUpdateHabits([...state.habits, "Nouvelle habitude"])}
            className="mt-3 w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            style={{ background: "#0D0500", border: "1px dashed #3D1A00", color: "#FFB347" }}
          >
            <Plus className="w-4 h-4" /> Ajouter une habitude
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}

const CONFETTI_COLORS = ["#FF7A00", "#FFB347", "#FF5500", "#FFD080", "#FF9A3C"];

function Confetti() {
  const [pieces] = useState(() =>
    Array.from({ length: 36 }).map((_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.4,
      duration: 2 + Math.random() * 1.5,
      size: 6 + Math.random() * 8,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    })),
  );
  return (
    <div className="fixed inset-0 z-[60] pointer-events-none overflow-hidden">
      {pieces.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-sm"
          style={{ left: `${p.left}%`, top: -20, width: p.size, height: p.size, background: p.color }}
          initial={{ y: -20, rotate: 0, opacity: 1 }}
          animate={{ y: "105vh", rotate: 720, opacity: [1, 1, 0] }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeIn" }}
        />
      ))}
    </div>
  );
}
