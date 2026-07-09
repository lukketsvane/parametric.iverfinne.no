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

/**
 * Physical scale: 1 scene unit = 50 mm. STL exports are scaled to mm.
 * The candle socket is built to real candle sizes:
 *  - telys (tealight, e.g. Clas Ohlson 44-1725): Ø39 × 16 mm cup
 *    → socket Ø41 mm, 12 mm deep
 *  - kronelys (taper, e.g. Clas Ohlson 44-3816): Ø22 mm base, 190 mm tall
 *    → socket Ø23 mm, 28 mm deep for grip
 */
export const MM_PER_UNIT = 50

export type CandleType = "telys" | "kronelys"

export const CANDLE_SPECS: Record<
  CandleType,
  { socketR: number; socketDepth: number; cupHalfH: number; label: string }
> = {
  telys: {
    socketR: 20.5 / MM_PER_UNIT, // Ø41 mm
    socketDepth: 12 / MM_PER_UNIT,
    cupHalfH: 8.5 / MM_PER_UNIT, // 17 mm tall cup
    label: "telys Ø39mm",
  },
  kronelys: {
    socketR: 11.5 / MM_PER_UNIT, // Ø23 mm
    socketDepth: 28 / MM_PER_UNIT,
    cupHalfH: 16 / MM_PER_UNIT, // 32 mm tall cup
    label: "kronelys Ø22mm",
  },
}

