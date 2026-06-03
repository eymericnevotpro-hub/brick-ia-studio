// Service worker for the "Discipline" PWA.
// Three jobs:
//   1. Offline shell — so the app opens even with no connection.
//   2. Show scheduled reminders (incl. the Notification Triggers API).
//   3. Re-focus the app when a reminder is tapped from the lock screen.

const CACHE = "discipline-v1";
const SHELL = ["/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  // Pre-cache the shell, then take over immediately.
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .catch(() => {})
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Network-first for navigations (always try fresh, fall back to cache offline).
// Cache-first for static assets we have stored.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("/", copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match("/").then((r) => r || Response.error())),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).catch(() => Response.error())),
  );
});

// Push from a server (optional — only fires if a backend is wired up later).
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data && event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Discipline", {
      body: data.body || "C'est l'heure de ta prochaine tâche.",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      vibrate: [120, 60, 120],
      tag: data.tag,
      data: { url: data.url || "/" },
    }),
  );
});

// Tap a reminder on the lock screen → open / focus the app.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) return client.focus();
      }
      return self.clients.openWindow ? self.clients.openWindow(url) : undefined;
    }),
  );
});

// The page can ask the SW to show a notification immediately (used as the
// fallback scheduler when the Notification Triggers API is unavailable).
self.addEventListener("message", (event) => {
  const msg = event.data || {};
  if (msg.type === "show-notification") {
    self.registration.showNotification(msg.title || "Discipline", {
      body: msg.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      vibrate: [120, 60, 120],
      tag: msg.tag,
      data: { url: "/" },
    });
  }
});
