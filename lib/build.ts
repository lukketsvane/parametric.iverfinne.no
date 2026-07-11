import * as THREE from "three"
import {
  mergeGeometries,
  mergeVertices,
} from "three/addons/utils/BufferGeometryUtils.js"
import { glazeHex, mulberry32, type Params } from "./model"

/**
 * Deterministic geometry for the whole sculpture. Same params in, same
 * triangles out — every wobble comes from the seeded PRNG, so any design
 * is perfectly reproducible from its parameter values alone.
 *
 * The sculpture is returned as two merged geometries, one per glaze:
 * body (bottom segment + feet) and crown (top segment + apex). Either
 * may be null when that part has no surface.
 */
export type Built = {
  body: THREE.BufferGeometry | null
  crown: THREE.BufferGeometry | null
  /** bounding-sphere-ish fit for the camera: radius + center height */
  fit: { r: number; cy: number }
}

type Segment = {
  h: number
  rBase: number
  rMax: number
  belly: number
  rTop: number
  round: number
  footH?: number
  footR?: number
}

type Studs = {
  rings: number
  perRing: number
  shape: number // 0 cones · 1 spheres · between = alternate rings
  size: number
  aspect: number
  align: number // 0 horizontal · 1 surface normal
  bandLo: number
  bandHi: number
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

const smooth = (a: number, b: number, x: number) => {
  const u = clamp01((x - a) / (b - a))
  return u * u * (3 - 2 * u)
}

/**
 * Radius multiplier that makes a lathe read as thrown, not turned: two
 * low radial modes whose phase drifts slowly with height, like a wall
 * pulled up by hand. Amplitude rides the jitter dial, so the same
 * design reseeded is a different throw of the same form.
 */
type Wobble = (a: number, t: number) => number

function makeWobble(rnd: () => number, jitter: number): Wobble {
  const p1 = rnd() * Math.PI * 2
  const p2 = rnd() * Math.PI * 2
  const drift = (rnd() - 0.5) * 2.6
  const amp = jitter * 0.08
  return (a, t) =>
    1 +
    amp *
      (0.62 * Math.sin(2 * a + p1 + t * drift) +
        0.38 * Math.sin(3 * a + p2 - t * drift * 1.7))
}

/** Pale stoneware showing where glaze pulls thin over sharp relief. */
const BREAK_TONE = new THREE.Color("#e6dbc9")

/**
 * Bake per-vertex glaze into a geometry: full glaze everywhere except
 * where `edge` says the glaze breaks (0 = pooled, 1 = thinned to the
 * break tone). Coordinates arrive in the geometry's local space.
 */
function bakeGlaze(
  g: THREE.BufferGeometry,
  glaze: THREE.Color,
  breakC: THREE.Color,
  edge: (x: number, y: number, z: number) => number,
) {
  const pos = g.getAttribute("position")
  const col = new Float32Array(pos.count * 3)
  const c = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    c.copy(glaze).lerp(breakC, clamp01(edge(pos.getX(i), pos.getY(i), pos.getZ(i))))
    col[i * 3] = c.r
    col[i * 3 + 1] = c.g
    col[i * 3 + 2] = c.b
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3))
}

/**
 * Unit thorn prototype: root radius 1 at y=0, rising to a small rounded
 * tip at y=1. The flank is slightly concave like a pinched clay spike and
 * the root flares into a bell that gets smoothed into the wall. Below
 * y=0 a shallow plug closes the root — there is no flat base cap, which
 * is what made the old raw cones flash a faceted "crater" whenever a
 * spike pointed at the camera.
 */
function thornProto(detail: number): THREE.BufferGeometry {
  const TIP = 0.1 // blunted tip radius — glaze can't hold a perfect point
  const FLARE = 1.22 // root bell radius
  const STEPS = 10
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(0.001, -0.12),
    new THREE.Vector2(0.62, -0.095),
    new THREE.Vector2(FLARE * 0.99, -0.03),
  ]
  const yCap = 1 - TIP
  for (let i = 0; i <= STEPS; i++) {
    const u = i / STEPS
    const flank = TIP + (1 - TIP) * Math.pow(1 - u, 1.35)
    const bellU = Math.max(0, 1 - u / 0.24)
    const bell = 1 + (FLARE - 1) * bellU * bellU
    pts.push(new THREE.Vector2(flank * bell, u * yCap))
  }
  for (let i = 1; i <= 5; i++) {
    const a = (i / 5) * (Math.PI / 2)
    pts.push(
      new THREE.Vector2(
        Math.max(0.001, TIP * Math.cos(a)),
        yCap + TIP * Math.sin(a),
      ),
    )
  }
  const g = new THREE.LatheGeometry(pts, 16 + detail * 8)
  g.deleteAttribute("uv") // nothing is textured; keeps merges compatible
  return g
}

