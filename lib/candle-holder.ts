import { marchGrid, type Grid } from "./marching-cubes"

/**
 * Parametric candle-stick holders — grown, not modeled.
 *
 * A seeded branching growth process builds a skeleton of tubes inside one
 * symmetry wedge: struts grow from the candle cup, droop or lift under
 * gravity, curl, split, close into loops and end in bulbs or open mouths.
 * The wedge is replicated by the chosen symmetry group (cyclic or dihedral),
 * everything is fused with smooth positive booleans and carved with negative
 * ones (candle socket, tube bores), and marching cubes extracts one
 * watertight organic surface, like slip-cast ceramic. Every growth and
 * symmetry decision is exposed as a parameter.
 */

export type HolderParams = {
  preset: string
  seed: number
  /* symmetry group */
  symmetry: number
  /** 0 = cyclic Cn, 1 = dihedral Dn (adds a mirror inside each wedge) */
  mirror: number
  /* growth */
  depth: number
  branches: number
  branchSpread: number
  length: number
  decay: number
  gravity: number
  outward: number
  curl: number
  wiggle: number
  loopiness: number
  /** probability that tips and branch nodes ring the axis */
  rings: number
  /* body */
  /** 0 = open lattice, towards 1 = a hollow shell grown around the body,
      pierced by one window per wedge that shrinks as the shell closes */
  shell: number
  height: number
  spread: number
  tube: number
  taper: number
  blend: number
  bulb: number
  open: number
  /* the candle interface */
  cup: number
  cupPos: number
  dish: number
  rimWave: number
}

export const PARAM_RANGES = {
  symmetry: { min: 3, max: 9, step: 1 },
  mirror: { min: 0, max: 1, step: 1 },
  depth: { min: 1, max: 4, step: 1 },
  branches: { min: 1, max: 3, step: 1 },
  branchSpread: { min: 0, max: 1, step: 0.02 },
  length: { min: 0.3, max: 1.2, step: 0.01 },
  decay: { min: 0.5, max: 1, step: 0.01 },
  gravity: { min: -1, max: 1, step: 0.02 },
  outward: { min: 0, max: 1, step: 0.02 },
  curl: { min: -1, max: 1, step: 0.02 },
  wiggle: { min: 0, max: 1, step: 0.02 },
  loopiness: { min: 0, max: 1, step: 0.02 },
  rings: { min: 0, max: 1, step: 0.02 },
  shell: { min: 0, max: 1, step: 0.02 },
  height: { min: 0.7, max: 2.4, step: 0.01 },
  spread: { min: 0.7, max: 2.0, step: 0.01 },
  tube: { min: 0.06, max: 0.17, step: 0.002 },
  taper: { min: 0, max: 0.6, step: 0.02 },
  blend: { min: 0.04, max: 0.2, step: 0.005 },
  bulb: { min: 0, max: 1.5, step: 0.02 },
  open: { min: 0, max: 1, step: 0.05 },
  cup: { min: 0.24, max: 0.48, step: 0.005 },
  cupPos: { min: 0.3, max: 1, step: 0.02 },
  dish: { min: 0, max: 1, step: 0.02 },
  rimWave: { min: 0, max: 1, step: 0.02 },
} as const

export type ParamKey = keyof typeof PARAM_RANGES

/* ------------------------------------------------------------------ */
/* Presets: curated growth settings — starting points, not shapes      */
/* ------------------------------------------------------------------ */

type Recipe = Omit<HolderParams, "preset" | "seed">

