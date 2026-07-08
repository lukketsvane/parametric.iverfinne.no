import { marchGrid, type Grid } from "./marching-cubes"

/**
 * Parametric candle-stick holders.
 *
 * Every form is one implicit solid: a skeleton of tubes, bulbs and cups is
 * expressed as SDF primitives, replicated by n-fold rotational symmetry,
 * merged with smooth (positive) booleans and carved by smooth (negative)
 * booleans — the candle socket and the open tube mouths. Marching cubes then
 * extracts a single watertight organic surface, like slip-cast ceramic.
 */

export type Family = "whisk" | "spider" | "clover" | "cage" | "molecule" | "bloom"

export const FAMILIES: Family[] = [
  "whisk",
  "spider",
  "clover",
  "cage",
  "molecule",
  "bloom",
]

export type HolderParams = {
  family: Family
  seed: number
  /** n-fold rotational symmetry */
  symmetry: number
  /** overall height */
  height: number
  /** outer radius of the skeleton */
  spread: number
  /** strut radius */
  tube: number
  /** smooth-union radius — how much the joints melt together */
  blend: number
  /** extra size of node bulbs / knobs */
  bulb: number
  /** how far struts bow away from straight lines */
  arch: number
  /** tangential swirl of feet relative to the crown */
  twist: number
  /** candle cup outer radius */
  cup: number
  /** drip-dish size (bloom) */
  dish: number
  /** waviness of the dish rim */
  rimWave: number
  /** 0 = closed tube ends, 1 = fully open bores */
  open: number
}

export const PARAM_RANGES = {
  symmetry: { min: 3, max: 9, step: 1 },
  height: { min: 0.7, max: 2.4, step: 0.01 },
  spread: { min: 0.7, max: 2.0, step: 0.01 },
  tube: { min: 0.06, max: 0.17, step: 0.002 },
  blend: { min: 0.04, max: 0.2, step: 0.005 },
  bulb: { min: 0, max: 1.5, step: 0.02 },
  arch: { min: 0, max: 1, step: 0.02 },
  twist: { min: -1, max: 1, step: 0.02 },
  cup: { min: 0.24, max: 0.48, step: 0.005 },
  dish: { min: 0, max: 1, step: 0.02 },
  rimWave: { min: 0, max: 1, step: 0.02 },
  open: { min: 0, max: 1, step: 0.05 },
} as const

/* ------------------------------------------------------------------ */
/* Seeded parameter generation                                         */
/* ------------------------------------------------------------------ */

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 9000) + 1000
}

type Recipe = Omit<HolderParams, "family" | "seed">

const RECIPES: Record<Family, (rnd: () => number) => Recipe> = {
  whisk: (rnd) => ({
    symmetry: pick(rnd, [3, 3, 4]),
    height: jit(rnd, 2.0, 0.1),
    spread: jit(rnd, 1.05, 0.1),
    tube: jit(rnd, 0.1, 0.08),
    blend: jit(rnd, 0.09, 0.2),
    bulb: jit(rnd, 0.3, 0.5),
    arch: jit(rnd, 0.65, 0.2),
    twist: (rnd() * 2 - 1) * 0.3,
    cup: jit(rnd, 0.3, 0.08),
    dish: 0,
    rimWave: 0,
    open: 0,
  }),
  spider: (rnd) => ({
    symmetry: pick(rnd, [4, 4, 5]),
    height: jit(rnd, 1.3, 0.1),
    spread: jit(rnd, 1.45, 0.08),
    tube: jit(rnd, 0.105, 0.08),
    blend: jit(rnd, 0.09, 0.2),
    bulb: jit(rnd, 0.45, 0.4),
    arch: jit(rnd, 0.55, 0.25),
    twist: (rnd() * 2 - 1) * 0.2,
    cup: jit(rnd, 0.35, 0.08),
    dish: 0,
    rimWave: 0,
    open: 1,
  }),
  clover: (rnd) => ({
    symmetry: pick(rnd, [3, 4, 4]),
    height: jit(rnd, 1.0, 0.1),
    spread: jit(rnd, 1.45, 0.08),
    tube: jit(rnd, 0.15, 0.06),
    blend: jit(rnd, 0.11, 0.15),
    bulb: jit(rnd, 0.7, 0.3),
    arch: jit(rnd, 0.6, 0.2),
    twist: (rnd() * 2 - 1) * 0.15,
    cup: jit(rnd, 0.33, 0.08),
    dish: 0,
    rimWave: 0,
    open: 0,
  }),
  cage: (rnd) => ({
    symmetry: pick(rnd, [7, 8, 8, 9]),
    height: jit(rnd, 1.35, 0.08),
    spread: jit(rnd, 1.15, 0.08),
    tube: jit(rnd, 0.085, 0.08),
    blend: jit(rnd, 0.08, 0.2),
    bulb: jit(rnd, 0.5, 0.3),
    arch: jit(rnd, 0.35, 0.3),
    twist: 0,
    cup: jit(rnd, 0.33, 0.08),
    dish: 0,
    rimWave: 0,
    open: jit(rnd, 0.85, 0.15),
  }),
  molecule: (rnd) => ({
    symmetry: pick(rnd, [4, 5, 5, 6]),
    height: jit(rnd, 1.1, 0.1),
    spread: jit(rnd, 1.55, 0.08),
    tube: jit(rnd, 0.095, 0.08),
    blend: jit(rnd, 0.1, 0.15),
    bulb: jit(rnd, 0.8, 0.25),
    arch: jit(rnd, 0.4, 0.3),
    twist: (rnd() * 2 - 1) * 0.3,
    cup: jit(rnd, 0.34, 0.08),
    dish: 0,
    rimWave: 0,
    open: 0,
  }),
  bloom: (rnd) => ({
    symmetry: pick(rnd, [3, 3, 4]),
    height: jit(rnd, 1.7, 0.1),
    spread: jit(rnd, 1.25, 0.08),
    tube: jit(rnd, 0.1, 0.08),
    blend: jit(rnd, 0.09, 0.15),
    bulb: jit(rnd, 0.35, 0.4),
    arch: jit(rnd, 0.7, 0.2),
    twist: (rnd() * 2 - 1) * 0.2,
    cup: jit(rnd, 0.3, 0.08),
    dish: jit(rnd, 0.5, 0.3),
    rimWave: jit(rnd, 0.55, 0.4),
    open: 1,
  }),
}

