// ─────────────────────────────────────────────────────────────
// Illustration molecules.
//
// For questions that describe a situation — "a carbon drawn with five lines",
// "a hydrogen bonded to two carbons" — the situation should be on screen, not
// only in the sentence. A learner asked to spot an impossible structure should
// be looking at one.
//
// Some of these are DELIBERATELY IMPOSSIBLE. They never go near the engine:
// they are drawn, not named, and the renderer marks an over-valent atom in red
// of its own accord, which is exactly the point being made.
//
// Laid out by hand on a radial pattern so bonds come out equal length and
// nothing overlaps — the geometry suite audits these alongside real molecules.
// ─────────────────────────────────────────────────────────────

const L = 46;

// A central atom with ligands spaced evenly around it.
function radial(centre, ligands, { startDeg = -90 } = {}) {
  const atoms = [{ id: 0, el: centre, x: 0, y: 0, charge: 0, showH: false }];
  const bonds = [];
  const step = 360 / ligands.length;
  ligands.forEach((el, i) => {
    const rad = ((startDeg + i * step) * Math.PI) / 180;
    atoms.push({
      id: i + 1,
      el,
      x: L * Math.cos(rad),
      y: L * Math.sin(rad),
      charge: 0,
      showH: false,
    });
    bonds.push({ id: `b${i}`, a: 0, b: i + 1, order: 1, stereo: null });
  });
  return { atoms, bonds };
}

// ── Impossible structures ────────────────────────────────────
// Marked `impossible` so the content tests know the broken valence is the
// point. The flag is checked both ways: a molecule claiming to be impossible
// must actually break a valence rule, so it cannot be used to wave through a
// genuine mistake.
const impossible = (mol) => ({ ...mol, impossible: true });

// Five bonds on a carbon: the commonest thing a learner draws by accident.
export const carbonWithFiveBonds = () => impossible(radial('C', ['H', 'H', 'H', 'H', 'H']));

// A hydrogen in the middle of a chain. Hydrogen has one bond, so it can only
// ever be an endpoint.
export const hydrogenWithTwoBonds = () => impossible({
  atoms: [
    { id: 0, el: 'H', x: 0, y: 0, charge: 0, showH: false },
    { id: 1, el: 'C', x: -L, y: 0, charge: 0, showH: false },
    { id: 2, el: 'C', x: L, y: 0, charge: 0, showH: false },
  ],
  bonds: [
    { id: 'b0', a: 0, b: 1, order: 1, stereo: null },
    { id: 'b1', a: 0, b: 2, order: 1, stereo: null },
  ],
});

// Three bonds on an oxygen, which forms two.
export const oxygenWithThreeBonds = () => impossible(radial('O', ['C', 'H', 'H']));

// ── Possible structures worth seeing ─────────────────────────
// A carbon holding the number of carbon neighbours the question describes,
// with hydrogen filling the rest.
export function carbonWithNeighbours(carbonNeighbours) {
  const ligands = [
    ...Array(carbonNeighbours).fill('C'),
    ...Array(Math.max(0, 4 - carbonNeighbours)).fill('H'),
  ];
  return radial('C', ligands);
}

// Carbon's four bonds, filled entirely with hydrogen.
export const carbonWithFourBonds = () => radial('C', ['H', 'H', 'H', 'H']);

// A single hydrogen on a carbon: one bond, and it is an endpoint.
export const hydrogenWithOneBond = () => ({
  atoms: [
    { id: 0, el: 'C', x: -L / 2, y: 0, charge: 0, showH: false },
    { id: 1, el: 'H', x: L / 2, y: 0, charge: 0, showH: false },
  ],
  bonds: [{ id: 'b0', a: 0, b: 1, order: 1, stereo: null }],
});

// Oxygen's two bonds.
export const oxygenWithTwoBonds = () => radial('O', ['C', 'H'], { startDeg: -150 });
