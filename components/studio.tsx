"use client"

import { useEffect, useState } from "react"
import {
  DEFAULT_PARAMS,
  randomizeParams,
  type SculptureParams,
} from "@/lib/parametric-sculpture"
import { SculptureViewer } from "./sculpture-viewer"
import { ControlsPanel } from "./controls-panel"

export function Studio() {
  const [params, setParams] = useState<SculptureParams>(DEFAULT_PARAMS)
  const [mounted, setMounted] = useState(false)

  // avoid SSR of the WebGL canvas
  useEffect(() => setMounted(true), [])

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#eef0ed]">
      <div className="absolute inset-0">
        {mounted && <SculptureViewer params={params} />}
      </div>

      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-5 pt-[calc(env(safe-area-inset-top)+16px)]">
        <div>
          <h1 className="text-[13px] font-semibold tracking-tight text-neutral-700">
            Celadon
          </h1>
          <p className="text-[11px] tracking-wide text-neutral-400">
            parametric forms
          </p>
        </div>
        <span className="text-[11px] tracking-wide text-neutral-400">
          drag to turn
        </span>
      </header>

      <ControlsPanel
        params={params}
        onChange={setParams}
        onRandomize={() => setParams(randomizeParams())}
      />
    </main>
  )
}
