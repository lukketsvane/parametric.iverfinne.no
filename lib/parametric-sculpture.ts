import * as THREE from "three"

export type FormType = "ring" | "vessel" | "fin"

export type SculptureParams = {
  form: FormType
  /** number of radial fins / ribs */
  fins: number
  /** how far the fins protrude (groove depth) */
  finDepth: number
  /** blade sharpness — low = rounded ridges, high = thin blades */
  finSharpness: number
  /** vertical twist in turns (vessel) / spiral swirl (ring) */
  twist: number
  /** vertical ripple count along the fins */
  waviness: number
  /** ripple / pinch strength */
  wavAmount: number
  /** silhouette belly (positive) or waist pinch (negative) */
  bulge: number
  /** top opening flare (vessel) / vertical flatten (ring) */
  flare: number
}

export const DEFAULT_PARAMS: SculptureParams = {
  form: "ring",
  fins: 34,
  finDepth: 0.62,
  finSharpness: 3.2,
  twist: 0,
  waviness: 2,
  wavAmount: 0.35,
  bulge: 0.15,
  flare: 0.7,
}

export const PARAM_RANGES = {
  fins: { min: 10, max: 64, step: 1 },
  finDepth: { min: 0.12, max: 1.15, step: 0.01 },
  finSharpness: { min: 1, max: 9, step: 0.1 },
  twist: { min: -1.4, max: 1.4, step: 0.02 },
  waviness: { min: 0, max: 6, step: 1 },
  wavAmount: { min: 0, max: 0.6, step: 0.01 },
  bulge: { min: -0.45, max: 0.6, step: 0.01 },
  flare: { min: 0, max: 1.3, step: 0.01 },
} as const

