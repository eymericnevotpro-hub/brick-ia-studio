"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Upload, Download, RefreshCw, Sparkles, ArrowRight, Camera, X, FlipHorizontal } from "lucide-react";
import Link from "next/link";

const TRANSFORMATIONS = [
  {
    id: "old", emoji: "👴", label: "Vieillis de 30 ans", color: "#FF6B00",
    prompt: "make the person look 30 years older, elderly face with deep wrinkles, grey white hair, aged skin, same clothing and background, photorealistic",
  },
  {
    id: "bald", emoji: "🦲", label: "Complètement chauve", color: "#8B5CF6",
    prompt: "make the person completely bald with no hair at all, perfectly smooth shiny bald head, same facial features, same expression and background, photorealistic",
  },
  {
    id: "mustache", emoji: "🥸", label: "Grosse moustache", color: "#F59E0B",
    prompt: "add an enormous thick walrus mustache to the person, giant bushy drooping mustache, same expression and background, photorealistic",
  },
  {
    id: "clown", emoji: "🤡", label: "En clown", color: "#EF4444",
    prompt: "transform the person into a circus clown, colorful clown face paint, big red nose, rainbow afro wig, clown costume, same pose, photorealistic",
  },
  {
    id: "mugshot", emoji: "🚔", label: "Photo de casier", color: "#6B7280",
    prompt: "police mugshot photo, person holding arrest placard with number, height measurement ruler on wall behind, police department sign, gritty noir photography",
  },
  {
    id: "muscular", emoji: "💪", label: "Super musclé", color: "#10B981",
    prompt: "give the person an extremely muscular bodybuilder physique with massive bulging muscles, huge arms and chest, same face and expression, same background, photorealistic",
  },
  {
    id: "zombie", emoji: "🧟", label: "En zombie", color: "#84CC16",
    prompt: "transform the person into a zombie, pale grey decaying skin, dark hollow sunken eyes, zombie makeup and wounds, tattered clothes, same pose, photorealistic horror",
  },
  {
    id: "knight", emoji: "⚔️", label: "En chevalier", color: "#3B82F6",
    prompt: "dress the person in full medieval knight plate armor with visor and sword, castle courtyard background, epic medieval warrior portrait, photorealistic",
  },
];

const CELEBRITIES = [
  {
    id: "ronaldo", emoji: "⚽", label: "Avec Ronaldo", color: "#10B981",
    prompt: "add Cristiano Ronaldo standing right next to the person in the photo, both looking at the camera, realistic photographic style, natural lighting, same background",
  },
  {
    id: "musk", emoji: "🚀", label: "Avec Elon Musk", color: "#6B7280",
    prompt: "add Elon Musk standing next to the person, both smiling at the camera, realistic candid photo style, same background and lighting",
  },
  {
    id: "trump", emoji: "🇺🇸", label: "Avec Trump", color: "#EF4444",
    prompt: "add Donald Trump standing next to the person, both facing the camera, realistic photo, same background",
  },
  {
    id: "mrbeast", emoji: "🎯", label: "Avec MrBeast", color: "#F59E0B",
    prompt: "add MrBeast (Jimmy Donaldson, famous YouTuber) taking a selfie together with the person, both smiling, same background, realistic photo",
  },
  {
    id: "obama", emoji: "🎖️", label: "Avec Obama", color: "#3B82F6",
    prompt: "add Barack Obama standing next to the person, shaking hands or posing together, realistic photo, same background and lighting",
  },
  {
    id: "beyonce", emoji: "👑", label: "Avec Beyoncé", color: "#FF6B9D",
    prompt: "add Beyoncé posing next to the person, both smiling at the camera, realistic celebrity photo style, same background",
  },
  {
    id: "zuckerberg", emoji: "📱", label: "Avec Zuckerberg", color: "#1877F2",
    prompt: "add Mark Zuckerberg standing next to the person, both looking at the camera, realistic candid photo, same background",
  },
  {
    id: "mbappe", emoji: "🥇", label: "Avec Mbappé", color: "#FF7A00",
    prompt: "add Kylian Mbappé standing next to the person, both smiling at the camera, realistic photo, same background and lighting",
  },
];

type Stage = "upload" | "choose" | "generating" | "result";
type Tab = "transformations" | "celebrities";

