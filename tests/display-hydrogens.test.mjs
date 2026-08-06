// Hydrogens shown on a double bond are a DISPLAY device. Two things must hold:
// the drawing has to read correctly as cis or trans, and the expanded graph
// must never be treated as the molecule — the engine refuses to name it.
import { withDisplayHydrogens, doubleBondCarbons } from '../src/chem/displayHydrogens.js';
import { parseName, nameGraph } from '../src/engine/index.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };
const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

console.log('=== what gets expanded ===');
{
  const butene = parseName('cis-but-2-ene').mol;
  const carbons = doubleBondCarbons(butene);
  ck(carbons.length === 2, `both alkene carbons found, got ${carbons.length}`);
  ck(carbons.every((c) => c.nH === 1), 'each carries one hidden hydrogen');

  const propene = parseName('prop-1-ene').mol;
  const pc = doubleBondCarbons(propene);
  const counts = pc.map((c) => c.nH).sort();
  ck(counts.join(',') === '1,2', `terminal alkene: one CH and one CH2, got ${counts.join(',')}`);

  const butane = parseName('butane').mol;
  ck(doubleBondCarbons(butane).length === 0, 'a saturated chain expands nothing');
  ck(withDisplayHydrogens(butane) === butane, 'and is returned untouched');
}

console.log('=== the drawing still reads cis or trans ===');
for (const [name, expected] of [['cis-but-2-ene', 'same'], ['trans-but-2-ene', 'opposite']]) {
  const mol = parseName(name).mol;
  const shown = withDisplayHydrogens(mol);
  const at = (id) => shown.atoms.find((a) => a.id === id);
  const dbl = shown.bonds.find((b) => b.order === 2);
  const c1 = at(dbl.a);
  const c2 = at(dbl.b);
  // which side of the double-bond axis does each hydrogen fall?
  const side = (p) => Math.sign((c2.x - c1.x) * (p.y - c1.y) - (c2.y - c1.y) * (p.x - c1.x));
  const hs = shown.bonds
    .filter((b) => (b.a === dbl.a || b.a === dbl.b) && (at(b.b) || {}).el === 'H')
    .map((b) => at(b.b));
  ck(hs.length === 2, `${name}: two hydrogens drawn`);
  const sameSide = side(hs[0]) === side(hs[1]);
  // cis has the two methyls together, so the two hydrogens are together too
  ck(sameSide === (expected === 'same'), `${name}: hydrogens fall on the ${sameSide ? 'same' : 'opposite'} side, expected ${expected}`);
}

console.log('=== geometry stays clean ===');
{
  const shown = withDisplayHydrogens(parseName('cis-but-2-ene').mol);
  const at = (id) => shown.atoms.find((a) => a.id === id);
  const lens = shown.bonds.map((b) => d(at(b.a), at(b.b))).sort((x, y) => x - y);
  const med = lens[Math.floor(lens.length / 2)];
  ck(lens.every((L) => Math.abs(L - med) < med * 0.15), 'every bond is the same length');
  const bonded = new Set(shown.bonds.flatMap((b) => [`${b.a}|${b.b}`, `${b.b}|${b.a}`]));
  let overlap = 0;
  for (let i = 0; i < shown.atoms.length; i++)
    for (let j = i + 1; j < shown.atoms.length; j++) {
      const A = shown.atoms[i];
      const B = shown.atoms[j];
      if (bonded.has(`${A.id}|${B.id}`)) continue;
      if (d(A, B) < med * 0.7) overlap++;
    }
  ck(overlap === 0, `no atoms overlap (${overlap} found)`);
}

console.log('=== expanded graphs must never be named ===');
{
  const real = parseName('cis-but-2-ene').mol;
  const shown = withDisplayHydrogens(real);
  ck(shown !== real, 'expansion returns a copy, leaving the real molecule alone');
  ck(shown.__display === true, 'and marks itself as display-only');
  ck(nameGraph(real).ok, 'the real molecule still names');
  // this is the trap the marker exists for
  ck(!nameGraph(shown).ok, 'the expanded one does NOT name — so it must never reach the checker');
  ck(real.atoms.length === parseName('cis-but-2-ene').mol.atoms.length, 'the original was not mutated');
}

console.log(fails ? `\n${fails} FAILURES` : '\ndisplay hydrogens read correctly and stay out of the engine');
process.exit(fails ? 1 : 0);
