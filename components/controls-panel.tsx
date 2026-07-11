"use client"

import { useRef, useState, type ReactNode } from "react"
import {
  Bookmark,
  Download,
  Shuffle,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import {
  COMBOS,
  GLAZES,
  PARAM_RANGES,
  SECTIONS,
  dailySeed,
  designName,
  glazeHex,
  randomizeParams,
  randomSeed,
  type ParamKey,
  type Params,
} from "@/lib/model"
import {
  INKS,
  PRINT_TRAITS,
  printName,
  randomizePrint,
  type PrintParamKey,
  type PrintParams,
} from "@/lib/print-model"
import {
  CANDLE_SPECS,
  FAMILIES,
  PARAM_RANGES as HOLDER_RANGES,
  SECTIONS as HOLDER_SECTIONS,
  genParams as genHolderParams,
  randomizeParams as randomizeHolder,
  type CandleType,
  type HolderParams,
  type ParamKey as HolderKey,
} from "@/lib/holder/candle-holder"
import { downloadSTL as downloadHolderSTL } from "@/lib/holder/export-stl"
import {
  PRESETS as VESSEL_FAMILIES,
  PARAM_RANGES as VESSEL_RANGES,
  SECTIONS as VESSEL_SECTIONS,
  randomizeParams as randomizeVessel,
  type Params as VesselParams,
  type ParamKey as VesselKey,
} from "@/lib/vessel/engine"
import { downloadSTL as downloadVesselSTL } from "@/lib/vessel/export-stl"
import {
  MM_PER_UNIT as TOTEM_MM,
  PARAM_RANGES as TOTEM_RANGES,
  SECTIONS as TOTEM_SECTIONS,
  genName,
  genParams as genTotemParams,
  seedFromText,
  type Params as TotemParams,
  type ParamKey as TotemKey,
} from "@/lib/totem/engine"
import { downloadSTL as downloadTotemSTL } from "@/lib/totem/export-stl"
import { ENGINES, type Engine, type KeptPiece } from "@/lib/engines"

// monochrome controls — solid black/white ink, thin subtle hairline outlines
const HAIR = "border-black/15 dark:border-white/20"
const ICON_BTN =
  `flex h-10 w-10 items-center justify-center rounded-full border ${HAIR} text-black transition active:scale-95 dark:text-white`
const ICON_BTN_SOLID =
  "flex h-10 w-10 items-center justify-center rounded-full bg-black text-white transition active:scale-95 dark:bg-white dark:text-black"

// pixels of vertical drag that sweep a totem trait's full range
const TILE_DRAG_PX = 220

function chipClass(active: boolean) {
  return `min-h-[32px] rounded-full border px-3 text-[11px] font-medium capitalize transition active:scale-95 ${
    active
      ? "border-transparent bg-black text-white dark:bg-white dark:text-black"
      : `${HAIR} text-black dark:text-white`
  }`
}

function Row({
  label,
  value,
  range,
  locked,
  onChange,
  onToggleLock,
}: {
  label: string
  value: number
  range: { min: number; max: number; step: number }
  locked: boolean
  onChange: (v: number) => void
  onToggleLock: () => void
}) {
  const isInt = range.step >= 1
  return (
    <div
      className={`flex items-center gap-3 py-1.5 transition-opacity ${
        locked ? "opacity-30" : ""
      }`}
    >
      {/* tap the label to lock this value against shuffle */}
      <button
        onClick={onToggleLock}
        aria-pressed={locked}
        title={locked ? "Locked — tap to let shuffle change it" : "Tap to lock against shuffle"}
        className="w-20 shrink-0 text-left text-[11px] uppercase tracking-widest text-black dark:text-white"
      >
        {label}
      </button>
      <input
        type="range"
        className="pslider flex-1"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        onChange={(e) => onChange(Number.parseFloat(e.target.value))}
      />
      <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-black dark:text-white">
        {isInt ? value : value.toFixed(2)}
      </span>
    </div>
  )
}

/** The desktop-only max-detail switch, shared by every engine's panel. */
function DetailSwitch({
  hiDetail,
  onToggle,
}: {
  hiDetail: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={hiDetail}
      className={`my-3 flex w-full items-center justify-between rounded-2xl border ${HAIR} px-3 py-2 transition active:scale-[0.99]`}
    >
      <span className="text-[11px] uppercase tracking-widest text-black dark:text-white">
        Max detail
      </span>
      <span
        className={`relative h-5 w-9 rounded-full border ${HAIR} transition ${
          hiDetail ? "bg-black dark:bg-white" : "bg-transparent"
        }`}
      >
        <span
          className={`absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all ${
            hiDetail
              ? "left-[18px] bg-white dark:bg-black"
              : "left-0.5 bg-black dark:bg-white"
          }`}
        />
      </span>
    </button>
  )
}

/** The half ↔ full expander every slider engine tucks its wall behind. */
function AllParamsToggle({
  full,
  onToggle,
}: {
  full: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      aria-expanded={full}
      className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-2xl border ${HAIR} py-2 text-[10px] font-semibold uppercase tracking-widest text-black/70 transition active:scale-[0.99] dark:text-white/70`}
    >
      {full ? (
        <>
          fewer controls
          <ChevronUp className="h-3.5 w-3.5" strokeWidth={2.2} />
        </>
      ) : (
        <>
          all parameters
          <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.2} />
        </>
      )}
    </button>
  )
}

/**
 * The print engine's whole control language: tiny stroke glyphs of the
 * silhouettes, tappable as chips. No sliders anywhere — each trait is a
 * handful of curated options you can see.
 */
const GLYPH = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }

const FORM_GLYPHS: ReactNode[] = [
  <svg key="pill" viewBox="0 0 20 20" className="h-5 w-5" {...GLYPH}><rect x="6" y="3.5" width="8" height="13" rx="3.6" /></svg>,
  <svg key="bulb" viewBox="0 0 20 20" className="h-5 w-5" {...GLYPH}><path d="M6.5 16.5 C4.8 12.5 5.2 8.2 7.8 5.6 C9 4.4 11 4.4 12.2 5.6 C14.8 8.2 15.2 12.5 13.5 16.5 Z" /></svg>,
  <svg key="urn" viewBox="0 0 20 20" className="h-5 w-5" {...GLYPH}><path d="M8.2 16.5 C5.6 15 4.2 11.5 5.8 8.6 C6.8 6.8 8.4 5.6 8.4 3.5 M11.6 3.5 C11.6 5.6 13.2 6.8 14.2 8.6 C15.8 11.5 14.4 15 11.8 16.5 Z M8.2 16.5 h3.6" /></svg>,
  <svg key="column" viewBox="0 0 20 20" className="h-5 w-5" {...GLYPH}><path d="M7.2 3.5 h5.6 M7.4 3.5 L7 16.5 M12.6 3.5 L13 16.5 M7 16.5 h6" /></svg>,
]

const CUP_GLYPHS: ReactNode[] = [
  <svg key="none" viewBox="0 0 20 20" className="h-5 w-5" {...GLYPH}><path d="M6 10 h8" /></svg>,
  <svg key="goblet" viewBox="0 0 20 20" className="h-5 w-5" {...GLYPH}><path d="M5.5 4 C5.5 9.5 7.3 12 10 12 C12.7 12 14.5 9.5 14.5 4 M10 12 V16.5" /></svg>,
  <svg key="trumpet" viewBox="0 0 20 20" className="h-5 w-5" {...GLYPH}><path d="M5 3.5 C7 8 8.6 9.6 8.6 12 V16.5 M15 3.5 C13 8 11.4 9.6 11.4 12 V16.5" /></svg>,
  <svg key="petal" viewBox="0 0 20 20" className="h-5 w-5" {...GLYPH}><path d="M5 7.5 C5 12.5 7 15 10 15 C13 15 15 12.5 15 7.5 M4.6 7.2 a1.8 1.8 0 0 1 3.6 0 M8.2 7.2 a1.8 1.8 0 0 1 3.6 0 M11.8 7.2 a1.8 1.8 0 0 1 3.6 0" /></svg>,
  <svg key="turbine" viewBox="0 0 20 20" className="h-5 w-5" {...GLYPH}><path d="M4.5 16 V7 M8.2 16 V4 M11.8 16 V4 M15.5 16 V7" /></svg>,
  <svg key="bell" viewBox="0 0 20 20" className="h-5 w-5" {...GLYPH}><path d="M7.5 3.5 h5 M12.5 3.5 C15 6 16 9.5 15.5 12.5 H4.5 C4 9.5 5 6 7.5 3.5 M8 12.5 v4 h4 v-4" /></svg>,
  <svg key="pagoda" viewBox="0 0 20 20" className="h-5 w-5" {...GLYPH}><path d="M8 3.5 h4 v2.5 M5.9 10.5 L7.6 6 h4.8 L14.1 10.5 Z M4 16.5 L6.1 10.5 M16 16.5 L13.9 10.5 M4 16.5 h12" /></svg>,
  <svg key="lantern" viewBox="0 0 20 20" className="h-5 w-5" {...GLYPH}><path d="M8.5 3.5 h3 M9 3.5 V5 M11 3.5 V5 M10 5 C13.2 5 14.8 6.8 14.8 8.6 C14.8 10 13.8 10.8 12.9 11 C14 11.5 14.6 12.6 14.6 13.6 C14.6 15.4 12.6 16.5 10 16.5 C7.4 16.5 5.4 15.4 5.4 13.6 C5.4 12.6 6 11.5 7.1 11 C6.2 10.8 5.2 10 5.2 8.6 C5.2 6.8 6.8 5 10 5 Z" /></svg>,
]

const TRAIT_GLYPHS: Partial<Record<PrintParamKey, ReactNode[]>> = {
  form: FORM_GLYPHS,
  cup: CUP_GLYPHS,
}

function TraitRow({
  label,
  options,
  value,
  glyphs,
  onPick,
}: {
  label: string
  options: string[]
  value: number
  glyphs?: ReactNode[]
  onPick: (i: number) => void
}) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="w-20 shrink-0 text-[11px] uppercase tracking-widest text-black dark:text-white">
        {label}
      </span>
      <div className="flex flex-1 flex-wrap gap-1.5">
        {options.map((name, i) => (
          <button
            key={name}
            onClick={() => onPick(i)}
            aria-pressed={i === value}
            title={name}
            className={
              glyphs
                ? `flex h-9 w-10 items-center justify-center rounded-xl border transition active:scale-95 ${
                    i === value
                      ? "border-transparent bg-black text-white dark:bg-white dark:text-black"
                      : `${HAIR} text-black dark:text-white`
                  }`
                : chipClass(i === value)
            }
          >
            {glyphs ? glyphs[i] : name}
          </button>
        ))}
      </div>
    </div>
  )
}

// eight representative dots keep the row on one line on a phone; the
// full 15-glaze palette stays in the model (pairings, shuffle and URLs
// still reach it) and an off-row active glaze takes the last slot
const SHOWN_GLAZES = [0, 4, 5, 6, 8, 11, 13, 14]

function GlazeRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (i: number) => void
}) {
  const active = Math.round(value)
  const shown = SHOWN_GLAZES.includes(active)
    ? SHOWN_GLAZES
    : [...SHOWN_GLAZES.slice(0, SHOWN_GLAZES.length - 1), active]
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="w-20 shrink-0 text-[11px] uppercase tracking-widest text-black dark:text-white">
        {label}
      </span>
      <div className="flex flex-1 flex-nowrap gap-1.5">
        {shown.map((i) => (
          <button
            key={GLAZES[i].name}
            onClick={() => onChange(i)}
            aria-label={`${label}: ${GLAZES[i].name}`}
            aria-pressed={i === active}
            title={GLAZES[i].name}
            className={`h-6 w-6 shrink-0 rounded-full border transition active:scale-90 ${
              i === active
                ? "border-black ring-1 ring-black dark:border-white dark:ring-white"
                : HAIR
            }`}
            style={{ backgroundColor: GLAZES[i].hex }}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * One totem trait, one surface: drag up for more of it, down for less;
 * tap to rethrow just this trait; the dot locks it against shuffle. The
 * whole parameter wall collapses into eight of these.
 */
function TraitTile({
  title,
  keys,
  params,
  locked,
  onPatch,
  onReroll,
  onToggleLock,
}: {
  title: string
  keys: { key: TotemKey; label: string }[]
  params: TotemParams
  locked: boolean
  onPatch: (patch: Partial<TotemParams>) => void
  onReroll: () => void
  onToggleLock: () => void
}) {
  const drag = useRef<{
    y0: number
    vals: Record<string, number>
    moved: boolean
  } | null>(null)

  // trait level — mean of the group's normalized params, feedback only
  let level = 0
  for (const { key } of keys) {
    const r = TOTEM_RANGES[key]
    level += (params[key] - r.min) / (r.max - r.min)
  }
  level /= keys.length

  const move = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dy = d.y0 - e.clientY
    if (!d.moved && Math.abs(dy) < 6) return
    d.moved = true
    const patch: Partial<TotemParams> = {}
    for (const { key } of keys) {
      const r = TOTEM_RANGES[key]
      let v = d.vals[key] + (dy / TILE_DRAG_PX) * (r.max - r.min)
      v = Math.min(r.max, Math.max(r.min, v))
      patch[key] = r.step >= 1 ? Math.round(v) : +v.toFixed(3)
    }
    onPatch(patch)
  }

  return (
    <div
      onPointerDown={(e) => {
        if (locked) return
        e.currentTarget.setPointerCapture(e.pointerId)
        const vals: Record<string, number> = {}
        for (const { key } of keys) vals[key] = params[key]
        drag.current = { y0: e.clientY, vals, moved: false }
      }}
      onPointerMove={move}
      onPointerUp={() => {
        const d = drag.current
        drag.current = null
        if (d && !d.moved && !locked) onReroll()
      }}
      onPointerCancel={() => (drag.current = null)}
      role="button"
      aria-label={`${title}: drag to shape, tap to reroll`}
      title={`${title} — drag ↑ for more, ↓ for less, tap to reroll`}
      className={`relative cursor-ns-resize touch-none select-none overflow-hidden rounded-2xl border ${HAIR} px-3 py-2.5 transition ${
        locked ? "opacity-35" : "active:scale-[0.985]"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-widest text-black dark:text-white">
          {title}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleLock()
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-pressed={locked}
          title={locked ? "Locked — tap to release" : "Lock against shuffle"}
          className="-mr-1 flex h-6 w-6 items-center justify-center rounded-full text-[13px] leading-none text-black/50 dark:text-white/50"
        >
          {locked ? "●" : "○"}
        </button>
      </div>
      {/* trait level — a quiet ink bar */}
      <div className="mt-2 h-[3px] w-full rounded-full bg-black/10 dark:bg-white/15">
        <div
          className="h-full rounded-full bg-black/70 transition-[width] duration-75 dark:bg-white/80"
          style={{ width: `${Math.round(level * 100)}%` }}
        />
      </div>
    </div>
  )
}

export function ControlsPanel({
  engine,
  params,
  printParams,
  holderParams,
  vesselParams,
  totemParams,
  isDesktop,
  hiDetail,
  shelf,
  onEngineChange,
  onToggleDetail,
  onChange,
  onPrintChange,
  onHolderChange,
  onVesselChange,
  onTotemChange,
  onKeep,
  onLoadKept,
  onRemoveKept,
}: {
  engine: Engine
  params: Params
  printParams: PrintParams
  holderParams: HolderParams
  vesselParams: VesselParams
  totemParams: TotemParams
  isDesktop: boolean
  hiDetail: boolean
  shelf: KeptPiece[]
  onEngineChange: (e: Engine) => void
  onToggleDetail: () => void
  onChange: (p: Params) => void
  onPrintChange: (p: PrintParams) => void
  onHolderChange: (p: HolderParams) => void
  onVesselChange: (p: VesselParams) => void
  onTotemChange: (p: TotemParams) => void
  onKeep: () => void
  onLoadKept: (k: KeptPiece) => void
  onRemoveKept: (id: number) => void
}) {
  // collapsed → half (designs, glazes, families) → full (every parameter)
  const [mode, setMode] = useState<"collapsed" | "half" | "full">("collapsed")
  const open = mode !== "collapsed"
  // tapped-locked parameters survive shuffle untouched — per engine
  const [locked, setLocked] = useState<ReadonlySet<ParamKey>>(new Set())
  const [lockedHolder, setLockedHolder] = useState<ReadonlySet<HolderKey>>(new Set())
  const [lockedVessel, setLockedVessel] = useState<ReadonlySet<VesselKey>>(new Set())
  const [lockedTotem, setLockedTotem] = useState<ReadonlySet<TotemKey>>(new Set())
  // shuffle roams across a motor's families unless its family is locked
  const [holderFamilyLocked, setHolderFamilyLocked] = useState(false)
  const [vesselFamilyLocked, setVesselFamilyLocked] = useState(false)
  // the totem seed field is free text: numbers are seeds, anything else
  // is a signature — «Iver» is always Iver's totem
  const [totemDraft, setTotemDraft] = useState<string | null>(null)

  const set = (patch: Partial<Params>) => onChange({ ...params, ...patch })
  const setPrint = (patch: Partial<PrintParams>) =>
    onPrintChange({ ...printParams, ...patch })
  const setHolder = (patch: Partial<HolderParams>) =>
    onHolderChange({ ...holderParams, ...patch })
  const setTotem = (patch: Partial<TotemParams>) =>
    onTotemChange({ ...totemParams, ...patch })
  const setVessel = (patch: Partial<VesselParams>) =>
    onVesselChange({ ...vesselParams, ...patch })

  function makeToggle<K>(setter: (fn: (prev: ReadonlySet<K>) => ReadonlySet<K>) => void) {
    return (key: K) =>
      setter((prev) => {
        const next = new Set(prev)
        if (next.has(key)) next.delete(key)
        else next.add(key)
        return next
      })
  }
  const toggleLock = makeToggle<ParamKey>(setLocked)
  const toggleHolderLock = makeToggle<HolderKey>(setLockedHolder)
  const toggleVesselLock = makeToggle<VesselKey>(setLockedVessel)
  const toggleTotemLock = makeToggle<TotemKey>(setLockedTotem)

  const toggleTotemGroupLock = (keys: { key: TotemKey }[]) =>
    setLockedTotem((prev) => {
      const next = new Set(prev)
      const all = keys.every(({ key }) => next.has(key))
      for (const { key } of keys) {
        if (all) next.delete(key)
        else next.add(key)
      }
      return next
    })

  const totemFromSeed = (seed: number, sig?: string) => {
    const next = genTotemParams(seed)
    for (const k of lockedTotem) next[k] = totemParams[k]
    onTotemChange(sig ? { ...next, sig } : next)
  }

  // rethrow one totem trait: sample a fresh design, keep only this group
  const rerollTotemGroup = (keys: { key: TotemKey }[]) => {
    const roll = genTotemParams(randomSeed())
    const patch: Partial<TotemParams> = {}
    for (const { key } of keys) if (!lockedTotem.has(key)) patch[key] = roll[key]
    onTotemChange({ ...totemParams, ...patch })
  }

  // shuffle stays inside the current engine — it never swaps them
  const shuffle = () => {
    if (engine === "print") {
      onPrintChange(randomizePrint(randomSeed()))
      return
    }
    if (engine === "holder") {
      const preset = holderFamilyLocked
        ? holderParams.preset
        : FAMILIES[Math.floor(Math.random() * FAMILIES.length)]
      const next = randomizeHolder(randomSeed(), preset)
      // the candle is a functional choice, never randomized away
      next.candle = holderParams.candle
      // tealight holders stay low regardless of which preset was rolled
      if (next.candle === "telys") next.height = Math.min(next.height, 1.25)
      for (const k of lockedHolder) next[k] = holderParams[k]
      onHolderChange(next)
      return
    }
    if (engine === "vessel") {
      const preset = vesselFamilyLocked
        ? vesselParams.preset
        : VESSEL_FAMILIES[Math.floor(Math.random() * VESSEL_FAMILIES.length)]
      const next = randomizeVessel(randomSeed(), preset)
      for (const k of lockedVessel) next[k] = vesselParams[k]
      onVesselChange(next)
      return
    }
    if (engine === "totem") {
      totemFromSeed(randomSeed())
      return
    }
    const next = randomizeParams(randomSeed())
    for (const k of locked) next[k] = params[k]
    onChange(next)
  }

  // STL downloads exist where the home studios offered them
  const downloadSTL =
    engine === "holder"
      ? () => downloadHolderSTL(holderParams)
      : engine === "vessel"
        ? () => downloadVesselSTL(vesselParams)
        : engine === "totem"
          ? () => downloadTotemSTL(totemParams)
          : null

  // a combo chip is lit while both glazes still match its pairing
  const activeCombo = COMBOS.find(
    (c) =>
      Math.round(params.glazeB) === c.glazeB &&
      Math.round(params.glazeT) === c.glazeT,
  )?.name

  // what the piece calls itself in the header, per engine
  const totemTitle = totemParams.sig?.trim() || genName(totemParams.seed)
  const totemMm = Math.round(totemParams.height * TOTEM_MM)
  const headerName =
    engine === "print"
      ? printName(printParams)
      : engine === "holder"
        ? holderParams.preset
        : engine === "vessel"
          ? vesselParams.preset
          : engine === "totem"
            ? `«${totemTitle}» ${totemMm} mm`
            : designName(params)
  const headerSeed =
    engine === "print"
      ? printParams.seed
      : engine === "holder"
        ? holderParams.seed
        : engine === "vessel"
          ? vesselParams.seed
          : engine === "totem"
            ? totemParams.seed
            : params.seed

  const totemShown = totemDraft ?? totemParams.sig ?? String(totemParams.seed)
  const commitTotem = () => {
    if (totemDraft === null) return
    const t = totemDraft.trim()
    setTotemDraft(null)
    if (!t || t === (totemParams.sig ?? String(totemParams.seed))) return
    if (/^\d{1,9}$/.test(t)) totemFromSeed(Math.max(1, parseInt(t, 10)))
    else totemFromSeed(seedFromText(t), t.slice(0, 24))
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 flex justify-center px-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
      <div className={`pointer-events-auto w-full max-w-md rounded-3xl border ${HAIR} bg-white dark:bg-black`}>
        {/* header row — the engine picker, then the piece introduces
            itself. Every motor from the four studios lives in this one
            dropdown. */}
        <div className="flex items-center gap-1.5 p-2.5">
          <select
            value={engine}
            onChange={(e) => onEngineChange(e.target.value as Engine)}
            aria-label="Engine"
            className={`h-8 shrink-0 appearance-none rounded-full border ${HAIR} bg-transparent pl-3 pr-2 text-[11px] uppercase tracking-widest text-black outline-none dark:text-white [&>option]:normal-case [&>option]:bg-white dark:[&>option]:bg-black`}
          >
            {ENGINES.map((eng) => (
              <option key={eng.id} value={eng.id}>
                {eng.label}
              </option>
            ))}
          </select>
          <span className="min-w-0 flex-1 truncate pl-1 text-[11px] uppercase tracking-widest text-black/60 dark:text-white/60">
            {headerName}
            <span className="pl-1.5 tabular-nums tracking-widest text-black/40 dark:text-white/40">
              {headerSeed}
            </span>
          </span>

          <button
            onClick={() => {
              onKeep()
              if (mode === "collapsed") setMode("half")
            }}
            aria-label="Keep this piece on your shelf"
            title="Keep this piece on your shelf"
            className={ICON_BTN}
          >
            <Bookmark className="h-4 w-4" strokeWidth={2.2} />
          </button>
          <button
            onClick={shuffle}
            aria-label="Randomize design"
            className={ICON_BTN_SOLID}
          >
            <Shuffle className="h-4 w-4" strokeWidth={2.2} />
          </button>
          {downloadSTL && (
            <button
              onClick={downloadSTL}
              aria-label="Download STL"
              title="Download print-ready STL"
              className={ICON_BTN}
            >
              <Download className="h-4 w-4" strokeWidth={2.2} />
            </button>
          )}
          <button
            onClick={() => setMode(open ? "collapsed" : "half")}
            aria-label={open ? "Hide controls" : "Show controls"}
            aria-expanded={open}
            className={ICON_BTN}
          >
            {open ? (
              <ChevronDown className="h-4 w-4" strokeWidth={2.2} />
            ) : (
              <SlidersHorizontal className="h-4 w-4" strokeWidth={2.2} />
            )}
          </button>
        </div>

        {/* expandable body */}
        {open && (
          <div className="max-h-[56vh] overflow-y-auto px-4 pb-4">
            {/* the shelf — pieces this visitor kept, across visits and
                engines; a kept piece brings its engine back with it */}
            {shelf.length > 0 && (
              <div className="mb-3">
                <p className="pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-black/50 dark:text-white/50">
                  shelf
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {shelf.map((k) => (
                    <div key={k.id} className="relative shrink-0">
                      <button
                        onClick={() => onLoadKept(k)}
                        title={`${k.name} ${k.params.seed}`}
                        aria-label={`Bring back ${k.name} ${k.params.seed}`}
                        className={`block h-16 w-14 overflow-hidden rounded-xl border ${HAIR} transition active:scale-95`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={k.thumb}
                          alt={k.name}
                          className="h-full w-full object-cover"
                        />
                      </button>
                      <button
                        onClick={() => onRemoveKept(k.id)}
                        aria-label={`Remove ${k.name} from the shelf`}
                        className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-black text-[10px] leading-none text-white transition active:scale-90 dark:bg-white dark:text-black"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {engine === "print" && (
              <>
                {/* filament inks */}
                {(["inkBase", "inkCup"] as const).map((key) => (
                  <div key={key} className="flex items-center gap-3 py-1.5">
                    <span className="w-20 shrink-0 text-[11px] uppercase tracking-widest text-black dark:text-white">
                      {key === "inkBase" ? "body ink" : "cup ink"}
                    </span>
                    <div className="flex flex-1 flex-wrap gap-1.5">
                      {INKS.map((ink, i) => (
                        <button
                          key={ink.name}
                          onClick={() => setPrint({ [key]: i })}
                          aria-label={`${key === "inkBase" ? "body" : "cup"} ink: ${ink.name}`}
                          aria-pressed={i === Math.round(printParams[key])}
                          title={ink.name}
                          className={`h-6 w-6 rounded-full border transition active:scale-90 ${
                            i === Math.round(printParams[key])
                              ? "border-black ring-1 ring-black dark:border-white dark:ring-white"
                              : HAIR
                          }`}
                          style={{ backgroundColor: ink.hex }}
                        />
                      ))}
                    </div>
                  </div>
                ))}

                {/* the whole form language as tappable trait chips */}
                {PRINT_TRAITS.map(({ key, label, options }) => (
                  <TraitRow
                    key={key}
                    label={label}
                    options={options}
                    value={Math.round(printParams[key])}
                    glyphs={TRAIT_GLYPHS[key]}
                    onPick={(i) => setPrint({ [key]: i })}
                  />
                ))}

                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setPrint({ seed: randomSeed() })}
                    className={chipClass(false)}
                    title="New seed, same traits — reflows the details"
                  >
                    reseed
                  </button>
                  <button
                    onClick={() => onPrintChange(randomizePrint(dailySeed()))}
                    className={chipClass(printParams.seed === dailySeed())}
                    title="Today's print — everyone gets this same piece today"
                  >
                    today
                  </button>
                </div>

                {isDesktop && <DetailSwitch hiDetail={hiDetail} onToggle={onToggleDetail} />}
              </>
            )}

            {engine === "holder" && (
              <>
                {/* the growth family — a curated starting point, not a
                    fixed shape; shuffle roams families unless locked */}
                <div className="flex items-center gap-3 py-1.5">
                  <span className="w-20 shrink-0 text-[11px] uppercase tracking-widest text-black dark:text-white">
                    family
                  </span>
                  <select
                    value={holderParams.preset}
                    onChange={(e) =>
                      onHolderChange({
                        ...genHolderParams(holderParams.seed, e.target.value),
                        candle: holderParams.candle,
                      })
                    }
                    aria-label="Preset family"
                    className={`h-8 min-w-0 flex-1 appearance-none rounded-full border ${HAIR} bg-transparent px-3 text-[11px] uppercase tracking-widest text-black outline-none dark:text-white [&>option]:bg-white dark:[&>option]:bg-black`}
                  >
                    {FAMILIES.map((fam) => (
                      <option key={fam} value={fam}>
                        {fam}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setHolderFamilyLocked((l) => !l)}
                    className={chipClass(holderFamilyLocked)}
                    title={
                      holderFamilyLocked
                        ? "Family locked — shuffle stays in this family"
                        : "Tap to lock the family against shuffle"
                    }
                  >
                    {holderFamilyLocked ? "locked" : "lock"}
                  </button>
                </div>

                <div className="mb-1 flex flex-wrap gap-1.5 pt-1">
                  <button
                    onClick={() => setHolder({ mirror: holderParams.mirror >= 0.5 ? 0 : 1 })}
                    className={chipClass(holderParams.mirror >= 0.5)}
                    title="Dihedral symmetry: mirror each wedge"
                  >
                    mirror
                  </button>
                  <button
                    onClick={() => setHolder({ seed: randomSeed() })}
                    className={chipClass(false)}
                    title="New growth seed, same parameters"
                  >
                    reseed
                  </button>
                </div>

                {/* which real candle the socket is built for */}
                <div className="mb-1">
                  <p className="pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-black/50 dark:text-white/50">
                    Lys
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.keys(CANDLE_SPECS) as CandleType[]).map((c) => (
                      <button
                        key={c}
                        onClick={() => setHolder({ candle: c })}
                        className={chipClass(holderParams.candle === c)}
                        title={CANDLE_SPECS[c].label}
                      >
                        {CANDLE_SPECS[c].label}
                      </button>
                    ))}
                  </div>
                </div>

                {isDesktop && <DetailSwitch hiDetail={hiDetail} onToggle={onToggleDetail} />}

                <AllParamsToggle
                  full={mode === "full"}
                  onToggle={() => setMode(mode === "full" ? "half" : "full")}
                />

                {mode === "full" && (
                  <>
                    {HOLDER_SECTIONS.map(({ title, keys }) => (
                      <div key={title} className="mb-2">
                        <p className="pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-black/50 dark:text-white/50">
                          {title}
                        </p>
                        {keys.map(({ key, label }) => (
                          <Row
                            key={key}
                            label={label}
                            value={holderParams[key]}
                            range={HOLDER_RANGES[key]}
                            locked={lockedHolder.has(key)}
                            onChange={(v) => setHolder({ [key]: v } as Partial<HolderParams>)}
                            onToggleLock={() => toggleHolderLock(key)}
                          />
                        ))}
                      </div>
                    ))}
                    <p className="pt-2 text-center text-[10px] uppercase tracking-widest text-black/60 dark:text-white/60">
                      grown from symmetries · booleans · lattices
                      <br />
                      stl in mm · sokkel{" "}
                      {holderParams.candle === "telys" ? "Ø41 × 12 mm" : "Ø23 × 28 mm"}
                    </p>
                  </>
                )}
              </>
            )}

            {engine === "vessel" && (
              <>
                {/* one motor, twelve reference families — shuffle roams
                    them; lock the family to stay inside it */}
                <div className="flex items-center gap-3 py-1.5">
                  <span className="w-20 shrink-0 text-[11px] uppercase tracking-widest text-black dark:text-white">
                    family
                  </span>
                  <span className="flex-1 text-[11px] uppercase tracking-widest text-black/60 dark:text-white/60">
                    {vesselParams.preset}
                  </span>
                  <button
                    onClick={() => setVesselFamilyLocked((l) => !l)}
                    className={chipClass(vesselFamilyLocked)}
                    title={
                      vesselFamilyLocked
                        ? "Family locked — shuffle stays in this family"
                        : "Tap to lock the family against shuffle"
                    }
                  >
                    {vesselFamilyLocked ? "locked" : "lock"}
                  </button>
                </div>

                <div className="mb-1 flex flex-wrap gap-1.5 pt-1">
                  <button
                    onClick={() => setVessel({ seed: randomSeed() })}
                    className={chipClass(false)}
                    title="New seed, same parameters"
                  >
                    reseed
                  </button>
                </div>

                {isDesktop && <DetailSwitch hiDetail={hiDetail} onToggle={onToggleDetail} />}

                <AllParamsToggle
                  full={mode === "full"}
                  onToggle={() => setMode(mode === "full" ? "half" : "full")}
                />

                {mode === "full" &&
                  VESSEL_SECTIONS.map(({ title, keys }) => (
                    <div key={title} className="mb-2">
                      <p className="pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-black/50 dark:text-white/50">
                        {title}
                      </p>
                      {keys.map(({ key, label }) => (
                        <Row
                          key={key}
                          label={label}
                          value={vesselParams[key]}
                          range={VESSEL_RANGES[key]}
                          locked={lockedVessel.has(key)}
                          onChange={(v) => setVessel({ [key]: v } as Partial<VesselParams>)}
                          onToggleLock={() => toggleVesselLock(key)}
                        />
                      ))}
                    </div>
                  ))}
              </>
            )}

            {engine === "totem" && (
              <>
                {/* the seed field is free text: numbers are seeds, any
                    other text is a signature — «Iver» is always Iver's
                    totem, and the label carries its true height */}
                <div className="flex items-center gap-1.5 py-1.5">
                  <input
                    value={totemShown}
                    onChange={(e) => setTotemDraft(e.target.value)}
                    onBlur={commitTotem}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur()
                    }}
                    spellCheck={false}
                    autoComplete="off"
                    placeholder="seed or name"
                    aria-label="Seed number or a name — text becomes its own totem"
                    title="Type a number or any name — text is a seed of its own"
                    className={`h-10 w-32 min-w-0 flex-1 rounded-full border ${HAIR} bg-transparent px-3.5 text-xs font-medium tabular-nums tracking-widest text-black outline-none focus:border-black/40 dark:text-white dark:focus:border-white/50`}
                  />
                  <span className="shrink-0 pl-1 text-[10px] tabular-nums text-black/40 dark:text-white/40">
                    {totemMm} mm
                  </span>
                </div>

                {/* eight traits, one gesture each */}
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {TOTEM_SECTIONS.map(({ title: t, keys }) => (
                    <TraitTile
                      key={t}
                      title={t}
                      keys={keys}
                      params={totemParams}
                      locked={keys.every(({ key }) => lockedTotem.has(key))}
                      onPatch={setTotem}
                      onReroll={() => rerollTotemGroup(keys)}
                      onToggleLock={() => toggleTotemGroupLock(keys)}
                    />
                  ))}
                </div>
                <p className="px-1.5 pt-2 text-center text-[10px] tracking-wide text-black/35 dark:text-white/35">
                  drag a trait to shape it · tap to rethrow it · ○ locks it
                </p>

                {isDesktop && <DetailSwitch hiDetail={hiDetail} onToggle={onToggleDetail} />}

                <AllParamsToggle
                  full={mode === "full"}
                  onToggle={() => setMode(mode === "full" ? "half" : "full")}
                />

                {/* the full parameter list, tucked away for precision work */}
                {mode === "full" &&
                  TOTEM_SECTIONS.map(({ title: t, keys }) => (
                    <div key={t} className="mb-2">
                      <p className="pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-black/50 dark:text-white/50">
                        {t}
                      </p>
                      {keys.map(({ key, label }) => (
                        <Row
                          key={key}
                          label={label}
                          value={totemParams[key]}
                          range={TOTEM_RANGES[key]}
                          locked={lockedTotem.has(key)}
                          onChange={(v) => setTotem({ [key]: v } as Partial<TotemParams>)}
                          onToggleLock={() => toggleTotemLock(key)}
                        />
                      ))}
                    </div>
                  ))}
              </>
            )}

            {engine === "clay" && (
              <>
                {/* glaze pairing — one compact dropdown instead of a wall
                    of chips; the two dots always show the current pairing */}
                <div className="flex items-center gap-3 py-1.5">
                  <span className="w-20 shrink-0 text-[11px] uppercase tracking-widest text-black dark:text-white">
                    pairing
                  </span>
                  <span className="flex shrink-0 -space-x-1">
                    <span
                      className="h-4 w-4 rounded-full border border-black/20 dark:border-white/25"
                      style={{ backgroundColor: glazeHex(params.glazeB) }}
                    />
                    <span
                      className="h-4 w-4 rounded-full border border-black/20 dark:border-white/25"
                      style={{ backgroundColor: glazeHex(params.glazeT) }}
                    />
                  </span>
                  <select
                    value={activeCombo ?? "custom"}
                    onChange={(e) => {
                      const combo = COMBOS.find((c) => c.name === e.target.value)
                      if (combo) set({ glazeB: combo.glazeB, glazeT: combo.glazeT })
                    }}
                    aria-label="Glaze pairing"
                    className={`h-8 min-w-0 flex-1 appearance-none rounded-full border ${HAIR} bg-transparent px-3 text-[11px] uppercase tracking-widest text-black outline-none dark:text-white [&>option]:bg-white dark:[&>option]:bg-black`}
                  >
                    {!activeCombo && (
                      <option value="custom" disabled>
                        custom
                      </option>
                    )}
                    {COMBOS.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* material: wet glaze or dry satin */}
                <div className="mb-1 flex items-center gap-3 py-1.5">
                  <span className="w-20 shrink-0 text-[11px] uppercase tracking-widest text-black dark:text-white">
                    finish
                  </span>
                  <div className="flex flex-1 flex-wrap gap-1.5">
                    <button
                      onClick={() => set({ gloss: 1 })}
                      className={chipClass(params.gloss >= 0.7)}
                    >
                      gloss
                    </button>
                    <button
                      onClick={() => set({ gloss: 0.15 })}
                      className={chipClass(params.gloss < 0.7)}
                    >
                      satin
                    </button>
                  </div>
                </div>

                <GlazeRow
                  label="body"
                  value={params.glazeB}
                  onChange={(i) => set({ glazeB: i })}
                />
                <GlazeRow
                  label="crown"
                  value={params.glazeT}
                  onChange={(i) => set({ glazeT: i })}
                />

                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    onClick={() => set({ seed: randomSeed() })}
                    className={chipClass(false)}
                    title="New seed, same parameters — a different throw of this form"
                  >
                    reseed
                  </button>
                  <button
                    onClick={() => onChange(randomizeParams(dailySeed()))}
                    className={chipClass(params.seed === dailySeed())}
                    title="Today's firing — everyone gets this same piece today"
                  >
                    today
                  </button>
                </div>

                {isDesktop && <DetailSwitch hiDetail={hiDetail} onToggle={onToggleDetail} />}

                <AllParamsToggle
                  full={mode === "full"}
                  onToggle={() => setMode(mode === "full" ? "half" : "full")}
                />

                {mode === "full" &&
                  SECTIONS.map(({ title, keys }) => (
                    <div key={title} className="mb-2">
                      <p className="pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-black/50 dark:text-white/50">
                        {title}
                      </p>
                      {keys.map(({ key, label }) => (
                        <Row
                          key={key}
                          label={label}
                          value={params[key]}
                          range={PARAM_RANGES[key]}
                          locked={locked.has(key)}
                          onChange={(v) => set({ [key]: v } as Partial<Params>)}
                          onToggleLock={() => toggleLock(key)}
                        />
                      ))}
                    </div>
                  ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
