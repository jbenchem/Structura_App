// Where does the banner fire? Simulate the advance logic against real lessons.
import { STAGES } from '../src/content/curriculum.js';
let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };

const authored = STAGES.flatMap((s) => s.units).filter((u) => u.lessons);
for (const u of authored) {
  for (const l of u.lessons) {
    const teach = (l.steps || []).length;
    const asks = l.pool ? Math.min(l.ask || 12, l.pool.length) : 0;
    const total = teach + asks;
    // count how many times the banner would fire walking the whole lesson
    let fired = 0;
    if (teach === 0 && asks > 0) fired++;              // mount case
    for (let i = 0; i < total; i++) {
      const next = i + 1;
      if (next === teach && asks > 0) fired++;
    }
    ck(fired <= 1, `${l.id}: banner fires ${fired} times (should be at most once)`);
    if (asks > 0) ck(fired === 1, `${l.id}: banner should fire once, fired ${fired}`);
    else ck(fired === 0, `${l.id}: no questions, so no banner`);
  }
}
// The wipe holds the step change until it has covered the screen. Model that
// contract: the step must not move before onCover, and must move exactly once.
console.log('=== the step changes only under cover ===');
{
  let stepIdx = 0;
  let wipe = null;
  const teachLen = 3;
  const total = 8;
  const advance = () => {
    const next = stepIdx + 1;
    if (next === teachLen) { wipe = { pending: next }; return; }
    if (next < total) stepIdx = next;
  };
  advance(); advance();                 // steps 1, 2
  ck(stepIdx === 2, `walked the teaching steps, at ${stepIdx}`);
  advance();                            // crossing the boundary
  ck(stepIdx === 2, 'the step does NOT move when the wipe starts');
  ck(!!wipe && wipe.pending === 3, 'the pending step is recorded');
  stepIdx = wipe.pending;               // onCover
  ck(stepIdx === 3, 'the step moves at full coverage');
  wipe = null;                          // onDone
  ck(wipe === null, 'the panel clears afterwards');
}

console.log(fails ? `\n${fails} FAILURES` : 'the transition fires once and the step changes only under cover');
process.exit(fails ? 1 : 0);
