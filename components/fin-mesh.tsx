"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"
import { useFrame } from "@react-three/fiber"
import {
  buildFinSculpture,
  FIN_PARAM_RANGES,
  type FinParams,
  type FinSculpture,
} from "@/lib/fin-sculpture"

// fit the assembled sculpture into roughly the same frame as ring/vessel
const FIT_H = 3.6
const FIT_W = 4.6

type DriftKey = "height" | "rOut" | "starAmp" | "pw" | "shear" | "thick" | "punch"

// continuous params drift slowly around the user's values while playing;
// integer params (fins, rows, stacks) stay fixed so the instance count and
// overall structure hold steady
const DRIFT: { key: DriftKey; speed: number; phase: number }[] = [
  { key: "height", speed: 0.11, phase: 0.6 },
  { key: "rOut", speed: 0.15, phase: 2.0 },
  { key: "starAmp", speed: 0.19, phase: 3.4 },
  { key: "pw", speed: 0.08, phase: 4.9 },
  { key: "shear", speed: 0.13, phase: 1.2 },
  { key: "thick", speed: 0.1, phase: 5.8 },
  { key: "punch", speed: 0.17, phase: 2.9 },
]

function drifted(params: FinParams, t: number): FinParams {
  const out = { ...params }
  for (const { key, speed, phase } of DRIFT) {
    const { min, max } = FIN_PARAM_RANGES[key]
    const base = params[key]
    const s = Math.sin(t * speed + phase) * 0.45
    out[key] = s >= 0 ? base + (max - base) * s : base + (base - min) * s
  }
  // slow star-phase rotation keeps the silhouette evolving
  out.starPhase = params.starPhase + t * 0.12
  return out
}

const REBUILD_INTERVAL = 0.12

export function FinMesh({ params, playing }: { params: FinParams; playing: boolean }) {
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const lastBuild = useRef(0)

  // instance capacity — fins/stacks are never animated, so this only
  // changes via the sliders, which recreates the instanced mesh (args)
  const capacity = params.fins * params.stacks

  const apply = (built: FinSculpture | null) => {
    const mesh = meshRef.current
    const group = groupRef.current
    if (!built || !mesh || !group) {
      built?.geometry.dispose()
      return
    }
    const old = mesh.geometry
    mesh.geometry = built.geometry
    if (old && old !== built.geometry) old.dispose()
    built.matrices.forEach((m, i) => mesh.setMatrixAt(i, m))
    mesh.count = built.matrices.length
    mesh.instanceMatrix.needsUpdate = true
    const height = built.maxY - built.minY
    const s = Math.min(FIT_H / height, FIT_W / (built.radius * 2))
    group.scale.setScalar(s)
    group.position.y = -(built.minY + height / 2) * s
  }

  useEffect(() => {
    apply(buildFinSculpture(params))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  useEffect(() => {
    const mesh = meshRef.current
    return () => mesh?.geometry?.dispose()
  }, [])

  useFrame(({ clock }) => {
    if (!playing) return
    const t = clock.getElapsedTime()
    if (t - lastBuild.current < REBUILD_INTERVAL) return
    lastBuild.current = t
    apply(buildFinSculpture(drifted(params, t)))
  })

  return (
    <group ref={groupRef}>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, capacity]}
        frustumCulled={false}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#cccccc" roughness={0.4} metalness={0} />
      </instancedMesh>
    </group>
  )
}
