// The attempt log is the durable record. A lesson result is transient; this
// is what an analysis, a sync, or a teacher's dashboard would read later — so
// what is written at the time is all there will ever be.
import { subcategoryStats, errorProfile, weakestSkill, weaknessShape } from '../src/state/store.js';
import { errorClassForCategory, CATEGORY } from '../src/content/questionFactory.js';
import { ERROR_CLASSES } from '../src/content/content.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };
const mk = (sub, cat, correct, errorClass) => ({ subcategory: sub, category: cat, correct, errorClass });

console.log('=== every category maps to a real error class ===');
for (const cat of Object.values(CATEGORY)) {
  const k = errorClassForCategory(cat);
  ck(ERROR_CLASSES.includes(k), `${cat} → ${k}`);
}
ck(errorClassForCategory('nonsense') === 'other', 'an unknown category falls back to "other"');

console.log('=== the fallback is better than "other" where it can be ===');
{
  const specific = Object.values(CATEGORY).filter((c) => errorClassForCategory(c) !== 'other');
  ck(specific.length >= 8, `${specific.length} of ${Object.values(CATEGORY).length} categories give a specific class`);
  ck(errorClassForCategory(CATEGORY.NUMBERING) === 'locant', 'a numbering question wrong is a locant error');
  ck(errorClassForCategory(CATEGORY.BONDS) === 'valence', 'a bond-count question wrong is a valence error');
}

console.log('=== accuracy is reported per subcategory, with a floor ===');
{
  const state = { attempts: [
    ...Array(6).fill(0).map(() => mk('write-name:alkane', 'write-name', true, null)),
    ...Array(5).fill(0).map((_, i) => mk('draw-molecule:alkene', 'draw-molecule', i < 1, i < 1 ? null : 'chain-selection')),
    ...Array(2).fill(0).map(() => mk('numbering:general', 'numbering', false, 'locant')),
  ] };
  const stats = subcategoryStats(state);
  const alkene = stats.find((s) => s.key === 'draw-molecule:alkene');
  ck(alkene.asked === 5 && alkene.right === 1, `drawing alkenes: ${alkene.right}/${alkene.asked}`);
  ck(alkene.enough === true, 'five attempts is enough to report');
  const thin = stats.find((s) => s.key === 'numbering:general');
  ck(thin.enough === false, 'two attempts is flagged as too few, not hidden');
  ck(stats[0].pct <= stats[stats.length - 1].pct, 'weakest first');
}

console.log('=== the error profile answers "what kind of mistake" ===');
{
  const state = { attempts: [
    mk('a', 'x', false, 'locant'), mk('a', 'x', false, 'locant'), mk('a', 'x', false, 'locant'),
    mk('b', 'y', false, 'chain-selection'),
    mk('c', 'z', true, null),
  ] };
  const prof = errorProfile(state);
  ck(prof[0].klass === 'locant' && prof[0].n === 3, `commonest fault is ${prof[0].klass} (${prof[0].n})`);
  ck(Math.abs(prof[0].share - 0.75) < 0.01, `and accounts for ${Math.round(prof[0].share * 100)}% of errors`);
  ck(prof.every((p) => ERROR_CLASSES.includes(p.klass)), 'every reported class is a known one');
  ck(!prof.some((p) => p.klass === null), 'correct answers contribute nothing');
}

console.log('=== no evidence is reported as no finding ===');
{
  ck(weakestSkill({ attempts: [] }) === null, 'an empty log yields no weakness');
  ck(weakestSkill({ attempts: [mk('a', 'x', false, 'locant')] }) === null,
     'a single wrong answer is not enough to call something a weakness');
  ck(weaknessShape({ attempts: [] }) === null, 'and no shape either');
}

console.log('=== skill weakness and family weakness are distinguished ===');
{
  // drawing is weak across every family → a SKILL problem
  const skillProblem = { attempts: [
    ...Array(5).fill(0).map((_, i) => mk('draw-molecule:alkane', 'draw-molecule', i < 1, 'chain-selection')),
    ...Array(5).fill(0).map((_, i) => mk('draw-molecule:alkene', 'draw-molecule', i < 1, 'chain-selection')),
    ...Array(5).fill(0).map(() => mk('write-name:alkane', 'write-name', true, null)),
    ...Array(5).fill(0).map(() => mk('write-name:alkene', 'write-name', true, null)),
  ] };
  const a = weaknessShape(skillProblem);
  ck(a && a.kind === 'skill', `drawing weak everywhere reads as a ${a && a.kind} problem`);
  ck(a && a.worst.k === 'draw-molecule', `  and names it: ${a && a.worst.k}`);

  // alkenes weak across every skill → a FAMILY problem
  const familyProblem = { attempts: [
    ...Array(5).fill(0).map((_, i) => mk('draw-molecule:alkene', 'draw-molecule', i < 1, 'chain-selection')),
    ...Array(5).fill(0).map((_, i) => mk('write-name:alkene', 'write-name', i < 1, 'other')),
    ...Array(5).fill(0).map(() => mk('draw-molecule:alkane', 'draw-molecule', true, null)),
    ...Array(5).fill(0).map(() => mk('write-name:alkane', 'write-name', true, null)),
  ] };
  const b = weaknessShape(familyProblem);
  ck(b && b.kind === 'family', `alkenes weak everywhere reads as a ${b && b.kind} problem`);
  ck(b && b.worst.k === 'alkene', `  and names it: ${b && b.worst.k}`);
}

console.log(fails ? `\n${fails} FAILURES` : '\nthe log records enough to diagnose, not just to describe');
process.exit(fails ? 1 : 0);
