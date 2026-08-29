// ─────────────────────────────────────────────────────────────
// Practice gating — who can practise what, and what starts selected.
//
// Practice topics are chemistry FAMILIES, but the curriculum unlocks UNITS,
// so the bridge is: a family belongs to the first unit whose pools teach it.
// That map is DERIVED from the pools rather than authored, so it cannot
// drift from the content — add an ether unit earlier and ethers move with
// it, no table to forget.
//
// The rules, per the brief:
//   • Topics whose intro unit is COMPLETED start selected, for everyone —
//     the default set is "what you've finished", ready to go.
//   • Topics whose intro unit is still LOCKED are greyed for everyone.
//     Free users cannot select them; Plus users can (practising ahead is a
//     reasonable thing to pay for; being taught in order remains free).
//   • An empty selection means "everything" — everything YOU can select.
//     For a free user that is the unlocked families, so "just start" can
//     never quietly serve questions from untaught chemistry.
//
// Pure functions of plain data throughout, so the suite can exercise every
// branch without mounting a screen.
// ─────────────────────────────────────────────────────────────

// family → the id of the first unit (in course order) whose lesson pools
// contain a question of that family.
export function familyIntroUnits(units) {
  const intro = new Map();
  for (const u of units) {
    for (const lesson of u.lessonList || []) {
      for (const q of lesson.pool || []) {
        if (q.family && !intro.has(q.family)) intro.set(q.family, u.id);
      }
    }
  }
  return intro;
}

// One topic's standing. statusOf answers for a UNIT id; completedUnits is
// the progress list. A family with no intro unit (question pools outside
// the course) is treated as unlocked so it can never brick the screen.
export function topicAccess(topicId, { introOf, statusOf, completedUnits, isPremium }) {
  const unitId = introOf.get(topicId) || null;
  const locked = unitId ? statusOf(unitId) === 'locked' : false;
  return {
    id: topicId,
    unitId,
    locked,
    completed: unitId ? completedUnits.includes(unitId) : false,
    selectable: !locked || !!isPremium,
  };
}

// The whole board at once: per-topic access, the default selection
// (completed topics), and what an empty selection means for this user.
export function classifyTopics(topicIds, ctx) {
  const access = topicIds.map((id) => topicAccess(id, ctx));
  return {
    access: Object.fromEntries(access.map((a) => [a.id, a])),
    defaults: access.filter((a) => a.completed).map((a) => a.id),
    // Empty selection expands to this. Premium: everything (empty stays
    // empty, which downstream means "all pools"). Free: the selectable set,
    // spelled out, so locked families are excluded by construction.
    emptyMeans: ctx.isPremium ? [] : access.filter((a) => a.selectable).map((a) => a.id),
  };
}
