"use client";

import {
  CSSProperties,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

/* ---------- localStorage hook ---------- */
export function useLS<T>(key: string, initial: T | (() => T)): [T, (v: T | ((p: T) => T)) => void] {
  const [v, setV] = useState<T>(() => {
    if (typeof window === "undefined") {
      return typeof initial === "function" ? (initial as () => T)() : initial;
    }
    try {
      const raw = window.localStorage.getItem(key);
      if (raw == null) return typeof initial === "function" ? (initial as () => T)() : initial;
      return JSON.parse(raw) as T;
    } catch {
      return typeof initial === "function" ? (initial as () => T)() : initial;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(v));
    } catch {
      /* storage full / unavailable — keep working in memory */
    }
  }, [key, v]);

  // Re-read when something else writes to our key — cloud sync pull, manual
  // import, another tab… So the UI shows the freshest value without a refresh.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onChange = (e: Event) => {
      const ce = e as CustomEvent<{ key?: string }>;
      const changedKey = ce.detail?.key;
      if (changedKey && changedKey !== key) return;
      try {
        const raw = window.localStorage.getItem(key);
        if (raw == null) return;
        const next = JSON.parse(raw) as T;
        setV((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      } catch {
        /* ignore malformed values */
      }
    };
    window.addEventListener("disc:change", onChange as EventListener);
    return () => window.removeEventListener("disc:change", onChange as EventListener);
  }, [key]);

  return [v, setV];
}

/* ---------- spring-tweened number ---------- */
export function useSpring(
  target: number,
  { stiffness = 170, damping = 22, precision = 0.5 } = {},
): number {
  const [value, setValue] = useState(target);
  const stateRef = useRef({ x: target, v: 0, target });
  const rafRef = useRef(0);

  useEffect(() => {
    stateRef.current.target = target;
    const tick = () => {
      const s = stateRef.current;
      const dt = 1 / 60;
      const force = -stiffness * (s.x - s.target);
      const damp = -damping * s.v;
      s.v += (force + damp) * dt;
      s.x += s.v * dt;
      if (Math.abs(s.v) < precision && Math.abs(s.x - s.target) < precision) {
        s.x = s.target;
        s.v = 0;
        setValue(s.target);
        return;
      }
      setValue(s.x);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, stiffness, damping, precision]);

  return value;
}

/* ---------- animated number (counts up) ---------- */
export function AnimatedNumber({
  value,
  format = (n) => Math.round(n).toLocaleString("fr-FR"),
  className,
  style,
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
  style?: CSSProperties;
}) {
  const v = useSpring(value, { stiffness: 120, damping: 20 });
  return (
    <span className={className} style={style}>
      {format(v)}
    </span>
  );
}

/* ---------- icon set: stroke icons drawn inline ---------- */
export const Icon = ({
  name,
  size = 18,
  stroke = 1.8,
  color = "currentColor",
}: {
  name: string;
  size?: number;
  stroke?: number;
  color?: string;
}) => {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: stroke,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "plus":
      return <svg {...props}><path d="M12 5v14M5 12h14" /></svg>;
    case "minus":
      return <svg {...props}><path d="M5 12h14" /></svg>;
    case "check":
      return <svg {...props}><path d="M4 12l5 5L20 6" /></svg>;
    case "flame":
      return <svg {...props}><path d="M12 3c2 4 5 5 5 9a5 5 0 1 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-8z" /></svg>;
    case "bolt":
      return <svg {...props}><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" /></svg>;
    case "target":
      return <svg {...props}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill={color} stroke="none" /></svg>;
    case "wave":
      return <svg {...props}><path d="M3 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0" /></svg>;
    case "play":
      return <svg {...props}><path d="M7 5v14l12-7-12-7z" fill={color} /></svg>;
    case "users":
      return <svg {...props}><circle cx="9" cy="9" r="3.2" /><path d="M3 20c0-3 3-5 6-5s6 2 6 5" /><circle cx="17" cy="8" r="2.5" /><path d="M15 20c0-2.5 2-4 4.5-4" /></svg>;
    case "spark":
      return <svg {...props}><path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3z" /></svg>;
    case "x":
      return <svg {...props}><path d="M6 6l12 12M18 6L6 18" /></svg>;
    case "arrow":
      return <svg {...props}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
    case "dot":
      return <svg {...props}><circle cx="12" cy="12" r="3" fill={color} stroke="none" /></svg>;
    case "calendar":
      return <svg {...props}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>;
    default:
      return null;
  }
};