export const PRESETS: Record<string, Recipe> = {
  whisk: {
    symmetry: 3, mirror: 0,
    depth: 2, branches: 2, branchSpread: 0.5, length: 1.1, decay: 0.85,
    gravity: 0.75, outward: 0.55, curl: 0.1, wiggle: 0.08, loopiness: 0.9,
    rings: 0.6, shell: 0,
    height: 2.0, spread: 1.1, tube: 0.1, taper: 0.08, blend: 0.09,
    bulb: 0.25, open: 0, cup: 0.3, cupPos: 0.62, dish: 0, rimWave: 0,
  },
  spider: {
    symmetry: 4, mirror: 0,
    depth: 2, branches: 2, branchSpread: 0.55, length: 0.9, decay: 0.9,
    gravity: 0.5, outward: 0.9, curl: 0, wiggle: 0.1, loopiness: 0.5,
    rings: 0.35, shell: 0,
    height: 1.3, spread: 1.5, tube: 0.105, taper: 0.1, blend: 0.09,
    bulb: 0.5, open: 1, cup: 0.35, cupPos: 0.95, dish: 0, rimWave: 0,
  },
  clover: {
    symmetry: 4, mirror: 0,
    depth: 1, branches: 1, branchSpread: 0.4, length: 1.2, decay: 0.95,
    gravity: 0.12, outward: 0.9, curl: 0.45, wiggle: 0.04, loopiness: 1,
    rings: 0, shell: 0,
    height: 1.05, spread: 1.4, tube: 0.135, taper: 0, blend: 0.08,
    bulb: 0.7, open: 0, cup: 0.33, cupPos: 0.75, dish: 0, rimWave: 0,
  },
  pod: {
    symmetry: 4, mirror: 0,
    depth: 2, branches: 1, branchSpread: 0.3, length: 0.7, decay: 0.9,
    gravity: 0.9, outward: 0.5, curl: 0, wiggle: 0.06, loopiness: 0.3,
    rings: 0.5, shell: 0.75,
    height: 1.35, spread: 1.1, tube: 0.1, taper: 0, blend: 0.08,
    bulb: 0.4, open: 0.7, cup: 0.3, cupPos: 1, dish: 0, rimWave: 0,
  },
  cage: {
    symmetry: 8, mirror: 0,
    depth: 3, branches: 1, branchSpread: 0.15, length: 0.55, decay: 0.95,
    gravity: 0.9, outward: 0.45, curl: 0, wiggle: 0.04, loopiness: 0.6,
    rings: 0.9, shell: 0,
    height: 1.35, spread: 1.15, tube: 0.085, taper: 0, blend: 0.08,
    bulb: 0.5, open: 0.85, cup: 0.33, cupPos: 0.92, dish: 0, rimWave: 0,
  },
  molecule: {
    symmetry: 5, mirror: 0,
    depth: 2, branches: 2, branchSpread: 0.6, length: 0.85, decay: 0.9,
    gravity: 0.65, outward: 0.95, curl: 0.15, wiggle: 0.18, loopiness: 0.2,
    rings: 0.15, shell: 0,
    height: 1.1, spread: 1.5, tube: 0.095, taper: 0.15, blend: 0.1,
    bulb: 1.2, open: 0, cup: 0.34, cupPos: 0.95, dish: 0, rimWave: 0,
  },
  bloom: {
    symmetry: 3, mirror: 0,
    depth: 3, branches: 2, branchSpread: 0.45, length: 0.8, decay: 0.85,
    gravity: 0.8, outward: 0.55, curl: 0.2, wiggle: 0.1, loopiness: 0.7,
    rings: 0.7, shell: 0,
    height: 1.7, spread: 1.3, tube: 0.1, taper: 0.08, blend: 0.09,
    bulb: 0.35, open: 1, cup: 0.3, cupPos: 1, dish: 0.55, rimWave: 0.55,
  },
}

export const FAMILIES = Object.keys(PRESETS)

/* ------------------------------------------------------------------ */
/* Seeded parameters                                                   */
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

function snap(k: ParamKey, v: number): number {
  const r = PARAM_RANGES[k]
  let x = Math.min(r.max, Math.max(r.min, v))
  x = r.step >= 1 ? Math.round(x) : Math.round(x / r.step) * r.step
  return +x.toFixed(4)
}

