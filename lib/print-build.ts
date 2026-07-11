import * as THREE from "three"
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js"
import { mulberry32 } from "./model"
import { inkHex, type PrintParams } from "./print-model"

/**
 * Deterministic geometry for the print engine. A piece is one or two
 * ribbed shells — a body and an optional cup — each generated as a
 * parametric surface: radius(θ, t) = profile(t) · lobing(θ, t) ·
 * ribbing(θ) + relief(θ, t). Nothing here is shared with the ceramics
 * builder; prints are machine-precise (no thrown wobble) — their
 * character is the extrusion rib, the lobed cross-section and the
 * candy filament.
 */
export type PrintBuilt = {
  base: THREE.BufferGeometry
  cup: THREE.BufferGeometry | null
  fit: { r: number; cy: number }
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const smooth = (a: number, b: number, x: number) => {
  const u = clamp01((x - a) / (b - a))
  return u * u * (3 - 2 * u)
}
const TAU = Math.PI * 2

/** Catmull-Rom through profile samples — sculpted by eye, read as clay. */
function sampleProfile(samples: number[], t: number): number {
  const n = samples.length - 1
  const x = clamp01(t) * n
  const i = Math.min(n - 1, Math.floor(x))
  const u = x - i
  const p0 = samples[Math.max(0, i - 1)]
  const p1 = samples[i]
  const p2 = samples[i + 1]
  const p3 = samples[Math.min(n, i + 2)]
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * u +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u +
      (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u)
  )
}

/** Cross-section lobing: broad lobes with pinched valleys (clover,
 * flower), a rounded square (boxy — the pagoda lamp), or deep round
 * gadroon flutes (melon — the lilac lantern). Radius offset around 0. */
function lobeOffset(kind: number, a: number): number {
  if (kind <= 0) return 0
  if (kind === 1) return 0.05 * Math.cos(4 * a) // soft
  if (kind === 4) {
    // boxy: superellipse cross-section, tamed so the area stays close
    const k = 4.2
    const m = Math.pow(
      Math.pow(Math.abs(Math.cos(a)), k) + Math.pow(Math.abs(Math.sin(a)), k),
      -1 / k,
    )
    return m * 0.94 - 1
  }
  if (kind === 5) {
    // melon: 18 gadroon segments — round bellies, creased valleys
    const s = Math.abs(Math.sin(9 * a))
    return 0.055 * (1 - 2 * Math.pow(s, 1.3))
  }
  const n = kind === 2 ? 4 : 5
  const amp = kind === 2 ? 0.13 : 0.17
  const s = Math.abs(Math.sin((n * a) / 2))
  return amp * (1 - 2 * Math.pow(s, 5))
}

type ShellOpts = {
  radial: number
  rows: number
  y0: number
  h: number
  profile: (t: number) => number
  scale: number
  lobeKind: number
  lobeMul?: (t: number) => number // fade lobing along height
  ribN: number
  ribA: number
  wave?: { amp: number; freq: number }
  twist?: number // radians of helical drift over the full height
  relief?: (a: number, t: number) => number // additive, in units of scale
  color: THREE.Color
  fade?: { to: THREE.Color; f: (t: number) => number }
  capBottom: boolean
  top: "lip" | "dome" | "raw"
}

