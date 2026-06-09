"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  NormalizedLandmark,
  PoseLandmarker as PLClass,
  PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";
import { Btn, useLS } from "@/components/discipline-ui";

type Position = "lean" | "tuck" | "adv-tuck" | "straddle" | "full";
type Status = "idle" | "loading" | "running" | "error";

interface PositionTarget {
  label: string;
  back: [number, number]; // valid back-angle range (deg vs horizontal)
  arm: [number, number]; // valid elbow angle range (deg)
  knee?: [number, number]; // optional valid knee angle range (deg)
}

const POSITIONS: { id: Position; label: string }[] = [
  { id: "lean", label: "Planche Lean" },
  { id: "tuck", label: "Tuck" },
  { id: "adv-tuck", label: "Adv Tuck" },
  { id: "straddle", label: "Straddle" },
  { id: "full", label: "Full Planche" },
];

const TARGETS: Record<Position, PositionTarget> = {
  lean: { label: "Planche Lean", back: [-55, -15], arm: [160, 200] },
  tuck: { label: "Tuck Planche", back: [-18, 18], arm: [160, 200], knee: [30, 110] },
  "adv-tuck": { label: "Adv Tuck", back: [-15, 15], arm: [160, 200], knee: [60, 135] },
  straddle: { label: "Straddle", back: [-15, 15], arm: [160, 200], knee: [150, 200] },
  full: { label: "Full Planche", back: [-12, 12], arm: [160, 200], knee: [155, 200] },
};

// MediaPipe pose landmark indices (subset we use).
const LM = {
  L: { shoulder: 11, elbow: 13, wrist: 15, hip: 23, knee: 25, ankle: 27 },
  R: { shoulder: 12, elbow: 14, wrist: 16, hip: 24, knee: 26, ankle: 28 },
};

function vecAngle(a: NormalizedLandmark, b: NormalizedLandmark): number {
  // Angle of vector a→b vs horizontal. Image y grows downward, so we flip y.
  return (Math.atan2(-(b.y - a.y), b.x - a.x) * 180) / Math.PI;
}

function jointAngle(a: NormalizedLandmark, b: NormalizedLandmark, c: NormalizedLandmark): number {
  const bax = a.x - b.x;
  const bay = a.y - b.y;
  const bcx = c.x - b.x;
  const bcy = c.y - b.y;
  const dot = bax * bcx + bay * bcy;
  const ma = Math.hypot(bax, bay);
  const mc = Math.hypot(bcx, bcy);
  if (ma === 0 || mc === 0) return 0;
  return (Math.acos(Math.max(-1, Math.min(1, dot / (ma * mc)))) * 180) / Math.PI;
}

function avgVis(lm: NormalizedLandmark[], idxs: number[]): number {
  let s = 0;
  let n = 0;
  for (const i of idxs) {
    const v = lm[i]?.visibility ?? 0;
    s += v;
    n++;
  }
  return n > 0 ? s / n : 0;
}

interface Metrics {
  side: "L" | "R";
  backAngle: number;
  armAngle: number;
  kneeAngle: number;
  hipShoulderDeltaY: number; // |y_hip - y_shoulder|, normalized
  visibility: number;
}

function computeMetrics(landmarks: NormalizedLandmark[]): Metrics | null {
  const visL = avgVis(landmarks, [LM.L.shoulder, LM.L.hip, LM.L.knee, LM.L.elbow]);
  const visR = avgVis(landmarks, [LM.R.shoulder, LM.R.hip, LM.R.knee, LM.R.elbow]);
  if (Math.max(visL, visR) < 0.4) return null;
  const side: "L" | "R" = visL >= visR ? "L" : "R";
  const k = LM[side];
  const sh = landmarks[k.shoulder];
  const el = landmarks[k.elbow];
  const wr = landmarks[k.wrist];
  const hp = landmarks[k.hip];
  const kn = landmarks[k.knee];
  const an = landmarks[k.ankle];
  if (!sh || !el || !wr || !hp || !kn || !an) return null;
  return {
    side,
    backAngle: vecAngle(sh, hp),
    armAngle: jointAngle(sh, el, wr),
    kneeAngle: jointAngle(hp, kn, an),
    hipShoulderDeltaY: Math.abs(hp.y - sh.y),
    visibility: (visL + visR) / 2,
  };
}

