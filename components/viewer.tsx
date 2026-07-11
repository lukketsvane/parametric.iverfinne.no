"use client"

import { Canvas, useThree } from "@react-three/fiber"
import {
  ContactShadows,
  Environment,
  Lightformer,
  OrbitControls,
} from "@react-three/drei"
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

// how much air the auto-framing leaves around a piece — each engine
// keeps the margin its home studio used
const FIT_MARGIN: Record<Engine, number> = {
  clay: 1.18,
  print: 1.18,
  holder: 1.45,
  vessel: 1.32,
  totem: 1.45,
}

/**
 * Frame the piece whenever its size changes meaningfully: tall or wide
 * designs used to overflow the fixed camera. The view direction the user
 * chose is preserved — only the distance and target height adapt.
 */
function FitCamera({
  fit,
  margin,
}: {
  fit: { r: number; cy: number } | null
  margin: number
}) {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as
    | { target: THREE.Vector3; update?: () => void }
    | null
  const invalidate = useThree((s) => s.invalidate)
  const lastR = useRef(0)
  const lastMargin = useRef(0)
  useEffect(() => {
    if (!fit || !controls) return
    if (
      lastR.current &&
      lastMargin.current === margin &&
      Math.abs(fit.r - lastR.current) / lastR.current < 0.12
    ) {
      return
    }
    lastR.current = fit.r
    lastMargin.current = margin
    // the piece is grounded at y=0 inside a group at y=-0.85
    const ty = Math.min(1.2, Math.max(-0.05, fit.cy - 0.85 + 0.12))
    controls.target.set(0, ty, 0)
    // frame against the tighter field of view — portrait screens clip
    // horizontally long before the vertical fov does
    const persp = camera as THREE.PerspectiveCamera
    const vHalf = ((persp.fov ?? 32) * Math.PI) / 360
    const hHalf = Math.atan(Math.tan(vHalf) * (persp.aspect || 1))
    const dist = Math.min(
      15,
      Math.max(3.2, (fit.r * margin) / Math.tan(Math.min(vHalf, hHalf))),
    )
    const dir = camera.position.clone().sub(controls.target)
    if (dir.lengthSq() < 1e-6) dir.set(2.6, 1.85, 6.6)
    camera.position.copy(controls.target).add(dir.setLength(dist))
    controls.update?.()
    invalidate()
  }, [fit, margin, controls, camera, invalidate])
  return null
}

/**
 * Hands the parent a snapshot function: force one render (the loop is
 * demand-driven, so the drawing buffer may be stale) and downscale the
 * center of the frame into a small thumbnail for the shelf.
 */
