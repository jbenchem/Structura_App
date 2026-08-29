// ─────────────────────────────────────────────────────────────
// The analytics model — the redesign spec's state matrix, pinned.
//
// Every sentence and number on the Progress screen is a conclusion of
// analyticsModel.js, so this suite seeds learner states and asserts the
// conclusions: coverage counts only enabled units, the evidence bar is the
// engine's bar and never looser, demo rows touch nothing, unknown error
// classes get no invented explanation, a fresh checkpoint failure buys ten
// quiet minutes, and the naming-only build reads as if reactions never
// existed.
// ─────────────────────────────────────────────────────────────

import {
  selectRealAttempts,
  selectCoverage,
  headlineFor,
  errorGroupFor,
  checkpointQuietUntil,
  fixCardFor,
  trendFor,
  skillsFor,
  analyticsScreenModelFor,
  railSegments,
  selectCheckpointEvidence,
} from '../src/state/analyticsModel.js';
import { CHECKPOINT_PASS } from '../src/state/heroDecision.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_800_000_000_000;

// A four-unit course in two stages; u2's last lesson is its checkpoint.
const U = [
  { id: 'u1', title: 'Foundations', lessons: 2, lessonList: [{ id: 'u1-l1' }, { id: 'u1-cp', checkpoint: true }] },
  { id: 'u2', title: 'Branching', lessons: 2, lessonList: [{ id: 'u2-l1' }, { id: 'u2-cp', checkpoint: true }] },
  { id: 'r1', title: 'Boiling points', lessons: 2, lessonList: [{ id: 'r1-l1' }, { id: 'r1-cp', checkpoint: true }] },
  { id: 'u3', title: 'Alkenes', lessons: 2, lessonList: [{ id: 'u3-l1' }, { id: 'u3-cp', checkpoint: true }] },
];
const view = (over = {}) => ({
  units: U,
  stages: [
    { n: 1, units: [U[0]] },
    { n: 2, units: [U[1], U[2], U[3]] },
  ],
  unitById: (id) => U.find((u) => u.id === id) || null,
  showReactions: true,
  checkpoints: U.map((u) => ({ lessonId: u.lessonList[1].id, unitId: u.id, unitTitle: u.title })),
  categoryLabel: (c) => ({ numbering: 'Numbering', pathway: 'Reaction pathways', 'write-name': 'Writing names' }[c] || c),
  categoryIcon: () => 'school-outline',
  ...over,
});
const namingView = () =>
  view({
    units: U.filter((u) => u.id !== 'r1'),
    stages: [
      { n: 1, units: [U[0]] },
      { n: 2, units: [U[1], U[3]] },
    ],
    showReactions: false,
    checkpoints: U.filter((u) => u.id !== 'r1').map((u) => ({ lessonId: u.lessonList[1].id, unitId: u.id, unitTitle: u.title })),
  });

const base = (over = {}) => ({
  user: { name: 'T', examDate: null },
  attempts: [],
  rollups: {},
  lessonResults: {},
  lastActiveAt: NOW - DAY,
  progress: { completedUnits: [], current: { unitId: 'u1', lesson: 1 }, daysDone: [] },
  ...over,
});

const wrongs = (n, opts) => Array.from({ length: n }, (_, i) => ({ correct: false, ts: NOW - i * 3600e3, category: 'numbering', errorClass: 'wrong-locant', unitId: 'u2', ...opts }));
const rights = (n, opts) => Array.from({ length: n }, (_, i) => ({ correct: true, ts: NOW - i * 3600e3, category: 'numbering', unitId: 'u2', ...opts }));

console.log('=== zero data is a launch ramp, not a scoreboard ===');
{
  const m = analyticsScreenModelFor(base(), view(), NOW);
  ck(m.mode === 'empty', 'a brand-new learner gets the empty mode');
  ck(m.firstUnit && m.firstUnit.id === 'u1', 'pointed at the first unit');
}

console.log('=== coverage counts only enabled units ===');
{
  const p = { completedUnits: ['u1', 'u2', 'r1'], current: { unitId: 'u3', lesson: 1 } };
  ck(selectCoverage(p, view()).secured === 3, 'reactions-on: all three completions count');
  const nv = namingView();
  const c = selectCoverage(p, nv);
  ck(c.secured === 2 && c.total === 3, 'naming-only: the reaction completion is neither counted nor lost');
  const segs = railSegments(p, nv);
  ck(segs.reduce((a, s) => a + s.count, 0) === 3, 'and the rail re-lays over the enabled units only');
}

