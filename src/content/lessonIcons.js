// ─────────────────────────────────────────────────────────────
// A representative molecule per topic, used as the mark on the results
// screen. These are real structures drawn by the same renderer as everything
// else — a lesson on alcohols shows an alcohol.
//
// Adding a topic here is all that is needed for its lessons to get their own
// mark; anything unlisted falls back to a plain chain.
// ─────────────────────────────────────────────────────────────

import { buildTarget, Cn, chainBonds } from '../chem/questions';

const chain = (n) => buildTarget(Cn(n), chainBonds(n));

export const TOPIC_MOLECULE = {
  alkanes: { mol: chain(4), tint: '#E4F1F3' },
  alkenes: { mol: buildTarget(Cn(4), chainBonds(4, { 2: 2 })), tint: '#E3EEFB' },
  'functional-groups': {
    mol: buildTarget([...Cn(3), 'O'], [...chainBonds(3), [1, 3]]),
    tint: '#FBE9E9',
  },
  alcohols: {
    mol: buildTarget([...Cn(3), 'O'], [...chainBonds(3), [1, 3]]),
    tint: '#FBE9E9',
  },
  carbonyls: {
    mol: buildTarget([...Cn(3), 'O'], [...chainBonds(3), [1, 3, 2]]),
    tint: '#F6E9FB',
  },
  aromatics: { mol: chain(6), tint: '#EFE9FB' },
  stereochemistry: { mol: buildTarget(Cn(4), chainBonds(4, { 2: 2 })), tint: '#E9F5EC' },
};
