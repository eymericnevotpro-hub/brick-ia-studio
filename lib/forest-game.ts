// Congères — the survival game the fake ads promise but never deliver.
//
// Everything here is *active*: nothing produces wood, meat, coins or defence
// while you stand still. You chop, you build, you fight, you cook, you feed.
// No offline progress, no auto-collect, no timers that tick for you — the only
// clocks that run are the ones putting you under pressure (the night, the
// meat burning on the fire, a visitor losing patience).
//
// This module is pure simulation: no canvas, no React, no DOM. `step()` moves
// the world forward, `render()` (lib/forest-render.ts) draws whatever state it
// finds, and the React shell only feeds it an input vector.

// ─────────────────────────────── World layout ───────────────────────────────

export const WORLD_W = 1100;
export const WORLD_H = 1700;
/** The palisade line: forest to the north, camp to the south. */
export const FENCE_Y = 1120;
export const FENCE_X0 = 40;
export const SEG_W = 60;
export const SEG_COUNT = Math.floor((WORLD_W - FENCE_X0 * 2) / SEG_W);
export const FIRE = { x: 300, y: 1330 };
/** How close you must stand to load the grill or grab what's cooked. */
export const FIRE_RANGE = 95;
export const SHOP_POST = { x: 830, y: 1300 };

const DAY_TIME = 55;
const COOK_BURN = 11;

// ──────────────────────────────── Types ────────────────────────────────────

export type Phase = "intro" | "day" | "night" | "gameover";
export type ZKind = "walker" | "runner" | "brute";
export type RKind = "garde" | "archer" | "charpentier";
export type SoundEvent =
  | "chop"
  | "fell"
  | "hit"
  | "kill"
  | "hurt"
  | "build"
  | "cook"
  | "coin"
  | "join"
  | "arrow"
  | "wave"
  | "buy"
  | "over";

export interface Tree {
  x: number;
  y: number;
  chops: number;
  maxChops: number;
  /** Seconds until a felled stump grows back. 0 = standing. */
  regrow: number;
  scale: number;
  /** Visual wobble after a hit. */
  shake: number;
}

export interface FenceSeg {
  x: number;
  hp: number;
  maxHp: number;
  hit: number;
}

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  face: number;
  /** Swing animation progress, 0 = idle. */
  swing: number;
  swingCd: number;
  dashT: number;
  dashCd: number;
  dashX: number;
  dashY: number;
  iframe: number;
  hurt: number;
  buildCd: number;
  cookCd: number;
  walk: number;
}

export interface Zombie {
  id: number;
  kind: ZKind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  r: number;
  speed: number;
  dmg: number;
  meat: number;
  atkCd: number;
  hurt: number;
  think: number;
  target: ZTarget;
  wob: number;
  face: number;
}

export type ZTarget =
  | { k: "fence"; i: number }
  | { k: "gap"; x: number }
  | { k: "player" }
  | { k: "recruit"; id: number };

export interface Recruit {
  id: number;
  kind: RKind;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  hp: number;
  maxHp: number;
  cd: number;
  hurt: number;
  face: number;
  walk: number;
  /** Fence index a carpenter is currently patching. */
  job: number;
}

export interface Arrow {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  dmg: number;
}

export interface Drop {
  id: number;
  x: number;
  y: number;
  bob: number;
  life: number;
}

export interface Visitor {
  id: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  patience: number;
  maxPatience: number;
  pay: number;
  joins: boolean;
  state: "coming" | "waiting" | "leaving";
  hue: number;
  walk: number;
  face: number;
}

export interface CookSlot {
  state: "empty" | "cooking" | "ready";
  t: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
}

export interface FloatText {
  x: number;
  y: number;
  vy: number;
  life: number;
  text: string;
  color: string;
  size: number;
}

export interface Splat {
  x: number;
  y: number;
  r: number;
  a: number;
}

export interface Upgrades {
  axe: number;
  boots: number;
  fence: number;
  fire: number;
  vigor: number;
}

export interface World {
  t: number;
  phase: Phase;
  wave: number;
  dayLeft: number;
  /** Seconds elapsed in the current night — drives the rage escalation. */
  nightT: number;
  raged: boolean;
  nightBanner: number;
  player: Player;
  trees: Tree[];
  fence: FenceSeg[];
  zombies: Zombie[];
  recruits: Recruit[];
  arrows: Arrow[];
  drops: Drop[];
  visitors: Visitor[];
  cook: CookSlot[];
  particles: Particle[];
  texts: FloatText[];
  splats: Splat[];
  wood: number;
  rawMeat: number;
  cookedMeat: number;
  coins: number;
  up: Upgrades;
  hired: { garde: number; archer: number; charpentier: number };
  spawnQueue: { kind: ZKind; at: number }[];
  visitorCd: number;
  shake: number;
  nextId: number;
  kills: number;
  fed: number;
  woodCut: number;
  /** Drained by the shell each frame to play sounds / vibrate. */
  events: SoundEvent[];
  hint: string;
}

export interface Input {
  mx: number;
  my: number;
  dash: boolean;
}

// ──────────────────────────────── Helpers ──────────────────────────────────

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const dist2 = (ax: number, ay: number, bx: number, by: number) => {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
};

export const segX = (i: number) => FENCE_X0 + i * SEG_W;
export const segCenter = (i: number) => FENCE_X0 + i * SEG_W + SEG_W / 2;
export const segIndexAt = (x: number) =>
  clamp(Math.floor((x - FENCE_X0) / SEG_W), 0, SEG_COUNT - 1);

/** Damage a swing deals, axe upgrades included. */
export const axeDamage = (w: World) => 20 + w.up.axe * 7;
export const playerSpeed = (w: World) => 205 + w.up.boots * 16;
export const fenceMax = (w: World) => 100 + w.up.fence * 30;
export const cookTime = (w: World) => Math.max(2.4, 5.5 - w.up.fire * 0.8);
export const cookSlots = (w: World) => 3 + Math.min(2, Math.floor(w.up.fire / 2));
/** A well-tended grill (level 3+) stops meat from burning. */
export const noBurn = (w: World) => w.up.fire >= 3;