console.log('=== the headline, in spec order ===');
{
  const ctx = (state, v = view()) => {
    const coverage = selectCoverage(state.progress, v);
    const cpEvidence = selectCheckpointEvidence(state.lessonResults, v);
    const currentUnit = v.unitById(state.progress.current.unitId);
    return { state, view: v, coverage, cpEvidence, currentUnit };
  };
  const done = base({ progress: { completedUnits: ['u1', 'u2', 'r1', 'u3'], current: { unitId: 'u3', lesson: 2 } }, attempts: rights(5) });
  ck(headlineFor(ctx(done), NOW).kind === 'complete', 'everything complete says so');

  const exam = base({ user: { name: 'T', examDate: NOW + 20 * DAY }, attempts: rights(5), progress: { completedUnits: ['u1'], current: { unitId: 'u2', lesson: 1 } } });
  const h = headlineFor(ctx(exam), NOW);
  ck(h.kind === 'exam' && h.chip === 'Exam preparation', 'a set exam date inside 28 days enters exam preparation');
  ck(/coverage plan, not a predicted exam mark/.test(h.lines[1]), 'with the disclaimer, always');
  ck(!/days left|behind|ahead/i.test(h.lines.join(' ')), 'and no countdown-clock language');
  const noDate = base({ attempts: rights(5) });
  ck(headlineFor(ctx(noDate), NOW).kind !== 'exam', 'no exam framing without an explicit date');
  const far = base({ user: { name: 'T', examDate: NOW + 40 * DAY }, attempts: rights(5) });
  ck(headlineFor(ctx(far), NOW).kind !== 'exam', 'nor outside the 28-day window');

  const away = base({ attempts: rights(5, { ts: NOW - 9 * DAY }), lastActiveAt: NOW - 8 * DAY });
  ck(headlineFor(ctx(away), NOW).kind === 'returning', 'seven days away earns the welcome-back line');

  const failedCp = base({ attempts: rights(5), lessonResults: { 'u1-cp': { pct: 0.6, at: NOW - DAY } } });
  ck(headlineFor(ctx(failedCp), NOW).kind === 'repair-pointer', 'a current checkpoint under the bar points at the repair below');

  const strong = base({
    attempts: rights(5),
    progress: { completedUnits: ['u1', 'u2'], current: { unitId: 'u3', lesson: 1 } },
    lessonResults: { 'u1-cp': { pct: 0.9, at: NOW - 3 * DAY }, 'u2-cp': { pct: 0.85, at: NOW - DAY } },
  });
  ck(headlineFor(ctx(strong), NOW).kind === 'standard-met', 'recent checkpoints at the standard get the standard-met line');
}

console.log('=== the evidence bar is the engine\u2019s bar ===');
{
  // 9 comparable / 3 wrong: withheld. 12 / 5: surfaced with the pattern.
  const shy = base({ attempts: [...wrongs(3), ...rights(6)] });
  ck(fixCardFor({ state: shy, view: view(), currentUnit: U[1] }, NOW).kind === 'insufficient', '9 comparable answers: no diagnosis yet');

  const hot = base({ attempts: [...wrongs(5), ...rights(7)] });
  const card = fixCardFor({ state: hot, view: view(), currentUnit: U[1] }, NOW);
  ck(card.kind === 'pattern' && card.groupId === 'numbering-locants', '12/5 on one class: the pattern surfaces');
  ck(card.capsule === '5 of 12', 'with the honest capsule');
  ck(/6 questions will steady/.test(card.body), 'and the six-question promise');
  ck(card.focusKey === 'numbering:general' && card.count === 6, 'deep-linking into the existing focused practice');

  // Same wrong volume, but the classes disagree: category card, no invented pattern.
  const mixed = base({
    attempts: [
      ...wrongs(2, { errorClass: 'wrong-locant' }),
      ...wrongs(2, { errorClass: 'other-unknown-thing' }),
      ...wrongs(1, { errorClass: 'mystery' }),
      ...rights(7),
    ],
  });
  const mcard = fixCardFor({ state: mixed, view: view(), currentUnit: U[1] }, NOW);
  ck(mcard.kind === 'category', 'wrong answers without one shared type get the category card');
  ck(!/other-unknown-thing|mystery/.test(JSON.stringify(mcard)), 'unknown error classes are never explained by guesswork');

  // Demo rows are invisible everywhere.
  const demo = base({ attempts: [...wrongs(5, { demo: true }), ...rights(7, { demo: true })] });
  ck(fixCardFor({ state: demo, view: view(), currentUnit: U[1] }, NOW).kind === 'insufficient', 'demo rows never create a diagnosis');
  ck(selectRealAttempts(demo.attempts).length === 0, 'because they are not real attempts');
}

console.log('=== ten quiet minutes after a checkpoint ===');
{
  const fresh = base({
    attempts: [...wrongs(5, { ts: NOW - 4 * 60 * 1000, unitId: 'u1' }), ...rights(7, { unitId: 'u1' })],
    lessonResults: { 'u1-cp': { pct: 0.6, at: NOW - 4 * 60 * 1000 } },
  });
  ck(checkpointQuietUntil({ state: fresh, view: view(), currentUnit: U[0] }, NOW) !== null, 'a minutes-old failure buys quiet');
  const q = fixCardFor({ state: fresh, view: view(), currentUnit: U[0] }, NOW);
  ck(q.kind === 'quiet' && /still fresh/.test(q.title), 'the card reviews, it does not diagnose');
  ck(checkpointQuietUntil({ state: fresh, view: view(), currentUnit: U[0] }, NOW + 11 * 60 * 1000) === null, 'and the quiet expires after ten minutes');
}

