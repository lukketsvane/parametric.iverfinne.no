"use client"

import { useEffect, useState } from "react"
import { DEFAULT_PARAMS, type HolderParams } from "@/lib/candle-holder"
import { HolderViewer } from "./holder-viewer"
import { ControlsPanel } from "./controls-panel"

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
  const [params, setParams] = useState<HolderParams>(DEFAULT_PARAMS)
  const [hiDetail, setHiDetail] = useState(false)
  const [mounted, setMounted] = useState(false)
  const dark = useSystemDark()
  const isDesktop = useIsDesktop()

  // avoid SSR of the WebGL canvas
  useEffect(() => setMounted(true), [])

  // never leave hi-detail on for a non-desktop client
  const detailOn = hiDetail && isDesktop

  return (
    <main className="fixed inset-0 overflow-hidden bg-white dark:bg-black">
      <div className="absolute inset-0">
        {mounted && (
          <HolderViewer
            params={params}
            dark={dark}
            hiDetail={detailOn}
            mobile={!isDesktop}
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
        isDesktop={isDesktop}
        hiDetail={hiDetail}
        onToggleDetail={() => setHiDetail((d) => !d)}
        onChange={setParams}
      />
    </main>
  )
}
