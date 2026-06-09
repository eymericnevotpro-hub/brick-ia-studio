// Side-view silhouettes of the five planche positions. The athlete always
// faces left: head on the left, body trails behind to the right, hands on
// the dashed ground. Static SVGs so they stay sharp and weigh nothing.

type PhaseId = "lean" | "tuck" | "adv-tuck" | "straddle" | "full";

const STROKE = "#1A1208";
const ACCENT = "#FF6A1A";
const SOFT = "#FFB077";

const W = 220;
const H = 140;
const GROUND = 118;

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ display: "block" }} aria-hidden="true">
      <defs>
        <linearGradient id="art-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF1E2" />
          <stop offset="100%" stopColor="#FFE0C7" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={W} height={H} rx="14" fill="url(#art-bg)" />
      <line x1="14" y1={GROUND} x2={W - 14} y2={GROUND} stroke={STROKE} strokeWidth="1.5" strokeDasharray="3 4" opacity="0.4" />
      {children}
    </svg>
  );
}

function Hands({ x }: { x: number }) {
  return (
    <>
      <circle cx={x - 3} cy={GROUND - 3} r="4" fill={ACCENT} stroke={STROKE} strokeWidth="1.5" />
      <circle cx={x + 3} cy={GROUND - 3} r="4" fill={ACCENT} stroke={STROKE} strokeWidth="1.5" />
    </>
  );
}

function Head({ cx, cy }: { cx: number; cy: number }) {
  return <circle cx={cx} cy={cy} r="9" fill={SOFT} stroke={STROKE} strokeWidth="2" />;
}

function Limb({
  x1,
  y1,
  x2,
  y2,
  accent,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  accent?: boolean;
}) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={accent ? ACCENT : STROKE} strokeWidth={accent ? 5 : 4} strokeLinecap="round" />;
}

function Caption({ children }: { children: string }) {
  return (
    <text x={W / 2} y={H - 6} textAnchor="middle" fontFamily="Geist Mono, monospace" fontSize="9" fill={STROKE} opacity="0.55">
      {children}
    </text>
  );
}

/* ── PLANCHE LEAN — head LEFT, leaning forward past the wrists ──────── */
function Lean() {
  const hands = 110;
  const feet = 190;
  const hips = { x: 145, y: 72 };
  const shoulders = { x: 90, y: 84 };
  return (
    <Frame>
      <Hands x={hands} />
      {/* arm from shoulders down-back to hands (shoulders forward of hands) */}
      <Limb x1={shoulders.x} y1={shoulders.y} x2={hands} y2={GROUND - 5} />
      {/* torso shoulders → hips */}
      <Limb x1={shoulders.x} y1={shoulders.y} x2={hips.x} y2={hips.y} accent />
      {/* hips → feet on ground */}
      <Limb x1={hips.x} y1={hips.y} x2={feet} y2={GROUND - 1} />
      <Head cx={75} cy={80} />
      <Caption>PLANCHE LEAN</Caption>
    </Frame>
  );
}

/* ── TUCK PLANCHE — knees pulled tight to chest ─────────────────────── */
function Tuck() {
  const hands = 100;
  const shoulders = { x: 98, y: 82 };
  const hips = { x: 150, y: 82 };
  const knees = { x: 108, y: 58 }; // up & forward (toward chest)
  const feet = { x: 96, y: 82 };
  return (
    <Frame>
      <Hands x={hands} />
      <Limb x1={shoulders.x} y1={shoulders.y} x2={hands} y2={GROUND - 5} />
      <Limb x1={shoulders.x} y1={shoulders.y} x2={hips.x} y2={hips.y} accent />
      {/* thighs : hips → knees (folded toward chest, UP-LEFT) */}
      <Limb x1={hips.x} y1={hips.y} x2={knees.x} y2={knees.y} />
      {/* calves : knees → feet (hanging down toward chest area) */}
      <Limb x1={knees.x} y1={knees.y} x2={feet.x} y2={feet.y} />
      <Head cx={84} cy={78} />
      <Caption>TUCK PLANCHE</Caption>
    </Frame>
  );
}

/* ── ADVANCED TUCK — flat back, knees still folded but slightly opener ─ */
function AdvTuck() {
  const hands = 80;
  const shoulders = { x: 80, y: 80 };
  const hips = { x: 145, y: 80 };
  const knees = { x: 115, y: 62 };
  const feet = { x: 102, y: 80 };
  return (
    <Frame>
      <Hands x={hands} />
      <Limb x1={shoulders.x} y1={shoulders.y} x2={hands} y2={GROUND - 5} />
      <Limb x1={shoulders.x} y1={shoulders.y} x2={hips.x} y2={hips.y} accent />
      <Limb x1={hips.x} y1={hips.y} x2={knees.x} y2={knees.y} />
      <Limb x1={knees.x} y1={knees.y} x2={feet.x} y2={feet.y} />
      <Head cx={64} cy={76} />
      <Caption>ADV TUCK PLANCHE</Caption>
    </Frame>
  );
}

/* ── STRADDLE — body horizontal, legs straight and spread behind ─────── */
function Straddle() {
  const hands = 60;
  const shoulders = { x: 60, y: 80 };
  const hips = { x: 130, y: 80 };
  return (
    <Frame>
      <Hands x={hands} />
      <Limb x1={shoulders.x} y1={shoulders.y} x2={hands} y2={GROUND - 5} />
      <Limb x1={shoulders.x} y1={shoulders.y} x2={hips.x} y2={hips.y} accent />
      {/* spread legs : one up-back, one down-back */}
      <Limb x1={hips.x} y1={hips.y} x2={200} y2={60} />
      <Limb x1={hips.x} y1={hips.y} x2={200} y2={100} />
      <Head cx={44} cy={76} />
      <Caption>STRADDLE PLANCHE</Caption>
    </Frame>
  );
}

/* ── FULL PLANCHE — body perfectly horizontal, legs together behind ──── */
function Full() {
  const hands = 45;
  const shoulders = { x: 45, y: 80 };
  const hips = { x: 120, y: 80 };
  return (
    <Frame>
      <Hands x={hands} />
      <Limb x1={shoulders.x} y1={shoulders.y} x2={hands} y2={GROUND - 5} />
      <Limb x1={shoulders.x} y1={shoulders.y} x2={hips.x} y2={hips.y} accent />
      <Limb x1={hips.x} y1={hips.y} x2={200} y2={80} accent />
      <Head cx={29} cy={76} />
      <Caption>FULL PLANCHE</Caption>
    </Frame>
  );
}

export default function MovementArt({ phase }: { phase: PhaseId }) {
  const map: Record<PhaseId, () => React.ReactNode> = {
    lean: Lean,
    tuck: Tuck,
    "adv-tuck": AdvTuck,
    straddle: Straddle,
    full: Full,
  };
  const Render = map[phase];
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 260,
        borderRadius: 14,
        overflow: "hidden",
        border: "1px solid var(--orange-100)",
        boxShadow: "var(--shadow-sm)",
        animation: "fade-up 500ms var(--ease-out) backwards",
      }}
    >
      <Render />
    </div>
  );
}
