// Local export / import of all "disc.*" localStorage keys, so the user can
// move data between devices without any backend (or as a manual backup).

const BACKUP_PREFIX = "disc.";
const BACKUP_VERSION = 1;

export interface Backup {
  version: number;
  exportedAt: string; // ISO timestamp
  origin?: string;
  data: Record<string, unknown>;
}

export function collectLocalData(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (typeof window === "undefined") return out;
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key || !key.startsWith(BACKUP_PREFIX)) continue;
    const raw = window.localStorage.getItem(key);
    if (raw == null) continue;
    try {
      out[key] = JSON.parse(raw);
    } catch {
      out[key] = raw;
    }
  }
  return out;
}

export function makeBackup(): Backup {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    origin: typeof window !== "undefined" ? window.location.origin : undefined,
    data: collectLocalData(),
  };
}

export function downloadBackup() {
  const backup = makeBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
  a.href = url;
  a.download = `discipline-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export interface RestoreResult {
  imported: number;
  skipped: number;
  fromOrigin?: string;
  exportedAt?: string;
}

// Apply a backup to localStorage. Returns counts of what was written.
export function applyBackup(b: unknown): RestoreResult {
  if (typeof window === "undefined") return { imported: 0, skipped: 0 };
  if (!b || typeof b !== "object") throw new Error("Sauvegarde invalide");
  const backup = b as Backup;
  const data = backup.data;
  if (!data || typeof data !== "object") throw new Error("Sauvegarde invalide (data manquante)");

  let imported = 0;
  let skipped = 0;
  for (const [k, v] of Object.entries(data)) {
    if (!k.startsWith(BACKUP_PREFIX)) {
      skipped++;
      continue;
    }
    try {
      window.localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
      imported++;
    } catch {
      skipped++;
    }
  }
  return { imported, skipped, fromOrigin: backup.origin, exportedAt: backup.exportedAt };
}

export async function readBackupFile(file: File): Promise<unknown> {
  const text = await file.text();
  return JSON.parse(text);
}

// Patch localStorage so any setItem on a "disc.*" key emits a "disc:change"
// event in the current window. Used by the cloud-sync hook to push debounced
// updates without sprinkling sync calls through every component.
let patched = false;
export function installLocalStorageWatcher() {
  if (typeof window === "undefined" || patched) return;
  patched = true;
  const origSet = window.localStorage.setItem.bind(window.localStorage);
  const origRemove = window.localStorage.removeItem.bind(window.localStorage);
  const origClear = window.localStorage.clear.bind(window.localStorage);
  window.localStorage.setItem = (k: string, v: string) => {
    origSet(k, v);
    if (k.startsWith(BACKUP_PREFIX)) window.dispatchEvent(new Event("disc:change"));
  };
  window.localStorage.removeItem = (k: string) => {
    origRemove(k);
    if (k.startsWith(BACKUP_PREFIX)) window.dispatchEvent(new Event("disc:change"));
  };
  window.localStorage.clear = () => {
    origClear();
    window.dispatchEvent(new Event("disc:change"));
  };
}
