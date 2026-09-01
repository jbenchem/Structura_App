// ─────────────────────────────────────────────────────────────
// Typed-name matching with spelling leniency — and a chemistry guard.
//
// The rule the user asked for: a final submission whose spelling is ~80%
// right should pass. The rule chemistry demands on top: one letter can BE
// the chemistry (butane/butene, pentanal/pentanol, propan-1-ol/propan-2-ol),
// so leniency may forgive TYPING, never a different molecule. Three fences:
//
//   1 · If the typed string PARSES as a real IUPAC name, ask the engine
//       WHICH compound: the same one as the answer (a spelling variant the
//       parser forgave, like "butan") passes; a different one is wrong.
//       Real chemistry is never "close".
//   2 · Digits are locants. They must match exactly, in order. propan-1-ol
//       typed as propan-2-ol is wrong by exactly one character and wrong
//       by exactly one compound.
//   2b· Carbon-count stems (meth, eth, prop, but, pent …) must appear in the
//       same order. "ethylpropane" for "methylpropane" is one letter off
//       and a different substituent; the stems say so when the parser
//       cannot, because neither string is a legal name.
//   3 · Only then, letters-only similarity ≥ 80% (transpositions count as
//       one slip — "methly" is the classic typo), capped at three edits so
//       a long name cannot absorb four scattered mistakes.
//
// A lenient pass is still a pass, but it says so, and shows the spelling.
// ─────────────────────────────────────────────────────────────

import { normalizeName } from '../chem/questions';
import { parseName } from './questionFactory';

// Optimal-string-alignment distance: Levenshtein plus adjacent
// transposition as a single edit.
export function editDistance(a, b) {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const d = Array.from({ length: m + 1 }, (_, i) => {
    const row = new Array(n + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[m][n];
}

export const LENIENCY = { ratio: 0.8, maxEdits: 3 };

// Longest stems first so "meth" is matched before the "eth" inside it; the
// scan resumes after each match, so the inner "eth" is never re-read.
const STEM_RE = /meth|hept|pent|prop|eth|but|hex|oct|non|dec/g;
export const stemsOf = (name) => (name.match(STEM_RE) || []).join(',');

export function matchTypedName(expected, typed, accept = null) {
  const targets = [expected, ...(Array.isArray(accept) ? accept : [])]
    .filter(Boolean)
    .map(normalizeName);
  const nt = normalizeName(typed);
  if (!nt) return { correct: false, lenient: false, reason: 'empty' };
  if (targets.includes(nt)) return { correct: true, lenient: false };

  // Fence 1: a parseable name is real chemistry — of which compound?
  // parseName returns { ok:false } (truthy!) for gibberish, so the test is
  // ok === true, and the verdict is the engine's canonical name.
  const canon = (name) => {
    try {
      const r = parseName(name);
      return r && r.ok === true ? normalizeName(r.canonical || r.name || '') : null;
    } catch (e) {
      return null;
    }
  };
  const typedCanon = canon(nt);
  if (typedCanon) {
    const same = targets.some((ne) => canon(ne) === typedCanon || ne === typedCanon);
    return same
      ? { correct: true, lenient: true }
      : { correct: false, lenient: false, reason: 'different-name' };
  }

  // Fences 2 and 3, against the closest accepted form.
  let best = null;
  for (const ne of targets) {
    if (nt.replace(/\D/g, '') !== ne.replace(/\D/g, '')) continue; // locants
    if (stemsOf(nt) !== stemsOf(ne)) continue; // carbon-count stems
    const le = ne.replace(/[^a-z]/g, '');
    const lt = nt.replace(/[^a-z]/g, '');
    const dist = editDistance(le, lt);
    const ratio = 1 - dist / Math.max(le.length, lt.length, 1);
    if (ratio >= LENIENCY.ratio && dist <= LENIENCY.maxEdits && (!best || dist < best.dist)) {
      best = { dist };
    }
  }
  if (best) return { correct: true, lenient: true };
  return { correct: false, lenient: false, reason: 'too-different' };
}
