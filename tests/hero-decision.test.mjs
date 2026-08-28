// ─────────────────────────────────────────────────────────────
// The Home hero decision engine.
//
// Home now recommends exactly one action, and the recommendation is a rule
// table — which means it can be WRONG in a testable way. This suite seeds a
// learner state for every rule and asserts the table picks it, then attacks
// the safeguards directly: streak must never outrank learning evidence, a
// single wrong answer must never become a "weakness", and no exam mode
// without a supplied exam date.
// ─────────────────────────────────────────────────────────────

import { chooseHero, leadingErrorClass, CHECKPOINT_PASS, leadingWeakness, streakFrom, lastSessionEvidence } from '../src/state/heroDecision.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_800_000_000_000;

// A tiny three-unit course: two naming, one reaction, in two stages.
const U = [
  { id: 'u01', title: 'Alkanes', lessons: 4 },
  { id: 'u02', title: 'Branching', lessons: 5 },
  { id: 'r01', title: 'Boiling points', lessons: 3 },
];
const view = (over = {}) => ({
  units: U,
  fullUnits: U,
  showReactions: true,
  unitById: (id) => U.find((u) => u.id === id) || null,
  stageOfUnit: (id) => ({ title: id === 'u01' ? 'Foundations' : 'Branching' }),
  checkpoints: [
    { lessonId: 'u01-cp', unitId: 'u01', unitTitle: 'Alkanes' },
    { lessonId: 'u02-cp', unitId: 'u02', unitTitle: 'Branching' },
  ],
  todayIdx: 3,
  ...over,
});

const base = (over = {}) => ({
  user: { name: 'Test' },
  attempts: [],
  lastActiveAt: null,
  progress: {
    completedUnits: [],
    current: { unitId: 'u01', lesson: 1 },
    daysDone: [false, false, false, false, false, false, false],
  },
  ...over,
});

// Right/wrong attempts in one category, timestamped recently.
const tries = (category, right, wrong, { errorClass = 'wrong-locant', at = NOW - DAY } = {}) => [
  ...Array.from({ length: right }, (_, i) => ({ category, correct: true, ts: at - i })),
  ...Array.from({ length: wrong }, (_, i) => ({ category, correct: false, errorClass, ts: at - i })),
];

console.log('=== each rule fires on the state built for it ===');
{
  ck(chooseHero(base(), view(), NOW).id === 'brand-new', 'rule 1: an empty state gets the first-step hero');

  const away = base({ attempts: tries('numbering', 8, 1, { at: NOW - 9 * DAY }), lastActiveAt: NOW - 9 * DAY });
  ck(chooseHero(away, view(), NOW).id === 're-entry', 'rule 3: nine days away earns the re-entry set');

  const cpReady = base({ attempts: tries('numbering', 5, 0), lastActiveAt: NOW - DAY });
  cpReady.progress.current = { unitId: 'u02', lesson: 5 };
  ck(chooseHero(cpReady, view(), NOW).id === 'checkpoint-ready', 'rule 4: sitting on the last lesson is a ready checkpoint');

  const exam = base({
    user: { name: 'T', examDate: NOW + 20 * DAY },
    attempts: tries('numbering', 22, 2),
    lastActiveAt: NOW - DAY,
  });
  exam.progress.current = { unitId: 'u02', lesson: 2 };
  const examHero = chooseHero(exam, view(), NOW);
  ck(examHero.id === 'exam-soon', 'rule 5: a supplied exam date inside 28 days, with evidence, gets exam prep');

  const done = base({ attempts: tries('numbering', 10, 0), lastActiveAt: NOW - DAY });
  done.progress.completedUnits = ['u01', 'u02', 'r01'];
  ck(chooseHero(done, view(), NOW).id === 'consolidate', 'rule 6: everything complete rolls to consolidation');

  const weak = base({ attempts: tries('numbering', 10, 6), lastActiveAt: NOW - DAY });
  weak.progress.current = { unitId: 'u02', lesson: 1 };
  const weakHero = chooseHero(weak, view(), NOW);
  ck(weakHero.id === 'weak-skill', 'rule 7: 6 of 16 wrong in one category is a real weakness');
  ck(weakHero.dest.focusCategory === 'numbering', 'and the focused set targets that category');
  ck(weakHero.dest.focusClass === 'wrong-locant', 'down to the named mistake');

  const mid = base({ attempts: tries('numbering', 6, 1), lastActiveAt: NOW - DAY });
  mid.progress.current = { unitId: 'u02', lesson: 3 };
  const midHero = chooseHero(mid, view(), NOW);
  ck(midHero.id === 'continue-mid', 'rule 8: recent and mid-unit continues the exact lesson');
  ck(midHero.support.includes('lesson 3 of 5'), 'with an honest lesson position, not an invented duration');

  const study = base({ attempts: tries('numbering', 6, 1), lastActiveAt: NOW - DAY });
  study.progress.current = { unitId: 'u02', lesson: 1 };
  const studyHero = chooseHero(study, view({ showReactions: false, units: U.filter((u) => u.id !== 'r01') }), NOW);
  ck(studyHero.id === 'naming-only', 'rule 9: the study build explains itself when the flag changed what is next');

  const run = base({ attempts: tries('numbering', 6, 1), lastActiveAt: NOW - DAY });
  run.progress.current = { unitId: 'u02', lesson: 1 };
  run.progress.daysDone = [false, true, true, true, false, false, false];
  ck(chooseHero(run, view(), NOW).id === 'streak-build', 'rule 10: a live run and a fresh unit gets the building hero');

  const fallback = base({ attempts: tries('numbering', 6, 1), lastActiveAt: NOW - DAY });
  fallback.progress.current = { unitId: 'u02', lesson: 1 };
  ck(chooseHero(fallback, view(), NOW).id === 'continue', 'rule 11: nothing special means plain continue');
}