/**
 * How deep to sink a stud root so its flared bell always bites into the
 * wall: a base offset, plus the lift caused by the stud direction tilting
 * away from the surface normal, plus the sag of a curved wall falling
 * away under the root disk.
 */
function rootSink(w: number, cosTilt: number, wallR: number): number {
  const sinTilt = Math.sqrt(Math.max(0, 1 - cosTilt * cosTilt))
  const sag = (1.22 * w) ** 2 / (2 * Math.max(wallR, 0.08))
  return w * (0.22 + 1.25 * sinTilt) + sag
}

/** Lathe profile radius at t ∈ [0,1] (bottom → top). */
function profileR(t: number, s: Segment): number {
  const footH = s.footH ?? 0
  const footR = s.footR ?? 0
  if (footH > 0.01 && footR > 0.01) {
    if (t < footH) {
      // straight flared foot: footR at the ground easing into the base
      const u = t / footH
      return footR + (s.rBase - footR) * (u * u * (3 - 2 * u))
    }
    t = (t - footH) / (1 - footH)
  }
  const { rBase, rMax, rTop, belly, round } = s
  // beyond round ≈ 2 the eased-power arcs blend toward true circular
  // arcs, so a segment can close as a genuine dome/ball instead of an
  // onion point (vertical tangents at the ends, flat at the belly)
  const w = Math.min(1, Math.max(0, (round - 2) / 1.4))
  if (t <= belly) {
    const u = belly <= 0 ? 1 : t / belly
    const pow = 1 - Math.pow(1 - u, round)
    const circ = Math.sqrt(Math.max(0, 1 - (1 - u) * (1 - u)))
    return rBase + (rMax - rBase) * ((1 - w) * pow + w * circ)
  }
  const u = belly >= 1 ? 0 : (t - belly) / (1 - belly)
  const pow = Math.pow(u, round)
  const circ = 1 - Math.sqrt(Math.max(0, 1 - u * u))
  return rMax + (rTop - rMax) * ((1 - w) * pow + w * circ)
}

/** Outward surface normal (radial, y) of the profile at t. */
function profileN(t: number, s: Segment): { nr: number; ny: number } {
  const e = 0.004
  const r0 = profileR(clamp01(t - e), s)
  const r1 = profileR(clamp01(t + e), s)
  const dr = (r1 - r0) / (2 * e) // d(radius)/dt
  // tangent (dr, h) → outward normal (h, -dr), normalised
  const len = Math.hypot(s.h, dr)
  return { nr: s.h / len, ny: -dr / len }
}

function latheFor(
  s: Segment,
  y0: number,
  radial: number,
  wob: Wobble,
  glaze: THREE.Color,
  breakC: THREE.Color,
): THREE.BufferGeometry {
  const N = 56
  const pts: THREE.Vector2[] = [new THREE.Vector2(0.001, 0)]
  for (let i = 0; i <= N; i++) {
    const t = i / N
    pts.push(new THREE.Vector2(Math.max(0.001, profileR(t, s)), t * s.h))
  }
  // wide tops read as vessel mouths: dish the cap slightly inward.
  // narrow tops close to a point/dome and get a flat pinch instead.
  const rTopEdge = profileR(1, s)
  if (rTopEdge >= 0.09) {
    const dish = Math.min(0.05, s.h * 0.08)
    pts.push(new THREE.Vector2(rTopEdge * 0.72, s.h - dish * 0.6))
    pts.push(new THREE.Vector2(0.001, s.h - dish))
  } else {
    pts.push(new THREE.Vector2(0.001, s.h))
  }
  const lathe = new THREE.LatheGeometry(pts, radial)
  // weld the seam (uv is unused) so the wobble displacement and the
  // recomputed smooth normals don't crease at 0°
  lathe.deleteAttribute("uv")
  const g = mergeVertices(lathe)
  lathe.dispose()
  const posA = g.getAttribute("position")
  for (let i = 0; i < posA.count; i++) {
    const x = posA.getX(i)
    const y = posA.getY(i)
    const z = posA.getZ(i)
    if (Math.hypot(x, z) > 0.004) {
      const k = wob(Math.atan2(z, x), clamp01(y / s.h))
      posA.setXYZ(i, x * k, y, z * k)
    }
  }
  g.computeVertexNormals()
  // glaze thins over the lip: hard on closed nubs, gentler on wide mouths
  const lip = rTopEdge >= 0.09 ? 0.5 : 0.75
  bakeGlaze(g, glaze, breakC, (_x, y) => lip * smooth(0.975, 1, y / s.h))
  g.translate(0, y0, 0)
  return g
}

