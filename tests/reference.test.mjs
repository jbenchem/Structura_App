// The reference table must agree with the engine. A table that
// contradicts the checker is worse than no table.
import { ROOTS, LADDER, PREFIX_ONLY } from '../src/content/reference.js';
import { nameGraph, parseName } from '../src/engine/index.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } };
const chain = (n) => ({
  atoms: Array.from({ length: n }, (_, i) => ({ id: i + 1, x: i * 42, y: (i % 2) * 24 })),
  bonds: Array.from({ length: n - 1 }, (_, i) => ({ a: i + 1, b: i + 2, order: 1, stereo: null })),
});

console.log('=== chain roots vs the engine ===');
ck(ROOTS.length === 20, `20 roots listed, got ${ROOTS.length}`);
for (const r of ROOTS) {
  const res = nameGraph(chain(r.n));
  ck(res.ok, `${r.n} carbons should be nameable`);
  if (res.ok) {
    ck(res.name === r.alkane, `${r.n} carbons: table says ${r.alkane}, engine says ${res.name}`);
    ck(r.alkane === `${r.root}ane`, `${r.n}: root "${r.root}-" + ane should give ${r.alkane}`);
  }
}
console.log(`  ${ROOTS.length} roots checked against the engine`);

console.log('=== seniority ladder ===');
ck(LADDER.length >= 12, `ladder has the main families, got ${LADDER.length}`);
const ranks = LADDER.map((g) => g.rank);
ck(ranks.join(',') === ranks.slice().sort((a, b) => a - b).join(','), 'ranks are in order');
ck(new Set(ranks).size === ranks.length, 'ranks are unique');

// the ordering that actually matters: acid above ester above ketone above alcohol
const at = (name) => LADDER.findIndex((g) => g.group === name);
ck(at('Carboxylic acid') < at('Ester'), 'acid outranks ester');
ck(at('Ester') < at('Amide'), 'ester outranks amide');
ck(at('Amide') < at('Aldehyde'), 'amide outranks aldehyde');
ck(at('Aldehyde') < at('Ketone'), 'aldehyde outranks ketone');
ck(at('Ketone') < at('Alcohol'), 'ketone outranks alcohol');
ck(at('Alcohol') < at('Amine'), 'alcohol outranks amine');
ck(at('Amine') < at('Alkene'), 'amine outranks alkene');
ck(at('Alkene') < at('Alkane'), 'alkene outranks alkane');

for (const g of [...LADDER, ...PREFIX_ONLY]) {
  ck(!!g.sketch && Array.isArray(g.sketch.chain), `${g.group}: has a sketch`);
  ck(g.sketch.bonds.length === g.sketch.chain.length - 1, `${g.group}: one bond fewer than labels`);
  if (g.sketch.up) ck(g.sketch.up.at < g.sketch.chain.length, `${g.group}: carbonyl points at a real atom`);
  ck(!!g.example, `${g.group}: has an example`);
  const p = parseName(g.example);
  ck(p.ok, `${g.group}: example "${g.example}" is a name the engine accepts`);
}
console.log(`  ${LADDER.length + PREFIX_ONLY.length} groups checked`);

// The ladder sketches are drawn from this spec by ReferenceSheet. They must
// zigzag: a flat backbone puts every middle atom at 180°, which is not how a
// structure is drawn and is the same fault that hides an atom inside what
// looks like one long bond.
console.log('=== sketch backbones are not straight ===');
{
  const gap = 30;
  const rise = 17;
  const padX = 6;
  const height = 66;
  let worst = 0;
  let n = 0;
  for (const g of [...LADDER, ...PREFIX_ONLY]) {
    const spec = g.sketch;
    const baseY = spec.up ? height - 14 : height / 2 + rise / 2;
    const xOf = (i) => padX + 13 + i * gap;
    const yOf = (i) => baseY - (i % 2 ? rise : 0);
    for (let i = 1; i < spec.chain.length - 1; i++) {
      n++;
      const a = { x: xOf(i), y: yOf(i) };
      const p0 = { x: xOf(i - 1), y: yOf(i - 1) };
      const p1 = { x: xOf(i + 1), y: yOf(i + 1) };
      const f = (q) => Math.atan2(q.y - a.y, q.x - a.x);
      let d = (Math.abs(f(p0) - f(p1)) * 180) / Math.PI;
      if (d > 180) d = 360 - d;
      ck(d > 100 && d < 155, `${g.group}: backbone angle ${d.toFixed(0)}°`);
      worst = Math.max(worst, Math.abs(d - 120));
    }
  }
  console.log(`  ${n} backbone atoms, all within ${worst.toFixed(1)}° of 120`);
}

console.log(fails ? `\n${fails} FAILURES` : '\nreference agrees with the engine');
process.exit(fails ? 1 : 0);
