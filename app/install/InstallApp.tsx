"use client";

import { useEffect, useState } from "react";
import { Btn } from "@/components/discipline-ui";

export default function InstallApp() {
  const [origin, setOrigin] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [canInstallPwa, setCanInstallPwa] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
  }, []);

  // Catch the install prompt so we can offer "install as PWA" in one click.
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
          <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em" }}>Installer</div>
          <div style={{ fontSize: 12, color: "var(--ink-2)" }}>Avoir Discipline en vraie app sur ton téléphone</div>
        </div>
      </header>

      {/* Hero card — install as PWA (instant) */}
      <section style={{ marginBottom: 18 }}>
        <div
          style={{
            background: "linear-gradient(135deg, #FFF1E2 0%, #FFE0C7 100%)",
            border: "1px solid var(--orange-100)",
            borderRadius: 24,
            padding: 22,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", top: -40, right: -40, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(255,106,26,0.35), transparent 70%)", pointerEvents: "none" }} />

          <div style={{ position: "relative" }}>
            <div style={{ fontSize: 11, color: "var(--orange)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>
              Option recommandée · gratuite · 5 secondes
            </div>
            <h2 style={{ margin: "8px 0 0", fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>
              Installer directement sur ton écran d&apos;accueil
            </h2>
            <p style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.55, marginTop: 8, maxWidth: 600 }}>
              Discipline est une <b>PWA</b>. Ton téléphone peut l&apos;installer comme une vraie app, avec icône, plein écran et tes données déjà là — pas besoin de fichier APK pour l&apos;usage perso.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
              {canInstallPwa ? (
                <Btn kind="primary" size="lg" onClick={installPwa}>
                  Installer maintenant
                </Btn>
              ) : (
                <div style={{ background: "white", border: "1px solid var(--orange-100)", borderRadius: 14, padding: "12px 16px", fontSize: 13.5, color: "var(--ink)", maxWidth: 560 }}>
                  Sur ton téléphone, ouvre cette URL dans <b>Chrome (Android)</b> ou <b>Safari (iOS)</b> puis :
                  <ul style={{ margin: "8px 0 0", paddingLeft: 18, lineHeight: 1.7 }}>
                    <li><b>Chrome / Android</b> : menu ⋮ → <i>Ajouter à l&apos;écran d&apos;accueil</i> (ou la bannière qui apparaît).</li>
                    <li><b>Safari / iOS</b> : bouton <i>Partager</i> → <i>Sur l&apos;écran d&apos;accueil</i>.</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* APK card — through PWABuilder */}
      <section style={{ marginBottom: 18 }}>
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 24, padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>
              Vraie APK Android · sideload ou Play Store
            </div>
            <h2 style={{ margin: "6px 0 0", fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>
              Télécharger un fichier .apk
            </h2>
            <p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.55, marginTop: 6 }}>
              Comme je ne peux pas signer un APK depuis ce serveur, le téléchargement passe par <b>PWABuilder</b>. Le clic ci-dessous ouvre PWABuilder avec ton URL pré-remplie, il génère l&apos;APK en 1 min, tu télécharges.
            </p>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            {pwaBuilderUrl ? (
              <a
                href={pwaBuilderUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "12px 18px",
                  borderRadius: 999,
                  background: "var(--orange)",
                  color: "white",
                  fontWeight: 600,
                  fontSize: 14,
                  textDecoration: "none",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                Ouvrir PWABuilder avec mon URL →
              </a>
            ) : (
              <span style={{ fontSize: 13, color: "var(--ink-3)" }}>Chargement…</span>
            )}
            <button
              onClick={copyUrl}
              style={{ padding: "10px 14px", borderRadius: 999, background: "var(--bg-2)", color: "var(--ink-2)", fontSize: 13, fontWeight: 600 }}
            >
              {copied ? "✓ Copié" : `Copier ${origin || "l'URL"}`}
            </button>
          </div>

          <details>
            <summary style={{ cursor: "pointer", fontSize: 12.5, color: "var(--orange)", fontWeight: 600 }}>
              Réglages à mettre dans PWABuilder
            </summary>
            <ul style={{ marginTop: 8, paddingLeft: 18, fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7 }}>
              <li><b>Package ID</b> : <span className="mono">com.brickia.discipline</span></li>
              <li><b>App name</b> : Discipline</li>
              <li><b>Version</b> : 1.0.0</li>
              <li><b>Display mode</b> : Standalone</li>
              <li><b>Status bar color</b> : <span className="mono">#FF6A1A</span></li>
              <li><b>Background color</b> : <span className="mono">#FFF4E8</span></li>
              <li>Format : <b>Test APK</b> si tu veux juste sideload sur ton téléphone, <b>Google Play</b> pour publier.</li>
            </ul>
            <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 8, lineHeight: 1.55 }}>
              Une fois le ZIP téléchargé, transfère le <span className="mono">.apk</span> sur ton téléphone (USB, Drive, mail). Active <i>Sources inconnues</i> dans les paramètres → ouvre le fichier → <b>Installer</b>.
            </div>
          </details>
        </div>
      </section>

      {/* Auto-build via CI — for later */}
      <section style={{ marginBottom: 18 }}>
        <details>
          <summary style={{ cursor: "pointer", fontSize: 13, color: "var(--ink-2)", fontWeight: 600, padding: "10px 14px", background: "var(--bg-2)", borderRadius: 12, listStyle: "none" }}>
            ▸ Avancé · auto-build de l&apos;APK via GitHub Actions
          </summary>
          <div style={{ padding: "12px 14px 0", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6 }}>
            <p>
              Pour qu&apos;un vrai bouton <b>« Télécharger l&apos;APK »</b> apparaisse ici (pointant vers la dernière release GitHub), il faut un workflow CI qui builde l&apos;APK signé à chaque push sur <span className="mono">main</span>.
            </p>
            <p>
              Le repo contient déjà <span className="mono">APK.md</span> avec le détail Bubblewrap CLI. Pour automatiser, il faut :
            </p>
            <ol style={{ paddingLeft: 18 }}>
              <li>Générer une keystore Android une fois : <span className="mono">keytool -genkey -v -keystore discipline.jks -keyalg RSA -keysize 2048 -validity 10000 -alias discipline</span></li>
              <li>Ajouter ces secrets dans <b>GitHub → Settings → Secrets</b> :
                <ul>
                  <li><span className="mono">ANDROID_KEYSTORE</span> (le .jks en base64)</li>
                  <li><span className="mono">ANDROID_KEYSTORE_PASSWORD</span></li>
                  <li><span className="mono">ANDROID_KEY_ALIAS</span></li>
                  <li><span className="mono">ANDROID_KEY_PASSWORD</span></li>
                </ul>
              </li>
              <li>Une fois les secrets en place, dis-moi et je crée le workflow <span className="mono">.github/workflows/build-apk.yml</span>. À chaque push, l&apos;APK signé est attaché à une release GitHub et téléchargeable d&apos;un clic depuis ici.</li>
            </ol>
          </div>
        </details>
      </section>

      <div style={{ fontSize: 11.5, color: "var(--ink-3)", lineHeight: 1.55, padding: "0 4px" }}>
        Dans tous les cas, tes données (cagnotte, objectifs, rituels, records planche, mouvements) restent dans le <span className="mono">localStorage</span> de l&apos;app, sur ton appareil. Pas de serveur, pas de compte, pas de tracking.
      </div>
    </div>
  );
}

// Types for the install prompt event (not in standard lib.dom).
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: ReadonlyArray<string>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}