console.log('=== the safeguards hold under attack ===');
{
  // Streak AND weakness both true: evidence must win.
  const both = base({ attempts: tries('numbering', 10, 6), lastActiveAt: NOW - DAY });
  both.progress.current = { unitId: 'u02', lesson: 1 };
  both.progress.daysDone = [true, true, true, true, false, false, false];
  ck(chooseHero(both, view(), NOW).id === 'weak-skill', 'streak never outranks learning evidence');

  // One wrong answer is not a weakness.
  const oneMiss = base({ attempts: tries('numbering', 3, 1), lastActiveAt: NOW - DAY });
  oneMiss.progress.current = { unitId: 'u02', lesson: 2 };
  ck(chooseHero(oneMiss, view(), NOW).id !== 'weak-skill', 'a single mistake never becomes a diagnosis');
  ck(leadingWeakness(tries('numbering', 3, 1), NOW) === null, 'the threshold function agrees');

  // High error rate but across DIFFERENT categories: not comparable evidence.
  const scattered = [...tries('numbering', 4, 2), ...tries('draw-molecule', 4, 2), ...tries('write-name', 4, 2)];
  ck(leadingWeakness(scattered, NOW) === null, 'errors scattered across categories never pool into one weakness');

  // No exam date: no exam mode, whatever the month.
  const noDate = base({ attempts: tries('numbering', 25, 2), lastActiveAt: NOW - DAY });
  noDate.progress.current = { unitId: 'u02', lesson: 2 };
  ck(chooseHero(noDate, view(), NOW).id !== 'exam-soon', 'no exam mode without a supplied exam date');

  // Demo attempts must be invisible to every rule.
  const demo = base({ attempts: tries('numbering', 10, 6).map((a) => ({ ...a, demo: true })) });
  ck(chooseHero(demo, view(), NOW).id === 'brand-new', 'demo data never masquerades as learner evidence');

  // Copy discipline: no shouting anywhere in any hero.
  const heroes = [
    chooseHero(base(), view(), NOW),
    chooseHero(both, view(), NOW),
    chooseHero(noDate, view(), NOW),
  ];
  const shouty = heroes.some((h) => /\b[A-Z]{4,}\b/.test(`${h.eyebrow} ${h.title} ${h.support} ${h.cta}`));
  ck(!shouty, 'no hero copy shouts');
  ck(heroes.every((h) => !/danger|behind|losing|hurry/i.test(h.support)), 'and none of it manufactures urgency');
}

console.log('=== stability and the evidence strip ===');
{
  const s = base({ attempts: tries('numbering', 10, 6), lastActiveAt: NOW - DAY });
  s.progress.current = { unitId: 'u02', lesson: 1 };
  const a = chooseHero(s, view(), NOW);
  const b = chooseHero(s, view(), NOW);
  ck(a.id === b.id && a.title === b.title, 'the same state always yields the same hero — no flicker');

  ck(streakFrom([true, true, true, false, false, false, false], 2) === 3, 'a three-day run counts as three');
  ck(streakFrom([true, true, false, false, false, false, false], 2) === 2, 'today unticked counts up to yesterday');
  ck(streakFrom([false, false, false, false, false, false, false], 3) === 0, 'no run is zero, not an error');

  ck(lastSessionEvidence(base(), NOW) === null, 'no attempts, no evidence line');
  const thin = base({ attempts: tries('numbering', 2, 1) });
  ck(lastSessionEvidence(thin, NOW) === null, 'three answers is noise, and noise is withheld');
  const full = base({ attempts: tries('numbering', 9, 3) });
  const line = lastSessionEvidence(full, NOW);
  ck(!!line && line.includes('12 questions') && line.includes('9 right'), 'a real session reads as plain counts');
}

