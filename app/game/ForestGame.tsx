"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLS } from "@/components/discipline-ui";
import { GameAudio } from "@/lib/forest-audio";
import {
  Input,
  SHOP,
  World,
  buy,
  createWorld,
  fenceHoles,
  startNight,
  step,
} from "@/lib/forest-game";
import {
  RenderState,
  computeView,
  createRenderState,
  render,
  screenToWorldDir,
} from "@/lib/forest-render";

interface Hud {
  phase: World["phase"];
  wave: number;
  dayLeft: number;
  wood: number;
  raw: number;
  cooked: number;
  coins: number;
  hp: number;
  maxHp: number;
  zombies: number;
  holes: number;
  recruits: number;
  kills: number;
  fed: number;
  hint: string;
  dashReady: boolean;
  banner: boolean;
}

const EMPTY_HUD: Hud = {
  phase: "intro",
  wave: 1,
  dayLeft: 55,
  wood: 6,
  raw: 0,
  cooked: 0,
  coins: 0,
  hp: 100,
  maxHp: 100,
  zombies: 0,
  holes: 5,
  recruits: 0,
  kills: 0,
  fed: 0,
  hint: "",
  dashReady: true,
  banner: false,
};

/**
 * The shop reads live world numbers, but React must not touch the world while
 * rendering — so we snapshot the rows every time the panel changes.
 */
interface ShopRow {
  id: string;
  icon: string;
  label: string;
  desc: string;
  cost: number;
  levelText: string;
  maxed: boolean;
  afford: boolean;
}

interface ShopView {
  coins: number;
  rows: ShopRow[];
}

function shopView(w: World): ShopView {
  return {
    coins: w.coins,
    rows: SHOP.map((item) => {
      const lvl = item.level?.(w) ?? 0;
      const maxed = item.max !== undefined && lvl >= item.max;
      const cost = item.cost(w);
      return {
        id: item.id,
        icon: item.icon,
        label: item.label,
        desc: item.desc(w),
        cost,
        levelText: item.level && lvl > 0 ? ` · ${lvl}${item.max ? `/${item.max}` : ""}` : "",
        maxed,
        afford: w.coins >= cost && !maxed,
      };
    }),
  };
}

interface BestRun {
  wave: number;
  kills: number;
  coins: number;
}

