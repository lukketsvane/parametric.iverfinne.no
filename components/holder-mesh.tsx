"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"
import { useFrame } from "@react-three/fiber"
import { buildHolderArrays, type HolderParams } from "@/lib/candle-holder"
import { arraysToGeometry } from "@/lib/geometry"
import type { HolderJob, HolderResult } from "@/lib/holder-worker"

// resolution is expressed in cells per tube diameter — the detail that
// matters. Coarse while dragging, refined once the parameters settle.
const PREVIEW_CPT = 3.2
const REFINE_CPT = 6
const REFINE_CPT_HI = 8
const REFINE_DELAY = 260

export function HolderMesh({
  params,
  playing,
  speed,
  hiDetail,
}: {
  params: HolderParams
  playing: boolean
  speed: number
  hiDetail: boolean
}) {
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)

  const workerRef = useRef<Worker | null>(null)
  const genRef = useRef(0)
  const busyRef = useRef(false)
  const pendingRef = useRef<HolderJob | null>(null)

  const swap = (geo: THREE.BufferGeometry) => {
    const mesh = meshRef.current
    if (!mesh) {
      geo.dispose()
      return
    }
    const old = mesh.geometry
    mesh.geometry = geo
    old?.dispose()
  }

  // main-side latest-only queue: the worker only ever computes one job at a
  // time and dragging replaces the pending job instead of piling up
  const post = (job: HolderJob) => {
    const worker = workerRef.current
    if (!worker) {
      swap(arraysToGeometry(buildHolderArrays(job.params, job.cellsPerTube)))
      return
    }
    if (busyRef.current) {
      pendingRef.current = job
    } else {
      busyRef.current = true
      worker.postMessage(job)
    }
  }

  useEffect(() => {
    let worker: Worker | null = null
    try {
      worker = new Worker(new URL("../lib/holder-worker.ts", import.meta.url))
    } catch {
      worker = null
    }
    workerRef.current = worker
    if (worker) {
      worker.onmessage = (e: MessageEvent<HolderResult>) => {
        const { gen, positions, normals, indices } = e.data
        if (gen === genRef.current) {
          swap(arraysToGeometry({ positions, normals, indices }))
        }
        const pending = pendingRef.current
        pendingRef.current = null
        if (pending) {
          worker!.postMessage(pending)
        } else {
          busyRef.current = false
        }
      }
      worker.onerror = () => {
        // fall back to synchronous builds on the main thread
        workerRef.current = null
        busyRef.current = false
      }
    }
    return () => {
      worker?.terminate()
      workerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const gen = ++genRef.current
    post({ gen, params, cellsPerTube: PREVIEW_CPT })
    const id = window.setTimeout(() => {
      if (gen === genRef.current) {
        post({ gen, params, cellsPerTube: hiDetail ? REFINE_CPT_HI : REFINE_CPT })
      }
    }, REFINE_DELAY)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, hiDetail])

  useEffect(() => {
    const mesh = meshRef.current
    return () => mesh?.geometry?.dispose()
  }, [])

  // slow turntable
  useFrame((_, delta) => {
    if (!playing || !groupRef.current) return
    groupRef.current.rotation.y += delta * 0.3 * speed
  })

  return (
    <group ref={groupRef} position={[0, 0.35, 0]}>
      <mesh ref={meshRef} castShadow receiveShadow>
        {/* glazed ceramic: soft off-white body under a wet clearcoat */}
        <meshPhysicalMaterial
          color="#e9e5dd"
          roughness={0.32}
          metalness={0}
          clearcoat={0.85}
          clearcoatRoughness={0.22}
        />
      </mesh>
    </group>
  )
}
