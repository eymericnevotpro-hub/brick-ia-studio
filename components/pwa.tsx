"use client";

import {
  CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Btn, Icon, useLS } from "@/components/discipline-ui";
import { DEFAULT_LEAD, Habit } from "@/lib/discipline-store";
import {
  notificationPermission,
  registerServiceWorker,
  remindersSupported,
  requestNotificationPermission,
  sendTestReminder,
  syncReminders,
  triggersSupported,
} from "@/lib/reminders";

/* ---------------------------------------------------------------------- */
/*  useReminders — SW registration + permission + schedule sync           */
/* ---------------------------------------------------------------------- */
export interface RemindersApi {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  lead: number;
  setLead: (v: number) => void;
  perm: NotificationPermission;
  supported: boolean;
  usesTriggers: boolean;
  enable: () => Promise<NotificationPermission>;
  test: () => Promise<boolean>;
  remindCount: number;
}

export function useReminders(habits: Habit[]): RemindersApi {
  const [enabled, setEnabled] = useLS<boolean>("disc.remind.on", false);
  const [lead, setLead] = useLS<number>("disc.remind.lead", DEFAULT_LEAD);
  const [perm, setPerm] = useState<NotificationPermission>("default");
  const [supported, setSupported] = useState(false);
  const [usesTriggers, setUsesTriggers] = useState(false);

  useEffect(() => {
    // One-shot feature detection on mount — reads browser APIs into state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(remindersSupported());
    setPerm(notificationPermission());
    setUsesTriggers(triggersSupported());
    registerServiceWorker();
  }, []);

  const remindCount = useMemo(
    () => habits.filter((h) => h.remind !== false).length,
    [habits],
  );

  // Reconcile scheduled reminders whenever the schedule or settings change.
  const syncKey = useMemo(
    () =>
      JSON.stringify(habits.map((h) => [h.id, h.time, h.label, h.remind !== false])) +
      `|${enabled}|${lead}|${perm}`,
    [habits, enabled, lead, perm],
  );
  useEffect(() => {
    syncReminders(habits, lead, enabled);
    // habits/lead/enabled are captured through syncKey on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncKey]);

  // Re-arm fallback timers when the app regains focus.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") syncReminders(habits, lead, enabled);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [habits, lead, enabled]);

  const enable = useCallback(async (): Promise<NotificationPermission> => {
    const p = await requestNotificationPermission();
    setPerm(p);
    if (p === "granted") setEnabled(true);
    return p;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { enabled, setEnabled, lead, setLead, perm, supported, usesTriggers, enable, test: sendTestReminder, remindCount };
}

/* ---------------------------------------------------------------------- */
/*  RemindersCard                                                          */
/* ---------------------------------------------------------------------- */
const cardStyle: CSSProperties = {
  background: "var(--card)",
  borderRadius: 24,
  padding: 22,
  border: "1px solid var(--line)",
  boxShadow: "var(--shadow-sm)",
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const LEAD_OPTIONS = [0, 5, 10, 15, 30];

export function RemindersCard({ api }: { api: RemindersApi }) {
  const { enabled, setEnabled, lead, setLead, perm, supported, usesTriggers, enable, test, remindCount } = api;
  const [testState, setTestState] = useState<"idle" | "sent">("idle");

  const active = enabled && perm === "granted";

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                background: active ? "var(--green)" : "var(--ink-3)",
                boxShadow: active ? "0 0 0 4px rgba(25,163,106,0.18)" : "none",
                transition: "all 220ms",
              }}
            />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>
              Rappels sur l&apos;écran verrouillé
            </h3>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 4, marginLeft: 16 }}>
            Une notification à l&apos;heure de chaque tâche, même téléphone rangé.
          </div>
        </div>
        <span role="img" aria-hidden style={{ fontSize: 22 }}>
          {active ? "🔔" : "🔕"}
        </span>
      </div>

      {!supported && (
        <div style={{ fontSize: 12.5, color: "var(--ink-2)", background: "var(--bg-2)", borderRadius: 12, padding: "12px 14px", lineHeight: 1.5 }}>
          Ton navigateur ne gère pas les notifications. Sur Android, ouvre cette page dans Chrome
          puis « Ajouter à l&apos;écran d&apos;accueil » pour activer les rappels.
        </div>
      )}

      {supported && perm === "denied" && (
        <div style={{ fontSize: 12.5, color: "var(--ink-2)", background: "var(--bg-2)", borderRadius: 12, padding: "12px 14px", lineHeight: 1.5 }}>
          Les notifications sont bloquées. Réactive-les dans les réglages du site
          (cadenas dans la barre d&apos;adresse → Notifications → Autoriser).
        </div>
      )}

      {supported && perm !== "denied" && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 14px", background: "var(--bg-2)", borderRadius: 14 }}>
            <div style={{ fontSize: 13.5, fontWeight: 500 }}>
              {active ? `${remindCount} tâche${remindCount > 1 ? "s" : ""} suivie${remindCount > 1 ? "s" : ""}` : "Activer les rappels"}
            </div>
            <Toggle
              on={active}
              onChange={async (next) => {
                if (next) {
                  await enable();
                } else {
                  setEnabled(false);
                }
              }}
            />
          </div>

          {active && (
            <div>
              <div style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
                Me prévenir
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {LEAD_OPTIONS.map((m) => {
                  const sel = lead === m;
                  return (
                    <button
                      key={m}
                      onClick={() => setLead(m)}
                      style={{
                        padding: "8px 13px",
                        borderRadius: 999,
                        fontSize: 12.5,
                        fontWeight: 500,
                        background: sel ? "var(--orange)" : "var(--bg-2)",
                        color: sel ? "white" : "var(--ink-2)",
                        border: "1px solid transparent",
                        transition: "all 200ms var(--ease-out)",
                      }}
                    >
                      {m === 0 ? "À l'heure" : `${m} min avant`}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                <Btn
                  kind="soft"
                  size="sm"
                  icon="spark"
                  onClick={async () => {
                    const ok = await test();
                    if (ok) {
                      setTestState("sent");
                      setTimeout(() => setTestState("idle"), 2500);
                    }
                  }}
                >
                  {testState === "sent" ? "Envoyée ✓" : "Tester un rappel"}
                </Btn>
                <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
                  {usesTriggers
                    ? "Programmés sur l'appareil — fonctionnent appli fermée."
                    : "Garde l'appli installée et ouverte de temps en temps."}
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      aria-pressed={on}
      style={{
        width: 50,
        height: 30,
        borderRadius: 999,
        background: on ? "var(--green)" : "var(--ink-3)",
        position: "relative",
        transition: "background 240ms var(--ease-out)",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: on ? 23 : 3,
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: "white",
          boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
          transition: "left 240ms var(--bounce)",
        }}
      />
    </button>
  );
}

/* ---------------------------------------------------------------------- */
/*  InstallPrompt — Android "Add to home screen" banner                   */
/* ---------------------------------------------------------------------- */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(true); // assume installed until proven otherwise
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Detect install state once on mount, then subscribe to install events.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true,
    );
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const onInstalled = () => setStandalone(true);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (standalone || dismissed || !deferred) return null;

  return (
    <div
      style={{
        maxWidth: 1240,
        margin: "0 auto",
        padding: "0 28px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          background: "var(--ink)",
          color: "white",
          borderRadius: 18,
          padding: "14px 18px",
          boxShadow: "var(--shadow-md)",
          animation: "fade-up 500ms var(--ease-out)",
        }}
      >
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--orange)", display: "grid", placeItems: "center", flexShrink: 0 }}>
          <Icon name="flame" size={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Installe Discipline sur ton téléphone</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
            Icône sur l&apos;écran d&apos;accueil + rappels sur l&apos;écran verrouillé.
          </div>
        </div>
        <Btn
          kind="primary"
          size="sm"
          onClick={async () => {
            await deferred.prompt();
            await deferred.userChoice;
            setDeferred(null);
          }}
        >
          Installer
        </Btn>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Fermer"
          style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "grid", placeItems: "center", flexShrink: 0 }}
        >
          <Icon name="x" size={15} color="white" />
        </button>
      </div>
    </div>
  );
}
