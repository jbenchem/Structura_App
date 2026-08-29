// ─────────────────────────────────────────────────────────────
// The analytics model — every number and sentence on the Progress screen,
// as pure functions of (state, view, now). No JSX interprets data; the
// screen renders what this module concludes, and the suite pins what it
// concludes. From the redesign spec (docs/analytics-redesign), with one
// schema-forced deviation, stated where it happens.
//
// The three questions, in order: am I on track? what should I fix? what
// have I built?
// ─────────────────────────────────────────────────────────────

import { CHECKPOINT_PASS, leadingWeakness } from './heroDecision';

const DAY = 24 * 60 * 60 * 1000;
const MIN = 60 * 1000;

// ── Ground truth filters ─────────────────────────────────────

export const selectRealAttempts = (attempts) => (attempts || []).filter((a) => !a.demo);

// Reaction-thread skills, for naming-only exclusions and the coral accent.
export const REACTION_CATEGORIES = new Set([
  'predict-product',
  'pick-reagent',
  'classify-reaction',
  'complete-equation',
  'classify-carbon',
  'pathway',
]);

const isReactionAttempt = (a) =>
  (a.unitId && String(a.unitId).startsWith('r')) || REACTION_CATEGORIES.has(a.category);

// ── Course position ──────────────────────────────────────────
// A unit is secured when it is complete — and completion happens only by
// passing its checkpoint at CHECKPOINT_PASS, so "secured" and the copy's
// "checkpoint reached 80%" are the same fact. Only enabled units count:
// view.units is already the flag-gated list.

export function selectCoverage(progress, view) {
  const enabled = new Set(view.units.map((u) => u.id));
  const secured = (progress.completedUnits || []).filter((id) => enabled.has(id)).length;
  const total = enabled.size;
  return { secured, total, remaining: total - secured, ratio: total ? secured / total : 0 };
}

// Per-stage segments for the rail: [{stageN, done, count}]
export function railSegments(progress, view) {
  const completed = new Set(progress.completedUnits || []);
  return view.stages.map((st) => ({
    stageN: st.n,
    count: st.units.length,
    done: st.units.filter((u) => completed.has(u.id)).length,
  }));
}

// ── Checkpoint evidence ──────────────────────────────────────

export function selectCheckpointEvidence(lessonResults, view) {
  const rows = [];
  for (const cp of view.checkpoints) {
    const r = (lessonResults || {})[cp.lessonId];
    if (r) rows.push({ ...cp, pct: r.pct, at: r.at || 0 });
  }
  rows.sort((a, b) => b.at - a.at);
  return rows;
}

// ── The headline (spec §5 order, §6 exam window) ─────────────

