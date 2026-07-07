"use client"

import { useEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import { buildSculpture, type SculptureParams } from "@/lib/parametric-sculpture"

export function SculptureMesh({ params }: { params: SculptureParams }) {
  const meshRef = useRef<THREE.Mesh>(null)

  const geometry = useMemo(() => buildSculpture(params), [params])

  // dispose previous geometry to avoid GPU leaks when params change
  const prev = useRef<THREE.BufferGeometry | null>(null)
  useEffect(() => {
    if (prev.current && prev.current !== geometry) prev.current.dispose()
    prev.current = geometry
    return () => {
      geometry.dispose()
    }
  }, [geometry])

  return (
    <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
      <meshPhysicalMaterial
        color={"#c3d6d1"}
        roughness={0.16}
        metalness={0}
        clearcoat={1}
        clearcoatRoughness={0.1}
        reflectivity={0.55}
        sheen={0.4}
        sheenColor={"#eaf3f0"}
        side={THREE.DoubleSide}
        envMapIntensity={1.0}
      />
    </mesh>
  )
}
