"use client"

import { Canvas } from "@react-three/fiber"
import { Environment, OrbitControls } from "@react-three/drei"
import { Suspense } from "react"
import type { SculptureParams } from "@/lib/parametric-sculpture"
import type { FinParams } from "@/lib/fin-sculpture"
import { SculptureMesh } from "./sculpture-mesh"
import { FinMesh } from "./fin-mesh"

export function SculptureViewer({
  params,
  finParams,
  playing,
  speed,
  dark,
}: {
  params: SculptureParams
  finParams: FinParams
  playing: boolean
  speed: number
  dark: boolean
}) {
  const bg = dark ? "#000000" : "#ffffff"
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true }}
      camera={{ position: [0, 0.9, 12], fov: 40 }}
      className="touch-none"
    >
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[bg, 20, 46]} />

      <ambientLight intensity={0.55} />
      <directionalLight
        position={[3, 6, 4]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0002}
      />
      <directionalLight position={[-5, 2, -3]} intensity={0.5} />

      <Suspense fallback={null}>
        <group rotation={[0.3, 0.4, 0]}>
          {params.form === "fin" ? (
            <FinMesh params={finParams} playing={playing} speed={speed} dark={dark} />
          ) : (
            <SculptureMesh params={params} playing={playing} speed={speed} dark={dark} />
          )}
        </group>
        <Environment preset="studio" environmentIntensity={0.85} />
      </Suspense>

      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={5}
        maxDistance={26}
        enableRotate
        rotateSpeed={0.9}
        minPolarAngle={0.25}
        maxPolarAngle={Math.PI - 0.25}
        makeDefault
      />
    </Canvas>
  )
}