const fmtDate = (ts) => {
  const d = new Date(ts);
  const M = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${d.getDate()} ${M[d.getMonth()]}`;
};

const calendarDaysBetween = (a, b) => {
  const A = new Date(a); A.setHours(0, 0, 0, 0);
  const B = new Date(b); B.setHours(0, 0, 0, 0);
  return Math.round((A - B) / DAY);
};

export function headlineFor({ state, view, coverage, cpEvidence, currentUnit }, now) {
  const real = selectRealAttempts(state.attempts);
  const brandNew =
    real.length === 0 && (state.progress.completedUnits || []).length === 0;
  if (brandNew) return { kind: 'brand-new' };

  if (coverage.remaining === 0 && coverage.total > 0) {
    return {
      kind: 'complete',
      lines: ['Your course coverage is complete. Recent answers can still guide consolidation.'],
    };
  }

  // Exam preparation: only from an explicitly set date, 1–28 days away.
  const examDate = state.user && state.user.examDate;
  if (examDate) {
    const days = calendarDaysBetween(examDate, now);
    if (days >= 1 && days <= 28) {
      const weeks = Math.max(1, Math.ceil(days / 7));
      const perWeek = coverage.remaining === 0 ? 0 : Math.ceil(coverage.remaining / weeks);
      return {
        kind: 'exam',
        chip: 'Exam preparation',
        lines: [
          `${coverage.remaining} remain before ${fmtDate(examDate)}. Covering them once means about ${perWeek} unit${perWeek === 1 ? '' : 's'} each week.`,
          'This is a coverage plan, not a predicted exam mark.',
        ],
      };
    }
  }

  const last = state.lastActiveAt || (real.length ? Math.max(...real.map((a) => a.ts || 0)) : null);
  if (last && calendarDaysBetween(now, last) >= 7) {
    return { kind: 'returning', lines: ['Welcome back. Everything you completed remains secured.'] };
  }

  // The current unit's checkpoint, attempted but under the bar.
  const currentCp = currentUnit
    ? cpEvidence.find((c) => c.unitId === currentUnit.id)
    : null;
  if (currentCp && currentCp.pct < CHECKPOINT_PASS) {
    return {
      kind: 'repair-pointer',
      lines: [
        `The ${currentUnit.title} checkpoint has not yet reached the 80% standard. A specific repair appears below.`,
      ],
    };
  }

  if (cpEvidence.length >= 2 && cpEvidence.slice(0, 3).every((c) => c.pct >= CHECKPOINT_PASS)) {
    return {
      kind: 'standard-met',
      lines: ['Your three most recent checkpoint best results meet the 80% standard.'],
    };
  }

  return {
    kind: 'current',
    lines: currentUnit ? [`Your current unit is ${currentUnit.title}.`] : [],
  };
}

// ── Error taxonomy (spec §7) ─────────────────────────────────

const NAMING_CATS = new Set([
  'write-name', 'name-structure', 'choose-structure', 'build-name',
  'numbering', 'parent-chain', 'reading', 'formula',
]);

// Raw error class → student-facing group. Unknown classes return null: they
// still count as wrong answers, but they never receive a guessed
// explanation.
export function errorGroupFor(errorClass, category) {
  const fixed = {
    'chain-selection': 'parent-chain',
    'wrong-locant': 'numbering-locants',
    'wrong-degree': 'carbon-classification',
    unbalanced: 'equation-balancing',
    'confused-condensation': 'reaction-recognition',
    'confused-substitution': 'reaction-recognition',
    'confused-addition': 'reaction-recognition',
    'confused-hydrolysis': 'reaction-recognition',
    'right-answer-wrong-reason': 'reasoning-alignment',
    'dead-end': 'reaction-pathway',
  };
  if (fixed[errorClass]) return fixed[errorClass];
  if (errorClass === 'reversed') {
    return NAMING_CATS.has(category) ? 'numbering-locants' : 'reaction-pathway';
  }
  if (errorClass === 'wrong-order' || errorClass === 'adjacent-swap') {
    return NAMING_CATS.has(category) ? 'name-order' : 'reaction-pathway';
  }
  return null;
}

const GROUP_META = {
  'parent-chain': { title: 'Parent-chain choice', verb: 'chose a different parent chain', cta: 'Practise parent chains' },
  'numbering-locants': { title: 'Numbering and locants', verb: 'slipped on numbering', cta: 'Practise numbering' },
  'name-order': { title: 'Name ordering', verb: 'ordered the name differently', cta: 'Practise name order' },
  'carbon-classification': { title: 'Carbon classification', verb: 'miscounted the carbon\u2019s neighbours', cta: 'Practise classification' },
  'reaction-pathway': { title: 'Reaction pathway', verb: 'reached a dead end', cta: 'Practise pathways' },
  'reaction-recognition': { title: 'Reaction recognition', verb: 'named a different reaction type', cta: 'Practise reaction types' },
  'equation-balancing': { title: 'Equation balancing', verb: 'let an atom go missing', cta: 'Practise balancing' },
  'reasoning-alignment': { title: 'Reasoning', verb: 'picked a right-sounding wrong reason', cta: 'Practise the reasoning' },
};

// ── The fix card (spec §7) ───────────────────────────────────

export function checkpointQuietUntil({ state, view, currentUnit }, now) {
  if (!currentUnit) return null;
  const cp = view.checkpoints.find((c) => c.unitId === currentUnit.id);
  const r = cp ? (state.lessonResults || {})[cp.lessonId] : null;
  if (!r || r.pct >= CHECKPOINT_PASS) return null;
  const latest = selectRealAttempts(state.attempts)
    .filter((a) => a.unitId === currentUnit.id)
    .reduce((m, a) => Math.max(m, a.ts || 0), 0);
  if (!latest) return null;
  const until = latest + 10 * MIN;
  return now < until ? until : null;
}

export function fixCardFor({ state, view, currentUnit }, now) {
  const real = selectRealAttempts(state.attempts);

  // A checkpoint result minutes old is reviewed, not diagnosed.
  const quietUntil = checkpointQuietUntil({ state, view, currentUnit }, now);
  if (quietUntil) {
    return {
      kind: 'quiet',
      title: 'Your checkpoint result is still fresh',
      body: 'Review the worked explanations before starting another focused set.',
      cta: 'Review checkpoint',
      dest: { kind: 'lesson', unitId: currentUnit.id },
    };
  }

  // The one evidence rule, owned by the recommendation engine. Not
  // duplicated, not loosened.
  const weak = leadingWeakness(real, now);
  if (!weak) {
    if (real.length < 10) {
      return {
        kind: 'insufficient',
        title: 'No reliable pattern yet',
        body: 'We wait for at least 10 comparable answers before suggesting focused practice.',
      };
    }
    return {
      kind: 'healthy',
      title: 'No repeated pattern needs focused practice right now',
      body: 'Continue with your current unit and this section will keep checking.',
    };
  }

  // Inside the engine-approved category: the newest 20 comparable raw
  // attempts, wrongs grouped by the taxonomy, and a group shown only when
  // it independently clears the same bar.
  const recent = real
    .filter((a) => a.category === weak.category)
    .sort((a, b) => (b.ts || 0) - (a.ts || 0))
    .slice(0, 20);
  const Y = recent.length;
  const groups = {};
  for (const a of recent) {
    if (a.correct) continue;
    const g = errorGroupFor(a.errorClass, a.category);
    if (g) groups[g] = (groups[g] || 0) + 1;
  }
  const top = Object.entries(groups).sort((x, y) => y[1] - x[1])[0];
  const skillLabel = (view.categoryLabel(weak.category) || weak.category).toLowerCase();

  if (top && Y >= 10 && top[1] >= 4 && top[1] / Y >= 0.35) {
    const [groupId, X] = top;
    const meta = GROUP_META[groupId];
    const reaction = REACTION_CATEGORIES.has(weak.category) || groupId.startsWith('reaction');
    return {
      kind: 'pattern',
      groupId,
      reaction,
      capsule: `${X} of ${Y}`,
      title: meta.title,
      body: `${X} of your last ${Y} ${skillLabel} answers ${meta.verb} \u2014 6 questions will steady ${groupId === 'reaction-pathway' ? 'the sequence' : 'it'}.`,
      cta: meta.cta,
      focusKey: `${weak.category}:general`,
      count: 6,
      category: weak.category,
    };
  }

  // The category clears the bar; no single mistake type does.
  return {
    kind: 'category',
    reaction: REACTION_CATEGORIES.has(weak.category),
    capsule: `${weak.errors} of ${weak.attempts}`,
    title: `${view.categoryLabel(weak.category) || weak.category} would benefit from practice`,
    body: `Your recent ${skillLabel} results meet the evidence rule, but the wrong answers do not share one clear mistake type.`,
    cta: `Practise ${skillLabel}`,
    focusKey: `${weak.category}:general`,
    count: 6,
    category: weak.category,
  };
}

// ── Answer trend (spec §8, schema deviation stated) ──────────
// DEVIATION, forced by the real schema: rollups here are lifetime
// per-subcategory sums with no weekStart, so they cannot enter a
// time-bucketed chart without inventing dates. The trend therefore reads
// RAW real attempts only — which the 30-day raw window covers for every
// bucket this chart can show. There is consequently no raw/rollup
// double-counting to guard against in the trend; that guard lives in
// skillsFor, where the merge actually happens.

const mondayOf = (ts) => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  const shift = (d.getDay() + 6) % 7;
  return d.getTime() - shift * DAY;
};
const dayOf = (ts) => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
const shortDate = (ts) => {
  const d = new Date(ts);
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${M[d.getMonth()]}`;
};
const DAYNAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function trendFor(state, view, now) {
  let rows = selectRealAttempts(state.attempts).filter((a) => a.ts);
  if (!view.showReactions) rows = rows.filter((a) => !isReactionAttempt(a));
  if (!rows.length) return null;

  const oldest = Math.min(...rows.map((a) => a.ts));
  const daily = (now - oldest) / DAY <= 13;
  const bucketOf = daily ? dayOf : mondayOf;
  const step = daily ? DAY : 7 * DAY;
  const n = daily ? 7 : 8;

  const start = bucketOf(now) - (n - 1) * step;
  const buckets = Array.from({ length: n }, (_, i) => ({
    key: start + i * step,
    label: daily ? DAYNAMES[new Date(start + i * step).getDay()] : shortDate(start + i * step),
    asked: 0,
    right: 0,
  }));
  for (const a of rows) {
    const k = bucketOf(a.ts);
    const b = buckets.find((x) => x.key === k);
    if (!b) continue;
    b.asked += 1;
    if (a.correct) b.right += 1;
  }
  // Leading empty buckets before the first answer are not history — trim
  // them so three days of use shows three days, not a week of dashes.
  const firstIdx = buckets.findIndex((b) => b.asked > 0);
  const shown = buckets.slice(Math.max(0, Math.min(firstIdx, n - 1)));
  return {
    mode: daily ? 'daily' : 'weekly',
    buckets: shown.map((b) => ({
      ...b,
      pct: b.asked ? Math.round((100 * b.right) / b.asked) : null,
      small: b.asked > 0 && b.asked < 5,
      empty: b.asked === 0,
    })),
  };
}

