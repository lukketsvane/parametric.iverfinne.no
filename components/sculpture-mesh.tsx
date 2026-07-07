"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"
import { useFrame } from "@react-three/fiber"
import {
  buildSculpture,
  PARAM_RANGES,
  type SculptureParams,
} from "@/lib/parametric-sculpture"

type DriftKey = "finDepth" | "finSharpness" | "twist" | "wavAmount" | "bulge" | "flare"

// continuous params drift slowly around the user's values while playing;
// integer params (fins, waviness) stay fixed to avoid popping
const DRIFT: { key: DriftKey; speed: number; phase: number }[] = [
  { key: "finDepth", speed: 0.21, phase: 0.0 },
  { key: "finSharpness", speed: 0.13, phase: 1.7 },
  { key: "twist", speed: 0.09, phase: 3.1 },
  { key: "wavAmount", speed: 0.17, phase: 4.2 },
  { key: "bulge", speed: 0.11, phase: 5.6 },
  { key: "flare", speed: 0.15, phase: 2.4 },
]

function drifted(params: SculptureParams, t: number): SculptureParams {
  const out = { ...params }
  for (const { key, speed, phase } of DRIFT) {
    const { min, max } = PARAM_RANGES[key]
    const base = params[key]
    const s = Math.sin(t * speed + phase) * 0.45
    out[key] = s >= 0 ? base + (max - base) * s : base + (base - min) * s
  }
  return out
}

const REBUILD_INTERVAL = 1 / 15

export function SculptureMesh({
  params,
  playing,
  speed,
  dark,
}: {
  params: SculptureParams
  playing: boolean
  speed: number
  dark: boolean
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const lastBuild = useRef(0)
  const phase = useRef(0)

  // swap in a freshly built geometry, disposing the one it replaces
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

  useEffect(() => {
    swap(buildSculpture(params))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  useEffect(() => {
    const mesh = meshRef.current
    return () => mesh?.geometry?.dispose()
  }, [])

  useFrame((state, delta) => {
    if (!playing) return
    // advance an internal phase clock by the current speed so 1x↔2x is smooth
    phase.current += delta * speed
    const now = state.clock.getElapsedTime()
    if (now - lastBuild.current < REBUILD_INTERVAL) return
    lastBuild.current = now
    swap(buildSculpture(drifted(params, phase.current)))
  })

  return (
    <mesh ref={meshRef} castShadow receiveShadow>
      <meshStandardMaterial
        color={dark ? "#ffffff" : "#000000"}
        roughness={0.42}
        metalness={0}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
