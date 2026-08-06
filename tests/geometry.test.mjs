// "Not deformed" defined precisely: within one molecule every bond is the
// same length, and no two atoms that are not bonded sit on top of each other.
// Scale-independent, so it holds whatever lattice a molecule was built at.
import * as POOLS from '../src/content/pools.js';
import { STAGES } from '../src/content/curriculum.js';

let fails = 0;
const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Do two segments cross? Bonds that share an atom are allowed to meet at it.
function segmentsCross(p1, p2, p3, p4) {
  const o = (a, b, c) => Math.sign((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x));
  const o1 = o(p1, p2, p3);
  const o2 = o(p1, p2, p4);
  const o3 = o(p3, p4, p1);
  const o4 = o(p3, p4, p2);
  if (o1 !== o2 && o3 !== o4) return true;
  // collinear overlap counts too: one bond drawn along another
  const onSeg = (a, b, c) =>
    o(a, b, c) === 0 &&
    Math.min(a.x, b.x) - 1e-6 <= c.x && c.x <= Math.max(a.x, b.x) + 1e-6 &&
    Math.min(a.y, b.y) - 1e-6 <= c.y && c.y <= Math.max(a.y, b.y) + 1e-6;
  return onSeg(p1, p2, p3) || onSeg(p1, p2, p4) || onSeg(p3, p4, p1) || onSeg(p3, p4, p2);
}

function audit(m, label) {
  if (!m || !m.bonds || m.bonds.length === 0) return;
  const at = (id) => m.atoms.find((a) => a.id === id);
  const lengths = m.bonds.map((b) => d(at(b.a), at(b.b))).sort((x, y) => x - y);
  const median = lengths[Math.floor(lengths.length / 2)];
  const problems = [];
  for (const L of lengths) {
    if (Math.abs(L - median) > median * 0.15) problems.push(`uneven bond ${L.toFixed(0)} vs ${median.toFixed(0)}`);
  }
  const bonded = new Set(m.bonds.flatMap((b) => [`${b.a}|${b.b}`, `${b.b}|${b.a}`]));
  for (let i = 0; i < m.atoms.length; i++) {
    for (let j = i + 1; j < m.atoms.length; j++) {
      const A = m.atoms[i];
      const B = m.atoms[j];
      if (bonded.has(`${A.id}|${B.id}`)) continue;
      if (d(A, B) < median * 0.7) problems.push(`${A.id}/${B.id} overlap at ${d(A, B).toFixed(0)}`);
    }
  }
  // Crossing bonds: atoms can all be well spaced and the drawing still be a
  // tangle. This is what the earlier version of this test missed.
  for (let i = 0; i < m.bonds.length; i++) {
    for (let j = i + 1; j < m.bonds.length; j++) {
      const b1 = m.bonds[i];
      const b2 = m.bonds[j];
      if (b1.a === b2.a || b1.a === b2.b || b1.b === b2.a || b1.b === b2.b) continue;
      if (segmentsCross(at(b1.a), at(b1.b), at(b2.a), at(b2.b)))
        problems.push(`bonds ${b1.a}-${b1.b} and ${b2.a}-${b2.b} cross`);
    }
  }

  if (problems.length) {
    console.error(`  FAIL ${label}: ${problems.slice(0, 2).join(', ')}`);
    fails++;
  }
}

// The detector must itself be known-good: a deliberately tangled molecule has
// to be flagged, or a broken check would pass everything silently.
console.log('=== the detector works ===');
{
  const tangled = {
    atoms: [
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 100, y: 0 },
      { id: 'c', x: 50, y: -50 },
      { id: 'd', x: 50, y: 50 },
    ],
    bonds: [
      { a: 'a', b: 'b', order: 1 },
      { a: 'c', b: 'd', order: 1 },
    ],
  };
  const before = fails;
  const realError = console.error;
  console.error = () => {};          // this one is meant to fail
  audit(tangled, 'deliberately crossed bonds');
  console.error = realError;
  if (fails === before) {
    console.error('  FAIL: a crossing molecule was NOT flagged — the detector is broken');
    fails++;
  } else {
    fails = before; // that failure was expected
    console.log('  ok   crossing bonds are detected');
  }
}

let n = 0;
console.log('=== question molecules ===');
for (const [key, list] of Object.entries(POOLS).filter(([k]) => k.startsWith('POOL_'))) {
  for (const q of list) {
    const mols = q.type === 'mcStructure' ? q.options : q.mol ? [q.mol] : [];
    mols.forEach((m, i) => {
      n++;
      audit(m, `${key}/${q.id}${mols.length > 1 ? ` option ${i}` : ''}`);
    });
  }
}
console.log(`  ${n} question molecules audited`);

console.log('=== teaching molecules ===');
let t = 0;
for (const st of STAGES) for (const u of st.units) for (const l of u.lessons || []) for (const s of l.steps || []) {
  const m = s.mol || s.target;
  if (!m) continue;
  t++;
  audit(m, `${l.id} "${s.title || s.prompt || s.name}"`);
}
console.log(`  ${t} teaching molecules audited`);

console.log(fails ? `\n${fails} deformed structure(s)` : '\nevery structure is cleanly laid out');
process.exit(fails ? 1 : 0);
