"use client"

import { useState } from "react"
import { Shuffle, SlidersHorizontal, ChevronDown, Download } from "lucide-react"
import {
  CANDLE_SPECS,
  FAMILIES,
  PARAM_RANGES,
  genParams,
  randomizeParams,
  randomSeed,
  type CandleType,
  type ParamKey,
  type HolderParams,
} from "@/lib/candle-holder"
import { downloadSTL } from "@/lib/export-stl"

type Section = { title: string; keys: { key: ParamKey; label: string }[] }

const SECTIONS: Section[] = [
  {
    title: "Symmetry",
    keys: [{ key: "symmetry", label: "Order" }],
  },
  {
    title: "Growth",
    keys: [
      { key: "depth", label: "Depth" },
      { key: "branches", label: "Branches" },
      { key: "branchSpread", label: "Spread" },
      { key: "length", label: "Length" },
      { key: "decay", label: "Decay" },
      { key: "gravity", label: "Gravity" },
      { key: "outward", label: "Outward" },
      { key: "curl", label: "Curl" },
      { key: "wiggle", label: "Wiggle" },
      { key: "loopiness", label: "Loops" },
      { key: "rings", label: "Rings" },
    ],
  },
  {
    title: "Body",
    keys: [
      { key: "height", label: "Height" },
      { key: "spread", label: "Radius" },
      { key: "tube", label: "Tube" },
      { key: "taper", label: "Taper" },
      { key: "blend", label: "Blend" },
      { key: "bulb", label: "Bulbs" },
      { key: "open", label: "Open" },
      { key: "shell", label: "Shell" },
    ],
  },
  {
    title: "Cup",
    keys: [
      { key: "cup", label: "Cup" },
      { key: "cupPos", label: "Height" },
      { key: "dish", label: "Dish" },
      { key: "rimWave", label: "Rim" },
    ],
  },
]

// monochrome controls — solid black/white ink, thin subtle hairline outlines
const HAIR = "border-black/15 dark:border-white/20"
const ICON_BTN =
  `flex h-10 w-10 items-center justify-center rounded-full border ${HAIR} text-black transition active:scale-95 dark:text-white`
const ICON_BTN_SOLID =
  "flex h-10 w-10 items-center justify-center rounded-full bg-black text-white transition active:scale-95 dark:bg-white dark:text-black"

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
  onChange,
}: {
  label: string
  value: number
  range: { min: number; max: number; step: number }
  onChange: (v: number) => void
}) {
  const isInt = range.step >= 1
  return (
    <label className="flex items-center gap-3 py-1.5">
      <span className="w-20 shrink-0 text-[11px] uppercase tracking-widest text-black dark:text-white">
        {label}
      </span>
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
    </label>
  )
}

export function ControlsPanel({
  params,
  isDesktop,
  hiDetail,
  onToggleDetail,
  onChange,
}: {
  params: HolderParams
  isDesktop: boolean
  hiDetail: boolean
  onToggleDetail: () => void
  onChange: (p: HolderParams) => void
}) {
  const [open, setOpen] = useState(false)

  const set = (patch: Partial<HolderParams>) => onChange({ ...params, ...patch })

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 flex justify-center px-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
      <div className={`pointer-events-auto w-full max-w-md rounded-3xl border ${HAIR} bg-white dark:bg-black`}>
        {/* header row */}
        <div className="flex items-center gap-1.5 p-2.5">
          <span className="px-1.5 text-[11px] uppercase tracking-widest text-black/60 dark:text-white/60">
            {params.preset} · {params.seed}
          </span>

          <div className="flex-1" />

          <button
            onClick={() => onChange(randomizeParams(randomSeed(), params.preset))}
            aria-label="Randomize holder"
            className={ICON_BTN_SOLID}
          >
            <Shuffle className="h-4 w-4" strokeWidth={2.2} />
          </button>
          <button
            onClick={() => downloadSTL(params)}
            aria-label="Download STL"
            title="Download print-ready STL"
            className={ICON_BTN}
          >
            <Download className="h-4 w-4" strokeWidth={2.2} />
          </button>
          <button
            onClick={() => setOpen((o) => !o)}
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
            <div className="mb-2 flex flex-wrap gap-1.5">
              {FAMILIES.map((fam) => (
                <button
                  key={fam}
                  onClick={() => onChange(genParams(params.seed, fam))}
                  className={chipClass(params.preset === fam)}
                >
                  {fam}
                </button>
              ))}
            </div>
            <div className="mb-3 flex flex-wrap gap-1.5">
              <button
                onClick={() => set({ mirror: params.mirror >= 0.5 ? 0 : 1 })}
                className={chipClass(params.mirror >= 0.5)}
                title="Dihedral symmetry: mirror each wedge"
              >
                mirror
              </button>
              <button
                onClick={() => set({ seed: randomSeed() })}
                className={chipClass(false)}
                title="New growth seed, same parameters"
              >
                reseed
              </button>
            </div>

            {isDesktop && (
              <button
                onClick={onToggleDetail}
                role="switch"
                aria-checked={hiDetail}
                className={`mb-3 flex w-full items-center justify-between rounded-2xl border ${HAIR} px-3 py-2 transition active:scale-[0.99]`}
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
            )}

            {/* which real candle the socket is built for */}
            <div className="mb-1">
              <p className="pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-black/50 dark:text-white/50">
                Lys
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(CANDLE_SPECS) as CandleType[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => set({ candle: c })}
                    className={chipClass(params.candle === c)}
                    title={CANDLE_SPECS[c].label}
                  >
                    {CANDLE_SPECS[c].label}
                  </button>
                ))}
              </div>
            </div>

            {SECTIONS.map(({ title, keys }) => (
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
                    onChange={(v) => set({ [key]: v } as Partial<HolderParams>)}
                  />
                ))}
              </div>
            ))}

            <p className="pt-2 text-center text-[10px] uppercase tracking-widest text-black/60 dark:text-white/60">
              grown from symmetries · booleans · lattices
              <br />
              stl in mm · sokkel{" "}
              {params.candle === "telys" ? "Ø41 × 12 mm" : "Ø23 × 28 mm"}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