/** sharpened, non-negative periodic ridge in [0,1] */
function ridge(x: number, sharpness: number) {
  const c = 0.5 + 0.5 * Math.cos(x)
  return Math.pow(c, sharpness)
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

/* ------------------------------------------------------------------ */
/* VESSEL: revolved corrugated shell (vases, domes, tumblers)          */
/* ------------------------------------------------------------------ */
function buildVessel(p: SculptureParams, detail: number): THREE.BufferGeometry {
  const Nu = clamp(Math.round(p.fins * 8 * detail), 220, Math.round(512 * detail))
  const Nv = Math.round(168 * detail)
  const H = 3.2
  const baseR = 1.05

  const positions: number[] = []
  const rows = Nv + 1

  for (let j = 0; j < rows; j++) {
    const v = j / Nv // 0..1 bottom→top
    // silhouette: belly + top flare + slight foot taper
    const belly = p.bulge * Math.sin(Math.PI * v)
    const topFlare = p.flare * Math.pow(clamp((v - 0.45) / 0.55, 0, 1), 2.2)
    const foot = 0.16 * Math.pow(1 - v, 2.5) // subtle base
    const silhouette = 1 + belly + topFlare - foot
    // fins pinch/bulge along height for the perforated look
    const finProfile = 1 - p.wavAmount * (0.5 + 0.5 * Math.cos(v * p.waviness * Math.PI * 2))
    const y = (v - 0.5) * H

    for (let i = 0; i < Nu; i++) {
      const u = i / Nu
      const theta = u * Math.PI * 2
      const angle = theta + p.twist * Math.PI * 2 * (v - 0.5)
      const r = baseR * silhouette * (1 + p.finDepth * finProfile * ridge(p.fins * angle, p.finSharpness))
      positions.push(Math.cos(theta) * r, y, Math.sin(theta) * r)
    }
  }

  const indices: number[] = []
  for (let j = 0; j < Nv; j++) {
    for (let i = 0; i < Nu; i++) {
      const i2 = (i + 1) % Nu
      const a = j * Nu + i
      const b = j * Nu + i2
      const c = (j + 1) * Nu + i
      const d = (j + 1) * Nu + i2
      indices.push(a, c, b, b, c, d)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  geo.center()
  return geo
}

/* ------------------------------------------------------------------ */
/* RING: corrugated torus (fin wheels, coiled donuts)                  */
/* ------------------------------------------------------------------ */
function buildRing(p: SculptureParams, detail: number): THREE.BufferGeometry {
  const Nu = clamp(Math.round(p.fins * 10 * detail), 260, Math.round(720 * detail)) // around the ring
  const Nv = Math.round(64 * detail) // cross-section
  const Rmain = 1.5
  const tube = 0.5 * (1 + p.bulge * 0.6)
  const flatten = 0.55 + p.flare * 0.75 // vertical squash of the wheel

  const positions: number[] = []

  for (let j = 0; j < Nv; j++) {
    const psi = (j / Nv) * Math.PI * 2
    for (let i = 0; i < Nu; i++) {
      const phi = (i / Nu) * Math.PI * 2
      // spiral swirl + vertical ripple woven into the fins
      const swirl = p.twist * 2 * Math.sin(psi)
      const wav = 1 - p.wavAmount * (0.5 + 0.5 * Math.cos(psi * p.waviness))
      const rid = ridge(p.fins * phi + swirl, p.finSharpness)
      const rt = tube * (1 + p.finDepth * 1.15 * wav * rid)
      const rr = Rmain + rt * Math.cos(psi)
      positions.push(Math.cos(phi) * rr, rt * Math.sin(psi) * flatten, Math.sin(phi) * rr)
    }
  }

  const indices: number[] = []
  for (let j = 0; j < Nv; j++) {
    const j2 = (j + 1) % Nv
    for (let i = 0; i < Nu; i++) {
      const i2 = (i + 1) % Nu
      const a = j * Nu + i
      const b = j * Nu + i2
      const c = j2 * Nu + i
      const d = j2 * Nu + i2
      indices.push(a, c, b, b, c, d)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  geo.center()
  return geo
}

/**
 * ring/vessel only — "fin" sculptures are built by lib/fin-sculpture.ts.
 * `detail` scales the tessellation (1 = normal, higher = denser mesh).
 */
export function buildSculpture(p: SculptureParams, detail = 1): THREE.BufferGeometry {
  return p.form === "ring" ? buildRing(p, detail) : buildVessel(p, detail)
}

/* ------------------------------------------------------------------ */
/* Presets inspired by the reference celadon forms                     */
/* ------------------------------------------------------------------ */
export const PRESETS: { name: string; params: SculptureParams }[] = [
  { name: "Coil", params: { form: "ring", fins: 44, finDepth: 0.7, finSharpness: 4, twist: 0, waviness: 2, wavAmount: 0.45, bulge: 0.1, flare: 0.35 } },
  { name: "Wheel", params: { form: "ring", fins: 40, finDepth: 0.85, finSharpness: 5.5, twist: 0, waviness: 1, wavAmount: 0.2, bulge: 0.05, flare: 0.15 } },
  { name: "Reef", params: { form: "ring", fins: 30, finDepth: 1.0, finSharpness: 2.2, twist: 0.5, waviness: 3, wavAmount: 0.5, bulge: 0.2, flare: 0.5 } },
  { name: "Bloom", params: { form: "vessel", fins: 26, finDepth: 0.8, finSharpness: 3, twist: 0, waviness: 0, wavAmount: 0.1, bulge: 0.45, flare: 1.15 } },
  { name: "Column", params: { form: "vessel", fins: 22, finDepth: 0.72, finSharpness: 4.5, twist: 0, waviness: 0, wavAmount: 0, bulge: 0.08, flare: 0.15 } },
  { name: "Twist", params: { form: "vessel", fins: 30, finDepth: 0.6, finSharpness: 3.5, twist: 0.85, waviness: 0, wavAmount: 0, bulge: 0.2, flare: 0.3 } },
  { name: "Weave", params: { form: "vessel", fins: 20, finDepth: 0.7, finSharpness: 2.4, twist: 0.15, waviness: 3, wavAmount: 0.5, bulge: 0.3, flare: 0.2 } },
  { name: "Spire", params: { form: "vessel", fins: 34, finDepth: 0.55, finSharpness: 5, twist: -0.3, waviness: 1, wavAmount: 0.25, bulge: -0.2, flare: 0.9 } },
]

const RR = PARAM_RANGES
function rand(min: number, max: number) {
  return min + Math.random() * (max - min)
}
export function randomizeParams(): SculptureParams {
  const form: FormType = Math.random() < 0.5 ? "ring" : "vessel"
  return {
    form,
    fins: Math.round(rand(RR.fins.min, RR.fins.max)),
    finDepth: +rand(0.35, RR.finDepth.max).toFixed(2),
    finSharpness: +rand(RR.finSharpness.min, RR.finSharpness.max).toFixed(1),
    twist: +rand(RR.twist.min, RR.twist.max).toFixed(2),
    waviness: Math.round(rand(RR.waviness.min, RR.waviness.max)),
    wavAmount: +rand(RR.wavAmount.min, RR.wavAmount.max).toFixed(2),
    bulge: +rand(RR.bulge.min, RR.bulge.max).toFixed(2),
    flare: +rand(RR.flare.min, RR.flare.max).toFixed(2),
  }
}
