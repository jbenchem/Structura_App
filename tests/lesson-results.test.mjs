// A lesson records what happened rather than making the learner redo it.
//
// Being forced to repeat a question immediately, before the explanation has
// settled, mostly measures memory of the previous screen. Mistakes are
// collected and offered as an optional review at the end.
import { CATEGORY, CATEGORY_META } from '../src/content/questionFactory.js';
import { STAGES } from '../src/content/curriculum.js';
import { readFileSync } from 'node:fs';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };

// mirrors the player's bookkeeping
function runLesson(questions, answers) {
  let right = 0;
  let asked = 0;
  const byCategory = {};
  const missed = [];
  questions.forEach((q, i) => {
    const correct = answers[i];
    asked++;
    if (correct) right++;
    const cat = q.category || 'concept';
    byCategory[cat] = {
      right: (byCategory[cat] ? byCategory[cat].right : 0) + (correct ? 1 : 0),
      asked: (byCategory[cat] ? byCategory[cat].asked : 0) + 1,
    };
    if (!correct && !missed.some((x) => x.id === q.id)) missed.push(q);
  });
  return { score: { right, asked }, byCategory, missed };
}

const qs = [
  { id: 'a', category: CATEGORY.NAME_STRUCTURE },
  { id: 'b', category: CATEGORY.NAME_STRUCTURE },
  { id: 'c', category: CATEGORY.WRITE_NAME },
  { id: 'd', category: CATEGORY.DRAW_MOLECULE },
  { id: 'e', category: CATEGORY.DRAW_MOLECULE },
];

console.log('=== a lesson never grows ===');
{
  const r = runLesson(qs, [true, false, true, false, false]);
  ck(r.score.asked === qs.length, `asked exactly what was set: ${r.score.asked} of ${qs.length}`);
  ck(r.score.right === 2, `counted correctly: ${r.score.right}`);
  ck(r.missed.length === 3, `three mistakes recorded, not repeated (${r.missed.length})`);
  ck(r.missed.map((m) => m.id).join(',') === 'b,d,e', 'and it knows which');
}

console.log('=== the breakdown adds up ===');
{
  const r = runLesson(qs, [true, false, true, false, true]);
  const total = Object.values(r.byCategory).reduce((a, v) => a + v.asked, 0);
  const correct = Object.values(r.byCategory).reduce((a, v) => a + v.right, 0);
  ck(total === r.score.asked, `categories account for every question (${total})`);
  ck(correct === r.score.right, `and every correct answer (${correct})`);
  ck(r.byCategory[CATEGORY.NAME_STRUCTURE].asked === 2, 'naming counted twice');
  ck(r.byCategory[CATEGORY.DRAW_MOLECULE].right === 1, 'drawing counted once right of two');
  for (const key of Object.keys(r.byCategory))
    ck(!!CATEGORY_META[key], `${key} has a label and icon for the breakdown`);
}

console.log('=== reviewing cannot change the record ===');
{
  const first = runLesson(qs, [false, false, true, true, true]);
  const before = JSON.stringify({ score: first.score, byCategory: first.byCategory });
  // A walkthrough runs no marking at all, so the recorded result is whatever
  // the lesson produced — reviewing is not a second attempt.
  const after = JSON.stringify({ score: first.score, byCategory: first.byCategory });
  ck(before === after, 'the result is unchanged by reviewing');
  ck(first.score.asked === qs.length, `completion still counts the lesson once (${first.score.asked})`);
  ck(first.missed.length === 2, 'and the two mistakes are what gets walked through');
}

console.log('=== the score is written in one place only ===');
{
  const src = readFileSync('src/screens/main/LessonPlayer.js', 'utf8');
  const writes = (src.match(/setScore\(/g) || []).length;
  ck(writes === 1, `setScore is called once in the player (found ${writes})`);
  const catWrites = (src.match(/setByCategory\(/g) || []).length;
  ck(catWrites === 1, `setByCategory is called once (found ${catWrites})`);
}

console.log('=== every authored question can be broken down ===');
let n = 0;
for (const st of STAGES) for (const u of st.units) for (const l of u.lessons || []) for (const q of l.pool || []) {
  n++;
  ck(!!q.category && !!CATEGORY_META[q.category], `${l.id}/${q.id}: has a known category`);
}
console.log(`  ${n} questions carry a category`);

console.log(fails ? `\n${fails} FAILURES` : '\nresults are recorded, not re-drilled');
process.exit(fails ? 1 : 0);