function CaptureBridge({
  onReady,
}: {
  onReady: (fn: () => string | null) => void
}) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    onReady(() => {
      try {
        gl.render(scene, camera)
        const src = gl.domElement
        const side = Math.min(src.width, src.height)
        const c = document.createElement("canvas")
        c.width = 96
        c.height = 96
        const ctx = c.getContext("2d")
        if (!ctx) return null
        ctx.drawImage(
          src,
          (src.width - side) / 2,
          (src.height - side) / 2,
          side,
          side,
          0,
          0,
          96,
          96,
        )
        return c.toDataURL("image/webp", 0.82)
      } catch {
        return null
      }
    })
  }, [gl, scene, camera, onReady])
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
  onCaptureReady,
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
  onCaptureReady?: (fn: () => string | null) => void
}) {
  const bg = dark ? "#000000" : "#ffffff"
  // the SDF engines mesh finer detail and get the bigger shadow budget
  // their home studios ran
  const shadow =
    engine === "totem"
      ? hiDetail
        ? 4096
        : 2048
      : engine === "vessel"
        ? mobile
          ? 1024
          : hiDetail
            ? 4096
            : 2048
        : hiDetail
          ? 2048
          : 1024
  // the steerable key light rides a fixed-radius dome around the piece;
  // its default heading sits exactly where the merged-in studios' fixed
  // key light used to hang
  const lightPos = useMemo<[number, number, number]>(() => {
    const R = 8.6
    const h = R * Math.cos(light.el)
    return [h * Math.cos(light.az), R * Math.sin(light.el), h * Math.sin(light.az)]
  }, [light])
  const keyIntensity =
    engine === "clay" || engine === "print" ? 2.1 : engine === "vessel" ? 1.4 : 1.2
  // holder and totem bake a contact shadow — refresh it once per change
  const shadowSeq = useRef(0)
  const bakedParams =
    engine === "holder" ? holderParams : engine === "totem" ? totemParams : null
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const shadowKey = useMemo(() => ++shadowSeq.current, [bakedParams, dark])
  // the softbox environment belongs to the merged-in engines' materials
  const softbox = engine === "holder" || engine === "vessel" || engine === "totem"
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

      {/* one steerable key light for every engine (three-finger drag);
          each engine keeps the fill rig its home studio used — pure
          directionals for ceramics and prints, ambient + softbox for the
          SDF engines */}
      <directionalLight
        key={shadow}
        position={lightPos}
        intensity={keyIntensity}
        castShadow
        shadow-mapSize={[shadow, shadow]}
        shadow-bias={-0.0002}
        shadow-normalBias={engine === "vessel" ? 0.05 : 0}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-camera-near={0.5}
        shadow-camera-far={24}
      />
      {(engine === "clay" || engine === "print") && (
        <>
          <directionalLight position={[-6, 3, -2]} intensity={0.5} />
          <directionalLight position={[2, 1.5, 7]} intensity={0.35} />
        </>
      )}
      {engine === "holder" && (
        <>
          <ambientLight intensity={0.35} />
          <directionalLight position={[-6, 3, -2]} intensity={0.35} />
        </>
      )}
      {engine === "vessel" && (
        <directionalLight position={[-6, 3, -2]} intensity={0.35} />
      )}
      {engine === "totem" && (
        <>
          <ambientLight intensity={0.35} />
          {/* the ebonised body is near-black — a firmer rim keeps its
              edge readable against the dark-mode void */}
          <directionalLight position={[-6, 3, -2]} intensity={0.5} />
          {/* soft frontal fill so bores, sunken panels and funnel walls
              stay legible instead of collapsing into the silhouette */}
          <directionalLight position={[1.5, 2.5, 8]} intensity={0.4} />
        </>
      )}

      <Suspense fallback={null}>
        <group position={[0, -0.85, 0]}>
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
          {/* ground: an invisible plane that only receives the cast
              shadow — light mode only, dark mode floats the piece in the
              void */}
          {!dark && (
            <>
              <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[60, 60]} />
                <shadowMaterial
                  transparent
                  opacity={engine === "vessel" ? 0.34 : softbox ? 0.16 : 0.22}
                />
              </mesh>
              {(engine === "holder" || engine === "totem") && (
                <ContactShadows
                  key={shadowKey}
                  position={[0, 0.001, 0]}
                  opacity={0.28}
                  scale={9}
                  blur={2.2}
                  far={2.6}
                  resolution={
                    engine === "totem" ? (mobile ? 512 : 1024) : mobile ? 256 : 512
                  }
                  frames={50}
                  color="#000000"
                />
              )}
            </>
          )}
        </group>
        {/* local softbox studio — no remote HDR fetch */}
        {softbox && (
          <Environment resolution={256} environmentIntensity={1}>
            <color attach="background" args={["#9a9a9a"]} />
            <Lightformer
              form="rect"
              intensity={3}
              position={[0, 6, 1]}
              rotation={[-Math.PI / 2, 0, 0]}
              scale={[9, 7, 1]}
            />
            <Lightformer
              form="rect"
              intensity={1.6}
              position={[-6, 2, 3]}
              rotation={[0, Math.PI / 2.4, 0]}
              scale={[5, 3.2, 1]}
            />
            <Lightformer
              form="rect"
              intensity={1.1}
              position={[6, 1.4, -2.5]}
              rotation={[0, -Math.PI / 2.2, 0]}
              scale={[5, 2.6, 1]}
            />
            <Lightformer
              form="rect"
              intensity={0.7}
              position={[0, 1, 6]}
              rotation={[0, Math.PI, 0]}
              scale={[7, 1.8, 1]}
            />
          </Environment>
        )}
      </Suspense>

      <FitCamera fit={fit} margin={FIT_MARGIN[engine]} />
      {onCaptureReady && <CaptureBridge onReady={onCaptureReady} />}
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
