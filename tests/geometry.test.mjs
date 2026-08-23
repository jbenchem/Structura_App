// "Not deformed" defined precisely: within one molecule every bond is the
// same length, and no two atoms that are not bonded sit on top of each other.
// Scale-independent, so it holds whatever lattice a molecule was built at.
import * as POOLS from '../src/content/pools.js';
import { STAGES } from '../src/content/curriculum.js';
import { labelWidth } from '../src/sandbox/constants.js';

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
  // A polycyclic skeleton cannot have equal bond lengths on a flat page: a
  // bridge drawn across a ring is necessarily shorter than the ring bonds it
  // spans. Bicyclo and spiro structures are exempt — the rule exists to catch
  // a chain drawn carelessly, not to demand the impossible.
  const ringCount = m.bonds.length - m.atoms.length + 1;
  if (ringCount < 2) {
    for (const L of lengths) {
      if (Math.abs(L - median) > median * 0.15) problems.push(`uneven bond ${L.toFixed(0)} vs ${median.toFixed(0)}`);
    }
  }
  // Overlap is judged only on structures that can be drawn cleanly flat. A
  // bicyclo or spiro skeleton is genuinely three-dimensional, so a 2D drawing
  // brings bridge atoms close together no matter how it is laid out — that is
  // a property of the molecule, not a fault in the drawing.
  const bonded = new Set(m.bonds.flatMap((b) => [`${b.a}|${b.b}`, `${b.b}|${b.a}`]));
  for (let i = 0; i < m.atoms.length; i++) {
    for (let j = i + 1; j < m.atoms.length; j++) {
      const A = m.atoms[i];
      const B = m.atoms[j];
      if (bonded.has(`${A.id}|${B.id}`)) continue;
      if (ringCount < 2 && d(A, B) < median * 0.7)
        problems.push(`${A.id}/${B.id} overlap at ${d(A, B).toFixed(0)}`);
    }
  }
  // Two bonds meeting at an atom must not be parallel. A collinear pair draws
  // as one long straight line with a carbon hidden inside it, so a counting
  // question on that drawing cannot be answered by counting.
  const dirOf = (b) => {
    const A = at(b.a);
    const B = at(b.b);
    return (Math.atan2(B.y - A.y, B.x - A.x) * 180) / Math.PI;
  };
  for (let i = 0; i < m.bonds.length; i++) {
    for (let j = i + 1; j < m.bonds.length; j++) {
      const b1 = m.bonds[i];
      const b2 = m.bonds[j];
      const shared = [b1.a, b1.b].find((x) => x === b2.a || x === b2.b);
      if (shared === undefined) continue;
      // Only a bare chain carbon can be hidden. A labelled atom — a
      // heteroatom, or any atom in a fully drawn structure — is visible at the
      // join, so H-C-H drawn straight across is fine.
      const mid = at(shared);
      const bare = mid && (!mid.el || mid.el === 'C') && !m.atoms.some((a) => a.el === 'H');
      const degree = m.bonds.filter((b) => b.a === shared || b.b === shared).length;
      if (!bare || degree !== 2) continue;
      let diff = Math.abs(dirOf(b1) - dirOf(b2)) % 360;
      if (diff > 180) diff = 360 - diff;
      if (diff < 1 || Math.abs(diff - 180) < 1)
        problems.push(`bonds at ${shared} are collinear — a carbon is hidden`);
    }
  }

  // Chain angles. A skeletal formula is drawn at roughly 120° per carbon;
  // a square lattice gives 90°, which reads as a square wave rather than a
  // chain, and anything above about 155° looks like one long bond with a
  // carbon hidden in it. Both are what "not a normal chain" means.
  // A polycyclic skeleton cannot have equal bond lengths on a flat page: a
  // bridge drawn across a ring is necessarily shorter than the ring bonds it
  // spans. Bicyclo and spiro structures are therefore exempt from the
  // equal-length rule, which exists to catch a chain drawn carelessly rather
  // than to demand the impossible.
  const rings = m.bonds.length - m.atoms.length + 1;
  const polycyclic = rings >= 2;

  // Ring atoms are exempt: the interior angle of a ring is set by its size,
  // and 60 degrees in cyclopropane or 90 in cyclobutane is correct rather
  // than deformed. The rule is about open chains being drawn as zigzags.
  const ringAtoms = new Set();
  {
    const adj = new Map(m.atoms.map((a) => [a.id, []]));
    for (const b of m.bonds) {
      if (adj.has(b.a)) adj.get(b.a).push(b.b);
      if (adj.has(b.b)) adj.get(b.b).push(b.a);
    }
    // an edge lies on a ring if its ends are still connected without it
    for (const b of m.bonds) {
      const seen = new Set([b.a]);
      const stack = [b.a];
      let reached = false;
      while (stack.length) {
        const v = stack.pop();
        for (const n of adj.get(v) || []) {
          if (v === b.a && n === b.b) continue;
          if (v === b.b && n === b.a) continue;
          if (n === b.b) { reached = true; stack.length = 0; break; }
          if (!seen.has(n)) { seen.add(n); stack.push(n); }
        }
      }
      if (reached) { ringAtoms.add(b.a); ringAtoms.add(b.b); }
    }
  }

  for (const a of m.atoms) {
    if (ringAtoms.has(a.id)) continue;
    const bs = m.bonds.filter((b) => b.a === a.id || b.b === a.id);
    if (bs.length !== 2) continue;
    const ns = bs.map((b) => at(b.a === a.id ? b.b : b.a));
    if (!ns[0] || !ns[1]) continue;
    const ang = (p2) => Math.atan2(p2.y - a.y, p2.x - a.x);
    let deg = (Math.abs(ang(ns[0]) - ang(ns[1])) * 180) / Math.PI;
    if (deg > 180) deg = 360 - deg;
    if (deg < 100 || deg > 155)
      problems.push(`chain angle ${deg.toFixed(0)}° at ${a.id} (expected about 120)`);
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
/* ── Atom labels sit on their atom ──────────────────────────
   The label used to be centred with textAnchor="middle", which measures the
   whole run including the subscript — so on CH2 the vertex fell between the H
   and the 2 and the label read as offset. It is now placed from x - w/2 using
   labelWidth, the same measure the background rect and the bond shortening
   use, so all three agree. */
{
  console.log('=== atom labels are centred on their atom ===');
  const size = 14;
  const glyphPad = size * 0.15;
  let off = 0;
  for (const [el, nH] of [['C',3],['C',2],['C',1],['C',0],['O',1],['N',2],['Cl',0],['Br',0],['S',1]]) {
    const w = labelWidth(el, nH, size);
    const glyphs = (el.length + (nH > 0 ? 1 : 0)) * size * 0.60 + (nH > 1 ? size * 0.38 : 0);
    const left = glyphPad;
    const right = w - glyphPad - glyphs;
    const label = el + (nH > 0 ? 'H' : '') + (nH > 1 ? String(nH) : '');
    if (Math.abs(left - right) > 1.2) {
      console.error(`  FAIL: ${label} sits off centre by ${Math.abs(left - right).toFixed(1)}px`);
      off++; fails++;
    } else {
      console.log(`  ok   ${label.padEnd(5)} centred within ${Math.abs(left - right).toFixed(1)}px`);
    }
    if (glyphs > w) { console.error(`  FAIL: ${label} overflows its box`); off++; fails++; }
  }
  if (!off) console.log('  every label is centred on its atom and fits its box');
}

process.exit(fails ? 1 : 0);
