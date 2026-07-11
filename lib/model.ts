/**
 * The sculpture model's public parameter space.
 *
 * One generative model covers every reference piece: a stack of two
 * bodies of revolution (bottom body + top crown), each defined by a
 * lathe profile (base / belly / top radii, belly height, roundness,
 * optional flared foot) and studded with rings of protrusions — lathed
 * thorns that read as spikes, spheres that read as bobbles, or
 * alternating rows of both. Ball feet, an apex ornament (spike or ball) and a
 * two-glaze ceramic palette complete the space. Every reference photo
 * is a single point in this space; the sliders move between them.
 *
 * This module is UI-facing and dependency-free. The geometry itself is
 * built in lib/build.ts and mounted by components/sculpture.tsx.
 */

export type ParamKey =
  // bottom body — form
  | "hB"
  | "footH"
  | "footR"
  | "rBaseB"
  | "rMaxB"
  | "bellyB"
  | "rTopB"
  | "roundB"
  // bottom body — studs
  | "ringsB"
  | "perRingB"
  | "shapeB"
  | "sizeB"
  | "aspectB"
  | "alignB"
  | "bandLoB"
  | "bandHiB"
  // top crown — form
  | "hT"
  | "rBaseT"
  | "rMaxT"
  | "bellyT"
  | "rTopT"
  | "roundT"
  // top crown — studs
  | "ringsT"
  | "perRingT"
  | "shapeT"
  | "sizeT"
  | "aspectT"
  | "alignT"
  | "bandLoT"
  | "bandHiT"
  // apex ornament + ball feet
  | "apexType"
  | "apexH"
  | "apexR"
  | "feet"
  | "feetR"
  // surface
  | "stagger"
  | "jitter"
  | "gloss"
  | "glazeB"
  | "glazeT"

export type ParamRange = { min: number; max: number; step: number }

export type Params = { seed: number } & Record<ParamKey, number>

export const PARAM_RANGES: Record<ParamKey, ParamRange> = {
  hB: { min: 0.3, max: 2.0, step: 0.01 },
  footH: { min: 0, max: 0.45, step: 0.01 },
  footR: { min: 0, max: 0.7, step: 0.01 },
  rBaseB: { min: 0.05, max: 0.8, step: 0.01 },
  rMaxB: { min: 0.1, max: 0.9, step: 0.01 },
  bellyB: { min: 0, max: 1, step: 0.01 },
  rTopB: { min: 0.02, max: 0.7, step: 0.01 },
  roundB: { min: 0.6, max: 3.5, step: 0.05 },

  ringsB: { min: 0, max: 14, step: 1 },
  perRingB: { min: 3, max: 20, step: 1 },
  shapeB: { min: 0, max: 1, step: 0.05 },
  sizeB: { min: 0.02, max: 0.2, step: 0.005 },
  aspectB: { min: 0.8, max: 6, step: 0.1 },
  alignB: { min: 0, max: 1, step: 0.05 },
  bandLoB: { min: 0, max: 0.6, step: 0.01 },
  bandHiB: { min: 0.3, max: 1, step: 0.01 },

  hT: { min: 0, max: 1.2, step: 0.01 },
  rBaseT: { min: 0.02, max: 0.5, step: 0.01 },
  rMaxT: { min: 0.02, max: 0.5, step: 0.01 },
  bellyT: { min: 0, max: 1, step: 0.01 },
  rTopT: { min: 0.01, max: 0.4, step: 0.01 },
  roundT: { min: 0.6, max: 3.5, step: 0.05 },

  ringsT: { min: 0, max: 8, step: 1 },
  perRingT: { min: 2, max: 20, step: 1 },
  shapeT: { min: 0, max: 1, step: 0.05 },
  sizeT: { min: 0.02, max: 0.2, step: 0.005 },
  aspectT: { min: 0.8, max: 6, step: 0.1 },
  alignT: { min: 0, max: 1, step: 0.05 },
  bandLoT: { min: 0, max: 0.7, step: 0.01 },
  bandHiT: { min: 0.2, max: 1, step: 0.01 },

  apexType: { min: 0, max: 2, step: 1 }, // 0 none · 1 spike · 2 ball
  apexH: { min: 0.05, max: 0.6, step: 0.01 },
  apexR: { min: 0.02, max: 0.16, step: 0.005 },
  feet: { min: 0, max: 8, step: 1 },
  feetR: { min: 0.08, max: 0.22, step: 0.005 },

  stagger: { min: 0, max: 1, step: 0.05 },
  jitter: { min: 0, max: 0.4, step: 0.01 },
  gloss: { min: 0, max: 1, step: 0.05 }, // 0 dry satin · 1 wet glaze
  glazeB: { min: 0, max: 14, step: 1 },
  glazeT: { min: 0, max: 14, step: 1 },
}