// ── Skills practised (spec §9) ───────────────────────────────
// The merge point of raw and rolled evidence. Rollups are per-subcategory
// lifetime sums of attempts that have LEFT the raw window, so raw + rollup
// never double-counts by construction — a row is in exactly one of them.
// Naming-only builds cannot split historical rollups that mixed naming
// skills practised inside reaction units, so they read raw only and say so.

export function skillsFor(state, view) {
  const totals = new Map(); // category → {asked, right}
  const add = (cat, asked, right) => {
    if (!cat) return;
    if (!view.showReactions && REACTION_CATEGORIES.has(cat)) return;
    const t = totals.get(cat) || { asked: 0, right: 0 };
    t.asked += asked;
    t.right += right;
    totals.set(cat, t);
  };

  let raw = selectRealAttempts(state.attempts);
  if (!view.showReactions) raw = raw.filter((a) => !isReactionAttempt(a));
  for (const a of raw) add(a.category, 1, a.correct ? 1 : 0);

  let omittedNote = false;
  const rollups = Object.values(state.rollups || {});
  if (view.showReactions) {
    for (const r of rollups) add(r.category, r.asked, r.right);
  } else if (rollups.length) {
    omittedNote = true; // archived sums cannot separate the threads
  }

  const rows = [...totals.entries()]
    .map(([category, t]) => ({
      category,
      label: view.categoryLabel(category) || category,
      icon: view.categoryIcon(category) || 'school-outline',
      reaction: REACTION_CATEGORIES.has(category),
      asked: t.asked,
      right: t.right,
      showPct: t.asked >= 5,
    }))
    .filter((r) => r.asked > 0)
    .sort((a, b) => b.asked - a.asked);
  return { rows, omittedNote };
}

// ── The whole screen ─────────────────────────────────────────

export function analyticsScreenModelFor(state, view, now = Date.now()) {
  const coverage = selectCoverage(state.progress, view);
  const currentUnit = view.unitById(state.progress.current && state.progress.current.unitId) || null;
  const cpEvidence = selectCheckpointEvidence(state.lessonResults, view);
  const headline = headlineFor({ state, view, coverage, cpEvidence, currentUnit }, now);

  if (headline.kind === 'brand-new') {
    return {
      mode: 'empty',
      namingOnly: !view.showReactions,
      firstUnit: view.units[0] || null,
    };
  }

  return {
    mode: 'full',
    namingOnly: !view.showReactions,
    coverage,
    segments: railSegments(state.progress, view),
    headline,
    fix: fixCardFor({ state, view, currentUnit }, now),
    trend: trendFor(state, view, now),
    skills: skillsFor(state, view),
    currentUnit,
  };
}
