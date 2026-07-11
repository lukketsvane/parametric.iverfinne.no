/**
 * The second engine: 3D-printed vases. Completely separate from the
 * ceramics model — a different formal language (fine extrusion ribs,
 * lobed clover cross-sections, wavy cups, turbine fins, bell shades,
 * pill and knurl reliefs, candy plastics with vertical fades) and a
 * different kind of parameter space: a handful of discrete TRAITS,
 * each a small set of curated options, instead of continuous sliders.
 * Two hidden continuous dials (flow, poise) belong to the canvas
 * gestures only.
 *
 * Geometry lives in lib/print-build.ts; the ceramics engine is
 * untouched by any of this.
 */
import { mulberry32 } from "./model"

export type PrintTraitKey =
  | "form" // body silhouette
  | "lobes" // cross-section lobing
  | "waves" // undulating wall (on the cup, or the body when bare)
  | "twist" // helical drift of lobes and waves
  | "relief" // surface decoration on the body
  | "cup" // what sits on top
  | "stature" // overall proportion
  | "ribs" // extrusion-line density
  | "fade" // vertical color fade on the body

export type PrintParamKey = PrintTraitKey | "inkBase" | "inkCup" | "flow" | "poise"

export type PrintParams = { seed: number } & Record<PrintParamKey, number>

/** Trait definitions drive both the builder and the chip UI. */
export const PRINT_TRAITS: {
  key: PrintTraitKey
  label: string
  options: string[]
}[] = [
  { key: "cup", label: "cup", options: ["none", "goblet", "trumpet", "petal", "turbine", "bell", "pagoda", "lantern"] },
  { key: "form", label: "body", options: ["pill", "bulb", "urn", "column"] },
  { key: "lobes", label: "lobes", options: ["round", "soft", "clover", "flower", "boxy", "melon"] },
  { key: "waves", label: "waves", options: ["calm", "ripple", "squiggle"] },
  { key: "twist", label: "twist", options: ["straight", "swirl"] },
  { key: "relief", label: "relief", options: ["plain", "pills", "knurl"] },
  { key: "stature", label: "stature", options: ["squat", "classic", "tall"] },
  { key: "ribs", label: "ribs", options: ["fine", "bold"] },
  { key: "fade", label: "fade", options: ["solid", "faded"] },
]

const TRAIT_MAX: Record<PrintParamKey, number> = {
  form: 3, lobes: 5, waves: 2, twist: 1, relief: 2, cup: 7, stature: 2, ribs: 1, fade: 1,
  inkBase: 7, inkCup: 7, flow: 1, poise: 1,
}

/** Filament palette sampled from the reference prints. */
export const INKS: { name: string; hex: string }[] = [
  { name: "cobalt", hex: "#2b3fe0" },
  { name: "coral", hex: "#ff4517" },
  { name: "taffy", hex: "#ffabb9" },
  { name: "lemon", hex: "#eee600" },
  { name: "mint", hex: "#b0e8c4" },
  { name: "sky", hex: "#a6dcf2" },
  { name: "lilac", hex: "#c9b6f0" },
  { name: "cream", hex: "#f1ebdf" },
]

export const inkHex = (i: number) =>
  INKS[Math.min(INKS.length - 1, Math.max(0, Math.round(i)))].hex

/** Homage to the cobalt pill with the pink goblet (IMG_9068). */
export const PRINT_DEFAULTS: PrintParams = {
  seed: 7,
  cup: 1, form: 0, lobes: 2, waves: 0, twist: 0, relief: 0, stature: 1, ribs: 0, fade: 0,
  inkBase: 0, inkCup: 2, flow: 0.5, poise: 0.55,
}

/** Clamp untrusted input (URL hash, shelf) into a valid PrintParams. */
export function clampPrint(obj: unknown, base: PrintParams): PrintParams | null {
  if (!obj || typeof obj !== "object") return null
  const next = { ...base }
  for (const k of Object.keys(TRAIT_MAX) as PrintParamKey[]) {
    const v = (obj as Record<string, unknown>)[k]
    if (typeof v === "number" && Number.isFinite(v)) {
      const hi = TRAIT_MAX[k]
      const c = Math.min(hi, Math.max(0, v))
      next[k] = k === "flow" || k === "poise" ? c : Math.round(c)
    }
  }
  const seed = (obj as Record<string, unknown>).seed
  if (typeof seed === "number" && Number.isFinite(seed)) {
    next.seed = Math.floor(seed)
  }
  return next
}

/** A tasteful random print — weighted so shuffles stay in the family. */
export function randomizePrint(seed: number): PrintParams {
  const rnd = mulberry32((seed * 1597334677) >>> 0)
  const weighted = (w: number[]) => {
    const x = rnd() * w.reduce((a, b) => a + b, 0)
    let acc = 0
    for (let i = 0; i < w.length; i++) {
      acc += w[i]
      if (x < acc) return i
    }
    return w.length - 1
  }
  const inkBase = Math.floor(rnd() * INKS.length)
  let inkCup = Math.floor(rnd() * INKS.length)
  if (inkCup === inkBase) inkCup = (inkBase + 3) % INKS.length
  return {
    seed,
    cup: weighted([8, 20, 15, 13, 11, 11, 11, 11]),
    form: weighted([28, 26, 24, 22]),
    lobes: weighted([18, 22, 22, 16, 12, 10]),
    waves: weighted([55, 25, 20]),
    twist: weighted([76, 24]),
    relief: weighted([58, 22, 20]),
    stature: weighted([30, 45, 25]),
    ribs: weighted([70, 30]),
    fade: weighted([65, 35]),
    inkBase,
    inkCup,
    flow: 0.3 + rnd() * 0.4,
    poise: 0.35 + rnd() * 0.4,
  }
}

/**
 * Prints introduce themselves too — candy-shop register, keyed to the
 * cup that defines the piece, spiced by loud traits. Seed-stable within
 * a family, like the ceramics names.
 */
const PRINT_POOLS: string[][] = [
  ["tub", "silo", "tin", "jar"], // none
  ["tulip", "bloom", "chalice", "dew"], // goblet
  ["lily", "funnel", "swirl", "flute"], // trumpet
  ["clover", "daisy", "posy", "frill"], // petal
  ["rotor", "turbine", "cog", "fan"], // turbine
  ["shade", "brolly", "cap", "jelly"], // bell
  ["pagoda", "step", "stack", "attic"], // pagoda
  ["lantern", "melon", "plum", "lotus"], // lantern
]

export function printName(p: PrintParams): string {
  let pool = PRINT_POOLS[Math.min(PRINT_POOLS.length - 1, Math.max(0, Math.round(p.cup)))]
  if (Math.round(p.relief) === 1) pool = pool.concat(["candy", "gumdrop"])
  if (Math.round(p.relief) === 2) pool = pool.concat(["knurl", "waffle"])
  if (Math.round(p.waves) === 2) pool = pool.concat(["noodle", "wiggle"])
  if (Math.round(p.twist) === 1) pool = pool.concat(["twirl", "helix"])
  const r = mulberry32((p.seed * 3266489917) >>> 0)()
  return pool[Math.floor(r * pool.length)]
}
