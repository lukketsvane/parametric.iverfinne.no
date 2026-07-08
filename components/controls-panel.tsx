"use client"

import { useEffect, useRef, useState } from "react"
import {
  Shuffle,
  SlidersHorizontal,
  ChevronDown,
  Play,
  Pause,
  Download,
} from "lucide-react"
import {
  FAMILIES,
  PARAM_RANGES,
  genParams,
  randomSeed,
  type Family,
  type HolderParams,
} from "@/lib/candle-holder"
import { downloadSTL } from "@/lib/export-stl"

type Key = keyof typeof PARAM_RANGES

const SLIDERS: { key: Key; label: string; bloomOnly?: boolean }[] = [
  { key: "symmetry", label: "Symmetry" },
  { key: "spread", label: "Spread" },
  { key: "height", label: "Height" },
  { key: "tube", label: "Tube" },
  { key: "blend", label: "Blend" },
  { key: "bulb", label: "Bulbs" },
  { key: "arch", label: "Arch" },
  { key: "twist", label: "Twist" },
  { key: "cup", label: "Cup" },
  { key: "open", label: "Open" },
  { key: "dish", label: "Dish", bloomOnly: true },
  { key: "rimWave", label: "Rim", bloomOnly: true },
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
  playing,
  speed,
  isDesktop,
  hiDetail,
  onToggleDetail,
  onTogglePlay,
  onToggleSpeed,
  onChange,
}: {
  params: HolderParams
  playing: boolean
  speed: number
  isDesktop: boolean
  hiDetail: boolean
  onToggleDetail: () => void
  onTogglePlay: () => void
  onToggleSpeed: () => void
  onChange: (p: HolderParams) => void
}) {
  const [open, setOpen] = useState(false)

  // one tap on the play button toggles play/pause; a double tap toggles 2x
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (tapTimer.current) clearTimeout(tapTimer.current)
  }, [])
  const handlePlayTap = () => {
    if (tapTimer.current) {
      clearTimeout(tapTimer.current)
      tapTimer.current = null
      onToggleSpeed()
    } else {
      tapTimer.current = setTimeout(() => {
        tapTimer.current = null
        onTogglePlay()
      }, 240)
    }
  }

  const set = (patch: Partial<HolderParams>) => onChange({ ...params, ...patch })
  const setFamily = (family: Family) => onChange(genParams(params.seed, family))

  const sliders = SLIDERS.filter(
    (s) => !s.bloomOnly || params.family === "bloom",
  )

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 flex justify-center px-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
      <div className={`pointer-events-auto w-full max-w-md rounded-3xl border ${HAIR} bg-white dark:bg-black`}>
        {/* header row */}
        <div className="flex items-center gap-1.5 p-2.5">
          <span className="px-1.5 text-[11px] uppercase tracking-widest text-black/60 dark:text-white/60">
            {params.family} · {params.seed}
          </span>

          <div className="flex-1" />

          <button
            onClick={handlePlayTap}
            aria-label={playing ? "Pause turntable" : "Spin turntable"}
            title="Tap: play / pause · Double-tap: 2× speed"
            className={`relative ${ICON_BTN}`}
          >
            {playing ? (
              <Pause className="h-4 w-4" strokeWidth={2.2} />
            ) : (
              <Play className="h-4 w-4" strokeWidth={2.2} />
            )}
            {speed === 2 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-black px-1 text-[9px] font-bold leading-none text-white dark:bg-white dark:text-black">
                2×
              </span>
            )}
          </button>
          <button
            onClick={() => onChange(genParams(randomSeed(), params.family))}
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
          <div className="max-h-[52vh] overflow-y-auto px-4 pb-4">
            <div className="mb-3 flex flex-wrap gap-1.5">
              {FAMILIES.map((fam) => (
                <button
                  key={fam}
                  onClick={() => setFamily(fam)}
                  className={chipClass(params.family === fam)}
                >
                  {fam}
                </button>
              ))}
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

            {sliders.map(({ key, label }) => (
              <Row
                key={key}
                label={label}
                value={params[key]}
                range={PARAM_RANGES[key]}
                onChange={(v) => set({ [key]: v } as Partial<HolderParams>)}
              />
            ))}

            <p className="pt-2 text-center text-[10px] uppercase tracking-widest text-black/60 dark:text-white/60">
              symmetries · booleans · lattices
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
