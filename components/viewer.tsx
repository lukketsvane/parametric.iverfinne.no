"use client"

import { Canvas, useThree } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import type { Engine } from "@/lib/engines"
import type { Params } from "@/lib/model"
import type { PrintParams } from "@/lib/print-model"
import type { HolderParams } from "@/lib/holder/candle-holder"
import type { Params as VesselParams } from "@/lib/vessel/engine"
import type { Params as TotemParams } from "@/lib/totem/engine"
import { Sculpture } from "./sculpture"
import { PrintSculpture } from "./print-sculpture"
import { HolderMesh } from "./holder-mesh"
import { VesselMesh } from "./vessel-mesh"
import { TotemMesh } from "./totem-mesh"
import { GestureParams, type NudgeAxis } from "./gesture-params"

export type LightDir = { az: number; el: number }

// every engine is framed the same way — one studio, one stage
const FIT_MARGIN = 1.4

// the stage group sits at this world height; pieces stand on its y=0
const GROUND_Y = -0.85
// the floor is pinned to a constant screen height: the orbit target
// rises exactly in step with camera distance so the angle down to the
// floor never changes. 0.1637 = (0.35 − GROUND_Y) / |[2.6, 1.85, 6.6]|,
// the angle of the opening pose.
const FLOOR_TAN = 0.1637

/**
 * Frame the piece whenever its size changes meaningfully: the camera
 * keeps its direction — only the distance adapts (bounding-sphere
 * framing against the tighter field of view), and the target height
 * rises in lockstep with distance (dist · FLOOR_TAN above the ground),
 * which pins the floor line to the same screen height for every piece
 * and every engine at a given orbit angle.
 */
function FitCamera({ fit }: { fit: { r: number; cy: number } | null }) {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as
    | { target: THREE.Vector3; update?: () => void }
    | null
  const invalidate = useThree((s) => s.invalidate)
  const lastR = useRef(0)
  useEffect(() => {
    if (!fit || !controls) return
    if (lastR.current && Math.abs(fit.r - lastR.current) / lastR.current < 0.12) {
      return
    }
    lastR.current = fit.r
    const persp = camera as THREE.PerspectiveCamera
    const vHalf = ((persp.fov ?? 32) * Math.PI) / 360
    const hHalf = Math.atan(Math.tan(vHalf) * (persp.aspect || 1))
    const dist = Math.min(
      15,
      Math.max(3.6, (fit.r * FIT_MARGIN) / Math.tan(Math.min(vHalf, hHalf))),
    )
    controls.target.set(0, GROUND_Y + dist * FLOOR_TAN, 0)
    const dir = camera.position.clone().sub(controls.target)
    if (dir.lengthSq() < 1e-6) dir.set(2.6, 1.85, 6.6)
    camera.position.copy(controls.target).add(dir.setLength(dist))
    controls.update?.()
    invalidate()
  }, [fit, controls, camera, invalidate])
  return null
}

export function Viewer({
  engine,
  params,
  printParams,
  holderParams,
  vesselParams,
  totemParams,
  dark,
  hiDetail,
  mobile,
  light,
  onNudge,
  onLight,
}: {
  engine: Engine
  params: Params
  printParams: PrintParams
  holderParams: HolderParams
  vesselParams: VesselParams
  totemParams: TotemParams
  dark: boolean
  hiDetail: boolean
  mobile: boolean
  light: LightDir
  onNudge: (axis: NudgeAxis, deltaPx: number) => void
  onLight: (dxPx: number, dyPx: number) => void
}) {
  const bg = dark ? "#000000" : "#ffffff"
  const shadow = hiDetail ? 4096 : 2048
  // ONE lighting rig for every engine: a steerable key light riding a
  // fixed-radius dome (three-finger drag), plus two fixed dim fills so
  // unlit faces don't collapse to black. No ambient, no environment map,
  // no baked soft blobs — one light, one hard shadow.
  const lightPos = useMemo<[number, number, number]>(() => {
    const R = 8.6
    const h = R * Math.cos(light.el)
    return [h * Math.cos(light.az), R * Math.sin(light.el), h * Math.sin(light.az)]
  }, [light])
  // measured size of the current piece, reported after each rebuild
  const [fit, setFit] = useState<{ r: number; cy: number } | null>(null)
  const onFit = (r: number, cy: number) => setFit({ r, cy })
  return (
    <Canvas
      shadows
      frameloop="demand"
      dpr={hiDetail ? [1, 3] : [1, 2]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ position: [2.6, 2.2, 6.6], fov: 32 }}
      className="touch-none"
    >
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[bg, 14, 34]} />

      <directionalLight
        key={shadow}
        position={lightPos}
        intensity={2.1}
        castShadow
        shadow-mapSize={[shadow, shadow]}
        shadow-bias={-0.0002}
        shadow-normalBias={0.05}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-camera-near={0.5}
        shadow-camera-far={24}
      />
      <directionalLight position={[-6, 3, -2]} intensity={0.5} />
      <directionalLight position={[2, 1.5, 7]} intensity={0.35} />

      <Suspense fallback={null}>
        <group position={[0, GROUND_Y, 0]}>
          {engine === "print" ? (
            <PrintSculpture params={printParams} hiDetail={hiDetail} onFit={onFit} />
          ) : engine === "holder" ? (
            <HolderMesh
              params={holderParams}
              hiDetail={hiDetail}
              mobile={mobile}
              onFit={onFit}
            />
          ) : engine === "vessel" ? (
            <VesselMesh
              params={vesselParams}
              hiDetail={hiDetail}
              mobile={mobile}
              onFit={onFit}
            />
          ) : engine === "totem" ? (
            <TotemMesh
              params={totemParams}
              hiDetail={hiDetail}
              mobile={mobile}
              onFit={onFit}
            />
          ) : (
            <Sculpture params={params} hiDetail={hiDetail} onFit={onFit} />
          )}
          {/* ground: an invisible plane that only receives the hard cast
              shadow — always at the same height, light mode only; dark
              mode floats the piece in the void. No soft contact blob. */}
          {!dark && (
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[60, 60]} />
              <shadowMaterial transparent opacity={0.22} />
            </mesh>
          )}
        </group>
      </Suspense>

      <FitCamera fit={fit} />
      <GestureParams onNudge={onNudge} onLight={onLight} />
      <OrbitControls
        target={[0, 0.35, 0]}
        enablePan={false}
        enableZoom
        minDistance={2.6}
        maxDistance={16}
        enableRotate
        rotateSpeed={0.9}
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI / 2 + 0.35}
        makeDefault
      />
    </Canvas>
  )
}