function jit(rnd: () => number, v: number, amt: number) {
  return v * (1 + (rnd() * 2 - 1) * amt)
}
function pick(rnd: () => number, arr: number[]) {
  return arr[Math.floor(rnd() * arr.length)]
}

/** Family recipe + seeded jitter → a full parameter set. */
export function genParams(seed: number, family: Family): HolderParams {
  const rnd = mulberry32(seed * 2654435761)
  const base = RECIPES[family](rnd)
  for (const k of Object.keys(PARAM_RANGES) as (keyof typeof PARAM_RANGES)[]) {
    const r = PARAM_RANGES[k]
    let v = Math.min(r.max, Math.max(r.min, base[k]))
    v = r.step >= 1 ? Math.round(v) : Math.round(v / r.step) * r.step
    base[k] = +v.toFixed(4)
  }
  return { family, seed, ...base }
}

export const DEFAULT_SEED = 7
export const DEFAULT_PARAMS: HolderParams = genParams(DEFAULT_SEED, "whisk")

/* ------------------------------------------------------------------ */
/* SDF primitives                                                      */
/* ------------------------------------------------------------------ */

type V3 = [number, number, number]

type Sphere = { t: 1; x: number; y: number; z: number; r: number }
/** vertical rounded cylinder: half-height h, edge rounding rd */
type Cylinder = { t: 2; x: number; y: number; z: number; r: number; h: number; rd: number }
/** wavy drip dish: horizontal plate at height y, wavy radius, upward rim curl */
type Dish = {
  t: 3
  y: number; r: number
  amp: number; waves: number; phase: number
  th: number; curve: number
}
/**
 * tube along a polyline: exact distance to the whole path (hard min across
 * segments) so a curved strut reads as one clean tube with no joint bulges
 */
type Tube = { t: 4; segs: Float32Array; n: number; r: number }

type Prim = Sphere | Cylinder | Dish | Tube

function sphere(c: V3, r: number): Sphere {
  return { t: 1, x: c[0], y: c[1], z: c[2], r }
}

/** pack a point path into a Tube prim (7 floats per segment) */
function tube(pts: V3[], r: number): Tube {
  const n = pts.length - 1
  const segs = new Float32Array(n * 7)
  for (let i = 0; i < n; i++) {
    const a = pts[i]
    const b = pts[i + 1]
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const dz = b[2] - a[2]
    const l2 = dx * dx + dy * dy + dz * dz
    const o = i * 7
    segs[o] = a[0]
    segs[o + 1] = a[1]
    segs[o + 2] = a[2]
    segs[o + 3] = dx
    segs[o + 4] = dy
    segs[o + 5] = dz
    segs[o + 6] = l2 > 1e-12 ? 1 / l2 : 0
  }
  return { t: 4, segs, n, r }
}