/**
 * A night must never stalemate. Once the last zombie has spawned, whatever is
 * left outside starts hitting the palisade harder and harder — so a turtled
 * camp with a carpenter on repair duty can't simply out-heal the horde.
 */
export const rageFactor = (w: World) =>
  w.phase === "night" && w.spawnQueue.length === 0
    ? clamp(1 + (w.nightT - 45) / 25, 1, 4)
    : 1;

function push<T>(arr: T[], item: T, cap: number) {
  if (arr.length >= cap) arr.shift();
  arr.push(item);
}

function burst(
  w: World,
  x: number,
  y: number,
  n: number,
  color: string,
  speed = 120,
  gravity = 0,
  size = 3,
) {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, Math.PI * 2);
    const s = rnd(speed * 0.3, speed);
    push(
      w.particles,
      {
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: rnd(0.3, 0.7),
        maxLife: 0.7,
        size: rnd(size * 0.6, size),
        color,
        gravity,
      },
      260,
    );
  }
}

function say(w: World, x: number, y: number, text: string, color: string, size = 18) {
  push(w.texts, { x, y, vy: -42, life: 1.1, text, color, size }, 40);
}

// ─────────────────────────────── Creation ──────────────────────────────────

function makeTrees(): Tree[] {
  const trees: Tree[] = [];
  let guard = 0;
  while (trees.length < 52 && guard++ < 4000) {
    const x = rnd(70, WORLD_W - 70);
    const y = rnd(90, FENCE_Y - 110);
    // Keep a breathing corridor right behind the fence so zombies aren't
    // permanently stuck on trunks, and keep trees off each other.
    if (y > FENCE_Y - 150) continue;
    if (trees.some((t) => dist2(t.x, t.y, x, y) < 110 * 110)) continue;
    trees.push({ x, y, chops: 4, maxChops: 4, regrow: 0, scale: rnd(0.82, 1.25), shake: 0 });
  }
  return trees;
}

export function createWorld(): World {
  const w: World = {
    t: 0,
    phase: "intro",
    wave: 1,
    dayLeft: DAY_TIME,
    nightT: 0,
    raged: false,
    nightBanner: 0,
    player: {
      x: WORLD_W / 2,
      y: FENCE_Y + 160,
      vx: 0,
      vy: 0,
      hp: 100,
      maxHp: 100,
      face: -Math.PI / 2,
      swing: 0,
      swingCd: 0,
      dashT: 0,
      dashCd: 0,
      dashX: 0,
      dashY: -1,
      iframe: 0,
      hurt: 0,
      buildCd: 0,
      cookCd: 0,
      walk: 0,
    },
    trees: makeTrees(),
    fence: [],
    zombies: [],
    recruits: [],
    arrows: [],
    drops: [],
    visitors: [],
    cook: Array.from({ length: 5 }, () => ({ state: "empty", t: 0 }) as CookSlot),
    particles: [],
    texts: [],
    splats: [],
    wood: 6,
    rawMeat: 0,
    cookedMeat: 0,
    coins: 0,
    up: { axe: 0, boots: 0, fence: 0, fire: 0, vigor: 0 },
    hired: { garde: 0, archer: 0, charpentier: 0 },
    spawnQueue: [],
    visitorCd: 3,
    shake: 0,
    nextId: 1,
    kills: 0,
    fed: 0,
    woodCut: 0,
    events: [],
    hint: "",
  };

  // The palisade starts with a hole in the middle — first lesson of the game:
  // chop wood, plug the gap before dark.
  for (let i = 0; i < SEG_COUNT; i++) {
    const gap = i >= 6 && i <= 10;
    w.fence.push({ x: segX(i), hp: gap ? 0 : 100, maxHp: 100, hit: 0 });
  }
  return w;
}

// ─────────────────────────────── Waves ─────────────────────────────────────

const Z_STATS: Record<ZKind, { hp: number; speed: number; dmg: number; r: number; meat: number }> = {
  walker: { hp: 42, speed: 44, dmg: 9, r: 14, meat: 1 },
  runner: { hp: 26, speed: 92, dmg: 6, r: 12, meat: 1 },
  brute: { hp: 170, speed: 33, dmg: 24, r: 22, meat: 3 },
};

function buildWave(w: World) {
  const n = w.wave;
  const total = Math.min(60, 5 + Math.round(n * 3.6));
  const brutes = n >= 3 ? 1 + Math.floor((n - 3) / 2) : 0;
  const runners = n >= 2 ? Math.round(total * Math.min(0.45, 0.12 * (n - 1))) : 0;
  const walkers = Math.max(2, total - brutes - runners);
  const queue: { kind: ZKind; at: number }[] = [];
  const spread = 4 + total * 0.9;
  const add = (kind: ZKind, count: number, from: number) => {
    for (let i = 0; i < count; i++) queue.push({ kind, at: rnd(from, spread) });
  };
  add("walker", walkers, 0);
  add("runner", runners, 3);
  add("brute", brutes, 8);
  queue.sort((a, b) => a.at - b.at);
  w.spawnQueue = queue;
}

function spawnZombie(w: World, kind: ZKind) {
  const s = Z_STATS[kind];
  const scale = 1 + (w.wave - 1) * 0.16;
  const hp = Math.round(s.hp * scale);
  w.zombies.push({
    id: w.nextId++,
    kind,
    x: rnd(80, WORLD_W - 80),
    y: rnd(-60, -10),
    hp,
    maxHp: hp,
    r: s.r,
    speed: s.speed * (1 + (w.wave - 1) * 0.035) * rnd(0.92, 1.08),
    dmg: Math.round(s.dmg * (1 + (w.wave - 1) * 0.08)),
    meat: s.meat,
    atkCd: 0,
    hurt: 0,
    think: rnd(0, 0.4),
    target: { k: "fence", i: 0 },
    wob: rnd(0, 6.28),
    face: Math.PI / 2,
  });
}

