"use client";

import { CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { Btn } from "@/components/discipline-ui";

const W = 1080;
const H = 1920;
const LOGO_SRC = "/miniature/logo.png";

type ShadowKind = "drop+glow" | "soft-drop" | "none";
type Align = "left" | "center" | "right";

interface TextLayer {
  id: string;
  kind: "text";
  text: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  color: string;
  lineHeight: number;
  align: Align;
  letterSpacing: number;
  shadow: ShadowKind;
}

interface ImageLayer {
  id: string;
  kind: "image";
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  naturalRatio: number; // width / height — used to lock aspect on resize
  isBg?: boolean; // true = sits behind the dark gradient overlays
}

type Layer = TextLayer | ImageLayer;

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function makeDefaults(): Layer[] {
  return [
    { id: uid(), kind: "image", src: LOGO_SRC, x: 336, y: 64, width: 56, height: 58, naturalRatio: 56 / 58 },
    { id: uid(), kind: "text", text: "BRICK IA ACADEMY", x: 408, y: 80, width: 360, fontSize: 26, fontFamily: "Poppins, sans-serif", fontWeight: 600, color: "rgba(255,246,236,0.92)", lineHeight: 1.2, align: "left", letterSpacing: 7, shadow: "none" },
    { id: uid(), kind: "text", text: "TON TITRE ICI", x: 70, y: 1080, width: 940, fontSize: 140, fontFamily: "Anton, Impact, sans-serif", fontWeight: 400, color: "#FF9233", lineHeight: 1.02, align: "center", letterSpacing: 0, shadow: "drop+glow" },
    { id: uid(), kind: "text", text: "ton sous-titre en blanc juste ici", x: 110, y: 1290, width: 860, fontSize: 64, fontFamily: "Caveat, cursive", fontWeight: 700, color: "#FFF6EC", lineHeight: 1.25, align: "center", letterSpacing: 0, shadow: "soft-drop" },
  ];
}

const SHADOW_CSS: Record<ShadowKind, string | undefined> = {
  "drop+glow": "0 6px 34px rgba(0,0,0,.7),0 0 70px rgba(242,116,28,.45)",
  "soft-drop": "0 3px 18px rgba(0,0,0,.85)",
  none: undefined,
};

const FONT_OPTIONS = [
  { value: "Anton, Impact, sans-serif", label: "Anton" },
  { value: "Poppins, sans-serif", label: "Poppins" },
  { value: "Caveat, cursive", label: "Caveat" },
  { value: "Geist, sans-serif", label: "Geist" },
];

export default function MiniatureMaker() {
  const [layers, setLayers] = useState<Layer[]>(() => makeDefaults());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bgError, setBgError] = useState<string | null>(null);
  const [bgDragOver, setBgDragOver] = useState(false);
  const [scale, setScale] = useState(0.3);
  const [downloading, setDownloading] = useState(false);

  const previewWrapRef = useRef<HTMLDivElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const layerImgInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ id: string; startWorldX: number; startWorldY: number; startX: number; startY: number } | null>(null);

  const selected = layers.find((l) => l.id === selectedId) ?? null;

  // Fit preview width
  useEffect(() => {
    const update = () => {
      const el = previewWrapRef.current;
      if (!el) return;
      const w = el.clientWidth;
      setScale(Math.min(0.55, Math.max(0.16, w / W)));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Free blob: URLs created for image layers when the component unmounts.
  useEffect(() => {
    const urls = layers.filter((L) => L.kind === "image" && L.src.startsWith("blob:")).map((L) => (L as ImageLayer).src);
    return () => { urls.forEach((u) => URL.revokeObjectURL(u)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard: Delete key removes selected layer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selectedId) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        setLayers((prev) => prev.filter((L) => L.id !== selectedId));
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  /* ── file accept helpers ───────────────────────────────────────────── */

  const acceptBackground = useCallback(async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setBgError("Format non supporté — PNG / JPG / WebP.");
      return;
    }
    setBgError(null);
    const src = URL.createObjectURL(file);
    const img = await loadImage(src);
    const ratio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = W / H;
    // Cover-fit dimensions inside the 1080×1920 frame.
    let width: number;
    let height: number;
    if (ratio > canvasRatio) {
      height = H;
      width = H * ratio;
    } else {
      width = W;
      height = W / ratio;
    }
    const layer: ImageLayer = {
      id: uid(),
      kind: "image",
      src,
      x: (W - width) / 2,
      y: (H - height) / 2,
      width,
      height,
      naturalRatio: ratio,
      isBg: true,
    };
    // Insert at the back of the z-stack so it sits behind everything else.
    setLayers((prev) => [layer, ...prev]);
    setSelectedId(layer.id);
  }, []);

  const acceptImageLayer = useCallback(async (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    const src = URL.createObjectURL(file);
    const img = await loadImage(src);
    const maxW = 600;
    const ratio = img.naturalWidth / img.naturalHeight;
    const width = Math.min(maxW, img.naturalWidth);
    const height = width / ratio;
    const layer: ImageLayer = {
      id: uid(),
      kind: "image",
      src,
      x: (W - width) / 2,
      y: (H - height) / 2,
      width,
      height,
      naturalRatio: ratio,
    };
    setLayers((prev) => [...prev, layer]);
    setSelectedId(layer.id);
  }, []);

  const addTextLayer = () => {
    const layer: TextLayer = {
      id: uid(),
      kind: "text",
      text: "Nouveau texte",
      x: 140,
      y: 600,
      width: 800,
      fontSize: 90,
      fontFamily: "Anton, Impact, sans-serif",
      fontWeight: 400,
      color: "#FFFFFF",
      lineHeight: 1.1,
      align: "center",
      letterSpacing: 0,
      shadow: "soft-drop",
    };
    setLayers((prev) => [...prev, layer]);
    setSelectedId(layer.id);
  };

  /* ── drag-to-move ──────────────────────────────────────────────────── */

  const clientToWorld = (cx: number, cy: number) => {
    const el = previewWrapRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return { x: (cx - r.left) / scale, y: (cy - r.top) / scale };
  };

  const onLayerDown = (e: React.PointerEvent<HTMLElement>, L: Layer) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.stopPropagation();
    setSelectedId(L.id);
    const w = clientToWorld(e.clientX, e.clientY);
    dragRef.current = { id: L.id, startWorldX: w.x, startWorldY: w.y, startX: L.x, startY: L.y };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  };
  const onLayerMove = (e: React.PointerEvent<HTMLElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const w = clientToWorld(e.clientX, e.clientY);
    const nx = d.startX + (w.x - d.startWorldX);
    const ny = d.startY + (w.y - d.startWorldY);
    setLayers((prev) => prev.map((L) => (L.id === d.id ? { ...L, x: nx, y: ny } : L)));
  };
  const onLayerUp = (e: React.PointerEvent<HTMLElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  };

  /* ── selected layer mutators ───────────────────────────────────────── */

  const update = <T extends Layer>(patch: Partial<T>) => {
    if (!selectedId) return;
    setLayers((prev) => prev.map((L) => (L.id === selectedId ? ({ ...L, ...patch } as Layer) : L)));
  };
  const updateImageWidth = (width: number) => {
    if (!selected || selected.kind !== "image") return;
    setLayers((prev) => prev.map((L) => (L.id === selected.id ? ({ ...L, width, height: width / (L as ImageLayer).naturalRatio } as Layer) : L)));
  };
  const removeSelected = () => {
    if (!selectedId) return;
    setLayers((prev) => prev.filter((L) => L.id !== selectedId));
    setSelectedId(null);
  };
  const duplicateSelected = () => {
    if (!selected) return;
    const copy: Layer = { ...selected, id: uid(), x: selected.x + 24, y: selected.y + 24 };
    setLayers((prev) => [...prev, copy]);
    setSelectedId(copy.id);
  };
  const move = (delta: number) => {
    if (!selectedId) return;
    setLayers((prev) => {
      const idx = prev.findIndex((L) => L.id === selectedId);
      if (idx < 0) return prev;
      const target = Math.max(0, Math.min(prev.length - 1, idx + delta));
      if (target === idx) return prev;
      const next = [...prev];
      const [removed] = next.splice(idx, 1);
      next.splice(target, 0, removed);
      return next;
    });
  };
  const resetAll = () => {
    setLayers(makeDefaults());
    setSelectedId(null);
  };

  /* ── export ────────────────────────────────────────────────────────── */

  const download = async () => {
    setDownloading(true);
    try {
      await document.fonts.load("400 140px Anton");
      await document.fonts.load("700 64px Caveat");
      await document.fonts.load("600 26px Poppins");
      await document.fonts.ready;

      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // 1) Base fill
      ctx.fillStyle = "#211d1a";
      ctx.fillRect(0, 0, W, H);

      // 2) Background image layers
      for (const L of layers) {
        if (L.kind === "image" && (L as ImageLayer).isBg) {
          try {
            const img = await loadImage(L.src);
            ctx.drawImage(img, L.x, L.y, L.width, L.height);
          } catch { /* skip broken images */ }
        }
      }

      // 3) Gradient overlays
      const g1 = ctx.createLinearGradient(0, 0, 0, 340);
      g1.addColorStop(0, "rgba(26,16,6,0.82)");
      g1.addColorStop(0.45, "rgba(26,16,6,0.45)");
      g1.addColorStop(1, "rgba(26,16,6,0)");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, W, 340);

      const g2 = ctx.createLinearGradient(0, H, 0, H - 760);
      g2.addColorStop(0, "rgba(26,16,6,0.92)");
      g2.addColorStop(0.38, "rgba(26,16,6,0.7)");
      g2.addColorStop(1, "rgba(26,16,6,0)");
      ctx.fillStyle = g2;
      ctx.fillRect(0, H - 760, W, 760);

      ctx.save();
      ctx.translate(W / 2, H * 0.62);
      ctx.scale(1, 0.41);
      const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 0.39);
      rg.addColorStop(0, "rgba(26,16,6,0.6)");
      rg.addColorStop(1, "rgba(26,16,6,0)");
      ctx.fillStyle = rg;
      ctx.fillRect(-W, -H, W * 2, H * 2);
      ctx.restore();

      // 4) Foreground layers (text + non-bg images), in z-order
      for (const L of layers) {
        if (L.kind === "image" && (L as ImageLayer).isBg) continue;
        if (L.kind === "image") {
          try {
            const img = await loadImage(L.src);
            ctx.drawImage(img, L.x, L.y, L.width, L.height);
          } catch { /* skip broken images */ }
        } else {
          drawText(ctx, L);
        }
      }

      const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/png"));
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `miniature-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  /* ── render ────────────────────────────────────────────────────────── */

  return (
    <div style={{ position: "relative", zIndex: 1, padding: "20px 28px 60px", maxWidth: 1240, margin: "0 auto" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 22, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--ink)", color: "var(--orange)", display: "grid", placeItems: "center", boxShadow: "var(--shadow-md)" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 15l5-5 8 8" /><circle cx="15" cy="9" r="2" /></svg>
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em" }}>Miniature</div>
            <div style={{ fontSize: 12, color: "var(--ink-2)" }}>1080×1920 · glisse pour déplacer · sliders pour redimensionner</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn kind="ghost" size="sm" onClick={resetAll} title="Remettre le template d'origine">Reset</Btn>
          <Btn kind="primary" size="md" icon="check" onClick={download} disabled={downloading}>
            {downloading ? "Génération…" : "Télécharger PNG"}
          </Btn>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 24, alignItems: "start" }} className="mini-grid">
        {/* Left column : controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Background drop zone — adds an image as a movable & resizable back-layer */}
          <div
            onDragOver={(e) => { e.preventDefault(); setBgDragOver(true); }}
            onDragLeave={() => setBgDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setBgDragOver(false); acceptBackground(e.dataTransfer.files?.[0] ?? null); }}
            onClick={() => bgInputRef.current?.click()}
            style={{
              border: `2px dashed ${bgDragOver ? "var(--orange)" : "var(--line)"}`,
              background: bgDragOver ? "var(--orange-50)" : "var(--card)",
              borderRadius: 18,
              padding: 18,
              display: "flex",
              gap: 14,
              alignItems: "center",
              cursor: "pointer",
              transition: "all 200ms var(--ease-out)",
            }}
          >
            <div style={{ width: 50, height: 50, borderRadius: 12, background: "var(--orange-50)", color: "var(--orange)", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>Glisse une image de fond ici</div>
              <div style={{ fontSize: 12, color: "var(--ink-2)" }}>Se met derrière les dégradés · clique-la ensuite pour la déplacer / redimensionner</div>
              {bgError && <div style={{ fontSize: 12, color: "#C44A00", marginTop: 4 }}>{bgError}</div>}
            </div>
            <input ref={bgInputRef} type="file" accept="image/*" hidden onChange={(e) => acceptBackground(e.target.files?.[0] ?? null)} />
          </div>

          {/* Add layer buttons */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn kind="soft" size="sm" icon="plus" onClick={addTextLayer}>Ajouter un texte</Btn>
            <Btn kind="soft" size="sm" icon="plus" onClick={() => layerImgInputRef.current?.click()}>Ajouter une image</Btn>
            <input ref={layerImgInputRef} type="file" accept="image/*" hidden onChange={(e) => { acceptImageLayer(e.target.files?.[0] ?? null); if (layerImgInputRef.current) layerImgInputRef.current.value = ""; }} />
          </div>

          {/* Selected layer controls */}
          <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 18, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>
                {selected ? `Calque sélectionné · ${selected.kind === "text" ? "texte" : "image"}` : "Calque sélectionné"}
              </div>
              {selected && (
                <div style={{ display: "flex", gap: 4 }}>
                  <IconBtn title="Reculer" onClick={() => move(-1)}>↓</IconBtn>
                  <IconBtn title="Avancer" onClick={() => move(1)}>↑</IconBtn>
                  <IconBtn title="Dupliquer" onClick={duplicateSelected}>⎘</IconBtn>
                  <IconBtn title="Supprimer" onClick={removeSelected} danger>✕</IconBtn>
                </div>
              )}
            </div>

            {!selected && (
              <div style={{ fontSize: 13, color: "var(--ink-2)" }}>
                Clique un texte ou une image dans l&apos;aperçu pour le modifier.
              </div>
            )}

            {selected?.kind === "text" && (
              <>
                <Label name="Texte">
                  <textarea
                    value={selected.text}
                    onChange={(e) => update<TextLayer>({ text: e.target.value })}
                    rows={2}
                    style={inputBase({ fontFamily: selected.fontFamily, fontSize: 16 })}
                  />
                </Label>
                <Slider
                  label="Taille de police"
                  min={12}
                  max={260}
                  step={2}
                  value={selected.fontSize}
                  onChange={(v) => update<TextLayer>({ fontSize: v })}
                  unit="px"
                />
                <Slider
                  label="Largeur du bloc"
                  min={200}
                  max={W}
                  step={10}
                  value={selected.width}
                  onChange={(v) => update<TextLayer>({ width: v })}
                  unit="px"
                />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {(["left", "center", "right"] as const).map((a) => (
                    <button
                      key={a}
                      onClick={() => update<TextLayer>({ align: a })}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 10,
                        background: selected.align === a ? "var(--orange)" : "var(--bg-2)",
                        color: selected.align === a ? "white" : "var(--ink-2)",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {a === "left" ? "← Gauche" : a === "center" ? "Centré" : "Droite →"}
                    </button>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "end" }}>
                  <Label name="Police">
                    <select
                      value={selected.fontFamily}
                      onChange={(e) => update<TextLayer>({ fontFamily: e.target.value })}
                      style={inputBase({ fontSize: 13 })}
                    >
                      {FONT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </Label>
                  <Label name="Couleur">
                    <input
                      type="color"
                      value={asHex(selected.color)}
                      onChange={(e) => update<TextLayer>({ color: e.target.value })}
                      style={{ ...inputBase({}), padding: 4, height: 40, cursor: "pointer" }}
                    />
                  </Label>
                </div>
              </>
            )}

            {selected?.kind === "image" && (
              <>
                <Slider
                  label="Largeur"
                  min={40}
                  max={W}
                  step={10}
                  value={Math.round(selected.width)}
                  onChange={(v) => updateImageWidth(v)}
                  unit="px"
                />
                <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
                  Hauteur : {Math.round(selected.height)} px (proportion conservée)
                </div>
              </>
            )}
          </div>

          <div style={{ fontSize: 11.5, color: "var(--ink-3)", lineHeight: 1.5 }}>
            Glisse les calques pour les déplacer. <kbd style={{ fontFamily: "Geist Mono, monospace", background: "var(--bg-2)", padding: "1px 6px", borderRadius: 4 }}>Suppr</kbd> retire celui sélectionné. Tout reste dans ton navigateur, rien n&apos;est envoyé.
          </div>
        </div>

        {/* Right column : preview */}
        <div ref={previewWrapRef} style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div
            onPointerDown={() => setSelectedId(null)}
            style={{
              width: W * scale,
              height: H * scale,
              position: "relative",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 20px 50px rgba(0,0,0,.45)",
              background: "#211d1a",
              userSelect: "none",
              touchAction: "none",
            }}
          >
            <div
              style={{
                width: W,
                height: H,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                position: "absolute",
                inset: 0,
              }}
            >
              {/* Background image layers go behind the gradient overlays. */}
              {layers.filter((L) => L.kind === "image" && (L as ImageLayer).isBg).map((L) => (
                <LayerNode key={L.id} L={L} selected={selectedId === L.id} scale={scale} onDown={onLayerDown} onMove={onLayerMove} onUp={onLayerUp} />
              ))}

              {/* gradients */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 340, background: "linear-gradient(180deg,rgba(26,16,6,.82) 0%,rgba(26,16,6,.45) 45%,rgba(26,16,6,0) 100%)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 760, background: "linear-gradient(0deg,rgba(26,16,6,.92) 0%,rgba(26,16,6,.7) 38%,rgba(26,16,6,0) 100%)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 78% 32% at 50% 62%,rgba(26,16,6,.6) 0%,rgba(26,16,6,0) 70%)", pointerEvents: "none" }} />

              {/* Foreground layers sit on top of the gradients. */}
              {layers.filter((L) => !(L.kind === "image" && (L as ImageLayer).isBg)).map((L) => (
                <LayerNode key={L.id} L={L} selected={selectedId === L.id} scale={scale} onDown={onLayerDown} onMove={onLayerMove} onUp={onLayerUp} />
              ))}
            </div>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>Aperçu — export final 1080×1920.</div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .mini-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

/* ── layer node (used in both bg and fg passes) ───────────────────────── */

function LayerNode({
  L,
  selected,
  scale,
  onDown,
  onMove,
  onUp,
}: {
  L: Layer;
  selected: boolean;
  scale: number;
  onDown: (e: React.PointerEvent<HTMLElement>, L: Layer) => void;
  onMove: (e: React.PointerEvent<HTMLElement>) => void;
  onUp: (e: React.PointerEvent<HTMLElement>) => void;
}) {
  const outline = selected ? `${Math.max(2 / scale, 4)}px dashed #FF6A1A` : "none";
  const outlineOffset: CSSProperties["outlineOffset"] = selected ? `${4 / scale}px` : 0;
  const common: CSSProperties = {
    position: "absolute",
    left: L.x,
    top: L.y,
    cursor: "move",
    outline,
    outlineOffset,
    touchAction: "none",
  };
  if (L.kind === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={L.src}
        alt=""
        draggable={false}
        onPointerDown={(e) => onDown(e, L)}
        onPointerMove={onMove}
        onPointerUp={onUp}
        style={{ ...common, width: L.width, height: L.height, userSelect: "none" }}
      />
    );
  }
  return (
    <div
      onPointerDown={(e) => onDown(e, L)}
      onPointerMove={onMove}
      onPointerUp={onUp}
      style={{
        ...common,
        width: L.width,
        fontFamily: L.fontFamily,
        fontSize: L.fontSize,
        fontWeight: L.fontWeight,
        color: L.color,
        lineHeight: L.lineHeight,
        textAlign: L.align,
        letterSpacing: L.letterSpacing,
        textShadow: SHADOW_CSS[L.shadow],
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {L.text || " "}
    </div>
  );
}

/* ── small UI helpers ─────────────────────────────────────────────────── */

function Label({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>{name}</span>
      {children}
    </label>
  );
}

function inputBase(extra: CSSProperties): CSSProperties {
  return {
    width: "100%",
    padding: "10px 12px",
    background: "var(--bg-2)",
    border: "1px solid transparent",
    borderRadius: 10,
    outline: "none",
    resize: "vertical",
    color: "var(--ink)",
    ...extra,
  };
}

function Slider({ label, min, max, step, value, onChange, unit }: { label: string; min: number; max: number; step?: number; value: number; onChange: (v: number) => void; unit?: string }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>{label}</span>
        <span className="mono" style={{ fontSize: 12, color: "var(--ink-2)" }}>{Math.round(value)}{unit ? ` ${unit}` : ""}</span>
      </div>
      <input type="range" min={min} max={max} step={step ?? 1} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ accentColor: "var(--orange)", width: "100%" }} />
    </label>
  );
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

function asHex(color: string): string {
  // <input type="color"> wants #RRGGBB. Best-effort convert; fall back to white.
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color;
  const m = color.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b] = m[1].split(",").map((s) => Math.max(0, Math.min(255, Math.round(Number(s.trim())))));
    return "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("");
  }
  return "#ffffff";
}