function evalPrim(p: Prim, x: number, y: number, z: number): number {
  switch (p.t) {
    case 1: {
      const px = x - p.x
      const py = y - p.y
      const pz = z - p.z
      return Math.sqrt(px * px + py * py + pz * pz) - p.r
    }
    case 2: {
      const px = x - p.x
      const pz = z - p.z
      const dr = Math.sqrt(px * px + pz * pz) - p.r + p.rd
      const dy = Math.abs(y - p.y) - p.h + p.rd
      const mx = dr > dy ? dr : dy
      const ox = dr > 0 ? dr : 0
      const oy = dy > 0 ? dy : 0
      return (mx < 0 ? mx : Math.sqrt(ox * ox + oy * oy)) - p.rd
    }
    case 3: {
      const q = Math.sqrt(x * x + z * z)
      const ang = Math.atan2(z, x)
      const rim = p.r * (1 + p.amp * Math.sin(p.waves * ang + p.phase))
      const nq = q / p.r
      // plate curls upward toward the rim like a poured dish
      const surf = p.y + p.curve * nq * nq * p.r
      const dv = Math.abs(y - surf) - p.th
      const dr = q - rim
      const mx = dv > dr ? dv : dr
      const ov = dv > 0 ? dv : 0
      const orr = dr > 0 ? dr : 0
      return (mx < 0 ? mx : Math.sqrt(ov * ov + orr * orr)) - p.th * 0.5
    }
    case 4: {
      const s = p.segs
      let best = Infinity
      for (let i = 0, o = 0; i < p.n; i++, o += 7) {
        const px = x - s[o]
        const py = y - s[o + 1]
        const pz = z - s[o + 2]
        const dx = s[o + 3]
        const dy = s[o + 4]
        const dz = s[o + 5]
        let h = (px * dx + py * dy + pz * dz) * s[o + 6]
        h = h < 0 ? 0 : h > 1 ? 1 : h
        const qx = px - dx * h
        const qy = py - dy * h
        const qz = pz - dz * h
        const d = qx * qx + qy * qy + qz * qz
        if (d < best) best = d
      }
      return Math.sqrt(best) - p.r
    }
  }
}

/** conservative bounding sphere per primitive, for early-out rejection */
function primBound(p: Prim): { x: number; y: number; z: number; br: number } {
  switch (p.t) {
    case 1:
      return { x: p.x, y: p.y, z: p.z, br: p.r }
    case 2:
      return { x: p.x, y: p.y, z: p.z, br: Math.sqrt(p.r * p.r + p.h * p.h) + p.rd }
    case 3: {
      const rmax = p.r * (1 + p.amp)
      const ymax = Math.abs(p.curve) * p.r + p.th * 2
      return {
        x: 0,
        y: p.y + ymax / 2,
        z: 0,
        br: Math.sqrt(rmax * rmax + ymax * ymax) + p.th,
      }
    }
    case 4: {
      // bound over all path points
      let x0 = Infinity, y0 = Infinity, z0 = Infinity
      let x1 = -Infinity, y1 = -Infinity, z1 = -Infinity
      const s = p.segs
      for (let i = 0, o = 0; i < p.n; i++, o += 7) {
        for (const [px, py, pz] of [
          [s[o], s[o + 1], s[o + 2]],
          [s[o] + s[o + 3], s[o + 1] + s[o + 4], s[o + 2] + s[o + 5]],
        ]) {
          x0 = Math.min(x0, px); x1 = Math.max(x1, px)
          y0 = Math.min(y0, py); y1 = Math.max(y1, py)
          z0 = Math.min(z0, pz); z1 = Math.max(z1, pz)
        }
      }
      const cx = (x0 + x1) / 2
      const cy = (y0 + y1) / 2
      const cz = (z0 + z1) / 2
      const br = Math.hypot(x1 - cx, y1 - cy, z1 - cz) + p.r
      return { x: cx, y: cy, z: cz, br }
    }
  }
}

function smin(a: number, b: number, k: number): number {
  const h = Math.max(k - Math.abs(a - b), 0) / k
  return Math.min(a, b) - h * h * k * 0.25
}

/* ------------------------------------------------------------------ */
/* Path helpers                                                        */
/* ------------------------------------------------------------------ */

const pol = (r: number, a: number, y: number): V3 => [
  Math.cos(a) * r,
  y,
  Math.sin(a) * r,
]