export function startNight(w: World) {
  if (w.phase !== "day") return;
  // Reward the impatient: leaving day time on the table pays out.
  const bonus = Math.round(w.dayLeft * 0.6);
  if (bonus > 0) {
    w.coins += bonus;
    say(w, w.player.x, w.player.y - 40, `+${bonus} 🪙 aube pressée`, "#FFC542", 20);
  }
  w.phase = "night";
  w.dayLeft = 0;
  w.nightT = 0;
  w.raged = false;
  w.nightBanner = 2.2;
  w.visitors.forEach((v) => (v.state = "leaving"));
  buildWave(w);
  w.events.push("wave");
}

function endNight(w: World) {
  w.phase = "day";
  w.wave += 1;
  w.dayLeft = DAY_TIME;
  w.nightBanner = 2.2;
  const bonus = 12 + w.wave * 5;
  w.coins += bonus;
  say(w, w.player.x, w.player.y - 50, `Nuit ${w.wave - 1} survécue  +${bonus} 🪙`, "#7DD3A0", 22);
  // Survivors patch themselves up at dawn — but the fence never repairs itself.
  w.recruits.forEach((r) => (r.hp = Math.min(r.maxHp, r.hp + r.maxHp * 0.45)));
  w.player.hp = Math.min(w.player.maxHp, w.player.hp + Math.max(20, w.player.maxHp * 0.3));
  w.events.push("wave");
}

// ─────────────────────────────── The step ──────────────────────────────────

export function step(w: World, dtRaw: number, input: Input) {
  // Never let a background tab or a slow frame teleport zombies through walls.
  const dt = Math.min(dtRaw, 1 / 20);
  if (w.phase === "gameover" || w.phase === "intro") {
    decayFx(w, dt);
    return;
  }
  w.t += dt;

  stepPlayer(w, dt, input);
  stepTrees(w, dt);
  stepFence(w, dt);
  stepZombies(w, dt);
  stepRecruits(w, dt);
  stepArrows(w, dt);
  stepDrops(w, dt);
  stepCooking(w, dt);
  stepVisitors(w, dt);
  decayFx(w, dt);
  stepPhase(w, dt);
  updateHint(w);
}

function decayFx(w: World, dt: number) {
  for (let i = w.particles.length - 1; i >= 0; i--) {
    const p = w.particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      w.particles.splice(i, 1);
      continue;
    }
    p.vy += p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 1 - 2.2 * dt;
  }
  for (let i = w.texts.length - 1; i >= 0; i--) {
    const f = w.texts[i];
    f.life -= dt;
    f.y += f.vy * dt;
    f.vy *= 1 - 1.6 * dt;
    if (f.life <= 0) w.texts.splice(i, 1);
  }
  w.shake = Math.max(0, w.shake - dt * 4);
  w.nightBanner = Math.max(0, w.nightBanner - dt);
}

function stepPhase(w: World, dt: number) {
  if (w.phase === "day") {
    w.dayLeft -= dt;
    if (w.dayLeft <= 0) {
      w.dayLeft = 0;
      startNight(w);
    }
    return;
  }
  // Night: drain the spawn queue, end when the forest is empty again.
  w.nightT += dt;
  if (!w.raged && rageFactor(w) > 1.15 && w.zombies.length) {
    w.raged = true;
    w.shake = Math.max(w.shake, 0.6);
    say(w, w.player.x, w.player.y - 60, "la horde s'enrage !", "#E4756A", 22);
    w.events.push("wave");
  }
  for (let i = w.spawnQueue.length - 1; i >= 0; i--) {
    w.spawnQueue[i].at -= dt;
    if (w.spawnQueue[i].at <= 0) {
      spawnZombie(w, w.spawnQueue[i].kind);
      w.spawnQueue.splice(i, 1);
    }
  }
  if (!w.spawnQueue.length && !w.zombies.length) endNight(w);
}

function updateHint(w: World) {
  const p = w.player;
  if (w.phase === "night") {
    w.hint = w.zombies.length > 0 ? "" : "Nuit — ils arrivent";
    return;
  }
  if (w.wood < 4 && w.fence.some((f) => f.hp < f.maxHp * 0.5)) {
    w.hint = "Coupe du bois : la palissade est trouée";
  } else if (w.rawMeat > 0 && dist2(p.x, p.y, FIRE.x, FIRE.y) > 180 * 180) {
    w.hint = "Fais cuire la viande au feu";
  } else if (w.cookedMeat > 0 && w.visitors.some((v) => v.state === "waiting")) {
    w.hint = "Nourris les rescapés — ils paient";
  } else {
    w.hint = "";
  }
}

// ─────────────────────────────── Player ────────────────────────────────────

function stepPlayer(w: World, dt: number, input: Input) {
  const p = w.player;
  p.iframe = Math.max(0, p.iframe - dt);
  p.hurt = Math.max(0, p.hurt - dt);
  p.swingCd = Math.max(0, p.swingCd - dt);
  p.dashCd = Math.max(0, p.dashCd - dt);
  p.buildCd = Math.max(0, p.buildCd - dt);
  p.cookCd = Math.max(0, p.cookCd - dt);
  if (p.swing > 0) p.swing = Math.max(0, p.swing - dt * 3.6);

  let mx = input.mx;
  let my = input.my;
  const mag = Math.hypot(mx, my);
  if (mag > 1) {
    mx /= mag;
    my /= mag;
  }

  if (input.dash && p.dashCd <= 0) {
    p.dashT = 0.16;
    p.dashCd = 1.5;
    const d = mag > 0.15 ? Math.hypot(mx, my) : 1;
    p.dashX = mag > 0.15 ? mx / d : Math.cos(p.face);
    p.dashY = mag > 0.15 ? my / d : Math.sin(p.face);
    p.iframe = Math.max(p.iframe, 0.28);
    burst(w, p.x, p.y, 10, "#FFFFFF", 150, 0, 3);
  }

  if (p.dashT > 0) {
    p.dashT -= dt;
    p.x += p.dashX * 620 * dt;
    p.y += p.dashY * 620 * dt;
  } else if (mag > 0.12) {
    const sp = playerSpeed(w);
    p.x += mx * sp * dt;
    p.y += my * sp * dt;
    p.face = Math.atan2(my, mx);
    p.walk += dt * (6 + mag * 6);
    if (Math.random() < dt * 8) {
      push(
        w.particles,
        {
          x: p.x + rnd(-6, 6),
          y: p.y + 12,
          vx: rnd(-14, 14),
          vy: rnd(-18, -4),
          life: 0.4,
          maxLife: 0.4,
          size: 2.4,
          color: "#FFFFFF",
          gravity: 60,
        },
        260,
      );
    }
  }

  p.x = clamp(p.x, 24, WORLD_W - 24);
  p.y = clamp(p.y, 24, WORLD_H - 24);
  collideTrees(w, p, 15);

  autoAttack(w);
  autoBuild(w);
  pickupDrops(w);
  feedVisitors(w);

  if (p.hp <= 0 && w.phase !== "gameover") {
    p.hp = 0;
    w.phase = "gameover";
    w.shake = 1.2;
    burst(w, p.x, p.y, 30, "#C4453B", 220, 260, 5);
    w.events.push("over");
  }
}

