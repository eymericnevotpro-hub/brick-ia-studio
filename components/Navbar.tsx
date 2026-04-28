"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const isStudio = pathname?.startsWith("/studio") || pathname?.startsWith("/tool") || pathname?.startsWith("/editor");

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      <div
        className="mx-4 mt-4 rounded-2xl px-5 py-3 flex items-center justify-between"
        style={{
          background: "rgba(8,4,1,0.88)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid #3D1A0088",
          boxShadow: "0 4px 30px rgba(255,122,0,0.05)",
        }}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #FF7A00, #FF5500)",
              boxShadow: "0 0 20px #FF7A0066",
            }}
          >
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-sm leading-none block" style={{ color: "#FF7A00", fontWeight: 800 }}>
              BRICK IA
            </span>
            <span className="text-xs leading-none" style={{ color: "#8a5a2a" }}>
              Studio
            </span>
          </div>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Éditeur link — only in studio context */}
          {isStudio && (
            <Link
              href="/editor"
              className="hidden md:flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl transition-all"
              style={{
                color: pathname === "/editor" ? "#FF7A00" : "#8a5a2a",
                background: pathname === "/editor" ? "#FF7A0015" : "transparent",
              }}
            >
              ✂️ Éditeur
            </Link>
          )}

          {/* Studio Pro / Prank toggle */}
          {isStudio ? (
            <Link
              href="/"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold"
              style={{ background: "#1A0B00", border: "1px solid #3D1A00", color: "#FFB347" }}
            >
              😂 Pranks
            </Link>
          ) : (
            <Link
              href="/studio"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold"
              style={{ background: "linear-gradient(135deg, #FF7A00, #FF5500)", color: "white" }}
            >
              ✨ Studio Pro
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
