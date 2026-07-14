"use client";

import { CSSProperties, useEffect, useMemo, useState } from "react";
import { Btn, useLS } from "@/components/discipline-ui";
import {
  DEFAULT_CATEGORIES,
  Expense,
  ExpenseCategory,
  budgetMonthKey,
  budgetMonthLabel,
  budgetTodayIso,
  budgetUid,
  expensesForMonth,
  fmtEur2,
  totalsByCategory,
} from "@/lib/budget-store";
import {
  DEFAULT_FISCAL,
  DEFAULT_MEMBERS,
  DEFAULT_PARTNER_FISCAL,
  DEFAULT_PRICES,
  Fiscal,
  FixedExpense,
  MonthCounters,
  Prices,
  computeFinance,
  emptyCounters,
} from "@/lib/discipline-store";

export default function BudgetBoard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  if (!mounted) return <div style={{ minHeight: "100vh", background: "var(--bg)" }} />;
  return <Inner />;
}

function Inner() {
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const mk = budgetMonthKey(viewMonth);
  const realMk = budgetMonthKey();
  const isCurrentMonth = mk === realMk;

  const [categories] = useLS<ExpenseCategory[]>("disc.expenseCategories", DEFAULT_CATEGORIES);
  const [expenses, setExpenses] = useLS<Expense[]>("disc.expenses", []);

  // Fixed expenses shared with the dashboard.
  const [fixedExpenses, setFixedExpenses] = useLS<FixedExpense[]>("disc.fixedExpenses", []);
  const [partnerFixed, setPartnerFixed] = useLS<FixedExpense[]>("disc.partnerFixed", []);

  // Everything needed to recompute the household net (same data as dashboard).
  const [prices] = useLS<Prices>("disc.prices.v2", DEFAULT_PRICES);
  const [members] = useLS<number>("disc.members", DEFAULT_MEMBERS);
  const [fiscal] = useLS<Fiscal>("disc.fiscal", DEFAULT_FISCAL);
  const [partnerFiscal] = useLS<Fiscal>("disc.partnerFiscal", DEFAULT_PARTNER_FISCAL);
  const [counters] = useLS<Record<string, MonthCounters>>("disc.counters", {});

  const cur: MonthCounters = { ...emptyCounters(), ...(counters[mk] ?? {}) };
  const fin = computeFinance({ prices, members, fiscal, counters: cur, fixedExpenses });
  const partnerVals = cur.partner && cur.partner.length === 3 ? cur.partner : [0, 0, 0];
  const partnerRaw = partnerVals.reduce((s, v) => s + (v || 0), 0);
  const partnerNetRatio = 1 - (partnerFiscal.urssaf + partnerFiscal.impot) / 100;
  const partnerFixedEur = partnerFixed.reduce((s, e) => s + (e.amount || 0), 0);
  const suzyNet = partnerRaw * partnerNetRatio - partnerFixedEur;
  const householdNet = fin.netEur + suzyNet;

  const monthExpenses = useMemo(() => expensesForMonth(expenses, mk), [expenses, mk]);
  const variableSpent = monthExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const realSavings = householdNet - variableSpent;
  const cats = useMemo(() => totalsByCategory(monthExpenses, categories), [monthExpenses, categories]);

  const addExpense = (e: Omit<Expense, "id">) => {
    setExpenses((prev) => [...prev, { ...e, id: budgetUid() }]);
  };
  const removeExpense = (id: string) => setExpenses((prev) => prev.filter((e) => e.id !== id));

  // Group month expenses by day, newest first.
  const byDay = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of monthExpenses) {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [monthExpenses]);

  const navMonth = (d: number) => setViewMonth((p) => new Date(p.getFullYear(), p.getMonth() + d, 1));

  return (
    <div className="budget" style={{ position: "relative", zIndex: 1, padding: "16px 28px 60px", maxWidth: 1100, margin: "0 auto" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--ink)", color: "var(--orange)", display: "grid", placeItems: "center", boxShadow: "var(--shadow-md)", fontSize: 20 }}>💶</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em" }}>Budget</div>
            <div style={{ fontSize: 12, color: "var(--ink-2)" }}>Note tes dépenses chaque soir · dépense moins, épargne plus</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-2)", padding: "4px 6px", borderRadius: 999 }}>
          <button onClick={() => navMonth(-1)} style={navBtn()}>‹</button>
          <div style={{ minWidth: 130, textAlign: "center", fontSize: 13, fontWeight: 600, textTransform: "capitalize" }}>{budgetMonthLabel(viewMonth)}</div>
          <button onClick={() => navMonth(1)} disabled={isCurrentMonth} style={navBtn(isCurrentMonth)}>›</button>
        </div>
      </header>

      {/* Balance card */}
      <section style={{ marginBottom: 18 }}>
        <div
          style={{
            background: "var(--ink)",
            color: "white",
            borderRadius: 24,
            padding: 22,
            boxShadow: "var(--shadow-md)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 14,
            position: "relative",
            overflow: "hidden",
          }}
          className="balance"
        >
          <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(255,106,26,0.5), transparent 70%)", pointerEvents: "none" }} />
          <BalanceTile label="Revenus nets du foyer" value={fmtEur2(householdNet)} sub="après charges & frais fixes" />
          <BalanceTile label="Dépenses variables" value={fmtEur2(variableSpent)} sub={`${monthExpenses.length} dépense${monthExpenses.length > 1 ? "s" : ""} ce mois`} color="var(--orange-soft)" />
          <BalanceTile
            label={realSavings >= 0 ? "Épargne réelle" : "Déficit"}
            value={fmtEur2(realSavings)}
            sub={realSavings >= 0 ? "à mettre de côté" : "tu dépenses trop"}
            color={realSavings >= 0 ? "#7BE0A8" : "#FF9A7A"}
            big
          />
        </div>
      </section>

      {/* Quick add */}
      <AddExpense categories={categories} defaultDate={isCurrentMonth ? budgetTodayIso() : `${mk}-15`} onAdd={addExpense} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 18, alignItems: "start" }} className="budget-grid">
        {/* Category breakdown */}
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 24, padding: 22 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Où part l&apos;argent</h2>
            <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: "var(--orange)" }}>{fmtEur2(variableSpent)}</span>
          </div>
          {cats.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--ink-3)", padding: "12px 0" }}>Aucune dépense ce mois. Ajoute-en une ci-dessus.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {cats.map((c) => (
                <div key={c.category}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 500 }}>{c.emoji} {c.category}</span>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 700 }}>{fmtEur2(c.total)} <span style={{ color: "var(--ink-3)", fontWeight: 500 }}>· {Math.round(c.pct * 100)}%</span></span>
                  </div>
                  <div style={{ height: 8, background: "var(--bg-2)", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${c.pct * 100}%`, background: c.color, borderRadius: 999, transition: "width 400ms var(--bounce)" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Journal */}
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 24, padding: 22 }}>
          <h2 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 600 }}>Journal du mois</h2>
          {byDay.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--ink-3)", padding: "12px 0" }}>Rien encore.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, maxHeight: 420, overflowY: "auto" }}>
              {byDay.map(([date, list]) => {
                const dayTotal = list.reduce((s, e) => s + e.amount, 0);
                return (
                  <div key={date}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-2)", textTransform: "capitalize" }}>
                        {new Date(date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                      </span>
                      <span className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>{fmtEur2(dayTotal)}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {list.map((e) => {
                        const cat = categories.find((c) => c.name === e.category);
                        return (
                          <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "var(--bg-2)", borderRadius: 10 }}>
                            <span style={{ width: 8, height: 8, borderRadius: 4, background: cat?.color ?? "#8A857D", flexShrink: 0 }} />
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 500 }}>{cat?.emoji} {e.category}{e.note ? <span style={{ color: "var(--ink-3)", fontWeight: 400 }}> · {e.note}</span> : null}</div>
                            </div>
                            <span className="mono" style={{ fontSize: 14, fontWeight: 700 }}>{fmtEur2(e.amount)}</span>
                            <button onClick={() => removeExpense(e.id)} title="Supprimer" style={{ fontSize: 12, color: "var(--ink-3)", padding: "2px 6px" }}>✕</button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Fixed expenses (linked to dashboard) */}
      <section style={{ marginTop: 18 }}>
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 24, padding: 22 }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 600 }}>Frais fixes mensuels</h2>
          <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 14 }}>
            Les charges récurrentes (loyer, abonnements…). Modifiables ici comme dans les réglages — déjà déduites du net.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }} className="fixed-grid">
            <FixedBlock title="Brick" total={fixedExpenses.reduce((s, e) => s + (e.amount || 0), 0)} items={fixedExpenses} setItems={setFixedExpenses} placeholder="Ex : loyer, Adobe…" />
            <FixedBlock title="Suzy" total={partnerFixedEur} items={partnerFixed} setItems={setPartnerFixed} placeholder="Ex : téléphone, transport…" />
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 820px) {
          .budget-grid { grid-template-columns: 1fr !important; }
          .fixed-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .budget { padding-left: 14px !important; padding-right: 14px !important; }
        }
      `}</style>
    </div>
  );
}