function inRange(v: number, [lo, hi]: [number, number]): boolean {
  return v >= lo && v <= hi;
}

function checkPosition(m: Metrics, target: PositionTarget): {
  ok: boolean;
  back: boolean;
  arm: boolean;
  knee: boolean;
  hips: boolean;
} {
  const back = inRange(m.backAngle, target.back);
  const arm = inRange(m.armAngle, target.arm);
  const knee = target.knee ? inRange(m.kneeAngle, target.knee) : true;
  const hips = m.hipShoulderDeltaY < 0.18; // shoulders & hips roughly level
  // For lean we don't require hips-level (body is diagonal).
  const hipsOk = target.label === "Planche Lean" ? true : hips;
  return { ok: back && arm && knee && hipsOk, back, arm, knee, hips: hipsOk };
}

function fmtTime(ms: number): string {
  const total = Math.max(0, ms / 1000);
  if (total < 60) return total.toFixed(1) + " s";
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  return `${m}m${String(s).padStart(2, "0")}s`;
}

export default function PlancheCoach() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState<Position>("tuck");
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [holdMs, setHoldMs] = useState(0);
  const [best, setBest] = useLS<Record<Position, number>>("disc.planche.best", {
    lean: 0,
    tuck: 0,
    "adv-tuck": 0,
    straddle: 0,
    full: 0,
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<PLClass | null>(null);
  const rafRef = useRef(0);
  const enterTsRef = useRef<number | null>(null);
  const lastOutRef = useRef<number>(0);
  const sessionBestRef = useRef(0);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (detectorRef.current) {
      try { detectorRef.current.close(); } catch { /* ignore */ }
      detectorRef.current = null;
    }
    enterTsRef.current = null;
    sessionBestRef.current = 0;
    setStatus("idle");
    setMetrics(null);
    setHoldMs(0);
  }, []);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  const start = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      // 1) Camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("Vidéo indisponible");
      video.srcObject = stream;
      await video.play();

      // 2) Pose detector
      const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm",
      );
      const detector = await PoseLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
      });
      detectorRef.current = detector;
      setStatus("running");

      // 3) Detection loop
      const loop = () => {
        const v = videoRef.current;
        const cv = canvasRef.current;
        const d = detectorRef.current;
        if (!v || !cv || !d || v.readyState < 2) {
          rafRef.current = requestAnimationFrame(loop);
          return;
        }
        const now = performance.now();
        let result: PoseLandmarkerResult;
        try {
          result = d.detectForVideo(v, now);
        } catch {
          rafRef.current = requestAnimationFrame(loop);
          return;
        }
        const landmarks = result.landmarks?.[0];
        if (!landmarks) {
          drawNothing(cv, v);
          rafRef.current = requestAnimationFrame(loop);
          return;
        }
        const m = computeMetrics(landmarks);
        setMetrics(m);
        const target = TARGETS[position];
        if (m) {
          const check = checkPosition(m, target);
          if (check.ok) {
            if (enterTsRef.current == null) enterTsRef.current = now;
            const dur = now - enterTsRef.current;
            setHoldMs(dur);
            if (dur > sessionBestRef.current) sessionBestRef.current = dur;
          } else {
            // Allow short drops (300ms) without resetting — anti-flicker.
            if (enterTsRef.current != null) {
              if (now - lastOutRef.current > 300) {
                // commit best
                const finalSec = Math.floor(sessionBestRef.current / 1000);
                if (finalSec > (best[position] || 0)) {
                  setBest((prev) => ({ ...prev, [position]: finalSec }));
                }
                enterTsRef.current = null;
                sessionBestRef.current = 0;
                setHoldMs(0);
              }
            }
            lastOutRef.current = now;
          }
        }
        drawSkeleton(cv, v, landmarks, facing === "user");
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      setError(msg.includes("Permission") || msg.includes("denied") ? "Accès caméra refusé." : msg);
      setStatus("error");
      stop();
    }
  }, [facing, position, best, setBest, stop]);

  const target = TARGETS[position];
  const check = metrics ? checkPosition(metrics, target) : null;

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
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: status === "running" ? "var(--orange)" : "var(--ink-3)", boxShadow: status === "running" ? "0 0 0 4px rgba(255,106,26,0.18)" : "none" }} />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>Coach caméra · analyse en temps réel</h3>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--orange)", background: "var(--orange-50)", padding: "2px 8px", borderRadius: 999, letterSpacing: "0.06em", textTransform: "uppercase" }}>Beta</span>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 4 }}>
            Vue de côté · 100 % local, rien n&apos;est envoyé.
          </div>
        </div>
        {!open && (
          <Btn kind="primary" size="md" icon="play" onClick={() => setOpen(true)}>
            Activer la caméra
          </Btn>
        )}
        {open && (
          <Btn kind="ghost" size="sm" onClick={() => { stop(); setOpen(false); }}>
            Fermer
          </Btn>
        )}
      </div>

      {open && (
        <>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {POSITIONS.map((p) => {
              const active = position === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => { setPosition(p.id); enterTsRef.current = null; sessionBestRef.current = 0; setHoldMs(0); }}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 999,
                    fontSize: 12.5,
                    fontWeight: 600,
                    background: active ? "var(--orange)" : "var(--bg-2)",
                    color: active ? "white" : "var(--ink-2)",
                    border: "1px solid transparent",
                    transition: "all 220ms var(--ease-out)",
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <div
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "16 / 9",
              background: "var(--ink)",
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            <video
              ref={videoRef}
              playsInline
              muted
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                transform: facing === "user" ? "scaleX(-1)" : "none",
              }}
            />
            <canvas
              ref={canvasRef}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
              }}
            />
            {status !== "running" && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "grid",
                  placeItems: "center",
                  background: "rgba(26,18,8,0.65)",
                  color: "white",
                  textAlign: "center",
                  padding: 24,
                }}
              >
                {status === "loading" && <div>Chargement du modèle…</div>}
                {status === "error" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{error || "Erreur"}</div>
                    <Btn kind="primary" size="sm" onClick={start}>Réessayer</Btn>
                  </div>
                )}
                {status === "idle" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>Place le téléphone de côté, pose-le sur un support stable.</div>
                    <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.7)", maxWidth: 360 }}>
                      Active la caméra ci-dessous. Tout le traitement reste sur ton appareil.
                    </div>
                    <Btn kind="primary" size="md" icon="play" onClick={start}>Démarrer l&apos;analyse</Btn>
                    <button
                      onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
                      style={{ fontSize: 12, color: "var(--orange-soft)", textDecoration: "underline" }}
                    >
                      Caméra : {facing === "user" ? "avant" : "arrière"} — basculer
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            <Tile label="Hold en cours" big={fmtTime(holdMs)} accent={status === "running" && holdMs > 0} />
            <Tile label={`Record ${TARGETS[position].label}`} big={`${best[position] || 0} s`} />
            <Tile
              label="Dos"
              big={metrics ? `${Math.round(metrics.backAngle)}°` : "—"}
              good={check?.back}
              hint="cible ±15°"
            />
            <Tile
              label="Bras"
              big={metrics ? `${Math.round(metrics.armAngle)}°` : "—"}
              good={check?.arm}
              hint="cible ≥160°"
            />
            {target.knee && (
              <Tile
                label="Jambes"
                big={metrics ? `${Math.round(metrics.kneeAngle)}°` : "—"}
                good={check?.knee}
                hint={`cible ${target.knee[0]}-${target.knee[1]}°`}
              />
            )}
          </div>

          <div style={{ fontSize: 11.5, color: "var(--ink-3)", lineHeight: 1.5 }}>
            Astuce : la détection marche mieux en t-shirt près du corps, fond simple, lumière correcte. Si rien
            ne s&apos;active : vérifie que tu es bien vu·e en entier de côté, hanches et épaules visibles.
          </div>
        </>
      )}
    </div>
  );
}