/** Stud instances for one segment, merged into a single geometry. */
function studsFor(
  s: Segment,
  st: Studs,
  y0: number,
  stagger: number,
  jitter: number,
  rnd: () => number,
  detail: number,
  wob: Wobble,
  glaze: THREE.Color,
  breakC: THREE.Color,
): THREE.BufferGeometry | null {
  const rings = Math.round(st.rings)
  const perRing = Math.round(st.perRing)
  if (rings < 1 || perRing < 1) return null

  const coneProto = thornProto(detail)
  const ballProto = new THREE.SphereGeometry(1, 24 + detail * 8, 18 + detail * 6)
  ballProto.deleteAttribute("uv")
  // glaze pulls thin toward a thorn's tip and over a bobble's crest
  bakeGlaze(coneProto, glaze, breakC, (_x, y) => smooth(0.5, 0.96, y))
  bakeGlaze(ballProto, glaze, breakC, (_x, y) => 0.55 * smooth(0.55, 1, y))

  const parts: THREE.BufferGeometry[] = []
  const up = new THREE.Vector3(0, 1, 0)
  const q = new THREE.Quaternion()
  const m = new THREE.Matrix4()
  const pos = new THREE.Vector3()
  const dir = new THREE.Vector3()
  const scl = new THREE.Vector3()

  for (let i = 0; i < rings; i++) {
    const t =
      rings === 1
        ? (st.bandLo + st.bandHi) / 2
        : st.bandLo + ((st.bandHi - st.bandLo) * i) / (rings - 1)
    const rProfile = profileR(t, s)
    const y = y0 + t * s.h
    const n = profileN(t, s)
    const phase = ((i % 2) * stagger * Math.PI * 2) / perRing
    for (let j = 0; j < perRing; j++) {
      // pattern comes from the mix value: all cones, checkerboard,
      // alternating rows, or all balls
      const ball =
        st.shape <= 0.05
          ? false
          : st.shape >= 0.95
            ? true
            : st.shape < 0.5
              ? (i + j) % 2 === 1
              : i % 2 === 1
      const a = (j / perRing) * Math.PI * 2 + phase + (rnd() - 0.5) * 0.14 * jitter
      const grow = 1 + (rnd() - 0.5) * 2 * 0.5 * jitter
      const cosA = Math.cos(a)
      const sinA = Math.sin(a)
      // seat the stud on the thrown (wobbled) wall, not the ideal lathe
      const r = rProfile * wob(a, t)
      // blend between horizontal-out and the true surface normal
      dir
        .set(
          cosA * ((1 - st.align) + st.align * n.nr),
          st.align * n.ny,
          sinA * ((1 - st.align) + st.align * n.nr),
        )
        .normalize()
      pos.set(cosA * r, y, sinA * r)
      q.setFromUnitVectors(up, dir)
      if (ball) {
        const rad = st.size * 1.1 * grow
        pos.addScaledVector(dir, rad * 0.5)
        scl.setScalar(rad)
        m.compose(pos, q, scl)
        parts.push(ballProto.clone().applyMatrix4(m))
      } else {
        const w = st.size * grow
        const len = st.size * st.aspect * grow
        // bury the root bell: tilt away from the normal and wall
        // curvature both lift the rim, so the sink depth covers them
        const cosTilt = dir.x * cosA * n.nr + dir.y * n.ny + dir.z * sinA * n.nr
        pos.addScaledVector(dir, -rootSink(w, cosTilt, r))
        scl.set(w, len, w)
        m.compose(pos, q, scl)
        parts.push(coneProto.clone().applyMatrix4(m))
      }
    }
  }
  coneProto.dispose()
  ballProto.dispose()
  if (parts.length === 0) return null
  const merged = mergeGeometries(parts, false)
  for (const p of parts) p.dispose()
  return merged
}