/* ── Camera Modal ──────────────────────────────────────────────── */
function CameraModal({
  onCapture,
  onClose,
}: {
  onCapture: (base64: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [ready, setReady] = useState(false);
  const [camError, setCamError] = useState("");

  const startCamera = useCallback(async (facingMode: "user" | "environment") => {
    // Stop previous stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setReady(false);
    setCamError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setReady(true);
        };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Caméra non disponible";
      if (msg.includes("Permission") || msg.includes("denied")) {
        setCamError("Accès refusé. Autorise la caméra dans les paramètres de ton navigateur.");
      } else {
        setCamError("Impossible d'accéder à la caméra : " + msg);
      }
    }
  }, []);

  useEffect(() => {
    startCamera(facing);
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flipCamera = () => {
    const next = facing === "user" ? "environment" : "user";
    setFacing(next);
    startCamera(next);
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video || !ready) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    // Mirror if front camera
    if (facing === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    // Resize to max 1024px
    const max = 1024;
    const scale = Math.min(1, max / Math.max(canvas.width, canvas.height));
    const out = document.createElement("canvas");
    out.width = Math.round(canvas.width * scale);
    out.height = Math.round(canvas.height * scale);
    out.getContext("2d")!.drawImage(canvas, 0, 0, out.width, out.height);
    onCapture(out.toDataURL("image/jpeg", 0.88));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "#000" }}
    >
      {/* Video feed */}
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transform: facing === "user" ? "scaleX(-1)" : "none" }}
        />
        {!ready && !camError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div
              className="w-10 h-10 border-2 rounded-full animate-spin"
              style={{ borderColor: "#FF7A00", borderTopColor: "transparent" }}
            />
            <p className="text-sm" style={{ color: "#8a5a2a" }}>Activation de la caméra…</p>
          </div>
        )}
        {camError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
            <span className="text-4xl">📵</span>
            <p className="text-white font-bold">Caméra inaccessible</p>
            <p className="text-sm" style={{ color: "#8a6040" }}>{camError}</p>
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: "linear-gradient(135deg, #FF7A00, #FF5500)", color: "white" }}
            >
              Retour
            </button>
          </div>
        )}
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.55)", color: "white" }}
        >
          <X className="w-5 h-5" />
        </button>
        {/* Flip button */}
        {!camError && (
          <button
            onClick={flipCamera}
            className="absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.55)", color: "white" }}
          >
            <FlipHorizontal className="w-5 h-5" />
          </button>
        )}
        {/* Viewfinder overlay */}
        {ready && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              boxShadow: "inset 0 0 80px rgba(0,0,0,0.4)",
              border: "2px solid rgba(255,122,0,0.3)",
            }}
          />
        )}
      </div>

      {/* Capture button */}
      {!camError && (
        <div
          className="flex items-center justify-center py-8"
          style={{ background: "#0a0500" }}
        >
          <button
            onClick={capture}
            disabled={!ready}
            className="w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, #FF7A00, #FF5500)",
              boxShadow: ready ? "0 0 30px #FF7A0066" : "none",
            }}
          >
            <Camera className="w-8 h-8 text-white" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Main component ────────────────────────────────────────────── */
