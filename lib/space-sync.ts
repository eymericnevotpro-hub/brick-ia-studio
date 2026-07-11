"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { applyBackup, collectLocalData, installLocalStorageWatcher } from "@/lib/backup";

// The shared code is stored OUTSIDE the "disc." namespace so it never gets
// synced into the shared data itself.
const CODE_KEY = "bproductive.spaceCode";
const PUSH_DEBOUNCE_MS = 1500;
const POLL_MS = 8000; // check the cloud for the other device's changes

export type SpaceStatus = "off" | "idle" | "pushing" | "pulling" | "error";

// Turn a human passphrase into a long opaque key. A fixed salt widens the
// keyspace; the passphrase is still the secret, so pick a non-trivial one.
export async function hashCode(code: string): Promise<string> {
  const salted = "bproductive-space-v1:" + code.trim().toLowerCase();
  const bytes = new TextEncoder().encode(salted);
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function useSpaceSync() {
  const [configured] = useState(isSupabaseConfigured());
  const [code, setCode] = useState<string | null>(null);
  const [status, setStatus] = useState<SpaceStatus>("off");
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const keyRef = useRef<string | null>(null);
  const lastHashRef = useRef<string>("");
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── restore stored code on mount ─────────────────────────────────── */
  useEffect(() => {
    if (typeof window === "undefined" || !configured) return;
    installLocalStorageWatcher();
    const stored = window.localStorage.getItem(CODE_KEY);
    if (stored) {
      hashCode(stored).then((k) => {
        keyRef.current = k;
        setCode(stored);
        setStatus("idle");
      });
    }
  }, [configured]);

  /* ── pull ─────────────────────────────────────────────────────────── */
  // `silent` is used by the background poller so the UI doesn't flicker
  // "réception…" every few seconds; it only reports when data actually changes.
  const pull = useCallback(async (silent = false): Promise<"empty" | "applied" | "error"> => {
    const sb = getSupabase();
    if (!sb || !keyRef.current) return "error";
    if (!silent) setStatus("pulling");
    setError(null);
    try {
      const { data, error: e } = await sb.rpc("space_pull", { p_key: keyRef.current });
      if (e) throw e;
      const obj = data as Record<string, unknown> | null;
      if (obj && typeof obj === "object" && Object.keys(obj).length > 0) {
        const remoteHash = hashOf(obj);
        // Only apply when the remote genuinely differs from what we last
        // synced — avoids clobbering unsaved local edits and echo loops.
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
    } catch (err) {
      if (!silent) {
        setError(errMsg(err));
        setStatus("error");
      }
      return "error";
    }
  }, []);

  /* ── push ─────────────────────────────────────────────────────────── */
  const push = useCallback(async (force = false) => {
    const sb = getSupabase();
    if (!sb || !keyRef.current) return;
    const data = collectLocalData();
    const h = hashOf(data);
    if (!force && h === lastHashRef.current) {
      setPending(false);
      return;
    }
    setStatus("pushing");
    setError(null);
    try {
      const { error: e } = await sb.rpc("space_push", { p_key: keyRef.current, p_data: data });
      if (e) throw e;
      lastHashRef.current = h;
      setLastSync(new Date());
      setPending(false);
      setStatus("idle");
    } catch (err) {
      setError(errMsg(err));
      setStatus("error");
    }
  }, []);

  /* ── auto-push on local changes ───────────────────────────────────── */
  useEffect(() => {
    if (!configured || !code) return;
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
  }, [configured, code, push]);

  /* ── auto-pull: poll the cloud + pull whenever the app regains focus ─ */
  useEffect(() => {
    if (!configured || !code) return;
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
  }, [configured, code, pull]);

  /* ── connect / disconnect ─────────────────────────────────────────── */
  const connect = useCallback(async (rawCode: string) => {
    const c = rawCode.trim();
    if (c.length < 4) throw new Error("Code trop court (4 caractères minimum).");
    if (!isSupabaseConfigured()) throw new Error("Supabase non configuré.");
    const key = await hashCode(c);
    keyRef.current = key;
    if (typeof window !== "undefined") window.localStorage.setItem(CODE_KEY, c);
    setCode(c);
    // Whoever connects to a fresh (empty) space seeds it with their data;
    // otherwise the existing shared data wins.
    const result = await pull();
    if (result === "empty") await push(true);
  }, [pull, push]);

  const disconnect = useCallback(() => {
    if (typeof window !== "undefined") window.localStorage.removeItem(CODE_KEY);
    keyRef.current = null;
    lastHashRef.current = "";
    setCode(null);
    setStatus("off");
    setLastSync(null);
    setError(null);
    setPending(false);
  }, []);

  return { configured, code, status, lastSync, error, pending, connect, disconnect, push, pull };
}

/* ── helpers ──────────────────────────────────────────────────────── */

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return "Erreur de synchronisation";
}

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
