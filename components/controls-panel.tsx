"use client"

import { useState } from "react"
import { Shuffle, SlidersHorizontal, ChevronDown, Play, Pause } from "lucide-react"
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
  { key: "pw", label: "Edge" },
  { key: "shear", label: "Slant" },
  { key: "thick", label: "Thick" },
  { key: "punch", label: "Holes" },
]

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
      <span className="w-20 shrink-0 text-[11px] uppercase tracking-widest text-neutral-500">
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
      <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-neutral-400">
        {isInt ? value : value.toFixed(2)}
      </span>
    </label>
  )
}

export function ControlsPanel({
  params,
  finParams,
  playing,
  onTogglePlay,
  onChange,
  onFinChange,
  onRandomize,
}: {
  params: SculptureParams
  finParams: FinParams
  playing: boolean
  onTogglePlay: () => void
  onChange: (p: SculptureParams) => void
  onFinChange: (p: FinParams) => void
  onRandomize: () => void
}) {
  const [open, setOpen] = useState(false)

  const set = (patch: Partial<SculptureParams>) => onChange({ ...params, ...patch })
  const setFin = (patch: Partial<FinParams>) => onFinChange({ ...finParams, ...patch })

  const isFin = params.form === "fin"

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 flex justify-center px-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
      <div className="pointer-events-auto w-full max-w-md rounded-3xl border border-white/60 bg-white/70 shadow-[0_8px_40px_rgba(90,110,105,0.18)] backdrop-blur-xl">
        {/* header row */}
        <div className="flex items-center gap-2 p-2.5">
          {/* form toggle */}
          <div className="flex rounded-full bg-neutral-200/70 p-0.5">
            {(["ring", "vessel", "fin"] as FormType[]).map((f) => (
              <button
                key={f}
                onClick={() => set({ form: f })}
                className={`min-h-[36px] rounded-full px-3.5 text-xs font-medium capitalize transition ${
                  params.form === f
                    ? "bg-white text-neutral-800 shadow-sm"
                    : "text-neutral-500"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          <button
            onClick={onTogglePlay}
            aria-label={playing ? "Pause animation" : "Play animation"}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-200/70 text-neutral-700 transition active:scale-95"
          >
            {playing ? (
              <Pause className="h-4 w-4" strokeWidth={2.2} />
            ) : (
              <Play className="h-4 w-4" strokeWidth={2.2} />
            )}
          </button>
          <button
            onClick={onRandomize}
            aria-label="Randomize form"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-800 text-white transition active:scale-95"
          >
            <Shuffle className="h-4 w-4" strokeWidth={2.2} />
          </button>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Hide controls" : "Show controls"}
            aria-expanded={open}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-200/70 text-neutral-700 transition active:scale-95"
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
            {isFin ? (
              <>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {FIN_FAMILIES.map((fam) => (
                    <button
                      key={fam}
                      onClick={() => onFinChange(genFinParams(randomFinSeed(), fam))}
                      className={`min-h-[32px] rounded-full border px-3 text-[11px] font-medium capitalize transition active:scale-95 ${
                        finParams.family === fam
                          ? "border-neutral-400 bg-white text-neutral-800"
                          : "border-neutral-200 bg-white/80 text-neutral-600"
                      }`}
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

                <p className="pt-2 text-center text-[10px] uppercase tracking-widest text-neutral-400">
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
                      className="min-h-[32px] rounded-full border border-neutral-200 bg-white/80 px-3 text-[11px] font-medium text-neutral-600 transition active:scale-95"
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
