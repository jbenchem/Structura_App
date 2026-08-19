// The two builders where the learner moves a group and reads the name.
//
// The parent chain must NOT move: the whole point is watching one thing change
// against a fixed background. And the group keeps its physical position while
// the NAME may count from the other end — that disagreement is the lesson.
import { nameGraph } from '../src/engine/index.js';
import { BOND } from '../src/sandbox/constants.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };

// mirrors the component's construction
const fixedChain = (n) => {
  const atoms = [], bonds = [];
  for (let i = 0; i < n; i++) {
    atoms.push({ id: i + 1, x: i * BOND * 0.87, y: (i % 2) * BOND * 0.5 });
    if (i) bonds.push({ a: i, b: i + 1, order: 1, stereo: null });
  }
  return { atoms, bonds };
};
const hangFrom = (g, at) => {
  const a = g.atoms[at - 1];
  const taken = g.bonds.filter(b => b.a === a.id || b.b === a.id)
    .map(b => g.atoms.find(x => x.id === (b.a === a.id ? b.b : b.a)))
    .filter(Boolean).map(nb => Math.atan2(nb.y - a.y, nb.x - a.x));
  let best = Math.PI / 2, bestGap = -1;
  for (let d = 0; d < 360; d += 5) {
    const r = d * Math.PI / 180;
    const gap = Math.min(...taken.map(t => { let x = Math.abs(r - t) % (2 * Math.PI); return x > Math.PI ? 2 * Math.PI - x : x; }));
    if (gap > bestGap) { bestGap = gap; best = r; }
  }
  return { x: a.x + BOND * Math.cos(best), y: a.y + BOND * Math.sin(best), gap: bestGap * 180 / Math.PI };
};
const alcoholAt = (n, pos) => {
  const g = fixedChain(n);
  const p = hangFrom(g, pos);
  g.atoms.push({ id: n + 1, el: 'O', x: p.x, y: p.y });
  g.bonds.push({ a: pos, b: n + 1, order: 1, stereo: null });
  return g;
};
const locantIn = (nm) => { const m = (nm || '').match(/-(\d+)-ol/); return m ? Number(m[1]) : null; };

console.log('=== the chain does not move as the group slides ===');
{
  const n = 6;
  const ref = fixedChain(n).atoms.map(a => `${a.x.toFixed(1)},${a.y.toFixed(1)}`).join('|');
  for (let pos = 1; pos <= n; pos++) {
    const chainPart = alcoholAt(n, pos).atoms.slice(0, n).map(a => `${a.x.toFixed(1)},${a.y.toFixed(1)}`).join('|');
    ck(chainPart === ref, `OH on carbon ${pos}: the ${n} chain carbons are unchanged`);
  }
}

console.log('=== the group moves left to right, whatever the name says ===');
{
  const n = 6;
  let lastX = -Infinity;
  for (let pos = 1; pos <= n; pos++) {
    const g = alcoholAt(n, pos);
    const o = g.atoms.find(a => a.el === 'O');
    ck(o.x > lastX, `carbon ${pos}: the -OH is further right (x=${o.x.toFixed(0)})`);
    lastX = o.x;
  }
}

console.log('=== the name counts from the nearer end ===');
{
  const n = 6;
  const seen = [];
  for (let pos = 1; pos <= n; pos++) {
    const r = nameGraph(alcoholAt(n, pos));
    const loc = locantIn(r.name);
    seen.push(`${pos}→${r.ok ? r.name : r.err}`);
    if (loc != null) ck(loc <= Math.ceil(n / 2), `carbon ${pos} names as ${loc}, never more than half the chain`);
  }
  console.log(`     ${seen.join('   ')}`);
  // the case the tooltip exists for
  const fifth = nameGraph(alcoholAt(6, 5));
  ck(locantIn(fifth.name) === 2, `the 5th carbon of six is named ${fifth.name} — the tooltip case`);
}

console.log('=== geometry stays clean at every position ===');
for (const n of [4, 6, 8]) {
  for (let pos = 1; pos <= n; pos++) {
    const g = alcoholAt(n, pos);
    const at = (id) => g.atoms.find(a => a.id === id);
    const lens = g.bonds.map(b => Math.hypot(at(b.a).x - at(b.b).x, at(b.a).y - at(b.b).y));
    const even = lens.every(L => Math.abs(L - lens[0]) < 1);
    let overlap = false;
    const bonded = new Set(g.bonds.flatMap(b => [`${b.a}|${b.b}`, `${b.b}|${b.a}`]));
    for (let i = 0; i < g.atoms.length; i++) for (let j = i + 1; j < g.atoms.length; j++) {
      const A = g.atoms[i], B = g.atoms[j];
      if (bonded.has(`${A.id}|${B.id}`)) continue;
      if (Math.hypot(A.x - B.x, A.y - B.y) < BOND * 0.7) overlap = true;
    }
    if (!even || overlap) ck(false, `C${n} pos ${pos}: ${!even ? 'uneven bonds' : 'atoms overlap'}`);
  }
}
ck(true, 'every chain length and position draws cleanly');

