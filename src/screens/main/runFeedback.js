// ─────────────────────────────────────────────────────────────
// Run feedback — what the verdict shows beyond right/wrong, as pure logic.
//
// `run` is the player's summary BEFORE this answer: consecutive corrects so
// far (streak), right/asked so far, and whether this is the last question.
// From that and this answer's correctness:
//
//   streakNow   consecutive corrects including this one (0 on a miss)
//   showStreak  the "n-in-a-row!" pill, from two upwards
//   milestone   a big burst: every fifth in a row, or a perfect finish
//   gold        the golden box: the LAST answer of a run with no misses
//
// Gold means one thing in this app — a flawless run — so it can never
// appear mid-lesson, nor at the end of a run that dropped one.
// ─────────────────────────────────────────────────────────────

export function verdictExtras({ correct, run, last }) {
  const streakBefore = (run && run.streak) || 0;
  const rightBefore = (run && run.right) || 0;
  const askedBefore = (run && run.asked) || 0;
  const streakNow = correct ? streakBefore + 1 : 0;
  const flawlessSoFar = rightBefore === askedBefore;
  const gold = !!(correct && last && flawlessSoFar);
  const milestone = !!(correct && (gold || (streakNow >= 5 && streakNow % 5 === 0)));
  return {
    streakNow,
    showStreak: correct && streakNow >= 2,
    streakLabel: `${streakNow}-in-a-row!`,
    milestone,
    gold,
  };
}

// The pill waits half a second so the verdict lands first and the streak
// reads as a second beat, not part of the same thud.
export const STREAK_DELAY_MS = 500;
