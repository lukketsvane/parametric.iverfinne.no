"use client"

import { Canvas } from "@react-three/fiber"
import { Environment, OrbitControls } from "@react-three/drei"
import { Suspense } from "react"
import type { SculptureParams } from "@/lib/parametric-sculpture"
import { SculptureMesh } from "./sculpture-mesh"

export function SculptureViewer({ params }: { params: SculptureParams }) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true }}
      camera={{ position: [0, 0.8, 9.5], fov: 40 }}
      className="touch-none"
    >
      <color attach="background" args={["#eef0ed"]} />
      <fog attach="fog" args={["#eef0ed", 12, 22]} />

      <ambientLight intensity={0.55} />
      <directionalLight
        position={[3, 6, 4]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0002}
      />
      <directionalLight position={[-5, 2, -3]} intensity={0.5} color="#dfe8ff" />

      <Suspense fallback={null}>
        <group rotation={[0.3, 0.4, 0]}>
          <SculptureMesh params={params} />
        </group>
        <Environment preset="studio" environmentIntensity={0.85} />
      </Suspense>

      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={7.5}
        maxDistance={11.5}
        enableRotate
        rotateSpeed={0.9}
        autoRotate
        autoRotateSpeed={0.6}
        minPolarAngle={0.25}
        maxPolarAngle={Math.PI - 0.25}
        makeDefault
      />
    </Canvas>
  )
}
