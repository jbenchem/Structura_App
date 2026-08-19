// ─────────────────────────────────────────────────────────────
// Lay a molecule out the way a chemist draws it.
//
// The app's `tidy` snaps to a SQUARE lattice, so a chain comes out with 90°
// corners — a square wave rather than a zigzag. Real skeletal formulae use
// roughly 120° at every chain carbon, which is what the naming engine produces
// when it parses a name.
//
// So the engine is the authority: name the molecule, parse the name back, and
// take those coordinates. The round trip is identity-preserving by
// construction — it is the same name, so it is the same molecule — and it
// gives the geometry chemists expect.
//
// Anything the engine cannot name (a diagram with explicit hydrogens, say)
// keeps the layout it came with.
// ─────────────────────────────────────────────────────────────

import { nameGraph, parseName } from '../engine/index.js';

export function prettify(mol) {
  if (!mol || !mol.atoms || mol.atoms.length < 2) return mol;

  // explicit hydrogens are a deliberate drawing choice; leave them alone
  if (mol.atoms.some((a) => a.el === 'H')) return mol;

  const named = nameGraph(mol);
  if (!named.ok) return mol;

  const parsed = parseName(named.name);
  if (!parsed.ok || !parsed.mol) return mol;

  // a round trip that changed the atom count is not the same molecule
  if (parsed.mol.atoms.length !== mol.atoms.length) return mol;
  if (parsed.mol.bonds.length !== mol.bonds.length) return mol;

  return parsed.mol;
}
