"use client";

import { createContext, useContext } from "react";
import { useCloudSync } from "@/lib/cloud-sync";
import { useSpaceSync } from "@/lib/space-sync";

type Ctx = ReturnType<typeof useCloudSync>;
type SpaceCtx = ReturnType<typeof useSpaceSync>;

const CloudSyncContext = createContext<Ctx | null>(null);
const SpaceSyncContext = createContext<SpaceCtx | null>(null);

export function CloudSyncProvider({ children }: { children: React.ReactNode }) {
  // Drive both sync engines from a single place so sync works on every page.
  // The code-based space sync is the simple path; the auth sync stays as an
  // advanced fallback (dormant while no account session exists).
  const cloud = useCloudSync();
  const space = useSpaceSync();
  return (
    <CloudSyncContext.Provider value={cloud}>
      <SpaceSyncContext.Provider value={space}>{children}</SpaceSyncContext.Provider>
    </CloudSyncContext.Provider>
  );
}

export function useCloudSyncCtx(): Ctx {
  const v = useContext(CloudSyncContext);
  if (!v) throw new Error("useCloudSyncCtx must be used inside CloudSyncProvider");
  return v;
}

export function useSpaceSyncCtx(): SpaceCtx {
  const v = useContext(SpaceSyncContext);
  if (!v) throw new Error("useSpaceSyncCtx must be used inside CloudSyncProvider");
  return v;
}
