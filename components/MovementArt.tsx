// Side-view silhouettes of the five planche positions. Static SVGs so they
// stay sharp, weigh nothing, and don't depend on third-party assets.

type PhaseId = "lean" | "tuck" | "adv-tuck" | "straddle" | "full";

const STROKE = "#1A1208";
const ACCENT = "#FF6A1A";
const SOFT = "#FFB077";

const W = 220;
const H = 130;

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
      {/* ground */}
      <line x1="14" y1="108" x2={W - 14} y2="108" stroke={STROKE} strokeWidth="1.5" strokeDasharray="3 4" opacity="0.4" />
      {children}
    </svg>
  );
}

function Hands({ x }: { x: number }) {
  return (
    <>
      <circle cx={x} cy="105" r="4" fill={ACCENT} stroke={STROKE} strokeWidth="1.5" />
      <circle cx={x + 6} cy="105" r="4" fill={ACCENT} stroke={STROKE} strokeWidth="1.5" />
    </>
  );
}

function Head({ cx, cy }: { cx: number; cy: number }) {
  return <circle cx={cx} cy={cy} r="9" fill={SOFT} stroke={STROKE} strokeWidth="2" />;
}

function Limb({ x1, y1, x2, y2, accent }: { x1: number; y1: number; x2: number; y2: number; accent?: boolean }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={accent ? ACCENT : STROKE} strokeWidth={accent ? 5 : 4} strokeLinecap="round" />;
}

function Lean() {
  // Pseudo planche / planche lean — feet still on ground, body diagonal, shoulders past hands.
  const hx = 70;
  return (
    <Frame>
      <Hands x={hx} />
      {/* arms */}
      <Limb x1={hx + 3} y1={104} x2={88} y2={70} />
      {/* torso */}
      <Limb x1={88} y1={70} x2={148} y2={92} accent />
      {/* hips → feet */}
      <Limb x1={148} y1={92} x2={185} y2={104} />
      {/* head */}
      <Head cx={86} cy={60} />
      <text x={W / 2} y={H - 6} textAnchor="middle" fontFamily="Geist Mono, monospace" fontSize="9" fill={STROKE} opacity="0.55">PLANCHE LEAN</text>
    </Frame>
  );
}

function Tuck() {
  const hx = 90;
  return (
    <Frame>
      <Hands x={hx} />
      {/* arms */}
      <Limb x1={hx + 3} y1={104} x2={hx + 3} y2={76} />
      {/* head (forward) */}
      <Head cx={80} cy={72} />
      {/* torso to hips, horizontal */}
      <Limb x1={hx + 3} y1={76} x2={138} y2={76} accent />
      {/* thighs up */}
      <Limb x1={138} y1={76} x2={138} y2={52} />
      {/* calves folded back toward hips */}
      <Limb x1={138} y1={52} x2={118} y2={60} />
      <text x={W / 2} y={H - 6} textAnchor="middle" fontFamily="Geist Mono, monospace" fontSize="9" fill={STROKE} opacity="0.55">TUCK PLANCHE</text>
    </Frame>
  );
}

function AdvTuck() {
  const hx = 70;
  return (
    <Frame>
      <Hands x={hx} />
      <Limb x1={hx + 3} y1={104} x2={hx + 3} y2={76} />
      <Head cx={60} cy={72} />
      {/* flat back to hips */}
      <Limb x1={hx + 3} y1={76} x2={150} y2={76} accent />
      {/* thighs back toward chest */}
      <Limb x1={150} y1={76} x2={130} y2={62} />
      {/* calves */}
      <Limb x1={130} y1={62} x2={115} y2={70} />
      <text x={W / 2} y={H - 6} textAnchor="middle" fontFamily="Geist Mono, monospace" fontSize="9" fill={STROKE} opacity="0.55">ADV TUCK PLANCHE</text>
    </Frame>
  );
}

function Straddle() {
  const hx = 50;
  return (
    <Frame>
      <Hands x={hx} />
      <Limb x1={hx + 3} y1={104} x2={hx + 3} y2={76} />
      <Head cx={40} cy={72} />
      {/* horizontal torso */}
      <Limb x1={hx + 3} y1={76} x2={130} y2={76} accent />
      {/* legs split (one up, one down) */}
      <Limb x1={130} y1={76} x2={195} y2={56} />
      <Limb x1={130} y1={76} x2={195} y2={96} />
      <text x={W / 2} y={H - 6} textAnchor="middle" fontFamily="Geist Mono, monospace" fontSize="9" fill={STROKE} opacity="0.55">STRADDLE PLANCHE</text>
    </Frame>
  );
}

function Full() {
  const hx = 40;
  return (
    <Frame>
      <Hands x={hx} />
      <Limb x1={hx + 3} y1={104} x2={hx + 3} y2={76} />
      <Head cx={30} cy={72} />
      {/* perfectly horizontal body */}
      <Limb x1={hx + 3} y1={76} x2={200} y2={76} accent />
      <text x={W / 2} y={H - 6} textAnchor="middle" fontFamily="Geist Mono, monospace" fontSize="9" fill={STROKE} opacity="0.55">FULL PLANCHE</text>
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
