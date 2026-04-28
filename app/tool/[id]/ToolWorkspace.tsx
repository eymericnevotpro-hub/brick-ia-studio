"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, Copy, Check, ExternalLink, ChevronRight,
  Lightbulb, Wand2, RefreshCw, Upload, CheckCircle,
  FolderOpen, Zap, Clock, AlertCircle, Download,
} from "lucide-react";
import type { Tool } from "@/lib/tools";
import { saveRender } from "@/lib/renders-store";
import { getCredits, deductCredits, CREDIT_COSTS } from "@/lib/credits";

interface Props { tool: Tool }
type Step = 1 | 2 | 3;
type GenStatus = "idle" | "starting" | "queued" | "processing" | "done" | "error";

// ── Thumbnail from video URL ──────────────────────────────────────
function thumbFromUrl(url: string): Promise<{ thumb: string; duration: number; width: number; height: number }> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.preload = "metadata";
    video.src = url;
    video.addEventListener("loadeddata", () => { video.currentTime = 0.5; });
    video.addEventListener("seeked", () => {
      const canvas = document.createElement("canvas");
      canvas.width = 160; canvas.height = 90;
      canvas.getContext("2d")!.drawImage(video, 0, 0, 160, 90);
      resolve({ thumb: canvas.toDataURL("image/jpeg", 0.75), duration: video.duration || 5, width: video.videoWidth || 1280, height: video.videoHeight || 720 });
    });
    video.addEventListener("error", () => resolve({ thumb: "", duration: 5, width: 1280, height: 720 }));
    setTimeout(() => resolve({ thumb: "", duration: 5, width: 1280, height: 720 }), 8000);
  });
}

// ── Thumbnail from File ───────────────────────────────────────────
function thumbFromFile(file: File): Promise<{ thumb: string; duration: number; width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata"; video.muted = true; video.src = url;
    video.addEventListener("loadeddata", () => { video.currentTime = 0.5; });
    video.addEventListener("seeked", () => {
      const canvas = document.createElement("canvas");
      canvas.width = 160; canvas.height = 90;
      canvas.getContext("2d")!.drawImage(video, 0, 0, 160, 90);
      resolve({ thumb: canvas.toDataURL("image/jpeg", 0.75), duration: video.duration, width: video.videoWidth, height: video.videoHeight });
      URL.revokeObjectURL(url);
    });
    video.addEventListener("error", () => { resolve({ thumb: "", duration: 0, width: 1280, height: 720 }); URL.revokeObjectURL(url); });
  });
}

