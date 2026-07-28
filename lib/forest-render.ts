// Isometric renderer for Congères — the chunky 3/4 diorama look of the fake
// mobile ads (Kingshot & co): a floating slab of world, an extruded wooden
// palisade, cone-shaped pines, stubby characters hauling stacks of meat.
//
// The simulation (lib/forest-game.ts) stays a flat top-down world of (x, y)
// ground coordinates. Everything here projects those into screen space and
// fakes the third dimension with boxes, cylinders and cones drawn back to
// front. `z` is height above the ground, in world units.

import {
  FENCE_Y,
  FIRE,
  FIRE_RANGE,
  SEG_W,
  SHOP_POST,
  World,
  WORLD_H,
  WORLD_W,
  cookSlots,
  segCenter,
  segX,
} from "./forest-game";

// ────────────────────────── Isometric projection ───────────────────────────

const IX = 0.62; // how far the x/y axes spread horizontally
const IY = 0.33; // vertical squash — roughly a 2:1 dimetric camera
const IZ = 0.66; // how tall one world unit of height looks on screen

const px = (wx: number, wy: number) => (wx - wy) * IX;
const py = (wx: number, wy: number, z = 0) => (wx + wy) * IY - z * IZ;
/** Painter's-algorithm key: bigger x+y means nearer the camera. */
const depthOf = (wx: number, wy: number) => wx + wy;

/**
 * The slab extends past the playable world so the camera rarely sees the void,
 * and the extra band is filled with decorative pines you can't reach.
 */
const MARGIN = 520;

// Bounds of the extended slab in iso space, and the resolution its texture is
// baked at. Baking pre-projected means the per-frame cost is a plain blit of
// the visible rectangle instead of a sheared, resampled full-world draw.
const ISO_MIN_X = (-MARGIN - (WORLD_H + MARGIN)) * IX;
const ISO_MIN_Y = (-MARGIN - MARGIN) * IY;
const ISO_W = (WORLD_W + MARGIN + MARGIN) * IX - ISO_MIN_X;
const ISO_H = (WORLD_W + MARGIN + WORLD_H + MARGIN) * IY - ISO_MIN_Y;
const GROUND_RES = 0.7;

/** The camp sits on a raised deck, so anything standing on it is a bit higher. */
const DECK = { x0: 170, y0: FENCE_Y + 90, x1: 940, y1: WORLD_H - 70, h: 7 };
export const groundZ = (wx: number, wy: number) =>
  wx > DECK.x0 && wx < DECK.x1 && wy > DECK.y0 && wy < DECK.y1 ? DECK.h : 0;

export interface View {
  w: number;
  h: number;
  scale: number;
  camX: number;
  camY: number;
}

interface Flake {
  x: number;
  y: number;
  z: number;
  r: number;
  drift: number;
}

interface Decor {
  x: number;
  y: number;
  scale: number;
}

export interface RenderState {
  ground: HTMLCanvasElement | null;
  night: HTMLCanvasElement | null;
  flakes: Flake[];
  decor: Decor[];
  t: number;
}

export function createRenderState(): RenderState {
  return { ground: null, night: null, flakes: [], decor: makeDecor(), t: 0 };
}

/** Pines in the margin band — scenery only, no chopping out there. */
function makeDecor(): Decor[] {
  const out: Decor[] = [];
  for (let i = 0; i < 150; i++) {
    let x = 0;
    let y = 0;
    let guard = 0;
    do {
      x = -MARGIN + Math.random() * (WORLD_W + MARGIN * 2);
      y = -MARGIN + Math.random() * (WORLD_H + MARGIN * 2);
    } while (x > -30 && x < WORLD_W + 30 && y > -30 && y < WORLD_H + 30 && guard++ < 40);
    out.push({ x, y, scale: 0.75 + Math.random() * 0.6 });
  }
  return out;
}

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

/**
 * Camera: locked on the hero. Frames ~360 iso units across, which is what
 * makes the characters read as chunky toys instead of ants — the whole point
 * of the look. No clamping: the hero never leaves the middle of the screen.
 */
export function computeView(cw: number, ch: number, wx: number, wy: number): View {
  const scale = Math.max(cw / 360, ch / 780);
  const viewW = cw / scale;
  const viewH = ch / scale;
  const M = MARGIN;
  // Keep the camera inside the extended slab so the void stays off-screen.
  const minX = px(-M, WORLD_H + M);
  const maxX = px(WORLD_W + M, -M);
  const minY = py(-M, -M);
  const maxY = py(WORLD_W + M, WORLD_H + M);
  const camX = clamp(px(wx, wy) - viewW / 2, minX, Math.max(minX, maxX - viewW));
  // Sit the hero slightly below centre, so more of what's ahead is visible.
  const camY = clamp(py(wx, wy) - viewH / 1.75, minY, Math.max(minY, maxY - viewH));
  return { w: cw, h: ch, scale, camX, camY };
}

/**
 * Screen drag → world direction. On an iso map, "up" on the joystick has to
 * mean "away from the camera", not "north", or the controls feel drunk.
 */
export function screenToWorldDir(sx: number, sy: number): { x: number; y: number } {
  const wx = sx / (2 * IX) + sy / (2 * IY);
  const wy = -sx / (2 * IX) + sy / (2 * IY);
  const d = Math.hypot(wx, wy);
  return d < 0.0001 ? { x: 0, y: 0 } : { x: wx / d, y: wy / d };
}

// ─────────────────────────── 3D-ish primitives ─────────────────────────────

function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp(((n >> 16) & 255) * amount, 0, 255);
  const g = clamp(((n >> 8) & 255) * amount, 0, 255);
  const b = clamp((n & 255) * amount, 0, 255);
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

function poly(ctx: CanvasRenderingContext2D, pts: [number, number][], fill: string) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fill();
}

