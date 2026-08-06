"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";
import { Btn } from "@/components/discipline-ui";
import { applyBackup, downloadBackup, readBackupFile, RestoreResult } from "@/lib/backup";
import { useSyncCtx } from "@/components/CloudSyncProvider";

export default function InstallApp() {
  const [origin, setOrigin] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [canInstallPwa, setCanInstallPwa] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstallPwa(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const installPwa = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setCanInstallPwa(false);
  };

  const pwaBuilderUrl = origin ? `https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(origin)}` : "";

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(origin);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* ignore */ }
  };

  return (
    <div style={{ position: "relative", zIndex: 1, padding: "20px 28px 60px", maxWidth: 900, margin: "0 auto" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--ink)", color: "var(--orange)", display: "grid", placeItems: "center", boxShadow: "var(--shadow-md)", fontSize: 22 }}>
          📱
        </div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em" }}>Installer & synchroniser</div>
          <div style={{ fontSize: 12, color: "var(--ink-2)" }}>App sur ton téléphone, données identiques partout</div>
        </div>
      </header>

      {/* PWA install */}
      <Card>
        <div style={{ fontSize: 11, color: "var(--orange)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>1 · Installer l&apos;app</div>
        <h2 style={{ margin: "6px 0 0", fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>Sur ton écran d&apos;accueil</h2>
        <p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.55, marginTop: 6 }}>
          Bproductive est une PWA — ton téléphone peut l&apos;installer comme une vraie app.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
          {canInstallPwa ? (
            <Btn kind="primary" size="md" onClick={installPwa}>Installer maintenant</Btn>
          ) : (
            <div style={{ background: "var(--bg-2)", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6 }}>
              <b>Chrome / Android</b> : menu ⋮ → <i>Ajouter à l&apos;écran d&apos;accueil</i>.<br />
              <b>Safari / iOS</b> : bouton <i>Partager</i> → <i>Sur l&apos;écran d&apos;accueil</i>.
            </div>
          )}
          {pwaBuilderUrl && (
            <a href={pwaBuilderUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 14px", borderRadius: 999, background: "var(--bg-2)", color: "var(--ink-2)", fontWeight: 600, fontSize: 13, textDecoration: "none" }}>
              .APK via PWABuilder →
            </a>
          )}
          <button onClick={copyUrl} style={{ padding: "10px 14px", borderRadius: 999, background: "transparent", color: "var(--ink-3)", fontSize: 12.5 }}>
            {copied ? "✓ Copié" : `Copier ${origin}`}
          </button>
        </div>
      </Card>

      <Spacer />

      {/* Cloud sync (Vercel KV) */}
      <SyncCard />

      <Spacer />

      {/* Backup local */}
      <BackupCard />

      <div style={{ fontSize: 11.5, color: "var(--ink-3)", lineHeight: 1.55, padding: "16px 4px 0" }}>
        La <b>synchro cloud</b> est automatique entre tous tes appareils (aucun code à taper). Le <b>backup local</b> te fait un fichier <span className="mono">.json</span> de secours à garder où tu veux.
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Cloud sync card (Vercel KV)                                          */
/* ────────────────────────────────────────────────────────────────────── */

function SyncCard() {
  const { configured, status, lastSync, error, pending, push, pull } = useSyncCtx();

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: configured ? "var(--green)" : configured === false ? "#C44A00" : "var(--ink-3)" }} />
            <div style={{ fontSize: 11, color: "var(--orange)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>2 · Synchro automatique</div>
          </div>
          <h2 style={{ margin: "6px 0 0", fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>Mêmes données partout</h2>
          <p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.55, marginTop: 6 }}>
            Tes données vivent en ligne (Vercel KV) et se synchronisent toutes seules entre PC et téléphone. Rien à configurer côté app.
          </p>
        </div>
        {configured && (
          <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--green)", background: "#E6F5EC", padding: "4px 10px", borderRadius: 999, letterSpacing: "0.06em", textTransform: "uppercase" }}>Actif</span>
        )}
      </div>

      {configured === false && (
        <div style={{ background: "var(--orange-50)", border: "1px solid var(--orange-100)", borderRadius: 12, padding: 14, marginTop: 12, fontSize: 13, color: "var(--ink)", lineHeight: 1.6 }}>
          <b>La base cloud n&apos;est pas encore branchée.</b> Sur Vercel : <b>Storage → Create Database → KV (Redis)</b> → <b>Connect Project</b> (à ton projet) → <b>Redeploy</b>. Ça ajoute les clés tout seul, aucune ligne de SQL. En attendant, tes données restent locales à chaque appareil (utilise le backup ci-dessous pour les transférer).
        </div>
      )}

      {configured && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            <Tile label="Dernière synchro" value={lastSync ? lastSync.toLocaleTimeString("fr-FR") : "—"} />
            <Tile label="Statut" value={statusLabel(status, pending)} accent={status === "pushing" || status === "pulling"} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn kind="soft" size="sm" onClick={() => push(true)}>Pousser maintenant</Btn>
            <Btn kind="soft" size="sm" onClick={() => pull()}>Tirer du cloud</Btn>
          </div>
          {error && <div style={{ fontSize: 12, color: "#C44A00" }}>{error}</div>}
          <div style={{ fontSize: 11.5, color: "var(--ink-3)", lineHeight: 1.55 }}>
            Après avoir branché le KV : ouvre l&apos;app sur l&apos;appareil qui a les <b>bonnes données</b> et clique <b>« Pousser maintenant »</b>, puis ouvre l&apos;autre appareil (il récupère tout).
          </div>
        </div>
      )}

      {configured === null && (
        <div style={{ marginTop: 12, fontSize: 12.5, color: "var(--ink-3)" }}>Vérification de la synchro…</div>
      )}
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Backup local card                                                    */
/* ────────────────────────────────────────────────────────────────────── */

function BackupCard() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<RestoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<File | null>(null);

  const onPick = (file: File | null) => {
    if (!file) return;
    setError(null);
    setResult(null);
    setConfirming(file);
  };
  const onConfirmRestore = async () => {
    if (!confirming) return;
    try {
      const data = await readBackupFile(confirming);
      const r = applyBackup(data);
      setResult(r);
      setConfirming(null);
      setTimeout(() => window.location.reload(), 600);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fichier illisible");
      setConfirming(null);
    }
  };

  return (
    <Card>
      <div style={{ fontSize: 11, color: "var(--orange)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>3 · Backup local</div>
      <h2 style={{ margin: "6px 0 0", fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>Export / Import JSON</h2>
      <p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.55, marginTop: 6 }}>
        Sans compte, sans serveur. Un fichier <span className="mono">.json</span> qui contient TOUT (tâches, revenus, budget, objectifs…). Ré-importable sur n&apos;importe quel appareil.
      </p>

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <Btn kind="primary" size="md" onClick={downloadBackup}>Exporter mes données</Btn>
        <Btn kind="soft" size="md" onClick={() => fileInputRef.current?.click()}>Importer un fichier</Btn>
        <input ref={fileInputRef} type="file" accept="application/json,.json" hidden onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
      </div>

      {confirming && (
        <div style={{ background: "rgba(196,74,0,0.08)", border: "1px solid rgba(196,74,0,0.25)", borderRadius: 12, padding: 14, marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 13, color: "#C44A00" }}>⚠️ Importer <b>{confirming.name}</b> va <b>écraser</b> les données de cet appareil. Continue ?</div>
          <div style={{ display: "flex", gap: 6 }}>
            <Btn kind="ghost" size="sm" onClick={() => setConfirming(null)}>Annuler</Btn>
            <button onClick={onConfirmRestore} style={{ padding: "8px 14px", borderRadius: 999, background: "#C44A00", color: "white", fontSize: 13, fontWeight: 600 }}>Oui, écraser</button>
          </div>
        </div>
      )}

      {result && (
        <div style={{ background: "#E6F5EC", border: "1px solid #B7E0C6", borderRadius: 12, padding: 12, marginTop: 12, fontSize: 13, color: "var(--ink)" }}>
          ✓ Importé {result.imported} clé{result.imported > 1 ? "s" : ""}. L&apos;app se recharge…
        </div>
      )}

      {error && <div style={{ fontSize: 12, color: "#C44A00", marginTop: 8 }}>{error}</div>}
    </Card>
  );
}

/* ── shared helpers ─────────────────────────────────────────────────── */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section>
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 24, padding: 22, boxShadow: "var(--shadow-sm)" }}>
        {children}
      </div>
    </section>
  );
}

function Spacer() {
  return <div style={{ height: 18 }} />;
}

function Tile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ background: "var(--bg-2)", borderRadius: 12, padding: "10px 12px" }}>
      <div style={{ fontSize: 10.5, color: "var(--ink-3)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: accent ? "var(--orange)" : "var(--ink)", marginTop: 2, wordBreak: "break-word" } as CSSProperties}>{value}</div>
    </div>
  );
}

function statusLabel(s: "off" | "idle" | "pushing" | "pulling" | "error", pending: boolean): string {
  if (s === "off") return "désactivé";
  if (s === "pushing") return "envoi…";
  if (s === "pulling") return "réception…";
  if (s === "error") return "erreur";
  return pending ? "en attente" : "à jour";
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: ReadonlyArray<string>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}