/** Ceramic glaze palette sampled from the reference pieces. */
export const GLAZES: { name: string; hex: string }[] = [
  { name: "porcelain", hex: "#f1efe9" },
  { name: "cream", hex: "#e9e1d3" },
  { name: "fog", hex: "#c9c8d4" },
  { name: "ash", hex: "#98979d" },
  { name: "chartreuse", hex: "#d8d63e" },
  { name: "butter", hex: "#e6df8e" },
  { name: "nude", hex: "#d9b7a1" },
  { name: "blush", hex: "#eec5b8" },
  { name: "rose", hex: "#c49691" },
  { name: "caramel", hex: "#b9785a" },
  { name: "mauve", hex: "#a37b73" },
  { name: "sky", hex: "#7cc7dd" },
  { name: "petrol", hex: "#1d6e88" },
  { name: "coral", hex: "#de5a33" },
  { name: "noir", hex: "#2c2b2e" },
]

export const glazeHex = (i: number) =>
  GLAZES[Math.min(GLAZES.length - 1, Math.max(0, Math.round(i)))].hex

/** Slider layout for the full controls panel. */
export const SECTIONS: {
  title: string
  keys: { key: ParamKey; label: string }[]
}[] = [
  {
    title: "body · form",
    keys: [
      { key: "hB", label: "height" },
      { key: "footH", label: "foot h" },
      { key: "footR", label: "foot r" },
      { key: "rBaseB", label: "base" },
      { key: "rMaxB", label: "belly" },
      { key: "bellyB", label: "belly y" },
      { key: "rTopB", label: "top" },
      { key: "roundB", label: "round" },
    ],
  },
  {
    title: "body · studs",
    keys: [
      { key: "ringsB", label: "rings" },
      { key: "perRingB", label: "per ring" },
      { key: "shapeB", label: "pattern" },
      { key: "sizeB", label: "size" },
      { key: "aspectB", label: "length" },
      { key: "alignB", label: "align" },
      { key: "bandLoB", label: "from" },
      { key: "bandHiB", label: "to" },
    ],
  },
  {
    title: "crown · form",
    keys: [
      { key: "hT", label: "height" },
      { key: "rBaseT", label: "base" },
      { key: "rMaxT", label: "belly" },
      { key: "bellyT", label: "belly y" },
      { key: "rTopT", label: "top" },
      { key: "roundT", label: "round" },
    ],
  },
  {
    title: "crown · studs",
    keys: [
      { key: "ringsT", label: "rings" },
      { key: "perRingT", label: "per ring" },
      { key: "shapeT", label: "pattern" },
      { key: "sizeT", label: "size" },
      { key: "aspectT", label: "length" },
      { key: "alignT", label: "align" },
      { key: "bandLoT", label: "from" },
      { key: "bandHiT", label: "to" },
    ],
  },
  {
    title: "apex · feet",
    keys: [
      { key: "apexType", label: "apex" },
      { key: "apexH", label: "apex h" },
      { key: "apexR", label: "apex r" },
      { key: "feet", label: "feet" },
      { key: "feetR", label: "feet r" },
    ],
  },
  {
    title: "surface",
    keys: [
      { key: "stagger", label: "stagger" },
      { key: "jitter", label: "jitter" },
      { key: "gloss", label: "gloss" },
    ],
  },
]

/**
 * Glaze pairings lifted from the reference pieces. These are the only
 * "presets" the UI offers — pure color/material choices. The form always
 * comes from the sliders; a combo never touches a geometry parameter.
 */
export const COMBOS: { name: string; glazeB: number; glazeT: number }[] = [
  { name: "chartreuse", glazeB: 4, glazeT: 2 },
  { name: "butter", glazeB: 5, glazeT: 0 },
  { name: "nude", glazeB: 6, glazeT: 6 },
  { name: "caramel", glazeB: 9, glazeT: 1 },
  { name: "rose", glazeB: 8, glazeT: 11 },
  { name: "sky", glazeB: 11, glazeT: 10 },
  { name: "coral", glazeB: 13, glazeT: 7 },
  { name: "petrol", glazeB: 12, glazeT: 12 },
  { name: "porcelain", glazeB: 0, glazeT: 3 },
  { name: "chalk", glazeB: 0, glazeT: 0 },
]

