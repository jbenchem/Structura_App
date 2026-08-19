// Chains must be drawn the way chemists draw them: about 120° at every chain
// carbon. The app's `tidy` snaps to a SQUARE lattice and gives 90°, which
// reads as a square wave — so layout goes through the naming engine instead,
// which produces proper geometry.
import { prettify } from '../src/chem/prettify.js';
import { tidy } from '../src/sandbox/layout.js';
import { nameGraph, parseName } from '../src/engine/index.js';
import { buildTarget, Cn, chainBonds } from '../src/chem/questions.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };

const angles = (mol) => {
  const out = [];
  for (const a of mol.atoms) {
    const bs = mol.bonds.filter((b) => b.a === a.id || b.b === a.id);
    if (bs.length !== 2) continue;
    const at = (i) => mol.atoms.find((x) => x.id === i);
    const ns = bs.map((b) => at(b.a === a.id ? b.b : b.a));
    const f = (p) => Math.atan2(p.y - a.y, p.x - a.x);
    let d = (Math.abs(f(ns[0]) - f(ns[1])) * 180) / Math.PI;
    if (d > 180) d = 360 - d;
    out.push(d);
  }
  return out;
};

console.log('=== chains come out as chains ===');
for (const n of [3, 4, 6, 8, 10]) {
  const mol = buildTarget(Cn(n), chainBonds(n));
  const a = angles(mol);
  ck(a.every((d) => Math.abs(d - 120) < 15), `${n}-carbon chain: ${a.map((d) => d.toFixed(0)).join(', ')}°`);
}

console.log('=== branched molecules too ===');
for (const [n, subs, label] of [
  [5, [[1, 4]], '2-methylbutane'],
  [6, [[2, 5]], '3-methylpentane'],
]) {
  const bonds = [...chainBonds(n - 1), ...subs.map(([a, b]) => [a, b, 1])];
  const mol = buildTarget(Cn(n), bonds);
  ck(angles(mol).every((d) => d > 100 && d < 155), `${label}: ${angles(mol).map((d) => d.toFixed(0)).join(', ')}°`);
}

console.log('=== the square lattice is what we are avoiding ===');
{
  const chain = { 
    atoms: Array.from({ length: 6 }, (_, i) => ({ id: i + 1, x: i * 56, y: (i % 2) * 32 })),
    bonds: Array.from({ length: 5 }, (_, i) => ({ a: i + 1, b: i + 2, order: 1 })),
  };
  const squared = angles(tidy(chain));
  ck(squared.some((d) => Math.abs(d - 90) < 5), `tidy really does give 90° (${squared.map((d) => d.toFixed(0)).join(', ')})`);
  const pretty = angles(prettify(chain));
  ck(pretty.every((d) => Math.abs(d - 120) < 15), `prettify gives 120° (${pretty.map((d) => d.toFixed(0)).join(', ')})`);
}

console.log('=== the molecule is never changed ===');
for (const name of ['hexane', '2-methylbutane', 'but-2-ene', '2-chlorobutane', 'propan-2-ol']) {
  const original = parseName(name).mol;
  const out = prettify(original);
  const before = nameGraph(original);
  const after = nameGraph(out);
  ck(after.ok && after.name === before.name, `${name} still names as ${after.ok ? after.name : after.err}`);
  ck(out.atoms.length === original.atoms.length, `  and keeps its ${original.atoms.length} atoms`);
}

console.log('=== anything unnameable is left alone ===');
{
  const explicitH = {
    atoms: [{ id: 1, x: 0, y: 0 }, { id: 2, x: 40, y: 0, el: 'H' }],
    bonds: [{ a: 1, b: 2, order: 1 }],
  };
  ck(prettify(explicitH) === explicitH, 'a diagram with explicit hydrogens is untouched');
  const single = { atoms: [{ id: 1, x: 0, y: 0 }], bonds: [] };
  ck(prettify(single) === single, 'a lone atom is untouched');
}

console.log(fails ? `\n${fails} FAILURES` : '\nchains are drawn as chains');
process.exit(fails ? 1 : 0);
