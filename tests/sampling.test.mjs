// A short run must be representative. Sampling flat from a pool that leans one
// way gives runs that test one idea five times and the other not at all — which
// reads to the learner as being examined on something the lesson barely covered.
import { sample } from '../src/content/questionFactory.js';
import { STAGES } from '../src/content/curriculum.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };

const authored = STAGES.flatMap((s) => s.units).filter((u) => u.lessons);

console.log('=== short runs cover the lesson ===');
for (const u of authored) {
  for (const l of u.lessons) {
    if (!l.pool || !l.ask) continue;
    const kinds = new Set(l.pool.map((q) => q.chip || q.type));
    // how many kinds should a run of this size be able to show?
    const expect = Math.min(kinds.size, l.ask);
    let worst = Infinity;
    for (let trial = 0; trial < 200; trial++) {
      const run = sample(l.pool, l.ask);
      if (run.length !== l.ask) { ck(false, `${l.id}: run should be ${l.ask}, got ${run.length}`); break; }
      if (new Set(run.map((q) => q.id)).size !== run.length) { ck(false, `${l.id}: run repeats a question`); break; }
      worst = Math.min(worst, new Set(run.map((q) => q.chip || q.type)).size);
    }
    ck(worst >= expect, `${l.id}: every run of ${l.ask} shows ${expect} kind(s) — worst was ${worst} of ${kinds.size}`);
  }
}

console.log('=== the case that prompted this ===');
{
  // A lesson that genuinely covers more than one kind of question must show
  // more than one in a short run. (A lesson deliberately built around a single
  // idea — lesson 1 is all valence — is not a counter-example: the general
  // check above already requires min(kinds, ask) kinds, which is 1 there.)
  const mixed = authored
    .flatMap((u) => u.lessons)
    .find((l) => l.pool && l.ask && new Set(l.pool.map((q) => q.chip)).size >= 2);
  ck(!!mixed, 'found a lesson covering several kinds of question');

  let allOneKind = 0;
  const seen = new Map();
  const runs = 500;
  for (let i = 0; i < runs; i++) {
    const run = sample(mixed.pool, mixed.ask);
    if (new Set(run.map((q) => q.chip)).size === 1) allOneKind++;
    for (const q of run) seen.set(q.chip, (seen.get(q.chip) || 0) + 1);
  }
  ck(allOneKind === 0, `${mixed.id}: no run of ${mixed.ask} is all one kind (was ${allOneKind} of ${runs})`);

  // and no kind is squeezed out of the rotation
  const total = [...seen.values()].reduce((a, b) => a + b, 0);
  const smallest = Math.min(...seen.values()) / total;
  ck(smallest > 0.05, `${mixed.id}: every kind appears regularly (rarest is ${(smallest * 100).toFixed(0)}%)`);
}

console.log(fails ? `\n${fails} FAILURES` : '\nshort runs stay representative');
process.exit(fails ? 1 : 0);