export default function ToolWorkspace({ tool }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [selectedStyle, setSelectedStyle] = useState<string>(tool.styles[0].id);
  const [prompt, setPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const [usedExample, setUsedExample] = useState<string | null>(null);

  // Generation state
  const [genStatus, setGenStatus] = useState<GenStatus>("idle");
  const [genError, setGenError] = useState("");
  const [resultUrl, setResultUrl] = useState(""); // final image or video URL
  const [elapsedSec, setElapsedSec] = useState(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const jobRef = useRef<{ requestId: string; modelId: string } | null>(null);

  // Save-to-library state
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [savedName, setSavedName] = useState("");
  const [credits, setCredits] = useState(100);
  const uploadRef = useRef<HTMLInputElement>(null);

  const selectedStyleObj = tool.styles.find(s => s.id === selectedStyle);
  const isVideo = tool.category === "video";
  const hasDirectGen = !!tool.falModelId;
  const creditCost = isVideo ? CREDIT_COSTS.video : CREDIT_COSTS.image;

  useEffect(() => { setCredits(getCredits()); }, []);

  // Cleanup on unmount
  useEffect(() => () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const buildPrompt = () =>
    `[Style: ${selectedStyleObj?.emoji ?? ""} ${selectedStyleObj?.label ?? ""}]\n\n${prompt}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(buildPrompt());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    setStep(1); setPrompt(""); setGenStatus("idle"); setGenError("");
    setResultUrl(""); setElapsedSec(0); setSaveState("idle"); setSavedName("");
    setUsedExample(null); setSelectedStyle(tool.styles[0].id);
    setCredits(getCredits());
  };

  // ── Start generation ─────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!prompt.trim() || !tool.falModelId) return;
    if (!deductCredits(creditCost)) {
      setGenError("Crédits insuffisants");
      return;
    }
    setCredits(getCredits());
    setStep(3);
    setGenStatus("starting");
    setGenError("");
    setElapsedSec(0);

    timerRef.current = setInterval(() => setElapsedSec(s => s + 1), 1000);

    try {
      if (isVideo) {
        // Async — submit job then poll
        const res = await fetch("/api/generate/video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modelId: tool.falModelId, prompt: buildPrompt(), aspectRatio: tool.falAspectRatio }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error ?? "Erreur réseau");

        jobRef.current = { requestId: data.requestId, modelId: data.modelId };
        setGenStatus("queued");
        startPolling(data.requestId, data.modelId);
      } else {
        // Sync — image ready in ~5s
        setGenStatus("processing");
        const res = await fetch("/api/generate/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modelId: tool.falModelId, prompt: buildPrompt(), aspectRatio: tool.falAspectRatio }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error ?? "Erreur réseau");
        finishGeneration(data.imageUrl);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      setGenError(msg);
      setGenStatus("error");
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const startPolling = (requestId: string, modelId: string) => {
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/generate/status?requestId=${requestId}&modelId=${encodeURIComponent(modelId)}`);
        const data = await res.json();
        if (data.status === "IN_PROGRESS") setGenStatus("processing");
        if (data.status === "COMPLETED") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          finishGeneration(data.videoUrl);
        }
        if (data.error) throw new Error(data.error);
      } catch (err) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        const msg = err instanceof Error ? err.message : "Erreur polling";
        setGenError(msg);
        setGenStatus("error");
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }, 3000);
  };

  const finishGeneration = (url: string) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setResultUrl(url);
    setGenStatus("done");
  };

  // ── Auto-save generated result ───────────────────────────────────
  const handleAutoSave = async () => {
    if (!resultUrl || saveState !== "idle") return;
    setSaveState("saving");
    try {
      // Fetch blob from fal.ai CDN
      const resp = await fetch(resultUrl);
      const blob = await resp.blob();
      const name = `${tool.name} — ${new Date().toLocaleDateString("fr-FR")}`;

      let thumb = "", duration = 5, width = 1280, height = 720;
      if (isVideo) {
        const meta = await thumbFromUrl(resultUrl);
        thumb = meta.thumb; duration = meta.duration; width = meta.width; height = meta.height;
      } else {
        // For images: create a simple thumb from the URL
        thumb = resultUrl;
        duration = 0; width = 1080; height = 1080;
      }

      await saveRender({
        id: crypto.randomUUID(), toolId: tool.id, toolName: tool.name,
        toolEmoji: tool.emoji, toolColor: tool.color,
        prompt: buildPrompt(), style: selectedStyleObj?.label ?? "",
        createdAt: Date.now(), blob, thumbnail: thumb,
        duration, width, height, fileName: name,
      });
      setSavedName(name);
      setSaveState("saved");
    } catch {
      setSaveState("idle");
    }
  };

  // ── Manual file upload fallback ──────────────────────────────────
  const handleSaveFile = async (file: File) => {
    setSaveState("saving");
    const { thumb, duration, width, height } = await thumbFromFile(file);
    const name = file.name.replace(/\.[^.]+$/, "");
    setSavedName(name);
    await saveRender({
      id: crypto.randomUUID(), toolId: tool.id, toolName: tool.name,
      toolEmoji: tool.emoji, toolColor: tool.color,
      prompt: buildPrompt(), style: selectedStyleObj?.label ?? "",
      createdAt: Date.now(), blob: file, thumbnail: thumb,
      duration, width, height, fileName: name,
    });
    setSaveState("saved");
  };

  const steps = [{ n: 1, label: "Style" }, { n: 2, label: "Prompt" }, { n: 3, label: "Résultat" }];

  // ── STATUS LABELS ─────────────────────────────────────────────────
  const statusLabel: Record<GenStatus, string> = {
    idle: "", starting: "Envoi de la requête…", queued: "En file d'attente…",
    processing: "Génération en cours…", done: "", error: "",
  };

  return (
    <div className="relative z-10 pt-28 pb-16 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Back + Credits */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: "#6a4020" }}>
            <ArrowLeft className="w-4 h-4" /> Retour
          </Link>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
            style={{ background: "#1A0B00", border: "1px solid #3D1A00" }}>
            <Zap className="w-3.5 h-3.5" style={{ color: "#FF7A00" }} />
            <span className="text-sm font-bold" style={{ color: credits < 10 ? "#ef4444" : "#FF7A00" }}>
              {credits}
            </span>
            <span className="text-xs" style={{ color: "#6a4020" }}>crédits</span>
          </div>
        </div>

        {/* Tool header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
            style={{ background: `${tool.color}22`, border: `1px solid ${tool.color}44`, boxShadow: `0 0 30px ${tool.color}22` }}>
            {tool.emoji}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-white">{tool.name}</h1>
              {tool.modelType === "open-source" ? (
                <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                  style={{ background: "#22c55e22", border: "1px solid #22c55e44", color: "#22c55e" }}>
                  ✦ Open Source
                </span>
              ) : tool.modelType === "proprietary" ? (
                <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                  style={{ background: "#f59e0b22", border: "1px solid #f59e0b44", color: "#f59e0b" }}>
                  ◆ Propriétaire
                </span>
              ) : null}
            </div>
            <p style={{ color: tool.accentColor, fontSize: "0.9rem", fontWeight: 500 }}>{tool.tagline}</p>
            <p style={{ color: "#6a4020", fontSize: "0.82rem" }} className="mt-1">
              Modèle : <span style={{ color: "#8a6040", fontWeight: 600 }}>{tool.modelLabel}</span> by {tool.modelBy}
            </p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-8">
          {steps.map((s, i) => (
            <div key={s.n} className="flex items-center gap-3">
              <button onClick={() => { if (s.n < step) setStep(s.n as Step); }} className="flex items-center gap-2.5" disabled={s.n >= step}>
                <div className="step-indicator" style={{
                  background: step === s.n ? `linear-gradient(135deg, ${tool.color}, ${tool.color}cc)` : step > s.n ? `${tool.color}22` : "#1A0B00",
                  border: step === s.n ? "none" : step > s.n ? `1px solid ${tool.color}` : "1px solid #3D1A00",
                  color: step === s.n ? "white" : step > s.n ? tool.color : "#5a3a1a",
                  boxShadow: step === s.n ? `0 0 20px ${tool.color}55` : "none",
                }}>
                  {step > s.n ? "✓" : s.n}
                </div>
                <span style={{ color: step === s.n ? "white" : "#6a4020", fontSize: "0.82rem", fontWeight: step === s.n ? 600 : 400 }}>{s.label}</span>
              </button>
              {i < steps.length - 1 && <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "#3D1A00" }} />}
            </div>
          ))}
        </div>

        {/* ── STEP 1: Style ── */}
        {step === 1 && (
          <div className="animate-fade-up">
            <div className="rounded-2xl p-6" style={{ background: "linear-gradient(135deg, #120700 0%, #1A0B00 100%)", border: "1px solid #3D1A00" }}>
              <h2 className="text-lg font-bold text-white mb-1">Choisis ton style</h2>
              <p style={{ color: "#6a4020", fontSize: "0.85rem" }} className="mb-5">Quel type de rendu tu veux obtenir ?</p>
              <div className="grid grid-cols-2 gap-3">
                {tool.styles.map(style => (
                  <button key={style.id} onClick={() => setSelectedStyle(style.id)} className="option-card"
                    style={{ borderColor: selectedStyle === style.id ? tool.color : "#3D1A00", background: selectedStyle === style.id ? `${tool.color}22` : "#0D0500", boxShadow: selectedStyle === style.id ? `0 0 20px ${tool.color}33` : "none" }}>
                    <div className="text-2xl mb-1">{style.emoji}</div>
                    <div className="text-sm font-semibold" style={{ color: selectedStyle === style.id ? "white" : "#6a4020" }}>{style.label}</div>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep(2)} className="btn-primary w-full py-3.5 rounded-xl mt-6 flex items-center justify-center gap-2 text-base"
                style={{ background: `linear-gradient(135deg, ${tool.color}, ${tool.color}cc)` }}>
                Continuer <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Prompt ── */}
        {step === 2 && (
          <div className="animate-fade-up">
            <div className="rounded-2xl p-6" style={{ background: "linear-gradient(135deg, #120700 0%, #1A0B00 100%)", border: "1px solid #3D1A00" }}>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold text-white">Décris ta création</h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{ background: `${tool.color}22`, border: `1px solid ${tool.color}44`, color: tool.accentColor }}>
                  {selectedStyleObj?.emoji} {selectedStyleObj?.label}
                </span>
              </div>
              <p style={{ color: "#6a4020", fontSize: "0.85rem" }} className="mb-4">Décris simplement ce que tu veux créer.</p>
              <textarea className="input-brand w-full rounded-xl p-4 text-sm leading-relaxed resize-none" rows={5}
                placeholder={tool.promptPlaceholder} value={prompt} onChange={e => setPrompt(e.target.value)} />
              <div className="flex justify-between items-center mt-2 mb-4">
                <span style={{ color: "#3D1A00", fontSize: "0.72rem" }}>{prompt.length} caractères</span>
                {prompt.length > 0 && <button onClick={() => setPrompt("")} style={{ color: "#6a4020", fontSize: "0.72rem" }}>Effacer</button>}
              </div>

              {/* Examples */}
              <div className="rounded-xl p-4 mb-5" style={{ background: "#0D0500", border: "1px solid #1A0B00" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-3.5 h-3.5" style={{ color: "#FFB347" }} />
                  <span style={{ color: "#FFB347", fontSize: "0.75rem", fontWeight: 600 }}>EXEMPLES — clique pour utiliser</span>
                </div>
                <div className="flex flex-col gap-2">
                  {tool.examplePrompts.map((ex, i) => (
                    <button key={i} onClick={() => { setPrompt(ex); setUsedExample(ex); }}
                      className="text-left p-2.5 rounded-lg transition-all text-sm"
                      style={{ background: usedExample === ex ? `${tool.color}22` : "#120700", border: usedExample === ex ? `1px solid ${tool.color}44` : "1px solid #1A0B00", color: usedExample === ex ? "white" : "#6a4020" }}>
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="px-4 py-3.5 rounded-xl font-semibold text-sm"
                  style={{ background: "#1A0B00", border: "1px solid #3D1A00", color: "#6a4020" }}>Retour</button>

                {hasDirectGen ? (
                  /* Direct generation button */
                  <button onClick={handleGenerate} disabled={!prompt.trim() || credits < creditCost}
                    className="btn-primary flex-1 py-3.5 rounded-xl flex items-center justify-center gap-2 text-base disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: prompt.trim() ? `linear-gradient(135deg, ${tool.color}, ${tool.color}cc)` : "#3D1A00" }}>
                    <Zap className="w-4 h-4" />
                    Générer ({creditCost} crédits)
                  </button>
                ) : (
                  /* Prompt redirect button */
                  <button onClick={() => setStep(3)} disabled={!prompt.trim()}
                    className="btn-primary flex-1 py-3.5 rounded-xl flex items-center justify-center gap-2 text-base disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: prompt.trim() ? `linear-gradient(135deg, ${tool.color}, ${tool.color}cc)` : "#3D1A00" }}>
                    <Wand2 className="w-4 h-4" /> Créer le prompt
                  </button>
                )}
              </div>

              {credits < creditCost && hasDirectGen && (
                <p className="text-xs mt-3 text-center" style={{ color: "#ef4444" }}>
                  Crédits insuffisants ({credits}/{creditCost} requis)
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 3: Result ── */}
        {step === 3 && (
          <div className="animate-fade-up flex flex-col gap-4">

            {/* Generation in progress */}
            {(genStatus === "starting" || genStatus === "queued" || genStatus === "processing") && (
              <div className="rounded-2xl p-8 text-center" style={{ background: "linear-gradient(135deg, #120700 0%, #1A0B00 100%)", border: "1px solid #3D1A00" }}>
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-5 animate-float"
                  style={{ background: `${tool.color}22`, border: `2px solid ${tool.color}44`, boxShadow: `0 0 40px ${tool.color}33` }}>
                  {tool.emoji}
                </div>
                <p className="text-xl font-bold text-white mb-1">{statusLabel[genStatus]}</p>
                <p className="text-sm mb-5" style={{ color: "#6a4020" }}>
                  {isVideo ? "Les vidéos prennent 1 à 3 minutes — tu peux patienter ici." : "L'image sera prête dans quelques secondes…"}
                </p>
                <div className="h-1 rounded-full overflow-hidden max-w-xs mx-auto mb-3" style={{ background: "#1A0B00" }}>
                  <div className="loading-bar h-full rounded-full" />
                </div>
                <div className="flex items-center justify-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" style={{ color: "#6a4020" }} />
                  <span className="text-xs font-mono" style={{ color: "#6a4020" }}>{elapsedSec}s</span>
                </div>
              </div>
            )}

            {/* Error */}
            {genStatus === "error" && (
              <div className="rounded-2xl p-6" style={{ background: "#1A0B00", border: "1px solid #ef444444" }}>
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-5 h-5" style={{ color: "#ef4444" }} />
                  <span className="font-bold text-white">Erreur de génération</span>
                </div>
                <p className="text-sm mb-4" style={{ color: "#6a4020" }}>{genError}</p>
                {genError.includes("FAL_KEY") && (
                  <div className="p-3 rounded-xl mb-4 text-xs" style={{ background: "#0D0500", border: "1px solid #3D1A00", color: "#FFB347" }}>
                    Ajoute ta clé dans <code className="text-white">.env.local</code> puis relance le serveur.
                  </div>
                )}
                <button onClick={handleReset} className="btn-primary px-5 py-2.5 rounded-xl text-sm flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" /> Réessayer
                </button>
              </div>
            )}

            {/* Result */}
            {genStatus === "done" && resultUrl && (
              <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${tool.color}44` }}>
                {/* Media preview */}
                {isVideo ? (
                  <video src={resultUrl} controls autoPlay loop className="w-full" style={{ maxHeight: "420px", background: "#000" }} />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={resultUrl} alt="Résultat" className="w-full" style={{ maxHeight: "420px", objectFit: "contain", background: "#000" }} />
                )}

                {/* Actions */}
                <div className="p-5" style={{ background: "linear-gradient(135deg, #120700 0%, #1A0B00 100%)" }}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full" style={{ background: "#22c55e", boxShadow: "0 0 8px #22c55e" }} />
                    <span className="text-sm font-bold text-white">
                      {isVideo ? "Vidéo générée" : "Image générée"} en {elapsedSec}s 🎉
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {/* Download */}
                    <a href={resultUrl} download={`brick-ia-${tool.id}.${isVideo ? "mp4" : "jpg"}`} target="_blank" rel="noopener noreferrer"
                      className="btn-primary w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm"
                      style={{ background: `linear-gradient(135deg, ${tool.color}, ${tool.color}cc)` }}>
                      <Download className="w-4 h-4" /> Télécharger
                    </a>

                    {/* Save to renders */}
                    {saveState === "saved" ? (
                      <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#22c55e11", border: "1px solid #22c55e44" }}>
                        <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#22c55e" }} />
                        <span className="text-sm text-white flex-1">Sauvegardé dans mes rendus</span>
                        <Link href="/editor" className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                          style={{ background: "#FF7A0022", border: "1px solid #FF7A0044", color: "#FF7A00" }}>
                          Éditeur →
                        </Link>
                      </div>
                    ) : saveState === "saving" ? (
                      <div className="flex items-center justify-center gap-2 p-3 rounded-xl" style={{ background: "#1A0B00" }}>
                        <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "#FF7A00", borderTopColor: "transparent" }} />
                        <span className="text-sm" style={{ color: "#FF7A00" }}>Sauvegarde…</span>
                      </div>
                    ) : (
                      <button onClick={handleAutoSave}
                        className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all"
                        style={{ background: "#FF7A0011", border: "1px solid #FF7A0044", color: "#FF7A00" }}>
                        <FolderOpen className="w-4 h-4" /> Sauvegarder dans mes rendus
                      </button>
                    )}

                    <button onClick={handleReset} className="w-full py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm" style={{ color: "#6a4020" }}>
                      <RefreshCw className="w-3.5 h-3.5" /> Générer autre chose
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Prompt redirect (no API for this tool) */}
            {!hasDirectGen && genStatus === "idle" && (
              <div className="rounded-2xl p-6" style={{ background: "linear-gradient(135deg, #120700 0%, #1A0B00 100%)", border: "1px solid #3D1A00" }}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full" style={{ background: "#22c55e", boxShadow: "0 0 8px #22c55e" }} />
                  <span className="text-sm font-semibold text-white">Ton prompt est prêt !</span>
                </div>
                <div className="rounded-xl p-4 mb-4" style={{ background: "#0D0500", border: `1px solid ${tool.color}33` }}>
                  <pre className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#d4a055", fontFamily: "'Inter', sans-serif" }}>
                    {buildPrompt()}
                  </pre>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={handleCopy} className="btn-primary w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm"
                    style={{ background: `linear-gradient(135deg, ${tool.color}, ${tool.color}cc)` }}>
                    {copied ? <><Check className="w-4 h-4" />Copié !</> : <><Copy className="w-4 h-4" />Copier le prompt</>}
                  </button>
                  {tool.apiUrl && (
                    <a href={tool.apiUrl} target="_blank" rel="noopener noreferrer"
                      className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold"
                      style={{ background: "#1A0B00", border: "1px solid #3D1A00", color: "#FFB347" }}>
                      <ExternalLink className="w-4 h-4" /> Ouvrir {tool.name}
                    </a>
                  )}
                </div>
                {/* Manual save fallback */}
                <div className="mt-4 rounded-xl p-4" style={{ background: "#0D0500", border: "1px solid #1A0B00" }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: "#6a4020" }}>
                    Après avoir téléchargé ta vidéo depuis {tool.name} :
                  </p>
                  <input ref={uploadRef} type="file" accept="video/*,image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleSaveFile(f); }} />
                  {saveState === "saved" ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" style={{ color: "#22c55e" }} />
                      <span className="text-xs text-white">&quot;{savedName}&quot; sauvegardé</span>
                      <Link href="/editor" className="ml-auto text-xs font-semibold px-2 py-1 rounded-lg"
                        style={{ background: "#FF7A0022", border: "1px solid #FF7A0044", color: "#FF7A00" }}>Éditeur →</Link>
                    </div>
                  ) : saveState === "saving" ? (
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: "#FF7A00", borderTopColor: "transparent" }} />
                      <span className="text-xs" style={{ color: "#FF7A00" }}>Analyse…</span>
                    </div>
                  ) : (
                    <button onClick={() => uploadRef.current?.click()}
                      className="w-full py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold"
                      style={{ background: "#FF7A0011", border: "2px dashed #FF7A0044", color: "#FF7A00" }}>
                      <Upload className="w-3.5 h-3.5" /> Importer ma vidéo téléchargée
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tool info — model transparency */}
        <div className="mt-6 rounded-xl p-4 flex items-center gap-3" style={{ background: "#0D0500", border: "1px solid #1A0B00" }}>
          <div className="text-xl">{tool.emoji}</div>
          <div className="flex-1 flex flex-col gap-1">
            {/* Model type badge + label */}
            <div className="flex items-center gap-2 flex-wrap">
              {tool.modelType === "open-source" ? (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: "#22c55e15", border: "1px solid #22c55e33", color: "#22c55e" }}>
                  ✦ Open Source
                </span>
              ) : tool.modelType === "proprietary" ? (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: "#f59e0b15", border: "1px solid #f59e0b33", color: "#f59e0b" }}>
                  ◆ Propriétaire
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: "#6b728015", border: "1px solid #6b728033", color: "#9ca3af" }}>
                  → Prompt redirect
                </span>
              )}
              <span className="text-xs font-semibold" style={{ color: "#8a6040" }}>
                {tool.modelLabel} · {tool.modelBy}
              </span>
              {hasDirectGen && (
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: "#FF7A0011", border: "1px solid #FF7A0022", color: "#FF7A00", fontSize: "0.6rem", fontWeight: 700 }}>
                  ⚡ Direct · {creditCost} crédits
                </span>
              )}
            </div>
            {!hasDirectGen && (
              <span className="text-xs" style={{ color: "#6a4020" }}>
                Génération via prompt redirect — API non disponible
              </span>
            )}
          </div>
          {tool.apiUrl && !hasDirectGen && (
            <a href={tool.apiUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#FF7A00", flexShrink: 0 }}>
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
