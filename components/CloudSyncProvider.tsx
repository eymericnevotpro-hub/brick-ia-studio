"use client";

import { createContext, useContext } from "react";
import { useKvSync } from "@/lib/kv-sync";

type Ctx = ReturnType<typeof useKvSync>;

const SyncContext = createContext<Ctx | null>(null);

export function CloudSyncProvider({ children }: { children: React.ReactNode }) {
  // Single cloud sync engine (Vercel KV) driven from one place, so every page
  // shares the same up-to-date data automatically.
  const value = useKvSync();
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSyncCtx(): Ctx {
  const v = useContext(SyncContext);
  if (!v) throw new Error("useSyncCtx must be used inside CloudSyncProvider");
  return v;
}