/** a preset verbatim — the seed only drives the growth randomness */
export function genParams(seed: number, preset: string): HolderParams {
  const base = PRESETS[preset] ?? PRESETS.whisk
  return { preset, seed, ...base }
}

/**
 * Shuffle: wander across the FULL range of every parameter, gently steered
 * toward the current preset so results stay in-character but surprising.
 */
export function randomizeParams(seed: number, preset: string): HolderParams {
  const rnd = mulberry32((seed * 2654435761 + 0x85ebca6b) >>> 0)
  const base = { ...(PRESETS[preset] ?? PRESETS.whisk) }
  const WILD = 0.6 // 0 = preset only, 1 = uniform over the whole range
  for (const k of Object.keys(PARAM_RANGES) as ParamKey[]) {
    const r = PARAM_RANGES[k]
    const uniform = r.min + rnd() * (r.max - r.min)
    base[k] = snap(k, base[k] + (uniform - base[k]) * WILD)
  }
  return { preset, seed, ...base }
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
 * tube along a polyline with per-vertex radius: exact distance to the whole
 * path (hard min across segments) so a curved, tapering strut reads as one
 * clean tube with no joint bulges
 */
type Tube = { t: 4; segs: Float32Array; n: number; r: number }
/** axis-aligned ellipsoid of revolution (rx = rz), approximate SDF */
type Ellipsoid = { t: 5; x: number; y: number; z: number; rx: number; ry: number }

type Prim = Sphere | Cylinder | Dish | Tube | Ellipsoid

function sphere(c: V3, r: number): Sphere {
  return { t: 1, x: c[0], y: c[1], z: c[2], r }
}

/** pack a point path into a Tube prim (8 floats per segment, incl. radius) */
function tube(pts: V3[], r: number | number[]): Tube {
  const n = pts.length - 1
  const segs = new Float32Array(n * 8)
  let rmax = 0
  for (let i = 0; i < n; i++) {
    const a = pts[i]
    const b = pts[i + 1]
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const dz = b[2] - a[2]
    const l2 = dx * dx + dy * dy + dz * dz
    const ri = typeof r === "number" ? r : (r[i] + r[i + 1]) / 2
    rmax = Math.max(rmax, ri)
    const o = i * 8
    segs[o] = a[0]
    segs[o + 1] = a[1]
    segs[o + 2] = a[2]
    segs[o + 3] = dx
    segs[o + 4] = dy
    segs[o + 5] = dz
    segs[o + 6] = l2 > 1e-12 ? 1 / l2 : 0
    segs[o + 7] = ri
  }
  return { t: 4, segs, n, r: rmax }
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
      for (let i = 0, o = 0; i < p.n; i++, o += 8) {
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
        const d = Math.sqrt(qx * qx + qy * qy + qz * qz) - s[o + 7]
        if (d < best) best = d
      }
      return best
    }
    case 5: {
      const px = (x - p.x) / p.rx
      const py = (y - p.y) / p.ry
      const pz = (z - p.z) / p.rx
      const k = Math.sqrt(px * px + py * py + pz * pz)
      return (k - 1) * Math.min(p.rx, p.ry)
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
      let x0 = Infinity, y0 = Infinity, z0 = Infinity
      let x1 = -Infinity, y1 = -Infinity, z1 = -Infinity
      const s = p.segs
      for (let i = 0, o = 0; i < p.n; i++, o += 8) {
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
    case 5:
      return { x: p.x, y: p.y, z: p.z, br: Math.max(p.rx, p.ry) }
  }
}

function smin(a: number, b: number, k: number): number {
  const h = Math.max(k - Math.abs(a - b), 0) / k
  return Math.min(a, b) - h * h * k * 0.25
}

/* ------------------------------------------------------------------ */
/* Growth                                                              */
/* ------------------------------------------------------------------ */

const pol = (r: number, a: number, y: number): V3 => [
  Math.cos(a) * r,
  y,
  Math.sin(a) * r,
]

/** sample a quadratic bezier a→b (control c), including b, excluding a */
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

type Skeleton = {
  central: Prim[]
  centralNeg: Prim[]
  wedge: Prim[]
  wedgeNeg: Prim[]
}

/** open tube mouth: bulge the tip into a lip, then bore it out along `dir` */
function openTip(sk: Skeleton, tip: V3, dir: V3, tubeR: number, open: number) {
  const dl = Math.hypot(dir[0], dir[1], dir[2]) || 1
  const nx = dir[0] / dl
  const ny = dir[1] / dl
  const nz = dir[2] / dl
  sk.wedge.push(sphere(tip, tubeR * 1.24))
  const boreR = tubeR * (0.38 + 0.34 * open)
  const back = tubeR * 0.7
  sk.wedgeNeg.push(
    tube(
      [
        [tip[0] - nx * back, tip[1] - ny * back, tip[2] - nz * back],
        [tip[0] + nx * tubeR * 2.4, tip[1] + ny * tubeR * 2.4, tip[2] + nz * tubeR * 2.4],
      ],
      boreR,
    ),
  )
}

const norm = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / l, v[1] / l, v[2] / l]
}
const rotY = (v: V3, a: number): V3 => {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c]
}