/** sample a quadratic bezier a→b (control c) as `segs` points, skipping a */
function bez(a: V3, c: V3, b: V3, segs = 10): V3[] {
  const out: V3[] = []
  for (let i = 1; i <= segs; i++) {
    const t = i / segs
    const u = 1 - t
    out.push([
      u * u * a[0] + 2 * u * t * c[0] + t * t * b[0],
      u * u * a[1] + 2 * u * t * c[1] + t * t * b[1],
      u * u * a[2] + 2 * u * t * c[2] + t * t * b[2],
    ])
  }
  return out
}

/** one smooth tube along a bezier strut */
function strut(out: Prim[], a: V3, b: V3, ctrl: V3, r: number, segs = 10) {
  out.push(tube([a, ...bez(a, ctrl, b, segs)], r))
}

/** horizontal circular arc tube at height y */
function ringArc(
  out: Prim[],
  r: number,
  y: number,
  a0: number,
  a1: number,
  tr: number,
  segs = 8,
) {
  const pts: V3[] = []
  for (let i = 0; i <= segs; i++) {
    pts.push(pol(r, a0 + ((a1 - a0) * i) / segs, y))
  }
  out.push(tube(pts, tr))
}

/* ------------------------------------------------------------------ */
/* Skeleton construction                                               */
/* ------------------------------------------------------------------ */

type Skeleton = {
  /** primitives evaluated once, on the symmetry axis */
  central: Prim[]
  centralNeg: Prim[]
  /** primitives of one wedge, implicitly repeated n times around Y */
  wedge: Prim[]
  wedgeNeg: Prim[]
}

/** open tube mouth: bulge the tip into a lip, then bore it out along `dir` */
function openTip(
  sk: Skeleton,
  wedge: boolean,
  tip: V3,
  dir: V3,
  tubeR: number,
  open: number,
) {
  const dl = Math.hypot(dir[0], dir[1], dir[2]) || 1
  const nx = dir[0] / dl
  const ny = dir[1] / dl
  const nz = dir[2] / dl
  const pos = wedge ? sk.wedge : sk.central
  pos.push(sphere(tip, tubeR * 1.24))
  if (open < 0.05) return
  const neg = wedge ? sk.wedgeNeg : sk.centralNeg
  const boreR = tubeR * (0.38 + 0.34 * open)
  const back = tubeR * 0.7
  neg.push(
    tube(
      [
        [tip[0] - nx * back, tip[1] - ny * back, tip[2] - nz * back],
        [tip[0] + nx * tubeR * 2.4, tip[1] + ny * tubeR * 2.4, tip[2] + nz * tubeR * 2.4],
      ],
      boreR,
    ),
  )
}

