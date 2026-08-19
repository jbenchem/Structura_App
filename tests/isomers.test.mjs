// Isomer enumeration.
//
// The exercise this supports — "draw all five isomers of C6H14" — is one a
// student cannot mark for themselves. The engine can: two skeletons are the
// same compound exactly when they name the same.
//
// Checked against the published counts (OEIS A000602). Building this found a
// real engine fault: a tie between equally long chains was not broken by
// substituent count, so 3-ethyl-2-methylpentane and 3-propan-2-ylpentane were
// two names for one molecule and C8 enumerated as 19.
import { enumerateAlkanes, isomerNames, identifyIsomer, ALKANE_ISOMER_COUNTS } from '../src/chem/isomers.js';
import { nameGraph, parseName } from '../src/engine/index.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };

console.log('=== counts match the published sequence ===');
for (const [n, known] of Object.entries(ALKANE_ISOMER_COUNTS)) {
  const got = enumerateAlkanes(Number(n));
  ck(got.size === known, `C${n}H${2 * Number(n) + 2}: ${got.size} isomers (known ${known})`);
}

console.log('=== the specific compounds are right ===');
{
  const c5 = [...enumerateAlkanes(5).keys()].sort();
  ck(c5.join(' | ') === '2,2-dimethylpropane | 2-methylbutane | pentane', `C5: ${c5.join(', ')}`);
  const c6 = new Set(enumerateAlkanes(6).keys());
  for (const n of ['hexane', '2-methylpentane', '3-methylpentane', '2,2-dimethylbutane', '2,3-dimethylbutane'])
    ck(c6.has(n), `C6 includes ${n}`);
}

console.log('=== the engine is the deduplicator, and it holds ===');
{
  // every enumerated molecule must name back to the key it is stored under
  for (const n of [5, 6, 7]) {
    let bad = 0;
    for (const [name, mol] of enumerateAlkanes(n)) {
      if (nameGraph(mol).name !== name) bad++;
    }
    ck(bad === 0, `C${n}: every molecule names back to its own key`);
  }
  // and the fault that this found stays fixed
  const a = parseName('3-ethyl-2-methylpentane');
  const b = parseName('3-propan-2-ylpentane');
  ck(a.ok && b.ok && nameGraph(a.mol).name === nameGraph(b.mol).name,
     'the same molecule presented two ways gets one name');
}

console.log('=== identifying a learner\'s drawing ===');
{
  const target = 6;
  const hexane = parseName('hexane').mol;
  const methylpentane = parseName('2-methylpentane').mol;

  const first = identifyIsomer(hexane, target, []);
  ck(first.ok && first.name === 'hexane' && !first.already, 'a new isomer is accepted');

  const repeat = identifyIsomer(hexane, target, ['hexane']);
  ck(repeat.ok && repeat.already, 'the same one again is flagged as a duplicate');

  const other = identifyIsomer(methylpentane, target, ['hexane']);
  ck(other.ok && !other.already, 'a different one is accepted');

  // wrong things are rejected with a REASON, not just refused
  const short = identifyIsomer(parseName('pentane').mol, target, []);
  ck(!short.ok && short.reason === 'wrong-size' && short.carbons === 5,
     `a five-carbon chain is rejected as the wrong size (${short.carbons} carbons)`);

  const unsat = identifyIsomer(parseName('hex-1-ene').mol, target, []);
  ck(!unsat.ok && unsat.reason === 'not-saturated', 'an alkene is rejected as unsaturated');

  const alcohol = identifyIsomer(parseName('hexan-1-ol').mol, target, []);
  ck(!alcohol.ok, 'an alcohol is rejected — it is not an isomer of an alkane');
}

console.log('=== ordering is useful to a learner ===');
{
  const order = isomerNames(6);
  ck(order[0] === 'hexane', `the straight chain comes first (${order[0]})`);
  ck(order[order.length - 1].includes('dimethyl'), `the most branched comes last (${order[order.length - 1]})`);
}

console.log('=== enumeration refuses what it cannot do well ===');
{
  ck(enumerateAlkanes(0).size === 0, 'zero carbons yields nothing');
  ck(enumerateAlkanes(20).size === 0, 'twenty carbons is refused rather than hanging');
  ck(enumerateAlkanes(1).size === 1, 'one carbon is methane');
}

console.log(fails ? `\n${fails} FAILURES` : '\nenumeration agrees with chemistry');
process.exit(fails ? 1 : 0);
