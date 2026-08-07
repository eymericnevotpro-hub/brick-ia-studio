"use client";

import { useEffect, useState } from "react";
import { Btn, Icon, useLS } from "@/components/discipline-ui";
import {
  DEFAULT_IDEAS,
  VideoIdea,
  ideaTodayIso,
  ideaUid,
  refKind,
  youtubeThumb,
} from "@/lib/tournage-store";

export default function TournageBoard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  if (!mounted) return <div style={{ minHeight: "100vh", background: "var(--bg)" }} />;
  return <Inner />;
}

function Inner() {
  const [ideas, setIdeas] = useLS<VideoIdea[]>("disc.videoIdeas.v1", DEFAULT_IDEAS);
  const [editingId, setEditingId] = useState<string | null>(null);

  const todo = ideas.filter((i) => !i.done);
  const done = ideas.filter((i) => i.done);

  const add = () => {
    const idea: VideoIdea = { id: ideaUid(), title: "", note: "", ref: "", createdAt: ideaTodayIso() };
    setIdeas((prev) => [idea, ...prev]);
    setEditingId(idea.id);
  };
  const update = (id: string, patch: Partial<VideoIdea>) => setIdeas((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const remove = (id: string) => { setIdeas((prev) => prev.filter((i) => i.id !== id)); if (editingId === id) setEditingId(null); };

  return (
    <div style={{ position: "relative", zIndex: 1, padding: "18px 20px 60px", maxWidth: 720, margin: "0 auto" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--ink)", color: "var(--orange)", display: "grid", placeItems: "center", boxShadow: "var(--shadow-md)", fontSize: 20 }}>🎬</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em" }}>Tournage</div>
            <div style={{ fontSize: 12, color: "var(--ink-2)" }}>{todo.length} idée{todo.length > 1 ? "s" : ""} à tourner</div>
          </div>
        </div>
        <Btn kind="primary" size="md" icon="plus" onClick={add}>Nouvelle idée</Btn>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {todo.length === 0 && (
          <div style={{ background: "var(--card)", border: "1px dashed var(--line)", borderRadius: 18, padding: 24, textAlign: "center", fontSize: 13.5, color: "var(--ink-2)" }}>
            Aucune idée en attente. Clique « Nouvelle idée » pour en ajouter une.
          </div>
        )}
        {todo.map((idea) => (
          <IdeaCard
            key={idea.id}
            idea={idea}
            editing={editingId === idea.id}
            onEdit={() => setEditingId(editingId === idea.id ? null : idea.id)}
            onUpdate={(p) => update(idea.id, p)}
            onRemove={() => remove(idea.id)}
            onToggleDone={() => update(idea.id, { done: !idea.done })}
          />
        ))}
      </div>

      {done.length > 0 && (
        <details style={{ marginTop: 18 }}>
          <summary style={{ cursor: "pointer", fontSize: 13, color: "var(--ink-2)", fontWeight: 600 }}>
            ✅ Tournées ({done.length})
          </summary>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
            {done.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                editing={editingId === idea.id}
                onEdit={() => setEditingId(editingId === idea.id ? null : idea.id)}
                onUpdate={(p) => update(idea.id, p)}
                onRemove={() => remove(idea.id)}
                onToggleDone={() => update(idea.id, { done: !idea.done })}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function IdeaCard({
  idea,
  editing,
  onEdit,
  onUpdate,
  onRemove,
  onToggleDone,
}: {
  idea: VideoIdea;
  editing: boolean;
  onEdit: () => void;
  onUpdate: (patch: Partial<VideoIdea>) => void;
  onRemove: () => void;
  onToggleDone: () => void;
}) {
  const thumb = youtubeThumb(idea.ref);
  const kind = refKind(idea.ref);

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 18, padding: 16, display: "flex", flexDirection: "column", gap: 12, opacity: idea.done ? 0.7 : 1 }}>
      {editing ? (
        <>
          <input
            value={idea.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Titre de l'idée"
            style={{ background: "var(--bg-2)", border: "1px solid transparent", borderRadius: 10, padding: "10px 12px", fontSize: 15, fontWeight: 600, outline: "none", color: "var(--ink)" }}
          />
          <textarea
            value={idea.note ?? ""}
            onChange={(e) => onUpdate({ note: e.target.value })}
            placeholder="Note / description (optionnel)"
            rows={2}
            style={{ background: "var(--bg-2)", border: "1px solid transparent", borderRadius: 10, padding: "10px 12px", fontSize: 13.5, outline: "none", color: "var(--ink)", resize: "vertical" }}
          />
          <input
            value={idea.ref ?? ""}
            onChange={(e) => onUpdate({ ref: e.target.value })}
            placeholder="Lien de référence (YouTube, Insta…)"
            style={{ background: "var(--bg-2)", border: "1px solid transparent", borderRadius: 10, padding: "10px 12px", fontSize: 13, outline: "none", color: "var(--ink)", fontFamily: "Geist Mono, monospace" }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <Btn kind="primary" size="sm" icon="check" onClick={onEdit}>Terminé</Btn>
            <Btn kind="ghost" size="sm" onClick={onRemove}>Supprimer</Btn>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <button
              onClick={onToggleDone}
              title={idea.done ? "Remettre à tourner" : "Marquer comme tournée"}
              style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, marginTop: 2, background: idea.done ? "var(--green)" : "transparent", border: "1.8px solid", borderColor: idea.done ? "var(--green)" : "var(--line)", display: "grid", placeItems: "center", cursor: "pointer" }}
            >
              {idea.done && <Icon name="check" size={16} color="white" stroke={2.6} />}
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15.5, fontWeight: 600, letterSpacing: "-0.01em", textDecoration: idea.done ? "line-through" : "none" }}>{idea.title || "(sans titre)"}</div>
              {idea.note && <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 3, lineHeight: 1.45 }}>{idea.note}</div>}
            </div>
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              <button onClick={onEdit} title="Modifier" style={{ width: 30, height: 30, borderRadius: 8, background: "var(--bg-2)", color: "var(--ink-2)", fontSize: 14, fontWeight: 700, display: "grid", placeItems: "center" }}>✎</button>
              <button onClick={onRemove} title="Supprimer" style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(196,74,0,0.08)", color: "#C44A00", fontSize: 14, fontWeight: 700, display: "grid", placeItems: "center" }}>✕</button>
            </div>
          </div>

          {idea.ref && (
            <a
              href={idea.ref}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", background: "var(--bg-2)", borderRadius: 12, padding: thumb ? 8 : "10px 12px", color: "var(--ink)" }}
            >
              {thumb ? (
                <span style={{ position: "relative", width: 120, height: 68, borderRadius: 8, overflow: "hidden", flexShrink: 0, background: "var(--ink)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
                    <span style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(0,0,0,0.55)", display: "grid", placeItems: "center" }}>
                      <Icon name="play" size={16} color="white" />
                    </span>
                  </span>
                </span>
              ) : (
                <span style={{ width: 34, height: 34, borderRadius: 9, background: kindColor(kind), color: "white", display: "grid", placeItems: "center", flexShrink: 0, fontSize: 16 }}>{kindEmoji(kind)}</span>
              )}
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: kindColor(kind), letterSpacing: "0.04em", textTransform: "uppercase" }}>{kindLabel(kind)}</span>
                <span style={{ display: "block", fontSize: 11.5, color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "Geist Mono, monospace" }}>{idea.ref}</span>
              </span>
              <Icon name="arrow" size={16} color="var(--ink-3)" />
            </a>
          )}
        </>
      )}
    </div>
  );
}

function kindLabel(k: ReturnType<typeof refKind>): string {
  return k === "youtube" ? "Référence YouTube" : k === "instagram" ? "Référence Instagram" : k === "tiktok" ? "Référence TikTok" : "Référence";
}
function kindEmoji(k: ReturnType<typeof refKind>): string {
  return k === "youtube" ? "▶" : k === "instagram" ? "📷" : k === "tiktok" ? "🎵" : "🔗";
}
function kindColor(k: ReturnType<typeof refKind>): string {
  return k === "youtube" ? "#FF0000" : k === "instagram" ? "#E1306C" : k === "tiktok" ? "#000000" : "var(--orange)";
}
