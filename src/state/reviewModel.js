// ─────────────────────────────────────────────────────────────
// Review your mistakes.
//
// The attempt log records what KIND of question was missed — its category,
// its chemistry family, and the engine's classification of the fault — but
// not the card itself, because pool questions are drawn fresh every run.
// So this is not a replay of old questions; it is a targeted set of the
// same kind. That is the better lesson anyway: re-answering a card you were
// shown the answer to measures memory, not naming.
//
// Everything is pure and reads only real attempts (never demo rows), so the
// review board can be tested without a screen.
// ─────────────────────────────────────────────────────────────

const DAY = 24 * 60 * 60 * 1000;

export const CLASS_LABEL = {
  'wrong-locant': 'Numbering and locants',
  'chain-selection': 'Choosing the parent chain',
  'wrong-degree': 'The oxidation ladder',
  'wrong-position': 'Positions',
  reversed: 'Reaction direction',
  'dead-end': 'Pathways',
  'wrong-order': 'Order within the name',
  'adjacent-swap': 'Order within the name',
  unbalanced: 'Balancing equations',
  'confused-condensation': 'Telling reaction types apart',
  'confused-substitution': 'Telling reaction types apart',
  'confused-addition': 'Telling reaction types apart',
  'right-answer-wrong-reason': 'Reasoning',
  other: 'Mixed practice',
};

export const selectRealAttempts = (attempts) => (attempts || []).filter((a) => a && !a.demo);

// A group is one fault in one family: "numbering, on alkenes". That is the
// unit a student can actually practise.
export function missedGroups(state, { showReactions = true, windowDays = 30 } = {}, now = Date.now()) {
  const real = selectRealAttempts(state.attempts);
  const map = new Map();
  for (const a of real) {
    if (a.correct) continue;
    if (now - (a.ts || 0) > windowDays * DAY) continue;
    if (!showReactions && /pathway|reaction|predict|reagent|equation|classify/.test(a.category || '')) continue;
    const cls = a.errorClass || 'other';
    const key = `${cls}::${a.family || 'general'}`;
    const g = map.get(key) || {
      key,
      errorClass: cls,
      family: a.family || null,
      category: a.category || null,
      label: CLASS_LABEL[cls] || CLASS_LABEL.other,
      misses: 0,
      lastTs: 0,
    };
    g.misses += 1;
    g.lastTs = Math.max(g.lastTs, a.ts || 0);
    map.set(key, g);
  }

  // How many of this kind have been answered right SINCE the last miss —
  // the evidence that it is mending, and the reason a group retires.
  for (const g of map.values()) {
    g.rightSince = real.filter(
      (a) => a.correct && (a.family || 'general') === (g.family || 'general') && (a.ts || 0) > g.lastTs
    ).length;
  }

  // Worth practising while it is still fresh and still unfixed: most misses
  // first, recency breaking ties.
  return [...map.values()]
    .filter((g) => g.misses >= 2 && g.rightSince < 3)
    .sort((a, b) => b.misses - a.misses || b.lastTs - a.lastTs);
}

// Spacing: a group just practised is not offered again immediately, and one
// left alone for a fortnight is overdue. Pure arithmetic, no scheduler.
export function reviewDueAt(group, now = Date.now()) {
  const gap = group.misses >= 5 ? 1 * DAY : group.misses >= 3 ? 2 * DAY : 4 * DAY;
  return (group.lastTs || now) + gap;
}
export const isDue = (group, now = Date.now()) => reviewDueAt(group, now) <= now;

export function reviewSummary(state, view, now = Date.now()) {
  const groups = missedGroups(state, view, now);
  const due = groups.filter((g) => isDue(g, now));
  return {
    groups,
    due,
    total: groups.reduce((a, g) => a + g.misses, 0),
    // Nothing to review is a real state, and a good one — say so rather
    // than showing an empty list.
    clear: groups.length === 0,
  };
}