/** Two-finger scroll on the canvas sweeps these parameters. */
export const NUDGE_PARAMS: Record<"vertical" | "horizontal", ParamKey> = {
  vertical: "rMaxB",
  horizontal: "sizeB",
}

export const DEFAULT_PARAMS: Params = {
  seed: 7,
  hB: 1.05, footH: 0, footR: 0, rBaseB: 0.3, rMaxB: 0.72, bellyB: 0.55, rTopB: 0.26, roundB: 2.2,
  ringsB: 10, perRingB: 16, shapeB: 0, sizeB: 0.07, aspectB: 2.8, alignB: 1, bandLoB: 0.05, bandHiB: 0.97,
  hT: 0.9, rBaseT: 0.32, rMaxT: 0.32, bellyT: 0.05, rTopT: 0.08, roundT: 1,
  ringsT: 5, perRingT: 4, shapeT: 0, sizeT: 0.055, aspectT: 5.6, alignT: 0, bandLoT: 0.14, bandHiT: 0.88,
  apexType: 1, apexH: 0.34, apexR: 0.05, feet: 0, feetR: 0.12,
  stagger: 0.5, jitter: 0.1, gloss: 1, glazeB: 4, glazeT: 2,
}

/** Deterministic PRNG — the only source of "handmade" irregularity. */
export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const randomSeed = () => Math.floor(Math.random() * 9000) + 1000

const quant = (v: number, r: ParamRange) => {
  const q = Math.round((v - r.min) / r.step) * r.step + r.min
  return +Math.min(r.max, Math.max(r.min, q)).toFixed(4)
}

/**
 * Every piece deserves a name, like the reference pieces have. The word
 * is drawn from small pools keyed to what the form actually is — the
 * crown archetype, plus the body's dominant texture when it's extreme —
 * and the pick is seeded, so a piece keeps its name while its sliders
 * move within the same family and the URL reproduces name and all.
 */
const NAME_POOLS = {
  flat: ["drum", "stump", "pouf", "keg", "loaf", "puck"],
  neck: ["flask", "horn", "gourd", "bugle", "ewer", "stem"],
  dome: ["onion", "bulb", "poppy", "bud", "drop", "lamp"],
  roof: ["hut", "tent", "shroom", "fir", "pawn", "gnome"],
  tower: ["tower", "pine", "mast", "turret", "husk", "cob"],
  spiky: ["burr", "thistle", "quill", "nettle", "bramble"],
  bobbly: ["berry", "grape", "pearl", "roe", "pebble", "knot"],
}

export function designName(p: Params): string {
  let pool: readonly string[]
  if (p.hT <= 0.03) pool = NAME_POOLS.flat
  else if (p.rTopT > p.rMaxT * 1.25) pool = NAME_POOLS.neck
  else if (p.rBaseT < p.rMaxT * 0.5) pool = NAME_POOLS.dome
  else if (Math.round(p.ringsT) >= 2 && p.hT > 0.25) pool = NAME_POOLS.tower
  else pool = NAME_POOLS.roof
  const ringsB = Math.round(p.ringsB)
  const spiky =
    ringsB * Math.round(p.perRingB) >= 60 && p.aspectB >= 3 && p.shapeB <= 0.3
  const bobbly = p.shapeB >= 0.8 && p.sizeB >= 0.09 && ringsB >= 2
  if (spiky) pool = pool.concat(NAME_POOLS.spiky)
  if (bobbly) pool = pool.concat(NAME_POOLS.bobbly)
  const r = mulberry32((p.seed * 2246822519) >>> 0)()
  return pool[Math.floor(r * pool.length)]
}

