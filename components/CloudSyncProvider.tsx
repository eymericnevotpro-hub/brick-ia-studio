"use client";

import { createContext, useContext } from "react";
import { useCloudSync } from "@/lib/cloud-sync";

type Ctx = ReturnType<typeof useCloudSync>;

const CloudSyncContext = createContext<Ctx | null>(null);

export function CloudSyncProvider({ children }: { children: React.ReactNode }) {
  // Drive auth, pull, push, and the localStorage watcher from a single place
  // so sync works regardless of which page the user is on.
  const value = useCloudSync();
  return <CloudSyncContext.Provider value={value}>{children}</CloudSyncContext.Provider>;
}

export function useCloudSyncCtx(): Ctx {
  const v = useContext(CloudSyncContext);
  if (!v) throw new Error("useCloudSyncCtx must be used inside CloudSyncProvider");
  return v;
}