export default function ForestGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<World | null>(null);
  const renderRef = useRef<RenderState | null>(null);
  const audioRef = useRef<GameAudio | null>(null);
  const inputRef = useRef<Input>({ mx: 0, my: 0, dash: false });
  const keysRef = useRef<Set<string>>(new Set());
  const stickRef = useRef<{ id: number; ox: number; oy: number; x: number; y: number } | null>(null);
  const pausedRef = useRef(false);
  const recordedRef = useRef(false);

  const [hud, setHud] = useState<Hud>(EMPTY_HUD);
  const [stick, setStick] = useState<{ ox: number; oy: number; dx: number; dy: number } | null>(null);
  const [shop, setShop] = useState<ShopView | null>(null);
  const [muted, setMuted] = useLS<boolean>("disc.game.muted", false);
  const [best, setBest] = useLS<BestRun>("disc.game.best", { wave: 0, kills: 0, coins: 0 });

  // The audio context can only exist client-side, and only after a gesture.
  const audio = () => (audioRef.current ??= new GameAudio());

  // Opening the shop freezes the world; muting is pushed to the sound engine.
  useEffect(() => {
    pausedRef.current = shop !== null;
  }, [shop]);
  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  // ── Game loop ────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!worldRef.current) worldRef.current = createWorld();
    if (!renderRef.current) renderRef.current = createRenderState();

    let raf = 0;
    let last = performance.now();
    let hudAt = 0;

    const resize = () => {
      // 1.5× is plenty for flat-shaded polygons, and costs far fewer pixels
      // per frame than a full retina buffer.
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const world = worldRef.current;
      if (!world) return;

      if (!pausedRef.current && !document.hidden) {
        const keys = keysRef.current;
        const st = stickRef.current;
        // Joystick and keys are read in screen space, then rotated into the
        // isometric world so "up" means "away from the camera".
        let sx = 0;
        let sy = 0;
        let power = 1;
        if (st) {
          const dx = st.x - st.ox;
          const dy = st.y - st.oy;
          const d = Math.hypot(dx, dy);
          if (d > 6) {
            power = Math.min(1, d / 58);
            sx = dx;
            sy = dy;
          }
        } else {
          if (keys.has("left")) sx -= 1;
          if (keys.has("right")) sx += 1;
          if (keys.has("up")) sy -= 1;
          if (keys.has("down")) sy += 1;
        }
        const dir = sx || sy ? screenToWorldDir(sx, sy) : { x: 0, y: 0 };
        inputRef.current.mx = dir.x * power;
        inputRef.current.my = dir.y * power;
        world.events.length = 0;
        step(world, dt, inputRef.current);
        inputRef.current.dash = false;
        if (audioRef.current) for (const e of world.events) audioRef.current.handle(e);
      }

      // A finished run is a record candidate — save it the moment it ends.
      if (world.phase === "gameover" && !recordedRef.current) {
        recordedRef.current = true;
        setBest((prev) => ({
          wave: Math.max(prev.wave, world.wave),
          kills: Math.max(prev.kills, world.kills),
          coins: Math.max(prev.coins, world.coins),
        }));
      }

      const view = computeView(
        wrap.clientWidth,
        wrap.clientHeight,
        world.player.x,
        world.player.y,
      );
      render(ctx, world, renderRef.current!, view, pausedRef.current ? 0 : dt);

      // The HUD is React, so refresh it at a human rate, not 60×/s.
      if (now - hudAt > 110) {
        hudAt = now;
        setHud({
          phase: world.phase,
          wave: world.wave,
          dayLeft: world.dayLeft,
          wood: world.wood,
          raw: world.rawMeat,
          cooked: world.cookedMeat,
          coins: world.coins,
          hp: Math.max(0, Math.round(world.player.hp)),
          maxHp: world.player.maxHp,
          zombies: world.zombies.length,
          holes: fenceHoles(world),
          recruits: world.recruits.length,
          kills: world.kills,
          fed: world.fed,
          hint: world.hint,
          dashReady: world.player.dashCd <= 0,
          banner: world.nightBanner > 0,
        });
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [setBest]);

  // ── Keyboard (desktop) ───────────────────────────────────────────────────
  useEffect(() => {
    const bind = (code: string): string | null => {
      if (["ArrowLeft", "KeyA", "KeyQ"].includes(code)) return "left";
      if (["ArrowRight", "KeyD"].includes(code)) return "right";
      if (["ArrowUp", "KeyW", "KeyZ"].includes(code)) return "up";
      if (["ArrowDown", "KeyS"].includes(code)) return "down";
      return null;
    };
    const down = (e: KeyboardEvent) => {
      const k = bind(e.code);
      if (k) {
        keysRef.current.add(k);
        e.preventDefault();
      }
      if (e.code === "Space") {
        inputRef.current.dash = true;
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      const k = bind(e.code);
      if (k) keysRef.current.delete(k);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // ── Touch joystick ───────────────────────────────────────────────────────
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (stickRef.current) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    stickRef.current = { id: e.pointerId, ox: x, oy: y, x, y };
    setStick({ ox: x, oy: y, dx: 0, dy: 0 });
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const st = stickRef.current;
    if (!st || st.id !== e.pointerId) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    st.x = e.clientX - rect.left;
    st.y = e.clientY - rect.top;
    const dx = st.x - st.ox;
    const dy = st.y - st.oy;
    const d = Math.hypot(dx, dy);
    const max = 58;
    const k = d > max ? max / d : 1;
    setStick({ ox: st.ox, oy: st.oy, dx: dx * k, dy: dy * k });
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const st = stickRef.current;
    if (!st || st.id !== e.pointerId) return;
    stickRef.current = null;
    setStick(null);
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────────
  const startGame = () => {
    audio().resume();
    audio().muted = muted;
    const w = worldRef.current;
    if (w) w.phase = "day";
  };

  const restart = () => {
    audio().resume();
    const w = createWorld();
    w.phase = "day";
    worldRef.current = w;
    renderRef.current = createRenderState();
    recordedRef.current = false;
    setShop(null);
  };

  const openShop = () => {
    const w = worldRef.current;
    if (w) setShop(shopView(w));
  };

  const doBuy = (id: string) => {
    const w = worldRef.current;
    if (!w) return;
    if (buy(w, id)) {
      audio().handle("buy");
      setShop(shopView(w));
    }
  };

  const night = () => {
    const w = worldRef.current;
    if (!w) return;
    startNight(w);
    setShop(null);
  };

  const isNight = hud.phase === "night";

  return (
    <div
      ref={wrapRef}
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        background: "#0B1220",
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />

      {/* Full-surface input layer: drag anywhere to walk. */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ position: "absolute", inset: 0, touchAction: "none" }}
      />

      {/* ── Top HUD ── */}
      <div
        style={{
          position: "absolute",
          top: "calc(env(safe-area-inset-top, 0px) + 10px)",
          left: 10,
          right: 10,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          pointerEvents: "none",
        }}
      >
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <Pill icon="🪵" value={hud.wood} tone="#C98A4B" />
          <Pill icon="🥩" value={hud.raw} tone="#C9564B" />
          <Pill icon="🍖" value={hud.cooked} tone="#F0A868" />
          <Pill icon="🪙" value={hud.coins} tone="#FFC542" />
          <div style={{ flex: 1 }} />
          <button
            onClick={() => {
              audio().resume();
              setMuted(!muted);
            }}
            style={{ ...pillStyle, pointerEvents: "auto", fontSize: 15 }}
          >
            {muted ? "🔇" : "🔊"}
          </button>
          <Link href="/" style={{ ...pillStyle, pointerEvents: "auto", textDecoration: "none", fontSize: 13 }}>
            ✕
          </Link>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div
            style={{
              ...pillStyle,
              background: isNight ? "rgba(40,52,110,0.85)" : "rgba(20,26,40,0.72)",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.02em",
            }}
          >
            {isNight ? "🌙" : "☀️"} Nuit {hud.wave}
            {isNight ? ` · ${hud.zombies} restants` : ` · ${Math.ceil(hud.dayLeft)}s`}
          </div>
          {hud.holes > 0 && (
            <div style={{ ...pillStyle, background: "rgba(120,40,36,0.8)", fontSize: 12, fontWeight: 700 }}>
              ⚠️ {hud.holes} brèche{hud.holes > 1 ? "s" : ""}
            </div>
          )}
          {hud.recruits > 0 && (
            <div style={{ ...pillStyle, fontSize: 12, fontWeight: 700 }}>👥 {hud.recruits}</div>
          )}
        </div>

        {/* Health */}
        <div
          style={{
            width: 168,
            height: 12,
            borderRadius: 999,
            background: "rgba(0,0,0,0.45)",
            border: "1.5px solid rgba(255,255,255,0.18)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${(hud.hp / hud.maxHp) * 100}%`,
              height: "100%",
              background:
                hud.hp / hud.maxHp > 0.5
                  ? "linear-gradient(90deg,#3FBF7F,#7DD3A0)"
                  : "linear-gradient(90deg,#C4453B,#E4756A)",
              transition: "width 160ms linear",
            }}
          />
        </div>
      </div>

      {/* ── Contextual hint ── */}
      {hud.hint && hud.phase !== "intro" && (
        <div
          style={{
            position: "absolute",
            bottom: 148,
            left: 0,
            right: 0,
            textAlign: "center",
            pointerEvents: "none",
            color: "rgba(255,255,255,0.92)",
            fontSize: 13,
            fontWeight: 600,
            textShadow: "0 2px 8px rgba(0,0,0,0.7)",
          }}
        >
          {hud.hint}
        </div>
      )}

      {/* ── Bottom controls ── */}
      {(hud.phase === "day" || hud.phase === "night") && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 18px)",
            left: 14,
            right: 14,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 10,
            pointerEvents: "none",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8, pointerEvents: "auto" }}>
            {hud.phase === "day" && (
              <>
                <button onClick={openShop} style={actionBtn("#FF6A1A")}>
                  🪙 Boutique
                </button>
                <button onClick={night} style={actionBtn("rgba(40,52,110,0.9)")}>
                  🌙 Lancer la nuit
                </button>
              </>
            )}
          </div>
          <button
            onPointerDown={(e) => {
              e.stopPropagation();
              inputRef.current.dash = true;
            }}
            style={{
              pointerEvents: "auto",
              width: 84,
              height: 84,
              borderRadius: "50%",
              background: hud.dashReady
                ? "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.35), rgba(255,106,26,0.9))"
                : "rgba(255,255,255,0.14)",
              border: "2px solid rgba(255,255,255,0.4)",
              color: "white",
              fontSize: 13,
              fontWeight: 800,
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            }}
          >
            ESQUIVE
          </button>
        </div>
      )}

      {/* ── Virtual joystick ── */}
      {stick && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <div
            style={{
              position: "absolute",
              left: stick.ox - 62,
              top: stick.oy - 62,
              width: 124,
              height: 124,
              borderRadius: "50%",
              border: "2px solid rgba(255,255,255,0.25)",
              background: "rgba(255,255,255,0.06)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: stick.ox + stick.dx - 27,
              top: stick.oy + stick.dy - 27,
              width: 54,
              height: 54,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.32)",
              border: "2px solid rgba(255,255,255,0.55)",
            }}
          />
        </div>
      )}

      {/* ── Night banner ── */}
      {hud.banner && (
        <Banner
          title={hud.phase === "night" ? `Nuit ${hud.wave}` : `Aube — jour ${hud.wave}`}
          sub={
            hud.phase === "night"
              ? "Ils sortent de la forêt…"
              : "Répare, coupe, cuisine. Le temps file."
          }
        />
      )}

      {/* ── Intro ── */}
      {hud.phase === "intro" && (
        <Overlay>
          <div style={{ fontSize: 40, marginBottom: 4 }}>🌨️🪓🧟</div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em" }}>Congères</h1>
          <p style={{ margin: "8px 0 18px", color: "rgba(255,255,255,0.72)", fontSize: 14, lineHeight: 1.5 }}>
            Le jeu que la pub promettait. Coupe du bois, monte la palissade, tue
            les zombies, fais cuire la viande, nourris les rescapés — ils paient,
            et certains restent se battre avec toi.
            <br />
            <strong style={{ color: "#FFB077" }}>Zéro idle : rien ne se fait sans toi.</strong>
          </p>
          <ul style={ruleList}>
            <li>👆 Glisse n&apos;importe où pour marcher — la hache frappe toute seule.</li>
            <li>🌲 Près d&apos;un arbre : tu coupes. Près d&apos;un trou avec du bois : tu répares.</li>
            <li>🔥 Près du feu : tu poses la viande crue, puis tu récupères la cuite (elle brûle si tu traînes).</li>
            <li>🧍 Nourris les visiteurs affamés → pièces, et parfois un renfort.</li>
            <li>🌙 La nuit, la horde vient. Tiens la ligne.</li>
          </ul>
          <button onClick={startGame} style={bigBtn}>
            Jouer
          </button>
          {best.wave > 0 && (
            <p style={{ marginTop: 14, color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
              Record : nuit {best.wave} · {best.kills} zombies · {best.coins} 🪙
            </p>
          )}
        </Overlay>
      )}

      {/* ── Game over ── */}
      {hud.phase === "gameover" && (
        <Overlay>
          <div style={{ fontSize: 40 }}>💀</div>
          <h1 style={{ margin: "6px 0 2px", fontSize: 28, fontWeight: 800 }}>La horde t&apos;a eu</h1>
          <p style={{ margin: "4px 0 16px", color: "rgba(255,255,255,0.7)", fontSize: 14 }}>
            Tu as tenu jusqu&apos;à la <strong>nuit {hud.wave}</strong>.
          </p>
          <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap", justifyContent: "center" }}>
            <Stat label="Zombies" value={hud.kills} />
            <Stat label="Repas servis" value={hud.fed} />
            <Stat label="Pièces" value={hud.coins} />
          </div>
          <button onClick={restart} style={bigBtn}>
            Rejouer
          </button>
          <p style={{ marginTop: 14, color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
            Record : nuit {Math.max(best.wave, hud.wave)} · {Math.max(best.kills, hud.kills)} zombies
          </p>
        </Overlay>
      )}

      {/* ── Shop ── */}
      {shop && (
        <Overlay align="stretch">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Boutique du camp</h2>
            <span style={{ ...pillStyle, fontSize: 14, fontWeight: 700 }}>🪙 {shop.coins}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", flex: 1, paddingRight: 2 }}>
            {shop.rows.map((row) => (
              <button
                key={row.id}
                onClick={() => doBuy(row.id)}
                disabled={!row.afford}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: 16,
                  background: row.afford ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)",
                  border: `1.5px solid ${row.afford ? "rgba(255,176,119,0.5)" : "rgba(255,255,255,0.08)"}`,
                  opacity: row.maxed ? 0.45 : 1,
                  textAlign: "left",
                  color: "white",
                }}
              >
                <span style={{ fontSize: 24 }}>{row.icon}</span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontSize: 14, fontWeight: 700 }}>
                    {row.label}
                    {row.levelText}
                  </span>
                  <span style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
                    {row.maxed ? "Au maximum" : row.desc}
                  </span>
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: row.afford ? "#FFC542" : "rgba(255,255,255,0.35)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {row.maxed ? "—" : `${row.cost} 🪙`}
                </span>
              </button>
            ))}
          </div>
          <button onClick={() => setShop(null)} style={{ ...bigBtn, marginTop: 12 }}>
            Retour au camp
          </button>
        </Overlay>
      )}
    </div>
  );
}

