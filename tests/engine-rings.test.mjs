// Regression: a substituent chain must not be traced through a ring.
//
// The namer's substituent walk explored every acyclic path from the attachment
// atom, but nothing stopped it stepping INTO a ring. A four-carbon chain
// ending in a cyclohexane came back as "decyl" — the six ring carbons silently
// unrolled into the chain — so the name described a molecule with one ring
// fewer than the structure had, and a formula two hydrogens out.
//
// Fixed in engine/name.js: the walk will not enter a ring atom when it started
// outside one. A ring reached from the chain is a cyclic substituent hanging
// off it, which is what nameSubstituent already knew how to name.
import { nameGraph, parseName } from '../src/engine/index.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };
const ringCount = (m) => m.bonds.length - m.atoms.length + 1;

function ring(atoms, bonds, cx, cy, add) {
  const ids = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    ids.push(add(cx + 60 * Math.cos(a), cy + 60 * Math.sin(a)));
  }
  for (let i = 0; i < 6; i++) bonds.push({ a: ids[i], b: ids[(i + 1) % 6], order: 1, stereo: null });
  return ids;
}

function twoRings(chainLen, methylAt) {
  const atoms = [], bonds = [];
  let id = 0;
  const add = (x, y) => { atoms.push({ id: ++id, x, y }); return id; };
  const r1 = ring(atoms, bonds, 0, 0, add);
  const chain = [];
  for (let i = 0; i < chainLen; i++) chain.push(add(80 + i * 55, 90 + (i % 2) * 32));
  const r2 = ring(atoms, bonds, 80 + chainLen * 55 + 60, 90, add);
  bonds.push({ a: r1[3], b: chain[0], order: 1, stereo: null });
  for (let i = 1; i < chainLen; i++) bonds.push({ a: chain[i - 1], b: chain[i], order: 1, stereo: null });
  bonds.push({ a: chain[chainLen - 1], b: r2[0], order: 1, stereo: null });
  if (methylAt != null) {
    const m = add(80 + methylAt * 55, 160);
    bonds.push({ a: chain[methylAt], b: m, order: 1, stereo: null });
  }
  return { atoms, bonds };
}

// how many ring systems a name mentions
const ringsIn = (n) => {
  const t = n.toLowerCase();
  return (t.match(/cyclo/g) || []).length + (t.match(/benzen|phenyl/g) || []).length;
};

console.log('=== a chain ending in a ring keeps both rings ===');
for (const [len, me] of [[1, null], [2, null], [3, null], [4, null], [4, 1], [5, 2], [6, null]]) {
  const mol = twoRings(len, me);
  const r = nameGraph(mol);
  ck(r.ok, `chain ${len}${me != null ? ' +methyl' : ''}: names as ${r.ok ? r.name : r.err}`);
  if (!r.ok) continue;
  ck(ringsIn(r.name) === ringCount(mol), `  names ${ringsIn(r.name)} rings for a structure with ${ringCount(mol)}`);
  // the formula the name implies must be the structure's own
  ck(!/\bdecyl\b|\bnonyl\b|\boctyl\b/.test(r.name) || ringsIn(r.name) === 2,
     `  no ring was unrolled into a long alkyl chain`);
}

console.log('=== the exact molecule from the report ===');
{
  const mol = twoRings(4, 1);
  const r = nameGraph(mol);
  ck(r.formula === 'C17H32', `the structure is ${r.formula}`);
  ck(r.name === '(4-cyclohexyl-2-methylbutyl)cyclohexane', `named ${r.name}`);
  ck(r.name !== '(2-methyldecyl)cyclohexane', 'and NOT the old one-ring name');
}

console.log('=== ordinary ring naming is unchanged ===');
for (const [name, expect] of [
  ['cyclohexane', 'cyclohexane'],
  ['methylcyclohexane', 'methylcyclohexane'],
  ['ethylcyclohexane', 'ethylcyclohexane'],
  ['butylcyclohexane', 'butylcyclohexane'],
  ['1,4-dimethylcyclohexane', '1,4-dimethylcyclohexane'],
  ['benzene', 'benzene'],
  // the engine names systematically; 'toluene' is a retained input name
  ['toluene', 'methylbenzene'],
  ['ethylbenzene', 'ethylbenzene'],
  ['naphthalene', 'naphthalene'],
  ['bicyclo[2.2.1]heptane', 'bicyclo[2.2.1]heptane'],
  ['spiro[4.5]decane', 'spiro[4.5]decane'],
  // the engine prefers the explicit locant; unchanged by this fix
  ['cyclohexanol', 'cyclohexan-1-ol'],
  ['cyclohexanone', 'cyclohexan-1-one'],
  ['pyridine', 'pyridine'],
]) {
  const p = parseName(name);
  ck(p.ok, `${name} parses`);
  if (p.ok) ck(nameGraph(p.mol).name === expect, `  and still names as ${expect}`);
}

console.log('=== a long alkyl on ONE ring is still a long alkyl ===');
{
  // the fix must not turn a legitimate long chain into something else
  const atoms = [], bonds = [];
  let id = 0;
  const add = (x, y) => { atoms.push({ id: ++id, x, y }); return id; };
  const r1 = ring(atoms, bonds, 0, 0, add);
  let prev = r1[0];
  for (let i = 0; i < 9; i++) {
    const c = add(80 + i * 55, -60 - (i % 2) * 32);
    bonds.push({ a: prev, b: c, order: 1, stereo: null });
    prev = c;
  }
  const r = nameGraph({ atoms, bonds });
  ck(r.ok && r.name === 'nonylcyclohexane', `nine carbons on a ring is ${r.ok ? r.name : r.err}`);
  ck(ringCount({ atoms, bonds }) === 1, '  and it really is one ring');
}

console.log(fails ? `\n${fails} FAILURES` : '\nrings survive substituent naming');
process.exit(fails ? 1 : 0);
