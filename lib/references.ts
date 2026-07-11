/**
 * The reference pieces from the photo set, kept as exact parameter
 * points for regression: loading one through the URL hash must
 * reproduce the same geometry bit-for-bit. These are NOT form presets —
 * the UI never offers them; every one is just a location in the single
 * shared parameter space of lib/model.ts.
 */
import type { Params } from "./model"

/**
 * The reference pieces, each an exact point in the parameter space.
 * Loading one reproduces the same geometry bit-for-bit: the builder is
 * fully deterministic and all irregularity comes from the seeded PRNG.
 */
export const REFERENCE_DESIGNS: { name: string; params: Params }[] = [
  {
    // chartreuse urn under a pale grey spiked tower (IMG_8647)
    name: "durian",
    params: {
      seed: 7,
      hB: 1.05, footH: 0, footR: 0, rBaseB: 0.3, rMaxB: 0.72, bellyB: 0.55, rTopB: 0.26, roundB: 2.2,
      ringsB: 10, perRingB: 16, shapeB: 0, sizeB: 0.07, aspectB: 2.8, alignB: 1, bandLoB: 0.05, bandHiB: 0.97,
      hT: 0.9, rBaseT: 0.32, rMaxT: 0.32, bellyT: 0.05, rTopT: 0.08, roundT: 1,
      ringsT: 5, perRingT: 4, shapeT: 0, sizeT: 0.055, aspectT: 5.6, alignT: 0, bandLoT: 0.14, bandHiT: 0.88,
      apexType: 1, apexH: 0.34, apexR: 0.05, feet: 0, feetR: 0.12,
      stagger: 0.5, jitter: 0.1, gloss: 1, glazeB: 4, glazeT: 2,
    },
  },
  {
    // nude trunk ringed with bobbles and long thorns (IMG_8645 left)
    name: "totem",
    params: {
      seed: 3,
      hB: 1.85, footH: 0, footR: 0, rBaseB: 0.24, rMaxB: 0.4, bellyB: 0.8, rTopB: 0.18, roundB: 2.2,
      ringsB: 8, perRingB: 5, shapeB: 0.6, sizeB: 0.105, aspectB: 3.8, alignB: 0.25, bandLoB: 0.1, bandHiB: 0.95,
      hT: 0, rBaseT: 0.2, rMaxT: 0.2, bellyT: 0.5, rTopT: 0.15, roundT: 1,
      ringsT: 0, perRingT: 8, shapeT: 0, sizeT: 0.05, aspectT: 2, alignT: 0.5, bandLoT: 0.1, bandHiT: 0.9,
      apexType: 0, apexH: 0.2, apexR: 0.06, feet: 0, feetR: 0.12,
      stagger: 0.5, jitter: 0.18, gloss: 1, glazeB: 6, glazeT: 6,
    },
  },
  {
    // petrol column of fin rings under a small chalice (IMG_8645 middle)
    name: "fins",
    params: {
      seed: 11,
      hB: 1.0, footH: 0, footR: 0, rBaseB: 0.15, rMaxB: 0.16, bellyB: 0.5, rTopB: 0.14, roundB: 1,
      ringsB: 9, perRingB: 12, shapeB: 0, sizeB: 0.036, aspectB: 5.2, alignB: 0, bandLoB: 0.04, bandHiB: 0.8,
      hT: 0.32, rBaseT: 0.08, rMaxT: 0.09, bellyT: 0.3, rTopT: 0.22, roundT: 1.9,
      ringsT: 0, perRingT: 8, shapeT: 0, sizeT: 0.04, aspectT: 2, alignT: 0.5, bandLoT: 0.1, bandHiT: 0.9,
      apexType: 0, apexH: 0.2, apexR: 0.06, feet: 0, feetR: 0.12,
      stagger: 0.5, jitter: 0.1, gloss: 1, glazeB: 12, glazeT: 12,
    },
  },
  {
    // rose dome with thorns and bobble skirt, sky ball on top (IMG_8645 right)
    name: "sputnik",
    params: {
      seed: 5,
      hB: 0.72, footH: 0, footR: 0, rBaseB: 0.62, rMaxB: 0.66, bellyB: 0.15, rTopB: 0.16, roundB: 1.7,
      ringsB: 2, perRingB: 6, shapeB: 0, sizeB: 0.15, aspectB: 2.4, alignB: 0.9, bandLoB: 0.42, bandHiB: 0.78,
      hT: 0.62, rBaseT: 0.05, rMaxT: 0.33, bellyT: 0.5, rTopT: 0.03, roundT: 3.4,
      ringsT: 0, perRingT: 8, shapeT: 0, sizeT: 0.05, aspectT: 2, alignT: 0.5, bandLoT: 0.1, bandHiT: 0.9,
      apexType: 2, apexH: 0.1, apexR: 0.1, feet: 8, feetR: 0.155,
      stagger: 0.5, jitter: 0.05, gloss: 1, glazeB: 8, glazeT: 11,
    },
  },
  {
    // white bell on ball feet under a grey studded drum (IMG_8646)
    name: "bell",
    params: {
      seed: 9,
      hB: 0.85, footH: 0, footR: 0, rBaseB: 0.68, rMaxB: 0.7, bellyB: 0.02, rTopB: 0.26, roundB: 0.85,
      ringsB: 7, perRingB: 14, shapeB: 0.35, sizeB: 0.065, aspectB: 2, alignB: 1, bandLoB: 0.04, bandHiB: 0.94,
      hT: 0.5, rBaseT: 0.26, rMaxT: 0.27, bellyT: 0.5, rTopT: 0.24, roundT: 1.2,
      ringsT: 3, perRingT: 11, shapeT: 0.35, sizeT: 0.048, aspectT: 1.6, alignT: 0.2, bandLoT: 0.25, bandHiT: 0.85,
      apexType: 0, apexH: 0.2, apexR: 0.06, feet: 3, feetR: 0.18,
      stagger: 0.5, jitter: 0.14, gloss: 1, glazeB: 0, glazeT: 3,
    },
  },
  {
    // sky totem with bobble tiers under a mauve head (IMG_7405)
    name: "doll",
    params: {
      seed: 4,
      hB: 1.0, footH: 0.3, footR: 0.42, rBaseB: 0.2, rMaxB: 0.48, bellyB: 0.3, rTopB: 0.15, roundB: 1.1,
      ringsB: 2, perRingB: 9, shapeB: 1, sizeB: 0.1, aspectB: 1, alignB: 0.35, bandLoB: 0.42, bandHiB: 0.72,
      hT: 0.5, rBaseT: 0.06, rMaxT: 0.26, bellyT: 0.5, rTopT: 0.03, roundT: 3.3,
      ringsT: 1, perRingT: 3, shapeT: 1, sizeT: 0.115, aspectT: 1, alignT: 0.05, bandLoT: 0.5, bandHiT: 0.58,
      apexType: 1, apexH: 0.42, apexR: 0.075, feet: 0, feetR: 0.12,
      stagger: 0.5, jitter: 0.04, gloss: 1, glazeB: 11, glazeT: 10,
    },
  },
  {
    // coral thorn barrel under a blush spiked cone (IMG_8648)
    name: "cactus",
    params: {
      seed: 13,
      hB: 1.2, footH: 0, footR: 0, rBaseB: 0.42, rMaxB: 0.5, bellyB: 0.5, rTopB: 0.27, roundB: 1.4,
      ringsB: 13, perRingB: 15, shapeB: 0, sizeB: 0.058, aspectB: 2.6, alignB: 0.75, bandLoB: 0.02, bandHiB: 0.99,
      hT: 0.8, rBaseT: 0.36, rMaxT: 0.36, bellyT: 0.05, rTopT: 0.02, roundT: 1.1,
      ringsT: 4, perRingT: 15, shapeT: 0, sizeT: 0.05, aspectT: 2.4, alignT: 0.85, bandLoT: 0.02, bandHiT: 0.42,
      apexType: 0, apexH: 0.2, apexR: 0.06, feet: 0, feetR: 0.12,
      stagger: 0, jitter: 0.12, gloss: 1, glazeB: 13, glazeT: 7,
    },
  },
  {
    // butter urn in dense thorn columns under a white cone roof (IMG_8659)
    name: "spore",
    params: {
      seed: 21,
      hB: 1.15, footH: 0, footR: 0, rBaseB: 0.26, rMaxB: 0.6, bellyB: 0.5, rTopB: 0.18, roundB: 2.3,
      ringsB: 10, perRingB: 18, shapeB: 0, sizeB: 0.05, aspectB: 5, alignB: 1, bandLoB: 0.04, bandHiB: 0.92,
      hT: 0.62, rBaseT: 0.42, rMaxT: 0.42, bellyT: 0.03, rTopT: 0.02, roundT: 1,
      ringsT: 0, perRingT: 8, shapeT: 0, sizeT: 0.05, aspectT: 2, alignT: 0.5, bandLoT: 0.1, bandHiT: 0.9,
      apexType: 0, apexH: 0.2, apexR: 0.06, feet: 0, feetR: 0.12,
      stagger: 0, jitter: 0.08, gloss: 1, glazeB: 5, glazeT: 0,
    },
  },
  {
    // caramel canister, big side bobbles, pearl ball lid, ball feet (IMG_8656)
    name: "bobble",
    params: {
      seed: 17,
      hB: 0.95, footH: 0, footR: 0, rBaseB: 0.4, rMaxB: 0.43, bellyB: 0.6, rTopB: 0.22, roundB: 2.6,
      ringsB: 3, perRingB: 4, shapeB: 1, sizeB: 0.13, aspectB: 1, alignB: 0.1, bandLoB: 0.25, bandHiB: 0.82,
      hT: 0.58, rBaseT: 0.07, rMaxT: 0.31, bellyT: 0.5, rTopT: 0.02, roundT: 3.4,
      ringsT: 0, perRingT: 8, shapeT: 0, sizeT: 0.05, aspectT: 2, alignT: 0.5, bandLoT: 0.1, bandHiT: 0.9,
      apexType: 0, apexH: 0.2, apexR: 0.06, feet: 4, feetR: 0.135,
      stagger: 0.5, jitter: 0.05, gloss: 1, glazeB: 9, glazeT: 1,
    },
  },
  {
    // white pedestal, spiked sphere belly, trumpet neck (IMG_8654)
    name: "urchin",
    params: {
      seed: 19,
      hB: 0.95, footH: 0.24, footR: 0.3, rBaseB: 0.1, rMaxB: 0.4, bellyB: 0.5, rTopB: 0.1, roundB: 3.2,
      ringsB: 3, perRingB: 10, shapeB: 0, sizeB: 0.065, aspectB: 2, alignB: 1, bandLoB: 0.35, bandHiB: 0.8,
      hT: 0.55, rBaseT: 0.09, rMaxT: 0.1, bellyT: 0.2, rTopT: 0.28, roundT: 1.5,
      ringsT: 0, perRingT: 8, shapeT: 0, sizeT: 0.05, aspectT: 2, alignT: 0.5, bandLoT: 0.1, bandHiT: 0.9,
      apexType: 0, apexH: 0.2, apexR: 0.06, feet: 0, feetR: 0.12,
      stagger: 0.5, jitter: 0.1, gloss: 1, glazeB: 0, glazeT: 0,
    },
  },
  {
    // matte-white open cylinder in horizontal thorn columns (IMG_8650)
    name: "spool",
    params: {
      seed: 23,
      hB: 1.05, footH: 0, footR: 0, rBaseB: 0.34, rMaxB: 0.35, bellyB: 0.5, rTopB: 0.33, roundB: 1,
      ringsB: 5, perRingB: 9, shapeB: 0, sizeB: 0.06, aspectB: 2.8, alignB: 0, bandLoB: 0.12, bandHiB: 0.88,
      hT: 0, rBaseT: 0.2, rMaxT: 0.2, bellyT: 0.5, rTopT: 0.15, roundT: 1,
      ringsT: 0, perRingT: 8, shapeT: 0, sizeT: 0.05, aspectT: 2, alignT: 0.5, bandLoT: 0.1, bandHiT: 0.9,
      apexType: 0, apexH: 0.2, apexR: 0.06, feet: 0, feetR: 0.12,
      stagger: 0, jitter: 0.08, gloss: 0.15, glazeB: 0, glazeT: 0,
    },
  },
]