export default function PrankStudio() {
  const [stage, setStage] = useState<Stage>("upload");
  const [tab, setTab] = useState<Tab>("transformations");
  const [imageBase64, setImageBase64] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [error, setError] = useState("");
  const [activePrank, setActivePrank] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const applyImage = (base64: string) => {
    setImageBase64(base64);
    setImagePreview(base64);
    setStage("choose");
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const max = 1024;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        applyImage(canvas.toDataURL("image/jpeg", 0.88));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const runPrank = async (prompt: string, prankId: string) => {
    setActivePrank(prankId);
    setStage("generating");
    setError("");
    try {
      const res = await fetch("/api/prank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, prompt }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Erreur génération");
      setResultUrl(data.imageUrl);
      setStage("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setStage("choose");
    }
  };

  const reset = () => {
    setStage("upload");
    setImageBase64("");
    setImagePreview("");
    setResultUrl("");
    setError("");
    setActivePrank("");
    setShowCustom(false);
    setCustomPrompt("");
    setTab("transformations");
  };

  /* ── STAGE: upload ─────────────────────────────────────────── */
  if (stage === "upload") {
    return (
      <>
        {showCamera && (
          <CameraModal
            onCapture={(b64) => { setShowCamera(false); applyImage(b64); }}
            onClose={() => setShowCamera(false)}
          />
        )}

        <div className="flex flex-col gap-3">
          {/* Camera button — primary CTA */}
          <button
            onClick={() => setShowCamera(true)}
            className="w-full py-5 rounded-3xl flex flex-col items-center justify-center gap-3 transition-all active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #FF7A00, #FF5500)",
              boxShadow: "0 0 40px #FF7A0033",
            }}
          >
            <Camera className="w-10 h-10 text-white" />
            <div>
              <p className="text-white font-black text-lg leading-tight">Prendre une photo</p>
              <p className="text-white/70 text-sm">Utilise ta caméra directement</p>
            </div>
          </button>

          {/* Upload zone — secondary */}
          <div
            className={`rounded-3xl p-7 text-center cursor-pointer transition-all duration-200 ${isDragging ? "scale-[1.01]" : ""}`}
            style={{
              background: isDragging ? "#FF7A0012" : "#120700",
              border: `2px dashed ${isDragging ? "#FF7A00" : "#3D1A00"}`,
            }}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            <Upload className="w-6 h-6 mx-auto mb-2" style={{ color: "#6a4020" }} />
            <p className="font-semibold text-sm" style={{ color: "#8a6040" }}>
              Ou importe depuis ta galerie
            </p>
            <p className="text-xs mt-1" style={{ color: "#4a2a0a" }}>
              Glisse une photo ou clique
            </p>
          </div>
        </div>
      </>
    );
  }

  /* ── STAGE: choose ────────────────────────────────────────── */
  if (stage === "choose") {
    const currentList = tab === "transformations" ? TRANSFORMATIONS : CELEBRITIES;
    return (
      <div className="flex flex-col gap-4">
        {/* Photo preview */}
        <div
          className="flex items-center gap-4 p-4 rounded-2xl"
          style={{ background: "#120700", border: "1px solid #3D1A00" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imagePreview} alt="Photo" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm">Photo prête ✓</p>
            <p style={{ color: "#6a4020", fontSize: "0.78rem" }}>Choisis une transformation</p>
          </div>
          <button
            onClick={reset}
            className="text-xs px-3 py-1.5 rounded-lg flex-shrink-0"
            style={{ background: "#1A0B00", border: "1px solid #3D1A00", color: "#6a4020" }}
          >
            Changer
          </button>
        </div>

        {error && (
          <div
            className="p-3 rounded-xl text-sm"
            style={{ background: "#ef444411", border: "1px solid #ef444433", color: "#ef4444" }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* Tabs */}
        <div
          className="flex rounded-2xl p-1 gap-1"
          style={{ background: "#120700", border: "1px solid #3D1A00" }}
        >
          <button
            onClick={() => setTab("transformations")}
            className="flex-1 py-2 rounded-xl text-sm font-bold transition-all"
            style={{
              background: tab === "transformations" ? "linear-gradient(135deg, #FF7A00, #FF5500)" : "transparent",
              color: tab === "transformations" ? "white" : "#6a4020",
            }}
          >
            🎭 Transformations
          </button>
          <button
            onClick={() => setTab("celebrities")}
            className="flex-1 py-2 rounded-xl text-sm font-bold transition-all"
            style={{
              background: tab === "celebrities" ? "linear-gradient(135deg, #FF7A00, #FF5500)" : "transparent",
              color: tab === "celebrities" ? "white" : "#6a4020",
            }}
          >
            ⭐ Célébrités
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {currentList.map((p) => (
            <button
              key={p.id}
              onClick={() => runPrank(p.prompt, p.id)}
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all duration-200 hover:scale-[1.04] active:scale-[0.97]"
              style={{ background: `${p.color}18`, border: `1px solid ${p.color}33` }}
            >
              <span className="text-3xl leading-none select-none">{p.emoji}</span>
              <span className="text-xs font-bold text-center leading-tight" style={{ color: "#d4a055" }}>
                {p.label}
              </span>
            </button>
          ))}
        </div>

        {/* Custom option */}
        {!showCustom ? (
          <button
            onClick={() => setShowCustom(true)}
            className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold transition-all hover:scale-[1.01]"
            style={{ background: "#FF7A0010", border: "1px dashed #FF7A0044", color: "#FF7A00" }}
          >
            <Sparkles className="w-4 h-4" />
            Ton idée perso — décris ce que tu veux
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              autoFocus
              className="flex-1 rounded-2xl px-4 py-3 text-sm"
              style={{ background: "#120700", border: "1px solid #3D1A00", color: "white", outline: "none" }}
              placeholder='Ex: "Mets Ronaldo en arrière-plan", "transforme en vampire"...'
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && customPrompt.trim()) runPrank(customPrompt, "custom"); }}
            />
            <button
              onClick={() => { if (customPrompt.trim()) runPrank(customPrompt, "custom"); }}
              disabled={!customPrompt.trim()}
              className="px-4 rounded-2xl transition-all disabled:opacity-40"
              style={{
                background: customPrompt.trim() ? "linear-gradient(135deg, #FF7A00, #FF5500)" : "#1A0B00",
                color: "white",
              }}
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    );
  }

  /* ── STAGE: generating ─────────────────────────────────────── */
  if (stage === "generating") {
    const allItems = [...TRANSFORMATIONS, ...CELEBRITIES];
    const prank = allItems.find((p) => p.id === activePrank);
    return (
      <div
        className="rounded-3xl p-10 text-center"
        style={{ background: "linear-gradient(135deg, #120700 0%, #1A0B00 100%)", border: "1px solid #3D1A00" }}
      >
        <div className="relative w-24 h-24 mx-auto mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imagePreview} alt="" className="w-24 h-24 rounded-2xl object-cover" />
          <div
            className="absolute inset-0 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.55)" }}
          >
            <div
              className="w-8 h-8 border-2 rounded-full animate-spin"
              style={{ borderColor: "#FF7A00", borderTopColor: "transparent" }}
            />
          </div>
        </div>
        <p className="text-xl font-black text-white mb-2">
          {prank ? `${prank.emoji} Prank en préparation…` : "Génération en cours…"}
        </p>
        <p style={{ color: "#6a4020", fontSize: "0.85rem" }} className="mb-6">
          L&apos;IA modifie la photo — environ 20-30 secondes
        </p>
        <div className="h-1 rounded-full overflow-hidden max-w-xs mx-auto" style={{ background: "#1A0B00" }}>
          <div className="loading-bar h-full rounded-full" />
        </div>
      </div>
    );
  }

  /* ── STAGE: result ─────────────────────────────────────────── */
  return (
    <div className="flex flex-col gap-4">
      {/* Before / After */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-2 text-center" style={{ color: "#6a4020" }}>
            Avant
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imagePreview} alt="Avant" className="w-full rounded-2xl object-cover" style={{ maxHeight: 300 }} />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-2 text-center" style={{ color: "#FF7A00" }}>
            Après 😂
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resultUrl}
            alt="Prank"
            className="w-full rounded-2xl object-cover"
            style={{ maxHeight: 300, border: "2px solid #FF7A0044" }}
          />
        </div>
      </div>

      {/* CTA */}
      <div className="flex flex-col gap-2.5">
        <a
          href={resultUrl}
          download="prank.jpg"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-black text-base"
          style={{ background: "linear-gradient(135deg, #FF7A00, #FF5500)", color: "white" }}
        >
          <Download className="w-4 h-4" />
          Télécharger et envoyer 😈
        </a>
        <button
          onClick={() => setStage("choose")}
          className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold"
          style={{ background: "#1A0B00", border: "1px solid #3D1A00", color: "#FFB347" }}
        >
          <RefreshCw className="w-4 h-4" />
          Essayer un autre prank sur cette photo
        </button>
        <button onClick={reset} className="text-sm py-2" style={{ color: "#4a2a0a" }}>
          Recommencer avec une autre photo
        </button>
      </div>

      {/* Studio Pro hint */}
      <Link
        href="/studio"
        className="flex items-center gap-3 p-4 rounded-2xl transition-all hover:scale-[1.01]"
        style={{ background: "#0D0500", border: "1px solid #1A0B00" }}
      >
        <span className="text-2xl">✨</span>
        <div className="flex-1">
          <p className="text-white font-bold text-sm">Tu veux aller plus loin ?</p>
          <p style={{ color: "#6a4020", fontSize: "0.75rem" }}>
            Studio Pro — génère tes propres vidéos & images IA
          </p>
        </div>
        <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: "#FF7A00" }} />
      </Link>
    </div>
  );
}