function collideTrees(w: World, e: { x: number; y: number }, r: number) {
  for (const t of w.trees) {
    if (t.regrow > 0) continue;
    const rr = 14 * t.scale + r;
    const d2 = dist2(t.x, t.y + 6, e.x, e.y);
    if (d2 < rr * rr && d2 > 0.01) {
      const d = Math.sqrt(d2);
      const nx = (e.x - t.x) / d;
      const ny = (e.y - t.y - 6) / d;
      e.x = t.x + nx * rr;
      e.y = t.y + 6 + ny * rr;
    }
  }
}

/**
 * One button-free attack: the axe swings at whatever matters most in front of
 * you — a zombie if there is one, otherwise a trunk. Same swing, same timing;
 * the ads never had an attack button either.
 */
function autoAttack(w: World) {
  const p = w.player;
  if (p.swingCd > 0 || p.dashT > 0) return;
  const reach = 56;
  const arc = 1.5;

  let best: Zombie | null = null;
  let bestD = Infinity;
  for (const z of w.zombies) {
    const d2 = dist2(p.x, p.y, z.x, z.y);
    if (d2 > (reach + z.r) * (reach + z.r)) continue;
    const a = Math.atan2(z.y - p.y, z.x - p.x);
    if (Math.abs(angDiff(a, p.face)) > arc) continue;
    if (d2 < bestD) {
      bestD = d2;
      best = z;
    }
  }

  if (best) {
    p.swing = 1;
    p.swingCd = 0.42;
    p.face = Math.atan2(best.y - p.y, best.x - p.x);
    const dmg = axeDamage(w);
    // The swing is an arc, not a poke: everything in the cone takes the hit.
    // Snapshot first — hurtZombie can splice the list mid-swing.
    const inArc = w.zombies.filter((z) => {
      const d2 = dist2(p.x, p.y, z.x, z.y);
      if (d2 > (reach + z.r) * (reach + z.r)) return false;
      return Math.abs(angDiff(Math.atan2(z.y - p.y, z.x - p.x), p.face)) <= arc;
    });
    for (const z of inArc) hurtZombie(w, z, dmg, p.x, p.y);
    w.events.push("hit");
    return;
  }

  let tree: Tree | null = null;
  let tD = Infinity;
  for (const t of w.trees) {
    if (t.regrow > 0) continue;
    const d2 = dist2(p.x, p.y, t.x, t.y + 6);
    if (d2 > 58 * 58) continue;
    const a = Math.atan2(t.y + 6 - p.y, t.x - p.x);
    if (Math.abs(angDiff(a, p.face)) > 1.9) continue;
    if (d2 < tD) {
      tD = d2;
      tree = t;
    }
  }
  if (tree) {
    p.swing = 1;
    p.swingCd = 0.4;
    p.face = Math.atan2(tree.y + 6 - p.y, tree.x - p.x);
    tree.chops -= 1;
    tree.shake = 0.35;
    w.wood += 1;
    w.woodCut += 1;
    burst(w, tree.x, tree.y - 10, 8, "#A9713F", 130, 300, 3);
    if (tree.chops <= 0) {
      tree.regrow = 24;
      tree.chops = tree.maxChops;
      w.wood += 3;
      say(w, tree.x, tree.y - 30, "+4 🪵", "#D08A4E", 20);
      burst(w, tree.x, tree.y - 30, 22, "#EAF3FF", 190, 220, 4);
      w.events.push("fell");
    } else {
      w.events.push("chop");
    }
  }
}

function angDiff(a: number, b: number) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Standing next to a damaged segment with wood in hand rebuilds it, plank by plank. */
function autoBuild(w: World) {
  const p = w.player;
  if (p.buildCd > 0 || w.wood <= 0) return;
  if (Math.abs(p.y - FENCE_Y) > 60) return;
  const i = segIndexAt(p.x);
  const seg = w.fence[i];
  const max = fenceMax(w);
  seg.maxHp = max;
  if (seg.hp >= max) return;
  if (Math.abs(p.x - segCenter(i)) > SEG_W * 0.75) return;
  w.wood -= 1;
  seg.hp = Math.min(max, seg.hp + 20);
  p.buildCd = 0.28;
  burst(w, segCenter(i), FENCE_Y, 6, "#C98A4B", 90, 240, 3);
  w.events.push("build");
}

function pickupDrops(w: World) {
  const p = w.player;
  for (let i = w.drops.length - 1; i >= 0; i--) {
    const d = w.drops[i];
    if (dist2(p.x, p.y, d.x, d.y) < 34 * 34) {
      w.drops.splice(i, 1);
      w.rawMeat += 1;
      say(w, d.x, d.y - 14, "+1 🥩", "#E4756A", 16);
      w.events.push("coin");
    }
  }
}