function buildSkeleton(p: HolderParams): Skeleton {
  const sk: Skeleton = { central: [], centralNeg: [], wedge: [], wedgeNeg: [] }
  const rnd = mulberry32((p.seed ^ 0x9e3779b9) >>> 0)
  const jr = (amt: number) => (rnd() * 2 - 1) * amt

  const n = Math.round(p.symmetry)
  const s = (Math.PI * 2) / n
  const m = s / 2
  const R = p.spread
  const H = p.height
  const yTop = H / 2
  const yBot = -H / 2
  const r0 = p.tube

  /* ---- the candle interface: cup, socket, optional drip dish ---- */
  const cupR = p.cup
  const cupH = 0.16
  const cupY = Math.min(yBot + p.cupPos * H, yTop - cupH * 0.5)
  sk.central.push({ t: 2, x: 0, y: cupY, z: 0, r: cupR, h: cupH, rd: r0 * 0.45 })
  sk.centralNeg.push({
    t: 2, x: 0, y: cupY + cupH + 0.05, z: 0,
    r: cupR * 0.64, h: 0.17, rd: 0.02,
  })
  if (p.dish > 0.02) {
    sk.central.push({
      t: 3,
      y: cupY + cupH * 0.3,
      r: cupR * 1.25 + p.dish * (R * 0.8 - cupR),
      amp: 0.04 + p.rimWave * 0.09,
      waves: 6 + (p.seed % 3),
      phase: rnd() * Math.PI * 2,
      th: 0.07,
      curve: 0.2 + p.rimWave * 0.12,
    })
  }

  /* ---- seeded branching growth inside the wedge ---- */
  // each lineage accumulates ONE continuous variable-radius path from its
  // branch point to its tip, so limbs stay clean with no joint bulges
  type TipState = {
    pos: V3
    dir: V3
    depth: number
    r: number
    path: V3[]
    radii: number[]
  }

  // every strut endpoint becomes a loop-closure anchor
  const anchors: V3[] = [[0, cupY - cupH, 0]]
  const unit = (H + R) / 2

  // a tip can close a ring to its own symmetry copy: with n-fold
  // replication one arc per wedge becomes a full circle
  const ringTo = (end: V3, rr: number) => {
    const er = Math.hypot(end[0], end[2])
    if (er < 0.15) return
    const a0 = Math.atan2(end[2], end[0])
    const pts: V3[] = []
    for (let i = 0; i <= 6; i++) {
      pts.push(pol(er, a0 + (s * i) / 6, end[1]))
    }
    sk.wedge.push(tube(pts, rr))
  }

  // bowed connector: a teardrop/almond loop between two skeleton points.
  // When closing back to the limb's own root the connector bows away from
  // the limb's midpoint, guaranteeing an open eye instead of hugging it.
  const closeLoop = (a: V3, b: V3, rr: number, awayFrom?: V3) => {
    const dch = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])
    const mid: V3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]
    let ctrl: V3
    if (awayFrom) {
      // bow sideways, perpendicular to the chord, on the side facing away
      // from the limb — the eye must clear it by more than a tube diameter
      let px = -(b[2] - a[2])
      let pz = b[0] - a[0]
      const pl = Math.hypot(px, pz) || 1
      px /= pl
      pz /= pl
      if (px * (mid[0] - awayFrom[0]) + pz * (mid[2] - awayFrom[2]) < 0) {
        px = -px
        pz = -pz
      }
      const push = Math.max(dch * 0.5, rr * 6)
      ctrl = [mid[0] + px * push, mid[1] + jr(0.03), mid[2] + pz * push]
    } else {
      const mr = Math.hypot(mid[0], mid[2]) || 1
      const bow = dch * 0.36
      ctrl = [
        mid[0] + (mid[0] / mr) * bow,
        mid[1] - p.gravity * dch * 0.3 + jr(0.04),
        mid[2] + (mid[2] / mr) * bow,
      ]
    }
    sk.wedge.push(tube([a, ...bez(a, ctrl, b, 10)], rr))
  }

  // `branches` limbs sprout straight from the cup wall in each wedge
  const B0 = Math.round(p.branches)
  let tips: TipState[] = []
  for (let k = 0; k < B0; k++) {
    const a0 = m + ((k - (B0 - 1) / 2) * p.branchSpread * s) / Math.max(1, B0 - 1 || 1)
    const seedPos = pol(cupR * 0.9, a0, cupY - cupH * 0.4)
    tips.push({
      pos: seedPos,
      dir: norm([
        Math.cos(a0) * (0.4 + p.outward * 0.6),
        -(0.15 + Math.max(p.gravity, 0) * 0.85) + Math.max(-p.gravity, 0) * 0.7,
        Math.sin(a0) * (0.4 + p.outward * 0.6),
      ]),
      depth: 0,
      r: r0,
      path: [seedPos],
      radii: [r0],
    })
  }

  let strutBudget = 48 // hard cap per wedge

  while (tips.length && strutBudget > 0) {
    const next: TipState[] = []
    for (const tip of tips) {
      if (strutBudget-- <= 0) break
      const L = p.length * Math.pow(p.decay, tip.depth) * unit * 0.55

      // steer: gravity droops (or lifts), outwardness pulls radially,
      // curl swirls tangentially, wiggle adds seeded noise
      const radial = norm([tip.pos[0], 0, tip.pos[2]])
      const tangent: V3 = [-radial[2], 0, radial[0]]
      let dir = norm([
        tip.dir[0] +
          radial[0] * p.outward * 0.45 +
          tangent[0] * p.curl * 0.5 +
          jr(p.wiggle * 0.5),
        tip.dir[1] - p.gravity * 0.55 + jr(p.wiggle * 0.3),
        tip.dir[2] +
          radial[2] * p.outward * 0.45 +
          tangent[2] * p.curl * 0.5 +
          jr(p.wiggle * 0.5),
      ])

      let end: V3 = [
        tip.pos[0] + dir[0] * L,
        tip.pos[1] + dir[1] * L,
        tip.pos[2] + dir[2] * L,
      ]

      // keep growth inside the vertical budget; landing = a foot
      let grounded = false
      if (end[1] < yBot + tip.r) {
        const t = (yBot + tip.r - tip.pos[1]) / (end[1] - tip.pos[1])
        end = [
          tip.pos[0] + dir[0] * L * t,
          yBot + tip.r,
          tip.pos[2] + dir[2] * L * t,
        ]
        grounded = true
      }
      if (end[1] > yTop - tip.r) end[1] = yTop - tip.r
      // keep growth inside the radial budget
      const er = Math.hypot(end[0], end[2])
      if (er > R) {
        end[0] *= R / er
        end[2] *= R / er
      }

      // bezier control continues the incoming direction and bows outward
      // and with gravity → sweeping arcs instead of straight sticks
      const mr2 = Math.hypot(tip.pos[0] + dir[0] * L * 0.5, tip.pos[2] + dir[2] * L * 0.5) || 1
      const ctrl: V3 = [
        tip.pos[0] + tip.dir[0] * L * 0.45 + ((tip.pos[0] + dir[0] * L * 0.5) / mr2) * L * 0.2 * p.outward,
        tip.pos[1] + tip.dir[1] * L * 0.45 - p.gravity * L * 0.15,
        tip.pos[2] + tip.dir[2] * L * 0.45 + ((tip.pos[2] + dir[2] * L * 0.5) / mr2) * L * 0.2 * p.outward,
      ]
      const rEnd = Math.max(0.05, tip.r * (1 - p.taper * 0.45))
      const samples = bez(tip.pos, ctrl, end, 10)
      tip.path.push(...samples)
      for (let i = 1; i <= samples.length; i++) {
        tip.radii.push(tip.r + ((rEnd - tip.r) * i) / samples.length)
      }
      const strutStart = tip.path[0]
      anchors.push(end)

      const emit = () => sk.wedge.push(tube(tip.path, tip.radii))

      if (grounded) {
        emit()
        // feet: a bulb, optionally an open mouth, and maybe a loop or ring
        if (rnd() < 0.4 + p.bulb * 0.4) {
          sk.wedge.push(sphere(end, rEnd * (1.15 + p.bulb * 0.55)))
        }
        if (p.open > 0.05 && rnd() < p.open) {
          openTip(sk, end, [dir[0] * 0.5, -1, dir[2] * 0.5], rEnd, p.open)
        }
        if (rnd() < p.loopiness * 0.7) {
          closeLoop(end, strutStart, rEnd * 0.95, tip.path[tip.path.length >> 1])
        }
        if (rnd() < p.rings * 0.7) {
          ringTo(end, rEnd * 0.9)
        }
        continue
      }

      const canBranch = tip.depth + 1 < Math.round(p.depth)
      if (canBranch) {
        const B = Math.round(p.branches)
        if (B === 1) {
          // no split: the limb keeps growing as one continuous path
          next.push({
            pos: end,
            dir,
            depth: tip.depth + 1,
            r: rEnd,
            path: tip.path,
            radii: tip.radii,
          })
          continue
        }
        emit()
        for (let k = 0; k < B; k++) {
          const off = (k - (B - 1) / 2) * p.branchSpread * s * 1.2
          next.push({
            pos: end,
            dir: norm(rotY(dir, off + jr(p.wiggle * 0.3))),
            depth: tip.depth + 1,
            r: rEnd,
            path: [end],
            radii: [rEnd],
          })
        }
        // a node bulb marks the split; sometimes a ring passes through it
        if (rnd() < p.bulb * 0.5) {
          sk.wedge.push(sphere(end, rEnd * (1.1 + p.bulb * 0.5)))
        }
        if (rnd() < p.rings * 0.6) {
          ringTo(end, rEnd * 0.85)
        }
        continue
      }

      emit()
      // terminal tip: close a loop, ring the axis, open a mouth, grow a pearl
      const roll = rnd()
      if (roll < p.loopiness) {
        // teardrop back to this limb's own root, or to the nearest anchor —
        // neighbor-wedge copies included so loops cross sector boundaries
        let best: V3 = strutStart
        let bestD = Math.hypot(
          strutStart[0] - end[0],
          strutStart[1] - end[1],
          strutStart[2] - end[2],
        )
        for (const a of anchors) {
          for (const cand of [a, rotY(a, s), rotY(a, -s)] as V3[]) {
            const d = Math.hypot(cand[0] - end[0], cand[1] - end[1], cand[2] - end[2])
            if (d > L * 0.35 && d < bestD) {
              bestD = d
              best = cand
            }
          }
        }
        closeLoop(
          end,
          best,
          rEnd * 0.95,
          best === strutStart ? tip.path[tip.path.length >> 1] : undefined,
        )
      } else if (rnd() < p.rings) {
        ringTo(end, rEnd * 0.9)
      } else if (p.open > 0.05 && rnd() < p.open) {
        openTip(sk, end, dir, rEnd, p.open)
      } else {
        sk.wedge.push(sphere(end, rEnd * (1.05 + p.bulb * 0.6)))
      }
    }
    tips = next
  }

  /* ---- optional shell: a hollow skin grown around the body ---- */
  if (p.shell > 0.1) {
    const wall = r0 * 1.7
    const rx = R * 0.8
    const yLo = yBot + r0
    const yHi = cupY + cupH * 0.5
    const cy = (yLo + yHi) / 2
    const ry = (yHi - yLo) / 2 + wall
    sk.central.push({ t: 5, x: 0, y: cy, z: 0, rx, ry })
    sk.centralNeg.push({ t: 5, x: 0, y: cy, z: 0, rx: rx - wall, ry: ry - wall })
    // one window per wedge, shrinking as the shell closes up
    const winW = rx * s * (0.42 - 0.3 * p.shell)
    if (winW > wall * 0.4) {
      sk.wedgeNeg.push(
        tube(
          [pol(rx * 0.94, m, cy - ry * 0.35), pol(rx * 0.94, m, cy + ry * 0.3)],
          winW,
        ),
      )
    }
    // punch holes through the ribs between the windows
    if (p.open > 0.05) {
      const b = m + s / 2
      const punchR = r0 * (0.55 + 0.45 * p.open)
      sk.wedgeNeg.push(tube([pol(rx * 0.2, b, cy - ry * 0.55), pol(rx * 1.3, b, cy - ry * 0.48)], punchR))
      sk.wedgeNeg.push(tube([pol(rx * 0.15, b, cy + ry * 0.5), pol(rx * 1.25, b, cy + ry * 0.58)], punchR * 0.7))
    }
  }

  return sk
}