console.log('=== rule 2: a failed checkpoint outranks continuing ===');
{
  // Failed the Alkanes checkpoint yesterday, mid-course, active recently:
  // without rule 2 this state would fall through to continue-mid.
  const failedState = base({
    lastActiveAt: NOW - 1 * DAY,
    lessonResults: { 'u01-cp': { pct: 0.6, right: 9, asked: 15, at: NOW - 1 * DAY } },
    progress: { completedUnits: [], current: { unitId: 'u01', lesson: 3 }, daysDone: [true, true, true, false, false, false, false] },
    attempts: [
      // the dominant named mistake: wrong-locant, three times
      ...[1, 2, 3].map((i) => ({ unitId: 'u01', category: 'numbering', correct: false, errorClass: 'wrong-locant', ts: NOW - 1 * DAY + i })),
      { unitId: 'u01', category: 'write-name', correct: false, errorClass: 'chain-selection', ts: NOW - 1 * DAY },
      ...[1, 2, 3, 4].map((i) => ({ unitId: 'u01', category: 'write-name', correct: true, ts: NOW - 1 * DAY + i })),
    ],
  });
  const h = chooseHero(failedState, view(), NOW);
  ck(h.id === 'checkpoint-repair', `a recent failed checkpoint wins the hero (got ${h.id})`);
  ck(/numbering/.test(h.title), 'and the repair names the dominant mistake in plain words');
  ck(h.dest.kind === 'practice' && h.dest.focusClass === 'wrong-locant', 'the tap goes to focused practice on that class');

  // The BEST-run semantics: once they pass, the old failure cannot linger.
  const passed = { ...failedState, lessonResults: { 'u01-cp': { pct: 0.87, right: 13, asked: 15, at: NOW - 1 * DAY } } };
  ck(chooseHero(passed, view(), NOW).id !== 'checkpoint-repair', 'a passed checkpoint never asks for repair');
  ck(0.87 >= CHECKPOINT_PASS, 'and the bar the test assumes is the bar the app uses');

  // Time-boxed: a failure from last month is not this week\u2019s business.
  const stale = { ...failedState, lessonResults: { 'u01-cp': { pct: 0.6, right: 9, asked: 15, at: NOW - 9 * DAY } } };
  ck(chooseHero(stale, view(), NOW).id !== 'checkpoint-repair', 'a failure older than six days stops steering the hero');

  // A completed unit means the door opened some other way (test-out): no nag.
  const doneAnyway = { ...failedState, progress: { ...failedState.progress, completedUnits: ['u01'] } };
  ck(chooseHero(doneAnyway, view(), NOW).id !== 'checkpoint-repair', 'a completed unit is never asked to repair its checkpoint');

  // One slip is not a pattern.
  ck(leadingErrorClass([{ correct: false, errorClass: 'wrong-locant', ts: NOW }], NOW) === null, 'a single mistake names no weakness');
  const generic = chooseHero({ ...failedState, attempts: [] }, view(), NOW);
  ck(generic.id === 'checkpoint-repair' && /rebuild/.test(generic.title), 'with no named pattern the copy stays generic, not invented');
}


console.log('=== exam-window boundaries ===');
{
  // 20 attempts of history so only the date decides.
  const history = Array.from({ length: 20 }, (_, i) => ({ category: 'write-name', correct: i % 3 > 0, ts: NOW - i * DAY / 4 }));
  const withDate = (examDate) =>
    chooseHero(base({ user: { name: 'T', examDate }, attempts: history, lastActiveAt: NOW - DAY,
      progress: { completedUnits: [], current: { unitId: 'u01', lesson: 2 }, daysDone: [true, true, true, false, false, false, false] } }), view(), NOW);
  ck(withDate(NOW + 20 * DAY).id === 'exam-soon', 'inside the four-week window: exam preparation');
  ck(withDate(NOW + 29 * DAY).id !== 'exam-soon', 'outside it: not yet — no premature exam pressure');
  ck(withDate(NOW - 1 * DAY).id !== 'exam-soon', 'a past date never drives the hero');
  const h = withDate(NOW + 20 * DAY);
  ck(!/timed|exam conditions/i.test(h.title + h.support), 'the copy promises nothing the app cannot deliver');
}


console.log(fails ? `\n${fails} FAILED\n` : '\nthe hero has an opinion, and every safeguard held\n');
process.exit(fails ? 1 : 0);
