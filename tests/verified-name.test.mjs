// A name is only trustworthy if it describes the molecule it came from.
//
// The engine is normally its own authority — the namer doubles as canonical
// form. But it is not infallible: given a chain joining two rings it traces a
// path straight THROUGH the second ring and reports it as an open chain. The
// result is a real name for a different compound, and a learner has no way to
// tell. Refusing is better than lying.
//
// This does not patch the engine, which stays byte-identical. It decides
// whether to trust an answer.
import { verifiedName, nameOf, ringCount } from '../src/chem/engineBridge.js';
import { parseName, nameGraph } from '../src/engine/index.js';
import * as POOLS from '../src/content/pools.js';
import { STAGES } from '../src/content/curriculum.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };

function twoRings(chainLen, methylAt) {
  const atoms = [], bonds = [];
  let id = 0;
  const add = (x, y) => { atoms.push({ id: ++id, x, y }); return id; };
  const ring = (cx, cy) => {
    const ids = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      ids.push(add(cx + 60 * Math.cos(a), cy + 60 * Math.sin(a)));
    }
    for (let i = 0; i < 6; i++) bonds.push({ a: ids[i], b: ids[(i + 1) % 6], order: 1, stereo: null });
    return ids;
  };
  const r1 = ring(0, 0);
  const chain = [];
  for (let i = 0; i < chainLen; i++) chain.push(add(80 + i * 55, 90 + (i % 2) * 32));
  const r2 = ring(80 + chainLen * 55 + 60, 90);
  bonds.push({ a: r1[3], b: chain[0], order: 1, stereo: null });
  for (let i = 1; i < chainLen; i++) bonds.push({ a: chain[i - 1], b: chain[i], order: 1, stereo: null });
  bonds.push({ a: chain[chainLen - 1], b: r2[0], order: 1, stereo: null });
  if (methylAt != null) {
    const m = add(80 + methylAt * 55, 160);
    bonds.push({ a: chain[methylAt], b: m, order: 1, stereo: null });
  }
  return { atoms, bonds };
}

console.log('=== the bug the guard was written for is now fixed upstream ===');
{
  // Kept as a live check that the engine fix holds. The guard exists for
  // names the engine gets wrong; this one it now gets right.
  const mol = twoRings(4, 1);
  ck(ringCount(mol) === 2, `the structure has ${ringCount(mol)} rings`);
  const raw = nameOf(mol);
  ck(raw.ok && /cyclohexyl/.test(raw.name), `both rings are named: ${raw.name}`);
  const v = verifiedName(mol);
  ck(v.ok, `and the guard accepts it: ${v.ok ? v.name : v.reason}`);
}

console.log('=== the guard would still catch a lost ring ===');
{
  const { ringsNamedIn } = await import('../src/chem/engineBridge.js');
  ck(ringsNamedIn('(2-methyldecyl)cyclohexane') === 1, 'the old wrong name accounts for 1 ring');
  ck(ringsNamedIn('(4-cyclohexyl-2-methylbutyl)cyclohexane') === 2, 'the corrected name accounts for 2');
  ck(2 > ringsNamedIn('(2-methyldecyl)cyclohexane'), 'so a two-ring structure named that way is still refused');
}

console.log('=== ring-joined-by-a-chain shapes name correctly now ===');
for (const [len, me] of [[2, 0], [3, null], [4, null], [4, 1], [5, 2], [6, null]]) {
  const mol = twoRings(len, me);
  const v = verifiedName(mol);
  ck(v.ok, `chain ${len}${me != null ? ' +methyl' : ''}: ${v.ok ? v.name : 'REFUSED — ' + v.reason}`);
}

console.log('=== everything ordinary is still named ===');
for (const n of [
  'methane', 'hexane', 'decane', '2-methylbutane', '3-ethylpentane',
  'but-2-ene', 'but-1-yne', '2-chlorobutane', '1,2-dichloroethane',
  'propan-2-ol', 'ethane-1,2-diol', 'but-3-en-1-ol', '4-chlorobutan-1-ol',
  'cyclohexane', 'methylcyclohexane', 'benzene',
]) {
  const p = parseName(n);
  if (!p.ok) { ck(false, `${n} should parse`); continue; }
  const v = verifiedName(p.mol);
  ck(v.ok, `${n} → ${v.ok ? v.name : v.reason}`);
}

console.log('=== a correct name the parser cannot read is still kept ===');
{
  // one ring with a long chain: the namer is right, the parser cannot read it
  // back, and refusing it would break legitimate ring drawing in the sandbox.
  const ringChain = (n) => {
    const atoms = [], bonds = [];
    let id = 0;
    const add = (x, y) => { atoms.push({ id: ++id, x, y }); return id; };
    const ids = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      ids.push(add(60 * Math.cos(a), 60 * Math.sin(a)));
    }
    for (let i = 0; i < 6; i++) bonds.push({ a: ids[i], b: ids[(i + 1) % 6], order: 1, stereo: null });
    let prev = ids[0];
    for (let i = 0; i < n; i++) {
      const c = add(80 + i * 55, -60 - (i % 2) * 32);
      bonds.push({ a: prev, b: c, order: 1, stereo: null });
      prev = c;
    }
    return { atoms, bonds };
  };
  for (const n of [1, 4, 7, 9, 10]) {
    const mol = ringChain(n);
    const v = verifiedName(mol);
    ck(v.ok, `one ring + ${n}-carbon chain kept: ${v.ok ? v.name : v.reason}`);
    ck(ringCount(mol) === 1, `  and it really is one ring`);
  }
}

console.log('=== no false refusals across the whole app ===');
{
  let checked = 0;
  let refused = 0;
  const scan = (label, mol) => {
    if (!mol || !mol.atoms || mol.atoms.length < 2) return;
    if (mol.atoms.some((a) => a.el === 'H')) return;   // explicit-H diagrams are not named
    checked++;
    const v = verifiedName(mol);
    if (!v.ok && v.err === 'unverified') { console.error(`  FAIL ${label}: ${v.reason}`); refused++; fails++; }
  };
  for (const [k, pool] of Object.entries(POOLS).filter(([k2]) => k2.startsWith('POOL_')))
    for (const q of pool) (q.type === 'mcStructure' ? q.options : q.mol ? [q.mol] : []).forEach((m) => scan(`${k}/${q.id}`, m));
  for (const st of STAGES) for (const u of st.units) for (const l of u.lessons || []) for (const s of l.steps || [])
    for (const m of [s.mol, s.target].filter(Boolean)) scan(l.id, m);
  ck(refused === 0, `${checked} content molecules all verify`);
}

console.log('=== the engine is untouched ===');
{
  // the guard must not have changed what the engine says, only whether we use it
  const p = parseName('2-methylbutane');
  ck(nameGraph(p.mol).name === '2-methylbutane', 'the engine still names normally');
}

console.log(fails ? `\n${fails} FAILURES` : '\nwrong names are refused, right names are kept');
process.exit(fails ? 1 : 0);