function feedVisitors(w: World) {
  const p = w.player;
  if (w.cookedMeat <= 0) return;
  for (const v of w.visitors) {
    if (v.state !== "waiting") continue;
    if (dist2(p.x, p.y, v.x, v.y) > 48 * 48) continue;
    w.cookedMeat -= 1;
    w.coins += v.pay;
    w.fed += 1;
    v.state = "leaving";
    say(w, v.x, v.y - 40, `+${v.pay} 🪙`, "#FFC542", 20);
    burst(w, v.x, v.y - 10, 14, "#FFC542", 150, 200, 3);
    w.events.push("coin");
    if (v.joins) {
      hire(w, "garde", v.x, v.y);
      say(w, v.x, v.y - 66, "rejoint le camp !", "#7DD3A0", 18);
      w.events.push("join");
    }
    return;
  }
}

// ─────────────────────────────── Trees ─────────────────────────────────────

function stepTrees(w: World, dt: number) {
  for (const t of w.trees) {
    if (t.regrow > 0) t.regrow = Math.max(0, t.regrow - dt);
    if (t.shake > 0) t.shake = Math.max(0, t.shake - dt);
  }
}

// ─────────────────────────────── Fence ─────────────────────────────────────

function stepFence(w: World, dt: number) {
  const max = fenceMax(w);
  for (const s of w.fence) {
    s.maxHp = max;
    if (s.hp > max) s.hp = max;
    if (s.hit > 0) s.hit = Math.max(0, s.hit - dt);
  }
}

export const fenceHoles = (w: World) => w.fence.filter((s) => s.hp <= 0).length;

// ─────────────────────────────── Zombies ───────────────────────────────────

function hurtZombie(w: World, z: Zombie, dmg: number, fromX: number, fromY: number) {
  z.hp -= dmg;
  z.hurt = 0.18;
  const a = Math.atan2(z.y - fromY, z.x - fromX);
  z.x += Math.cos(a) * 6;
  z.y += Math.sin(a) * 6;
  burst(w, z.x, z.y - 6, 6, "#8E2F2A", 130, 220, 3);
  say(w, z.x + rnd(-6, 6), z.y - 26, `${Math.round(dmg)}`, "#FFD9D4", 15);
  if (z.hp <= 0) killZombie(w, z);
}

function killZombie(w: World, z: Zombie) {
  const i = w.zombies.indexOf(z);
  if (i < 0) return;
  w.zombies.splice(i, 1);
  w.kills += 1;
  burst(w, z.x, z.y - 6, 16, "#8E2F2A", 190, 260, 4);
  push(w.splats, { x: z.x, y: z.y + 4, r: rnd(12, 22), a: rnd(0.15, 0.3) }, 90);
  for (let m = 0; m < z.meat; m++) {
    w.drops.push({
      id: w.nextId++,
      x: z.x + rnd(-14, 14),
      y: z.y + rnd(-10, 10),
      bob: rnd(0, 6.28),
      life: 60,
    });
  }
  w.events.push("kill");
}

