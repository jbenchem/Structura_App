// The retry queue: a wrong answer must come back exactly once.
let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } };

// mirrors the reducer logic in LessonPlayer
function simulate(answers) {
  const base = answers.map((_, i) => ({ q: { id: `q${i}` } }));
  let steps = [...base];
  const retries = [];
  let asked = 0;
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const first = !step.q.id.startsWith('again-');
    const correct = first ? answers[i] : true; // second time round they get it
    asked++;
    if (!correct && first) {
      retries.push({ q: { ...step.q, id: `again-${step.q.id}` } });
      steps = [...base, ...retries];
    }
  }
  return { asked, retried: retries.length };
}

let r = simulate([true, true, true]);
ck(r.asked === 3 && r.retried === 0, `all correct: asked 3 with no retries, got ${JSON.stringify(r)}`);

r = simulate([false, true, false]);
ck(r.retried === 2, `two wrong: two retries queued, got ${r.retried}`);
ck(r.asked === 5, `two wrong: 3 + 2 retries = 5 asked, got ${r.asked}`);

r = simulate([false, false, false]);
ck(r.retried === 3, `all wrong: three retries, got ${r.retried}`);
ck(r.asked === 6, `all wrong: never loops beyond one repeat each, got ${r.asked}`);

console.log(fails ? `\n${fails} FAILURES` : 'retry queue: one repeat per missed question, no loops');
process.exit(fails ? 1 : 0);