/* ── add expense ─────────────────────────────────────────────────────── */

function AddExpense({
  categories,
  defaultDate,
  onAdd,
}: {
  categories: ExpenseCategory[];
  defaultDate: string;
  onAdd: (e: Omit<Expense, "id">) => void;
}) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(categories[0]?.name ?? "Autre");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(defaultDate);

  const submit = () => {
    const v = Number(String(amount).replace(",", "."));
    if (!Number.isFinite(v) || v <= 0) return;
    onAdd({ date, category, amount: v, note: note.trim() || undefined });
    setAmount("");
    setNote("");
  };

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 24, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Ajouter une dépense</h2>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{ background: "var(--bg-2)", border: "1px solid transparent", borderRadius: 10, padding: "7px 10px", fontSize: 13, color: "var(--ink)", outline: "none" }}
        />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {categories.map((c) => {
          const active = category === c.name;
          return (
            <button
              key={c.name}
              onClick={() => setCategory(c.name)}
              style={{
                padding: "7px 12px",
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: 600,
                background: active ? c.color : "var(--bg-2)",
                color: active ? "white" : "var(--ink-2)",
                border: "1px solid transparent",
                transition: "all 180ms var(--ease-out)",
              }}
            >
              {c.emoji} {c.name}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", background: "var(--bg-2)", borderRadius: 12, padding: "10px 14px", width: 150 }}>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Montant"
            autoFocus
            style={{ flex: 1, width: "100%", background: "transparent", border: "none", outline: "none", fontSize: 18, fontFamily: "Geist Mono, monospace", fontWeight: 700, color: "var(--ink)" }}
          />
          <span style={{ fontSize: 14, color: "var(--ink-2)" }}>€</span>
        </div>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="note (optionnel)"
          style={{ flex: "1 1 160px", minWidth: 0, padding: "11px 14px", background: "var(--bg-2)", border: "1px solid transparent", borderRadius: 12, fontSize: 14, outline: "none", color: "var(--ink)" }}
        />
        <Btn kind="primary" size="md" icon="plus" onClick={submit}>Ajouter</Btn>
      </div>
    </div>
  );
}

/* ── fixed expenses block ────────────────────────────────────────────── */

function FixedBlock({
  title,
  total,
  items,
  setItems,
  placeholder,
}: {
  title: string;
  total: number;
  items: FixedExpense[];
  setItems: (v: FixedExpense[] | ((p: FixedExpense[]) => FixedExpense[])) => void;
  placeholder: string;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--ink-3)" }}>{title}</span>
        <span className="mono" style={{ fontSize: 13, fontWeight: 700 }}>{fmtEur2(total)}/mois</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((fe) => (
          <div key={fe.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              value={fe.label}
              onChange={(e) => setItems((prev) => prev.map((x) => (x.id === fe.id ? { ...x, label: e.target.value } : x)))}
              placeholder={placeholder}
              style={{ flex: 1, minWidth: 0, background: "var(--bg-2)", border: "1px solid transparent", borderRadius: 10, padding: "9px 12px", fontSize: 13.5, outline: "none", color: "var(--ink)" }}
            />
            <div style={{ display: "flex", alignItems: "center", background: "var(--bg-2)", borderRadius: 10, padding: "9px 12px", width: 100 }}>
              <input
                type="number"
                min={0}
                value={fe.amount}
                onChange={(e) => setItems((prev) => prev.map((x) => (x.id === fe.id ? { ...x, amount: Math.max(0, Number(e.target.value) || 0) } : x)))}
                style={{ flex: 1, width: "100%", background: "transparent", border: "none", outline: "none", fontSize: 14, fontFamily: "Geist Mono, monospace", fontWeight: 600, color: "var(--ink)" }}
              />
              <span style={{ fontSize: 12, color: "var(--ink-2)" }}>€</span>
            </div>
            <button
              onClick={() => setItems((prev) => prev.filter((x) => x.id !== fe.id))}
              title="Supprimer"
              style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(196,74,0,0.08)", color: "#C44A00", fontSize: 14, fontWeight: 700, display: "grid", placeItems: "center", flexShrink: 0 }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={() => setItems((prev) => [...prev, { id: budgetUid(), label: "", amount: 0 }])}
        style={{ marginTop: 8, padding: "8px 14px", borderRadius: 999, background: "var(--orange-50)", color: "var(--orange)", fontSize: 13, fontWeight: 600, border: "1px solid var(--orange-100)" }}
      >
        + Ajouter un frais fixe
      </button>
    </div>
  );
}

/* ── small helpers ───────────────────────────────────────────────────── */

function BalanceTile({ label, value, sub, color, big }: { label: string; value: string; sub: string; color?: string; big?: boolean }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "14px 16px", position: "relative" }}>
      <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.55)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>{label}</div>
      <div className="mono" style={{ fontSize: big ? 30 : 24, fontWeight: 700, letterSpacing: "-0.02em", color: color || "white", lineHeight: 1.1, marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function navBtn(disabled = false): CSSProperties {
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