export type HolderParams = {
  preset: string
  seed: number
  /** which candle the socket is built for */
  candle: CandleType
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
  /** crown: a ring around the cup mouth that limbs grow from, with bored
      mouths at its corners when open ends are on. 0 = none, 1 = wide */
  crown: number
  /** stacked cells: the grown body is repeated vertically, staggered by
      half a sector, like a tower of fused lattice pods */
  levels: number
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
  symmetry: { min: 3, max: 12, step: 1 },
  mirror: { min: 0, max: 1, step: 1 },
  depth: { min: 1, max: 4, step: 1 },
  branches: { min: 1, max: 3, step: 1 },
  branchSpread: { min: 0, max: 1, step: 0.02 },
  length: { min: 0.3, max: 1.5, step: 0.01 },
  decay: { min: 0.5, max: 1, step: 0.01 },
  gravity: { min: -1, max: 1, step: 0.02 },
  outward: { min: 0, max: 1, step: 0.02 },
  curl: { min: -1, max: 1, step: 0.02 },
  wiggle: { min: 0, max: 1, step: 0.02 },
  loopiness: { min: 0, max: 1, step: 0.02 },
  rings: { min: 0, max: 1, step: 0.02 },
  crown: { min: 0, max: 1, step: 0.02 },
  levels: { min: 1, max: 3, step: 1 },
  shell: { min: 0, max: 1, step: 0.02 },
  height: { min: 0.7, max: 2.6, step: 0.01 },
  spread: { min: 0.7, max: 2.2, step: 0.01 },
  tube: { min: 0.06, max: 0.17, step: 0.002 },
  taper: { min: 0, max: 0.6, step: 0.02 },
  blend: { min: 0.04, max: 0.2, step: 0.005 },
  bulb: { min: 0, max: 2, step: 0.02 },
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
  bloom: {
    candle: "kronelys",
    symmetry: 3, mirror: 0,
    depth: 3, branches: 2, branchSpread: 0.55, length: 1.15, decay: 0.9,
    gravity: 0.95, outward: 0.7, curl: 0.08, wiggle: 0, loopiness: 1,
    rings: 0.12, crown: 0, levels: 1, shell: 0,
    height: 1.95, spread: 1.1, tube: 0.092, taper: 0.08, blend: 0.08,
    bulb: 0.25, open: 1, cup: 0.3, cupPos: 1, dish: 0.38, rimWave: 0.85,
  },
  whisk: {
    candle: "kronelys",
    symmetry: 4, mirror: 0,
    depth: 2, branches: 1, branchSpread: 0.3, length: 1.35, decay: 0.95,
    gravity: -0.85, outward: 0.45, curl: 0.12, wiggle: 0.05, loopiness: 1,
    rings: 0.35, crown: 0.5, levels: 1, shell: 0,
    height: 2.3, spread: 1.1, tube: 0.1, taper: 0.05, blend: 0.09,
    bulb: 0.2, open: 0, cup: 0.3, cupPos: 0.4, dish: 0, rimWave: 0,
  },
  spider: {
    candle: "kronelys",
    symmetry: 4, mirror: 0,
    depth: 2, branches: 2, branchSpread: 0.55, length: 0.9, decay: 0.9,
    gravity: 0.5, outward: 0.9, curl: 0, wiggle: 0.1, loopiness: 0.5,
    rings: 0.35, crown: 0.22, levels: 1, shell: 0,
    height: 1.3, spread: 1.5, tube: 0.105, taper: 0.1, blend: 0.09,
    bulb: 0.5, open: 1, cup: 0.35, cupPos: 0.95, dish: 0, rimWave: 0,
  },
  clover: {
    candle: "telys",
    symmetry: 4, mirror: 0,
    depth: 1, branches: 1, branchSpread: 0.4, length: 1.2, decay: 0.95,
    gravity: 0.12, outward: 0.9, curl: 0.45, wiggle: 0.04, loopiness: 1,
    rings: 0, crown: 0, levels: 1, shell: 0,
    height: 1.05, spread: 1.4, tube: 0.135, taper: 0, blend: 0.08,
    bulb: 0.7, open: 0, cup: 0.33, cupPos: 0.75, dish: 0, rimWave: 0,
  },
  pod: {
    candle: "telys",
    symmetry: 4, mirror: 0,
    depth: 2, branches: 1, branchSpread: 0.3, length: 0.7, decay: 0.9,
    gravity: 0.9, outward: 0.5, curl: 0, wiggle: 0.06, loopiness: 0.3,
    rings: 0.5, crown: 0, levels: 1, shell: 0.75,
    height: 1.35, spread: 1.1, tube: 0.1, taper: 0, blend: 0.08,
    bulb: 0.4, open: 0.7, cup: 0.3, cupPos: 1, dish: 0, rimWave: 0,
  },
  cage: {
    candle: "kronelys",
    symmetry: 8, mirror: 0,
    depth: 3, branches: 1, branchSpread: 0.15, length: 0.55, decay: 0.95,
    gravity: 0.9, outward: 0.45, curl: 0, wiggle: 0.04, loopiness: 0.6,
    rings: 0.9, crown: 0.9, levels: 1, shell: 0,
    height: 1.35, spread: 1.15, tube: 0.085, taper: 0, blend: 0.08,
    bulb: 0.5, open: 0.85, cup: 0.33, cupPos: 0.92, dish: 0, rimWave: 0,
  },
  molecule: {
    candle: "kronelys",
    symmetry: 5, mirror: 0,
    depth: 2, branches: 2, branchSpread: 0.6, length: 0.85, decay: 0.9,
    gravity: 0.65, outward: 0.95, curl: 0.15, wiggle: 0.18, loopiness: 0.2,
    rings: 0.15, crown: 0.15, levels: 1, shell: 0,
    height: 1.1, spread: 1.5, tube: 0.095, taper: 0.15, blend: 0.1,
    bulb: 1.2, open: 0, cup: 0.34, cupPos: 0.95, dish: 0, rimWave: 0,
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
  const base = PRESETS[preset] ?? PRESETS.bloom
  return { preset, seed, ...base }
}

/**
 * Shuffle: wander across the FULL range of every parameter, gently steered
 * toward the current preset so results stay in-character but surprising.
 */
export function randomizeParams(seed: number, preset: string): HolderParams {
  const rnd = mulberry32((seed * 2654435761 + 0x85ebca6b) >>> 0)
  const base = { ...(PRESETS[preset] ?? PRESETS.bloom) }
  const WILD = 0.6 // 0 = preset only, 1 = uniform over the whole range
  for (const k of Object.keys(PARAM_RANGES) as ParamKey[]) {
    const r = PARAM_RANGES[k]
    const uniform = r.min + rnd() * (r.max - r.min)
    base[k] = snap(k, base[k] + (uniform - base[k]) * WILD)
  }
  // coherence: calm curves, crisp joints, one dominant structural motif —
  // a shuffle may surprise, but it must never stack every device at once
  base.wiggle = Math.min(base.wiggle, 0.35)
  base.blend = Math.min(base.blend, base.tube * 1.2)
  if (base.shell > 0.25) {
    base.loopiness = Math.min(base.loopiness, 0.5)
    base.rings = Math.min(base.rings, 0.4)
    base.crown = Math.min(base.crown, 0.3)
    base.dish = Math.min(base.dish, 0.3)
    base.levels = Math.min(base.levels, 2)
  }
  if (base.levels > 1) {
    base.crown = Math.min(base.crown, 0.4)
    base.dish = Math.min(base.dish, 0.3)
  }
  if (base.cupPos < 0.75) base.dish = Math.min(base.dish, 0.2)
  for (const k of ["wiggle", "blend", "loopiness", "rings", "crown", "dish", "levels"] as ParamKey[]) {
    base[k] = snap(k, base[k])
  }
  return { preset, seed, ...base }
}

export const DEFAULT_SEED = 11
export const DEFAULT_PARAMS: HolderParams = genParams(DEFAULT_SEED, "bloom")

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
      // the plate curls up as curve·(q/r)² — at the wavy rim q can reach
      // rmax, so bound the lift there or the dish gets clipped by the grid
      const lift = (Math.abs(p.curve) * rmax * rmax) / p.r
      const ymax = lift + p.th * 2
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

/** shift a primitive vertically */
function translatePrimY(p: Prim, dy: number): Prim {
  switch (p.t) {
    case 1:
    case 2:
    case 3:
      return { ...p, y: p.y + dy }
    case 4: {
      const segs = new Float32Array(p.segs)
      for (let o = 1; o < segs.length; o += 8) segs[o] += dy
      return { ...p, segs }
    }
    case 5:
      return { ...p, y: p.y + dy }
  }
}

/** rotate a primitive around the Y axis */
function rotatePrim(p: Prim, a: number): Prim {
  const c = Math.cos(a)
  const s = Math.sin(a)
  const rx = (x: number, z: number): [number, number] => [x * c - z * s, x * s + z * c]
  switch (p.t) {
    case 1: {
      const [x, z] = rx(p.x, p.z)
      return { ...p, x, z }
    }
    case 2: {
      const [x, z] = rx(p.x, p.z)
      return { ...p, x, z }
    }
    case 3:
      return { ...p, phase: p.phase - p.waves * a }
    case 4: {
      const segs = new Float32Array(p.segs)
      for (let o = 0; o < segs.length; o += 8) {
        const [ax, az] = rx(segs[o], segs[o + 2])
        const [dx, dz] = rx(segs[o + 3], segs[o + 5])
        segs[o] = ax
        segs[o + 2] = az
        segs[o + 3] = dx
        segs[o + 5] = dz
      }
      return { ...p, segs }
    }
    case 5:
      return p
  }
}

/**
 * The symmetry fold evaluates each sample against three neighboring wedge
 * copies, which is only exact for primitives staying within ±½ sector of
 * their wedge. Wider primitives (spiraling limbs, long loop connectors)
 * would get sliced at the fold horizon — so they are replicated explicitly
 * instead and moved to the central list.
 */
function explodeWidePrims(sk: Skeleton, n: number, sector: number) {
  const m = sector / 2
  // safe iff the prim stays within one sector of the wedge center — then
  // every sample's three fold candidates cover all copies that matter
  const limit = sector * 1.02
  const wrapPi = (a: number) => {
    while (a > Math.PI) a -= Math.PI * 2
    while (a < -Math.PI) a += Math.PI * 2
    return a
  }
  const wide = (p: Prim): boolean => {
    if (p.t !== 4) return false // spheres/cylinders/dishes have no span
    const s = p.segs
    let cum = Number.NaN
    let prevRaw = 0
    let lo = 0
    let hi = 0
    for (let i = 0; i <= p.n; i++) {
      const o = Math.min(i, p.n - 1) * 8
      const last = i === p.n
      const x = last ? s[o] + s[o + 3] : s[o]
      const z = last ? s[o + 2] + s[o + 5] : s[o + 2]
      if (Math.hypot(x, z) < 0.15) continue // near-axis points bind to no wedge
      const raw = Math.atan2(z, x)
      if (Number.isNaN(cum)) {
        cum = wrapPi(raw - m)
        prevRaw = raw
        lo = hi = cum
        continue
      }
      // continuous paths step by small angles — unwrap via the previous point
      cum += wrapPi(raw - prevRaw)
      prevRaw = raw
      lo = Math.min(lo, cum)
      hi = Math.max(hi, cum)
    }
    return hi > limit || lo < -limit
  }

  for (const [list, neg] of [
    [sk.wedge, false],
    [sk.wedgeNeg, true],
  ] as const) {
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i]
      if (!wide(p)) continue
      list.splice(i, 1)
      const target = neg ? sk.centralNeg : sk.central
      for (let k = 0; k < n; k++) target.push(rotatePrim(p, k * sector))
    }
  }
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
  // flared lip: a swelling bead behind a wider mouth bead
  sk.wedge.push(
    sphere([tip[0] - nx * tubeR, tip[1] - ny * tubeR, tip[2] - nz * tubeR], tubeR * 1.12),
  )
  sk.wedge.push(sphere(tip, tubeR * 1.32))
  const boreR = tubeR * (0.4 + 0.36 * open)
  const back = tubeR * 0.9
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

  /* ---- the candle interface: cup, socket, optional drip dish ----
     socket dimensions are real: the chosen candle must drop in and hold */
  const spec = CANDLE_SPECS[p.candle] ?? CANDLE_SPECS.kronelys
  const minWall = 4 / MM_PER_UNIT
  const cupR = Math.max(p.cup, spec.socketR + minWall)
  const cupH = spec.cupHalfH
  const cupY = Math.min(yBot + p.cupPos * H, yTop - cupH * 0.5)
  sk.central.push({ t: 2, x: 0, y: cupY, z: 0, r: cupR, h: cupH, rd: r0 * 0.45 })
  // bore from the cup mouth down, leaving a floor under the candle
  const sockD = Math.min(spec.socketDepth, cupH * 2 - 2.5 / MM_PER_UNIT)
  sk.centralNeg.push({
    t: 2,
    x: 0,
    y: cupY + cupH + 0.06 - sockD / 2,
    z: 0,
    r: spec.socketR,
    h: sockD / 2 + 0.06,
    rd: 0.03,
  })
  if (p.dish > 0.02) {
    // the dish is one leaf per symmetry wedge, peaks aligned to the wedge
    // centers so the whole piece shares a single Cn symmetry group; fewer
    // leaves get proportionally deeper scallops so they read as petals
    const waves = n
    sk.central.push({
      t: 3,
      y: cupY + cupH * 0.3,
      r: cupR * 1.25 + p.dish * (R * 0.8 - cupR),
      amp: (0.04 + p.rimWave * 0.1) * Math.sqrt(6 / waves),
      waves,
      phase: Math.PI / 2 - waves * m,
      th: 0.07,
      curve: 0.2 + p.rimWave * 0.12,
    })
  }

  // the candle interface stays unique when the body is stacked in levels
  const cupPrims = sk.central.length
  const cupNegPrims = sk.centralNeg.length

  // a tip can close a ring to its own symmetry copies: with n-fold
  // replication one arc per wedge becomes a full circle
  const ringTo = (end: V3, rr: number) => {
    const er = Math.hypot(end[0], end[2])
    if (er < 0.15) return
    const a0 = Math.atan2(end[2], end[0])
    const pts: V3[] = []
    for (let i = 0; i <= 6; i++) {
      pts.push(pol(er, a0 - s / 2 + (s * i) / 6, end[1]))
    }
    sk.wedge.push(tube(pts, rr))
  }

  // bowed connector between two skeleton points (used for apex knots)
  const closeLoop = (a: V3, b: V3, rr: number, awayFrom?: V3) => {
    const dch = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])
    const mid: V3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]
    let ctrl: V3
    if (awayFrom) {
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

  /* ---- crown: a ring around the cup mouth that limbs grow from ---- */
  let seedR = cupR * 0.9
  let seedY = cupY - cupH * 0.4
  if (p.crown > 0.03) {
    const crownR = cupR + r0 * 2 + p.crown * (R * 0.8 - cupR - r0 * 2)
    const yC = cupY + cupH * 0.2
    ringTo(pol(crownR, m - s / 2, yC), r0)
    sk.wedge.push(tube([pol(cupR * 0.85, m, yC), pol(crownR, m, yC)], r0 * 0.95))
    if (p.open > 0.05) {
      const b = m + s / 2
      const corner = pol(crownR, b, yC)
      sk.wedge.push(sphere(corner, r0 * 1.3))
      sk.wedgeNeg.push(
        tube(
          [pol(crownR - r0 * 2.4, b, yC), pol(crownR + r0 * 2.4, b, yC)],
          r0 * (0.38 + 0.34 * p.open),
        ),
      )
    }
    seedR = crownR
    seedY = yC - r0 * 0.4
  }

  /* ---- structured growth: tiers of clean arcs inside the wedge ----
     Randomness decides LAYOUT (where limbs go, which fate each tip gets);
     the curves themselves are always clean single-bow arcs, so every
     output reads as bent porcelain tube, never as a melted random walk. */

  // a clean arc from a to b: one outward/tangential/vertical bow plus an
  // optional subtle ripple — never a random kink
  const arc = (
    a: V3,
    b: V3,
    bowOut: number,
    bowTan: number,
    bowUp: number,
    rr: number,
  ): V3[] => {
    const mid: V3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]
    const mr = Math.hypot(mid[0], mid[2]) || 1
    const ox = mid[0] / mr
    const oz = mid[2] / mr
    const ctrl: V3 = [
      mid[0] + ox * bowOut - oz * bowTan,
      mid[1] + bowUp,
      mid[2] + oz * bowOut + ox * bowTan,
    ]
    const pts: V3[] = [a, ...bez(a, ctrl, b, 14)]
    if (p.wiggle > 0.02) {
      // deterministic ripple along the arc, radial, fading at the ends
      const amp = p.wiggle * rr * 1.6
      for (let i = 1; i < pts.length - 1; i++) {
        const t = i / (pts.length - 1)
        const q = Math.hypot(pts[i][0], pts[i][2]) || 1
        const rip = Math.sin(t * Math.PI * 3) * Math.sin(t * Math.PI) * amp
        pts[i] = [
          pts[i][0] + (pts[i][0] / q) * rip,
          pts[i][1],
          pts[i][2] + (pts[i][2] / q) * rip,
        ]
      }
    }
    return pts
  }

  const lift = p.gravity < -0.3 // negative gravity: limbs rise instead
  const tiers = Math.round(p.depth)
  const arms = Math.round(p.branches)
  const rTip = Math.max(0.05, r0 * (1 - p.taper * 0.6))
  const chordBow = (c: number) => c * (0.22 + 0.38 * p.outward)

  // feet land on a ground ring (or a sky ring when lifting)
  const fR = R * (0.62 + 0.3 * p.outward) * Math.min(1.3, p.length)
  const yFoot = lift ? yTop - r0 * 1.5 : yBot + r0
  const anchors: V3[] = [[0, yTop - r0 * 1.5, 0]]

  /* tier 0 — legs: teardrop loop pairs or single arcs, seed → foot */
  for (let k = 0; k < arms; k++) {
    const off = arms > 1 ? (k - (arms - 1) / 2) * p.branchSpread * s * 0.8 : 0
    const a0 = m + off
    const seed = pol(seedR, a0, seedY)
    const fa = a0 + p.curl * s * 0.6
    const foot = pol(fR, fa, yFoot)
    const chord = Math.hypot(foot[0] - seed[0], foot[1] - seed[1], foot[2] - seed[2])
    const sag = -p.gravity * chord * 0.22
    anchors.push(foot)
    if (rnd() < p.loopiness) {
      // a proper teardrop: two mirrored arcs meeting at both ends
      const w = chord * (0.16 + 0.3 * p.branchSpread)
      sk.wedge.push(tube(arc(seed, foot, chordBow(chord) * 0.5, w, sag, r0), r0))
      sk.wedge.push(tube(arc(seed, foot, chordBow(chord) * 0.5, -w, sag, r0), r0))
    } else {
      sk.wedge.push(tube(arc(seed, foot, chordBow(chord), 0, sag, r0), r0))
    }
    // the foot: an open mouth into the ground, a pearl, or bare
    if (p.open > 0.05 && rnd() < p.open) {
      openTip(sk, foot, lift ? [foot[0], 0.6, foot[2]] : [foot[0] * 0.3, -1, foot[2] * 0.3], r0, p.open)
    } else if (rnd() < p.bulb * 0.6) {
      sk.wedge.push(sphere(foot, r0 * (1.2 + p.bulb * 0.5)))
    }
    if (rnd() < p.rings * 0.7) ringTo(foot, r0 * 0.9)
    if (lift && rnd() < p.loopiness * 0.8) {
      // rising limbs can close onto the axis — apex knots
      closeLoop(foot, [0, yTop - r0, 0], rTip, undefined)
    }
  }

  /* tier 1 — arches: foot-to-foot arcs between neighboring wedges */
  if (tiers >= 2 && !lift) {
    const fa = m + p.curl * s * 0.6
    const foot = pol(fR, fa, yFoot)
    const next = pol(fR, fa + s, yFoot)
    const span = Math.hypot(next[0] - foot[0], next[2] - foot[2])
    const hUp = span * (0.35 + 0.3 * p.decay)
    sk.wedge.push(tube(arc(foot, next, span * 0.12, 0, hUp, rTip), rTip))
  }

  /* tier 2 — side arms: straight flared tubes reaching out at mid height */
  if (tiers >= 3) {
    const yMid = (seedY + yFoot) / 2
    const b = m + s / 2
    const inner = pol(Math.max(seedR * 0.8, fR * 0.35), b, yMid)
    const tip = pol(R * 0.95 * Math.pow(p.decay, 1), b, yMid + R * 0.06)
    sk.wedge.push(tube(arc(inner, tip, 0, 0, -R * 0.05, rTip), rTip))
    if (p.open > 0.05 && rnd() < Math.max(0.5, p.open)) {
      openTip(sk, tip, [tip[0], 0.15, tip[2]], rTip, p.open)
    } else {
      sk.wedge.push(sphere(tip, rTip * (1.1 + p.bulb * 0.5)))
    }
    if (rnd() < p.rings * 0.5) ringTo(tip, rTip * 0.85)
  }

  /* tier 3 — crest: short nubs rising past the cup rim */
  if (tiers >= 4) {
    const base = pol(seedR * 0.95, m + s / 2, seedY + cupH)
    const tip2: V3 = [base[0] * 1.25, seedY + cupH + r0 * 2.8, base[2] * 1.25]
    sk.wedge.push(tube([base, tip2], rTip * 0.9))
    if (rnd() < p.bulb * 0.7) sk.wedge.push(sphere(tip2, rTip * (1.15 + p.bulb * 0.45)))
    else if (p.open > 0.05 && rnd() < p.open) openTip(sk, tip2, [tip2[0] * 0.4, 1, tip2[2] * 0.4], rTip * 0.9, p.open)
  }

  /* ---- optional shell: a hollow skin grown around the body ----
     below 0.25 a shell is only fragments between its windows, so it is
     treated as absent rather than producing broken-eggshell debris */
  if (p.shell > 0.25) {
    const wall = r0 * 1.7
    const rx = R * 0.8
    const yLo = yBot + r0
    const yHi = cupY + cupH * 0.5
    const cy = (yLo + yHi) / 2
    const ry = (yHi - yLo) / 2 + wall
    sk.central.push({ t: 5, x: 0, y: cy, z: 0, rx, ry })
    sk.centralNeg.push({ t: 5, x: 0, y: cy, z: 0, rx: rx - wall, ry: ry - wall })
    // one window per wedge, shrinking as the shell closes up
    const winW = rx * s * (0.36 - 0.24 * p.shell)
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

  /* ---- levels: stack the grown body into a staggered tower ---- */
  const L = Math.round(p.levels)
  if (L > 1) {
    const dy = H * 0.84
    const baseW = sk.wedge.slice()
    const baseWN = sk.wedgeNeg.slice()
    const baseC = sk.central.slice(cupPrims)
    const baseCN = sk.centralNeg.slice(cupNegPrims)
    // the lowest and highest off-axis anchors weld consecutive levels
    let lowA: V3 | null = null
    let highA: V3 | null = null
    for (const a of anchors) {
      if (Math.hypot(a[0], a[2]) < 0.2) continue
      if (!lowA || a[1] < lowA[1]) lowA = a
      if (!highA || a[1] > highA[1]) highA = a
    }
    for (let k = 1; k < L; k++) {
      const rot = (k % 2) * s * 0.5
      const rotPrev = ((k - 1) % 2) * s * 0.5
      for (const prim of baseW)
        sk.wedge.push(translatePrimY(rotatePrim(prim, rot), -dy * k))
      for (const prim of baseWN)
        sk.wedgeNeg.push(translatePrimY(rotatePrim(prim, rot), -dy * k))
      for (const prim of baseC)
        sk.central.push(translatePrimY(rotatePrim(prim, rot), -dy * k))
      for (const prim of baseCN)
        sk.centralNeg.push(translatePrimY(rotatePrim(prim, rot), -dy * k))
      // guaranteed weld: a strut from the level above's foot anchor down
      // to the level below's crown anchor
      if (lowA && highA) {
        const a = rotY(lowA, rotPrev)
        const b = rotY(highA, rot)
        sk.wedge.push(
          tube(
            [
              [a[0], a[1] - dy * (k - 1), a[2]],
              [b[0], b[1] - dy * k, b[2]],
            ],
            r0 * 0.95,
          ),
        )
      }
    }
  }

  // anything reaching beyond the safe folding window gets replicated
  // explicitly so it can never be sliced at the fold horizon
  explodeWidePrims(sk, n, s)

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
  // two resolution demands: the tube wants `cellsPerTube` for smoothness,
  // while thin features (tapered tips, dish plate, shell wall) only need
  // ~2.8 cells across to not tear — so they set a floor, not the budget
  const TEAR_CELLS = 2.8
  const gens = Math.max(0, Math.round(p.depth) - 1)
  let minFeature = Math.max(0.05, p.tube * Math.pow(1 - p.taper * 0.45, gens)) * 2
  if (p.dish > 0.02) minFeature = Math.min(minFeature, 0.14)
  if (p.shell > 0.25) minFeature = Math.min(minFeature, p.tube * 1.7)
  const cell = Math.max(
    Math.min((p.tube * 2) / cellsPerTube, minFeature / TEAR_CELLS),
    maxExtent / maxDim,
  )
  const nx = Math.max(8, Math.ceil(ex / cell) + 1)
  const ny = Math.max(8, Math.ceil(ey / cell) + 1)
  const nz = Math.max(8, Math.ceil(ez / cell) + 1)

  // hierarchical sampling: probe a coarse lattice first and skip whole
  // blocks that provably contain no surface (the field is 1-Lipschitz),
  // evaluating fine cells only near the surface — a 3-6x speedup
  const values = new Float32Array(nx * ny * nz)
  const S = 4 // block stride
  const ncx = Math.ceil((nx - 1) / S) + 1
  const ncy = Math.ceil((ny - 1) / S) + 1
  const ncz = Math.ceil((nz - 1) / S) + 1
  const coarse = new Float32Array(ncx * ncy * ncz)
  let ci = 0
  for (let z = 0; z < ncz; z++) {
    const pz = z0 + Math.min(z * S, nz - 1) * cell
    for (let y = 0; y < ncy; y++) {
      const py = y0 + Math.min(y * S, ny - 1) * cell
      for (let x = 0; x < ncx; x++, ci++) {
        coarse[ci] = field.eval(x0 + Math.min(x * S, nx - 1) * cell, py, pz)
      }
    }
  }
  const diag = S * cell * Math.sqrt(3) * 1.05
  const cAt = (x: number, y: number, z: number) => coarse[x + ncx * (y + ncy * z)]
  for (let bz = 0; bz < ncz - 1; bz++) {
    for (let by = 0; by < ncy - 1; by++) {
      for (let bx = 0; bx < ncx - 1; bx++) {
        let m = Infinity
        let sgn = 0
        for (let c = 0; c < 8; c++) {
          const v = cAt(bx + (c & 1), by + ((c >> 1) & 1), bz + ((c >> 2) & 1))
          m = Math.min(m, Math.abs(v))
          sgn = v
        }
        const xEnd = Math.min((bx + 1) * S, nx - 1)
        const yEnd = Math.min((by + 1) * S, ny - 1)
        const zEnd = Math.min((bz + 1) * S, nz - 1)
        if (m > diag) {
          // whole block is provably on one side — fill, don't evaluate
          const fill = sgn > 0 ? m : -m
          for (let z = bz * S; z <= zEnd; z++) {
            for (let y = by * S; y <= yEnd; y++) {
              let idx = bx * S + nx * (y + ny * z)
              for (let x = bx * S; x <= xEnd; x++, idx++) values[idx] = fill
            }
          }
        } else {
          for (let z = bz * S; z <= zEnd; z++) {
            const pz = z0 + z * cell
            for (let y = by * S; y <= yEnd; y++) {
              const py = y0 + y * cell
              let idx = bx * S + nx * (y + ny * z)
              for (let x = bx * S; x <= xEnd; x++, idx++) {
                values[idx] = field.eval(x0 + x * cell, py, pz)
              }
            }
          }
        }
      }
    }
  }

  const grid: Grid = { nx, ny, nz, ox: x0, oy: y0, oz: z0, cell, field: values }
  const marched = marchGrid(grid)
  const positions = marched.positions
  // drop floating crumbs: keep only substantial connected components
  const indices = filterIslands(positions, marched.indices)

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

/**
 * Connected-component filter over the triangle mesh: tiny disconnected
 * islands (severed lip beads, torn slivers) are removed so the result is
 * always one clean printable body. Components under 30% of the largest
 * component's volume are dropped.
 */
function filterIslands(positions: Float32Array, indices: Uint32Array): Uint32Array {
  const nVerts = positions.length / 3
  const parent = new Int32Array(nVerts)
  for (let i = 0; i < nVerts; i++) parent[i] = i
  const find = (a: number): number => {
    while (parent[a] !== a) {
      parent[a] = parent[parent[a]]
      a = parent[a]
    }
    return a
  }
  for (let t = 0; t < indices.length; t += 3) {
    const a = find(indices[t])
    const b = find(indices[t + 1])
    const c = find(indices[t + 2])
    if (b !== a) parent[b] = a
    if (c !== a) parent[c] = a
  }
  // signed volume per component (tetrahedra against the origin)
  const volume = new Map<number, number>()
  for (let t = 0; t < indices.length; t += 3) {
    const ia = indices[t] * 3
    const ib = indices[t + 1] * 3
    const ic = indices[t + 2] * 3
    const v =
      positions[ia] *
        (positions[ib + 1] * positions[ic + 2] - positions[ib + 2] * positions[ic + 1]) -
      positions[ia + 1] *
        (positions[ib] * positions[ic + 2] - positions[ib + 2] * positions[ic]) +
      positions[ia + 2] *
        (positions[ib] * positions[ic + 1] - positions[ib + 1] * positions[ic])
    const root = find(indices[t])
    volume.set(root, (volume.get(root) ?? 0) + v / 6)
  }
  if (volume.size <= 1) return indices
  let maxVol = 0
  for (const v of volume.values()) maxVol = Math.max(maxVol, Math.abs(v))
  const keep = new Set<number>()
  for (const [root, v] of volume) {
    if (Math.abs(v) >= maxVol * 0.3) keep.add(root)
  }
  if (keep.size === volume.size) return indices
  const out = new Uint32Array(indices.length)
  let w = 0
  for (let t = 0; t < indices.length; t += 3) {
    if (keep.has(find(indices[t]))) {
      out[w++] = indices[t]
      out[w++] = indices[t + 1]
      out[w++] = indices[t + 2]
    }
  }
  return out.slice(0, w)
}