console.log('=== the branch can take over as the parent ===');
{
  const branched = (n, at, size) => {
    const g = fixedChain(n);
    let id = n, anchor = at;
    for (let k = 0; k < size; k++) {
      const p = hangFrom(g, k === 0 ? at : anchor);
      id += 1;
      g.atoms.push({ id, x: p.x, y: p.y + (k ? BOND * 0.8 * k : 0) });
      g.bonds.push({ a: k === 0 ? at : id - 1, b: id, order: 1, stereo: null });
      anchor = id;
    }
    return g;
  };
  const small = nameGraph(branched(6, 3, 1));
  ck(small.ok && small.name.endsWith('hexane'), `a methyl on six carbons stays hexane (${small.name})`);
  const big = nameGraph(branched(4, 2, 2));
  ck(big.ok && !big.name.endsWith('butane'), `a 2-carbon branch on four takes over: ${big.name}`);
}

// Model coordinates staying put is not enough: StaticMol re-derives its scale
// and centre from the molecule's bounding box, so a substituent moving from
// above the chain to below it re-frames everything and the chain jumps on
// SCREEN while sitting still in the model. The frame must be locked.
console.log('=== the chain holds still on screen, not just in the model ===');
{
  const BONDL = BOND;
  const lockedFrame = (maxCarbons, depth = 1) => {
    const span = (maxCarbons - 1) * BONDL * 0.87;
    return {
      minX: -BONDL * 0.5,
      maxX: span + BONDL * 0.5,
      minY: -BONDL * depth - BONDL * 0.2,
      maxY: BONDL * 0.5 + BONDL * depth + BONDL * 0.2,
    };
  };
  // reproduces StaticMol's projection
  const project = (mol, width, frame) => {
    const h = Math.min(width * 0.72, 250);
    const xs = mol.atoms.map((a) => a.x);
    const ys = mol.atoms.map((a) => a.y);
    const minX = frame ? frame.minX : Math.min(...xs);
    const maxX = frame ? frame.maxX : Math.max(...xs);
    const minY = frame ? frame.minY : Math.min(...ys);
    const maxY = frame ? frame.maxY : Math.max(...ys);
    const w = Math.max(maxX - minX, 1);
    const hh = Math.max(maxY - minY, 1);
    const pad = 28;
    const k = Math.min((width - pad * 2) / w, (h - pad * 2) / hh, 2.4);
    const ox = (width - w * k) / 2 - minX * k;
    const oy = (h - hh * k) / 2 - minY * k;
    return mol.atoms.map((a) => `${(a.x * k + ox).toFixed(1)},${(a.y * k + oy).toFixed(1)}`);
  };

  const MAX = 8;
  const frame = lockedFrame(MAX, 1);

  // moving the group: the chain's screen positions must be identical
  {
    const n = 6;
    const ref = project(alcoholAt(n, 1), 300, frame).slice(0, n).join('|');
    for (let pos = 2; pos <= n; pos++) {
      const got = project(alcoholAt(n, pos), 300, frame).slice(0, n).join('|');
      ck(got === ref, `OH on carbon ${pos}: the chain is drawn in exactly the same place`);
    }
    // and without a frame it would NOT be — this is what the lock is for
    const unlockedA = project(alcoholAt(n, 1), 300, null).slice(0, n).join('|');
    const unlockedB = project(alcoholAt(n, 3), 300, null).slice(0, n).join('|');
    ck(unlockedA !== unlockedB, 'without the lock the chain really does move (so the lock is doing work)');
  }

  // growing the chain: the carbons already there must not shift
  {
    const before = project(alcoholAt(4, 1), 300, frame).slice(0, 4).join('|');
    const after = project(alcoholAt(5, 1), 300, frame).slice(0, 4).join('|');
    ck(before === after, 'adding a carbon leaves the existing ones exactly where they were');
    const scaleSame = project(alcoholAt(3, 1), 300, frame)[0] === project(alcoholAt(8, 1), 300, frame)[0];
    ck(scaleSame, 'a 3-carbon and an 8-carbon chain start at the same point and scale');
  }
}

console.log(fails ? `\n${fails} FAILURES` : '\nthe builders behave');
process.exit(fails ? 1 : 0);
