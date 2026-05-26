"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface HabitWheelProps {
  habits: string[];
  days: number; // number of days in the month
  today: number | null; // 1-based day, or null if not viewing current month
  completed: Record<number, number[]>; // habit index -> completed days
  onToggle: (habitIndex: number, day: number) => void;
}

const SIZE = 460;
const CX = SIZE / 2;
const CY = SIZE / 2;
const OUTER_R = 176;
const INNER_R = 58;

function polar(r: number, angleDeg: number): [number, number] {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}

function sectorPath(rIn: number, rOut: number, a0: number, a1: number): string {
  const [x0, y0] = polar(rOut, a0);
  const [x1, y1] = polar(rOut, a1);
  const [x2, y2] = polar(rIn, a1);
  const [x3, y3] = polar(rIn, a0);
  return `M${x0},${y0} A${rOut},${rOut} 0 0 1 ${x1},${y1} L${x2},${y2} A${rIn},${rIn} 0 0 0 ${x3},${y3} Z`;
}

export default function HabitWheel({ habits, days, today, completed, onToggle }: HabitWheelProps) {
  const [burst, setBurst] = useState<{ x: number; y: number; id: number } | null>(null);
  const [hover, setHover] = useState<{ h: number; d: number } | null>(null);

  const H = habits.length;
  const ringWidth = (OUTER_R - INNER_R) / Math.max(H, 1);
  const daySpan = 360 / days;

  const total = H * days;
  let done = 0;
  for (let h = 0; h < H; h++) done += (completed[h] ?? []).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const handleClick = (h: number, d: number, midR: number, midA: number) => {
    const wasDone = (completed[h] ?? []).includes(d);
    if (!wasDone) {
      const [bx, by] = polar(midR, midA);
      setBurst((prev) => ({ x: bx, y: by, id: (prev?.id ?? 0) + 1 }));
    }
    onToggle(h, d);
  };

  return (
    <div className="relative w-full flex justify-center">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full max-w-[460px] select-none"
        style={{ touchAction: "manipulation" }}
      >
        <defs>
          <radialGradient id="wheelDone" cx="50%" cy="50%" r="80%">
            <stop offset="0%" stopColor="#FFB347" />
            <stop offset="100%" stopColor="#FF6A00" />
          </radialGradient>
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#FF7A0033" />
            <stop offset="100%" stopColor="#0D050000" />
          </radialGradient>
        </defs>

        <circle cx={CX} cy={CY} r={OUTER_R + 4} fill="url(#centerGlow)" />

        {Array.from({ length: H }).map((_, h) =>
          Array.from({ length: days }).map((__, dIdx) => {
            const d = dIdx + 1;
            const rIn = INNER_R + h * ringWidth;
            const rOut = rIn + ringWidth - 1.5;
            const a0 = dIdx * daySpan;
            const a1 = a0 + daySpan;
            const isDone = (completed[h] ?? []).includes(d);
            const isToday = today === d;
            const isHover = hover?.h === h && hover?.d === d;
            return (
              <path
                key={`${h}-${d}`}
                d={sectorPath(rIn, rOut, a0 + 0.6, a1 - 0.6)}
                fill={isDone ? "url(#wheelDone)" : isToday ? "#2A1400" : "#160A00"}
                stroke={isToday ? "#FF7A0099" : "#3D1A0066"}
                strokeWidth={isToday ? 1.4 : 0.8}
                style={{
                  cursor: "pointer",
                  transition: "fill 0.25s ease, opacity 0.2s ease",
                  opacity: isHover && !isDone ? 0.85 : 1,
                  filter: isDone ? "drop-shadow(0 0 3px #FF7A0066)" : "none",
                }}
                onClick={() => handleClick(h, d, (rIn + rOut) / 2, a0 + daySpan / 2)}
                onMouseEnter={() => setHover({ h, d })}
                onMouseLeave={() => setHover(null)}
              />
            );
          }),
        )}

        {Array.from({ length: days }).map((_, dIdx) => {
          const d = dIdx + 1;
          const [tx, ty] = polar(OUTER_R + 12, dIdx * daySpan + daySpan / 2);
          return (
            <text
              key={`label-${d}`}
              x={tx}
              y={ty}
              fontSize={9}
              fontWeight={today === d ? 800 : 500}
              fill={today === d ? "#FF7A00" : "#7a5028"}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {d}
            </text>
          );
        })}

        <circle cx={CX} cy={CY} r={INNER_R - 4} fill="#0D0500" stroke="#3D1A00" strokeWidth={1} />
        <text x={CX} y={CY - 8} fontSize={30} fontWeight={900} fill="#FF7A00" textAnchor="middle">
          {pct}%
        </text>
        <text x={CX} y={CY + 14} fontSize={10} fill="#8a5a2a" textAnchor="middle" letterSpacing="0.1em">
          {done}/{total}
        </text>

        <AnimatePresence>
          {burst && (
            <motion.circle
              key={burst.id}
              cx={burst.x}
              cy={burst.y}
              fill="none"
              stroke="#FFB347"
              strokeWidth={2}
              initial={{ r: 2, opacity: 0.9 }}
              animate={{ r: 26, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              onAnimationComplete={() => setBurst(null)}
            />
          )}
        </AnimatePresence>
      </svg>

      {hover && (
        <div
          className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold pointer-events-none whitespace-nowrap"
          style={{ background: "#1A0B00", border: "1px solid #3D1A00", color: "#FFB347" }}
        >
          {habits[hover.h]} · jour {hover.d}
        </div>
      )}
    </div>
  );
}
