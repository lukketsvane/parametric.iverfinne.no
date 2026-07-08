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

function smoothstep(a: number, b: number, x: number) {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

/* ------------------------------------------------------------------ */
/* VESSEL: thick-walled fluted vessel of revolution (vases, bowls)     */
/*                                                                     */
/* A solid, watertight cup: an outer fluted skin, a smooth inner       */
/* cavity offset inward by a real wall thickness, a solid foot, and a  */
/* thick rim joining the two — so it never reads as a paper-thin shell.*/
/* The flutes are deliberately softened so the default vessel is a     */
/* minimal fluted form rather than a spiky one.                        */
/* ------------------------------------------------------------------ */
function buildVessel(p: SculptureParams, detail: number): THREE.BufferGeometry {
  const Nu = clamp(Math.round(p.fins * 8 * detail), 220, Math.round(512 * detail))
  const Nv = clamp(Math.round(150 * detail), 90, 420)
  const H = 2.9
  const baseR = 1.16
  const wall = 0.16 // radial wall thickness
  const vFloor = 0.12 // interior cavity floor as a fraction of height
  const yAt = (v: number) => (v - 0.5) * H

  function silhouette(v: number) {
    const belly = p.bulge * Math.sin(Math.PI * v)
    const topFlare = p.flare * Math.pow(clamp((v - 0.45) / 0.55, 0, 1), 2.2)
    const foot = 0.14 * Math.pow(1 - v, 2.6)
    return 1 + belly + topFlare - foot
  }
  function outerR(v: number, theta: number) {
    const sil = silhouette(v)
    const finProfile = 1 - p.wavAmount * (0.5 + 0.5 * Math.cos(v * p.waviness * Math.PI * 2))
    const angle = theta + p.twist * Math.PI * 2 * (v - 0.5)
    // rounded ribs (sharpness capped low) that fade to clean rings at the
    // foot and lip — a minimal fluted body rather than a spiky one
    const rib = ridge(p.fins * angle, Math.min(p.finSharpness, 2.6))
    const fade = smoothstep(0.02, 0.24, v) * (1 - 0.65 * smoothstep(0.88, 1, v))
    const flute = 0.5 * p.finDepth * finProfile * fade * rib
    return baseR * sil * (1 + flute)
  }

  const pos: number[] = []
  const idx: number[] = []
  const outerRing: number[] = [] // first vertex index of each outer ring
  const innerRing: number[] = []

  // outer skin, v = 0..1
  for (let j = 0; j <= Nv; j++) {
    const v = j / Nv
    const y = yAt(v)
    outerRing.push(pos.length / 3)
    for (let i = 0; i < Nu; i++) {
      const theta = (i / Nu) * Math.PI * 2
      const r = outerR(v, theta)
      pos.push(Math.cos(theta) * r, y, Math.sin(theta) * r)
    }
  }
  // inner cavity skin, v = vFloor..1 (offset inward by the wall)
  const jFloor = Math.round(vFloor * Nv)
  for (let j = jFloor; j <= Nv; j++) {
    const v = j / Nv
    const y = yAt(v)
    innerRing.push(pos.length / 3)
    for (let i = 0; i < Nu; i++) {
      const theta = (i / Nu) * Math.PI * 2
      const r = Math.max(0.1, outerR(v, theta) - wall)
      pos.push(Math.cos(theta) * r, y, Math.sin(theta) * r)
    }
  }
  const botCenter = pos.length / 3
  pos.push(0, yAt(0), 0)
  const cavCenter = pos.length / 3
  pos.push(0, yAt(jFloor / Nv), 0)

  const quad = (a: number, b: number, c: number, d: number) => {
    idx.push(a, c, b, b, c, d)
  }
  // outer skin
  for (let j = 0; j < Nv; j++) {
    const r0 = outerRing[j], r1 = outerRing[j + 1]
    for (let i = 0; i < Nu; i++) {
      const i2 = (i + 1) % Nu
      quad(r0 + i, r0 + i2, r1 + i, r1 + i2)
    }
  }
  // inner skin (reversed winding so it faces into the cavity)
  const innerRows = innerRing.length
  for (let j = 0; j < innerRows - 1; j++) {
    const r0 = innerRing[j], r1 = innerRing[j + 1]
    for (let i = 0; i < Nu; i++) {
      const i2 = (i + 1) % Nu
      quad(r0 + i2, r0 + i, r1 + i2, r1 + i)
    }
  }
  // thick rim: join the outer and inner top rings
  {
    const ro = outerRing[Nv], ri = innerRing[innerRows - 1]
    for (let i = 0; i < Nu; i++) {
      const i2 = (i + 1) % Nu
      quad(ro + i, ro + i2, ri + i, ri + i2)
    }
  }
  // solid foot: fan the outer bottom ring to a center point
  {
    const r0 = outerRing[0]
    for (let i = 0; i < Nu; i++) {
      const i2 = (i + 1) % Nu
      idx.push(botCenter, r0 + i2, r0 + i)
    }
  }
  // cavity floor: fan the inner bottom ring to a center point
  {
    const r0 = innerRing[0]
    for (let i = 0; i < Nu; i++) {
      const i2 = (i + 1) % Nu
      idx.push(cavCenter, r0 + i, r0 + i2)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3))
  geo.setIndex(idx)
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
export function randomizeParams(form: FormType): SculptureParams {
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
