// ─────────────────────────────────────────────────────────────
// Constitutional isomer enumeration.
//
// "Draw all five isomers of C6H14" is a standard exam question that a student
// cannot mark for themselves: they can produce five drawings and have no way
// to know whether two of them are the same compound.
//
// The engine settles it. Two skeletons are the same molecule exactly when they
// produce the same name, so enumeration is: build every carbon tree, name each
// one, and keep the distinct names. No graph-isomorphism code is needed —
// the namer already is a canonical form.
//
// Verified against the published isomer counts (OEIS A000602) for C1–C8:
// 1, 1, 1, 2, 3, 5, 9, 18. Building this found a real engine fault — a tie
// between equally long chains was not broken by substituent count, so one
// compound had two names and C8 came out as 19.
// ─────────────────────────────────────────────────────────────

import { nameGraph } from '../engine/index.js';
import { BOND } from '../sandbox/constants';
import { prettify } from './prettify';

// Known counts, used as a self-check rather than as data: if enumeration
// disagrees with these, something is wrong and the app should not pretend
// otherwise.
export const ALKANE_ISOMER_COUNTS = { 1: 1, 2: 1, 3: 1, 4: 2, 5: 3, 6: 5, 7: 9, 8: 18 };

// Every constitutional isomer of CnH(2n+2), as { name → molecule }.
//
// Enumeration is exhaustive over carbon trees with no atom above four bonds.
// It grows quickly, so it is capped: beyond nine carbons the count is large
// enough that the exercise stops being a drawing task anyway.
export function enumerateAlkanes(n) {
  const out = new Map();
  if (!Number.isInteger(n) || n < 1 || n > 9) return out;

  const build = (edges, count) => {
    if (count === n) {
      const atoms = Array.from({ length: n }, (_, i) => ({ id: i + 1, x: 0, y: 0 }));
      const bonds = edges.map(([a, b]) => ({ a: a + 1, b: b + 1, order: 1, stereo: null }));
      const raw = { atoms, bonds };
      const r = nameGraph(raw);
      if (!r.ok || out.has(r.name)) return;
      // laid out properly, since these are drawn for the learner
      let mol = raw;
      try {
        mol = prettify(raw);
      } catch (e) {
        mol = raw;
      }
      out.set(r.name, mol);
      return;
    }
    for (let parent = 0; parent < count; parent++) {
      const degree = edges.filter(([a, b]) => a === parent || b === parent).length;
      if (degree >= 4) continue;
      build([...edges, [parent, count]], count + 1);
    }
  };
  build([], 1);
  return out;
}

// The names only, in a stable order: straight chain first, then by how
// branched they are. That is the order a student naturally finds them in, so
// a partially-complete answer reads sensibly.
export function isomerNames(n) {
  const all = [...enumerateAlkanes(n).keys()];
  // In an alkane name every number is a substituent locant, so counting them
  // counts the branches exactly. Matching on "methyl" instead undercounts,
  // because "dimethyl" contains it once but means two.
  const branchCount = (name) => (name.match(/\d+/g) || []).length;
  return all.sort((a, b) => branchCount(a) - branchCount(b) || a.localeCompare(b));
}

// Is a drawn molecule one of the isomers of CnH(2n+2), and which?
// Returns { ok, name, already } — `already` when it duplicates one the learner
// has found before, which is the whole point of the exercise.
export function identifyIsomer(mol, n, found = []) {
  const r = nameGraph(mol);
  if (!r.ok) return { ok: false, reason: r.err };
  const carbons = mol.atoms.filter((a) => !a.el || a.el === 'C').length;
  if (carbons !== n) {
    return { ok: false, reason: 'wrong-size', carbons, name: r.name };
  }
  if (mol.bonds.some((b) => (b.order || 1) > 1)) {
    return { ok: false, reason: 'not-saturated', name: r.name };
  }
  if (mol.atoms.some((a) => a.el && a.el !== 'C' && a.el !== 'H')) {
    return { ok: false, reason: 'not-hydrocarbon', name: r.name };
  }
  return { ok: true, name: r.name, already: found.includes(r.name) };
}