function buildSkeleton(p: HolderParams): Skeleton {
  const sk: Skeleton = { central: [], centralNeg: [], wedge: [], wedgeNeg: [] }
  const rnd = mulberry32((p.seed ^ 0x9e3779b9) >>> 0)
  const jr = (amt: number) => (rnd() * 2 - 1) * amt

  const n = Math.round(p.symmetry)
  const s = (Math.PI * 2) / n
  const m = s / 2 // wedge center angle
  const R = p.spread
  const H = p.height
  const yTop = H / 2
  const yBot = -H / 2
  const r = p.tube
  const bulbR = r * (1.2 + p.bulb * 0.6)
  const tw = p.twist * s * 0.35

  // ---- candle cup + socket (shared by all families) ----
  const cupR = p.cup
  const cupH = 0.16
  const addCup = (cy: number) => {
    sk.central.push({ t: 2, x: 0, y: cy, z: 0, r: cupR, h: cupH, rd: r * 0.45 })
    // negative: the socket a standard candle drops into
    sk.centralNeg.push({
      t: 2,
      x: 0,
      y: cy + cupH + 0.05,
      z: 0,
      r: cupR * 0.64,
      h: 0.17,
      rd: 0.02,
    })
  }

  if (p.family === "whisk") {
    // tall teepee: legs cross at an apex knot, an inner strut per leg opens
    // an almond loop, the cup rides a floating ring at mid height
    const apex: V3 = [0, yTop - r * 0.3, 0]
    sk.central.push(sphere(apex, r * 1.2))
    const yRing = yBot + H * 0.42
    const ringR = cupR + 0.26
    const ground = pol(R * 0.88, m + tw, yBot + r * 1.05)
    // outer leg: bulges out at the shoulder, lands softly and curls inward
    sk.wedge.push(
      tube(
        [
          apex,
          ...bez(
            apex,
            pol(R * (1.0 + p.arch * 0.42), m + tw * 0.35, yBot + H * 0.58),
            ground,
            16,
          ),
          ...bez(ground, pol(R * 0.68, m + tw, yBot + r * 0.75), pol(R * 0.52, m + tw, yBot + r * 1.15), 4),
        ],
        r,
      ),
    )
    // inner strut: apex → ring edge → foot, opening an almond loop
    const ringEdge = pol(ringR, m, yRing)
    sk.wedge.push(
      tube(
        [
          apex,
          ...bez(apex, pol(ringR * 0.65, m, yRing + (yTop - yRing) * 0.5), ringEdge, 10),
          ...bez(
            ringEdge,
            pol((ringR + R * 0.88) / 2, m + tw * 0.5, yRing + (yBot - yRing) * 0.55),
            ground,
            10,
          ),
        ],
        r * 0.9,
      ),
    )
    // the floating ring, its cup, and a short spoke tying them together
    ringArc(sk.wedge, ringR, yRing, m - s / 2, m + s / 2, r * 0.78, 8)
    sk.wedge.push(tube([pol(ringR, m, yRing), pol(cupR * 0.6, m, yRing + 0.03)], r * 0.72))
    addCup(yRing + cupH * 0.9)
  } else if (p.family === "spider") {
    // elevated cup ring; arms fly out to open mouths, legs arch to feet and
    // a bottom web ties the feet back to a hanging central tube
    const yCup = yTop - cupH * 0.4
    addCup(yCup)
    // wide lip ring around the cup mouth
    ringArc(sk.central, cupR * 1.05, yCup + cupH * 0.6, 0, Math.PI * 2, r * 0.7, 24)
    // up-nub between the arms, leaning on the cup wall
    const nubTip = pol(cupR * 1.3, m + s / 2, yCup + cupH + 0.08)
    sk.wedge.push(tube([pol(cupR * 0.7, m + s / 2, yCup - cupH * 0.4), nubTip], r * 0.9))
    sk.wedge.push(sphere(nubTip, bulbR * 0.8))
    // arm to an open tube mouth
    const armTip = pol(R, m + tw, yCup - H * 0.3 + jr(0.03))
    strut(
      sk.wedge,
      pol(cupR * 0.85, m, yCup - 0.04),
      armTip,
      pol(R * 0.6, m + tw * 0.5, yCup - H * 0.06 + p.arch * 0.1),
      r,
    )
    openTip(sk, true, armTip, [Math.cos(m + tw), -0.35, Math.sin(m + tw)], r, p.open)
    // leg arching down to the foot
    const foot = pol(R * 0.68, m + tw * 0.7, yBot + r)
    strut(
      sk.wedge,
      pol(cupR * 0.8, m, yCup - 0.08),
      foot,
      pol(R * (0.52 + p.arch * 0.32), m + tw * 0.4, (yCup + yBot) / 2 + jr(0.03)),
      r,
      12,
    )
    sk.wedge.push(sphere(foot, bulbR * 0.9))
    // central hanging tube with an open mouth, webbed to each foot
    const tubeEnd: V3 = [0, yBot + H * 0.22, 0]
    sk.central.push(tube([[0, yCup - 0.05, 0], tubeEnd], r))
    openTip(sk, false, tubeEnd, [0, -1, 0], r, p.open)
    strut(
      sk.wedge,
      [Math.cos(m) * r * 0.7, tubeEnd[1] + r * 0.8, Math.sin(m) * r * 0.7],
      foot,
      pol(R * 0.34, m + tw * 0.3, yBot + H * 0.05),
      r * 0.9,
    )
  } else if (p.family === "clover") {
    // squat knot of fat horizontal petal loops around a tall cup
    const yLoop = yBot + r * 1.35
    const cupY = yLoop + H * 0.42
    addCup(cupY)
    // stem joining cup to the loop layer
    sk.central.push({
      t: 2,
      x: 0,
      y: (cupY + yLoop) / 2,
      z: 0,
      r: cupR * 0.9,
      h: (cupY - yLoop) / 2 + 0.05,
      rd: 0.04,
    })
    // petal: a fat horizontal circle tube kissing the stem, tilted by arch
    const ri = cupR * 0.75
    const rc = (ri + R) / 2
    const rr = (R - ri) / 2
    const ux = Math.cos(m + tw)
    const uz = Math.sin(m + tw)
    const tilt = 0.12 * p.arch
    const pts: V3[] = []
    for (let i = 0; i <= 20; i++) {
      const t = (i / 20) * Math.PI * 2
      const along = rc + rr * Math.cos(t)
      const side = rr * 0.92 * Math.sin(t)
      pts.push([
        ux * along - uz * side,
        yLoop + tilt * (along - ri),
        uz * along + ux * side,
      ])
    }
    sk.wedge.push(tube(pts, r))
    // pearls riding the petal shoulders, next to the cup stem
    const shoulderT = Math.PI * 0.78
    for (const side of [-1, 1]) {
      const along = rc + rr * Math.cos(shoulderT)
      const sideOff = rr * 0.92 * Math.sin(shoulderT) * side
      const sh: V3 = [
        ux * along - uz * sideOff,
        yLoop + tilt * (along - ri),
        uz * along + ux * sideOff,
      ]
      const pearl: V3 = [sh[0] * 1.05, sh[1] + r * 2.2, sh[2] * 1.05]
      sk.wedge.push(tube([sh, pearl], r * 0.75))
      sk.wedge.push(sphere(pearl, r * (1.15 + p.bulb * 0.4)))
    }
  } else if (p.family === "cage") {
    const y1 = yTop - H * 0.2 // top ring
    const y0 = yBot + H * 0.18 // post feet
    addCup(y1 + 0.1 + cupH * 0.4)
    // post with a gentle outward bow
    strut(
      sk.wedge,
      pol(R, m, y0),
      pol(R, m, y1),
      pol(R * (1 + 0.14 * p.arch), m, (y0 + y1) / 2),
      r,
      8,
    )
    // knobs: little open tube mouths at both post ends
    for (const [yy, up] of [
      [y1, 0.5],
      [y0, -0.5],
    ] as const) {
      const tip = pol(R + r * 3.1, m, yy + up * r * 2.4)
      sk.wedge.push(tube([pol(R, m, yy), tip], r * 0.85))
      openTip(sk, true, tip, [Math.cos(m), up * 0.55, Math.sin(m)], r * 0.85, p.open)
    }
    // top ring
    ringArc(sk.wedge, R, y1, m, m + s, r)
    // bottom rim + V struts leaving teardrop holes between the posts
    ringArc(sk.wedge, R, yBot + r * 1.3, m - s / 2, m + s / 2, r)
    for (const side of [-1, 1]) {
      strut(
        sk.wedge,
        pol(R, m, y0 + r * 0.5),
        pol(R, m + side * s * 0.42, yBot + r * 1.4),
        pol(R * (1 + 0.05 * p.arch), m + side * s * 0.26, (y0 + yBot) / 2),
        r * 0.95,
        6,
      )
    }
    // spoke from the cup out to each post top, with a pearl nub riding it
    strut(
      sk.wedge,
      pol(cupR * 0.8, m, y1 + 0.1),
      pol(R - r * 0.4, m, y1 + r * 0.3),
      pol((cupR + R) / 2, m, y1 + 0.1 + p.arch * 0.12),
      r,
      6,
    )
    const nubBase = pol((cupR + R) * 0.52, m, y1 + 0.08)
    const nubTip = pol((cupR + R) * 0.52, m, y1 + 0.08 + r * 2.4)
    sk.wedge.push(tube([nubBase, nubTip], r * 0.8))
    sk.wedge.push(sphere(nubTip, bulbR * 0.75))
  } else if (p.family === "molecule") {
    // flat star of bones with double-ball feet
    const yCup = yTop - cupH
    addCup(yCup)
    sk.central.push({ t: 2, x: 0, y: yCup - cupH, z: 0, r: cupR * 0.8, h: 0.12, rd: 0.04 })
    const yArm = yCup - cupH - 0.1
    const knuckle = pol(R * 0.5, m, yArm - H * 0.12)
    strut(sk.wedge, pol(cupR * 0.7, m, yArm), knuckle, pol(R * 0.28, m, yArm - H * 0.02), r, 6)
    const footR = r * (1.6 + p.bulb * 0.6)
    for (const side of [-1, 1]) {
      const fa = m + side * s * 0.28 + tw
      const foot = pol(R * 0.9, fa, yBot + footR * 0.8)
      strut(
        sk.wedge,
        knuckle,
        foot,
        pol(R * (0.68 + p.arch * 0.14), m + side * s * 0.17 + tw * 0.6, (knuckle[1] + yBot) / 2),
        r,
        8,
      )
      // dumbbell end: main ball + a smaller one melted beneath it
      sk.wedge.push(sphere(foot, footR))
      sk.wedge.push(sphere(pol(R * 1.0, fa + side * 0.04, yBot + footR * 0.45), footR * 0.8))
    }
    // pearl on the cup rim
    sk.wedge.push(
      sphere(pol(cupR * 1.1, m + s / 2, yCup + cupH * 0.5 + r), r * (1 + p.bulb * 0.35)),
    )
  } else {
    // bloom: wavy drip dish on top of a looped tripod lattice
    const dishR = cupR * 1.25 + p.dish * (R * 0.8 - cupR)
    addCup(yTop + 0.03)
    sk.central.push({
      t: 3,
      y: yTop - 0.04,
      r: dishR,
      amp: 0.04 + p.rimWave * 0.09,
      waves: 6 + (p.seed % 3),
      phase: rnd() * Math.PI * 2,
      th: 0.06,
      curve: 0.2 + p.rimWave * 0.12,
    })
    // hub under the dish where every loop gathers
    const hub: V3 = [0, yTop - 0.22, 0]
    sk.central.push(sphere([0, hub[1], 0], r * 1.1))
    const b = m + s / 2 // wedge boundary angle
    const yApex = yBot + H * 0.32
    const apex = pol(R * 0.52, b, yApex)
    const foot = pol(R * 0.72, m + tw, yBot + r * 1.2)
    // teardrop loop: two struts bowing apart, hub → foot
    for (const side of [-1, 1]) {
      strut(
        sk.wedge,
        [Math.cos(m) * r * 0.6, hub[1], Math.sin(m) * r * 0.6],
        foot,
        pol(
          R * (0.5 + p.arch * 0.3),
          m + side * s * (0.15 + p.arch * 0.18) + tw * 0.5,
          (hub[1] + yBot) / 2 + jr(0.03),
        ),
        r,
        12,
      )
    }
    // A-frame arches from the foot up to the boundary apexes
    strut(
      sk.wedge,
      foot,
      apex,
      pol(R * (0.66 + 0.08 * p.arch), m + s * 0.26 + tw * 0.5, (yBot + yApex) / 2),
      r * 0.95,
      6,
    )
    strut(
      sk.wedge,
      foot,
      pol(R * 0.52, m - s / 2, yApex),
      pol(R * (0.66 + 0.08 * p.arch), m - s * 0.26 + tw * 0.5, (yBot + yApex) / 2),
      r * 0.95,
      6,
    )
    // open side tube growing out of the apex
    const sideTip = pol(R * 0.98, b, yApex + r)
    sk.wedge.push(tube([apex, sideTip], r))
    openTip(sk, true, sideTip, [Math.cos(b), 0.1, Math.sin(b)], r, p.open)
    // open foot mouth angled into the ground
    const footTip = pol(R * 0.9, m + tw, yBot + r * 0.9)
    sk.wedge.push(tube([foot, footTip], r))
    openTip(
      sk,
      true,
      footTip,
      [Math.cos(m + tw) * 0.7, -0.7, Math.sin(m + tw) * 0.7],
      r,
      p.open,
    )
  }

  return sk
}

