"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  Play, Pause, Download, Trash2, ChevronLeft, ChevronRight,
  Scissors, Film, Loader2, CheckCircle, GripVertical,
  Music, Volume2, VolumeX, Plus, X, Sparkles,
} from "lucide-react";
import { getAllRenders, deleteRender, type SavedRender } from "@/lib/renders-store";

// ── Types ──────────────────────────────────────────────────────────
interface TimelineClip {
  renderId: string;
  instanceId: string; // allow same render multiple times
  toolName: string;
  toolEmoji: string;
  toolColor: string;
  url: string; // blob URL created from render.blob
  thumbnail: string;
  duration: number;
  trimStart: number;
  trimEnd: number;
  width: number;
  height: number;
  name: string;
}

type ExportState = "idle" | "exporting" | "done";

function fmt(s: number) {
  if (!isFinite(s) || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

// ═══════════════════════════════════════════════════════════════════
export default function VideoEditor() {
  // Library
  const [renders, setRenders] = useState<SavedRender[]>([]);
  const [libLoaded, setLibLoaded] = useState(false);
  const [blobUrls, setBlobUrls] = useState<Record<string, string>>({});

  // Timeline
  const [timeline, setTimeline] = useState<TimelineClip[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [dragSrc, setDragSrc] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  // Preview
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [previewClipIdx, setPreviewClipIdx] = useState(0);

  // Music
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const [musicVolume, setMusicVolume] = useState(0.5);
  const [isMusicMuted, setIsMusicMuted] = useState(false);

  // Export
  const [exportState, setExportState] = useState<ExportState>("idle");
  const [exportProgress, setExportProgress] = useState(0);
  const [exportLabel, setExportLabel] = useState("");

  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const musicRef = useRef<HTMLAudioElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);

  const selected = timeline.find((c) => c.instanceId === selectedInstanceId) ?? null;
  const totalDuration = timeline.reduce((s, c) => s + (c.trimEnd - c.trimStart), 0);

  // ── Load renders from IndexedDB ───────────────────────────────────
  useEffect(() => {
    getAllRenders().then((list) => {
      setRenders(list);
      // Create blob URLs for all renders
      const urls: Record<string, string> = {};
      list.forEach((r) => { urls[r.id] = URL.createObjectURL(r.blob); });
      setBlobUrls(urls);
      setLibLoaded(true);
    });
    return () => {
      Object.values(blobUrls).forEach(URL.revokeObjectURL);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Music ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (musicRef.current) {
      musicRef.current.volume = isMusicMuted ? 0 : musicVolume;
    }
  }, [musicVolume, isMusicMuted]);

  const handleMusicUpload = (file: File) => {
    if (musicUrl) URL.revokeObjectURL(musicUrl);
    const url = URL.createObjectURL(file);
    setMusicFile(file);
    setMusicUrl(url);
  };

  // ── Add render to timeline ────────────────────────────────────────
  const addToTimeline = useCallback((render: SavedRender) => {
    const url = blobUrls[render.id];
    if (!url) return;
    const clip: TimelineClip = {
      renderId: render.id,
      instanceId: crypto.randomUUID(),
      toolName: render.toolName,
      toolEmoji: render.toolEmoji,
      toolColor: render.toolColor,
      url,
      thumbnail: render.thumbnail,
      duration: render.duration,
      trimStart: 0,
      trimEnd: render.duration,
      width: render.width,
      height: render.height,
      name: render.fileName,
    };
    setTimeline((prev) => [...prev, clip]);
  }, [blobUrls]);

  // ── Timeline ops ──────────────────────────────────────────────────
  const removeFromTimeline = (instanceId: string) => {
    setTimeline((prev) => prev.filter((c) => c.instanceId !== instanceId));
    if (selectedInstanceId === instanceId) setSelectedInstanceId(null);
  };

  const moveClip = (idx: number, dir: -1 | 1) => {
    setTimeline((prev) => {
      const arr = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return arr;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return arr;
    });
  };

  const updateTrim = (instanceId: string, field: "trimStart" | "trimEnd", val: number) => {
    setTimeline((prev) => prev.map((c) => c.instanceId === instanceId ? { ...c, [field]: val } : c));
  };

  // ── Drag reorder ──────────────────────────────────────────────────
  const onDragStartClip = (idx: number) => setDragSrc(idx);
  const onDragOverClip = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOver(idx); };
  const onDropClip = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragSrc === null || dragSrc === idx) { setDragSrc(null); setDragOver(null); return; }
    setTimeline((prev) => {
      const arr = [...prev];
      const [moved] = arr.splice(dragSrc, 1);
      arr.splice(idx, 0, moved);
      return arr;
    });
    setDragSrc(null); setDragOver(null);
  };

  // ── Preview ───────────────────────────────────────────────────────
  const loadClipIntoPreview = useCallback((idx: number) => {
    const vid = previewVideoRef.current;
    const clip = timeline[idx];
    if (!vid || !clip) return;
    vid.src = clip.url;
    vid.currentTime = clip.trimStart;
    vid.muted = isMuted;
  }, [timeline, isMuted]);

  useEffect(() => {
    if (timeline.length > 0) {
      setPreviewClipIdx(0);
      loadClipIntoPreview(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline.length]);

  const handleTimeUpdate = () => {
    const vid = previewVideoRef.current;
    const clip = timeline[previewClipIdx];
    if (!vid || !clip) return;
    setCurrentTime(vid.currentTime);
    if (vid.currentTime >= clip.trimEnd) {
      const next = previewClipIdx + 1;
      if (next < timeline.length) {
        setPreviewClipIdx(next);
        loadClipIntoPreview(next);
        if (isPlaying) vid.play();
      } else {
        vid.pause();
        setIsPlaying(false);
        if (musicRef.current) { musicRef.current.pause(); musicRef.current.currentTime = 0; }
        setPreviewClipIdx(0);
        loadClipIntoPreview(0);
      }
    }
  };

  const togglePlay = () => {
    const vid = previewVideoRef.current;
    const mus = musicRef.current;
    if (!vid) return;
    if (isPlaying) {
      vid.pause(); mus?.pause(); setIsPlaying(false);
    } else {
      vid.play(); if (mus && musicUrl) mus.play();
      setIsPlaying(true);
    }
  };

  // ── Delete from library ───────────────────────────────────────────
  const handleDeleteRender = async (id: string) => {
    await deleteRender(id);
    if (blobUrls[id]) URL.revokeObjectURL(blobUrls[id]);
    setBlobUrls((prev) => { const n = { ...prev }; delete n[id]; return n; });
    setRenders((prev) => prev.filter((r) => r.id !== id));
    setTimeline((prev) => prev.filter((c) => c.renderId !== id));
  };

  // ── Export ────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (!timeline.length) return;
    setExportState("exporting"); setExportProgress(0);
    try {
      const W = timeline[0]?.width || 1280;
      const H = timeline[0]?.height || 720;
      const canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d")!;
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
      recorder.start(100);
      const total = timeline.reduce((s, c) => s + (c.trimEnd - c.trimStart), 0);
      let done = 0;
      for (let i = 0; i < timeline.length; i++) {
        const clip = timeline[i];
        setExportLabel(`Clip ${i + 1}/${timeline.length}…`);
        await new Promise<void>((resolve) => {
          const video = document.createElement("video");
          video.src = clip.url; video.preload = "auto";
          let animId: number;
          const drawLoop = () => {
            ctx.drawImage(video, 0, 0, W, H);
            if (video.currentTime < clip.trimEnd && !video.ended && !video.paused) animId = requestAnimationFrame(drawLoop);
            else { cancelAnimationFrame(animId); done += clip.trimEnd - clip.trimStart; setExportProgress(Math.round((done / total) * 100)); resolve(); }
          };
          video.addEventListener("loadeddata", () => { video.currentTime = clip.trimStart; });
          video.addEventListener("seeked", () => { video.play().then(() => { animId = requestAnimationFrame(drawLoop); }); });
          video.addEventListener("timeupdate", () => { if (video.currentTime >= clip.trimEnd) video.pause(); });
          video.addEventListener("ended", () => { cancelAnimationFrame(animId); done += clip.trimEnd - clip.trimStart; setExportProgress(Math.round((done / total) * 100)); resolve(); });
          video.load();
        });
        await new Promise((r) => setTimeout(r, 50));
      }
      recorder.stop();
      await new Promise((r) => (recorder.onstop = r));
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "montage-brick-ia.webm"; a.click();
      URL.revokeObjectURL(url);
      setExportState("done"); setTimeout(() => setExportState("idle"), 4000);
    } catch (err) { console.error(err); setExportState("idle"); }
  };

  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className="relative z-10 pt-24 pb-16 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#FF7A0022", border: "1px solid #FF7A0044" }}>
                <Scissors className="w-4 h-4" style={{ color: "#FF7A00" }} />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#FF7A00" }}>Éditeur Vidéo</span>
            </div>
            <h1 className="text-3xl font-black text-white">Monte ton contenu IA</h1>
            <p className="text-sm mt-1" style={{ color: "#6a4020" }}>
              Sélectionne tes rendus, arrange-les, coupe, ajoute une musique, exporte.
            </p>
          </div>
          {timeline.length > 0 && (
            <div className="hidden md:flex items-center gap-3">
              <span className="text-sm" style={{ color: "#6a4020" }}>{timeline.length} clip{timeline.length > 1 ? "s" : ""} · {fmt(totalDuration)}</span>
              <button onClick={handleExport} disabled={exportState === "exporting"}
                className="btn-primary px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm disabled:opacity-60">
                {exportState === "exporting" ? <><Loader2 className="w-4 h-4 animate-spin" />{exportProgress}%</>
                  : exportState === "done" ? <><CheckCircle className="w-4 h-4" />Exporté !</>
                  : <><Download className="w-4 h-4" />Exporter</>}
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

          {/* ── LEFT: Library + Timeline + Trim ── */}
          <div className="xl:col-span-2 flex flex-col gap-4">

            {/* Renders library */}
            <div className="rounded-2xl p-5" style={{ background: "#0D0500", border: "1px solid #3D1A00" }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-bold text-white">Mes rendus IA</h2>
                  <p className="text-xs mt-0.5" style={{ color: "#6a4020" }}>
                    {renders.length === 0 ? "Aucun rendu sauvegardé — génère un prompt et importe ta vidéo" : "Clique sur + pour ajouter à la timeline"}
                  </p>
                </div>
                <Link href="/" className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
                  style={{ background: "#1A0B00", border: "1px solid #3D1A00", color: "#FFB347" }}>
                  + Générer un rendu
                </Link>
              </div>

              {!libLoaded ? (
                <div className="flex items-center justify-center py-8 gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#FF7A00" }} />
                  <span className="text-sm" style={{ color: "#6a4020" }}>Chargement…</span>
                </div>
              ) : renders.length === 0 ? (
                <div className="text-center py-10 flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                    style={{ background: "#1A0B00", border: "1px solid #3D1A00" }}>🎬</div>
                  <div>
                    <p className="text-white font-semibold mb-1">Aucun rendu pour l&apos;instant</p>
                    <p className="text-sm" style={{ color: "#6a4020" }}>
                      Génère un prompt depuis un outil IA, télécharge ta vidéo,<br />
                      puis importe-la depuis la page résultat.
                    </p>
                  </div>
                  <Link href="/" className="btn-primary px-5 py-2.5 rounded-xl text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Aller générer un rendu
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {renders.map((render) => {
                    const inTimeline = timeline.some((c) => c.renderId === render.id);
                    return (
                      <div key={render.id} className="rounded-xl overflow-hidden group relative transition-all duration-200"
                        style={{ border: `1px solid ${inTimeline ? render.toolColor + "66" : "#1A0B00"}`, background: "#120700" }}>

                        {/* Thumbnail */}
                        <div className="relative" style={{ aspectRatio: "16/9", background: "#080401" }}>
                          {render.thumbnail ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={render.thumbnail} alt={render.fileName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Film className="w-5 h-5" style={{ color: "#3D1A00" }} />
                            </div>
                          )}
                          {/* Tool badge */}
                          <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-full text-xs font-bold"
                            style={{ background: render.toolColor + "dd", color: "white", fontSize: "0.6rem" }}>
                            {render.toolEmoji} {render.toolName}
                          </div>
                          {/* Delete */}
                          <button onClick={() => handleDeleteRender(render.id)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ background: "#000000cc" }}>
                            <X className="w-3 h-3 text-white" />
                          </button>
                          {/* Add overlay */}
                          <button onClick={() => addToTimeline(render)}
                            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ background: "rgba(0,0,0,0.5)" }}>
                            <div className="w-8 h-8 rounded-full flex items-center justify-center"
                              style={{ background: render.toolColor }}>
                              <Plus className="w-4 h-4 text-white" />
                            </div>
                          </button>
                        </div>

                        {/* Info */}
                        <div className="p-2">
                          <p className="text-xs font-semibold text-white truncate">{render.fileName}</p>
                          <p className="text-xs" style={{ color: "#6a4020" }}>{fmt(render.duration)}</p>
                        </div>

                        {/* Add button */}
                        <button onClick={() => addToTimeline(render)}
                          className="w-full py-1.5 flex items-center justify-center gap-1 text-xs font-semibold transition-all border-t"
                          style={{ borderColor: "#1A0B00", color: inTimeline ? render.toolColor : "#6a4020", background: inTimeline ? render.toolColor + "11" : "transparent" }}>
                          <Plus className="w-3 h-3" /> {inTimeline ? "Ajouter encore" : "Ajouter"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Timeline */}
            {timeline.length > 0 && (
              <div className="rounded-2xl p-4" style={{ background: "#0D0500", border: "1px solid #3D1A00" }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#6a4020" }}>
                    Timeline · {timeline.length} clip{timeline.length > 1 ? "s" : ""} · {fmt(totalDuration)}
                  </span>
                  <span className="text-xs" style={{ color: "#3D1A00" }}>Glisse pour réordonner</span>
                </div>

                <div className="flex gap-3 overflow-x-auto pb-2">
                  {timeline.map((clip, idx) => {
                    const isSelected = clip.instanceId === selectedInstanceId;
                    const isActive = previewClipIdx === idx && isPlaying;
                    const isDragTarget = dragOver === idx;
                    return (
                      <div key={clip.instanceId} draggable
                        onDragStart={() => onDragStartClip(idx)}
                        onDragOver={(e) => onDragOverClip(e, idx)}
                        onDrop={(e) => onDropClip(e, idx)}
                        onDragEnd={() => { setDragSrc(null); setDragOver(null); }}
                        onClick={() => { setSelectedInstanceId(clip.instanceId); if (previewVideoRef.current) { previewVideoRef.current.src = clip.url; previewVideoRef.current.currentTime = clip.trimStart; setPreviewClipIdx(idx); } }}
                        className="flex-shrink-0 rounded-xl overflow-hidden cursor-pointer transition-all duration-200"
                        style={{ width: "150px", border: isSelected ? `2px solid ${clip.toolColor}` : isDragTarget ? "2px solid #FFB34788" : "2px solid #1A0B00", background: isSelected ? clip.toolColor + "11" : "#120700", opacity: dragSrc === idx ? 0.5 : 1, transform: isDragTarget ? "scale(1.03)" : "scale(1)", boxShadow: isSelected ? `0 0 20px ${clip.toolColor}33` : "none" }}>
                        <div className="relative" style={{ height: "84px", background: "#080401" }}>
                          {clip.thumbnail
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={clip.thumbnail} alt="" className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center"><Film className="w-5 h-5" style={{ color: "#3D1A00" }} /></div>}
                          <div className="absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ background: isSelected ? clip.toolColor : "#00000088", color: "white" }}>{idx + 1}</div>
                          {isActive && (
                            <div className="absolute inset-0 flex items-center justify-center" style={{ background: "#00000044" }}>
                              <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: clip.toolColor }}>
                                <Play className="w-3 h-3 text-white" />
                              </div>
                            </div>
                          )}
                          <div className="absolute top-1 right-1 opacity-50"><GripVertical className="w-3.5 h-3.5 text-white" /></div>
                        </div>
                        <div className="p-2">
                          <p className="text-xs font-semibold text-white truncate">{clip.name}</p>
                          <p className="text-xs" style={{ color: "#6a4020" }}>{fmt(clip.trimEnd - clip.trimStart)}</p>
                          <div className="mt-1.5 rounded-full overflow-hidden" style={{ height: "3px", background: "#1A0B00" }}>
                            <div className="h-full rounded-full" style={{ background: isSelected ? clip.toolColor : "#3D1A00", marginLeft: `${(clip.trimStart / clip.duration) * 100}%`, width: `${((clip.trimEnd - clip.trimStart) / clip.duration) * 100}%` }} />
                          </div>
                        </div>
                        <div className="flex items-center border-t px-1.5 py-1 gap-1" style={{ borderColor: "#1A0B00" }}>
                          <button onClick={(e) => { e.stopPropagation(); moveClip(idx, -1); }} disabled={idx === 0} className="p-1 rounded disabled:opacity-30" style={{ color: "#6a4020" }}><ChevronLeft className="w-3.5 h-3.5" /></button>
                          <button onClick={(e) => { e.stopPropagation(); moveClip(idx, 1); }} disabled={idx === timeline.length - 1} className="p-1 rounded disabled:opacity-30" style={{ color: "#6a4020" }}><ChevronRight className="w-3.5 h-3.5" /></button>
                          <div className="flex-1" />
                          <button onClick={(e) => { e.stopPropagation(); removeFromTimeline(clip.instanceId); }} className="p-1 rounded" style={{ color: "#6a4020" }}><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Global progress bar */}
                <div className="mt-3 rounded-full overflow-hidden" style={{ height: "4px", background: "#1A0B00" }}>
                  {timeline.map((clip, idx) => (
                    <div key={clip.instanceId} className="inline-block h-full"
                      style={{ width: `${((clip.trimEnd - clip.trimStart) / totalDuration) * 100}%`, background: idx === previewClipIdx ? clip.toolColor : idx % 2 === 0 ? "#3D1A00" : "#2a1000" }} />
                  ))}
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs" style={{ color: "#3D1A00" }}>0:00</span>
                  <span className="text-xs" style={{ color: "#3D1A00" }}>{fmt(totalDuration)}</span>
                </div>
              </div>
            )}

            {/* Trim panel */}
            {selected && (
              <div className="rounded-2xl p-5 animate-fade-up" style={{ background: "linear-gradient(135deg, #120700 0%, #1A0B00 100%)", border: "1px solid #3D1A00" }}>
                <div className="flex items-center gap-2 mb-4">
                  <Scissors className="w-4 h-4" style={{ color: "#FF7A00" }} />
                  <h3 className="font-bold text-white">Découper :</h3>
                  <span className="text-sm" style={{ color: selected.toolColor }}>{selected.toolEmoji} {selected.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#6a4020" }}>Début</label>
                      <span className="text-xs font-mono" style={{ color: "#FF7A00" }}>{fmt(selected.trimStart)}</span>
                    </div>
                    <input type="range" min={0} max={selected.trimEnd - 0.1} step={0.1} value={selected.trimStart}
                      onChange={(e) => updateTrim(selected.instanceId, "trimStart", +e.target.value)}
                      className="w-full" style={{ accentColor: "#FF7A00" }} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#6a4020" }}>Fin</label>
                      <span className="text-xs font-mono" style={{ color: "#FF7A00" }}>{fmt(selected.trimEnd)}</span>
                    </div>
                    <input type="range" min={selected.trimStart + 0.1} max={selected.duration} step={0.1} value={selected.trimEnd}
                      onChange={(e) => updateTrim(selected.instanceId, "trimEnd", +e.target.value)}
                      className="w-full" style={{ accentColor: "#FF7A00" }} />
                  </div>
                </div>
                <div className="mt-4 rounded-full overflow-hidden relative" style={{ height: "8px", background: "#1A0B00" }}>
                  <div className="absolute h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${selected.toolColor}, ${selected.toolColor}99)`, left: `${(selected.trimStart / selected.duration) * 100}%`, width: `${((selected.trimEnd - selected.trimStart) / selected.duration) * 100}%` }} />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-xs" style={{ color: "#3D1A00" }}>0:00</span>
                  <span className="text-xs font-semibold" style={{ color: "#FF7A00" }}>Durée : {fmt(selected.trimEnd - selected.trimStart)}</span>
                  <span className="text-xs" style={{ color: "#3D1A00" }}>{fmt(selected.duration)}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  {[
                    { label: "Tout", action: () => { updateTrim(selected.instanceId, "trimStart", 0); updateTrim(selected.instanceId, "trimEnd", selected.duration); } },
                    { label: "–1s début", action: () => updateTrim(selected.instanceId, "trimStart", Math.min(selected.trimStart + 1, selected.trimEnd - 0.5)) },
                    { label: "–1s fin", action: () => updateTrim(selected.instanceId, "trimEnd", Math.max(selected.trimEnd - 1, selected.trimStart + 0.5)) },
                  ].map((p) => (
                    <button key={p.label} onClick={p.action} className="text-xs px-3 py-1.5 rounded-lg transition-all"
                      style={{ background: "#0D0500", border: "1px solid #3D1A00", color: "#8a5a2a" }}>{p.label}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: Preview + Music + Export ── */}
          <div className="flex flex-col gap-4">

            {/* Preview */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "#000", border: "1px solid #3D1A00" }}>
              <div className="relative" style={{ aspectRatio: "16/9", background: "#050200" }}>
                {timeline.length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <Film className="w-10 h-10" style={{ color: "#3D1A00" }} />
                    <p className="text-sm text-center px-4" style={{ color: "#3D1A00" }}>Ajoute des clips depuis tes rendus</p>
                  </div>
                ) : (
                  <video ref={previewVideoRef} className="w-full h-full object-contain"
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={() => {
                      const next = previewClipIdx + 1;
                      if (next < timeline.length) { setPreviewClipIdx(next); loadClipIntoPreview(next); previewVideoRef.current?.play(); }
                      else { setIsPlaying(false); if (musicRef.current) { musicRef.current.pause(); musicRef.current.currentTime = 0; } setPreviewClipIdx(0); loadClipIntoPreview(0); }
                    }} />
                )}
                {timeline.length > 0 && !isPlaying && (
                  <button onClick={togglePlay} className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.3)" }}>
                    <div className="w-14 h-14 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                      style={{ background: "linear-gradient(135deg, #FF7A00, #FF5500)", boxShadow: "0 0 30px #FF7A0066" }}>
                      <Play className="w-6 h-6 text-white ml-1" />
                    </div>
                  </button>
                )}
              </div>

              {timeline.length > 0 && (
                <div className="p-3" style={{ background: "#0D0500" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <button onClick={togglePlay} className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: "#FF7A0022", border: "1px solid #FF7A0044" }}>
                      {isPlaying ? <Pause className="w-3.5 h-3.5" style={{ color: "#FF7A00" }} /> : <Play className="w-3.5 h-3.5 ml-0.5" style={{ color: "#FF7A00" }} />}
                    </button>
                    <button onClick={() => setIsMuted(!isMuted)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#1A0B00" }}>
                      {isMuted ? <VolumeX className="w-3.5 h-3.5" style={{ color: "#6a4020" }} /> : <Volume2 className="w-3.5 h-3.5" style={{ color: "#6a4020" }} />}
                    </button>
                    <span className="text-xs ml-auto font-mono" style={{ color: "#6a4020" }}>
                      {fmt(currentTime)} · {previewClipIdx + 1}/{timeline.length}
                    </span>
                  </div>
                  {timeline[previewClipIdx] && (
                    <input type="range" min={timeline[previewClipIdx].trimStart} max={timeline[previewClipIdx].trimEnd} step={0.01} value={currentTime}
                      onChange={(e) => { const v = +e.target.value; if (previewVideoRef.current) { previewVideoRef.current.currentTime = v; setCurrentTime(v); } }}
                      className="w-full" style={{ accentColor: "#FF7A00" }} />
                  )}
                </div>
              )}
            </div>

            {/* Music */}
            <div className="rounded-2xl p-5" style={{ background: "linear-gradient(135deg, #120700 0%, #1A0B00 100%)", border: "1px solid #3D1A00" }}>
              <div className="flex items-center gap-2 mb-3">
                <Music className="w-4 h-4" style={{ color: "#FFB347" }} />
                <h3 className="font-bold text-white">Musique de fond</h3>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#FFB34722", border: "1px solid #FFB34744", color: "#FFB347", fontSize: "0.65rem" }}>
                  Externe OK
                </span>
              </div>

              {musicFile ? (
                <div>
                  <div className="flex items-center gap-2 p-3 rounded-xl mb-3" style={{ background: "#0D0500", border: "1px solid #FFB34733" }}>
                    <Music className="w-4 h-4 flex-shrink-0" style={{ color: "#FFB347" }} />
                    <span className="text-xs text-white truncate flex-1">{musicFile.name}</span>
                    <button onClick={() => { setMusicFile(null); if (musicUrl) URL.revokeObjectURL(musicUrl); setMusicUrl(null); }} style={{ color: "#6a4020" }}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setIsMusicMuted(!isMusicMuted)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#1A0B00" }}>
                      {isMusicMuted ? <VolumeX className="w-3.5 h-3.5" style={{ color: "#6a4020" }} /> : <Volume2 className="w-3.5 h-3.5" style={{ color: "#FFB347" }} />}
                    </button>
                    <input type="range" min={0} max={1} step={0.05} value={musicVolume}
                      onChange={(e) => setMusicVolume(+e.target.value)}
                      className="flex-1" style={{ accentColor: "#FFB347" }} />
                    <span className="text-xs w-8 text-right font-mono" style={{ color: "#FFB347" }}>{Math.round(musicVolume * 100)}%</span>
                  </div>
                  {musicUrl && <audio ref={musicRef} src={musicUrl} loop style={{ display: "none" }} />}
                </div>
              ) : (
                <>
                  <input ref={musicInputRef} type="file" accept="audio/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMusicUpload(f); }} />
                  <button onClick={() => musicInputRef.current?.click()}
                    className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all"
                    style={{ background: "#FFB34711", border: "2px dashed #FFB34744", color: "#FFB347" }}>
                    <Music className="w-4 h-4" /> Importer une musique
                  </button>
                  <p className="text-xs mt-2 text-center" style={{ color: "#3D1A00" }}>MP3, WAV, OGG…</p>
                </>
              )}
            </div>

            {/* Export */}
            <div className="rounded-2xl p-5" style={{ background: "linear-gradient(135deg, #120700 0%, #1A0B00 100%)", border: "1px solid #3D1A00" }}>
              <h3 className="font-bold text-white mb-1">Exporter le montage</h3>
              <p className="text-xs mb-4" style={{ color: "#6a4020" }}>Tous tes clips seront fusionnés en un seul fichier WebM.</p>
              {exportState === "exporting" && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span style={{ color: "#FFB347" }}>{exportLabel}</span>
                    <span style={{ color: "#FF7A00" }}>{exportProgress}%</span>
                  </div>
                  <div className="rounded-full overflow-hidden" style={{ height: "4px", background: "#1A0B00" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${exportProgress}%`, background: "linear-gradient(90deg, #FF7A00, #FFB347)" }} />
                  </div>
                </div>
              )}
              <button onClick={handleExport} disabled={!timeline.length || exportState === "exporting"}
                className="btn-primary w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                {exportState === "exporting" ? <><Loader2 className="w-4 h-4 animate-spin" />Export en cours…</>
                  : exportState === "done" ? <><CheckCircle className="w-4 h-4" />Téléchargé !</>
                  : <><Download className="w-4 h-4" />Exporter en WebM</>}
              </button>
              <p className="text-xs mt-3 text-center" style={{ color: "#3D1A00" }}>Convertis en MP4 avec HandBrake (gratuit)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
