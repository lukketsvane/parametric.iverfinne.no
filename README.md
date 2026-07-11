# parametric.iverfinne.no

One parametric 3D studio, five generative engines — the merger of what
used to live at parametric, parametric-01, parametric-02 and
parametric-03. The dropdown in the panel switches engines — motors
generating meshes, nothing else: no user-facing presets, no shape
menus. Each engine keeps its own current design (shuffle never crosses
engines, and roams the motor's whole space), and the shared shell —
viewer stage, controls panel, gestures, shareable URL state — comes
from parametric-02.

**Ceramics** (`lib/model.ts`, `lib/build.ts`) — one generative model: a
stack of two lathe bodies studded with rings of spikes and bobbles,
plus ball feet, apex ornaments and a two-glaze palette. Each design is
a point in the shared parameter space; the walls carry a seeded
thrown-clay wobble and the glaze is baked per vertex, breaking to pale
stoneware over tips, crests and the mouth lip.

**Prints** (`lib/print-model.ts`, `lib/print-build.ts`) — 3D-printed
vases: ribbed shells with lobed clover cross-sections, goblet /
trumpet / petal / turbine / bell cups, pill and knurl reliefs, candy
filaments with vertical fades. Its parameter space is a handful of
discrete traits shown as tappable glyph and word chips, plus two
gesture-only dials (two-finger scroll reshapes body and cup).

**Candle holders** (`lib/holder/`, from parametric.iverfinne.no's
original builder) — organic holders grown from symmetries, booleans
and lattices, meshed from an SDF by marching cubes on a worker. The
socket fits a real candle (telys Ø39 or kronelys Ø22); STL downloads
are print-ready, in millimeters.

**Vessels** (`lib/vessel/`, from parametric-01) — finned, tiered, torn
SDF bodies in tinted clay: one motor whose shuffle roams the whole
space; the reference pieces live on only as internal sampler anchors.
Crevice-graded vertex colors, slab-parallel worker refines, STL export.

**Totems** (`lib/totem/`, from parametric-03) — stacked, pierced,
limb-sprouting bodies in ebonised near-black or raw carved wood, with
no named types: every design is a seed-sampled point in one continuous
space. The seed field takes any text, so «Iver» is always the same
totem; the controls are eight trait tiles — drag to shape, tap to
rethrow, lock against shuffle — with the full slider list behind the
expander. STL export at print resolution.

Geometry is fully deterministic everywhere: all irregularity comes
from seeded PRNGs, so a design's parameter values (also encoded in the
URL hash, with an `engine` field routing to the right motor) reproduce
it bit-for-bit. Old candle-holder links without an engine field still
resolve — they betray themselves by their `candle` parameter.

On the stage, one steerable key light (three-finger drag) serves every
engine; its default heading is exactly where the merged-in studios'
fixed key used to hang. Ceramics and prints keep their pure-directional
rig with a single hard shadow; the SDF engines keep their softbox
environment, fills and baked contact shadows.