console.log('=== the taxonomy, including its category-dependent rows ===');
{
  ck(errorGroupFor('wrong-locant', 'numbering') === 'numbering-locants', 'wrong-locant maps home');
  ck(errorGroupFor('reversed', 'write-name') === 'numbering-locants', 'reversed in naming is a numbering slip');
  ck(errorGroupFor('reversed', 'pathway') === 'reaction-pathway', 'reversed in reactions is a pathway slip');
  ck(errorGroupFor('adjacent-swap', 'write-name') === 'name-order', 'adjacent-swap in naming is name order');
  ck(errorGroupFor('adjacent-swap', 'classify-reaction') === 'reaction-pathway', 'and in reactions, pathway');
  ck(errorGroupFor('never-heard-of-it', 'numbering') === null, 'unknown classes map to nothing at all');
}

console.log('=== the trend reads honestly ===');
{
  const spread = base({
    attempts: [
      ...rights(6, { ts: NOW - 20 * DAY }),
      ...wrongs(2, { ts: NOW - 20 * DAY }),
      ...rights(3, { ts: NOW - 2 * DAY }),
    ],
  });
  const t = trendFor(spread, view(), NOW);
  ck(t.mode === 'weekly', 'a three-week span buckets by calendar week');
  ck(t.buckets.some((b) => b.empty), 'a week without answers renders as a gap, not a zero bar');
  const busy = t.buckets.find((b) => b.asked === 8);
  ck(busy && busy.pct === 75, 'percentages come from the bucket\u2019s own answers');
  const tiny = t.buckets.find((b) => b.asked === 3);
  ck(tiny && tiny.small, 'under five answers is flagged a small sample');

  const threeDays = base({ attempts: [...rights(3, { ts: NOW - 2 * DAY }), ...rights(4, { ts: NOW })] });
  ck(trendFor(threeDays, view(), NOW).mode === 'daily', 'a short history buckets by day');
  ck(trendFor(base(), view(), NOW) === null, 'zero history draws no axes');
}

console.log('=== skills merge raw and rolled without double-counting ===');
{
  const s = base({
    attempts: [...rights(4), ...wrongs(2)],
    rollups: { 'numbering:general': { key: 'numbering:general', category: 'numbering', asked: 20, right: 14 } },
  });
  const sk = skillsFor(s, view());
  const numbering = sk.rows.find((r) => r.category === 'numbering');
  ck(numbering.asked === 26 && numbering.right === 18, 'raw and rolled are disjoint by construction, so they simply add');
  ck(numbering.showPct, 'five or more answers earns the fraction');

  const sparse = base({ attempts: rights(3, { category: 'write-name' }) });
  const row = skillsFor(sparse, view()).rows.find((r) => r.category === 'write-name');
  ck(row && !row.showPct, 'fewer than five answers shows a count, never a percentage');

  // Naming-only: reaction skills vanish, mixed archives are omitted with a note.
  const rx = base({
    attempts: [...rights(6, { category: 'pathway', unitId: 'r1' }), ...rights(6)],
    rollups: { 'numbering:general': { key: 'numbering:general', category: 'numbering', asked: 10, right: 8 } },
  });
  const nsk = skillsFor(rx, namingView());
  ck(!nsk.rows.some((r) => r.category === 'pathway'), 'reaction skill rows are excluded, not zeroed');
  ck(nsk.omittedNote, 'and unseparable archives are omitted with the note');
  const ntrend = trendFor(rx, namingView(), NOW);
  ck(ntrend.buckets.reduce((a, b) => a + b.asked, 0) === 6, 'the trend drops reaction attempts too');
}

console.log('=== the rollup pipeline itself excludes demo rows ===');
{
  // The invariant the spec demanded: rollups are sums, and a sum cannot be
  // un-contaminated afterwards. Exercise the real reducer path.
  const { __testRollUp } = await import('../src/state/store.js');
  if (__testRollUp) {
    const old = NOW - 40 * DAY;
    const { rollups } = __testRollUp(
      [
        { ts: old, subcategory: 'numbering:general', category: 'numbering', correct: true },
        { ts: old, subcategory: 'numbering:general', category: 'numbering', correct: true, demo: true },
      ],
      {},
      NOW
    );
    ck(rollups['numbering:general'].asked === 1, 'a demo row older than the raw window dies instead of being archived');
  } else {
    ck(false, 'store must export __testRollUp for the invariant');
  }
}

console.log(fails ? `\n${fails} FAILED\n` : '\nevery number on the Progress screen is a tested conclusion\n');
process.exit(fails ? 1 : 0);
