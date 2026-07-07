import * as THREE from "three"
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js"

/*
 * Fin sculptures — generative parametric porcelain forms (ported from the
 * pegbox draft). Every sculpture is N copies of a single "fin" arrayed
 * radially around an axis (optionally stacked in rings). The fin's profile
 * lives in the (radial, vertical) plane and is grown from a scalar field:
 * a vertical chain of star-modulated lobes plus a connecting spine, minus
 * punch-holes, cut flat at the floor. Marching squares extracts the outline
 * (holes included), which is extruded with a bevel and glazed with vertex
 * colors.
 */

export type FinFamily = "wild" | "spokes" | "lattice" | "crown" | "kelp"

export const FIN_FAMILIES: FinFamily[] = ["wild", "spokes", "lattice", "crown", "kelp"]

export type FinParams = {
  seed: number
  family: FinFamily
  /** copies arrayed around the axis */
  fins: number
  /** lobes stacked vertically inside one fin */
  rows: number
  /** whole rings stacked on top of each other */
  stacks: number
  /** height of one ring */
  height: number
  /** inner / outer radius of the fin profile */
  rIn: number
  rOut: number
  /** lobe aspect ratios (radial / vertical) */
  aspR: number
  aspY: number
  /** star modulation: harmonic count + amplitude */
  starK: number
  starAmp: number
  /** field falloff power — low = soft blobs, high = hard edges */
  pw: number
  /** diagonal shear of the lobes */
  shear: number
  /** extrusion thickness */
  thick: number
  /** punch-hole strength */
  punch: number
  starPhase: number
  twistPhase: number
  shearAlt: boolean
  bulge: number
  tilt: number
  stackTwist: number
  /** celadon glaze */
  hue: number
  sat: number
  lit: number
}

export const FIN_PARAM_RANGES = {
  fins: { min: 8, max: 48, step: 1 },
  rows: { min: 1, max: 4, step: 1 },
  stacks: { min: 1, max: 3, step: 1 },
  height: { min: 0.4, max: 2.4, step: 0.01 },
  rOut: { min: 0.9, max: 1.6, step: 0.01 },
  starAmp: { min: 0, max: 0.6, step: 0.01 },
  pw: { min: 1, max: 5, step: 0.05 },
  shear: { min: -0.8, max: 0.8, step: 0.01 },
  thick: { min: 0.05, max: 0.28, step: 0.005 },
  punch: { min: 0, max: 1, step: 0.01 },
} as const

// ---------------------------------------------------------------- utilities

function mulberry32(seed: number) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

export function randomFinSeed() {
  return (Math.random() * 0xffffffff) >>> 0
}

// ------------------------------------------------------------- param space