export function buildSculpture(p: Params, hiDetail: boolean): Built {
  const detail = hiDetail ? 1 : 0
  const radial = hiDetail ? 128 : 88
  const rnd = mulberry32(p.seed)

  const segB: Segment = {
    h: p.hB, rBase: p.rBaseB, rMax: p.rMaxB, belly: p.bellyB,
    rTop: p.rTopB, round: p.roundB, footH: p.footH, footR: p.footR,
  }
  const studsB: Studs = {
    rings: p.ringsB, perRing: p.perRingB, shape: p.shapeB, size: p.sizeB,
    aspect: p.aspectB, align: p.alignB, bandLo: p.bandLoB, bandHi: p.bandHiB,
  }
  const segT: Segment = {
    h: p.hT, rBase: p.rBaseT, rMax: p.rMaxT, belly: p.bellyT,
    rTop: p.rTopT, round: p.roundT,
  }
  const studsT: Studs = {
    rings: p.ringsT, perRing: p.perRingT, shape: p.shapeT, size: p.sizeT,
    aspect: p.aspectT, align: p.alignT, bandLo: p.bandLoT, bandHi: p.bandHiT,
  }

  const feet = Math.round(p.feet)
  const lift = feet > 0 ? p.feetR * 1.2 : 0

  // one glaze + break tone per zone; glossier glaze flows more and
  // breaks paler over relief, satin stays closer to its own color
  const glazeB = new THREE.Color(glazeHex(p.glazeB))
  const glazeT = new THREE.Color(glazeHex(p.glazeT))
  const breakB = glazeB.clone().lerp(BREAK_TONE, 0.45 + 0.4 * p.gloss)
  const breakT = glazeT.clone().lerp(BREAK_TONE, 0.45 + 0.4 * p.gloss)

  // ---- body: bottom segment + ball feet -------------------------------
  const wobB = makeWobble(rnd, p.jitter)
  const bodyParts: THREE.BufferGeometry[] = [
    latheFor(segB, lift, radial, wobB, glazeB, breakB),
  ]
  const sB = studsFor(segB, studsB, lift, p.stagger, p.jitter, rnd, detail, wobB, glazeB, breakB)
  if (sB) bodyParts.push(sB)
  if (feet > 0) {
    const baseR = profileR(0.02, segB)
    for (let i = 0; i < feet; i++) {
      const a = (i / feet) * Math.PI * 2 + Math.PI / feet
      const ringR = Math.max(baseR * 0.62, baseR - p.feetR * 0.6) * wobB(a, 0.02)
      const foot = new THREE.SphereGeometry(p.feetR, 18 + detail * 8, 14 + detail * 6)
      foot.deleteAttribute("uv")
      bakeGlaze(foot, glazeB, breakB, () => 0)
      foot.translate(Math.cos(a) * ringR, p.feetR, Math.sin(a) * ringR)
      bodyParts.push(foot)
    }
  }
  const body = mergeGeometries(bodyParts, false)
  for (const g of bodyParts) g.dispose()

  // ---- crown: top segment + apex ornament ------------------------------
  const hasTop = p.hT > 0.03
  const embed = 0.05
  const yTop = lift + p.hB - embed
  const crownParts: THREE.BufferGeometry[] = []
  const wobT = makeWobble(rnd, p.jitter)
  if (hasTop) {
    crownParts.push(latheFor(segT, yTop, radial, wobT, glazeT, breakT))
    const sT = studsFor(segT, studsT, yTop, p.stagger, p.jitter, rnd, detail, wobT, glazeT, breakT)
    if (sT) crownParts.push(sT)
  }
  const apexType = Math.round(p.apexType)
  if (apexType > 0) {
    const yA = hasTop ? yTop + p.hT - 0.02 : lift + p.hB - 0.02
    if (apexType === 1) {
      // same lathed thorn as the studs — its root bell melts into the
      // crown tip instead of leaving a floating cone-base seam
      const spike = thornProto(detail)
      bakeGlaze(spike, glazeT, breakT, (_x, y) => smooth(0.5, 0.96, y))
      spike.scale(p.apexR * 2, p.apexH, p.apexR * 2)
      spike.translate(0, yA - p.apexR * 0.5, 0)
      crownParts.push(spike)
    } else {
      const ball = new THREE.SphereGeometry(p.apexR, 22 + detail * 10, 16 + detail * 8)
      ball.deleteAttribute("uv")
      bakeGlaze(ball, glazeT, breakT, (_x, y) => 0.5 * smooth(0.55, 1, y / p.apexR))
      ball.translate(0, yA + p.apexR * 0.72, 0)
      crownParts.push(ball)
    }
  }
  const crown = crownParts.length ? mergeGeometries(crownParts, false) : null
  if (crown) for (const g of crownParts) g.dispose()

  // ---- camera fit -------------------------------------------------------
  const reachB = p.ringsB >= 1 ? Math.max(p.sizeB * p.aspectB, p.sizeB * 1.35) : 0
  const reachT = hasTop && p.ringsT >= 1 ? Math.max(p.sizeT * p.aspectT, p.sizeT * 1.35) : 0
  const w =
    2 *
    Math.max(
      p.rMaxB + reachB,
      p.footR,
      hasTop ? p.rMaxT + reachT : 0,
    )
  const h =
    lift +
    p.hB +
    (hasTop ? p.hT - embed : 0) +
    (apexType === 1 ? p.apexH - 0.03 : apexType === 2 ? p.apexR * 1.7 : 0)
  return { body, crown, fit: { r: Math.hypot(w, h) / 2, cy: h / 2 } }
}