// ─────────────────────────────── Bits of UI ────────────────────────────────

const pillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 11px",
  borderRadius: 999,
  background: "rgba(20,26,40,0.72)",
  border: "1.5px solid rgba(255,255,255,0.16)",
  color: "white",
  fontSize: 14,
  fontWeight: 700,
  backdropFilter: "blur(8px)",
};

function Pill({ icon, value, tone }: { icon: string; value: number; tone: string }) {
  return (
    <span style={{ ...pillStyle, borderColor: `${tone}66` }}>
      <span style={{ fontSize: 15 }}>{icon}</span>
      <span className="mono" style={{ color: tone }}>
        {value}
      </span>
    </span>
  );
}

function actionBtn(bg: string): React.CSSProperties {
  return {
    padding: "11px 16px",
    borderRadius: 14,
    background: bg,
    color: "white",
    fontSize: 14,
    fontWeight: 700,
    border: "1.5px solid rgba(255,255,255,0.25)",
    boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
  };
}

const bigBtn: React.CSSProperties = {
  padding: "14px 30px",
  borderRadius: 16,
  background: "linear-gradient(180deg,#FF8A3D,#FF6A1A)",
  color: "white",
  fontSize: 16,
  fontWeight: 800,
  border: "none",
  boxShadow: "0 10px 30px rgba(255,106,26,0.4)",
};

