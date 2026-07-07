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
  PARAM_RANGES,
  PRESETS,
  type SculptureParams,
  type FormType,
} from "@/lib/parametric-sculpture"
import {
  FIN_FAMILIES,
  FIN_PARAM_RANGES,
  genFinParams,
  randomFinSeed,
  type FinParams,
} from "@/lib/fin-sculpture"
import { downloadSTL } from "@/lib/export-stl"

type Key = keyof typeof PARAM_RANGES

const SLIDERS: { key: Key; label: string }[] = [
  { key: "fins", label: "Fins" },
  { key: "finDepth", label: "Depth" },
  { key: "finSharpness", label: "Blade" },
  { key: "twist", label: "Twist" },
  { key: "waviness", label: "Ripples" },
  { key: "wavAmount", label: "Ripple amt" },
  { key: "bulge", label: "Bulge" },
  { key: "flare", label: "Flare" },
]

type FinKey = keyof typeof FIN_PARAM_RANGES

const FIN_SLIDERS: { key: FinKey; label: string }[] = [
  { key: "fins", label: "Fins" },
  { key: "rows", label: "Rows" },
  { key: "stacks", label: "Stacks" },
  { key: "height", label: "Height" },
  { key: "rOut", label: "Spread" },
  { key: "starAmp", label: "Wave" },
  { key: "bead", label: "Bead" },
  { key: "spike", label: "Spines" },
  { key: "facet", label: "Facet" },
  { key: "foot", label: "Feet" },
  { key: "rimWave", label: "Rim" },
  { key: "punch", label: "Holes" },
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
  finParams,
  playing,
  speed,
  isDesktop,
  hiDetail,
  onToggleDetail,
  onTogglePlay,
  onToggleSpeed,
  onChange,
  onFinChange,
  onRandomize,
}: {
  params: SculptureParams
  finParams: FinParams
  playing: boolean
  speed: number
  isDesktop: boolean
  hiDetail: boolean
  onToggleDetail: () => void
  onTogglePlay: () => void
  onToggleSpeed: () => void
  onChange: (p: SculptureParams) => void
  onFinChange: (p: FinParams) => void
  onRandomize: () => void
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

  const set = (patch: Partial<SculptureParams>) => onChange({ ...params, ...patch })
  const setFin = (patch: Partial<FinParams>) => onFinChange({ ...finParams, ...patch })

  const isFin = params.form === "fin"

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 flex justify-center px-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
      <div className={`pointer-events-auto w-full max-w-md rounded-3xl border ${HAIR} bg-white dark:bg-black`}>
        {/* header row */}
        <div className="flex items-center gap-1.5 p-2.5">
          {/* form toggle */}
          <div className={`flex rounded-full border ${HAIR} p-0.5`}>
            {(["ring", "vessel", "fin"] as FormType[]).map((f) => (
              <button
                key={f}
                onClick={() => set({ form: f })}
                className={`min-h-[34px] rounded-full px-3 text-xs font-medium capitalize transition ${
                  params.form === f
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "text-black dark:text-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          <button
            onClick={handlePlayTap}
            aria-label={playing ? "Pause animation" : "Play animation"}
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
            onClick={onRandomize}
            aria-label="Randomize form"
            className={ICON_BTN_SOLID}
          >
            <Shuffle className="h-4 w-4" strokeWidth={2.2} />
          </button>
          <button
            onClick={() => downloadSTL(params, finParams)}
            aria-label="Download STL"
            title="Download STL"
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
            {isFin ? (
              <>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {FIN_FAMILIES.map((fam) => (
                    <button
                      key={fam}
                      onClick={() => onFinChange(genFinParams(randomFinSeed(), fam))}
                      className={chipClass(finParams.family === fam)}
                    >
                      {fam}
                    </button>
                  ))}
                </div>

                {FIN_SLIDERS.map(({ key, label }) => (
                  <Row
                    key={key}
                    label={label}
                    value={finParams[key]}
                    range={FIN_PARAM_RANGES[key]}
                    onChange={(v) => setFin({ [key]: v } as Partial<FinParams>)}
                  />
                ))}

                <p className="pt-2 text-center text-[10px] uppercase tracking-widest text-black/60 dark:text-white/60">
                  seed {finParams.seed} · {finParams.family}
                </p>
              </>
            ) : (
              <>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {PRESETS.map((p) => (
                    <button
                      key={p.name}
                      onClick={() => onChange(p.params)}
                      className={chipClass(false)}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>

                {SLIDERS.map(({ key, label }) => (
                  <Row
                    key={key}
                    label={label}
                    value={params[key] as number}
                    range={PARAM_RANGES[key]}
                    onChange={(v) => set({ [key]: v } as Partial<SculptureParams>)}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