/* ------------------------------------------------------------------ */
/* Field evaluation with symmetry-group folding                        */
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
  const mirror = p.mirror >= 0.5
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

  // fold the point into the canonical wedge and its two neighbors so
  // primitives spanning a sector boundary still blend seamlessly; for the
  // dihedral group each candidate is also evaluated mirrored across the
  // wedge center plane
  const foldAccum = (
    list: BoundedPrim[],
    x: number,
    y: number,
    z: number,
    d: number,
    kk: number,
    theta: number,
  ) => {
    const kf = Math.floor(theta / sector)
    for (let o = -1; o <= 1; o++) {
      const a = (kf + o) * sector
      const ca = Math.cos(a)
      const sa = Math.sin(a)
      const xr = x * ca + z * sa
      const zr = -x * sa + z * ca
      d = accum(list, xr, y, zr, d, kk)
      if (mirror) {
        // reflect across the wedge center plane θ = sector/2
        const a2 = Math.atan2(zr, xr)
        const rr = Math.hypot(xr, zr)
        const am = sector - a2
        d = accum(list, Math.cos(am) * rr, y, Math.sin(am) * rr, d, kk)
      }
    }
    return d
  }

  const evalAt = (x: number, y: number, z: number): number => {
    const theta = Math.atan2(z, x)
    let d = accum(central, x, y, z, 1e9, k)
    d = foldAccum(wedge, x, y, z, d, k, theta)

    if (centralNeg.length || wedgeNeg.length) {
      let dn = accum(centralNeg, x, y, z, 1e9, kNeg)
      dn = foldAccum(wedgeNeg, x, y, z, dn, kNeg, theta)
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
  maxDim = 280,
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

  // normals from the field gradient (central differences); the wider stencil
  // softens shading over creases like the dish rim
  const normals = new Float32Array(positions.length)
  const eps = cell * 0.9
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