const ruleList: React.CSSProperties = {
  textAlign: "left",
  margin: "0 0 20px",
  padding: 0,
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
  gap: 7,
  fontSize: 13,
  lineHeight: 1.4,
  color: "rgba(255,255,255,0.78)",
};

function Overlay({
  children,
  align = "center",
}: {
  children: React.ReactNode;
  align?: "center" | "stretch";
}) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(8,12,24,0.82)",
        backdropFilter: "blur(6px)",
        display: "flex",
        flexDirection: "column",
        alignItems: align === "center" ? "center" : "stretch",
        justifyContent: "center",
        textAlign: align === "center" ? "center" : "left",
        color: "white",
        padding: "28px 22px calc(env(safe-area-inset-bottom, 0px) + 24px)",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        padding: "10px 16px",
        borderRadius: 14,
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.14)",
        minWidth: 90,
      }}
    >
      <div className="mono" style={{ fontSize: 22, fontWeight: 800 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>{label}</div>
    </div>
  );
}

function Banner({ title, sub }: { title: string; sub: string }) {
  return (
    <div
      style={{
        position: "absolute",
        top: "34%",
        left: 0,
        right: 0,
        textAlign: "center",
        pointerEvents: "none",
        color: "white",
        textShadow: "0 4px 20px rgba(0,0,0,0.8)",
      }}
    >
      <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.02em" }}>{title}</div>
      <div style={{ fontSize: 14, color: "rgba(255,255,255,0.75)" }}>{sub}</div>
    </div>
  );
}
