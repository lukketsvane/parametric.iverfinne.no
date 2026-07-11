/**
 * The engine registry: five disconnected generative motors share one
 * stage, switched by the dropdown in the panel. Each engine keeps its
 * own current design — switching never touches the others' state — and
 * shuffle never crosses engines.
 *
 *  - clay:   ceramics — stacked lathe bodies studded with thorns and
 *            bobbles under a two-glaze palette (lib/model.ts)
 *  - print:  3D-printed vases — ribbed shells, lobed cross-sections,
 *            discrete trait chips (lib/print-model.ts)
 *  - holder: candle holders — symmetric grown lattices with a real
 *            candle socket, STL in mm (lib/holder/candle-holder.ts)
 *  - vessel: vessels — finned, tiered, torn SDF bodies in tinted clay,
 *            one motor roaming twelve reference families
 *            (lib/vessel/engine.ts)
 *  - totem:  totems — stacked, pierced, limb-sprouting bodies in
 *            ebonised wood; any text is a seed (lib/totem/engine.ts)
 */
import type { Params } from "./model"
import type { PrintParams } from "./print-model"
import type { HolderParams } from "./holder/candle-holder"
import type { Params as VesselParams } from "./vessel/engine"
import type { Params as TotemParams } from "./totem/engine"

export type Engine = "clay" | "print" | "holder" | "vessel" | "totem"

/** Dropdown order — the two original engines first, then the merged-in
 * studios in their historical order. */
export const ENGINES: readonly { id: Engine; label: string }[] = [
  { id: "clay", label: "ceramics" },
  { id: "print", label: "prints" },
  { id: "holder", label: "candle holders" },
  { id: "vessel", label: "vessels" },
  { id: "totem", label: "totems" },
]

export type AnyParams =
  | Params
  | PrintParams
  | HolderParams
  | VesselParams
  | TotemParams

/** A piece kept on the visitor's shelf: params + a snapshot thumbnail.
 * Each piece remembers which engine made it. */
export type KeptPiece = {
  id: number
  engine: Engine
  name: string
  thumb: string
  params: AnyParams
}
