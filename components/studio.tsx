"use client"

import { useEffect, useState } from "react"
import {
  DEFAULT_PARAMS,
  randomizeParams,
  type SculptureParams,
} from "@/lib/parametric-sculpture"
import {
  genFinParams,
  randomFinSeed,
  type FinParams,
} from "@/lib/fin-sculpture"
import { SculptureViewer } from "./sculpture-viewer"
import { ControlsPanel } from "./controls-panel"

// deterministic default so server and client agree
const DEFAULT_FIN_SEED = 7

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

export function Studio() {
  const [params, setParams] = useState<SculptureParams>(DEFAULT_PARAMS)
  const [finParams, setFinParams] = useState<FinParams>(() =>
    genFinParams(DEFAULT_FIN_SEED, "urchin"),
  )
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [mounted, setMounted] = useState(false)
  const dark = useSystemDark()

  // avoid SSR of the WebGL canvas
  useEffect(() => setMounted(true), [])

  return (
    <main className="fixed inset-0 overflow-hidden bg-white dark:bg-black">
      <div className="absolute inset-0">
        {mounted && (
          <SculptureViewer
            params={params}
            finParams={finParams}
            playing={playing}
            speed={playing ? speed : 1}
            dark={dark}
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
        params={params}
        finParams={finParams}
        playing={playing}
        speed={speed}
        onTogglePlay={() => setPlaying((p) => !p)}
        onToggleSpeed={() => setSpeed((s) => (s === 1 ? 2 : 1))}
        onChange={setParams}
        onFinChange={setFinParams}
        onRandomize={() =>
          params.form === "fin"
            ? setFinParams(genFinParams(randomFinSeed()))
            : setParams(randomizeParams())
        }
      />
    </main>
  )
}
