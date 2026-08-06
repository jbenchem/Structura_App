// ─────────────────────────────────────────────────────────────
// Molecule model.
//
// The interactive canvas now works directly in the engine's graph
// format, so this module is no longer an editor model. What remains
// is used for authoring and checking:
//   • newId / BOND_LENGTH  — building curriculum + question targets
//   • valence / formula / fragment helpers — used by the tests to
//     verify every authored target before it can ship
// ─────────────────────────────────────────────────────────────

export const BOND_LENGTH = 48;

export const VALENCE = { C: 4, N: 3, O: 2, S: 2, F: 1, Cl: 1, Br: 1, I: 1, H: 1 };

export const ELEMENTS_MAIN = ['C', 'N', 'O', 'S'];
export const ELEMENTS_HALO = ['F', 'Cl', 'Br', 'I'];

let nextId = 1;
export const newId = () => `k${nextId++}`;

export function seedMolecule() {
  return { atoms: [{ id: newId(), el: 'C', x: 0, y: 0, charge: 0, showH: false }], bonds: [] };
}

export function emptyMolecule() {
  return { atoms: [], bonds: [] };
}

// ── Lookups ──────────────────────────────────────────────────
export const atomById = (mol, id) => mol.atoms.find((a) => a.id === id) || null;
export const bondById = (mol, id) => mol.bonds.find((b) => b.id === id) || null;

export function bondsOf(mol, atomId) {
  return mol.bonds.filter((b) => b.a === atomId || b.b === atomId);
}

export function neighborsOf(mol, atomId) {
  return bondsOf(mol, atomId).map((b) => (b.a === atomId ? b.b : b.a));
}

export function bondBetween(mol, id1, id2) {
  return (
    mol.bonds.find(
      (b) => (b.a === id1 && b.b === id2) || (b.a === id2 && b.b === id1)
    ) || null
  );
}

export function orderSum(mol, atomId) {
  return bondsOf(mol, atomId).reduce((s, b) => s + b.order, 0);
}

// Effective valence with a simple charge adjustment:
//   N+ → 4, N- → 2, O- → 1, C+/C- → 3 …
export function effectiveValence(atom) {
  const base = VALENCE[atom.el] ?? 4;
  if (!atom.charge) return base;
  if (atom.el === 'N') return base + atom.charge;
  return base - Math.abs(atom.charge);
}

// Auto hydrogen count (skeletal convention).
export function hydrogenCount(mol, atom) {
  return Math.max(0, effectiveValence(atom) - orderSum(mol, atom.id));
}

export function overValence(mol, atom) {
  return orderSum(mol, atom.id) > effectiveValence(atom);
}

// Molecular formula as an element→count map (H included).
export function formulaOf(mol) {
  const f = {};
  for (const a of mol.atoms) {
    f[a.el] = (f[a.el] || 0) + 1;
    const h = hydrogenCount(mol, a);
    if (h) f.H = (f.H || 0) + h;
  }
  return f;
}

export function formulaString(f) {
  const keys = Object.keys(f).sort((x, y) => {
    const rank = (k) => (k === 'C' ? 0 : k === 'H' ? 1 : 2);
    return rank(x) - rank(y) || x.localeCompare(y);
  });
  return keys.map((k) => `${k}${f[k] > 1 ? f[k] : ''}`).join('');
}

// Connected fragments (list of atom-id arrays).
export function fragmentsOf(mol) {
  const seen = new Set();
  const frags = [];
  for (const a of mol.atoms) {
    if (seen.has(a.id)) continue;
    const stack = [a.id];
    const frag = [];
    seen.add(a.id);
    while (stack.length) {
      const id = stack.pop();
      frag.push(id);
      for (const n of neighborsOf(mol, id)) {
        if (!seen.has(n)) {
          seen.add(n);
          stack.push(n);
        }
      }
    }
    frags.push(frag);
  }
  return frags;
}

