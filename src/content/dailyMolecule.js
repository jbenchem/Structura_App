// ─────────────────────────────────────────────────────────────
// Molecule of the day.
//
// One structure a day, the same for everyone, chosen deterministically from
// the date — no server, no fetch. The pick is made by walking a curated list
// of names through the ENGINE: if it does not parse and name back to itself,
// it is skipped rather than shown, so the daily molecule can never be a
// compound the app cannot justify.
//
// The derivation comes from workedSolution, so the "why" behind the day's
// molecule is the same explanation the sandbox gives.
// ─────────────────────────────────────────────────────────────

import { parseName, nameGraph } from '../engine/index.js';
import { workedSolution } from './workedSolution';
import { familyOf } from './questionFactory';

// A spread across families and difficulty, in the engine's OWN canonical
// spelling — "propanone" is a real name but the engine says propan-2-one,
// and an entry that does not name back to itself is dead weight the picker
// silently skips. The suite holds the whole pool to that standard.
export const DAILY_POOL = [
  '2-methylbutane', '2,2-dimethylpropane', 'hexane', '3-methylpentane',
  '2,3-dimethylbutane', 'but-1-ene', 'but-2-ene', '2-methylprop-1-ene',
  'propan-1-ol', 'propan-2-ol', 'butan-2-ol', '2-methylpropan-2-ol',
  'ethanal', 'propanal', 'propan-2-one', 'butan-2-one',
  'ethanoic acid', 'propanoic acid', 'methyl ethanoate', 'ethyl ethanoate',
  'chloroethane', '1,2-dichloroethane', 'bromomethane', '2-chloropropane',
  'ethan-1-amine', 'propan-1-amine', 'ethanamide', 'propanenitrile',
  'cyclohexane', 'benzene', 'methylbenzene', 'but-2-yne',
  'pent-1-ene', 'pentan-3-one', 'butanoic acid', '2-methylbutan-1-ol',
];

// Days since epoch in LOCAL time: the molecule changes at local midnight,
// not at UTC midnight in the middle of an Australian afternoon.
export function dayNumber(now = Date.now()) {
  const d = new Date(now);
  return Math.floor(
    (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000
  );
}

// A cheap, stable hash so consecutive days are not neighbours in the list.
const spread = (n, len) => ((n * 2654435761) % len + len) % len;

// Which chemistry a learner has actually met: the families taught by the
// units they have completed. A daily challenge from a family they have
// never seen is a trick, not a test — so the pick is restricted to what the
// course has already covered, and falls back to alkanes on day one.
export function metFamilies(state, view) {
  const done = new Set((state.progress && state.progress.completedUnits) || []);
  const fams = new Set(['alkane']);
  for (const u of (view && view.units) || []) {
    if (!done.has(u.id)) continue;
    for (const l of u.lessonList || []) {
      for (const q of l.pool || []) if (q.family) fams.add(q.family);
    }
  }
  return fams;
}

export function moleculeOfTheDay(now = Date.now(), pool = DAILY_POOL, allowedFamilies = null) {
  const day = dayNumber(now);
  // Walk from the day's slot until a name verifies AND belongs to chemistry
  // the learner has met. A bad or unmet entry costs one step, never a
  // broken card and never an unfair question.
  for (let i = 0; i < pool.length; i++) {
    const name = pool[spread(day + i, pool.length)];
    const p = parseName(name);
    if (!p || !p.ok || !p.mol) continue;
    const r = nameGraph(p.mol);
    if (!r || !r.ok || r.name !== name) continue; // must name back to itself
    if (allowedFamilies && !allowedFamilies.has(familyOf(p.mol))) continue;
    return {
      day,
      name: r.name,
      mol: p.mol,
      formula: r.formula,
      mass: r.mass,
      family: familyOf(p.mol),
      work: workedSolution(p.mol),
    };
  }
  return null;
}

// The challenge state for a day: unattempted, or answered with the result
// kept so the card cannot be farmed by retrying.
export function dailyStatus(state, now = Date.now()) {
  const day = dayNumber(now);
  const rec = (state && state.dailyChallenge) || null;
  if (!rec || rec.day !== day) return { day, answered: false };
  return { day, answered: true, correct: !!rec.correct, given: rec.given || null };
}
