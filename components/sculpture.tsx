"use client"

import { useEffect, useMemo } from "react"
import { useThree } from "@react-three/fiber"
import { buildSculpture } from "@/lib/build"
import type { Params } from "@/lib/model"

/**
 * Mounts the deterministic sculpture geometry with its two ceramic
 * glazes. Rebuilds are cheap (lathe + merged primitives), so geometry is
 * derived synchronously from params — no worker, no async gap.
 */
export function Sculpture({
  params,
  hiDetail,
  onFit,
}: {
  params: Params
  hiDetail: boolean
  onFit?: (radius: number, centerY: number) => void
}) {
  const invalidate = useThree((s) => s.invalidate)

  const built = useMemo(
    () => buildSculpture(params, hiDetail),
    [params, hiDetail],
  )

  // hand back the measured size so the camera can frame the piece,
  // and dispose geometries when they are replaced
  useEffect(() => {
    onFit?.(built.fit.r, built.fit.cy)
    invalidate()
    return () => {
      built.body?.dispose()
      built.crown?.dispose()
    }
  }, [built, onFit, invalidate])

  // slip-cast ceramic lit by directionals only (no environment map):
  // gloss sweeps from a deep wet clearcoat down to dry satin. The color
  // itself is baked per-vertex by the builder — full glaze pooling in
  // the field, thinning to pale stoneware over tips, crests and lips.
  const gloss = params.gloss
  const glaze = (
    <meshPhysicalMaterial
      vertexColors
      roughness={0.09 + (1 - gloss) * 0.5}
      metalness={0}
      clearcoat={gloss}
      clearcoatRoughness={0.04 + (1 - gloss) * 0.3}
    />
  )

  return (
    <group>
      {built.body && (
        <mesh geometry={built.body} castShadow receiveShadow>
          {glaze}
        </mesh>
      )}
      {built.crown && (
        <mesh geometry={built.crown} castShadow receiveShadow>
          {glaze}
        </mesh>
      )}
    </group>
  )
}