function Tile({ label, big, accent, good, hint }: { label: string; big: string; accent?: boolean; good?: boolean; hint?: string }) {
  const color = good === true ? "var(--green)" : good === false ? "#C44A00" : accent ? "var(--orange)" : "var(--ink)";
  return (
    <div style={{ background: "var(--bg-2)", borderRadius: 14, padding: "12px 14px" }}>
      <div style={{ fontSize: 10.5, color: "var(--ink-3)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>{label}</div>
      <div className="mono" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color, lineHeight: 1.1, marginTop: 4 }}>
        {big} {good === true && <span style={{ fontSize: 14, color: "var(--green)" }}>✓</span>}
        {good === false && <span style={{ fontSize: 14, color: "#C44A00" }}>✗</span>}
      </div>
      {hint && <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

/* ── canvas helpers ─────────────────────────────────────────────────── */

const BONES: [number, number][] = [
  [LM.L.shoulder, LM.L.elbow], [LM.L.elbow, LM.L.wrist],
  [LM.R.shoulder, LM.R.elbow], [LM.R.elbow, LM.R.wrist],
  [LM.L.shoulder, LM.L.hip], [LM.R.shoulder, LM.R.hip],
  [LM.L.shoulder, LM.R.shoulder], [LM.L.hip, LM.R.hip],
  [LM.L.hip, LM.L.knee], [LM.L.knee, LM.L.ankle],
  [LM.R.hip, LM.R.knee], [LM.R.knee, LM.R.ankle],
];

function fitCanvas(cv: HTMLCanvasElement, v: HTMLVideoElement) {
  const w = v.videoWidth || cv.clientWidth;
  const h = v.videoHeight || cv.clientHeight;
  if (cv.width !== w || cv.height !== h) {
    cv.width = w;
    cv.height = h;
  }
  return cv.getContext("2d");
}

function drawNothing(cv: HTMLCanvasElement, v: HTMLVideoElement) {
  const ctx = fitCanvas(cv, v);
  if (!ctx) return;
  ctx.clearRect(0, 0, cv.width, cv.height);
}

function drawSkeleton(cv: HTMLCanvasElement, v: HTMLVideoElement, lm: NormalizedLandmark[], mirror: boolean) {
  const ctx = fitCanvas(cv, v);
  if (!ctx) return;
  ctx.clearRect(0, 0, cv.width, cv.height);
  const W = cv.width;
  const H = cv.height;
  const X = (p: NormalizedLandmark) => (mirror ? 1 - p.x : p.x) * W;
  const Y = (p: NormalizedLandmark) => p.y * H;

  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#FF6A1A";
  for (const [a, b] of BONES) {
    const pa = lm[a];
    const pb = lm[b];
    if (!pa || !pb) continue;
    if ((pa.visibility ?? 0) < 0.3 || (pb.visibility ?? 0) < 0.3) continue;
    ctx.beginPath();
    ctx.moveTo(X(pa), Y(pa));
    ctx.lineTo(X(pb), Y(pb));
    ctx.stroke();
  }
  ctx.fillStyle = "#FFE0C7";
  ctx.strokeStyle = "#1A1208";
  ctx.lineWidth = 2;
  for (const k of [LM.L, LM.R]) {
    for (const i of [k.shoulder, k.elbow, k.wrist, k.hip, k.knee, k.ankle]) {
      const p = lm[i];
      if (!p || (p.visibility ?? 0) < 0.3) continue;
      ctx.beginPath();
      ctx.arc(X(p), Y(p), 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
}
