import * as THREE from "three"
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import { buildSculpture, type SculptureParams } from "./parametric-sculpture"
import { buildFinSculpture, type FinParams } from "./fin-sculpture"

// STL exports are baked once at high tessellation regardless of the live
// viewport quality, so downloads are always print-grade.
const EXPORT_DETAIL = 2.2

function finExportGeometry(p: FinParams): THREE.BufferGeometry | null {
  const built = buildFinSculpture(p, EXPORT_DETAIL)
  if (!built) return null
  const parts = built.matrices.map((m) => built.geometry.clone().applyMatrix4(m))
  const merged = mergeGeometries(parts, false)
  parts.forEach((g) => g.dispose())
  built.geometry.dispose()
  return merged
}

/** Build the current form, encode it as a binary STL, and trigger a download. */
export function downloadSTL(
  params: SculptureParams,
  finParams: FinParams,
): void {
  let geo: THREE.BufferGeometry | null
  let name: string
  if (params.form === "fin") {
    geo = finExportGeometry(finParams)
    name = `fin-${finParams.family}-${finParams.seed}`
  } else {
    geo = buildSculpture(params, EXPORT_DETAIL)
    name = params.form
  }
  if (!geo) return

  const mesh = new THREE.Mesh(geo)
  const data = new STLExporter().parse(mesh, { binary: true }) as unknown as DataView
  geo.dispose()

  const blob = new Blob([data], { type: "model/stl" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${name}.stl`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