/* ---------- floating "+N" toast burst above an element ---------- */
export function FloatLabel({ text, color = "var(--orange)" }: { text: string; color?: string }) {
  return (
    <span
      style={{
        position: "absolute",
        left: "50%",
        top: 0,
        transform: "translate(-50%, 0)",
        fontFamily: "Geist Mono, monospace",
        fontWeight: 600,
        fontSize: 16,
        color,
        pointerEvents: "none",
        animation: "float-up 900ms ease-out forwards",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

/* ---------- confetti burst ---------- */
// Pieces are generated once at module load so render stays pure (no
// Math.random during render). The randomness is fixed but visually fine.
const CONFETTI_COLORS = ["#FF6A1A", "#FFB077", "#FFD4A8", "#19A36A", "#1A1208"];
const CONFETTI_PIECES = Array.from({ length: 28 }, (_, i) => ({
  tx: (Math.random() - 0.5) * 500,
  rot: (Math.random() - 0.5) * 720,
  delay: Math.random() * 150,
  dur: 900 + Math.random() * 700,
  c: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  w: 6 + Math.random() * 8,
  h: 10 + Math.random() * 10,
}));

export function Confetti({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div style={{ position: "fixed", left: "50%", top: "32%", pointerEvents: "none", zIndex: 100 }}>
      {CONFETTI_PIECES.map((p, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: p.w,
            height: p.h,
            background: p.c,
            borderRadius: 2,
            ["--tx" as string]: p.tx + "px",
            ["--rot" as string]: p.rot + "deg",
            animation: `confetti-fall ${p.dur}ms ${p.delay}ms cubic-bezier(0.16, 1, 0.3, 1) forwards`,
          } as CSSProperties}
        />
      ))}
    </div>
  );
}

export function Dots() {
  return (
    <span style={{ display: "inline-flex", gap: 4 }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--orange)",
            animation: `pulse-ring 1.2s ${i * 0.15}s ease-in-out infinite`,
          }}
        />
      ))}
    </span>
  );
}

/* ---------- bouncy button ---------- */
export function Btn({
  children,
  onClick,
  kind = "primary",
  size = "md",
  style,
  disabled,
  title,
  icon,
}: {
  children: ReactNode;
  onClick?: () => void;
  kind?: "primary" | "ghost" | "soft" | "dark";
  size?: "sm" | "md" | "lg";
  style?: CSSProperties;
  disabled?: boolean;
  title?: string;
  icon?: string;
}) {
  const sizes = {
    sm: { padding: "8px 12px", fontSize: 13, gap: 6, radius: 999 },
    md: { padding: "11px 16px", fontSize: 14, gap: 8, radius: 999 },
    lg: { padding: "15px 22px", fontSize: 15, gap: 10, radius: 999 },
  }[size];
  const kinds = {
    primary: { background: "var(--orange)", color: "white", border: "1px solid var(--orange)" },
    ghost: { background: "transparent", color: "var(--ink)", border: "1px solid var(--line)" },
    soft: { background: "var(--orange-100)", color: "var(--orange)", border: "1px solid transparent" },
    dark: { background: "var(--ink)", color: "white", border: "1px solid var(--ink)" },
  }[kind];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        ...sizes,
        borderRadius: sizes.radius,
        ...kinds,
        fontWeight: 500,
        letterSpacing: "-0.005em",
        transition: "transform 220ms var(--bounce), background 160ms ease, box-shadow 220ms var(--ease-out)",
        opacity: disabled ? 0.4 : 1,
        userSelect: "none",
        ...style,
      }}
      onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.94)"; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.04)"; }}
    >
      {icon && <Icon name={icon} size={size === "sm" ? 14 : 16} />}
      <span>{children}</span>
    </button>
  );
}