/* ------------------------------------------------------------------ */
/* Field evaluation with rotational-symmetry folding                   */
/* ------------------------------------------------------------------ */

type BoundedPrim = { prim: Prim; bx: number; by: number; bz: number; br: number }

function withBounds(prims: Prim[]): BoundedPrim[] {
  return prims.map((prim) => {
    const b = primBound(prim)
    return { prim, bx: b.x, by: b.y, bz: b.z, br: b.br }
  })
}

export type Field = {
  eval: (x: number, y: number, z: number) => number
  bounds: { min: V3; max: V3 }
}

export function makeField(p: HolderParams): Field {
  const sk = buildSkeleton(p)
  const central = withBounds(sk.central)
  const centralNeg = withBounds(sk.centralNeg)
  const wedge = withBounds(sk.wedge)
  const wedgeNeg = withBounds(sk.wedgeNeg)

  const n = Math.round(p.symmetry)
  const sector = (Math.PI * 2) / n
  const k = p.blend
  const kNeg = Math.min(0.05, k * 0.5) + 0.015

  // bounds: wedge prims sweep a full circle around Y
  let maxR = 0.3
  let yMin = Infinity
  let yMax = -Infinity
  for (const { bx, by, bz, br } of [...central, ...wedge]) {
    maxR = Math.max(maxR, Math.hypot(bx, bz) + br)
    yMin = Math.min(yMin, by - br)
    yMax = Math.max(yMax, by + br)
  }
  const margin = k * 1.5 + 0.1
  const bounds = {
    min: [-maxR - margin, yMin - margin, -maxR - margin] as V3,
    max: [maxR + margin, yMax + margin, maxR + margin] as V3,
  }

  // evaluate one primitive list at (x,y,z), smooth-unioned into d
  const accum = (
    list: BoundedPrim[],
    x: number,
    y: number,
    z: number,
    d: number,
    kk: number,
  ) => {
    for (let i = 0; i < list.length; i++) {
      const bp = list[i]
      const dx = x - bp.bx
      const dy = y - bp.by
      const dz = z - bp.bz
      const lim = d + kk + bp.br
      if (lim > 0 && dx * dx + dy * dy + dz * dz > lim * lim) continue
      d = smin(d, evalPrim(bp.prim, x, y, z), kk)
    }
    return d
  }

  const evalAt = (x: number, y: number, z: number): number => {
    let d = accum(central, x, y, z, 1e9, k)

    // fold the point into the canonical wedge and its two neighbors so
    // primitives spanning a sector boundary still blend seamlessly
    const theta = Math.atan2(z, x)
    const kf = Math.floor(theta / sector)
    for (let o = -1; o <= 1; o++) {
      const a = (kf + o) * sector
      const ca = Math.cos(a)
      const sa = Math.sin(a)
      const xr = x * ca + z * sa
      const zr = -x * sa + z * ca
      d = accum(wedge, xr, y, zr, d, k)
    }

    if (centralNeg.length || wedgeNeg.length) {
      let dn = accum(centralNeg, x, y, z, 1e9, kNeg)
      for (let o = -1; o <= 1; o++) {
        const a = (kf + o) * sector
        const ca = Math.cos(a)
        const sa = Math.sin(a)
        const xr = x * ca + z * sa
        const zr = -x * sa + z * ca
        dn = accum(wedgeNeg, xr, y, zr, dn, kNeg)
      }
      // smooth subtraction: carve the bores out of the solid
      d = -smin(-d, dn, kNeg)
    }

    return d
  }

  return { eval: evalAt, bounds }
}

