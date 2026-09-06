"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const KEY = "bproductive.lastPath";
// Only remember the main menu tabs (not /install, /api, …).
const TAB_PATHS = ["/", "/rythme", "/tournage", "/budget", "/factures", "/goals"];

export default function StartupRouter() {
  const pathname = usePathname();
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // On app startup: if we landed on "/" but last session was on another tab,
    // reopen that tab instead. Runs once.
    if (!started.current) {
      started.current = true;
      const last = localStorage.getItem(KEY);
      if (window.location.pathname === "/" && last && last !== "/" && TAB_PATHS.includes(last)) {
        router.replace(last);
        return; // leaving "/", don't record it
      }
    }
    if (TAB_PATHS.includes(pathname)) {
      localStorage.setItem(KEY, pathname);
    }
  }, [pathname, router]);

  return null;
}