/** An axis-aligned box: top face plus the two faces turned toward the camera. */
function box(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  w: number,
  d: number,
  h: number,
  z: number,
  color: string,
) {
  const x0 = wx - w / 2;
  const x1 = wx + w / 2;
  const y0 = wy - d / 2;
  const y1 = wy + d / 2;
  const top = z + h;
  poly(
    ctx,
    [
      [px(x1, y0), py(x1, y0, top)],
      [px(x1, y1), py(x1, y1, top)],
      [px(x0, y1), py(x0, y1, top)],
      [px(x0, y0), py(x0, y0, top)],
    ],
    color,
  );
  poly(
    ctx,
    [
      [px(x1, y0), py(x1, y0, top)],
      [px(x1, y1), py(x1, y1, top)],
      [px(x1, y1), py(x1, y1, z)],
      [px(x1, y0), py(x1, y0, z)],
    ],
    shade(color, 0.78),
  );
  poly(
    ctx,
    [
      [px(x0, y1), py(x0, y1, top)],
      [px(x1, y1), py(x1, y1, top)],
      [px(x1, y1), py(x1, y1, z)],
      [px(x0, y1), py(x0, y1, z)],
    ],
    shade(color, 0.6),
  );
}

/** Upright cylinder — trunks, torsos, logs on end. */
function cylinder(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  r: number,
  h: number,
  z: number,
  color: string,
) {
  const cx = px(wx, wy);
  const top = py(wx, wy, z + h);
  const bot = py(wx, wy, z);
  const rx = r * IX * 2;
  const ry = r * IY * 2;
  ctx.fillStyle = shade(color, 0.7);
  ctx.beginPath();
  ctx.moveTo(cx - rx, top);
  ctx.lineTo(cx - rx, bot);
  ctx.ellipse(cx, bot, rx, ry, 0, Math.PI, 0, true);
  ctx.lineTo(cx + rx, top);
  ctx.ellipse(cx, top, rx, ry, 0, 0, Math.PI, false);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx, top, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Cone — pine tiers, tent roofs, sharpened stakes. */
function cone(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  r: number,
  h: number,
  z: number,
  color: string,
) {
  const cx = px(wx, wy);
  const base = py(wx, wy, z);
  const apex = py(wx, wy, z + h);
  const rx = r * IX * 2;
  const ry = r * IY * 2;
  ctx.fillStyle = shade(color, 0.74);
  ctx.beginPath();
  ctx.moveTo(cx - rx, base);
  ctx.lineTo(cx, apex);
  ctx.lineTo(cx + rx, base);
  ctx.ellipse(cx, base, rx, ry, 0, 0, Math.PI, false);
  ctx.closePath();
  ctx.fill();
  // Lit side, so cones don't read as flat triangles.
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx - rx, base);
  ctx.lineTo(cx, apex);
  ctx.lineTo(cx + rx * 0.2, base + ry * 0.5);
  ctx.ellipse(cx, base, rx, ry, 0, 0.35, Math.PI, false);
  ctx.closePath();
  ctx.fill();
}

function sphere(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  r: number,
  z: number,
  color: string,
) {
  const cx = px(wx, wy);
  const cy = py(wx, wy, z);
  const rr = r * IX * 2;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, rr, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.beginPath();
  ctx.arc(cx - rr * 0.28, cy - rr * 0.3, rr * 0.58, 0, Math.PI * 2);
  ctx.fill();
}

