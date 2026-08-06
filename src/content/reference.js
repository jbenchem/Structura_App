// ─────────────────────────────────────────────────────────────
// Nomenclature reference data.
//
// Two tables:
//   ROOTS   the first twenty chain lengths
//   LADDER  functional groups in order of seniority, with the
//           suffix used when the group is the principal one and
//           the prefix used when it has been outranked
//
// The roots are checked against the engine by
// tests/reference.test.mjs — a reference table that disagrees with
// the checker would be worse than no table at all.
//
// Sketches are drawn by ReferenceSheet from this spec rather than
// being images:
//   chain  the labels along the backbone, left to right
//   bonds  bond order between successive labels
//   up     an atom double-bonded above a given index (the C=O)
// ─────────────────────────────────────────────────────────────

export const ROOTS = [
  { n: 1, root: 'meth', alkane: 'methane' },
  { n: 2, root: 'eth', alkane: 'ethane' },
  { n: 3, root: 'prop', alkane: 'propane' },
  { n: 4, root: 'but', alkane: 'butane' },
  { n: 5, root: 'pent', alkane: 'pentane' },
  { n: 6, root: 'hex', alkane: 'hexane' },
  { n: 7, root: 'hept', alkane: 'heptane' },
  { n: 8, root: 'oct', alkane: 'octane' },
  { n: 9, root: 'non', alkane: 'nonane' },
  { n: 10, root: 'dec', alkane: 'decane' },
  { n: 11, root: 'undec', alkane: 'undecane' },
  { n: 12, root: 'dodec', alkane: 'dodecane' },
  { n: 13, root: 'tridec', alkane: 'tridecane' },
  { n: 14, root: 'tetradec', alkane: 'tetradecane' },
  { n: 15, root: 'pentadec', alkane: 'pentadecane' },
  { n: 16, root: 'hexadec', alkane: 'hexadecane' },
  { n: 17, root: 'heptadec', alkane: 'heptadecane' },
  { n: 18, root: 'octadec', alkane: 'octadecane' },
  { n: 19, root: 'nonadec', alkane: 'nonadecane' },
  { n: 20, root: 'icos', alkane: 'icosane' },
];

// Decreasing seniority. The group highest on this list that is
// present becomes the principal characteristic group: it takes the
// suffix and the lowest locant. Everything below it is demoted to
// its prefix.
export const LADDER = [
  {
    rank: 1,
    group: 'Carboxylic acid',
    suffix: '-oic acid',
    prefix: 'carboxy-',
    example: 'ethanoic acid',
    sketch: { chain: ['R', 'C', 'OH'], bonds: [1, 1], up: { at: 1, label: 'O', order: 2 } },
  },
  {
    rank: 2,
    group: 'Acid anhydride',
    suffix: '-oic anhydride',
    prefix: '—',
    example: 'ethanoic anhydride',
    sketch: { chain: ['R', 'C', 'O', 'C', "R'"], bonds: [1, 1, 1, 1], up: { at: 1, label: 'O', order: 2 } },
  },
  {
    rank: 3,
    group: 'Ester',
    suffix: '-oate',
    prefix: 'alkoxycarbonyl-',
    example: 'ethyl ethanoate',
    sketch: { chain: ['R', 'C', 'O', "R'"], bonds: [1, 1, 1], up: { at: 1, label: 'O', order: 2 } },
  },
  {
    rank: 4,
    group: 'Acyl halide',
    suffix: '-oyl halide',
    prefix: 'halocarbonyl-',
    example: 'ethanoyl chloride',
    sketch: { chain: ['R', 'C', 'Cl'], bonds: [1, 1], up: { at: 1, label: 'O', order: 2 } },
  },
  {
    rank: 5,
    group: 'Amide',
    suffix: '-amide',
    prefix: 'carbamoyl-',
    example: 'ethanamide',
    sketch: { chain: ['R', 'C', 'NH2'], bonds: [1, 1], up: { at: 1, label: 'O', order: 2 } },
  },
  {
    rank: 6,
    group: 'Nitrile',
    suffix: '-nitrile',
    prefix: 'cyano-',
    example: 'ethanenitrile',
    sketch: { chain: ['R', 'C', 'N'], bonds: [1, 3] },
  },
  {
    rank: 7,
    group: 'Aldehyde',
    suffix: '-al',
    prefix: 'oxo-',
    example: 'ethanal',
    sketch: { chain: ['R', 'C', 'H'], bonds: [1, 1], up: { at: 1, label: 'O', order: 2 } },
  },
  {
    rank: 8,
    group: 'Ketone',
    suffix: '-one',
    prefix: 'oxo-',
    example: 'propan-2-one',
    sketch: { chain: ['R', 'C', "R'"], bonds: [1, 1], up: { at: 1, label: 'O', order: 2 } },
  },
  {
    rank: 9,
    group: 'Alcohol',
    suffix: '-ol',
    prefix: 'hydroxy-',
    example: 'ethanol',
    sketch: { chain: ['R', 'OH'], bonds: [1] },
  },
  {
    rank: 10,
    group: 'Amine',
    suffix: '-amine',
    prefix: 'amino-',
    example: 'ethanamine',
    sketch: { chain: ['R', 'NH2'], bonds: [1] },
  },
  {
    rank: 11,
    group: 'Alkene',
    suffix: '-ene',
    prefix: '—',
    example: 'but-2-ene',
    sketch: { chain: ['R', 'C', 'C', "R'"], bonds: [1, 2, 1] },
  },
  {
    rank: 12,
    group: 'Alkyne',
    suffix: '-yne',
    prefix: '—',
    example: 'but-1-yne',
    sketch: { chain: ['R', 'C', 'C', 'H'], bonds: [1, 3, 1] },
  },
  {
    rank: 13,
    group: 'Alkane',
    suffix: '-ane',
    prefix: 'alkyl-',
    example: 'butane',
    sketch: { chain: ['R', 'CH3'], bonds: [1] },
  },
];

// These never win. They have no suffix form at all, so they are
// always cited as a prefix however many of them there are.
export const PREFIX_ONLY = [
  {
    group: 'Ether',
    prefix: 'alkoxy-',
    example: 'methoxyethane',
    sketch: { chain: ['R', 'O', "R'"], bonds: [1, 1] },
  },
  {
    group: 'Halide',
    prefix: 'fluoro- chloro- bromo- iodo-',
    example: '2-chlorobutane',
    sketch: { chain: ['R', 'X'], bonds: [1] },
  },
  {
    group: 'Nitro',
    prefix: 'nitro-',
    example: 'nitrobenzene',
    sketch: { chain: ['R', 'NO2'], bonds: [1] },
  },
];
