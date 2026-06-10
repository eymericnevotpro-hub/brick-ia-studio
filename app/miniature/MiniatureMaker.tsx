"use client";

import { CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { Btn } from "@/components/discipline-ui";

const W = 1080;
const H = 1920;
const LOGO_SRC = "/miniature/logo.png";

export default function MiniatureMaker() {
  const [title, setTitle] = useState("TON TITRE ICI");
  const [subtitle, setSubtitle] = useState("ton sous-titre en blanc juste ici");
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [bgError, setBgError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [scale, setScale] = useState(0.3);
  const [downloading, setDownloading] = useState(false);
  const previewWrapRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fit preview to its container width.
  useEffect(() => {
    const update = () => {
      const el = previewWrapRef.current;
      if (!el) return;
      const w = el.clientWidth;
      setScale(Math.min(0.55, Math.max(0.18, w / W)));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Free object URLs we create.
  useEffect(() => {
    return () => { if (bgUrl) URL.revokeObjectURL(bgUrl); };
  }, [bgUrl]);

  const acceptFile = useCallback((file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setBgError("Format non supporté : choisis une image (PNG / JPG / WebP).");
      return;
    }
    setBgError(null);
    setBgUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    acceptFile(e.dataTransfer.files?.[0] ?? null);
  };

  const download = async () => {
    setDownloading(true);
    try {
      // Wait for the fonts we will paint with.
      await document.fonts.load("400 140px Anton");
      await document.fonts.load("700 64px Caveat");
      await document.fonts.load("600 26px Poppins");
      await document.fonts.ready;

      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // 1) Background image (cover-fit). If none, transparent.
      if (bgUrl) {
        const img = await loadImage(bgUrl);
        drawCover(ctx, img, 0, 0, W, H);
      } else {
        ctx.fillStyle = "#211d1a";
        ctx.fillRect(0, 0, W, H);
      }

      // 2) Top dark gradient
      const g1 = ctx.createLinearGradient(0, 0, 0, 340);
      g1.addColorStop(0, "rgba(26,16,6,0.82)");
      g1.addColorStop(0.45, "rgba(26,16,6,0.45)");
      g1.addColorStop(1, "rgba(26,16,6,0)");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, W, 340);

      // 3) Bottom dark gradient (760px)
      const g2 = ctx.createLinearGradient(0, H, 0, H - 760);
      g2.addColorStop(0, "rgba(26,16,6,0.92)");
      g2.addColorStop(0.38, "rgba(26,16,6,0.7)");
      g2.addColorStop(1, "rgba(26,16,6,0)");
      ctx.fillStyle = g2;
      ctx.fillRect(0, H - 760, W, 760);

      // 4) Soft elliptical vignette around the title area
      ctx.save();
      ctx.translate(W / 2, H * 0.62);
      ctx.scale(1, 0.405);
      const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 0.39);
      rg.addColorStop(0, "rgba(26,16,6,0.6)");
      rg.addColorStop(1, "rgba(26,16,6,0)");
      ctx.fillStyle = rg;
      ctx.fillRect(-W, -H, W * 2, H * 2);
      ctx.restore();

      // 5) Logo + "BRICK IA ACADEMY" header at top
      const logo = await loadImage(LOGO_SRC);
      const logoW = 56;
      const logoH = 58;
      const headerY = 64;
      const headerText = "BRICK IA ACADEMY";
      ctx.font = "600 26px Poppins, system-ui, sans-serif";
      // letterSpacing on CanvasRenderingContext2D (Chromium 99+, Firefox 112+).
      const ctxAny = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
      const prevLs = ctxAny.letterSpacing;
      ctxAny.letterSpacing = "7px";
      const tw = ctx.measureText(headerText).width;
      ctxAny.letterSpacing = prevLs ?? "0px";
      const gap = 16;
      const total = logoW + gap + tw;
      const headerX = (W - total) / 2;
      ctx.drawImage(logo, headerX, headerY, logoW, logoH);
      ctxAny.letterSpacing = "7px";
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(255,246,236,0.92)";
      ctx.fillText(headerText, headerX + logoW + gap, headerY + logoH / 2);
      ctxAny.letterSpacing = prevLs ?? "0px";

      // 6) Small orange separator bar at y=150
      const sepW = 120;
      const sepH = 6;
      const sepX = (W - sepW) / 2;
      const sepY = 150;
      const sepGrad = ctx.createLinearGradient(sepX, 0, sepX + sepW, 0);
      sepGrad.addColorStop(0, "rgba(242,116,28,0)");
      sepGrad.addColorStop(0.5, "#FF9233");
      sepGrad.addColorStop(1, "rgba(242,116,28,0)");
      ctx.fillStyle = sepGrad;
      roundRect(ctx, sepX, sepY, sepW, sepH, 3);
      ctx.fill();

      // 7) Bottom block : thick bar + title + subtitle, centered
      const blockLeft = 70;
      const blockRight = W - 70;
      const blockWidth = blockRight - blockLeft;
      const blockTop = 1080;
      const gapY = 30;

      // Thick bar (140×12)
      const barW = 140;
      const barH = 12;
      const barX = (W - barW) / 2;
      const barY = blockTop;
      const barGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
      barGrad.addColorStop(0, "#F2741C");
      barGrad.addColorStop(1, "#FF9233");
      ctx.save();
      ctx.shadowColor = "rgba(242,116,28,0.55)";
      ctx.shadowBlur = 30;
      ctx.fillStyle = barGrad;
      roundRect(ctx, barX, barY, barW, barH, 6);
      ctx.fill();
      ctx.restore();

      // Title (Anton 140px orange)
      const titleY = barY + barH + gapY;
      ctx.font = "400 140px Anton, Impact, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const titleLines = wrap(ctx, title.trim() || " ", blockWidth);
      const titleLineH = 140 * 1.02;
      ctx.fillStyle = "#FF9233";
      // First pass : warm orange glow
      ctx.save();
      ctx.shadowColor = "rgba(242,116,28,0.45)";
      ctx.shadowBlur = 70;
      titleLines.forEach((ln, i) => ctx.fillText(ln, W / 2, titleY + i * titleLineH));
      ctx.restore();
      // Second pass : drop shadow + crisp text
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.7)";
      ctx.shadowBlur = 34;
      ctx.shadowOffsetY = 6;
      titleLines.forEach((ln, i) => ctx.fillText(ln, W / 2, titleY + i * titleLineH));
      ctx.restore();

      // Subtitle (Caveat 64px white)
      const subtitleY = titleY + titleLines.length * titleLineH + gapY;
      ctx.font = "700 64px Caveat, cursive";
      ctx.fillStyle = "#FFF6EC";
      const subMaxW = Math.min(860, blockWidth);
      const subLines = wrap(ctx, subtitle.trim() || " ", subMaxW);
      const subLineH = 64 * 1.25;
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.85)";
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 3;
      subLines.forEach((ln, i) => ctx.fillText(ln, W / 2, subtitleY + i * subLineH));
      ctx.restore();

      // Export to PNG
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

  // ── Inline live preview that mirrors the template ──────────────────────
  const previewBox: CSSProperties = {
    width: W * scale,
    height: H * scale,
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: "0 20px 50px rgba(0,0,0,.45)",
    background: bgUrl ? `url(${bgUrl}) center/cover no-repeat` : "#211d1a",
    margin: "0 auto",
  };
  const inner: CSSProperties = {
    width: W,
    height: H,
    transform: `scale(${scale})`,
    transformOrigin: "top left",
    position: "absolute",
    inset: 0,
    overflow: "hidden",
  };

  return (
    <div style={{ position: "relative", zIndex: 1, padding: "20px 28px 60px", maxWidth: 1240, margin: "0 auto" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 22, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--ink)", color: "var(--orange)", display: "grid", placeItems: "center", boxShadow: "var(--shadow-md)" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 15l5-5 8 8"/><circle cx="15" cy="9" r="2"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em" }}>Miniature</div>
            <div style={{ fontSize: 12, color: "var(--ink-2)" }}>Overlay 9:16 · 1080×1920 · export PNG</div>
          </div>
        </div>
        <Btn kind="primary" size="md" icon="check" onClick={download} disabled={downloading}>
          {downloading ? "Génération…" : "Télécharger PNG"}
        </Btn>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 24, alignItems: "start" }} className="mini-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? "var(--orange)" : "var(--line)"}`,
              background: dragOver ? "var(--orange-50)" : "var(--card)",
              borderRadius: 18,
              padding: 22,
              display: "flex",
              gap: 16,
              alignItems: "center",
              cursor: "pointer",
              transition: "all 200ms var(--ease-out)",
            }}
          >
            <div style={{ width: 60, height: 60, borderRadius: 12, background: "var(--orange-50)", color: "var(--orange)", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                {bgUrl ? "Image chargée — clique pour en choisir une autre" : "Glisse une image ici"}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
                Ou clique pour parcourir · PNG / JPG / WebP · va en fond derrière l&apos;overlay
              </div>
              {bgError && <div style={{ fontSize: 12, color: "#C44A00", marginTop: 6 }}>{bgError}</div>}
            </div>
            {bgUrl && (
              <button
                onClick={(e) => { e.stopPropagation(); if (bgUrl) URL.revokeObjectURL(bgUrl); setBgUrl(null); }}
                title="Retirer l'image"
                style={{ padding: "6px 12px", borderRadius: 999, background: "var(--bg-2)", color: "var(--ink-2)", fontSize: 12.5, fontWeight: 600 }}
              >
                Retirer
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => acceptFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {/* Text fields */}
          <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 18, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
            <Label name="Titre orange (Anton)">
              <textarea
                value={title}
                onChange={(e) => setTitle(e.target.value.toUpperCase())}
                rows={2}
                placeholder="TON TITRE ICI"
                style={inputStyle({ fontFamily: "Anton, Impact, sans-serif", fontSize: 22, letterSpacing: 0.5, color: "#FF9233" })}
              />
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>Tout en majuscules · 1 à 3 lignes max pour rester lisible.</div>
            </Label>
            <Label name="Sous-titre manuscrit (Caveat)">
              <textarea
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                rows={2}
                placeholder="ton sous-titre en blanc juste ici"
                style={inputStyle({ fontFamily: "Caveat, cursive", fontSize: 22, color: "var(--ink)" })}
              />
            </Label>
          </div>

          <div style={{ fontSize: 11.5, color: "var(--ink-3)", lineHeight: 1.5 }}>
            L&apos;export final fait <b>1080×1920 px</b>. Tout le rendu se fait dans ton navigateur, rien n&apos;est envoyé sur un serveur.
          </div>
        </div>

        <div ref={previewWrapRef} style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div style={previewBox} aria-label="Aperçu de la miniature">
            <div style={inner}>
              {/* gradients */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 340, background: "linear-gradient(180deg,rgba(26,16,6,.82) 0%,rgba(26,16,6,.45) 45%,rgba(26,16,6,0) 100%)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 760, background: "linear-gradient(0deg,rgba(26,16,6,.92) 0%,rgba(26,16,6,.7) 38%,rgba(26,16,6,0) 100%)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 78% 32% at 50% 62%,rgba(26,16,6,.6) 0%,rgba(26,16,6,0) 70%)", pointerEvents: "none" }} />

              {/* header */}
              <div style={{ position: "absolute", top: 64, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={LOGO_SRC} alt="Brick IA Academy" style={{ width: 56, height: 58 }} />
                  <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: 600, fontSize: 26, letterSpacing: 7, color: "rgba(255,246,236,.92)" }}>BRICK IA ACADEMY</span>
                </div>
              </div>

              {/* small separator */}
              <div style={{ position: "absolute", top: 150, left: "50%", transform: "translateX(-50%)", width: 120, height: 6, borderRadius: 3, background: "linear-gradient(90deg,rgba(242,116,28,0),#FF9233,rgba(242,116,28,0))" }} />

              {/* bottom title block */}
              <div style={{ position: "absolute", left: 70, right: 70, top: 1080, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 30 }}>
                <div style={{ width: 140, height: 12, borderRadius: 6, background: "linear-gradient(90deg,#F2741C,#FF9233)", boxShadow: "0 0 30px rgba(242,116,28,.55)" }} />
                <div style={{ fontFamily: "Anton, Impact, sans-serif", fontSize: 140, lineHeight: 1.02, color: "#FF9233", textShadow: "0 6px 34px rgba(0,0,0,.7),0 0 70px rgba(242,116,28,.45)", whiteSpace: "pre-wrap", wordWrap: "break-word" }}>
                  {title || " "}
                </div>
                <div style={{ fontFamily: "Caveat, cursive", fontWeight: 700, fontSize: 64, lineHeight: 1.25, color: "#FFF6EC", textShadow: "0 3px 18px rgba(0,0,0,.85)", maxWidth: 860, whiteSpace: "pre-wrap" }}>
                  {subtitle || " "}
                </div>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>Aperçu — rendu final en 1080×1920 au téléchargement.</div>
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

/* ── helpers ─────────────────────────────────────────────────────────── */

function Label({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>{name}</span>
      {children}
    </label>
  );
}

function inputStyle(extra: CSSProperties): CSSProperties {
  return {
    width: "100%",
    padding: "12px 14px",
    background: "var(--bg-2)",
    border: "1px solid transparent",
    borderRadius: 12,
    outline: "none",
    resize: "vertical",
    minHeight: 56,
    ...extra,
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const sr = img.width / img.height;
  const dr = w / h;
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;
  if (sr > dr) {
    sh = img.height;
    sw = sh * dr;
    sx = (img.width - sw) / 2;
  } else {
    sw = img.width;
    sh = sw / dr;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
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