/** Seed of the day — everyone who visits today fires the same piece. */
export function dailySeed(): number {
  const d = new Date()
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

/**
 * Rebuild a Params from untrusted input (URL hash, stored shelf), field
 * by field: every number is clamped into its range, everything else is
 * ignored. Returns null when the input isn't an object at all.
 */
export function clampParams(obj: unknown, base: Params): Params | null {
  if (!obj || typeof obj !== "object") return null
  const next = { ...base }
  for (const k of Object.keys(PARAM_RANGES) as ParamKey[]) {
    const v = (obj as Record<string, unknown>)[k]
    if (typeof v === "number" && Number.isFinite(v)) {
      const r = PARAM_RANGES[k]
      next[k] = Math.min(r.max, Math.max(r.min, v))
    }
  }
  const seed = (obj as Record<string, unknown>).seed
  if (typeof seed === "number" && Number.isFinite(seed)) {
    next.seed = Math.floor(seed)
  }
  return next
}

/** Crown parameters + apex ornament, as one coherent choice. */
type CrownPick = Pick<
  Params,
  | "hT" | "rBaseT" | "rMaxT" | "bellyT" | "rTopT" | "roundT"
  | "ringsT" | "perRingT" | "shapeT" | "sizeT" | "aspectT" | "alignT"
  | "bandLoT" | "bandHiT" | "apexType" | "apexH" | "apexR"
>

/**
 * A tasteful random point in the space — still fully seed-reproducible.
 *
 * The body samples freely, but the crown is drawn as one of the
 * archetypes the reference pieces use — a studded tower, a clean roof
 * cone with studded eaves, a ballooning dome or head, a trumpet neck,
 * or no crown at all. Sampling each crown parameter independently kept
 * producing chimeras (an egg wearing a coronet, a bare pipe with one
 * ruffle ring); picking the archetype first keeps the junction and the
 * studding telling a single story.
 */
export function randomizeParams(seed: number): Params {
  const rnd = mulberry32(seed * 2654435761)
  const pick = (k: ParamKey, lo = 0, hi = 1) => {
    const r = PARAM_RANGES[k]
    const span = r.max - r.min
    return quant(r.min + span * (lo + (hi - lo) * rnd()), r)
  }
  // absolute-valued sampling, for parameters that must relate to others
  const U = (a: number, b: number) => a + (b - a) * rnd()
  const val = (k: ParamKey, v: number) => quant(v, PARAM_RANGES[k])

  const body = {
    hB: pick("hB", 0.25, 0.85),
    footH: rnd() < 0.25 ? pick("footH", 0.4, 0.9) : 0,
    footR: pick("footR", 0.45, 0.8),
    rBaseB: pick("rBaseB", 0.2, 0.8),
    rMaxB: pick("rMaxB", 0.35, 0.85),
    bellyB: pick("bellyB", 0.1, 0.9),
    rTopB: pick("rTopB", 0.1, 0.6),
    roundB: pick("roundB", 0.2, 0.85),
    ringsB: pick("ringsB", 0.15, 0.95),
    perRingB: pick("perRingB", 0.2, 0.9),
    shapeB: rnd() < 0.5 ? (rnd() < 0.6 ? 0 : 1) : pick("shapeB"),
    sizeB: pick("sizeB", 0.2, 0.8),
    aspectB: pick("aspectB", 0.15, 0.75),
    alignB: pick("alignB"),
    bandLoB: pick("bandLoB", 0, 0.5),
    bandHiB: pick("bandHiB", 0.6, 1),
  }

  // studs off, neutral values — used by every quiet (unstudded) crown
  const quiet = {
    ringsT: 0, perRingT: 8, shapeT: 0, sizeT: 0.05,
    aspectT: 2, alignT: 0.5, bandLoT: 0.1, bandHiT: 0.9,
  }
  const noApex = { apexType: 0, apexH: 0.2, apexR: 0.06 }

  let crown: CrownPick
  const arch = rnd()
  if (arch < 0.14) {
    // no crown — the body carries the piece (totem, spool)
    crown = {
      hT: 0, rBaseT: 0.2, rMaxT: 0.2, bellyT: 0.5, rTopT: 0.15, roundT: 1,
      ...quiet, ...noApex,
    }
  } else if (arch < 0.42) {
    // tower: a studded drum or cone sized to the body's mouth (durian, bell)
    const rBase = val("rBaseT", body.rTopB * U(0.85, 1.25))
    crown = {
      hT: pick("hT", 0.35, 0.85),
      rBaseT: rBase,
      rMaxT: val("rMaxT", rBase * U(0.95, 1.12)),
      bellyT: val("bellyT", U(0.05, 0.5)),
      rTopT: val("rTopT", Math.max(0.04, rBase * U(0.3, 0.95))),
      roundT: val("roundT", U(0.9, 1.5)),
      ringsT: Math.round(U(2, 6)),
      perRingT: Math.round(U(5, 16)),
      shapeT: rnd() < 0.65 ? 0 : rnd() < 0.5 ? 1 : val("shapeT", U(0.2, 0.6)),
      sizeT: val("sizeT", U(0.035, 0.075)),
      aspectT: val("aspectT", rnd() < 0.35 ? U(3.2, 5.8) : U(1.6, 3)),
      alignT: val("alignT", rnd() < 0.5 ? U(0, 0.25) : U(0.6, 1)),
      bandLoT: val("bandLoT", U(0.05, 0.2)),
      bandHiT: val("bandHiT", U(0.75, 0.95)),
      apexType: rnd() < 0.45 ? 1 : 0,
      apexH: pick("apexH", 0.3, 0.75),
      apexR: pick("apexR", 0.15, 0.5),
    }
  } else if (arch < 0.62) {
    // roof: a clean cone overhanging the mouth, at most studded at the
    // eaves (spore, cactus)
    const rBase = val("rBaseT", body.rTopB * U(1.05, 1.7))
    const eaves = rnd() >= 0.55
    crown = {
      hT: pick("hT", 0.3, 0.7),
      rBaseT: rBase,
      rMaxT: val("rMaxT", rBase),
      bellyT: val("bellyT", U(0.02, 0.08)),
      rTopT: val("rTopT", U(0.02, 0.05)),
      roundT: val("roundT", U(0.95, 1.25)),
      ...(eaves
        ? {
            ringsT: Math.round(U(1, 4)),
            perRingT: Math.round(U(8, 16)),
            shapeT: 0,
            sizeT: val("sizeT", U(0.03, 0.06)),
            aspectT: val("aspectT", U(1.8, 3)),
            alignT: val("alignT", U(0.6, 1)),
            bandLoT: val("bandLoT", U(0.02, 0.08)),
            bandHiT: val("bandHiT", U(0.25, 0.5)),
          }
        : quiet),
      ...noApex,
    }
  } else if (arch < 0.86) {
    // dome: an onion or head ballooning from a narrow waist, often
    // wearing an apex ornament or one bobble ring (sputnik, doll, bobble)
    const ringed = rnd() >= 0.6
    const lo = U(0.42, 0.5)
    crown = {
      hT: pick("hT", 0.35, 0.7),
      rBaseT: val("rBaseT", U(0.04, 0.09)),
      rMaxT: val("rMaxT", U(0.2, Math.max(0.24, Math.min(0.38, body.rTopB * 1.9)))),
      bellyT: val("bellyT", U(0.35, 0.6)),
      rTopT: val("rTopT", U(0.02, 0.045)),
      roundT: val("roundT", U(2.7, 3.45)),
      ...(ringed
        ? {
            ringsT: 1,
            perRingT: Math.round(U(3, 9)),
            shapeT: 1,
            sizeT: val("sizeT", U(0.09, 0.13)),
            aspectT: 1,
            alignT: val("alignT", U(0, 0.35)),
            bandLoT: val("bandLoT", lo),
            bandHiT: val("bandHiT", lo + U(0.12, 0.18)),
          }
        : quiet),
      ...(rnd() < 0.65
        ? rnd() < 0.5
          ? { apexType: 1, apexH: val("apexH", U(0.3, 0.5)), apexR: val("apexR", U(0.06, 0.09)) }
          : { apexType: 2, apexH: val("apexH", U(0.08, 0.16)), apexR: val("apexR", U(0.07, 0.12)) }
        : noApex),
    }
  } else {
    // neck: a narrow trumpet flaring open at the lip (fins, urchin)
    crown = {
      hT: pick("hT", 0.25, 0.5),
      rBaseT: val("rBaseT", U(0.07, 0.12)),
      rMaxT: val("rMaxT", U(0.08, 0.13)),
      bellyT: val("bellyT", U(0.2, 0.4)),
      rTopT: val("rTopT", U(0.18, 0.3)),
      roundT: val("roundT", U(1.4, 2.2)),
      ...quiet, ...noApex,
    }
  }

  const p: Params = {
    seed,
    ...body,
    ...crown,
    feet: rnd() < 0.35 ? pick("feet", 0.35, 1) : 0,
    feetR: pick("feetR", 0.3, 0.9),
    stagger: rnd() < 0.7 ? 0.5 : pick("stagger"),
    jitter: pick("jitter", 0.1, 0.6),
    gloss: rnd() < 0.75 ? 1 : pick("gloss", 0.05, 0.4),
    glazeB: pick("glazeB"),
    glazeT: pick("glazeT"),
  }
  // keep the silhouette sane: belly is the widest ring of the body
  p.rMaxB = Math.max(p.rMaxB, p.rBaseB + 0.05, p.rTopB + 0.05)
  if (p.bandHiB - p.bandLoB < 0.15) p.bandHiB = quant(p.bandLoB + 0.3, PARAM_RANGES.bandHiB)
  // two glazes that actually differ
  if (p.glazeT === p.glazeB) p.glazeT = (p.glazeB + 3) % GLAZES.length
  return p
}
