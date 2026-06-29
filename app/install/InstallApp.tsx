"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";
import { Btn } from "@/components/discipline-ui";
import { applyBackup, downloadBackup, readBackupFile, RestoreResult } from "@/lib/backup";
import { useCloudSyncCtx } from "@/components/CloudSyncProvider";

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
          <div style={{ fontSize: 12, color: "var(--ink-2)" }}>App sur ton téléphone, données partagées entre tes appareils</div>
        </div>
      </header>

      {/* PWA install */}
      <Card>
        <div style={{ fontSize: 11, color: "var(--orange)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>
          1 · Installer l&apos;app
        </div>
        <h2 style={{ margin: "6px 0 0", fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>Sur ton écran d&apos;accueil</h2>
        <p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.55, marginTop: 6 }}>
          Discipline est une PWA — ton téléphone peut l&apos;installer comme une vraie app.
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
            <a
              href={pwaBuilderUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 14px", borderRadius: 999, background: "var(--bg-2)", color: "var(--ink-2)", fontWeight: 600, fontSize: 13, textDecoration: "none" }}
            >
              .APK via PWABuilder →
            </a>
          )}
          <button onClick={copyUrl} style={{ padding: "10px 14px", borderRadius: 999, background: "transparent", color: "var(--ink-3)", fontSize: 12.5 }}>
            {copied ? "✓ Copié" : `Copier ${origin}`}
          </button>
        </div>
      </Card>

      <Spacer />

      {/* Cloud sync */}
      <CloudSyncCard />

      <Spacer />

      {/* Backup local */}
      <BackupCard />

      <div style={{ fontSize: 11.5, color: "var(--ink-3)", lineHeight: 1.55, padding: "16px 4px 0" }}>
        Choisis ce qui te convient le mieux : le <b>sync cloud</b> est automatique entre tes appareils ;
        le <b>backup local</b> ne demande aucun compte et te fait un fichier <span className="mono">.json</span> à garder où tu veux.
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Cloud sync card                                                      */
/* ────────────────────────────────────────────────────────────────────── */

function CloudSyncCard() {
  const { configured, session, status, lastSync, error, pendingChanges, pull, push, signIn, signOut } = useCloudSyncCtx();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const submitEmail = async () => {
    if (!email.trim()) return;
    setBusy(true);
    setLocalError(null);
    try {
      await signIn(email.trim());
      setSent(true);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Erreur de connexion");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: session ? "var(--green)" : configured ? "var(--orange)" : "var(--ink-3)" }} />
            <div style={{ fontSize: 11, color: "var(--orange)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>
              2 · Synchroniser PC ↔ téléphone
            </div>
          </div>
          <h2 style={{ margin: "6px 0 0", fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>Sync cloud (Supabase)</h2>
          <p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.55, marginTop: 6 }}>
            Connecte-toi une fois sur chaque appareil, et tes données restent identiques partout. Auto-poussées dès que tu modifies quelque chose.
          </p>
        </div>
        {session && (
          <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--green)", background: "#E6F5EC", padding: "4px 10px", borderRadius: 999, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Connecté
          </span>
        )}
      </div>

      {!configured && (
        <div style={{ background: "var(--orange-50)", border: "1px solid var(--orange-100)", borderRadius: 12, padding: 14, marginTop: 12, fontSize: 13, color: "var(--ink)", lineHeight: 1.55 }}>
          <b>Supabase n&apos;est pas encore configuré.</b> Le sync cloud demande deux variables d&apos;env sur Vercel : <span className="mono">NEXT_PUBLIC_SUPABASE_URL</span> et <span className="mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>. Le détail est dans <span className="mono">SUPABASE.md</span> à la racine du repo — 5 minutes à configurer (créer un projet Supabase, exécuter une mini-migration, coller les 2 clés sur Vercel, redéployer). En attendant tu peux utiliser le backup local ci-dessous.
        </div>
      )}

      {configured && !session && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          {sent ? (
            <div style={{ background: "#E6F5EC", border: "1px solid #B7E0C6", borderRadius: 12, padding: 14, fontSize: 13, color: "var(--ink)" }}>
              ✉️ Un lien de connexion a été envoyé à <b>{email}</b>. Clique dessus pour te connecter. Refais la même opération sur ton autre appareil avec le même e-mail pour les synchroniser.
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitEmail()}
                placeholder="ton@email.fr"
                style={{ flex: "1 1 220px", minWidth: 0, padding: "11px 14px", background: "var(--bg-2)", border: "1px solid transparent", borderRadius: 12, fontSize: 14, outline: "none", color: "var(--ink)" }}
              />
              <Btn kind="primary" size="md" onClick={submitEmail} disabled={busy}>
                {busy ? "Envoi…" : "Recevoir un lien magique"}
              </Btn>
            </div>
          )}
          {localError && <div style={{ fontSize: 12, color: "#C44A00" }}>{localError}</div>}
          <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>Pas de mot de passe. Tu reçois un lien par mail, tu cliques, c&apos;est fait.</div>
        </div>
      )}

      {configured && session && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            <Tile label="Compte" value={session.user.email ?? "—"} />
            <Tile label="Dernière synchro" value={lastSync ? lastSync.toLocaleTimeString("fr-FR") : "—"} />
            <Tile label="Statut" value={statusLabel(status, pendingChanges)} accent={status === "pushing" || status === "pulling"} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn kind="soft" size="sm" onClick={() => push()}>Pousser maintenant</Btn>
            <Btn kind="soft" size="sm" onClick={() => pull()}>Tirer du cloud</Btn>
            <Btn kind="ghost" size="sm" onClick={() => signOut()}>Déconnexion</Btn>
          </div>
          {error && <div style={{ fontSize: 12, color: "#C44A00" }}>{error}</div>}
          <div style={{ fontSize: 11.5, color: "var(--ink-3)", lineHeight: 1.55 }}>
            Sur ton autre appareil, va sur cette page et connecte-toi avec le même e-mail. Au premier login, l&apos;app tire les données du cloud — donc <b>fais d&apos;abord ton login + un « Pousser maintenant » depuis ton PC</b> pour pousser les données existantes, ensuite connecte ton téléphone qui les tirera automatiquement.
          </div>
        </div>
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
      // Reload the page so all client components pick up the new localStorage values.
      setTimeout(() => window.location.reload(), 600);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fichier illisible");
      setConfirming(null);
    }
  };

  return (
    <Card>
      <div style={{ fontSize: 11, color: "var(--orange)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>
        3 · Backup local (alternatif)
      </div>
      <h2 style={{ margin: "6px 0 0", fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>Export / Import JSON</h2>
      <p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.55, marginTop: 6 }}>
        Sans compte, sans serveur. Tu télécharges un fichier <span className="mono">.json</span> qui contient TOUT (objectifs, cagnotte, rituels, planche, miniatures, etc.). Tu peux le ré-importer sur n&apos;importe quel appareil.
      </p>

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <Btn kind="primary" size="md" onClick={downloadBackup}>
          Exporter mes données
        </Btn>
        <Btn kind="soft" size="md" onClick={() => fileInputRef.current?.click()}>
          Importer un fichier
        </Btn>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
      </div>

      {confirming && (
        <div style={{ background: "rgba(196,74,0,0.08)", border: "1px solid rgba(196,74,0,0.25)", borderRadius: 12, padding: 14, marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 13, color: "#C44A00" }}>
            ⚠️ Importer <b>{confirming.name}</b> va <b>écraser</b> les données actuelles de cet appareil. Continue ?
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <Btn kind="ghost" size="sm" onClick={() => setConfirming(null)}>Annuler</Btn>
            <button onClick={onConfirmRestore} style={{ padding: "8px 14px", borderRadius: 999, background: "#C44A00", color: "white", fontSize: 13, fontWeight: 600 }}>
              Oui, écraser
            </button>
          </div>
        </div>
      )}

      {result && (
        <div style={{ background: "#E6F5EC", border: "1px solid #B7E0C6", borderRadius: 12, padding: 12, marginTop: 12, fontSize: 13, color: "var(--ink)" }}>
          ✓ Importé {result.imported} clé{result.imported > 1 ? "s" : ""}, {result.skipped} ignorée{result.skipped > 1 ? "s" : ""}. {result.fromOrigin && <>(Source : <span className="mono">{result.fromOrigin}</span>)</>} L&apos;app se recharge…
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