export function hasRing(mol) {
  // For each connected fragment: edges >= atoms ⇒ cycle.
  const frags = fragmentsOf(mol);
  for (const frag of frags) {
    const set = new Set(frag);
    const edges = mol.bonds.filter((b) => set.has(b.a) && set.has(b.b)).length;
    if (edges >= frag.length && frag.length > 0) return true;
  }
  return false;
}

// ── Edit operations (all return a new molecule) ──────────────
export function addAtom(mol, { el = 'C', x, y }) {
  const atom = { id: newId(), el, x, y, charge: 0, showH: false };
  return { mol: { ...mol, atoms: [...mol.atoms, atom] }, atom };
}

export function addBond(mol, a, b, order = 1) {
  if (a === b || bondBetween(mol, a, b)) return { mol, bond: null };
  const bond = { id: newId(), a, b, order, stereo: null };
  return { mol: { ...mol, bonds: [...mol.bonds, bond] }, bond };
}

export function removeAtom(mol, atomId) {
  return {
    atoms: mol.atoms.filter((a) => a.id !== atomId),
    bonds: mol.bonds.filter((b) => b.a !== atomId && b.b !== atomId),
  };
}

export function removeBond(mol, bondId) {
  return { ...mol, bonds: mol.bonds.filter((b) => b.id !== bondId) };
}

export function updateAtom(mol, atomId, patch) {
  return {
    ...mol,
    atoms: mol.atoms.map((a) => (a.id === atomId ? { ...a, ...patch } : a)),
  };
}

export function updateBond(mol, bondId, patch) {
  return {
    ...mol,
    bonds: mol.bonds.map((b) => (b.id === bondId ? { ...b, ...patch } : b)),
  };
}

// Snap an angle (radians) to 30° increments.
export function snapAngle(angle) {
  const step = Math.PI / 6;
  return Math.round(angle / step) * step;
}

// Position for a new atom dragged out from `from` toward (tx, ty).
export function snappedExtension(from, tx, ty) {
  const angle = snapAngle(Math.atan2(ty - from.y, tx - from.x));
  return { x: from.x + BOND_LENGTH * Math.cos(angle), y: from.y + BOND_LENGTH * Math.sin(angle) };
}

// Stamp a ring of `size` carbons. If `onAtom` is given, that atom
// becomes a vertex and the ring grows away from its neighbours.
export function stampRing(mol, size, at, onAtom, benzene = false) {
  const r = BOND_LENGTH / (2 * Math.sin(Math.PI / size));
  let cx = at.x;
  let cy = at.y;
  let startAngle = -Math.PI / 2;

  let m = mol;
  const ids = [];

  if (onAtom) {
    // Center sits opposite the average neighbour direction.
    const nbs = neighborsOf(mol, onAtom.id)
      .map((id) => atomById(mol, id))
      .filter(Boolean);
    let dx = 0;
    let dy = 0;
    for (const n of nbs) {
      dx += n.x - onAtom.x;
      dy += n.y - onAtom.y;
    }
    const len = Math.hypot(dx, dy);
    const ux = len ? -dx / len : 1;
    const uy = len ? -dy / len : 0;
    cx = onAtom.x + ux * r;
    cy = onAtom.y + uy * r;
    startAngle = Math.atan2(onAtom.y - cy, onAtom.x - cx);
    ids.push(onAtom.id);
  }

  const startIdx = ids.length;
  for (let i = startIdx; i < size; i++) {
    const a = startAngle + (2 * Math.PI * i) / size;
    const res = addAtom(m, { el: 'C', x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
    m = res.mol;
    ids.push(res.atom.id);
  }
  for (let i = 0; i < size; i++) {
    const order = benzene && i % 2 === 0 ? 2 : 1;
    const res = addBond(m, ids[i], ids[(i + 1) % size], order);
    m = res.mol;
  }
  return m;
}

export function moleculeBBox(mol) {
  if (!mol.atoms.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const a of mol.atoms) {
    minX = Math.min(minX, a.x);
    minY = Math.min(minY, a.y);
    maxX = Math.max(maxX, a.x);
    maxY = Math.max(maxY, a.y);
  }
  return { minX, minY, maxX, maxY };
}