export function genFinParams(seed: number, family?: FinFamily): FinParams {
  const R = mulberry32(seed)
  const rr = (a: number, b: number) => a + R() * (b - a)
  const ri = (a: number, b: number) => Math.floor(rr(a, b + 0.999))
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(R() * arr.length)]

  const rolled = R() < 0.36 ? "wild" : pick(FIN_FAMILIES.slice(1))
  const fam = family ?? rolled
  const P = { seed, family: fam } as FinParams

  if (fam === "spokes") {
    // low stacked discs of flat radial blades
    P.fins = ri(24, 40); P.rows = 1; P.stacks = ri(2, 3)
    P.height = rr(0.42, 0.62); P.rIn = rr(0.42, 0.55); P.rOut = rr(1.3, 1.55)
    P.aspR = rr(1.0, 1.25); P.aspY = rr(0.8, 1.0)
    P.starK = pick([2, 3]); P.starAmp = rr(0, 0.15)
    P.pw = rr(1.3, 2.2); P.shear = rr(-0.15, 0.15)
    P.thick = rr(0.1, 0.16); P.punch = rr(0, 0.4)
  } else if (fam === "lattice") {
    // stacked star/cross lattice ring
    P.fins = ri(14, 22); P.rows = 3; P.stacks = 1
    P.height = rr(1.0, 1.35); P.rIn = rr(0.55, 0.7); P.rOut = rr(1.12, 1.3)
    P.aspR = rr(1.1, 1.35); P.aspY = rr(1.0, 1.15)
    P.starK = 4; P.starAmp = rr(0.25, 0.45)
    P.pw = rr(2.0, 4.0); P.shear = rr(-0.1, 0.1)
    P.thick = rr(0.15, 0.22); P.punch = rr(0.6, 1)
  } else if (fam === "crown") {
    // tall angular zigzag blades
    P.fins = ri(16, 26); P.rows = ri(1, 2); P.stacks = 1
    P.height = rr(1.4, 2.0); P.rIn = rr(0.4, 0.55); P.rOut = rr(1.2, 1.45)
    P.aspR = rr(0.85, 1.1); P.aspY = rr(1.0, 1.2)
    P.starK = pick([2, 3]); P.starAmp = rr(0.2, 0.45)
    P.pw = rr(2.5, 5.0); P.shear = rr(0.35, 0.75) * pick([-1, 1])
    P.thick = rr(0.07, 0.12); P.punch = rr(0.3, 0.8)
  } else if (fam === "kelp") {
    // soft blobby wavering fins
    P.fins = ri(18, 30); P.rows = ri(2, 3); P.stacks = 1
    P.height = rr(1.1, 1.55); P.rIn = rr(0.45, 0.6); P.rOut = rr(1.1, 1.35)
    P.aspR = rr(0.95, 1.2); P.aspY = rr(1.0, 1.2)
    P.starK = pick([2, 3]); P.starAmp = rr(0.05, 0.2)
    P.pw = rr(1.0, 1.7); P.shear = rr(-0.3, 0.3)
    P.thick = rr(0.12, 0.2); P.punch = rr(0.5, 1)
  } else {
    // wild — the rest of the space
    P.rows = ri(1, 4)
    P.stacks = P.rows > 2 ? 1 : ri(1, 3)
    P.fins = ri(10, 44)
    P.height = rr(0.4, 2.2) / (P.stacks > 1 ? 1.6 : 1)
    P.rIn = rr(0.35, 0.7); P.rOut = rr(1.0, 1.55)
    P.aspR = rr(0.8, 1.35); P.aspY = rr(0.8, 1.25)
    P.starK = ri(2, 6); P.starAmp = rr(0, 0.5)
    P.pw = rr(1.0, 5.0); P.shear = rr(-0.7, 0.7)
    P.thick = rr(0.06, 0.24); P.punch = rr(0, 1)
  }

  P.starPhase = rr(0, Math.PI * 2)
  P.twistPhase = rr(-0.7, 0.7)
  P.shearAlt = R() < 0.6
  P.bulge = rr(-0.18, 0.28)
  P.tilt = rr(-0.22, 0.22)
  P.stackTwist = rr(0.6, 1.4)
  // celadon glaze range: pale green-grey through blue-grey
  P.hue = rr(150, 210) / 360; P.sat = rr(0.25, 0.45); P.lit = rr(0.5, 0.62)
  return P
}

// -------------------------------------------------- scalar field for a fin

type Lobe = {
  cx: number; cy: number; sx: number; sy: number
  k: number; amp: number; phase: number; shear: number; pw: number
}
type Punch = { cx: number; cy: number; s: number; amp: number }
type Spine = { r: number; w: number; y0: number; y1: number; hs: number }
type Field = { lobes: Lobe[]; punches: Punch[]; spine: Spine | null }

function buildLobes(P: FinParams): Field {
  const J = mulberry32((P.seed ^ 0x9e3779b9) >>> 0) // stable per-seed jitter
  const jr = (a: number, b: number) => a + J() * (b - a)
  const rSpan = P.rOut - P.rIn
  const rMid = (P.rIn + P.rOut) / 2
  const lobeH = P.height / P.rows
  const lobes: Lobe[] = []
  const punches: Punch[] = []

  for (let j = 0; j < P.rows; j++) {
    const cy = lobeH * (j + 0.28)
    const t = clamp(cy / P.height, 0, 1)
    const cx = rMid + (P.bulge * Math.sin(Math.PI * t) + P.tilt * (t - 0.5)) * rSpan
    lobes.push({
      cx, cy,
      sx: rSpan * 0.5 * P.aspR * jr(0.92, 1.08),
      sy: lobeH * 0.5 * P.aspY * jr(0.92, 1.08),
      k: P.starK,
      amp: P.starAmp * jr(0.85, 1.15),
      phase: P.starPhase + j * P.twistPhase,
      shear: P.shear * (P.shearAlt && j % 2 ? -1 : 1),
      pw: P.pw,
    })
  }
  // punch-holes between rows (or a vertical chain inside single-row fins)
  if (P.punch > 0.05) {
    const pr = lobeH * jr(0.13, 0.2)
    if (P.rows > 1) {
      for (let j = 0; j < P.rows - 1; j++) {
        punches.push({
          cx: P.rIn + rSpan * jr(0.28, 0.5),
          cy: lobeH * (j + 0.78),
          s: pr, amp: 1.5 * P.punch,
        })
      }
    } else if (P.punch > 0.45) {
      const n = 1 + Math.floor(jr(0, 2.99))
      for (let j = 0; j < n; j++) {
        punches.push({
          cx: P.rIn + rSpan * jr(0.25, 0.55),
          cy: P.height * (0.2 + 0.6 * (n === 1 ? 0.5 : j / (n - 1))),
          s: pr * jr(0.8, 1.4), amp: 1.5 * P.punch,
        })
      }
    }
  }
  const spine: Spine | null = P.rows > 1
    ? {
        r: P.rIn + rSpan * 0.12,
        w: rSpan * 0.14,
        y0: lobes[0].cy, y1: lobes[lobes.length - 1].cy,
        hs: lobeH * 0.4,
      }
    : null
  return { lobes, punches, spine }
}

