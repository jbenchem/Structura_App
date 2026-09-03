// ─────────────────────────────────────────────────────────────
// Worked solutions and diagnosis — the engine explaining itself, tested
// against the engine rather than against fixtures, so a derivation can
// never quietly describe a different molecule than the one it names.
// ─────────────────────────────────────────────────────────────

import { workedSolution, diagnose, alternativeLocants, parentCarbons } from '../src/content/workedSolution.js';
import { parseName, nameGraph } from '../src/engine/index.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };
const molOf = (n) => parseName(n).mol;

console.log('=== a worked solution derives the name it displays ===');
{
  for (const n of ['2,3-dimethylpentane', 'propan-2-ol', '3-methylbut-1-ene', 'ethyl ethanoate', '2-methylhexane']) {
    const w = workedSolution(molOf(n));
    ck(!!w && w.name === n, `${n}: the derivation names the same compound`);
    ck(w.steps.length >= 2, `${n}: it has real steps (${w.steps.length})`);
    ck(w.steps.every((s) => s.heading && s.body), `${n}: every step has a heading and a sentence`);
    ck(/Result/.test(w.steps[w.steps.length - 1].body), `${n}: it ends by assembling the name`);
  }
  const grp = workedSolution(molOf('propan-2-ol'));
  ck(grp.steps[0].heading === 'Principal group', 'a compound with a principal group explains that first');
}

console.log('=== the numbering step shows the direction that lost ===');
{
  ck(alternativeLocants([2, 3], 5).join(',') === '3,4', 'reversing a 5-chain sends 2,3 to 3,4');
  ck(alternativeLocants([2], 6).join(',') === '5', 'and 2 to 5 on a 6-chain');
  ck(alternativeLocants([], 5) === null, 'no locants, no counterfactual');

  const w = workedSolution(molOf('2-methylhexane'));
  const num = w.steps.find((s) => s.heading === 'Numbering');
  ck(!!num.alternative && /5/.test(num.alternative), 'the losing direction is named with its locants');
  ck(/higher/.test(num.alternative), 'and says why it lost');

  // Symmetric molecules have no contest, so nothing is claimed.
  const sym = workedSolution(molOf('hexane'));
  const symNum = sym.steps.find((s) => s.heading === 'Numbering');
  ck(!symNum || !symNum.alternative, 'a molecule with nothing to choose between makes no comparison');
}

console.log('=== diagnosis names the difference, or says nothing ===');
{
  const d = (e, g) => diagnose(e, g);
  ck(d('hexane', 'hexane') === null, 'a right answer is never diagnosed');
  ck(d('hexane', 'pentane').kind === 'parent-chain', 'a shorter chain is a parent-chain error');
  ck(/6 carbons/.test(d('hexane', 'pentane').message), 'and the message states the real length');
  ck(d('butanal', 'butanol').kind === 'family', 'a different suffix is a family error');
  ck(/aldehyde/.test(d('butanal', 'butanol').message), 'and names the actual family');
  ck(d('2-methylpentane', '3-methylpentane').kind === 'locant', 'same pieces, wrong position is a locant error');
  ck(d('2-methylpentane', '2-ethylpentane').kind === 'substituent', 'a different branch is a substituent error');
  ck(/ethyl/.test(d('2-methylpentane', '2-ethylpentane').message), 'and says what they wrote');

  // The advice must match the rule that actually applies.
  ck(/lowest locant it can/.test(d('propan-2-ol', 'propan-1-ol').message), 'a principal group is told the principal-group rule');
  ck(/first point of difference/.test(d('2-methylpentane', '3-methylpentane').message), 'a plain alkane is told the lowest-locant rule');

  // Refusal: nonsense earns no explanation rather than a guessed one.
  ck(d('hexane', 'zzzz') === null, 'gibberish is not diagnosed');
  ck(d('hexane', '') === null, 'an empty answer is not diagnosed');
  ck(d('', 'hexane') === null, 'and neither is a missing expectation');

  // The parent root is the LAST root: substituent names carry roots too.
  ck(parentCarbons('2-methylhexane') === 6, 'methyl does not make 2-methylhexane a one-carbon chain');
  ck(parentCarbons('3-ethyl-2-methylpentane') === 5, 'nor does ethyl on a pentane');
}

console.log('=== every diagnosis is true of the compounds it compares ===');
{
  // Cross-check against the engine: if diagnose says the chain length
  // differs, the engine's own molecules must differ that way.
  const pairs = [['hexane', 'pentane'], ['2-methylpentane', '3-methylpentane'], ['butanal', 'butan-1-ol']];
  for (const [e, g] of pairs) {
    const d = diagnose(e, g);
    if (!d || !d.message) continue;
    const em = parseName(e), gm = parseName(g);
    ck(em.ok && gm.ok, `${e} vs ${g}: both parse, so the comparison is real chemistry`);
    ck(nameGraph(em.mol).name !== nameGraph(gm.mol).name, `${e} vs ${g}: they really are different compounds`);
  }
}

console.log(fails ? `\n${fails} FAILED\n` : '\nthe engine explains itself, and refuses when it cannot\n');
process.exit(fails ? 1 : 0);
