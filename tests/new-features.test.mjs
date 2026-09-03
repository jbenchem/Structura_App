// ─────────────────────────────────────────────────────────────
// Molecule of the day · open-ended drawing · explain-the-error ·
// printable sheets. Each is checked against the ENGINE, so none of them can
// present a compound, a mark, or a printed page the engine would disagree
// with.
// ─────────────────────────────────────────────────────────────

import { moleculeOfTheDay, DAILY_POOL, dayNumber } from '../src/content/dailyMolecule.js';
import { judgeOpenDraw, openDrawQuestion, explainErrorQuestion, BREAKERS } from '../src/content/newQuestionTypes.js';
import { practiceSheetHtml } from '../src/content/practiceSheet.js';
import { parseName, nameGraph } from '../src/engine/index.js';
import { mcName } from '../src/content/questionFactory.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };
const molOf = (n) => parseName(n).mol;
const DAY = 86400000;
const BASE = Date.parse('2026-09-01T09:00:00');

console.log('=== molecule of the day ===');
{
  ck(DAILY_POOL.every((n) => { const p = parseName(n); return p && p.ok; }), `all ${DAILY_POOL.length} pooled names parse`);
  ck(DAILY_POOL.every((n) => nameGraph(parseName(n).mol).name === n), 'and every one names back to itself — no pool entry is a near-miss');

  const a = moleculeOfTheDay(BASE);
  ck(!!a && !!a.name, 'a day yields a molecule');
  ck(a.name === moleculeOfTheDay(BASE + 3600000).name, 'and it does not change through the day');
  ck(a.name !== moleculeOfTheDay(BASE + DAY).name, 'but it changes tomorrow');
  ck(!!a.work && a.work.steps.length >= 2, 'it arrives with its derivation');
  ck(a.work.name === a.name, 'and the derivation is of that molecule');

  // Determinism is the whole point: two devices, same day, same molecule.
  ck(moleculeOfTheDay(BASE).name === moleculeOfTheDay(BASE).name, 'the pick is deterministic');
  const week = Array.from({ length: 7 }, (_, i) => moleculeOfTheDay(BASE + i * DAY).name);
  ck(new Set(week).size >= 5, `a week is varied (${new Set(week).size} distinct of 7)`);
  ck(dayNumber(BASE) + 1 === dayNumber(BASE + DAY), 'day numbers advance by one a day');

  // A poisoned pool degrades to a skip, never to a wrong molecule.
  const bad = moleculeOfTheDay(BASE, ['not-a-molecule', 'hexane']);
  ck(bad && bad.name === 'hexane', 'an unparseable entry is skipped, not shown');
  ck(moleculeOfTheDay(BASE, ['not-a-molecule']) === null, 'and a pool with nothing valid returns null rather than guessing');
}

console.log('=== open-ended drawing: the engine marks the condition ===');
{
  const spec = { formula: 'C6H14', excludeNames: ['hexane'] };
  ck(judgeOpenDraw(spec, molOf('2-methylpentane')).ok, 'a valid isomer is accepted');
  ck(judgeOpenDraw(spec, molOf('2,3-dimethylbutane')).ok, 'so is a different valid isomer — the answer is not a single string');
  ck(!judgeOpenDraw(spec, molOf('hexane')).ok, 'the excluded compound is rejected');
  ck(/rules out/.test(judgeOpenDraw(spec, molOf('hexane')).reason), 'and told why');
  ck(!judgeOpenDraw(spec, molOf('pentane')).ok, 'the wrong formula is rejected');
  ck(/C5H12/.test(judgeOpenDraw(spec, molOf('pentane')).reason), 'and told what it drew instead');
  ck(!judgeOpenDraw(spec, { atoms: [], bonds: [] }).ok, 'an empty canvas is not an answer');

  // The namer is the deduplicator: the same compound drawn differently is
  // still the same compound.
  const found = { ...spec, alreadyFound: ['2-methylpentane'] };
  ck(!judgeOpenDraw(found, molOf('2-methylpentane')).ok, 'a repeat of one already found is caught');
  ck(/already/.test(judgeOpenDraw(found, molOf('2-methylpentane')).reason), 'and named as a repeat, not a wrong answer');

  const q = openDrawQuestion({ formula: 'C6H14', excludeNames: ['hexane'] });
  ck(q.type === 'openDraw' && /C6H14/.test(q.prompt), 'the question states its condition');
}

console.log('=== explain the error: the fault is derived, never authored ===');
{
  for (const n of ['2-methylpentane', 'propan-2-ol', 'hexane', 'but-1-ene', '3-ethyl-2-methylpentane']) {
    const q = explainErrorQuestion(molOf(n), { seed: 1 });
    if (!q) { ck(false, `${n}: a question was built`); continue; }
    ck(q.givenName !== q.correctName, `${n}: the shown name really differs from the right one`);
    ck(q.correctName === nameGraph(molOf(n)).name, `${n}: the right answer is the engine's name`);
    ck(q.options.length === 4, `${n}: four options`);
    ck(q.options[q.answer] && q.explain.includes(q.correctName), `${n}: the explanation states the correct name`);
    ck(!/-\d+-al$/.test(q.givenName), `${n}: the broken name is plausible, not malformed`);
  }
  ck(BREAKERS.every((b) => b.label && b.detail), 'every fault has a student-facing label and explanation');
}

console.log('=== printable sheet ===');
{
  const qs = ['2-methylpentane', 'but-2-ene', 'propan-2-ol'].map((n, i) => mcName(molOf(n), { seed: i + 1 }));
  const html = practiceSheetHtml(qs, { title: 'Catalyst practice', subtitle: 'Naming · 3 questions' });
  ck(/<!DOCTYPE html>/.test(html), 'it is a standalone document');
  ck((html.match(/<svg/g) || []).length === 3, 'every question prints its structure');
  ck(/Answers and reasoning/.test(html), 'the answers are on the sheet');
  ck(/Parent chain/.test(html), 'with the engine derivation, so it teaches away from the app');
  ck(html.indexOf('Answers and reasoning') > html.indexOf('1.'), 'and they come after the questions');

  // The id-vs-index bug: bonds must connect the atoms they name.
  const mol = molOf('2-methylpentane');
  const one = practiceSheetHtml([mcName(mol, { seed: 1 })]);
  const coords = [...one.matchAll(/x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"/g)]
    .map((m) => Math.hypot(m[3] - m[1], m[4] - m[2]));
  ck(coords.length > 0, 'bonds are drawn');
  const longest = Math.max(...coords), shortest = Math.min(...coords);
  ck(longest / shortest < 1.6, `every printed bond is about the same length (${shortest.toFixed(0)}–${longest.toFixed(0)}) — a bond across the whole molecule means atoms were looked up by index`);

  // Escaping, so a name can never inject markup.
  const nasty = practiceSheetHtml([{ prompt: '<script>x</script>', options: ['a'] }]);
  ck(!/<script>/.test(nasty), 'content is escaped');
  ck(practiceSheetHtml([]).includes('Answers'), 'an empty set still produces a valid document');
}

console.log(fails ? `\n${fails} FAILED\n` : '\nthe day, the open answers, the faults and the printed page all agree with the engine\n');
process.exit(fails ? 1 : 0);
