"use client"

import { Canvas } from "@react-three/fiber"
import { Environment, Lightformer, OrbitControls } from "@react-three/drei"
import { Suspense } from "react"
import type { HolderParams } from "@/lib/candle-holder"
import { HolderMesh } from "./holder-mesh"

export function HolderViewer({
  params,
  playing,
  speed,
  dark,
  hiDetail,
}: {
  params: HolderParams
  playing: boolean
  speed: number
  dark: boolean
  hiDetail: boolean
}) {
  const bg = dark ? "#000000" : "#ffffff"
  const shadow = hiDetail ? 2048 : 1024
  return (
    <Canvas
      shadows
      dpr={hiDetail ? [1, 3] : [1, 2]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 1.7, 7.4], fov: 35 }}
      className="touch-none"
    >
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[bg, 12, 30]} />

      <ambientLight intensity={0.5} />
      <directionalLight
        key={shadow}
        position={[3, 6, 4]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[shadow, shadow]}
        shadow-bias={-0.0002}
      />
      <directionalLight position={[-5, 2, -3]} intensity={0.45} />

      <Suspense fallback={null}>
        <group rotation={[0.12, 0, 0]}>
          <HolderMesh
            params={params}
            playing={playing}
            speed={speed}
            hiDetail={hiDetail}
          />
        </group>
        {/* local softbox environment — no remote HDR fetch */}
        <Environment resolution={256} environmentIntensity={0.9}>
          <Lightformer
            form="rect"
            intensity={2.4}
            position={[0, 5, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[10, 10, 1]}
          />
          <Lightformer
            form="rect"
            intensity={1.2}
            position={[-5, 1, 2]}
            rotation={[0, Math.PI / 2, 0]}
            scale={[6, 3, 1]}
          />
          <Lightformer
            form="rect"
            intensity={0.9}
            position={[5, 0.5, -2]}
            rotation={[0, -Math.PI / 2, 0]}
            scale={[6, 2.5, 1]}
          />
          <Lightformer
            form="rect"
            intensity={0.7}
            position={[0, 0.5, 5]}
            rotation={[0, Math.PI, 0]}
            scale={[8, 2, 1]}
          />
        </Environment>
      </Suspense>

      <OrbitControls
        target={[0, 0.35, 0]}
        enablePan={false}
        enableZoom
        minDistance={2.8}
        maxDistance={16}
        enableRotate
        rotateSpeed={0.9}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI - 0.2}
        makeDefault
      />
    </Canvas>
  )
}
