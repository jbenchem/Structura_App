// ─────────────────────────────────────────────────────────────
// Display hydrogens for double bonds.
//
// Cis and trans are about which side of a C=C each group sits on. With
// skeletal notation the hydrogens are invisible, so a learner is asked to
// compare positions of groups they cannot see. This expands them.
//
// DISPLAY ONLY. The engine refuses to name a graph carrying explicit
// hydrogens — it answers `unsupported` — so an expanded molecule must never
// be handed to nameGraph, parseName or the checker. Expansion therefore
// happens inside the renderer, at the point of drawing, and the expanded
// graph is thrown away immediately afterwards.
//
// Placement keeps the geometry honest: each hydrogen goes where the real one
// is, so the drawing still reads cis or trans correctly.
// ─────────────────────────────────────────────────────────────

const VALENCE = { C: 4, N: 3, O: 2, S: 2, F: 1, Cl: 1, Br: 1, I: 1, H: 1 };

const elOf = (a) => a.el || 'C';

function bondLengthOf(mol) {
  if (!mol.bonds.length) return 64;
  const at = (id) => mol.atoms.find((a) => a.id === id);
  const lens = mol.bonds
    .map((b) => {
      const A = at(b.a);
      const B = at(b.b);
      return A && B ? Math.hypot(A.x - B.x, A.y - B.y) : 0;
    })
    .filter(Boolean)
    .sort((x, y) => x - y);
  return lens[Math.floor(lens.length / 2)] || 64;
}

// Which carbons sit in a double bond, and how many hydrogens each is hiding.
export function doubleBondCarbons(mol) {
  const out = [];
  for (const b of mol.bonds) {
    if (b.order !== 2) continue;
    for (const id of [b.a, b.b]) {
      const atom = mol.atoms.find((a) => a.id === id);
      if (!atom || elOf(atom) !== 'C') continue;
      const load = mol.bonds
        .filter((x) => x.a === id || x.b === id)
        .reduce((s, x) => s + (x.order || 1), 0);
      const nH = Math.max(0, (VALENCE[elOf(atom)] ?? 4) - load);
      if (nH > 0 && !out.some((o) => o.id === id)) out.push({ id, atom, nH });
    }
  }
  return out;
}

// Returns a COPY with hydrogens drawn on the carbons of every C=C.
// Returns the original untouched when there is nothing to expand.
export function withDisplayHydrogens(mol) {
  if (!mol || !mol.bonds || !mol.bonds.some((b) => b.order === 2)) return mol;
  const targets = doubleBondCarbons(mol);
  if (!targets.length) return mol;

  const L = bondLengthOf(mol);
  const atoms = mol.atoms.map((a) => ({ ...a }));
  const bonds = mol.bonds.map((b) => ({ ...b }));
  let nextId = Math.max(...atoms.map((a) => (typeof a.id === 'number' ? a.id : 0))) + 1;

  for (const { id, atom, nH } of targets) {
    // directions already used by this carbon's neighbours
    const taken = bonds
      .filter((b) => b.a === id || b.b === id)
      .map((b) => atoms.find((a) => a.id === (b.a === id ? b.b : b.a)))
      .filter(Boolean)
      .map((n) => Math.atan2(n.y - atom.y, n.x - atom.x));

    // Place each hydrogen in the widest remaining gap, which puts it where the
    // real one is: opposite the existing substituent for a CH, and at the two
    // free corners for a CH2.
    for (let k = 0; k < nH; k++) {
      let best = 0;
      let bestGap = -1;
      for (let deg = 0; deg < 360; deg += 5) {
        const a = (deg * Math.PI) / 180;
        const gap = Math.min(
          ...taken.map((t) => {
            let d = Math.abs(a - t) % (2 * Math.PI);
            return d > Math.PI ? 2 * Math.PI - d : d;
          })
        );
        if (gap > bestGap) {
          bestGap = gap;
          best = a;
        }
      }
      const hid = nextId++;
      atoms.push({
        id: hid,
        x: atom.x + L * Math.cos(best),
        y: atom.y + L * Math.sin(best),
        el: 'H',
      });
      bonds.push({ a: id, b: hid, order: 1, stereo: null });
      taken.push(best);
    }
  }

  return { atoms, bonds, __display: true };
}
