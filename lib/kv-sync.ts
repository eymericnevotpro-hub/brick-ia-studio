"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { applyBackup, collectLocalData, installLocalStorageWatcher } from "@/lib/backup";

const PUSH_DEBOUNCE_MS = 1500;
const POLL_MS = 8000;

export type SyncStatus = "off" | "idle" | "pushing" | "pulling" | "error";

// Cloud sync backed by our own /api/sync route (Vercel KV / Upstash Redis).
// No account, no code — every device shares one blob automatically.
export function useKvSync() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const lastHashRef = useRef<string>("");
  const readyRef = useRef(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── pull ─────────────────────────────────────────────────────────── */
  const pull = useCallback(async (silent = false): Promise<"empty" | "applied" | "error" | "off"> => {
    if (!silent) setStatus("pulling");
    setError(null);
    try {
      const res = await fetch("/api/sync", { cache: "no-store" });
      const j = (await res.json()) as { configured: boolean; data?: Record<string, unknown> };
      if (!j.configured) {
        setConfigured(false);
        setStatus("off");
        return "off";
      }
      setConfigured(true);
      const obj = j.data;
      if (obj && typeof obj === "object" && Object.keys(obj).length > 0) {
        const remoteHash = hashOf(obj);
        if (remoteHash !== lastHashRef.current) {
          applyBackup({ version: 1, exportedAt: new Date().toISOString(), data: obj });
          lastHashRef.current = remoteHash;
          setLastSync(new Date());
        }
        if (!silent) setStatus("idle");
        return "applied";
      }
      if (!silent) setStatus("idle");
      return "empty";
    } catch (e) {
      if (!silent) {
        setError(e instanceof Error ? e.message : "Erreur de récupération");
        setStatus("error");
      }
      return "error";
    }
  }, []);

  /* ── push ─────────────────────────────────────────────────────────── */
  const push = useCallback(async (force = false) => {
    if (!force && !readyRef.current) return;
    const data = collectLocalData();
    const h = hashOf(data);
    if (!force && h === lastHashRef.current) {
      setPending(false);
      return;
    }
    setStatus("pushing");
    setError(null);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ data }),
      });
      if (!res.ok) throw new Error("push");
      lastHashRef.current = h;
      setLastSync(new Date());
      setPending(false);
      setStatus("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur d'envoi");
      setStatus("error");
    }
  }, []);

  /* ── initial sync on mount ────────────────────────────────────────── */
  useEffect(() => {
    if (typeof window === "undefined") return;
    installLocalStorageWatcher();
    let cancelled = false;
    (async () => {
      const result = await pull();
      if (cancelled) return;
      // Seed the empty shared blob from this device's local data.
      if (result === "empty") await push(true);
      readyRef.current = true;
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── auto-push on local changes ───────────────────────────────────── */
  useEffect(() => {
    if (configured === false) return;
    const onChange = () => {
      setPending(true);
      if (pushTimer.current) clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(() => { push(); }, PUSH_DEBOUNCE_MS);
    };
    window.addEventListener("disc:change", onChange);
    return () => {
      window.removeEventListener("disc:change", onChange);
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [configured, push]);

  /* ── auto-pull: poll + on focus/visibility ────────────────────────── */
  useEffect(() => {
    if (configured === false) return;
    const poll = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      pull(true);
    };
    const id = setInterval(poll, POLL_MS);
    const onVisible = () => {
      if (typeof document === "undefined" || document.visibilityState === "visible") pull(true);
    };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [configured, pull]);

  return { configured, status, lastSync, error, pending, push, pull };
}

/* ── stable hash so we don't push/pull unchanged data ─────────────── */

function hashOf(o: unknown): string {
  const str = JSON.stringify(sortKeys(o));
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h.toString(16);
}

function sortKeys(o: unknown): unknown {
  if (o == null || typeof o !== "object") return o;
  if (Array.isArray(o)) return o.map(sortKeys);
  const obj = o as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const k of Object.keys(obj).sort()) sorted[k] = sortKeys(obj[k]);
  return sorted;
}