/* ── canvas helpers ───────────────────────────────────────────────────── */

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  for (const paragraph of text.split(/\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) { out.push(""); continue; }
    let line = "";
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxWidth && line) {
        out.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

function drawText(ctx: CanvasRenderingContext2D, L: TextLayer) {
  ctx.save();
  const family = L.fontFamily.split(",")[0].trim();
  ctx.font = `${L.fontWeight} ${L.fontSize}px ${family}`;
  const ctxAny = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  if (L.letterSpacing) ctxAny.letterSpacing = `${L.letterSpacing}px`;
  ctx.textBaseline = "top";
  ctx.textAlign = L.align;
  const drawX = L.align === "left" ? L.x : L.align === "right" ? L.x + L.width : L.x + L.width / 2;
  const lines = wrap(ctx, L.text, L.width);
  const lineH = L.fontSize * L.lineHeight;
  const fill = (drawShadow: () => void) => {
    drawShadow();
    ctx.fillStyle = L.color;
    lines.forEach((ln, i) => ctx.fillText(ln, drawX, L.y + i * lineH));
  };
  if (L.shadow === "drop+glow") {
    fill(() => { ctx.shadowColor = "rgba(242,116,28,0.45)"; ctx.shadowBlur = 70; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; });
    fill(() => { ctx.shadowColor = "rgba(0,0,0,0.7)"; ctx.shadowBlur = 34; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 6; });
  } else if (L.shadow === "soft-drop") {
    fill(() => { ctx.shadowColor = "rgba(0,0,0,0.85)"; ctx.shadowBlur = 18; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 3; });
  } else {
    fill(() => { ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; });
  }
  ctx.restore();
}
