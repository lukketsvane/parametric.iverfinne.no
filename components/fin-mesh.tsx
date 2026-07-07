"use client"

import { useEffect, useLayoutEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import { buildFinSculpture, type FinParams } from "@/lib/fin-sculpture"

// fit the assembled sculpture into roughly the same frame as ring/vessel
const FIT_H = 3.6
const FIT_W = 4.6

export function FinMesh({ params }: { params: FinParams }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  const built = useMemo(() => buildFinSculpture(params), [params])

  // dispose previous geometry to avoid GPU leaks when params change
  const prev = useRef<THREE.BufferGeometry | null>(null)
  useEffect(() => {
    if (!built) return
    if (prev.current && prev.current !== built.geometry) prev.current.dispose()
    prev.current = built.geometry
    return () => {
      built.geometry.dispose()
    }
  }, [built])

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh || !built) return
    built.matrices.forEach((m, i) => mesh.setMatrixAt(i, m))
    mesh.instanceMatrix.needsUpdate = true
  }, [built])

  if (!built) return null

  const height = built.maxY - built.minY
  const scale = Math.min(FIT_H / height, FIT_W / (built.radius * 2))

  return (
    <group scale={scale} position={[0, -(built.minY + height / 2) * scale, 0]}>
      <instancedMesh
        ref={meshRef}
        geometry={built.geometry}
        args={[undefined, undefined, built.matrices.length]}
        frustumCulled={false}
        castShadow
        receiveShadow
      >
        <meshPhysicalMaterial
          vertexColors
          roughness={0.16}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.18}
          envMapIntensity={1.0}
          specularIntensity={1.0}
        />
      </instancedMesh>
    </group>
  )
}
