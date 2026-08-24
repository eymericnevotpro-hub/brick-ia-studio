"use client";

import { useEffect, useMemo, useState } from "react";
import { Btn, Icon, useLS } from "@/components/discipline-ui";
import {
  COURSE_ITEM,
  FRACTIONNE_ITEM,
  RepLog,
  SESSION_EXOS,
  SportDone,
  SportReps,
  WEEKDAYS_SHORT,
  WEEK_ORDER,
  dayLabel,
  kindEmoji,
  kindLabel,
  maxRep,
  sportKindForWeekday,
  sportTodayIso,
} from "@/lib/sport-store";
import {
  DEFAULT_GROCERIES,
  GroceryItem,
  MEALS,
  WHO_LABEL,
  Who,
  coursesUid,
  fmtEur,
  visibleItems,
} from "@/lib/courses-store";

export default function SportBoard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  if (!mounted) return <div style={{ minHeight: "100vh", background: "var(--bg)" }} />;
  return <Inner />;
}

function Inner() {
  const [tab, setTab] = useLS<"seance" | "courses">("disc.sport.tab", "seance");

  return (
    <div style={{ position: "relative", zIndex: 1, padding: "18px 20px 60px", maxWidth: 720, margin: "0 auto" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--ink)", color: "var(--orange)", display: "grid", placeItems: "center", boxShadow: "var(--shadow-md)", fontSize: 20 }}>💪</div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em" }}>Sport</div>
          <div style={{ fontSize: 12, color: "var(--ink-2)" }}>Séance du jour & alimentation</div>
        </div>
      </header>

      <div style={{ display: "inline-flex", gap: 4, background: "var(--bg-2)", padding: 4, borderRadius: 999, border: "1px solid var(--line)", marginBottom: 16 }}>
        {([
          { id: "seance" as const, label: "Séance" },
          { id: "courses" as const, label: "Courses" },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{ padding: "8px 18px", borderRadius: 999, fontSize: 13.5, fontWeight: 600, background: tab === t.id ? "white" : "transparent", color: tab === t.id ? "var(--ink)" : "var(--ink-2)", boxShadow: tab === t.id ? "var(--shadow-sm)" : "none" }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "seance" ? <Seance /> : <Courses />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */
/*  SÉANCE                                                                 */
/* ══════════════════════════════════════════════════════════════════════ */

function Seance() {
  const [reps, setReps] = useLS<SportReps>("disc.sportReps.v1", {});
  const [done, setDone] = useLS<SportDone>("disc.sportDone.v1", {});

  const today = useMemo(() => new Date(), []);
  const iso = sportTodayIso(today);
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

  // last few sessions max reps for progression view
  const history = useMemo(() => {
    return Object.entries(reps)
      .map(([d, r]) => ({ d, tractions: maxRep(r.tractions), dips: maxRep(r.dips) }))
      .filter((h) => h.tractions > 0 || h.dips > 0)
      .sort((a, b) => (a.d < b.d ? 1 : -1))
      .slice(0, 6);
  }, [reps]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Today's program */}
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 24, padding: 20, boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--ink-2)", textTransform: "capitalize" }}>{dayLabel(today)}</div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", marginTop: 2 }}>{kindEmoji(kind)} {kindLabel(kind)}</div>
          </div>
        </div>

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
                🎯 Tu dépasses 12 reps → ralentis la descente (3 s) ou ajoute un sac à dos lesté. C&apos;est ça qui fait la progression.
              </div>
            )}
          </div>
        ) : (
          <ActivityRow item={kind === "fractionne" ? FRACTIONNE_ITEM : COURSE_ITEM} done={doneToday.includes(kind === "fractionne" ? FRACTIONNE_ITEM.id : COURSE_ITEM.id)} onToggle={() => toggle(kind === "fractionne" ? FRACTIONNE_ITEM.id : COURSE_ITEM.id)} />
        )}
      </div>

      {/* Weekly rotation */}
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 24, padding: 20, boxShadow: "var(--shadow-sm)" }}>
        <div style={{ fontSize: 12, color: "var(--ink-2)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600, marginBottom: 10 }}>Ta semaine</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5 }}>
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
          💪 séance muscu · 🏃 course tranquille (25-30 min) · 💨 fractionné (jeudi). Tu bouges 7j/7, tu construis du muscle 4j/7 (48 h de récup entre chaque séance).
        </div>
      </div>

      {/* Progression history */}
      {history.length > 0 && (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 24, padding: 20, boxShadow: "var(--shadow-sm)" }}>
          <div style={{ fontSize: 12, color: "var(--ink-2)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600, marginBottom: 10 }}>Progression (max reps par séance)</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, fontSize: 11, color: "var(--ink-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
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
        </div>
      )}
    </div>
  );
}

function ActivityRow({ item, done, onToggle }: { item: { label: string; detail: string }; done: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left", background: "var(--bg-2)", borderRadius: 14, padding: 14, width: "100%" }}>
      <span style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: done ? "var(--orange)" : "transparent", border: "1.8px solid", borderColor: done ? "var(--orange)" : "var(--line)", display: "grid", placeItems: "center" }}>
        {done && <Icon name="check" size={16} color="white" stroke={2.6} />}
      </span>
      <span>
        <span style={{ display: "block", fontSize: 15, fontWeight: 600 }}>{item.label}</span>
        <span style={{ display: "block", fontSize: 12.5, color: "var(--ink-3)" }}>{item.detail}</span>
      </span>
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */
/*  COURSES                                                                */
/* ══════════════════════════════════════════════════════════════════════ */

function Courses() {
  const [items, setItems] = useLS<GroceryItem[]>("disc.groceries.v1", DEFAULT_GROCERIES);
  const [hasProtein, setHasProtein] = useLS<boolean>("disc.hasProtein", false);
  const [shopDays, setShopDays] = useLS<number[]>("disc.shopDays", [6]); // samedi par défaut

  const shown = visibleItems(items, hasProtein);
  const total = shown.reduce((s, i) => s + i.price, 0);
  const toBuy = shown.filter((i) => !i.bought);
  const toBuyTotal = toBuy.reduce((s, i) => s + i.price, 0);

  const toggleBought = (id: string) => setItems((prev) => prev.map((i) => (i.id === id ? { ...i, bought: !i.bought } : i)));
  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));
  const resetCart = () => setItems((prev) => prev.map((i) => ({ ...i, bought: false })));
  const addItem = (who: Who) => setItems((prev) => [...prev, { id: coursesUid(), name: "Nouvel article", qty: "1", price: 0, who }]);
  const updateItem = (id: string, patch: Partial<GroceryItem>) => setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const toggleShopDay = (d: number) => setShopDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Protein toggle + summary */}
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 24, padding: 20, boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", gap: 14 }}>
        <button onClick={() => setHasProtein((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left", background: "var(--bg-2)", borderRadius: 14, padding: 14 }}>
          <span style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, background: hasProtein ? "var(--orange)" : "transparent", border: "2px solid", borderColor: hasProtein ? "var(--orange)" : "var(--line)", display: "grid", placeItems: "center" }}>
            {hasProtein && <Icon name="check" size={16} color="white" stroke={2.6} />}
          </span>
          <span>
            <span style={{ display: "block", fontSize: 14.5, fontWeight: 600 }}>J&apos;ai de la protéine en poudre</span>
            <span style={{ display: "block", fontSize: 12, color: "var(--ink-3)" }}>Coche quand tu en as — ça retire la whey de la liste et l&apos;ajoute au shaker.</span>
          </span>
        </button>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ background: "var(--bg-2)", borderRadius: 12, padding: "10px 12px" }}>
            <div style={{ fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Reste à acheter</div>
            <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: "var(--orange)", marginTop: 2 }}>{fmtEur(toBuyTotal)}</div>
            <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{toBuy.length} article{toBuy.length > 1 ? "s" : ""}</div>
          </div>
          <div style={{ background: "var(--bg-2)", borderRadius: 12, padding: "10px 12px" }}>
            <div style={{ fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Panier complet</div>
            <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)", marginTop: 2 }}>{fmtEur(total)}</div>
            <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{shown.length} articles</div>
          </div>
        </div>

        {/* Shopping days */}
        <div>
          <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Jours de courses</div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {WEEK_ORDER.map((d) => {
              const on = shopDays.includes(d);
              return (
                <button key={d} onClick={() => toggleShopDay(d)} style={{ padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: on ? "var(--orange)" : "var(--bg-2)", color: on ? "white" : "var(--ink-3)", border: "1px solid transparent" }}>
                  {WEEKDAYS_SHORT[d]}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ fontSize: 10.5, color: "var(--ink-3)", lineHeight: 1.5 }}>
          Prix estimés · Carrefour Market Kennedy (Rennes) — à vérifier en rayon. (Pas d&apos;avocat : trop souvent pas bons.)
        </div>
      </div>

      {/* Meals */}
      <div style={{ background: "linear-gradient(135deg, #FFF1E2 0%, #FFE0C7 100%)", border: "1px solid var(--orange-100)", borderRadius: 24, padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 11, color: "var(--orange)", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>Tes repas clés (muscle)</div>
        {MEALS.map((m) => (
          <div key={m.id} style={{ display: "flex", gap: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--orange)", minWidth: 78, paddingTop: 1 }}>{m.when}</div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{m.title}</div>
              <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.45 }}>{m.detail(hasProtein)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Grocery list grouped by who */}
      {(["toi", "copine", "commun"] as Who[]).map((who) => {
        const list = shown.filter((i) => i.who === who);
        const groupTotal = list.reduce((s, i) => s + i.price, 0);
        return (
          <div key={who} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 24, padding: 18, boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 2 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{WHO_LABEL[who]}</div>
              <div className="mono" style={{ fontSize: 13, color: "var(--ink-2)", fontWeight: 600 }}>{fmtEur(groupTotal)}</div>
            </div>
            {list.map((i) => (
              <GroceryRow key={i.id} item={i} onToggle={() => toggleBought(i.id)} onRemove={() => removeItem(i.id)} onUpdate={(p) => updateItem(i.id, p)} />
            ))}
            <button onClick={() => addItem(who)} style={{ alignSelf: "flex-start", marginTop: 4, padding: "6px 12px", borderRadius: 999, background: "var(--orange-50)", color: "var(--orange)", fontSize: 12.5, fontWeight: 600, border: "1px dashed var(--orange-100)" }}>
              + Ajouter
            </button>
          </div>
        );
      })}

      <Btn kind="ghost" size="md" onClick={resetCart}>Décocher tout (nouvelle liste)</Btn>
    </div>
  );
}

function GroceryRow({ item, onToggle, onRemove, onUpdate }: { item: GroceryItem; onToggle: () => void; onRemove: () => void; onUpdate: (patch: Partial<GroceryItem>) => void }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <div style={{ display: "flex", gap: 6, alignItems: "center", background: "var(--bg-2)", borderRadius: 12, padding: 8 }}>
        <input value={item.name} onChange={(e) => onUpdate({ name: e.target.value })} style={{ flex: 1, minWidth: 0, background: "white", border: "1px solid transparent", borderRadius: 8, padding: "7px 10px", fontSize: 13, outline: "none", color: "var(--ink)" }} />
        <input value={item.qty} onChange={(e) => onUpdate({ qty: e.target.value })} style={{ width: 64, background: "white", border: "1px solid transparent", borderRadius: 8, padding: "7px 8px", fontSize: 12.5, outline: "none", color: "var(--ink)" }} />
        <div style={{ display: "flex", alignItems: "center", background: "white", borderRadius: 8, padding: "5px 8px", width: 78 }}>
          <input type="number" step={0.1} value={item.price} onChange={(e) => onUpdate({ price: Math.max(0, Number(e.target.value) || 0) })} style={{ flex: 1, width: "100%", background: "transparent", border: "none", outline: "none", fontSize: 13, fontFamily: "Geist Mono, monospace", fontWeight: 600, color: "var(--ink)" }} />
          <span style={{ fontSize: 11, color: "var(--ink-2)" }}>€</span>
        </div>
        <button onClick={() => setEditing(false)} style={{ width: 30, height: 30, borderRadius: 8, background: "var(--orange)", color: "white", fontSize: 13, display: "grid", placeItems: "center" }}>✓</button>
        <button onClick={onRemove} style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(196,74,0,0.08)", color: "#C44A00", fontSize: 13, display: "grid", placeItems: "center" }}>✕</button>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 4px", opacity: item.bought ? 0.5 : 1 }}>
      <button onClick={onToggle} style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0, background: item.bought ? "var(--green)" : "transparent", border: "1.8px solid", borderColor: item.bought ? "var(--green)" : "var(--line)", display: "grid", placeItems: "center" }}>
        {item.bought && <Icon name="check" size={14} color="white" stroke={2.6} />}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, textDecoration: item.bought ? "line-through" : "none" }}>{item.name}</div>
        <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{item.qty}</div>
      </div>
      <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)" }}>{fmtEur(item.price)}</div>
      <button onClick={() => setEditing(true)} title="Modifier" style={{ width: 26, height: 26, borderRadius: 7, background: "var(--bg-2)", color: "var(--ink-3)", fontSize: 12, display: "grid", placeItems: "center", flexShrink: 0 }}>✎</button>
    </div>
  );
}
