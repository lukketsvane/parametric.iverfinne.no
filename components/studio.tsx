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

// deterministic default so server and client agree; seed 2 is a lattice form
const DEFAULT_FIN_SEED = 2

export function Studio() {
  const [params, setParams] = useState<SculptureParams>(DEFAULT_PARAMS)
  const [finParams, setFinParams] = useState<FinParams>(() =>
    genFinParams(DEFAULT_FIN_SEED),
  )
  const [mounted, setMounted] = useState(false)

  // avoid SSR of the WebGL canvas
  useEffect(() => setMounted(true), [])

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#eef0ed]">
      <div className="absolute inset-0">
        {mounted && <SculptureViewer params={params} finParams={finParams} />}
      </div>

      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-end p-5 pt-[calc(env(safe-area-inset-top)+16px)]">
        <a
          href="https://iverfinne.no"
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto text-[11px] tracking-wide text-neutral-400 hover:text-neutral-600"
        >
          iverfinne.no
        </a>
      </header>

      <ControlsPanel
        params={params}
        finParams={finParams}
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