/* ------------------------------------------------------------------ */
/* Sampling + meshing                                                  */
/* ------------------------------------------------------------------ */

export type HolderMeshArrays = {
  positions: Float32Array
  normals: Float32Array
  indices: Uint32Array
}

/**
 * Sample the field and run marching cubes. `cellsPerTube` sets the mesh
 * resolution relative to the strut diameter — the detail that matters —
 * capped at `maxDim` cells on the longest axis. Normals come from the SDF
 * gradient, so shading is glassy-smooth even at modest resolutions.
 */
export function buildHolderArrays(
  p: HolderParams,
  cellsPerTube: number,
  maxDim = 240,
): HolderMeshArrays {
  const field = makeField(p)
  const [x0, y0, z0] = field.bounds.min
  const [x1, y1, z1] = field.bounds.max
  const ex = x1 - x0
  const ey = y1 - y0
  const ez = z1 - z0
  const maxExtent = Math.max(ex, ey, ez)
  const cell = Math.max((p.tube * 2) / cellsPerTube, maxExtent / maxDim)
  const nx = Math.max(8, Math.ceil(ex / cell) + 1)
  const ny = Math.max(8, Math.ceil(ey / cell) + 1)
  const nz = Math.max(8, Math.ceil(ez / cell) + 1)

  const values = new Float32Array(nx * ny * nz)
  let i = 0
  for (let z = 0; z < nz; z++) {
    const pz = z0 + z * cell
    for (let y = 0; y < ny; y++) {
      const py = y0 + y * cell
      for (let x = 0; x < nx; x++, i++) {
        values[i] = field.eval(x0 + x * cell, py, pz)
      }
    }
  }

  const grid: Grid = { nx, ny, nz, ox: x0, oy: y0, oz: z0, cell, field: values }
  const { positions, indices } = marchGrid(grid)

  // normals from the field gradient (central differences)
  const normals = new Float32Array(positions.length)
  const eps = cell * 0.6
  for (let v = 0; v < positions.length; v += 3) {
    const x = positions[v]
    const y = positions[v + 1]
    const z = positions[v + 2]
    let gx = field.eval(x + eps, y, z) - field.eval(x - eps, y, z)
    let gy = field.eval(x, y + eps, z) - field.eval(x, y - eps, z)
    let gz = field.eval(x, y, z + eps) - field.eval(x, y, z - eps)
    const l = Math.hypot(gx, gy, gz) || 1
    gx /= l
    gy /= l
    gz /= l
    normals[v] = gx
    normals[v + 1] = gy
    normals[v + 2] = gz
  }

  return { positions, normals, indices }
}
