"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  DEFAULT_PARAMS,
  NUDGE_PARAMS,
  PARAM_RANGES,
  clampParams,
  designName,
  type Params,
} from "@/lib/model"
import {
  PRINT_DEFAULTS,
  clampPrint,
  printName,
  type PrintParams,
} from "@/lib/print-model"
import {
  DEFAULT_PARAMS as HOLDER_DEFAULTS,
  NUDGE_PARAMS as HOLDER_NUDGE,
  PARAM_RANGES as HOLDER_RANGES,
  clampHolder,
  type HolderParams,
  type ParamKey as HolderKey,
} from "@/lib/holder/candle-holder"
import {
  DEFAULT_PARAMS as VESSEL_DEFAULTS,
  NUDGE_PARAMS as VESSEL_NUDGE,
  PARAM_RANGES as VESSEL_RANGES,
  clampVessel,
  type Params as VesselParams,
  type ParamKey as VesselKey,
} from "@/lib/vessel/engine"
import {
  DEFAULT_PARAMS as TOTEM_DEFAULTS,
  NUDGE_PARAMS as TOTEM_NUDGE,
  PARAM_RANGES as TOTEM_RANGES,
  clampTotem,
  genName,
  type Params as TotemParams,
  type ParamKey as TotemKey,
} from "@/lib/totem/engine"
import type { Engine, KeptPiece } from "@/lib/engines"
import { Viewer, type LightDir } from "./viewer"
import { ControlsPanel } from "./controls-panel"
import type { NudgeAxis } from "./gesture-params"

// pixels of two-finger scroll to sweep a parameter's full range
const NUDGE_RANGE_PX = 420

// the visitor's shelf, persisted across visits
const SHELF_KEY = "parametric.shelf.v1"
const SHELF_MAX = 12

// follow the system color scheme only — no in-app toggle
function useSystemDark() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const sync = () => setDark(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])
  return dark
}

// desktop = fine pointer + roomy viewport; only there do we offer max detail
function useIsDesktop() {
  const [desktop, setDesktop] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine) and (min-width: 1024px)")
    const sync = () => setDesktop(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])
  return desktop
}

