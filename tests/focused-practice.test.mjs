// A recommendation must lead somewhere. "Work on numbering the chain" is
// advice; a set of questions that are all numbering questions is the thing
// itself — and the gap between the two is the difference between a readout
// and a feature.
import * as POOLS from '../src/content/pools.js';
import { questionsMatching, normaliseFamily, subcategoryMeta, CATEGORY_META } from '../src/content/questionFactory.js';
import { recommendNext } from '../src/state/store.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };
const DAY = 86400000, now = Date.now();
const at = (sub, cat, ok, d) => ({ ts: now - d * DAY, subcategory: sub, category: cat, correct: ok, ms: 9000, errorClass: ok ? null : 'locant' });

console.log('=== a focused set really is focused ===');
for (const key of ['draw-molecule:alkene', 'write-name:alkane', 'name-structure:alcohol', 'draw-molecule:alkane']) {
  const qs = questionsMatching(POOLS, key, { count: 10 });
  const [cat, fam] = key.split(':');
  ck(qs.length > 0, `${key}: ${qs.length} questions found`);
  ck(qs.every((q) => q.category === cat), `  every one is a ${CATEGORY_META[cat].label.toLowerCase()} question`);
  ck(qs.every((q) => normaliseFamily(q.category, q.family) === fam), `  and every one is a ${fam}`);
}

console.log('=== rule-based skills draw from any family, deliberately ===');
{
  const qs = questionsMatching(POOLS, 'bonds:general', { count: 10 });
  const fams = new Set(qs.map((q) => q.family));
  ck(qs.length > 0 && fams.size > 1,
     `bond-count questions span ${fams.size} families — the skill is about the rule, not the molecule`);
}

console.log('=== every recommendable skill has questions to offer ===');
{
  const seen = new Set();
  for (const pool of Object.values(POOLS)) {
    if (!Array.isArray(pool)) continue;
    for (const q of pool) if (q.category) seen.add(`${q.category}:${normaliseFamily(q.category, q.family)}`);
  }
  let empty = 0;
  for (const key of seen) {
    const n = questionsMatching(POOLS, key, { count: 6 }).length;
    if (n === 0) { console.error(`  FAIL: ${key} can be recommended but has no questions`); empty++; fails++; }
  }
  ck(empty === 0, `all ${seen.size} recommendable skills have practice available`);
}

console.log('=== the recommendation resolves to a real set ===');
{
  const rows = [
    ...Array(15).fill(0).map((_, i) => at('numbering:general', 'numbering', i < 7, 30)),
    ...Array(15).fill(0).map((_, i) => at('numbering:general', 'numbering', i < 7, 2)),
    ...Array(12).fill(0).map(() => at('write-name:alkane', 'write-name', true, 2)),
  ];
  const rec = recommendNext({ attempts: rows, rollups: {} });
  ck(rec !== null, `recommends ${rec && rec.key}`);
  const qs = questionsMatching(POOLS, rec.key, { count: rec.suggested });
  ck(qs.length === rec.suggested,
     `and the button delivers exactly the ${rec.suggested} questions it promised`);
  ck(qs.every((q) => q.category === rec.category), '  all of the recommended skill');
  ck(!!subcategoryMeta(rec.key.split(':')[0], rec.key.split(':')[1]).label,
     `  with a label to show: "${subcategoryMeta(rec.key.split(':')[0], rec.key.split(':')[1]).label}"`);
}

console.log('=== a set is never padded with repeats ===');
for (const key of ['draw-molecule:alkyne', 'write-name:alkene']) {
  const qs = questionsMatching(POOLS, key, { count: 10 });
  const ids = new Set(qs.map((q) => q.id));
  ck(ids.size === qs.length, `${key}: ${qs.length} questions, ${ids.size} distinct`);
}

console.log('=== two sessions on the same skill differ ===');
{
  const a = questionsMatching(POOLS, 'write-name:alkane', { count: 8, seed: 1 }).map((q) => q.id).join();
  const b = questionsMatching(POOLS, 'write-name:alkane', { count: 8, seed: 2 }).map((q) => q.id).join();
  ck(a !== b, 'a repeat session is not the identical set');
}

console.log(fails ? `\n${fails} FAILURES` : '\nthe recommendation leads somewhere real');
process.exit(fails ? 1 : 0);
