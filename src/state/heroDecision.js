// ─────────────────────────────────────────────────────────────
// The Home hero decision engine.
//
// Home used to present four equal choices; now it has an opinion. This
// module IS that opinion: a priority-ordered rule table over the data the
// app actually holds, returning exactly one recommended action. First match
// wins, so the hero never flickers between recommendations mid-visit.
//
// The safeguards from the design brief are structural here, not aspirational:
//   • streak sits BELOW every learning-evidence rule, and no rule ever
//     phrases a streak as being in danger
//   • a "weakness" needs repeated comparable evidence (10+ attempts, 4+
//     errors, 35%+ error rate, inside 30 days) — never one wrong answer
//   • exam mode fires only off an exam date the learner actually supplied;
//     the app does not infer an exam from the calendar
//   • no manufactured durations: the app has no per-lesson timing data, so
//     copy counts lessons instead of inventing minutes
//
// Deviations from the design table, stated plainly:
//   • "checkpoint failed recently" (spec rule 2) reads lessonResults: the
//     store keeps each lesson's BEST run with a timestamp, and checkpoints
//     pass at CHECKPOINT_PASS — so "best is still under the bar, tried in
//     the last six days, unit still shut" is exactly a recent failure, and a
//     stale one cannot linger once they pass. The old note here claimed this
//     a small store addition if the distinction ever earns its keep.
//   • exam date (spec rule 5) has no setup UI yet, so the rule is present
//     but inert until state.user.examDate exists.
//
// Pure function of (state, curriculum view, now) — no imports from React,
// no reads of Date.now() — so the whole table is unit-testable with
// fabricated states, and tests/hero-decision.test.mjs walks every rule.
// ─────────────────────────────────────────────────────────────

const DAY = 24 * 60 * 60 * 1000;

// Consecutive daysDone ticks ending at today (or yesterday, so an unopened
// morning does not read as a broken run). daysDone is Mon..Sun for the
// current week, which caps a computed streak at seven — fine for the one
// rule that reads it, which only asks "is there any run at all".
// The checkpoint bar, owned here so the selector and the player cannot
// drift apart about what "passed" means.
export const CHECKPOINT_PASS = 0.8;

// The dominant named mistake in a recent window — no category gate, because
// a single checkpoint is ~15 questions spread across skills. Two of the same
// mistake is a pattern; one is a slip, and a slip earns no hero card.
export function leadingErrorClass(attempts, now, windowMs = 6 * DAY) {
  const counts = {};
  for (const a of attempts || []) {
    if (a.demo || a.correct || !a.errorClass) continue;
    if (now - (a.ts || 0) > windowMs) continue;
    counts[a.errorClass] = (counts[a.errorClass] || 0) + 1;
  }
  const top = Object.entries(counts).sort((x, y) => y[1] - x[1])[0];
  return top && top[1] >= 2 ? { errorClass: top[0], count: top[1] } : null;
}

const CLASS_LABEL = {
  'wrong-locant': 'numbering',
  'chain-selection': 'parent chains',
  'wrong-position': 'positions',
  'wrong-degree': 'the oxidation ladder',
  reversed: 'reaction direction',
  'dead-end': 'pathways',
  'wrong-order': 'pathway order',
  unbalanced: 'balancing',
  'confused-condensation': 'reaction types',
  'confused-substitution': 'reaction types',
  'confused-addition': 'reaction types',
};

export function streakFrom(daysDone, todayIdx) {
  if (!Array.isArray(daysDone) || todayIdx == null) return 0;
  let i = todayIdx;
  if (!daysDone[i]) i -= 1; // today not yet ticked: count up to yesterday
  let run = 0;
  while (i >= 0 && daysDone[i]) {
    run += 1;
    i -= 1;
  }
  return run;
}

// The leading error class over the recent log, held to the brief's evidence
// bar. Attempts are compared within their skill category, so ten drawing
// mistakes cannot manufacture a "numbering weakness".
export function leadingWeakness(attempts, now) {
  const recent = (attempts || []).filter(
    (a) => !a.demo && now - (a.ts || 0) <= 30 * DAY && a.category
  );
  const byCategory = new Map();
  for (const a of recent) {
    if (!byCategory.has(a.category)) byCategory.set(a.category, []);
    byCategory.get(a.category).push(a);
  }
  let best = null;
  for (const [category, rows] of byCategory) {
    if (rows.length < 10) continue; // too little comparable evidence
    const wrong = rows.filter((a) => !a.correct);
    if (wrong.length < 4) continue;
    const rate = wrong.length / rows.length;
    if (rate < 0.35) continue;
    // The dominant named mistake inside the weak category, if there is one.
    const classCounts = {};
    for (const a of wrong) if (a.errorClass) classCounts[a.errorClass] = (classCounts[a.errorClass] || 0) + 1;
    const topClass = Object.entries(classCounts).sort((x, y) => y[1] - x[1])[0] || null;
    if (!best || rate > best.rate) {
      best = { category, rate, errors: wrong.length, attempts: rows.length, errorClass: topClass ? topClass[0] : null };
    }
  }
  return best;
}