function blob(ctx: CanvasRenderingContext2D, wx: number, wy: number, r: number, fill: string) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(px(wx, wy), py(wx, wy, groundZ(wx, wy)), r * IX * 2, r * IY * 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

const shadow = (ctx: CanvasRenderingContext2D, wx: number, wy: number, r: number) =>
  blob(ctx, wx, wy, r, "rgba(40,52,74,0.2)");

// ────────────────────────────── Ground bake ────────────────────────────────

function bakeGround(): HTMLCanvasElement {
  const GW = WORLD_W + MARGIN * 2;
  const GH = WORLD_H + MARGIN * 2;
  const c = document.createElement("canvas");
  c.width = Math.ceil(ISO_W * GROUND_RES);
  c.height = Math.ceil(ISO_H * GROUND_RES);
  const g = c.getContext("2d")!;
  g.scale(GROUND_RES, GROUND_RES);
  g.translate(-ISO_MIN_X, -ISO_MIN_Y);
  // From here on we paint in plain world coordinates; the shear does the rest.
  g.transform(IX, IY, -IX, IY, 0, 0);

  const grad = g.createLinearGradient(0, 0, 0, WORLD_H);
  grad.addColorStop(0, "#C7D8EC");
  grad.addColorStop(0.5, "#E4EDF7");
  grad.addColorStop(1, "#EFF4FA");
  g.fillStyle = grad;
  g.fillRect(0, 0, WORLD_W, WORLD_H);

  g.fillRect(-MARGIN, -MARGIN, GW, MARGIN);
  g.fillRect(-MARGIN, WORLD_H, GW, MARGIN);
  g.fillRect(-MARGIN, -MARGIN, MARGIN, GH);
  g.fillRect(WORLD_W, -MARGIN, MARGIN, GH);

  for (let i = 0; i < 230; i++) {
    const x = -MARGIN + Math.random() * GW;
    const y = -MARGIN + Math.random() * GH;
    const r = 26 + Math.random() * 80;
    g.fillStyle = Math.random() > 0.5 ? "rgba(255,255,255,0.6)" : "rgba(172,192,218,0.2)";
    g.beginPath();
    g.ellipse(x, y, r, r * 0.6, Math.random() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }

  // Trodden path from the camp gate up into the treeline.
  g.strokeStyle = "rgba(198,206,218,0.5)";
  g.lineWidth = 90;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(WORLD_W / 2, WORLD_H - 120);
  g.quadraticCurveTo(WORLD_W / 2 - 60, FENCE_Y, 520, 300);
  g.stroke();
  return c;
}

// ──────────────────────────────── Render ───────────────────────────────────

interface Item {
  depth: number;
  draw: () => void;
}

export function render(
  ctx: CanvasRenderingContext2D,
  w: World,
  rs: RenderState,
  view: View,
  dt: number,
) {
  rs.t += dt;
  if (!rs.ground) rs.ground = bakeGround();

  ctx.save();
  ctx.clearRect(0, 0, view.w, view.h);

  // Void behind the floating slab.
  const sky = ctx.createLinearGradient(0, 0, 0, view.h);
  sky.addColorStop(0, "#8FA8C6");
  sky.addColorStop(1, "#67809F");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, view.w, view.h);

  const amp = w.shake > 0 ? w.shake * 9 : 0;
  const shx = amp ? (Math.random() - 0.5) * amp : 0;
  const shy = amp ? (Math.random() - 0.5) * amp : 0;

  ctx.translate(shx, shy);
  ctx.scale(view.scale, view.scale);
  ctx.translate(-view.camX, -view.camY);

  drawSlab(ctx);
  drawGround(ctx, rs, view);
  drawDeck(ctx);
  drawGroundDecals(ctx, w, rs);

  const items: Item[] = [];
  collect(items, ctx, w, rs, view);
  items.sort((a, b) => a.depth - b.depth);
  for (const it of items) it.draw();

  drawArrows(ctx, w);
  drawParticles(ctx, w);
  ctx.restore();

  if (w.phase === "night" || w.phase === "gameover") drawNightLight(ctx, w, rs, view);

  ctx.save();
  ctx.translate(shx, shy);
  ctx.scale(view.scale, view.scale);
  ctx.translate(-view.camX, -view.camY);
  drawTexts(ctx, w);
  ctx.restore();

  drawHaze(ctx, view, w.phase === "night" || w.phase === "gameover");
  drawBreachMarkers(ctx, w, view);
  drawSnowfall(ctx, rs, view, dt);
}

/** The world as a floating slab of frozen ground, with visible thickness. */
function drawSlab(ctx: CanvasRenderingContext2D) {
  const T = 52;
  const X = WORLD_W + MARGIN;
  const Y = WORLD_H + MARGIN;
  const O = -MARGIN;
  poly(
    ctx,
    [
      [px(X, O), py(X, O)],
      [px(X, Y), py(X, Y)],
      [px(X, Y), py(X, Y, -T)],
      [px(X, O), py(X, O, -T)],
    ],
    "#8393A8",
  );
  poly(
    ctx,
    [
      [px(O, Y), py(O, Y)],
      [px(X, Y), py(X, Y)],
      [px(X, Y), py(X, Y, -T)],
      [px(O, Y), py(O, Y, -T)],
    ],
    "#6B7A8F",
  );
  // Lip of packed snow along the two front edges.
  poly(
    ctx,
    [
      [px(X, O), py(X, O)],
      [px(X, Y), py(X, Y)],
      [px(X, Y), py(X, Y, -10)],
      [px(X, O), py(X, O, -10)],
    ],
    "#DCE6F2",
  );
  poly(
    ctx,
    [
      [px(O, Y), py(O, Y)],
      [px(X, Y), py(X, Y)],
      [px(X, Y), py(X, Y, -10)],
      [px(O, Y), py(O, Y, -10)],
    ],
    "#C6D3E4",
  );

}

/** Blit just the on-screen slice of the pre-projected ground texture. */
function drawGround(ctx: CanvasRenderingContext2D, rs: RenderState, view: View) {
  const img = rs.ground!;
  const viewW = view.w / view.scale;
  const viewH = view.h / view.scale;
  const sx = (view.camX - ISO_MIN_X) * GROUND_RES;
  const sy = (view.camY - ISO_MIN_Y) * GROUND_RES;
  const x0 = clamp(sx, 0, img.width);
  const y0 = clamp(sy, 0, img.height);
  const x1 = clamp(sx + viewW * GROUND_RES, 0, img.width);
  const y1 = clamp(sy + viewH * GROUND_RES, 0, img.height);
  if (x1 - x0 < 1 || y1 - y0 < 1) return;
  ctx.drawImage(
    img,
    x0,
    y0,
    x1 - x0,
    y1 - y0,
    view.camX + (x0 - sx) / GROUND_RES,
    view.camY + (y0 - sy) / GROUND_RES,
    (x1 - x0) / GROUND_RES,
    (y1 - y0) / GROUND_RES,
  );
}

/** The camp platform: a wooden deck raised a few units above the snow. */
function drawDeck(ctx: CanvasRenderingContext2D) {
  const { x0, y0, x1, y1, h } = DECK;
  poly(
    ctx,
    [
      [px(x1, y0), py(x1, y0, h)],
      [px(x1, y1), py(x1, y1, h)],
      [px(x0, y1), py(x0, y1, h)],
      [px(x0, y0), py(x0, y0, h)],
    ],
    "#C6AC85",
  );
  ctx.strokeStyle = "rgba(120,92,58,0.32)";
  ctx.lineWidth = 2;
  for (let x = x0 + 60; x < x1; x += 60) {
    ctx.beginPath();
    ctx.moveTo(px(x, y0), py(x, y0, h));
    ctx.lineTo(px(x, y1), py(x, y1, h));
    ctx.stroke();
  }
  poly(
    ctx,
    [
      [px(x1, y0), py(x1, y0, h)],
      [px(x1, y1), py(x1, y1, h)],
      [px(x1, y1), py(x1, y1, 0)],
      [px(x1, y0), py(x1, y0, 0)],
    ],
    shade("#C6AC85", 0.74),
  );
  poly(
    ctx,
    [
      [px(x0, y1), py(x0, y1, h)],
      [px(x1, y1), py(x1, y1, h)],
      [px(x1, y1), py(x1, y1, 0)],
      [px(x0, y1), py(x0, y1, 0)],
    ],
    shade("#C6AC85", 0.58),
  );
}

// ─────────────────────────── Ground-level decals ───────────────────────────

function drawGroundDecals(ctx: CanvasRenderingContext2D, w: World, rs: RenderState) {
  for (const s of w.splats) blob(ctx, s.x, s.y, s.r, `rgba(122,36,32,${s.a})`);

  // The ad-style dashed drop pads: where to cook, where to plug the wall.
  if (w.rawMeat > 0 || w.cook.some((c) => c.state !== "empty")) {
    dashedZone(ctx, FIRE.x, FIRE.y, FIRE_RANGE * 0.8, rs.t, "rgba(255,180,90,0.8)");
  }
  if (w.wood > 0) {
    for (let i = 0; i < w.fence.length; i++) {
      if (w.fence[i].hp > 0) continue;
      dashedZone(ctx, segCenter(i), FENCE_Y + 20, 26, rs.t, "rgba(120,200,255,0.8)");
    }
  }

  // Chevrons nudging you toward whatever the camp needs next.
  const p = w.player;
  const goal =
    w.rawMeat > 0
      ? { x: FIRE.x, y: FIRE.y }
      : w.cookedMeat > 0
        ? (w.visitors.find((v) => v.state === "waiting") ?? null)
        : null;
  if (goal) chevrons(ctx, p.x, p.y, goal.x, goal.y, rs.t);
}

function dashedZone(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  r: number,
  t: number,
  color: string,
) {
  const z = groundZ(wx, wy) + 0.5;
  const pts: [number, number][] = [
    [px(wx, wy - r), py(wx, wy - r, z)],
    [px(wx + r, wy), py(wx + r, wy, z)],
    [px(wx, wy + r), py(wx, wy + r, z)],
    [px(wx - r, wy), py(wx - r, wy, z)],
  ];
  ctx.save();
  ctx.setLineDash([13, 10]);
  ctx.lineDashOffset = -t * 22;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function chevrons(
  ctx: CanvasRenderingContext2D,
  fx: number,
  fy: number,
  tx: number,
  ty: number,
  t: number,
) {
  const dx = tx - fx;
  const dy = ty - fy;
  const d = Math.hypot(dx, dy);
  if (d < 90) return;
  const ux = dx / d;
  const uy = dy / d;
  for (let i = 0; i < 3; i++) {
    const travel = 50 + ((i * 34 + t * 60) % 110);
    const cx = fx + ux * travel;
    const cy = fy + uy * travel;
    const z = groundZ(cx, cy) + 0.5;
    const tipX = cx + ux * 16;
    const tipY = cy + uy * 16;
    const backX = cx - ux * 8;
    const backY = cy - uy * 8;
    const nx = -uy * 13;
    const ny = ux * 13;
    ctx.globalAlpha = 0.55 - i * 0.12;
    poly(
      ctx,
      [
        [px(tipX, tipY), py(tipX, tipY, z)],
        [px(backX + nx, backY + ny), py(backX + nx, backY + ny, z)],
        [px(backX - nx, backY - ny), py(backX - nx, backY - ny, z)],
      ],
      "#4FC3F7",
    );
  }
  ctx.globalAlpha = 1;
}

// ──────────────────────── Everything that has height ───────────────────────

function collect(
  items: Item[],
  ctx: CanvasRenderingContext2D,
  w: World,
  rs: RenderState,
  view: View,
) {
  // Only queue what the camera can actually see — the world holds hundreds of
  // extruded props and drawing them all is what turns a phone into a heater.
  const viewW = view.w / view.scale;
  const viewH = view.h / view.scale;
  const inView = (wx: number, wy: number) => {
    const sx = px(wx, wy);
    const sy = py(wx, wy);
    return (
      sx > view.camX - 120 &&
      sx < view.camX + viewW + 120 &&
      sy > view.camY - 220 &&
      sy < view.camY + viewH + 120
    );
  };
  const add = (wx: number, wy: number, draw: () => void, bias = 0) => {
    if (!inView(wx, wy)) return;
    items.push({ depth: depthOf(wx, wy) + bias, draw });
  };

  const pxp = px(w.player.x, w.player.y);
  const pyp = py(w.player.x, w.player.y);
  for (const t of rs.decor) {
    add(t.x, t.y, () =>
      drawTree(ctx, { x: t.x, y: t.y, regrow: 0, scale: t.scale, shake: 0, chops: 4, maxChops: 4 }, 1),
    );
  }

  for (const t of w.trees) {
    // A canopy standing between you and the camera goes see-through, so you
    // never lose the hero in the forest with zombies on your heels.
    const hides =
      depthOf(t.x, t.y) > depthOf(w.player.x, w.player.y) &&
      Math.abs(px(t.x, t.y) - pxp) < 62 &&
      py(t.x, t.y) - pyp > -20 &&
      py(t.x, t.y) - pyp < 150;
    add(t.x, t.y, () => drawTree(ctx, t, hides ? 0.42 : 1));
  }

  for (let i = 0; i < w.fence.length; i++) {
    const seg = w.fence[i];
    add(segCenter(i), FENCE_Y, () => drawFenceSeg(ctx, seg, i));
  }

  add(560, FENCE_Y + 250, () => drawTent(ctx, 560, FENCE_Y + 250, "#C7643C"));
  add(700, FENCE_Y + 330, () => drawTent(ctx, 700, FENCE_Y + 330, "#4E7C8C"));
  add(470, FENCE_Y + 180, () => drawWoodpile(ctx, w, 470, FENCE_Y + 180));
  add(415, FENCE_Y + 300, () => drawCrate(ctx, 415, FENCE_Y + 300, 26));
  add(452, FENCE_Y + 322, () => drawCrate(ctx, 452, FENCE_Y + 322, 20));
  add(800, FENCE_Y + 430, () => drawCart(ctx, 800, FENCE_Y + 430));
  add(SHOP_POST.x, SHOP_POST.y, () => drawNoticeBoard(ctx, rs));
  add(FIRE.x, FIRE.y, () => drawFire(ctx, w, rs));

  for (const d of w.drops) add(d.x, d.y, () => drawDrop(ctx, d, rs));
  for (const z of w.zombies) add(z.x, z.y, () => drawZombie(ctx, z));
  for (const r of w.recruits) add(r.x, r.y, () => drawRecruit(ctx, r));
  for (const v of w.visitors) add(v.x, v.y, () => drawVisitor(ctx, v));
  add(w.player.x, w.player.y, () => drawPlayer(ctx, w), 1);
}

// ──────────────────────────────── Trees ────────────────────────────────────

function drawTree(
  ctx: CanvasRenderingContext2D,
  t: { x: number; y: number; regrow: number; scale: number; shake: number; chops: number; maxChops: number },
  alpha = 1,
) {
  const s = t.scale;
  ctx.save();
  ctx.globalAlpha = alpha;

  if (t.regrow > 0) {
    shadow(ctx, t.x, t.y, 14 * s);
    cylinder(ctx, t.x, t.y, 9 * s, 8 * s, 0, "#7A5433");
    const grow = clamp(1 - t.regrow / 24, 0, 1);
    if (grow > 0.25) cone(ctx, t.x, t.y, 10 * s * grow, 30 * s * grow, 8 * s, "#2F6B4A");
    ctx.restore();
    return;
  }

  const wobble = t.shake > 0 ? Math.sin(t.shake * 55) * t.shake * 6 : 0;
  const x = t.x + wobble;
  shadow(ctx, t.x, t.y, 24 * s);
  cylinder(ctx, x, t.y, 6 * s, 30 * s, 0, "#7A5433");
  cone(ctx, x, t.y, 27 * s, 46 * s, 20 * s, "#2A6B4E");
  cone(ctx, x, t.y, 21 * s, 40 * s, 48 * s, "#2F7455");
  cone(ctx, x, t.y, 14 * s, 34 * s, 74 * s, "#347C5C");
  ctx.globalAlpha = alpha * 0.95;
  cone(ctx, x, t.y, 20 * s, 11 * s, 64 * s, "#E7EFF9");
  cone(ctx, x, t.y, 13 * s, 15 * s, 92 * s, "#F4F8FD");
  ctx.restore();
}

// ──────────────────────────────── Fence ────────────────────────────────────

function drawFenceSeg(
  ctx: CanvasRenderingContext2D,
  seg: { hp: number; maxHp: number; hit: number },
  i: number,
) {
  const x0 = segX(i);
  const ratio = seg.hp / seg.maxHp;

  if (seg.hp <= 0) {
    // Splintered stumps where the wall used to be.
    for (let k = 0; k < 3; k++) {
      const sx = x0 + 12 + k * 18;
      shadow(ctx, sx, FENCE_Y, 9);
      box(ctx, sx, FENCE_Y, 13, 13, 5 + (k % 2) * 7, 0, "#7A5433");
    }
    return;
  }

  const wood = seg.hit > 0 ? "#E8A15E" : ratio > 0.5 ? "#A9763B" : "#8A5F2E";
  const posts = 4;
  const step = (SEG_W - 16) / (posts - 1);
  for (let k = 0; k < posts; k++) {
    const sx = x0 + 8 + k * step;
    const h = 40 - (ratio < 0.4 ? (k % 2) * 12 : 0);
    box(ctx, sx, FENCE_Y, 15, 14, h, 0, wood);
    cone(ctx, sx, FENCE_Y, 7.5, 9, h, wood);
    cone(ctx, sx, FENCE_Y, 5.5, 5, h + 5, "#EEF4FB");
  }
  // Rail tying the stakes together, on the camp side.
  box(ctx, x0 + SEG_W / 2, FENCE_Y + 7, SEG_W - 6, 5, 5, 17, shade(wood, 0.86));

  if (ratio < 0.99) {
    const cx = px(x0 + SEG_W / 2, FENCE_Y);
    const cy = py(x0 + SEG_W / 2, FENCE_Y, 62);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(cx - 17, cy, 34, 5);
    ctx.fillStyle = ratio > 0.5 ? "#7DD3A0" : ratio > 0.25 ? "#FFC542" : "#E4756A";
    ctx.fillRect(cx - 17, cy, 34 * ratio, 5);
  }
}

// ───────────────────────────── Camp props ──────────────────────────────────

function drawTent(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  const z = groundZ(x, y);
  shadow(ctx, x, y, 34);
  cone(ctx, x, y, 34, 64, z, color);
  cone(ctx, x, y, 11, 12, z + 58, "#F2F7FD");
  const cx = px(x, y);
  const cy = py(x, y, z);
  ctx.fillStyle = "rgba(30,22,18,0.78)";
  ctx.beginPath();
  ctx.moveTo(cx, cy - 36);
  ctx.lineTo(cx - 11, cy + 2);
  ctx.lineTo(cx + 11, cy + 2);
  ctx.closePath();
  ctx.fill();
}

/** The camp's log stack — its size is your actual wood stock. */
function drawWoodpile(ctx: CanvasRenderingContext2D, w: World, x: number, y: number) {
  const z = groundZ(x, y);
  const logs = Math.min(18, Math.floor(w.wood / 3));
  shadow(ctx, x, y, 34);
  box(ctx, x - 32, y, 8, 8, 36, z, "#6B4A2E");
  box(ctx, x + 32, y, 8, 8, 36, z, "#6B4A2E");
  for (let i = 0; i < logs; i++) {
    const row = Math.floor(i / 6);
    const col = i % 6;
    const lx = x - 24 + col * 9.6 + (row % 2) * 4;
    box(ctx, lx, y, 9, 22, 9, z + row * 9, "#9C6A3C");
  }
  if (logs >= 6) box(ctx, x, y, 58, 24, 2, z + Math.ceil(logs / 6) * 9, "#EEF4FB");
}

function drawCrate(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const z = groundZ(x, y);
  shadow(ctx, x, y, size * 0.7);
  box(ctx, x, y, size, size, size, z, "#B0803F");
  box(ctx, x, y, size * 0.96, size * 0.96, 2, z + size, "#EEF4FB");
}

function drawCart(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const z = groundZ(x, y);
  shadow(ctx, x, y, 36);
  box(ctx, x - 26, y - 18, 12, 7, 13, z, "#4A3B2A");
  box(ctx, x - 26, y + 18, 12, 7, 13, z, "#4A3B2A");
  box(ctx, x, y, 74, 36, 15, z + 9, "#9C6A3C");
  box(ctx, x, y, 70, 32, 3, z + 24, "#EEF4FB");
  box(ctx, x + 44, y, 26, 6, 5, z + 12, "#6B4A2E");
}

function drawNoticeBoard(ctx: CanvasRenderingContext2D, rs: RenderState) {
  const { x, y } = SHOP_POST;
  const z = groundZ(x, y);
  shadow(ctx, x, y, 20);
  box(ctx, x - 14, y, 7, 7, 44, z, "#6B4A2E");
  box(ctx, x + 14, y, 7, 7, 44, z, "#6B4A2E");
  box(ctx, x, y, 48, 9, 34, z + 32, "#B0803F");
  ctx.font = "20px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("🪙", px(x, y), py(x, y, z + 50) + 6 + Math.sin(rs.t * 2) * 1.5);
}

function drawFire(ctx: CanvasRenderingContext2D, w: World, rs: RenderState) {
  const { x, y } = FIRE;
  const z = groundZ(x, y);
  shadow(ctx, x, y, 44);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    box(ctx, x + Math.cos(a) * 36, y + Math.sin(a) * 36, 14, 14, 8, z, i % 2 ? "#959AA4" : "#AEB4BE");
  }
  box(ctx, x, y, 46, 11, 9, z, "#6B4A2E");
  box(ctx, x, y, 11, 46, 9, z + 2, "#7A5433");

  const flick = Math.sin(rs.t * 11) * 6;
  cone(ctx, x, y, 17, 42 + flick, z + 6, "#FF6A1A");
  cone(ctx, x, y, 11, 28 + flick * 0.6, z + 10, "#FFA23A");
  cone(ctx, x, y, 6, 16 + flick * 0.4, z + 14, "#FFE0A0");

  // Grill rack, and whatever is on it.
  box(ctx, x, y - 27, 64, 5, 4, z + 26, "#4A4A52");
  box(ctx, x, y + 27, 64, 5, 4, z + 26, "#4A4A52");
  const slots = cookSlots(w);
  for (let i = 0; i < slots; i++) {
    const s = w.cook[i];
    if (s.state === "empty") continue;
    const mx = x - 24 + i * 14;
    const bob = Math.sin(rs.t * 6 + i) * 1.2;
    box(ctx, mx, y, 13, 24, 5, z + 30 + bob, s.state === "ready" ? "#8C4A22" : "#D07A6C");
    if (s.state === "ready") {
      ctx.fillStyle = "rgba(255,214,120,0.95)";
      ctx.beginPath();
      ctx.arc(px(mx, y) + 9, py(mx, y, z + 44), 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ──────────────────────────── Characters ───────────────────────────────────

/** Where a world-space facing direction lands in screen space. */
function faceOffset(face: number, dist: number) {
  const wx = Math.cos(face) * dist;
  const wy = Math.sin(face) * dist;
  return { x: px(wx, wy), y: py(wx, wy) };
}

interface FigureOpts {
  x: number;
  y: number;
  face: number;
  coat: string;
  skin: string;
  hat?: string;
  s?: number;
  bob?: number;
  alpha?: number;
  hunched?: boolean;
  eyes?: string;
}

function drawFigure(ctx: CanvasRenderingContext2D, o: FigureOpts) {
  const s = o.s ?? 1;
  const z = groundZ(o.x, o.y) + (o.bob ?? 0);
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  shadow(ctx, o.x, o.y, 13 * s);
  box(ctx, o.x - 4 * s, o.y + 3 * s, 7 * s, 7 * s, 8 * s, z - (o.bob ?? 0), "#3A322C");
  box(ctx, o.x + 4 * s, o.y - 3 * s, 7 * s, 7 * s, 8 * s, z - (o.bob ?? 0), "#3A322C");
  cylinder(ctx, o.x, o.y, 10 * s, 23 * s, z + 7 * s, o.coat);
  const headZ = z + 36 * s;
  sphere(ctx, o.x, o.y, 8.5 * s, headZ, o.skin);
  if (o.hat) sphere(ctx, o.x, o.y, 8.9 * s, headZ + 5 * s, o.hat);

  const f = faceOffset(o.face, 7 * s);
  const hx = px(o.x, o.y) + f.x;
  const hy = py(o.x, o.y, headZ) + f.y;
  ctx.fillStyle = o.eyes ?? "#2A211B";
  ctx.beginPath();
  ctx.arc(hx - 2.6 * s, hy, 1.8 * s, 0, Math.PI * 2);
  ctx.arc(hx + 2.6 * s, hy, 1.8 * s, 0, Math.PI * 2);
  ctx.fill();

  // Arms: stretched forward for zombies, at the sides for everyone else.
  const a = faceOffset(o.face, o.hunched ? 16 * s : 7 * s);
  const side = faceOffset(o.face + Math.PI / 2, 9.5 * s);
  ctx.fillStyle = shade(o.coat, 0.92);
  for (const sgn of [1, -1]) {
    ctx.beginPath();
    ctx.arc(
      px(o.x, o.y) + a.x + side.x * sgn,
      py(o.x, o.y, z + (o.hunched ? 26 : 22) * s) + a.y + side.y * sgn,
      4.6 * s,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.restore();
}

/** The ad-famous stack of goods carried above the head. */
function carryStack(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  n: number,
  color: string,
  baseZ: number,
) {
  const count = Math.min(10, n);
  for (let i = 0; i < count; i++) {
    box(ctx, x, y, 18, 18, 4, baseZ + i * 4.6, i % 2 ? color : shade(color, 1.1));
  }
  if (n > 10) {
    const tx = px(x, y);
    const ty = py(x, y, baseZ + count * 4.6 + 10);
    ctx.font = "700 12px system-ui";
    ctx.textAlign = "center";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(20,14,8,0.6)";
    ctx.strokeText(`×${n}`, tx, ty);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(`×${n}`, tx, ty);
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, w: World) {
  const p = w.player;
  const bob = Math.abs(Math.sin(p.walk)) * 2.5;
  drawFigure(ctx, {
    x: p.x,
    y: p.y,
    face: p.face,
    coat: "#FF6A1A",
    skin: "#F5C79B",
    hat: "#E0511A",
    bob,
    alpha: p.hurt > 0 ? 0.55 + Math.sin(p.hurt * 50) * 0.35 : 1,
  });

  const z = groundZ(p.x, p.y) + bob;
  // Axe, swung through an arc when it connects.
  const armA = p.face + (p.swing > 0 ? (1 - p.swing) * 2.4 - 1.2 : 0.7);
  const hx = px(p.x, p.y);
  const hy = py(p.x, p.y, z + 24);
  const g1 = faceOffset(armA, 13);
  const g2 = faceOffset(armA, 30);
  ctx.strokeStyle = "#6B4A2E";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(hx + g1.x, hy + g1.y);
  ctx.lineTo(hx + g2.x, hy + g2.y);
  ctx.stroke();
  ctx.fillStyle = "#D3D9E2";
  ctx.beginPath();
  ctx.moveTo(hx + g2.x - 5, hy + g2.y - 9);
  ctx.lineTo(hx + g2.x + 7, hy + g2.y - 5);
  ctx.lineTo(hx + g2.x + 5, hy + g2.y + 4);
  ctx.lineTo(hx + g2.x - 5, hy + g2.y + 1);
  ctx.closePath();
  ctx.fill();
  if (p.swing > 0) {
    ctx.strokeStyle = `rgba(255,255,255,${p.swing * 0.45})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(hx, hy + 6, 36, 19, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // What the hero is hauling, stacked overhead like in the ads.
  if (w.cookedMeat > 0) carryStack(ctx, p.x, p.y, w.cookedMeat, "#8C4A22", z + 50);
  else if (w.rawMeat > 0) carryStack(ctx, p.x, p.y, w.rawMeat, "#D07A6C", z + 50);

  if (p.hp < p.maxHp) {
    const bx = px(p.x, p.y);
    const by = py(p.x, p.y, z + 70);
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(bx - 20, by, 40, 6);
    ctx.fillStyle = p.hp / p.maxHp > 0.4 ? "#7DD3A0" : "#E4756A";
    ctx.fillRect(bx - 20, by, 40 * (p.hp / p.maxHp), 6);
  }
}

function drawZombie(
  ctx: CanvasRenderingContext2D,
  z: { x: number; y: number; r: number; kind: string; hp: number; maxHp: number; hurt: number; wob: number; face: number },
) {
  const s = z.r / 14;
  const hurt = z.hurt > 0;
  drawFigure(ctx, {
    x: z.x,
    y: z.y,
    face: z.face,
    coat: hurt
      ? "#FFFFFF"
      : z.kind === "brute"
        ? "#4F6340"
        : z.kind === "runner"
          ? "#7E9463"
          : "#6B8055",
    skin: hurt ? "#FFFFFF" : "#93A87C",
    s,
    bob: Math.abs(Math.sin(z.wob * 2)) * 2,
    hunched: true,
    eyes: "#FF4B3E",
  });
  if (z.hp < z.maxHp) {
    const bx = px(z.x, z.y);
    const by = py(z.x, z.y, groundZ(z.x, z.y) + 56 * s);
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(bx - 15 * s, by, 30 * s, 5);
    ctx.fillStyle = "#C4453B";
    ctx.fillRect(bx - 15 * s, by, 30 * s * (z.hp / z.maxHp), 5);
  }
}

function drawRecruit(
  ctx: CanvasRenderingContext2D,
  r: { x: number; y: number; kind: string; hp: number; maxHp: number; hurt: number; face: number; walk: number },
) {
  const coat = r.kind === "garde" ? "#3E6FA8" : r.kind === "archer" ? "#2E7D5B" : "#9A6236";
  drawFigure(ctx, {
    x: r.x,
    y: r.y,
    face: r.face,
    coat,
    skin: "#F0C9A0",
    hat: shade(coat, 0.8),
    s: 0.94,
    bob: Math.abs(Math.sin(r.walk)) * 2,
    alpha: r.hurt > 0 ? 0.6 : 1,
  });

  const z = groundZ(r.x, r.y);
  const hx = px(r.x, r.y);
  const hy = py(r.x, r.y, z + 24);
  const g = faceOffset(r.face, 16);
  if (r.kind === "garde") {
    ctx.fillStyle = "#C9CFD8";
    ctx.beginPath();
    ctx.ellipse(hx + g.x, hy + g.y, 7, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (r.kind === "archer") {
    ctx.strokeStyle = "#6B4A2E";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(hx + g.x, hy + g.y, 11, -1.2, 1.2);
    ctx.stroke();
  } else {
    ctx.strokeStyle = "#6B4A2E";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx + g.x, hy + g.y - 6);
    ctx.stroke();
    ctx.fillStyle = "#8A8F98";
    ctx.fillRect(hx + g.x - 4, hy + g.y - 12, 9, 7);
  }
  if (r.hp < r.maxHp) {
    const by = py(r.x, r.y, z + 62);
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(hx - 14, by, 28, 5);
    ctx.fillStyle = "#7DD3A0";
    ctx.fillRect(hx - 14, by, 28 * (r.hp / r.maxHp), 5);
  }
}

function drawVisitor(
  ctx: CanvasRenderingContext2D,
  v: { x: number; y: number; hue: number; state: string; patience: number; maxPatience: number; walk: number; face: number; pay: number },
) {
  drawFigure(ctx, {
    x: v.x,
    y: v.y,
    face: v.face,
    coat: `hsl(${v.hue} 45% 55%)`,
    skin: "#EFC49E",
    hat: `hsl(${v.hue} 45% 42%)`,
    s: 0.9,
    bob: Math.abs(Math.sin(v.walk)) * 2,
  });
  if (v.state !== "waiting") return;

  // "I want meat" bubble, with the patience they have left.
  const bx = px(v.x, v.y);
  const by = py(v.x, v.y, groundZ(v.x, v.y) + 82);
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.beginPath();
  ctx.roundRect(bx - 28, by - 20, 56, 32, 11);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(bx - 5, by + 11);
  ctx.lineTo(bx + 5, by + 11);
  ctx.lineTo(bx, by + 20);
  ctx.closePath();
  ctx.fill();
  ctx.font = "17px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("🍖", bx - 10, by + 2);
  ctx.font = "700 12px system-ui";
  ctx.fillStyle = "#1A1208";
  ctx.fillText(`${v.pay}`, bx + 13, by + 1);
  const ratio = v.patience / v.maxPatience;
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect(bx - 21, by + 5, 42, 4);
  ctx.fillStyle = ratio > 0.4 ? "#7DD3A0" : "#E4756A";
  ctx.fillRect(bx - 21, by + 5, 42 * ratio, 4);
}

function drawDrop(
  ctx: CanvasRenderingContext2D,
  d: { x: number; y: number; bob: number; life: number },
  rs: RenderState,
) {
  const hover = 6 + Math.sin(rs.t * 4 + d.bob) * 3;
  shadow(ctx, d.x, d.y, 9);
  const blink = d.life < 8 && Math.floor(d.life * 4) % 2 === 0;
  box(ctx, d.x, d.y, 17, 17, 6, groundZ(d.x, d.y) + hover, blink ? "#F3B0A6" : "#C9564B");
}

// ───────────────────────── Projectiles and bits ────────────────────────────

function drawArrows(ctx: CanvasRenderingContext2D, w: World) {
  ctx.strokeStyle = "#4A3B2A";
  ctx.lineWidth = 2.6;
  ctx.lineCap = "round";
  for (const a of w.arrows) {
    const k = 16 / (Math.hypot(a.vx, a.vy) || 1);
    ctx.beginPath();
    ctx.moveTo(px(a.x, a.y), py(a.x, a.y, 22));
    ctx.lineTo(px(a.x - a.vx * k, a.y - a.vy * k), py(a.x - a.vx * k, a.y - a.vy * k, 22));
    ctx.stroke();
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, w: World) {
  for (const p of w.particles) {
    ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(px(p.x, p.y), py(p.x, p.y, 18), p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawTexts(ctx: CanvasRenderingContext2D, w: World) {
  ctx.textAlign = "center";
  for (const f of w.texts) {
    ctx.globalAlpha = clamp(f.life, 0, 1);
    ctx.font = `700 ${f.size}px system-ui, sans-serif`;
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = "rgba(20,14,8,0.6)";
    const x = px(f.x, f.y);
    const y = py(f.x, f.y, 60) - (1.1 - f.life) * 34;
    ctx.strokeText(f.text, x, y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, x, y);
  }
  ctx.globalAlpha = 1;
}

// ─────────────────────────── Night and weather ─────────────────────────────

function drawNightLight(ctx: CanvasRenderingContext2D, w: World, rs: RenderState, view: View) {
  // Half resolution: darkness has no edges to speak of, and this halves the
  // most expensive full-screen pass in the frame.
  const nw = Math.max(1, Math.ceil(view.w / 2));
  const nh = Math.max(1, Math.ceil(view.h / 2));
  if (!rs.night || rs.night.width !== nw || rs.night.height !== nh) {
    rs.night = document.createElement("canvas");
    rs.night.width = nw;
    rs.night.height = nh;
  }
  const g = rs.night.getContext("2d")!;
  g.globalCompositeOperation = "source-over";
  g.fillStyle = "rgba(14,22,52,0.54)";
  g.globalAlpha = 1;
  g.fillRect(0, 0, nw, nh);

  g.globalCompositeOperation = "destination-out";
  const light = (wx: number, wy: number, r: number, strength: number) => {
    const x = ((px(wx, wy) - view.camX) * view.scale) / 2;
    const y = ((py(wx, wy) - view.camY) * view.scale) / 2;
    const rr = (r * view.scale) / 2;
    const grad = g.createRadialGradient(x, y, 0, x, y, rr);
    grad.addColorStop(0, `rgba(0,0,0,${strength})`);
    grad.addColorStop(0.55, `rgba(0,0,0,${strength * 0.55})`);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, rr, 0, Math.PI * 2);
    g.fill();
  };
  light(FIRE.x, FIRE.y, 200 + Math.sin(rs.t * 7) * 10, 0.95);
  light(w.player.x, w.player.y, 205, 0.85);
  // Cap the extra lights: a big camp shouldn't cost a big frame.
  for (let i = 0; i < Math.min(6, w.recruits.length); i++) {
    const r = w.recruits[i];
    light(r.x, r.y, 80, 0.5);
  }
  ctx.drawImage(rs.night, 0, 0, view.w, view.h);

  // Eyes glow through the dark, so a horde is never invisible.
  ctx.fillStyle = "rgba(255,75,62,0.95)";
  for (const z of w.zombies) {
    const ex = (px(z.x, z.y) - view.camX) * view.scale;
    const ey = (py(z.x, z.y, groundZ(z.x, z.y) + 36 * (z.r / 14)) - view.camY) * view.scale;
    if (ex < -20 || ex > view.w + 20 || ey < -20 || ey > view.h + 20) continue;
    ctx.beginPath();
    ctx.arc(ex - 3, ey, 2.1, 0, Math.PI * 2);
    ctx.arc(ex + 3, ey, 2.1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Warm glow over the fire — painted only around the fire, not screen-wide.
  const fx = (px(FIRE.x, FIRE.y) - view.camX) * view.scale;
  const fy = (py(FIRE.x, FIRE.y) - view.camY) * view.scale;
  const fr = 190 * view.scale;
  if (fx > -fr && fx < view.w + fr && fy > -fr && fy < view.h + fr) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const grad = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr);
    grad.addColorStop(0, "rgba(255,140,50,0.3)");
    grad.addColorStop(1, "rgba(255,140,50,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(fx - fr, fy - fr, fr * 2, fr * 2);
    ctx.restore();
  }
}

function drawBreachMarkers(ctx: CanvasRenderingContext2D, w: World, view: View) {
  if (w.phase !== "night") return;
  const seen = new Set<number>();
  for (let i = 0; i < w.fence.length; i++) {
    if (w.fence[i].hp > 0) continue;
    const cx = segCenter(i);
    const sx = (px(cx, FENCE_Y) - view.camX) * view.scale;
    const sy = (py(cx, FENCE_Y) - view.camY) * view.scale;
    if (sx > 0 && sx < view.w && sy > 0 && sy < view.h) continue;
    const key = Math.round(sx / 70) * 1000 + Math.round(sy / 70);
    if (seen.has(key)) continue;
    seen.add(key);
    const mx = clamp(sx, 26, view.w - 26);
    const my = clamp(sy, 110, view.h - 130);
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(Math.atan2(sy - my, sx - mx));
    ctx.fillStyle = "rgba(228,117,106,0.92)";
    ctx.beginPath();
    ctx.moveTo(13, 0);
    ctx.lineTo(-8, -9);
    ctx.lineTo(-8, 9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

/** Distance haze: the far edge of the slab dissolves into the snowstorm. */
function drawHaze(ctx: CanvasRenderingContext2D, view: View, night: boolean) {
  const h = view.h * 0.42;
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, night ? "rgba(26,38,74,0.7)" : "rgba(150,172,199,0.95)");
  grad.addColorStop(0.45, night ? "rgba(26,38,74,0.35)" : "rgba(168,188,212,0.5)");
  grad.addColorStop(1, "rgba(190,206,226,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, view.w, h);
}

function drawSnowfall(ctx: CanvasRenderingContext2D, rs: RenderState, view: View, dt: number) {
  if (rs.flakes.length === 0) {
    for (let i = 0; i < 120; i++) {
      rs.flakes.push({
        x: Math.random() * view.w,
        y: Math.random() * view.h,
        z: 0.4 + Math.random() * 1.2,
        r: 1 + Math.random() * 2.4,
        drift: Math.random() * Math.PI * 2,
      });
    }
  }
  ctx.save();
  for (const f of rs.flakes) {
    f.drift += dt * 1.6;
    f.y += (40 + f.z * 70) * dt;
    f.x += Math.sin(f.drift) * 16 * dt + 14 * dt * f.z;
    if (f.y > view.h + 6) {
      f.y = -6;
      f.x = Math.random() * view.w;
    }
    if (f.x > view.w + 6) f.x = -6;
    ctx.globalAlpha = 0.25 + f.z * 0.35;
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r * f.z, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}
