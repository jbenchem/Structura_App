// Wrong options have to be plentiful, varied and plausible.
//
// Two fixed decoys made elimination easy and made repeat runs identical. Every
// decoy is also a real piece of nomenclature — a root, an ending, a locant or
// a multiplier — because nonsense fragments are dismissed on sight and teach
// nothing.
import { buildName, buildNameFrom, straightChain, branchedChain, mcName, mcNameFrom, mcStructure } from '../src/content/questionFactory.js';
import * as POOLS from '../src/content/pools.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };

console.log('=== build the name has several wrong parts ===');
{
  for (const n of [4, 7, 10]) {
    const q = buildName(straightChain(n), { seed: n });
    const wrong = q.options.filter((o) => !q.parts.includes(o));
    ck(wrong.length >= 3, `${n} carbons: ${wrong.length} wrong parts offered`);
    ck(q.parts.every((p) => q.options.includes(p)), 'every needed part is available');
    ck(new Set(q.options).size === q.options.length, 'no option appears twice');
  }
  const branched = buildNameFrom(branchedChain(5, [{ at: 2, size: 1 }]), { seed: 4 });
  const wrong = branched.options.filter((o) => !branched.parts.includes(o));
  ck(wrong.length >= 3, `branched name: ${wrong.length} wrong parts`);
}

console.log('=== the decoys change between questions ===');
{
  const sets = [1, 2, 3, 4].map((seed) =>
    buildName(straightChain(6), { seed })
      .options.filter((o) => !['hex', 'ane'].includes(o))
      .sort()
      .join(',')
  );
  ck(new Set(sets).size > 1, `different seeds give different decoys (${new Set(sets).size} of 4 distinct)`);
}

console.log('=== decoys are real nomenclature ===');
{
  const REAL = /^(meth|eth|prop|but|pent|hex|hept|oct|non|dec|ane|ene|yne|ol|anol|methyl|ethyl|propyl|di|tri|\d-)$/;
  let checked = 0;
  for (const n of [3, 5, 8]) {
    for (const o of buildName(straightChain(n), { seed: n }).options) {
      checked++;
      ck(REAL.test(o), `"${o}" is a real name part`);
    }
  }
  console.log(`  ${checked} parts checked`);
}

console.log('=== multiple choice offers a full set ===');
{
  const q = mcName(straightChain(5), { seed: 2 });
  ck(q.options.length >= 4, `naming offers ${q.options.length} options`);
  ck(new Set(q.options).size === q.options.length, 'and they are distinct');
  const s = mcStructure(5, { seed: 2 });
  ck(s.options.length >= 4, `choosing offers ${s.options.length} structures`);
}

console.log('=== across the content ===');
{
  let thin = 0;
  let total = 0;
  for (const [key, pool] of Object.entries(POOLS).filter(([k]) => k.startsWith('POOL_')))
    for (const q of pool) {
      if (q.type !== 'buildName') continue;
      total++;
      const wrong = q.options.filter((o) => !q.parts.includes(o));
      if (wrong.length < 3) { console.error(`  FAIL ${key}/${q.id}: only ${wrong.length} decoys`); thin++; }
    }
  ck(thin === 0, `all ${total} build-the-name questions offer at least three decoys`);
}

console.log(fails ? `\n${fails} FAILURES` : '\ndistractors are plentiful, varied and plausible');
process.exit(fails ? 1 : 0);