const label = (category) =>
  ({
    'write-name': 'naming',
    'name-structure': 'reading names',
    'choose-structure': 'reading structures',
    'draw-molecule': 'drawing',
    numbering: 'numbering',
    'parent-chain': 'parent chains',
    'predict-product': 'predicting products',
    'pick-reagent': 'choosing reagents',
    'classify-reaction': 'classifying reactions',
    'complete-equation': 'balancing equations',
    pathway: 'reaction pathways',
  }[category] || category);

// The table. `view` supplies everything curriculum-shaped so tests can hand
// in a three-unit course:
//   view = { units, fullUnits, showReactions, unitById(id), stageOfUnit(id) }
export function chooseHero(state, view, now = Date.now()) {
  const { progress = {}, attempts = [], user = {} } = state || {};
  const completed = progress.completedUnits || [];
  const current = progress.current || {};
  const unit = view.unitById(current.unitId) || view.units[0] || null;
  const stage = unit ? view.stageOfUnit(unit.id) : null;
  const real = attempts.filter((a) => !a.demo);
  const lastActive = state.lastActiveAt || (real.length ? Math.max(...real.map((a) => a.ts || 0)) : null);
  const hasHistory = real.length > 0 || completed.length > 0;

  const continueDest = unit ? { kind: 'lesson', unitId: unit.id } : { kind: 'learn' };
  const inStage = stage ? `${stage.title} · ` : '';

  // 1 · Brand new: nothing attempted, nothing completed.
  if (!hasHistory && (!unit || (current.lesson || 1) === 1) && completed.length === 0 && real.length === 0) {
    return {
      id: 'brand-new',
      eyebrow: 'Your first step',
      title: 'Start with the foundations',
      support: 'One short unit to learn how Catalyst works.',
      cta: 'Start the first unit',
      dest: continueDest,
    };
  }

  // 2 · A checkpoint tried in the last six days whose best run is still
  // under the bar, on a unit that is still shut. Most recent first, and the
  // repair set aims at the dominant named mistake if the log shows one.
  const results = state.lessonResults || {};
  const failedCp = (view.checkpoints || [])
    .map((cp) => ({ cp, r: results[cp.lessonId] }))
    .filter(
      ({ cp, r }) =>
        r &&
        r.pct < CHECKPOINT_PASS &&
        now - (r.at || 0) <= 6 * DAY &&
        !completed.includes(cp.unitId)
    )
    .sort((a, b) => (b.r.at || 0) - (a.r.at || 0))[0];
  if (failedCp) {
    const unitLog = real.filter((a) => a.unitId === failedCp.cp.unitId);
    const weak = leadingErrorClass(unitLog, now);
    const friendly = weak && CLASS_LABEL[weak.errorClass];
    return {
      id: 'checkpoint-repair',
      eyebrow: 'A useful next step',
      title: friendly
        ? `Let\u2019s repair ${friendly}`
        : `Let\u2019s rebuild that ${failedCp.cp.unitTitle} checkpoint`,
      support: friendly
        ? '6 focused questions from your checkpoint, then try it again.'
        : 'A short focused set from the checkpoint, then try it again.',
      cta: friendly ? `Practise ${friendly}` : 'Practise it',
      dest: {
        kind: 'practice',
        mode: 'mixed',
        focusUnitId: failedCp.cp.unitId,
        focusClass: weak ? weak.errorClass : null,
      },
    };
  }

  // 3 · Returning after a week or more.
  if (hasHistory && lastActive && now - lastActive >= 7 * DAY) {
    return {
      id: 're-entry',
      eyebrow: 'Welcome back',
      title: 'A quick re-entry',
      support: 'A short mixed set from where you were up to.',
      cta: 'Refresh',
      dest: { kind: 'practice', mode: 'mixed' },
    };
  }

  // 4 · Every lesson in the unit done; the checkpoint (its last lesson) waits.
  if (unit && unit.lessons > 1 && (current.lesson || 1) === unit.lessons) {
    return {
      id: 'checkpoint-ready',
      eyebrow: 'Stage progress',
      title: 'Your checkpoint is ready',
      support: `You\u2019ve finished every lesson in ${unit.title}.`,
      cta: 'Start the checkpoint',
      dest: continueDest,
    };
  }

  // 5 · A supplied exam date inside 28 days, with real evidence to draw on.
  if (user.examDate && user.examDate - now >= 0 && user.examDate - now <= 28 * DAY && real.length >= 20) {
    return {
      id: 'exam-soon',
      eyebrow: 'Exam preparation',
      // Honest about what the tap delivers: mixed practice. The app has no
      // timer, so the card must not promise one.
      title: 'Sharpen the topics you miss most',
      support: 'Short mixed sets, every day between now and the exam.',
      cta: 'Start practising',
      dest: { kind: 'practice', mode: 'mixed' },
    };
  }

  // 6 · Everything enabled is complete.
  if (view.units.length > 0 && view.units.every((u) => completed.includes(u.id))) {
    return {
      id: 'consolidate',
      eyebrow: 'Keep it durable',
      title: 'Consolidate what you\u2019ve learned',
      support: 'A mixed set weighted to what you\u2019ve seen least recently.',
      cta: 'Consolidate',
      dest: { kind: 'practice', mode: 'mixed' },
    };
  }

  // 7 · A weakness with real evidence behind it. (Also carries spec rule 2.)
  const weak = leadingWeakness(attempts, now);
  if (weak) {
    return {
      id: 'weak-skill',
      eyebrow: 'A useful next step',
      title: `${label(weak.category).replace(/^./, (c) => c.toUpperCase())} needs another look`,
      support: `${weak.errors} of your last ${weak.attempts} ${label(weak.category)} answers went wrong \u2014 a short focused set will help.`,
      cta: 'Practise it',
      dest: { kind: 'practice', mode: 'mixed', focusCategory: weak.category, focusClass: weak.errorClass },
    };
  }

  // 8 · Mid-unit and recent: continue the exact lesson.
  if (unit && (current.lesson || 1) > 1 && lastActive && now - lastActive <= 6 * DAY) {
    return {
      id: 'continue-mid',
      eyebrow: 'Continue learning',
      title: unit.title,
      support: `${inStage}lesson ${current.lesson} of ${unit.lessons}.`,
      cta: 'Continue',
      dest: continueDest,
    };
  }

  // 9 · Study build: reactions are off AND the flag changed what comes next.
  if (!view.showReactions && unit) {
    const fullIdx = view.fullUnits.findIndex((u) => u.id === unit.id);
    const fullNext = view.fullUnits[fullIdx + 1];
    if (fullNext && fullNext.id.startsWith('r')) {
      return {
        id: 'naming-only',
        eyebrow: 'Continue learning',
        title: 'Continue your naming pathway',
        support: 'Reactions are hidden in this study build.',
        cta: 'Continue',
        dest: continueDest,
      };
    }
  }

  // 10 · A live run of days, a fresh unit ahead. Streak never outranks
  // evidence: every rule above beats it, and the copy celebrates rather
  // than threatens.
  const streak = streakFrom(progress.daysDone, view.todayIdx);
  if (streak >= 2 && unit && (current.lesson || 1) === 1) {
    return {
      id: 'streak-build',
      eyebrow: 'Keep building',
      title: unit.title,
      support: `${inStage}day ${streak + 1} in a row \u2014 a new unit is ready.`,
      cta: 'Start the unit',
      dest: continueDest,
    };
  }

  // 11 · The default: continue, plainly.
  return {
    id: 'continue',
    eyebrow: 'Continue learning',
    title: unit ? unit.title : 'Continue the course',
    support: unit ? `${inStage}lesson ${current.lesson || 1} of ${unit.lessons}.` : 'Pick up the pathway where you left it.',
    cta: 'Continue',
    dest: continueDest,
  };
}

// The evidence strip: at most one factual line, withheld until it is
// actually evidence. Facts only — counts, not judgements.
export function lastSessionEvidence(state, now = Date.now()) {
  const real = (state.attempts || []).filter((a) => !a.demo && a.ts);
  if (!real.length) return null;
  const latest = Math.max(...real.map((a) => a.ts));
  if (now - latest > 14 * DAY) return null;
  const dayStart = new Date(latest);
  dayStart.setHours(0, 0, 0, 0);
  const session = real.filter((a) => a.ts >= dayStart.getTime());
  if (session.length < 4) return null; // below this it is noise, not a session
  const right = session.filter((a) => a.correct).length;
  return `Last session \u00b7 ${session.length} questions \u00b7 ${right} right`;
}
