"use client"

import { useState } from "react"
import { Shuffle, SlidersHorizontal, ChevronDown } from "lucide-react"
import {
  PARAM_RANGES,
  PRESETS,
  type SculptureParams,
  type FormType,
} from "@/lib/parametric-sculpture"

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
  onChange,
  onRandomize,
}: {
  params: SculptureParams
  onChange: (p: SculptureParams) => void
  onRandomize: () => void
}) {
  const [open, setOpen] = useState(false)

  const set = (patch: Partial<SculptureParams>) => onChange({ ...params, ...patch })

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 flex justify-center px-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
      <div className="pointer-events-auto w-full max-w-md rounded-3xl border border-white/60 bg-white/70 shadow-[0_8px_40px_rgba(90,110,105,0.18)] backdrop-blur-xl">
        {/* header row */}
        <div className="flex items-center gap-2 p-2.5">
          {/* form toggle */}
          <div className="flex rounded-full bg-neutral-200/70 p-0.5">
            {(["ring", "vessel"] as FormType[]).map((f) => (
              <button
                key={f}
                onClick={() => set({ form: f })}
                className={`min-h-[36px] rounded-full px-4 text-xs font-medium capitalize transition ${
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
          </div>
        )}
      </div>
    </div>
  )
}
