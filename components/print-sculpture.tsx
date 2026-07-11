"use client"

import { useEffect, useMemo } from "react"
import { useThree } from "@react-three/fiber"
import * as THREE from "three"
import { buildPrint } from "@/lib/print-build"
import type { PrintParams } from "@/lib/print-model"

/**
 * Mounts a print-engine piece: two ribbed shells in satin filament.
 * Same contract as the ceramics Sculpture — synchronous rebuilds,
 * measured fit reported up for the camera.
 */
export function PrintSculpture({
  params,
  hiDetail,
  onFit,
}: {
  params: PrintParams
  hiDetail: boolean
  onFit?: (radius: number, centerY: number) => void
}) {
  const invalidate = useThree((s) => s.invalidate)

  const built = useMemo(() => buildPrint(params, hiDetail), [params, hiDetail])

  useEffect(() => {
    onFit?.(built.fit.r, built.fit.cy)
    invalidate()
    return () => {
      built.base.dispose()
      built.cup?.dispose()
    }
  }, [built, onFit, invalidate])

  // satin plastic — the sheen rides the extrusion ribs; color is baked
  // per vertex (filament + optional vertical fade). Double-sided so open
  // vessels show a real inner wall instead of culling to nothing.
  const filament = (
    <meshPhysicalMaterial
      vertexColors
      side={THREE.DoubleSide}
      roughness={0.5}
      metalness={0}
      clearcoat={0.18}
      clearcoatRoughness={0.45}
      sheen={0.35}
      sheenRoughness={0.55}
      sheenColor="#ffffff"
    />
  )

  return (
    <group>
      <mesh geometry={built.base} castShadow receiveShadow>
        {filament}
      </mesh>
      {built.cup && (
        <mesh geometry={built.cup} castShadow receiveShadow>
          {filament}
        </mesh>
      )}
    </group>
  )
}
