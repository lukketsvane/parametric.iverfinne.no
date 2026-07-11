import * as THREE from "three"

/** Raw builder arrays as every engine's mesher produces them. */
export type MeshArrays = {
  positions: Float32Array
  normals: Float32Array
  indices: Uint32Array
  colors?: Float32Array
}

/** Wrap raw builder arrays in an indexed BufferGeometry. */
export function arraysToGeometry({
  positions,
  normals,
  indices,
  colors,
}: MeshArrays): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
  geo.setAttribute("normal", new THREE.BufferAttribute(normals, 3))
  if (colors) geo.setAttribute("color", new THREE.BufferAttribute(colors, 3))
  geo.setIndex(new THREE.BufferAttribute(indices, 1))
  return geo
}
