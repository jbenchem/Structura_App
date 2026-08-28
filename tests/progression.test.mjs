// Checkpoints, test-out and the dev unlock.
import { STAGES, UNITS } from '../src/content/curriculum.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } };

console.log('=== every authored unit ends with a checkpoint ===');
const authored = UNITS.filter((u) => u.lessonList);
for (const u of authored) {
  const last = u.lessonList[u.lessonList.length - 1];
  ck(!!last.checkpoint, `${u.id}: last lesson "${last.title}" must be a checkpoint`);
  const flagged = u.lessonList.filter((l) => l.checkpoint);
  ck(flagged.length === 1, `${u.id}: exactly one checkpoint, found ${flagged.length}`);
  // A checkpoint can be taken INSTEAD of the lessons, so it is longer than an
  // ordinary lesson and needs a pool deep enough that 20 questions are not
  // nearly the whole thing.
  ck(!!last.pool && last.pool.length >= 30, `${u.id}: checkpoint pool has 30+, got ${last.pool ? last.pool.length : 0}`);
  // A checkpoint asks more than a lesson because passing it skips the whole
  // unit — but a short unit does not need twenty questions to prove mastery,
  // so the floor is ten rather than a fixed number.
  // A checkpoint is pure assessment: fifteen questions, 80% to pass, and no
  // teaching section — a lesson that teaches first cannot be taken instead of
  // the lessons it replaces.
  ck(last.ask === 15, `${u.id}: checkpoint asks 15, got ${last.ask}`);
  ck((last.steps || []).length === 0, `${u.id}: checkpoint has no teaching steps (${(last.steps || []).length})`);
  const lessons = u.lessonList.filter((l) => !l.checkpoint && l.pool);
  for (const l of lessons)
    ck(last.ask >= l.ask, `${u.id}: the checkpoint asks at least as much as a lesson (${last.ask} vs ${l.ask})`);
  ck(last.pool.length >= last.ask * 1.5, `${u.id}: pool is at least 1.5x the ask, so two attempts differ`);
}
console.log(`  ${authored.length} authored units checked`);

console.log('=== every teaching card carries a visual ===');
let teach = 0;
for (const u of authored) for (const l of u.lessonList) for (const st of l.steps || []) {
  if (st.type !== 'teach') continue;
  teach++;
  // A visual can be a molecule, a built diagram (the root table, the name
  // split, the periodic table) or — failing those — a described placeholder.
  // An interactive builds its own visual from its configuration, so it needs
  // no molecule attached to the step.
  const INTERACTIVE = ['toggle', 'count', 'build', 'elements', 'alcohol', 'branch',
                       'numbering', 'swap', 'priority', 'flip', 'isomers', 'ring',
                       'locants', 'brackets', 'trace', 'sort', 'slide', 'suffixtest', 'stepthrough', 'isomerhunt', 'formslider'];
  // A reaction card is a visual too — two engine-drawn structures and an
  // arrow, which is more picture than most steps get.
  const hasVisual = !!st.mol || !!st.rxn || !!st.placeholder || !!st.rootTable || !!st.split ||
                    !!st.periodic || INTERACTIVE.includes(st.type);
  ck(hasVisual, `${l.id} "${st.title}": no visual of any kind`);
  if (st.placeholder) ck(st.placeholder.length > 30, `${l.id} "${st.title}": placeholder needs a real description`);
}
console.log(`  ${teach} teaching cards, all with a visual`);

// ── reducer behaviour ───────────────────────────────────────
console.log('=== test-out completes the unit ===');
function reduce(state, action) {
  if (action.type === 'completeUnit') {
    const done = state.completedUnits.includes(action.unitId)
      ? state.completedUnits : [...state.completedUnits, action.unitId];
    const idx = UNITS.findIndex((u) => u.id === action.unitId);
    const next = UNITS[idx + 1] || null;
    const currentIdx = UNITS.findIndex((u) => u.id === state.current.unitId);
    const advance = next && idx >= currentIdx;
    return { completedUnits: done, current: advance ? { unitId: next.id, lesson: 1 } : state.current };
  }
  return state;
}
let st = { completedUnits: [], current: { unitId: UNITS[0].id, lesson: 1 } };
st = reduce(st, { type: 'completeUnit', unitId: UNITS[0].id });
ck(st.completedUnits.includes(UNITS[0].id), 'unit 1 marked complete');
ck(st.current.unitId === UNITS[1].id, `advanced to unit 2, got ${st.current.unitId}`);

// testing out of an earlier unit must not drag the learner backwards
st = { completedUnits: [UNITS[0].id, UNITS[1].id], current: { unitId: UNITS[2].id, lesson: 3 } };
const after = reduce(st, { type: 'completeUnit', unitId: UNITS[0].id });
ck(after.current.unitId === UNITS[2].id && after.current.lesson === 3,
   're-passing an earlier checkpoint leaves position untouched');

// completing twice does not duplicate
const twice = reduce(reduce(st, { type: 'completeUnit', unitId: UNITS[0].id }), { type: 'completeUnit', unitId: UNITS[0].id });
ck(twice.completedUnits.filter((x) => x === UNITS[0].id).length === 1, 'no duplicate completions');

// The pass mark, modelled as the player applies it.
console.log('=== the 80% bar ===');
{
  const PASS = 0.8;
  const passed = (right, asked) => asked > 0 && right / asked >= PASS;
  ck(passed(20, 20), '20 of 20 passes');
  ck(passed(16, 20), '16 of 20 passes — exactly 80%');
  ck(!passed(15, 20), '15 of 20 fails — just under');
  ck(!passed(0, 0), 'an empty attempt is not a pass');
  ck(passed(8, 10), 'the same bar applies to a shorter run');
}

console.log(fails ? `\n${fails} FAILURES` : '\nprogression rules hold');
process.exit(fails ? 1 : 0);
