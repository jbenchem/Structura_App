import * as P from '../src/content/pools.js';
import { sample, compareNames, straightChain, buildName } from '../src/content/questionFactory.js';
import { nameGraph, parseName } from '../src/engine/index.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } };
// Content names are stereo-free (a drawn zigzag makes an internal alkene E,
// but E/Z is not taught until stage 9), so compare on the same basis.
const strip = (n) => (n || '').replace(/\((?:\d+[EZRS]|[EZRS])\)-?/g, '').trim();
const nameOf = (g) => { const r = nameGraph(g); return r.ok ? strip(r.name) : null; };
// A stereochemistry question keeps its descriptor on purpose: the descriptor
// IS what is being tested, so it must be compared with the full name.
const fullNameOf = (g) => { const r = nameGraph(g); return r.ok ? r.name : null; };

const POOLS = Object.entries(P).filter(([k]) => k.startsWith('POOL_'));
console.log('=== pools ===');
for (const [key, list] of POOLS) {
  // A pool is either a fixed set (every learner sees all of it) or big enough
  // that sampling gives genuine variety. In between is the worst of both: the
  // same questions most runs, dressed up as random.
  ck(
    list.length >= 30 || list.length <= 8,
    `${key} is either a fixed short set (<=8) or a proper pool (>=30), got ${list.length}`
  );
  const ids = new Set(list.map((q) => q.id));
  ck(ids.size === list.length, `${key} ids unique (${ids.size}/${list.length})`);
  for (const q of list) {
    ck(!!q.chip && !!q.prompt, `${key}/${q.id}: has a chip and prompt`);
    ck(!!q.explain, `${key}/${q.id}: has an explanation`);
    if (q.type === 'mcName' || q.type === 'mcStructure') {
      ck(Array.isArray(q.options) && q.options.length >= 3, `${key}/${q.id}: enough options`);
      ck(q.answer >= 0 && q.answer < q.options.length, `${key}/${q.id}: answer index in range`);
      if (q.type === 'mcName') {
        const strs = q.options.map(String);
        ck(new Set(strs).size === strs.length, `${key}/${q.id}: options are distinct (${strs.join('|')})`);
      } else {
        // the right structure must be the named one, the others must differ
        const correct = nameOf(q.options[q.answer]);
        ck(!!correct, `${key}/${q.id}: correct option is nameable`);
        q.options.forEach((m, i) => {
          if (i === q.answer) return;
          ck(nameOf(m) !== correct, `${key}/${q.id}: distractor ${i} differs from the answer`);
        });
      }
    }
    if (q.type === 'write') {
      ck(!!parseName(q.answer).ok, `${key}/${q.id}: answer "${q.answer}" parses`);
      // A stereochemistry question keeps its descriptor deliberately, so it is
      // compared with the full name rather than the stripped one.
      const expected = q.stereo ? fullNameOf(q.mol) : nameOf(q.mol);
      ck(expected === q.answer, `${key}/${q.id}: molecule really is ${expected}, answer says ${q.answer}`);
    }
    if (q.type === 'number') {
      ck(Number.isInteger(q.answer) && q.answer > 0, `${key}/${q.id}: numeric answer sane`);
      // A carbon count must count CARBONS. atoms.length was silently correct
      // while everything was a hydrocarbon, then counted the oxygen in an
      // alcohol and marked the right answer wrong.
      // The unit says what is being counted; the prompt mentions carbons in
      // both cases ("hydrogens in an alkane with 6 carbons").
      if (q.mol && /carbon/i.test(q.unit || '')) {
        const carbons = q.mol.atoms.filter((a) => !a.el || a.el === 'C').length;
        ck(q.answer === carbons, `${key}/${q.id}: says ${q.answer}, molecule has ${carbons} carbons`);
      }
      if (q.mol && /hydrogen/i.test(q.unit || '')) {
        const carbons = q.mol.atoms.filter((a) => !a.el || a.el === 'C').length;
        ck(q.answer === 2 * carbons + 2, `${key}/${q.id}: hydrogen count matches 2n+2 for ${carbons} carbons`);
      }
    }
    if (q.type === 'draw') {
      ck(!!parseName(q.name).ok, `${key}/${q.id}: draw target "${q.name}" parses`);
    }
    if (q.type === 'countTap') {
      ck(q.answer === q.mol.atoms.length, `${key}/${q.id}: tap count matches the molecule`);
    }
  }
  console.log(`  ${key}: ${list.length} questions`);
}

// sampling
console.log('=== sampling ===');
const big = POOLS.map(([, l]) => l).find((l) => l.length >= 30);
const s = sample(big, 12);
{
  ck(s.length === 12, `sample returns 12, got ${s.length}`);
  ck(new Set(s.map((q) => q.id)).size === 12, 'sample has no repeats');
}

// compareNames is not in any pool yet (see the note in pools.js) but must
// work for the alkenes unit, where alternate locant styles make it meaningful.
console.log('=== compareNames, ready for alkenes ===');
{
  const same = compareNames('but-2-ene', '2-butene');
  ck(same && same.answer === 0, );
  const diff = compareNames('but-2-ene', 'pent-2-ene');
  ck(diff && diff.answer === 1, );
  ck(compareNames('flurble', 'butane') === null, 'an unparseable name yields no question');
}

console.log(fails ? `\n${fails} FAILURES` : '\nall pool questions verified');
process.exit(fails ? 1 : 0);