export function Studio() {
  // five disconnected engines share the stage: each keeps its own design,
  // and switching engines never touches the others' state
  const [engine, setEngine] = useState<Engine>("clay")
  const [params, setParams] = useState<Params>(DEFAULT_PARAMS)
  const [printParams, setPrintParams] = useState<PrintParams>(PRINT_DEFAULTS)
  const [holderParams, setHolderParams] = useState<HolderParams>(HOLDER_DEFAULTS)
  const [vesselParams, setVesselParams] = useState<VesselParams>(VESSEL_DEFAULTS)
  const [totemParams, setTotemParams] = useState<TotemParams>(TOTEM_DEFAULTS)
  const [hiDetail, setHiDetail] = useState(false)
  const [mounted, setMounted] = useState(false)
  // key-light direction, steered by a three-finger drag on the canvas
  const [light, setLight] = useState<LightDir>({ az: 0.64, el: 0.95 })
  const dark = useSystemDark()
  const isDesktop = useIsDesktop()

  // avoid SSR of the WebGL canvas; restore a shared design from the URL.
  // The hash is untrusted input — every field is validated and clamped so
  // no crafted URL can push NaN or hostile values into a model. An
  // `engine` field routes to the right motor; hashes without one are
  // ceramics — except old candle-holder links, which this domain used to
  // serve and which betray themselves by their `candle` field.
  useEffect(() => {
    setMounted(true)
    try {
      const h = window.location.hash.slice(1)
      if (h.startsWith("p=")) {
        const obj = JSON.parse(decodeURIComponent(h.slice(2)))
        const rec = (obj ?? {}) as Record<string, unknown>
        if (rec.engine === "print") {
          setPrintParams((prev) => clampPrint(obj, prev) ?? prev)
          setEngine("print")
        } else if (rec.engine === "holder" || (!rec.engine && typeof rec.candle === "string")) {
          setHolderParams((prev) => clampHolder(obj, prev) ?? prev)
          setEngine("holder")
        } else if (rec.engine === "vessel") {
          setVesselParams((prev) => clampVessel(obj, prev) ?? prev)
          setEngine("vessel")
        } else if (rec.engine === "totem") {
          setTotemParams((prev) => clampTotem(obj, prev) ?? prev)
          setEngine("totem")
        } else {
          setParams((prev) => clampParams(obj, prev) ?? prev)
        }
      }
    } catch {
      // malformed hash — ignore
    }
  }, [])

  // the current design's spoken name, per engine
  const nameOf = useCallback(
    (eng: Engine): string => {
      switch (eng) {
        case "print":
          return printName(printParams)
        case "holder":
          return holderParams.preset
        case "vessel":
          return vesselParams.preset
        case "totem":
          return totemParams.sig?.trim() || genName(totemParams.seed)
        default:
          return designName(params)
      }
    },
    [params, printParams, holderParams, vesselParams, totemParams],
  )

  // ---- the shelf: pieces the visitor kept, remembered across visits ----
  const captureRef = useRef<(() => string | null) | null>(null)
  const [shelf, setShelf] = useState<KeptPiece[]>([])
  const [shelfReady, setShelfReady] = useState(false)

  // hydrate from storage; stored params are as untrusted as a URL hash.
  // Entries carry their engine (the oldest shelves predate it: ceramics).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SHELF_KEY)
      if (raw) {
        const list = JSON.parse(raw)
        if (Array.isArray(list)) {
          const kept: KeptPiece[] = []
          for (const it of list.slice(0, SHELF_MAX)) {
            if (
              !it ||
              typeof it.id !== "number" ||
              typeof it.thumb !== "string" ||
              !it.thumb.startsWith("data:image/")
            ) {
              continue
            }
            if (it.engine === "print") {
              const p = clampPrint(it.params, PRINT_DEFAULTS)
              if (p) kept.push({ id: it.id, engine: "print", name: printName(p), thumb: it.thumb, params: p })
            } else if (it.engine === "holder") {
              const p = clampHolder(it.params, HOLDER_DEFAULTS)
              if (p) kept.push({ id: it.id, engine: "holder", name: p.preset, thumb: it.thumb, params: p })
            } else if (it.engine === "vessel") {
              const p = clampVessel(it.params, VESSEL_DEFAULTS)
              if (p) kept.push({ id: it.id, engine: "vessel", name: p.preset, thumb: it.thumb, params: p })
            } else if (it.engine === "totem") {
              const p = clampTotem(it.params, TOTEM_DEFAULTS)
              if (p) kept.push({ id: it.id, engine: "totem", name: p.sig?.trim() || genName(p.seed), thumb: it.thumb, params: p })
            } else {
              const p = clampParams(it.params, DEFAULT_PARAMS)
              if (p) kept.push({ id: it.id, engine: "clay", name: designName(p), thumb: it.thumb, params: p })
            }
          }
          setShelf(kept)
        }
      }
    } catch {
      // unreadable shelf — start empty
    }
    setShelfReady(true)
  }, [])

  useEffect(() => {
    if (!shelfReady) return
    try {
      window.localStorage.setItem(SHELF_KEY, JSON.stringify(shelf))
    } catch {
      // storage full or blocked — the shelf just won't persist
    }
  }, [shelf, shelfReady])

  const activeParams = useCallback(
    (eng: Engine) =>
      eng === "print"
        ? printParams
        : eng === "holder"
          ? holderParams
          : eng === "vessel"
            ? vesselParams
            : eng === "totem"
              ? totemParams
              : params,
    [params, printParams, holderParams, vesselParams, totemParams],
  )

  const keep = useCallback(() => {
    const thumb = captureRef.current?.()
    if (!thumb) return
    const piece: KeptPiece = {
      id: Date.now(),
      engine,
      name: nameOf(engine),
      thumb,
      params: activeParams(engine),
    }
    const sig = JSON.stringify(piece.params)
    setShelf((prev) => [
      piece,
      ...prev.filter((k) => k.engine !== engine || JSON.stringify(k.params) !== sig),
    ].slice(0, SHELF_MAX))
  }, [engine, nameOf, activeParams])

  // a kept piece brings its engine back with it
  const loadKept = useCallback((k: KeptPiece) => {
    if (k.engine === "print") setPrintParams(k.params as PrintParams)
    else if (k.engine === "holder") setHolderParams(k.params as HolderParams)
    else if (k.engine === "vessel") setVesselParams(k.params as VesselParams)
    else if (k.engine === "totem") setTotemParams(k.params as TotemParams)
    else setParams(k.params as Params)
    setEngine(k.engine)
  }, [])
  const removeKept = useCallback(
    (id: number) => setShelf((prev) => prev.filter((k) => k.id !== id)),
    [],
  )

  // keep the URL shareable: it always encodes the current design exactly
  useEffect(() => {
    const active = { engine, ...activeParams(engine) }
    const id = window.setTimeout(() => {
      window.history.replaceState(
        null,
        "",
        "#p=" + encodeURIComponent(JSON.stringify(active)),
      )
    }, 400)
    return () => window.clearTimeout(id)
  }, [engine, activeParams])

  // two-finger scroll sweeps whichever parameters the active engine
  // mapped — or the print engine's two gesture-only dials (flow reshapes
  // the body, poise the cup)
  const nudge = useCallback(
    (axis: NudgeAxis, deltaPx: number) => {
      const frac = deltaPx / NUDGE_RANGE_PX
      if (engine === "print") {
        const key = axis === "vertical" ? "flow" : "poise"
        setPrintParams((p) => ({
          ...p,
          [key]: +Math.min(1, Math.max(0, p[key] + frac)).toFixed(3),
        }))
        return
      }
      if (engine === "holder") {
        const key = HOLDER_NUDGE[axis] as HolderKey | undefined
        if (key === undefined) return
        setHolderParams((p) => {
          const r = HOLDER_RANGES[key]
          const v = Math.min(r.max, Math.max(r.min, p[key] + frac * (r.max - r.min)))
          return { ...p, [key]: +v.toFixed(3) }
        })
        return
      }
      if (engine === "vessel") {
        const key = VESSEL_NUDGE[axis] as VesselKey | undefined
        if (key === undefined) return
        setVesselParams((p) => {
          const r = VESSEL_RANGES[key]
          const v = Math.min(r.max, Math.max(r.min, p[key] + frac * (r.max - r.min)))
          return { ...p, [key]: +v.toFixed(3) }
        })
        return
      }
      if (engine === "totem") {
        const key = TOTEM_NUDGE[axis] as TotemKey | undefined
        if (key === undefined) return
        setTotemParams((p) => {
          const r = TOTEM_RANGES[key]
          const v = Math.min(r.max, Math.max(r.min, p[key] + frac * (r.max - r.min)))
          return { ...p, [key]: +v.toFixed(3) }
        })
        return
      }
      const key = NUDGE_PARAMS[axis]
      if (key === undefined) return
      setParams((p) => {
        const r = PARAM_RANGES[key]
        const v = Math.min(r.max, Math.max(r.min, p[key] + frac * (r.max - r.min)))
        return { ...p, [key]: +v.toFixed(3) }
      })
    },
    [engine],
  )

  // three-finger drag orbits the key light around the piece — drag right
  // to swing it around, drag up to raise it. The camera stays put.
  const nudgeLight = useCallback((dxPx: number, dyPx: number) => {
    setLight((l) => ({
      az: l.az + dxPx * 0.012,
      el: Math.min(1.4, Math.max(0.12, l.el - dyPx * 0.008)),
    }))
  }, [])

  // never leave hi-detail on for a non-desktop client
  const detailOn = hiDetail && isDesktop

  return (
    <main className="fixed inset-0 overflow-hidden bg-white dark:bg-black">
      <div className="absolute inset-0">
        {mounted && (
          <Viewer
            engine={engine}
            params={params}
            printParams={printParams}
            holderParams={holderParams}
            vesselParams={vesselParams}
            totemParams={totemParams}
            dark={dark}
            hiDetail={detailOn}
            mobile={!isDesktop}
            light={light}
            onNudge={nudge}
            onLight={nudgeLight}
            onCaptureReady={(fn) => {
              captureRef.current = fn
            }}
          />
        )}
      </div>

      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-end p-5 pt-[calc(env(safe-area-inset-top)+16px)]">
        <a
          href="https://iverfinne.no"
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto text-[11px] tracking-wide text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white"
        >
          iverfinne.no
        </a>
      </header>

      <ControlsPanel
        engine={engine}
        params={params}
        printParams={printParams}
        holderParams={holderParams}
        vesselParams={vesselParams}
        totemParams={totemParams}
        isDesktop={isDesktop}
        hiDetail={hiDetail}
        shelf={shelf}
        onEngineChange={setEngine}
        onToggleDetail={() => setHiDetail((d) => !d)}
        onChange={setParams}
        onPrintChange={setPrintParams}
        onHolderChange={setHolderParams}
        onVesselChange={setVesselParams}
        onTotemChange={setTotemParams}
        onKeep={keep}
        onLoadKept={loadKept}
        onRemoveKept={removeKept}
      />
    </main>
  )
}
