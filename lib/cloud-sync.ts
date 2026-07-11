"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { CLOUD_TABLE, getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { applyBackup, collectLocalData, installLocalStorageWatcher } from "@/lib/backup";

export type SyncStatus = "off" | "idle" | "pushing" | "pulling" | "error";

export interface CloudSyncState {
  configured: boolean;
  session: Session | null;
  status: SyncStatus;
  lastSync: Date | null;
  error: string | null;
  pendingChanges: boolean;
}

const PUSH_DEBOUNCE_MS = 1500;

export function useCloudSync() {
  const [configured] = useState(isSupabaseConfigured());
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<SyncStatus>(configured ? "idle" : "off");
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState(false);

  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const lastPushedHashRef = useRef<string>("");

  // Keep a mirror of session in a ref so the debounced push has the latest one.
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  /* ── 1) install watcher + read existing session ────────────────────── */
  useEffect(() => {
    if (!configured) return;
    installLocalStorageWatcher();
    const sb = getSupabase();
    if (!sb) return;

    let cancelled = false;
    sb.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session ?? null);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_event, s) => setSession(s ?? null));
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [configured]);

  /* ── 2) pull when session becomes available ─────────────────────────── */
  const pull = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !sessionRef.current) return;
    setStatus("pulling");
    setError(null);
    try {
      const { data, error: e } = await sb
        .from(CLOUD_TABLE)
        .select("data, updated_at")
        .eq("user_id", sessionRef.current.user.id)
        .maybeSingle();
      if (e) throw e;
      if (data && data.data && typeof data.data === "object") {
        // Apply the cloud snapshot directly. Last-write-wins.
        applyBackup({ version: 1, exportedAt: data.updated_at, data: data.data as Record<string, unknown> });
        setLastSync(new Date());
        // Remember the hash we just pulled so we don't immediately push it back.
        lastPushedHashRef.current = hashOf(collectLocalData());
      }
      setStatus("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de récupération");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    // Latest session is now in the ref via the effect above; pull() reads it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    pull();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id]);

  /* ── 3) push on local changes (debounced) ───────────────────────────── */
  const push = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !sessionRef.current) return;
    const data = collectLocalData();
    const h = hashOf(data);
    if (h === lastPushedHashRef.current) {
      setPendingChanges(false);
      return;
    }
    setStatus("pushing");
    setError(null);
    try {
      const { error: e } = await sb
        .from(CLOUD_TABLE)
        .upsert({ user_id: sessionRef.current.user.id, data, updated_at: new Date().toISOString() });
      if (e) throw e;
      lastPushedHashRef.current = h;
      setLastSync(new Date());
      setPendingChanges(false);
      setStatus("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur d'envoi");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (!configured) return;
    const onChange = () => {
      setPendingChanges(true);
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
      pushTimerRef.current = setTimeout(() => { push(); }, PUSH_DEBOUNCE_MS);
    };
    window.addEventListener("disc:change", onChange);
    return () => {
      window.removeEventListener("disc:change", onChange);
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
  }, [configured, push]);

  /* ── 4) auth helpers ────────────────────────────────────────────────── */
  const signIn = useCallback(async (email: string) => {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase non configuré");
    setError(null);
    const redirectTo = typeof window !== "undefined" ? window.location.origin + "/install" : undefined;
    const { error: e } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
    if (e) throw e;
  }, []);

  // Email + password — no email is ever sent, so no rate limit. Tries to sign
  // in first; if the account doesn't exist yet, creates it then signs in.
  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase non configuré");
    setError(null);
    const { error: e } = await sb.auth.signInWithPassword({ email, password });
    if (!e) return;
    // Wrong credentials OR account not created yet.
    if (e.message?.toLowerCase().includes("invalid login")) {
      const { error: signUpErr, data } = await sb.auth.signUp({ email, password });
      if (signUpErr) throw signUpErr;
      // If email confirmation is OFF, a session is returned immediately.
      if (data.session) return;
      // If confirmation is ON, sign-in still fails until confirmed — surface a hint.
      const { error: e2 } = await sb.auth.signInWithPassword({ email, password });
      if (e2) throw new Error("Compte créé. Désactive « Confirm email » dans Supabase (Authentication → Providers → Email) pour te connecter sans e-mail.");
      return;
    }
    throw e;
  }, []);

  const signOut = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    await sb.auth.signOut();
    setSession(null);
  }, []);

  return {
    configured,
    session,
    status,
    lastSync,
    error,
    pendingChanges,
    pull,
    push,
    signIn,
    signInWithPassword,
    signOut,
  };
}

function hashOf(o: unknown): string {
  // Stable JSON.stringify with sorted keys, hashed via FNV-1a.
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