function fieldValue(r: number, y: number, F: Field, P: FinParams, topCut: boolean) {
  if (y < 0 || r < 0.04) return -1
  if (topCut && y > P.height) return -1
  let f = 0
  for (const L of F.lobes) {
    let dx = (r - L.cx) / L.sx
    const dy = (y - L.cy) / L.sy
    dx += L.shear * dy
    const m = 1 + L.amp * Math.cos(L.k * Math.atan2(dy, dx) + L.phase)
    const d2 = (dx * dx + dy * dy) * m * m
    f += 1 / (1 + Math.pow(d2, L.pw))
  }
  const S = F.spine
  if (S) {
    const dr = (r - S.r) / S.w
    const dyv = (y < S.y0 ? S.y0 - y : y > S.y1 ? y - S.y1 : 0) / S.hs
    const d2 = dr * dr + dyv * dyv
    f += 0.9 / (1 + d2 * d2)
  }
  for (const Q of F.punches) {
    const dx = (r - Q.cx) / Q.s
    const dy = (y - Q.cy) / Q.s
    const d2 = dx * dx + dy * dy
    f -= Q.amp / (1 + d2 * d2)
  }
  return f - 0.5
}

// ------------------------------------------------------- marching squares

type Pt = [number, number]

/** Extract iso-contours of fn>0 over the grid as closed loops of points. */
function marchLoops(
  fn: (x: number, y: number) => number,
  x0: number, x1: number, y0: number, y1: number, nx: number, ny: number,
): Pt[][] {
  const xs = new Float64Array(nx), ys = new Float64Array(ny)
  for (let i = 0; i < nx; i++) xs[i] = x0 + ((x1 - x0) * i) / (nx - 1)
  for (let j = 0; j < ny; j++) ys[j] = y0 + ((y1 - y0) * j) / (ny - 1)
  const V = new Float64Array(nx * ny)
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      let v = i === 0 || j === 0 || i === nx - 1 || j === ny - 1 ? -1 : fn(xs[i], ys[j])
      if (v === 0) v = 1e-9
      V[j * nx + i] = v
    }

  const pts = new Map<string, number>() // edge key -> point index
  const coords: Pt[] = []
  const segs: [string, string][] = []
  const adj = new Map<string, number[]>()

  function edgePoint(
    key: string,
    xa: number, ya: number, va: number,
    xb: number, yb: number, vb: number,
  ) {
    let idx = pts.get(key)
    if (idx === undefined) {
      const t = va / (va - vb)
      idx = coords.length
      coords.push([xa + t * (xb - xa), ya + t * (yb - ya)])
      pts.set(key, idx)
    }
    return idx
  }
  function addSeg(ka: string, kb: string) {
    const s = segs.length
    segs.push([ka, kb])
    for (const k of [ka, kb]) {
      let l = adj.get(k)
      if (!l) adj.set(k, (l = []))
      l.push(s)
    }
  }

  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const v00 = V[j * nx + i], v10 = V[j * nx + i + 1]
      const v01 = V[(j + 1) * nx + i], v11 = V[(j + 1) * nx + i + 1]
      let idx = 0
      if (v00 > 0) idx |= 1
      if (v10 > 0) idx |= 2
      if (v11 > 0) idx |= 4
      if (v01 > 0) idx |= 8
      if (idx === 0 || idx === 15) continue
      // edge keys: B bottom, R right, T top, L left
      const B = "h" + i + "_" + j, T = "h" + i + "_" + (j + 1)
      const L = "v" + i + "_" + j, Rk = "v" + (i + 1) + "_" + j
      const pB = () => edgePoint(B, xs[i], ys[j], v00, xs[i + 1], ys[j], v10)
      const pT = () => edgePoint(T, xs[i], ys[j + 1], v01, xs[i + 1], ys[j + 1], v11)
      const pL = () => edgePoint(L, xs[i], ys[j], v00, xs[i], ys[j + 1], v01)
      const pR = () => edgePoint(Rk, xs[i + 1], ys[j], v10, xs[i + 1], ys[j + 1], v11)
      const S = (a: () => number, b: () => number, ka: string, kb: string) => {
        a(); b(); addSeg(ka, kb)
      }
      switch (idx) {
        case 1: case 14: S(pL, pB, L, B); break
        case 2: case 13: S(pB, pR, B, Rk); break
        case 3: case 12: S(pL, pR, L, Rk); break
        case 4: case 11: S(pR, pT, Rk, T); break
        case 6: case 9: S(pB, pT, B, T); break
        case 7: case 8: S(pL, pT, L, T); break
        case 5: case 10: {
          const c = (v00 + v10 + v01 + v11) / 4
          if ((c > 0) === (idx === 5)) { S(pL, pT, L, T); S(pB, pR, B, Rk) }
          else { S(pL, pB, L, B); S(pR, pT, Rk, T) }
          break
        }
      }
    }
  }

  // chain segments into closed loops
  const used = new Uint8Array(segs.length)
  const loops: Pt[][] = []
  for (let s0 = 0; s0 < segs.length; s0++) {
    if (used[s0]) continue
    used[s0] = 1
    const startKey = segs[s0][0]
    let curKey = segs[s0][1]
    const keyLoop = [startKey, curKey]
    let guard = segs.length + 2
    while (curKey !== startKey && guard-- > 0) {
      const cand = adj.get(curKey) || []
      let next = -1
      for (const s of cand) if (!used[s]) { next = s; break }
      if (next < 0) break
      used[next] = 1
      curKey = segs[next][0] === curKey ? segs[next][1] : segs[next][0]
      keyLoop.push(curKey)
    }
    if (keyLoop.length > 3 && keyLoop[keyLoop.length - 1] === startKey) {
      keyLoop.pop()
      loops.push(keyLoop.map((k) => coords[pts.get(k)!]))
    }
  }
  return loops
}

