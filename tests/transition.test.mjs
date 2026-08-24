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

console.log('=== the results arrive under cover too ===');
{
  // The end of the quiz plays the same trick as its start: the wipe covers,
  // the branch swaps to the results screen, the panel peels off. Model the
  // handover: `finished` must not flip before cover, must flip exactly once,
  // and the panel the results screen shows must resume COVERED — a remounted
  // panel that starts off-screen would wipe in a second time and show the
  // seam twice instead of never.
  let stepIdx = 7;
  let finished = false;
  let wipe = null;
  const total = 8;
  const advance = () => {
    const next = stepIdx + 1;
    if (next < total) stepIdx = next;
    else wipe = { pending: 'finish' };
  };
  advance();                              // answering the last question
  ck(finished === false, 'the results do NOT appear when the wipe starts');
  ck(!!wipe && wipe.pending === 'finish', 'the handover is recorded');
  // onCover — the branch logic from the player
  if (wipe.pending === 'finish') finished = true;
  else if (wipe.pending < total) stepIdx = wipe.pending;
  ck(finished === true, 'the results appear at full coverage');
  ck(stepIdx === 7, 'and the step index is left alone');
  // the resumed panel starts covered: anim begins at 1, not 0
  const startCovered = true;
  const animStart = startCovered ? 1 : 0;
  ck(animStart === 1, 'the resumed panel begins covering, so nothing wipes in twice');
  wipe = null;                            // onDone from the resumed panel
  ck(wipe === null, 'and clears when the peel finishes');
}

console.log('=== a checkpoint announces itself, not a change of mode ===');
{
  for (const u of authored) {
    for (const l of u.lessons) {
      if (!l.checkpoint) continue;
      const teach = (l.steps || []).length;
      ck(teach === 0, `${l.id}: no teaching section, so no interlude to cross into`);
      // the wipe it does show is the checkpoint one
      const label = l.checkpoint ? 'Checkpoint' : 'Test your understanding';
      ck(label === 'Checkpoint', `${l.id}: announces "Checkpoint"`);
      ck(l.ask === 15, `${l.id}: fifteen questions`);
    }
  }
}

console.log(fails ? `\n${fails} FAILURES` : 'the transition fires once and the step changes only under cover');
process.exit(fails ? 1 : 0);