function nearestGap(w: World, x: number): number | null {
  let best: number | null = null;
  let bd = Infinity;
  for (let i = 0; i < w.fence.length; i++) {
    if (w.fence[i].hp > 0) continue;
    const d = Math.abs(segCenter(i) - x);
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  return best !== null && bd < 340 ? best : null;
}

function stepZombies(w: World, dt: number) {
  const p = w.player;
  for (let i = w.zombies.length - 1; i >= 0; i--) {
    const z = w.zombies[i];
    z.hurt = Math.max(0, z.hurt - dt);
    z.atkCd = Math.max(0, z.atkCd - dt);
    z.think -= dt;
    z.wob += dt * (2 + z.speed * 0.03);

    if (z.think <= 0) {
      z.think = rnd(0.3, 0.6);
      z.target = chooseTarget(w, z);
    }

    let tx = p.x;
    let ty = p.y;
    let reach = 0;
    let attackable: "player" | "fence" | "recruit" | null = null;
    let fenceIdx = -1;
    let recruit: Recruit | undefined;

    switch (z.target.k) {
      case "player":
        tx = p.x;
        ty = p.y;
        reach = z.r + 16;
        attackable = "player";
        break;
      case "recruit": {
        recruit = w.recruits.find((r) => r.id === (z.target as { id: number }).id);
        if (!recruit) {
          z.target = { k: "player" };
          continue;
        }
        tx = recruit.x;
        ty = recruit.y;
        reach = z.r + 15;
        attackable = "recruit";
        break;
      }
      case "gap":
        tx = z.target.x;
        ty = FENCE_Y + 40;
        break;
      case "fence": {
        fenceIdx = z.target.i;
        tx = segCenter(fenceIdx);
        ty = FENCE_Y - z.r - 6;
        reach = z.r + 20;
        attackable = "fence";
        break;
      }
    }

    const dx = tx - z.x;
    const dy = ty - z.y;
    const d = Math.hypot(dx, dy) || 1;
    z.face = Math.atan2(dy, dx);
    const inReach = attackable !== null && d <= reach;

    if (!inReach) {
      // A drunken sway so a horde never marches in a perfect line.
      const sway = Math.sin(z.wob) * 0.28;
      const ux = dx / d;
      const uy = dy / d;
      const sp = z.speed * (1 + (rageFactor(w) - 1) * 0.3);
      z.x += (ux + -uy * sway) * sp * dt;
      z.y += (uy + ux * sway) * sp * dt;
      // The palisade is solid: only a hole lets them cross.
      if (z.y > FENCE_Y - z.r - 6 && z.y < FENCE_Y + z.r + 6) {
        const si = segIndexAt(z.x);
        if (w.fence[si].hp > 0 && dy > 0) z.y = FENCE_Y - z.r - 6;
      }
      collideTrees(w, z, z.r);
      z.x = clamp(z.x, 16, WORLD_W - 16);
    } else if (z.atkCd <= 0) {
      z.atkCd = z.kind === "brute" ? 1.4 : 1;
      if (attackable === "fence" && fenceIdx >= 0) {
        const seg = w.fence[fenceIdx];
        if (seg.hp <= 0) {
          // Someone else already broke it — go find the hole instead.
          z.think = 0;
          continue;
        }
        seg.hp = Math.max(0, seg.hp - z.dmg * 1.4 * rageFactor(w));
        seg.hit = 0.25;
        burst(w, segCenter(fenceIdx), FENCE_Y, 8, "#C98A4B", 120, 260, 3);
        if (seg.hp <= 0) {
          say(w, segCenter(fenceIdx), FENCE_Y - 20, "brèche !", "#E4756A", 20);
          w.shake = Math.max(w.shake, 0.5);
        }
      } else if (attackable === "player") {
        damagePlayer(w, z.dmg);
      } else if (attackable === "recruit" && recruit) {
        recruit.hp -= z.dmg;
        recruit.hurt = 0.2;
        burst(w, recruit.x, recruit.y - 6, 6, "#C4453B", 120, 200, 3);
        if (recruit.hp <= 0) {
          say(w, recruit.x, recruit.y - 40, "tombé", "#E4756A", 17);
          w.recruits = w.recruits.filter((r) => r !== recruit);
        }
      }
    }

    // Zombie-on-zombie shoving, so brutes don't hide inside walkers.
    for (let j = i - 1; j >= 0; j--) {
      const o = w.zombies[j];
      const rr = z.r + o.r;
      const dd2 = dist2(z.x, z.y, o.x, o.y);
      if (dd2 < rr * rr && dd2 > 0.01) {
        const dd = Math.sqrt(dd2);
        const push2 = (rr - dd) / 2;
        const nx = (z.x - o.x) / dd;
        const ny = (z.y - o.y) / dd;
        z.x += nx * push2;
        z.y += ny * push2;
        o.x -= nx * push2;
        o.y -= ny * push2;
      }
    }
  }
}

function chooseTarget(w: World, z: Zombie): ZTarget {
  const p = w.player;
  // Chasing someone standing on the other side of an intact palisade is how a
  // horde ends up hugging the wall forever. If they can't reach you, they take
  // it out on the planks instead.
  const split = z.y < FENCE_Y !== p.y < FENCE_Y && w.fence[segIndexAt(z.x)].hp > 0;
  const pd2 = dist2(z.x, z.y, p.x, p.y);
  if (!split && pd2 < 230 * 230) return { k: "player" };

  if (z.y > FENCE_Y) {
    // Inside the camp: eat whoever is closest.
    let best: Recruit | null = null;
    let bd = 320 * 320;
    for (const r of w.recruits) {
      const d2 = dist2(z.x, z.y, r.x, r.y);
      if (d2 < bd) {
        bd = d2;
        best = r;
      }
    }
    return best ? { k: "recruit", id: best.id } : { k: "player" };
  }

  const gap = nearestGap(w, z.x);
  if (gap !== null) return { k: "gap", x: segCenter(gap) };
  return { k: "fence", i: segIndexAt(z.x) };
}

function damagePlayer(w: World, dmg: number) {
  const p = w.player;
  if (p.iframe > 0) return;
  p.hp -= dmg;
  p.iframe = 0.55;
  p.hurt = 0.35;
  w.shake = Math.max(w.shake, 0.45);
  burst(w, p.x, p.y - 6, 10, "#C4453B", 150, 200, 3);
  w.events.push("hurt");
}

// ─────────────────────────────── Recruits ──────────────────────────────────

const R_STATS: Record<RKind, { hp: number; speed: number; dmg: number; range: number; cd: number }> = {
  garde: { hp: 70, speed: 96, dmg: 15, range: 34, cd: 0.85 },
  archer: { hp: 44, speed: 88, dmg: 17, range: 250, cd: 1.35 },
  charpentier: { hp: 55, speed: 104, dmg: 0, range: 0, cd: 0 },
};

export function hire(w: World, kind: RKind, x?: number, y?: number) {
  const s = R_STATS[kind];
  const n = w.recruits.filter((r) => r.kind === kind).length;
  const homeX = clamp(
    kind === "archer" ? 200 + n * 130 : 180 + n * 110,
    80,
    WORLD_W - 80,
  );
  const homeY = kind === "archer" ? FENCE_Y + 130 : FENCE_Y + 60;
  w.recruits.push({
    id: w.nextId++,
    kind,
    x: x ?? homeX,
    y: y ?? homeY + 40,
    homeX,
    homeY,
    hp: s.hp,
    maxHp: s.hp,
    cd: 0,
    hurt: 0,
    face: -Math.PI / 2,
    walk: 0,
    job: -1,
  });
  w.hired[kind] += 1;
}

function stepRecruits(w: World, dt: number) {
  for (const r of w.recruits) {
    r.hurt = Math.max(0, r.hurt - dt);
    r.cd = Math.max(0, r.cd - dt);
    const s = R_STATS[r.kind];

    if (r.kind === "charpentier") {
      // Patches whatever segment is worst off, using the camp's wood.
      let worst = -1;
      let worstHp = Infinity;
      for (let i = 0; i < w.fence.length; i++) {
        const f = w.fence[i];
        if (f.hp >= f.maxHp) continue;
        if (f.hp < worstHp) {
          worstHp = f.hp;
          worst = i;
        }
      }
      r.job = worst;
      const tx = worst >= 0 ? segCenter(worst) : r.homeX;
      const ty = worst >= 0 ? FENCE_Y + 34 : r.homeY;
      moveTo(r, tx, ty, s.speed, dt);
      keepBehindWall(w, r);
      // No one nails planks with claws in their back.
      const underAttack =
        worst >= 0 && w.zombies.some((z) => dist2(z.x, z.y, tx, FENCE_Y) < 190 * 190);
      if (worst >= 0 && !underAttack && Math.abs(r.x - tx) < 26 && w.wood > 0 && r.cd <= 0) {
        r.cd = 0.5;
        w.wood -= 1;
        w.fence[worst].hp = Math.min(w.fence[worst].maxHp, w.fence[worst].hp + 15);
        burst(w, tx, FENCE_Y, 4, "#C98A4B", 80, 220, 2.4);
      }
      continue;
    }

    let best: Zombie | null = null;
    let bd = Infinity;
    const leash = r.kind === "archer" ? s.range : 300;
    for (const z of w.zombies) {
      const d2 = dist2(r.x, r.y, z.x, z.y);
      if (d2 > leash * leash) continue;
      if (d2 < bd) {
        bd = d2;
        best = z;
      }
    }

    if (!best) {
      moveTo(r, r.homeX, r.homeY, s.speed * 0.8, dt);
      keepBehindWall(w, r);
      continue;
    }

    r.face = Math.atan2(best.y - r.y, best.x - r.x);
    if (r.kind === "archer") {
      if (r.cd <= 0) {
        r.cd = s.cd;
        const a = r.face;
        w.arrows.push({
          x: r.x,
          y: r.y - 8,
          vx: Math.cos(a) * 520,
          vy: Math.sin(a) * 520,
          life: 1.2,
          dmg: s.dmg,
        });
        w.events.push("arrow");
      }
      // Archers keep their distance rather than trade blows.
      if (bd < 120 * 120) moveTo(r, r.x - Math.cos(r.face) * 60, r.y - Math.sin(r.face) * 60, s.speed, dt);
      else moveTo(r, r.homeX, r.homeY, s.speed * 0.6, dt);
    } else {
      const d = Math.sqrt(bd);
      if (d > s.range) {
        moveTo(r, best.x, best.y, s.speed, dt);
      } else if (r.cd <= 0) {
        r.cd = s.cd;
        hurtZombie(w, best, s.dmg, r.x, r.y);
      }
    }
    keepBehindWall(w, r);
  }
}

interface Mover {
  x: number;
  y: number;
  face: number;
  walk: number;
}

/**
 * Recruits defend, they don't raid. They stay on the camp side of the
 * palisade — except through a breach, which they will plug with their bodies.
 * Without this the hired army simply walks north and farms the horde for you.
 */
function keepBehindWall(w: World, r: Recruit) {
  const i = segIndexAt(r.x);
  const limit = w.fence[i].hp <= 0 ? FENCE_Y - 12 : FENCE_Y + 14;
  if (r.y < limit) r.y = limit;
}

function moveTo(r: Mover, tx: number, ty: number, speed: number, dt: number) {
  const dx = tx - r.x;
  const dy = ty - r.y;
  const d = Math.hypot(dx, dy);
  if (d < 4) return;
  r.x += (dx / d) * speed * dt;
  r.y += (dy / d) * speed * dt;
  r.face = Math.atan2(dy, dx);
  r.walk += dt * 8;
}

function stepArrows(w: World, dt: number) {
  for (let i = w.arrows.length - 1; i >= 0; i--) {
    const a = w.arrows[i];
    a.life -= dt;
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    if (a.life <= 0) {
      w.arrows.splice(i, 1);
      continue;
    }
    for (const z of w.zombies) {
      if (dist2(a.x, a.y, z.x, z.y) < (z.r + 6) * (z.r + 6)) {
        hurtZombie(w, z, a.dmg, a.x - a.vx * 0.01, a.y - a.vy * 0.01);
        w.arrows.splice(i, 1);
        break;
      }
    }
  }
}

function stepDrops(w: World, dt: number) {
  for (let i = w.drops.length - 1; i >= 0; i--) {
    const d = w.drops[i];
    d.bob += dt * 4;
    d.life -= dt;
    if (d.life <= 0) w.drops.splice(i, 1);
  }
}

// ─────────────────────────────── Cooking ───────────────────────────────────

function stepCooking(w: World, dt: number) {
  const p = w.player;
  const near = dist2(p.x, p.y, FIRE.x, FIRE.y) < FIRE_RANGE * FIRE_RANGE;
  const slots = cookSlots(w);
  const ct = cookTime(w);

  for (let i = 0; i < w.cook.length; i++) {
    const s = w.cook[i];
    if (i >= slots && s.state === "empty") continue;
    if (s.state === "cooking") {
      s.t += dt;
      if (s.t >= ct) {
        s.state = "ready";
        s.t = 0;
        w.events.push("cook");
      }
      if (Math.random() < dt * 3) {
        push(
          w.particles,
          {
            x: FIRE.x + rnd(-26, 26),
            y: FIRE.y - 10,
            vx: rnd(-8, 8),
            vy: rnd(-40, -20),
            life: 0.8,
            maxLife: 0.8,
            size: 3,
            color: "rgba(255,255,255,0.5)",
            gravity: -10,
          },
          260,
        );
      }
    } else if (s.state === "ready") {
      s.t += dt;
      // Walk away too long and dinner is charcoal — unless the grill is upgraded.
      if (!noBurn(w) && s.t > COOK_BURN) {
        s.state = "empty";
        s.t = 0;
        say(w, FIRE.x + rnd(-20, 20), FIRE.y - 40, "brûlé !", "#8A6A50", 17);
        burst(w, FIRE.x, FIRE.y - 16, 10, "#4A4038", 90, -20, 3);
      }
    }
  }

  if (!near) return;
  if (p.cookCd > 0) {
    p.cookCd -= dt;
    return;
  }

  // Collect anything ready first, then load the grill.
  for (let i = 0; i < slots; i++) {
    if (w.cook[i].state === "ready") {
      w.cook[i] = { state: "empty", t: 0 };
      w.cookedMeat += 1;
      p.cookCd = 0.18;
      say(w, FIRE.x, FIRE.y - 34, "+1 🍖", "#F0A868", 18);
      return;
    }
  }
  if (w.rawMeat > 0) {
    for (let i = 0; i < slots; i++) {
      if (w.cook[i].state === "empty") {
        w.rawMeat -= 1;
        w.cook[i] = { state: "cooking", t: 0 };
        p.cookCd = 0.25;
        return;
      }
    }
  }
}

// ─────────────────────────────── Visitors ──────────────────────────────────

function stepVisitors(w: World, dt: number) {
  if (w.phase === "day") {
    w.visitorCd -= dt;
    const waiting = w.visitors.filter((v) => v.state !== "leaving").length;
    if (w.visitorCd <= 0 && waiting < 4) {
      w.visitorCd = rnd(5, 8);
      spawnVisitor(w);
    }
  }

  for (let i = w.visitors.length - 1; i >= 0; i--) {
    const v = w.visitors[i];
    v.walk += dt * 7;
    if (v.state === "coming") {
      moveTo(v, v.tx, v.ty, 78, dt);
      if (Math.hypot(v.tx - v.x, v.ty - v.y) < 8) v.state = "waiting";
    } else if (v.state === "waiting") {
      v.patience -= dt;
      if (v.patience <= 0) {
        v.state = "leaving";
        say(w, v.x, v.y - 40, "il repart affamé…", "#8A6A50", 16);
      }
    } else {
      moveTo(v, v.x, WORLD_H + 60, 92, dt);
      if (v.y > WORLD_H + 40) w.visitors.splice(i, 1);
    }
  }
}

function spawnVisitor(w: World) {
  const pay = Math.round(rnd(9, 15) + w.wave * 2.5);
  w.visitors.push({
    id: w.nextId++,
    x: rnd(250, WORLD_W - 250),
    y: WORLD_H + 30,
    tx: rnd(420, WORLD_W - 160),
    ty: rnd(FENCE_Y + 260, WORLD_H - 120),
    patience: 26,
    maxPatience: 26,
    pay,
    joins: Math.random() < 0.18,
    state: "coming",
    hue: Math.floor(rnd(0, 360)),
    walk: 0,
    face: Math.PI / 2,
  });
}

// ─────────────────────────────── Shop ──────────────────────────────────────

export interface ShopItem {
  id: string;
  icon: string;
  label: string;
  desc: (w: World) => string;
  cost: (w: World) => number;
  level?: (w: World) => number;
  max?: number;
  apply: (w: World) => void;
}

export const SHOP: ShopItem[] = [
  {
    id: "axe",
    icon: "🪓",
    label: "Hache affûtée",
    desc: (w) => `Dégâts ${axeDamage(w)} → ${axeDamage(w) + 7}`,
    cost: (w) => 45 + w.up.axe * 35,
    level: (w) => w.up.axe,
    max: 8,
    apply: (w) => {
      w.up.axe += 1;
    },
  },
  {
    id: "boots",
    icon: "🥾",
    label: "Raquettes",
    desc: (w) => `Vitesse ${Math.round(playerSpeed(w))} → ${Math.round(playerSpeed(w)) + 16}`,
    cost: (w) => 40 + w.up.boots * 30,
    level: (w) => w.up.boots,
    max: 6,
    apply: (w) => {
      w.up.boots += 1;
    },
  },
  {
    id: "fence",
    icon: "🧱",
    label: "Palissade renforcée",
    desc: (w) => `Résistance ${fenceMax(w)} → ${fenceMax(w) + 30} par section`,
    cost: (w) => 50 + w.up.fence * 40,
    level: (w) => w.up.fence,
    max: 6,
    apply: (w) => {
      w.up.fence += 1;
    },
  },
  {
    id: "fire",
    icon: "🔥",
    label: "Meilleur foyer",
    desc: (w) =>
      w.up.fire >= 2
        ? "Grill parfait : la viande ne brûle plus"
        : `Cuisson ${cookTime(w).toFixed(1)}s → ${Math.max(2.4, cookTime(w) - 0.8).toFixed(1)}s`,
    cost: (w) => 55 + w.up.fire * 45,
    level: (w) => w.up.fire,
    max: 4,
    apply: (w) => {
      w.up.fire += 1;
    },
  },
  {
    id: "vigor",
    icon: "❤️",
    label: "Vigueur",
    desc: (w) => `PV max ${w.player.maxHp} → ${w.player.maxHp + 25} (et soin complet)`,
    cost: (w) => 60 + w.up.vigor * 45,
    level: (w) => w.up.vigor,
    max: 6,
    apply: (w) => {
      w.up.vigor += 1;
      w.player.maxHp += 25;
      w.player.hp = w.player.maxHp;
    },
  },
  {
    id: "garde",
    icon: "🛡️",
    label: "Recruter un garde",
    desc: () => "Se bat au corps à corps derrière la palissade",
    cost: (w) => 70 + w.hired.garde * 25,
    level: (w) => w.hired.garde,
    apply: (w) => hire(w, "garde"),
  },
  {
    id: "archer",
    icon: "🏹",
    label: "Recruter un archer",
    desc: () => "Tire de loin sur tout ce qui approche",
    cost: (w) => 110 + w.hired.archer * 35,
    level: (w) => w.hired.archer,
    apply: (w) => hire(w, "archer"),
  },
  {
    id: "charpentier",
    icon: "🔨",
    label: "Recruter un charpentier",
    desc: () => "Répare la palissade avec ton stock de bois",
    cost: (w) => 95 + w.hired.charpentier * 45,
    level: (w) => w.hired.charpentier,
    max: 3,
    apply: (w) => hire(w, "charpentier"),
  },
  {
    id: "heal",
    icon: "🩹",
    label: "Panser tout le monde",
    desc: () => "Rend tous les PV à toi et à ton équipe",
    cost: () => 35,
    apply: (w) => {
      w.player.hp = w.player.maxHp;
      w.recruits.forEach((r) => (r.hp = r.maxHp));
    },
  },
  {
    id: "wood",
    icon: "🪵",
    label: "Livraison de bois",
    desc: () => "+25 bois tout de suite",
    cost: () => 40,
    apply: (w) => {
      w.wood += 25;
    },
  },
];

export function buy(w: World, id: string): boolean {
  const item = SHOP.find((s) => s.id === id);
  if (!item) return false;
  if (item.max !== undefined && item.level && item.level(w) >= item.max) return false;
  const cost = item.cost(w);
  if (w.coins < cost) return false;
  w.coins -= cost;
  item.apply(w);
  w.events.push("buy");
  return true;
}