function signedArea(pts: Pt[]) {
  let a = 0
  for (let i = 0, n = pts.length; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n]
    a += p[0] * q[1] - q[0] * p[1]
  }
  return a / 2
}

function pointInPoly(pts: Pt[], x: number, y: number) {
  let inside = false
  for (let i = 0, n = pts.length, j = n - 1; i < n; j = i++) {
    const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = true
  }
  return inside
}

function smoothLoop(pts: Pt[], alpha: number): Pt[] {
  const n = pts.length
  const out: Pt[] = new Array(n)
  for (let i = 0; i < n; i++) {
    const p = pts[i], a = pts[(i + n - 1) % n], b = pts[(i + 1) % n]
    out[i] = [
      p[0] * (1 - alpha) + ((a[0] + b[0]) * alpha) / 2,
      p[1] * (1 - alpha) + ((a[1] + b[1]) * alpha) / 2,
    ]
  }
  return out
}

function simplifyDP(pts: Pt[], eps: number): Pt[] {
  const n = pts.length
  if (n < 8) return pts
  const keep = new Uint8Array(n)
  keep[0] = keep[n - 1] = 1
  const stack: [number, number][] = [[0, n - 1]]
  while (stack.length) {
    const [a, b] = stack.pop()!
    const ax = pts[a][0], ay = pts[a][1]
    const dx = pts[b][0] - ax, dy = pts[b][1] - ay
    const len2 = dx * dx + dy * dy || 1e-12
    let dmax = 0, imax = -1
    for (let i = a + 1; i < b; i++) {
      const t = clamp(((pts[i][0] - ax) * dx + (pts[i][1] - ay) * dy) / len2, 0, 1)
      const ex = pts[i][0] - (ax + t * dx), ey = pts[i][1] - (ay + t * dy)
      const d = ex * ex + ey * ey
      if (d > dmax) { dmax = d; imax = i }
    }
    if (imax > 0 && dmax > eps * eps) {
      keep[imax] = 1
      stack.push([a, imax], [imax, b])
    }
  }
  const out: Pt[] = []
  for (let i = 0; i < n; i++) if (keep[i]) out.push(pts[i])
  return out
}

