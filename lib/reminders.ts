// Client-side reminder scheduling for the Discipline PWA.
//
// No backend: reminders are scheduled from the device itself.
//  - Where the browser supports the Notification Triggers API (recent Chrome on
//    Android), reminders are handed to the system and fire on the lock screen
//    even when the app is closed.
//  - Otherwise we fall back to in-page timers, which fire while the app is open
//    or recently backgrounded. We re-arm them whenever the app regains focus.

import type { Habit } from "./discipline-store";

const TAG_PREFIX = "disc-reminder-";
const ICON = "/icon-192.png";

type WithTriggers = typeof Notification & { prototype: { showTrigger?: unknown } };

export function remindersSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "Notification" in window
  );
}

export function notificationPermission(): NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  return Notification.permission;
}

export function triggersSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "showTrigger" in ((Notification as WithTriggers).prototype as object)
  );
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
  } catch {
    return null;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!remindersSupported()) return "denied";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

const toMin = (t: string): number => {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

// Next time `habit` should fire, given the lead time. Today if still ahead,
// otherwise tomorrow.
function nextFireTime(habit: Habit, leadMinutes: number): number {
  const target = toMin(habit.time) - Math.max(0, leadMinutes);
  const fire = new Date();
  fire.setHours(0, 0, 0, 0);
  fire.setMinutes(target);
  if (fire.getTime() <= Date.now() + 5000) fire.setDate(fire.getDate() + 1);
  return fire.getTime();
}

function bodyFor(habit: Habit, leadMinutes: number): string {
  return leadMinutes > 0
    ? `Dans ${leadMinutes} min · ${habit.time} — ${habit.label}`
    : `${habit.time} — ${habit.label}. C'est maintenant.`;
}

let fallbackTimers: number[] = [];
function clearFallbackTimers() {
  fallbackTimers.forEach((id) => clearTimeout(id));
  fallbackTimers = [];
}

async function clearScheduled(reg: ServiceWorkerRegistration) {
  clearFallbackTimers();
  try {
    const notes = await reg.getNotifications({ includeTriggered: true } as never);
    notes.forEach((n) => {
      if (n.tag && n.tag.startsWith(TAG_PREFIX)) n.close();
    });
  } catch {
    /* getNotifications options unsupported — nothing scheduled to clear */
  }
}

interface NotifyOptions extends NotificationOptions {
  showTrigger?: unknown;
  vibrate?: number[];
}

/**
 * Reconcile the device's scheduled reminders with the current schedule.
 * Safe to call repeatedly — it always clears then re-creates.
 */
export async function syncReminders(
  habits: Habit[],
  leadMinutes: number,
  enabled: boolean,
): Promise<void> {
  if (!remindersSupported()) return;
  let reg: ServiceWorkerRegistration;
  try {
    reg = await navigator.serviceWorker.ready;
  } catch {
    return;
  }

  await clearScheduled(reg);
  if (!enabled || Notification.permission !== "granted") return;

  const useTriggers = triggersSupported();
  const TimestampTrigger = (window as unknown as { TimestampTrigger?: new (t: number) => unknown })
    .TimestampTrigger;

  for (const habit of habits) {
    if (habit.remind === false) continue;
    const ts = nextFireTime(habit, leadMinutes);
    const tag = TAG_PREFIX + habit.id;
    const options: NotifyOptions = {
      tag,
      body: bodyFor(habit, leadMinutes),
      icon: ICON,
      badge: ICON,
      vibrate: [120, 60, 120],
      data: { url: "/" },
    };

    if (useTriggers && TimestampTrigger) {
      options.showTrigger = new TimestampTrigger(ts);
      try {
        await reg.showNotification("Discipline", options);
      } catch {
        /* ignore a single failed schedule */
      }
    } else {
      // Fallback: only arm timers for the next 12h to avoid runaway timeouts.
      const delay = ts - Date.now();
      if (delay >= 0 && delay <= 12 * 60 * 60 * 1000) {
        const id = window.setTimeout(() => {
          reg.showNotification("Discipline", options).catch(() => {});
        }, delay);
        fallbackTimers.push(id);
      }
    }
  }
}

/** Fire one notification right now, to prove reminders work. */
export async function sendTestReminder(): Promise<boolean> {
  if (!remindersSupported() || Notification.permission !== "granted") return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const options: NotifyOptions = {
      body: "Parfait — c'est exactement ce que tu verras sur ton écran verrouillé.",
      icon: ICON,
      badge: ICON,
      vibrate: [120, 60, 120],
      tag: TAG_PREFIX + "test",
      data: { url: "/" },
    };
    await reg.showNotification("Discipline · test", options);
    return true;
  } catch {
    return false;
  }
}