function shellGeo(o: ShellOpts): THREE.BufferGeometry {
  const tw = o.twist ?? 0
  const radiusAt = (t: number, a: number): number => {
    let R = o.profile(t)
    if (o.wave) {
      // with twist the wave crest climbs the wall as a helix
      const phase = o.wave.freq * t * TAU + (tw > 0 ? a : 0)
      R *= 1 + o.wave.amp * Math.sin(phase) * smooth(0, 0.18, t)
    }
    const lm = o.lobeMul ? o.lobeMul(t) : 1
    const aa = a + tw * t // lobes rotate with height
    let r = R * (1 + lobeOffset(o.lobeKind, aa) * lm) * (1 + o.ribA * Math.sin(o.ribN * a))
    if (o.relief) r += o.relief(a, t)
    return Math.max(0.003, r * o.scale)
  }

  // ring rows: the wall, then an inner lip / dome cap when asked
  const rings: { t: number; y: number; mul: number }[] = []
  for (let i = 0; i <= o.rows; i++) {
    const t = i / o.rows
    rings.push({ t, y: o.y0 + t * o.h, mul: 1 })
  }
  if (o.top === "lip") {
    rings.push({ t: 1, y: o.y0 + o.h - 0.006 * o.h, mul: 0.965 })
    rings.push({ t: 1, y: o.y0 + o.h * 0.86, mul: 0.93 })
  } else if (o.top === "dome") {
    rings.push({ t: 1, y: o.y0 + o.h * 1.015, mul: 0.72 })
    rings.push({ t: 1, y: o.y0 + o.h * 1.028, mul: 0.42 })
  }

  const cols = o.radial
  const pos: number[] = []
  const col: number[] = []
  const c = new THREE.Color()
  for (const ring of rings) {
    const f = o.fade ? o.fade.f(ring.t) : 0
    c.copy(o.color)
    if (o.fade && f > 0) c.lerp(o.fade.to, f)
    for (let j = 0; j < cols; j++) {
      const a = (j / cols) * TAU
      const r = radiusAt(ring.t, a) * ring.mul
      pos.push(r * Math.cos(a), ring.y, r * Math.sin(a))
      col.push(c.r, c.g, c.b)
    }
  }
  const idx: number[] = []
  for (let i = 0; i < rings.length - 1; i++) {
    const r0 = i * cols
    const r1 = (i + 1) * cols
    for (let j = 0; j < cols; j++) {
      const j1 = (j + 1) % cols
      idx.push(r0 + j, r1 + j, r1 + j1, r0 + j, r1 + j1, r0 + j1)
    }
  }
  // bottom cap (fan) and top closing vertex
  if (o.capBottom) {
    const ci = pos.length / 3
    pos.push(0, o.y0, 0)
    col.push(col[0], col[1], col[2])
    for (let j = 0; j < cols; j++) {
      const j1 = (j + 1) % cols
      idx.push(ci, j1, j)
    }
  }
  if (o.top === "dome") {
    const last = (rings.length - 1) * cols
    const ci = pos.length / 3
    pos.push(0, o.y0 + o.h * 1.03, 0)
    col.push(col[last * 3], col[last * 3 + 1], col[last * 3 + 2])
    for (let j = 0; j < cols; j++) {
      const j1 = (j + 1) % cols
      idx.push(ci, last + j, last + j1)
    }
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pos), 3))
  g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(col), 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

// body silhouettes — foot to shoulder, radius relative to 1
const BODY_PROFILES: number[][] = [
  [0.9, 0.985, 1, 1, 1, 1, 0.995, 0.97, 0.9, 0.8], // pill
  [0.76, 0.92, 1.01, 1.04, 1.01, 0.94, 0.85, 0.77, 0.71, 0.68], // bulb
  [0.6, 0.78, 0.95, 1.04, 1.05, 0.97, 0.83, 0.66, 0.54, 0.48], // urn
  [1.05, 1, 0.97, 0.955, 0.95, 0.95, 0.955, 0.965, 0.975, 0.98], // column
]

// cup silhouettes — collar to rim
const CUP_PROFILES: number[][] = [
  [], // none
  [0.3, 0.3, 0.33, 0.48, 0.78, 0.98, 1.07, 1.08, 1.01, 0.92], // goblet
  [0.44, 0.46, 0.5, 0.56, 0.64, 0.74, 0.86, 0.98, 1.1, 1.2], // trumpet
  [0.5, 0.62, 0.74, 0.84, 0.92, 0.97, 1.01, 1.04, 1.06, 1.07], // petal
  [1, 1, 1, 1, 1, 1, 1, 1, 0.99, 0.98], // turbine neck
  [1, 1.06, 1.11, 1.12, 1.08, 1, 0.88, 0.74, 0.6, 0.51], // bell
]