// ----------------------------------------------------------- fin geometry

function buildShapes(P: FinParams, topCut: boolean): THREE.Shape[] {
  const F = buildLobes(P)
  const rMax = P.rOut * 1.3
  const yMax = P.height * (topCut ? 1.02 : 1.4)
  const nx = 140
  const ny = Math.round((nx * yMax) / rMax) + 20
  const cell = rMax / nx
  let loops = marchLoops(
    (r, y) => fieldValue(r, y, F, P, topCut),
    0, rMax, -cell * 2, yMax, nx, clamp(ny, 80, 320),
  )

  loops = loops
    .map((l) => simplifyDP(smoothLoop(l, 0.5), cell * 0.3))
    .filter((l) => l.length > 5)

  const info = loops.map((l) => ({ pts: l, area: Math.abs(signedArea(l)), depth: 0 }))
  for (const a of info)
    for (const b of info)
      if (a !== b && b.area > a.area && pointInPoly(b.pts, a.pts[0][0], a.pts[0][1]))
        a.depth++

  const maxArea = Math.max(...info.map((o) => o.area), 1e-9)
  const outers = info.filter((o) => o.depth % 2 === 0 && o.area > maxArea * 0.02)
  const shapes: THREE.Shape[] = []
  for (const o of outers) {
    const shape = new THREE.Shape(o.pts.map((p) => new THREE.Vector2(p[0], p[1])))
    for (const h of info) {
      if (
        h.depth === o.depth + 1 && h.area < o.area &&
        pointInPoly(o.pts, h.pts[0][0], h.pts[0][1]) &&
        h.area > maxArea * 0.001
      ) {
        shape.holes.push(new THREE.Path(h.pts.map((p) => new THREE.Vector2(p[0], p[1]))))
      }
    }
    shapes.push(shape)
  }
  return shapes
}

function buildFinGeometry(P: FinParams, topCut: boolean): THREE.BufferGeometry | null {
  const shapes = buildShapes(P, topCut)
  if (!shapes.length) return null
  const bs = Math.min(P.thick * 0.36, 0.026)
  let geo: THREE.BufferGeometry = new THREE.ExtrudeGeometry(shapes, {
    depth: P.thick, steps: 1, curveSegments: 1,
    bevelEnabled: true, bevelThickness: bs * 0.9, bevelSize: bs, bevelSegments: 2,
  })
  geo.deleteAttribute("normal")
  geo.deleteAttribute("uv")
  geo = mergeVertices(geo, 1e-4)
  geo.computeVertexNormals()
  geo.translate(0, 0, -P.thick / 2)
  return geo
}

// ------------------------------------------------------------ assembly

export type FinSculpture = {
  /** the single fin, instanced `matrices.length` times */
  geometry: THREE.BufferGeometry
  matrices: THREE.Matrix4[]
  /** assembled bounds for fit-scaling */
  minY: number
  maxY: number
  radius: number
}

export function buildFinSculpture(input: FinParams): FinSculpture | null {
  const topCut = input.stacks > 1
  const geometry = buildFinGeometry(input, topCut)
  if (!geometry) return null

  geometry.computeBoundingBox()
  const bb = geometry.boundingBox!
  const stackDy = input.height * 0.985
  const halfStep = Math.PI / input.fins
  const matrices: THREE.Matrix4[] = []
  const dummy = new THREE.Object3D()
  for (let s = 0; s < input.stacks; s++) {
    const rot0 = s * halfStep * input.stackTwist
    for (let i = 0; i < input.fins; i++) {
      dummy.position.set(0, s * stackDy, 0)
      dummy.rotation.set(0, rot0 + (i * Math.PI * 2) / input.fins, 0)
      dummy.updateMatrix()
      matrices.push(dummy.matrix.clone())
    }
  }

  return {
    geometry,
    matrices,
    minY: bb.min.y,
    maxY: (input.stacks - 1) * stackDy + bb.max.y,
    radius: bb.max.x + input.thick,
  }
}