export function buildPrint(p: PrintParams, hiDetail: boolean): PrintBuilt {
  const rnd = mulberry32(p.seed >>> 0)
  const cup = Math.round(p.cup)
  const form = Math.round(p.form)
  const lobes = Math.round(p.lobes)
  const waves = Math.round(p.waves)
  const twist = Math.round(p.twist) === 1 ? 2.1 : 0
  const relief = Math.round(p.relief)
  const stature = Math.round(p.stature)
  const boldRibs = Math.round(p.ribs) === 1

  const ribN = boldRibs ? 62 : 118
  const ribA = boldRibs ? 0.028 : 0.011
  const radial = Math.min(760, Math.round(ribN * (hiDetail ? 6 : 4.6)))
  const rows = relief === 2 ? 150 : 104

  // proportions — flow rides the gestures, the seed breathes a little
  const breathe = 1 + (rnd() - 0.5) * 0.05
  const baseH = [0.85, 1.25, 1.62][stature] * breathe
  const baseR = [0.56, 0.6, 0.58, 0.48][form] * [1.05, 1, 0.95][stature]
  const flowWarp = 0.72 + 0.56 * clamp01(p.flow)

  const inkB = new THREE.Color(inkHex(p.inkBase))
  const inkC = new THREE.Color(inkHex(p.inkCup))
  const fadeTo = new THREE.Color("#f7f4ee")

  // body relief: seeded pill capsules or a knurled diamond grid
  let reliefFn: ((a: number, t: number) => number) | undefined
  if (relief === 1) {
    const pills: { a: number; t: number; len: number }[] = []
    const nP = 8 + Math.floor(rnd() * 4)
    for (let i = 0; i < nP; i++) {
      pills.push({ a: rnd() * TAU, t: 0.2 + rnd() * 0.55, len: 0.055 + rnd() * 0.05 })
    }
    reliefFn = (a, t) => {
      let acc = 0
      for (const q of pills) {
        let da = Math.abs(a - q.a)
        if (da > Math.PI) da = TAU - da
        const dv = Math.max(0, Math.abs(t - q.t) - q.len) * 3.4
        const d = Math.hypot(da * 1.5, dv)
        acc = Math.max(acc, 0.085 * (1 - smooth(0.055, 0.165, d)))
      }
      return acc
    }
  } else if (relief === 2) {
    reliefFn = (a, t) => 0.028 * Math.sin(40 * a) * Math.sin(46 * t * Math.PI)
  }

  // a bare body carries the waves itself — big slow bulges, like the
  // coral worm vase — otherwise the cup wears them
  const bodyWave =
    cup === 0 && waves > 0
      ? { amp: waves === 1 ? 0.07 : 0.125, freq: waves === 1 ? 3.4 : 3 }
      : undefined

  const baseGeo = shellGeo({
    radial,
    rows,
    y0: 0,
    h: baseH,
    profile: (t) => sampleProfile(BODY_PROFILES[form], Math.pow(t, flowWarp)),
    scale: baseR,
    lobeKind: lobes,
    ribN,
    ribA: relief === 2 ? ribA * 0.2 : ribA,
    wave: bodyWave,
    twist,
    relief: reliefFn,
    color: inkB,
    fade:
      Math.round(p.fade) === 1
        ? { to: fadeTo, f: (t) => 0.85 * smooth(0.18, 0.92, t) }
        : undefined,
    capBottom: true,
    top: cup === 0 ? "lip" : "dome",
  })

  // ---- the cup ---------------------------------------------------------
  let cupGeo: THREE.BufferGeometry | null = null
  if (cup > 0) {
    const poise = 0.8 + 0.5 * clamp01(p.poise)
    const cupScale = [0, 0.92, 0.98, 0.95, 0.48, 1.42, 1.32, 1.28][cup] * baseR * poise
    const cupH =
      [0, 1.02, 0.74, 0.64, 0.52, 0.78, 1.0, 1.05][cup] * baseH * (0.9 + 0.2 * clamp01(p.poise))
    const y0 =
      cup === 5 ? baseH * 0.56 : cup === 6 ? baseH * 0.62 : cup === 7 ? baseH * 0.84 : baseH * 0.9
    const wave =
      waves > 0 && cup >= 1 && cup <= 3
        ? { amp: waves === 1 ? 0.028 : 0.048, freq: waves === 1 ? 4 : 4.5 }
        : cup === 5 && waves > 0
          ? { amp: waves === 1 ? 0.028 : 0.048, freq: waves === 1 ? 4 : 4.5 }
          : undefined
    // lobing on cups: goblets melt from a lobed collar to a round rim,
    // petal cups stay deeply lobed to the lip, the rest print round
    const cupLobeKind = cup === 1 ? lobes : cup === 3 ? Math.max(2, lobes) : 0
    const lobeMul =
      cup === 1 ? (t: number) => 1 - smooth(0.18, 0.72, t) : cup === 3 ? () => 1.15 : undefined

    const shell =
      cup === 6 || cup === 7
        ? null
        : shellGeo({
            radial,
            rows: 96,
            y0,
            h: cupH,
            profile: (t) => sampleProfile(CUP_PROFILES[cup], t),
            scale: cupScale,
            lobeKind: cupLobeKind,
            lobeMul,
            ribN,
            ribA,
            wave,
            twist,
            color: inkC,
            capBottom: false,
            top: "lip",
          })

    if (cup === 6) {
      // pagoda: stacked flaring skirts, each hem open, a short tube on
      // top — square when the lobes say boxy (the pink lamp), round for
      // the double-mushroom
      const tiers = clamp01(p.flow) > 0.62 ? 3 : 2
      const parts: THREE.BufferGeometry[] = []
      const skirt = [1.07, 1.1, 1.06, 0.95, 0.79, 0.64, 0.53, 0.48, 0.46, 0.46]
      const tierH = (cupH / tiers) * 1.12
      for (let i = 0; i < tiers; i++) {
        const s = cupScale * (1 - 0.26 * i)
        parts.push(
          shellGeo({
            radial,
            rows: 64,
            y0: y0 + i * tierH * 0.92,
            h: tierH,
            profile: (t) => sampleProfile(skirt, t),
            scale: s,
            lobeKind: lobes === 4 ? 4 : lobes === 5 ? 5 : 0,
            ribN,
            ribA,
            twist,
            color: inkC,
            capBottom: false,
            top: "raw",
          }),
        )
      }
      // the little open tube crowning the stack
      parts.push(
        shellGeo({
          radial,
          rows: 24,
          y0: y0 + tiers * tierH * 0.92,
          h: tierH * 0.5,
          profile: () => 0.5,
          scale: cupScale * (1 - 0.26 * (tiers - 1)),
          lobeKind: lobes === 4 ? 4 : lobes === 5 ? 5 : 0,
          ribN,
          ribA,
          color: inkC,
          capBottom: false,
          top: "lip",
        }),
      )
      cupGeo = mergeGeometries(parts, false)
      for (const g of parts) g.dispose()
    } else if (cup === 7) {
      // lantern: a double-bulge gadrooned belly under a short ribbed
      // neck with a flat cap, like the lilac lamp
      const parts: THREE.BufferGeometry[] = []
      const gourd = [0.5, 0.82, 1.0, 0.97, 0.78, 0.82, 1.04, 1.0, 0.72, 0.48]
      parts.push(
        shellGeo({
          radial,
          rows: 120,
          y0,
          h: cupH * 0.82,
          profile: (t) => sampleProfile(gourd, t),
          scale: cupScale,
          lobeKind: 5, // gadroon flutes are the lantern's whole point
          lobeMul: () => 1.3,
          ribN,
          ribA: ribA * 0.4,
          twist,
          color: inkC,
          capBottom: false,
          top: "raw",
        }),
      )
      parts.push(
        shellGeo({
          radial,
          rows: 24,
          y0: y0 + cupH * 0.8,
          h: cupH * 0.2,
          profile: () => 1,
          scale: cupScale * 0.42,
          lobeKind: 0,
          ribN,
          ribA: ribA * 1.6,
          color: inkC,
          capBottom: false,
          top: "dome",
        }),
      )
      cupGeo = mergeGeometries(parts, false)
      for (const g of parts) g.dispose()
    } else if (cup === 4) {
      // turbine: thin blades planted through the shoulder around the
      // neck, roots buried in the body like the mint piece
      const parts: THREE.BufferGeometry[] = [shell!]
      const nB = 12 + Math.round(4 * clamp01(p.flow))
      const finH = cupH * 1.15
      const rIn = cupScale * 0.72
      const rOut = baseR * 1.04
      const finD = rOut - rIn
      const finY = baseH * 0.56 + finH / 2
      for (let i = 0; i < nB; i++) {
        const a = (i / nB) * TAU
        const fin = new THREE.BoxGeometry(0.034, finH, finD)
        fin.deleteAttribute("uv")
        const cnt = fin.getAttribute("position").count
        const fc = new Float32Array(cnt * 3)
        for (let v = 0; v < cnt; v++) {
          fc[v * 3] = inkC.r
          fc[v * 3 + 1] = inkC.g
          fc[v * 3 + 2] = inkC.b
        }
        fin.setAttribute("color", new THREE.BufferAttribute(fc, 3))
        fin.translate(0, finY, rIn + finD / 2)
        fin.rotateY(-a)
        parts.push(fin)
      }
      cupGeo = mergeGeometries(parts, false)
      for (const g of parts) g.dispose()
    } else {
      cupGeo = shell!
    }
  }

  // ---- camera fit from real bounds -------------------------------------
  baseGeo.computeBoundingBox()
  const bb = baseGeo.boundingBox!.clone()
  if (cupGeo) {
    cupGeo.computeBoundingBox()
    bb.union(cupGeo.boundingBox!)
  }
  const w = 2 * Math.max(Math.abs(bb.min.x), bb.max.x, Math.abs(bb.min.z), bb.max.z)
  const top = bb.max.y
  return { base: baseGeo, cup: cupGeo, fit: { r: Math.hypot(w, top) / 2, cy: top / 2 } }
}
