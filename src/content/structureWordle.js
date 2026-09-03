// ─────────────────────────────────────────────────────────────
// Structure puzzle — the formula is given, the structure is the answer.
//
// A guess is scored on the DECISIONS a name is made of, not on positions:
// a molecule is a graph, so "right letter, wrong place" has no meaning, but
// "right functional group, wrong locant" has a precise one. The five rows
// are the same choices the course teaches and the same faults the analytics
// name, so a wrong guess drills the taxonomy the app already uses.
//
// Answer spaces are enumerated by the engine and capped: every shipped
// puzzle is proved solvable within its guess budget by an actual solver in
// the suite, never assumed to be.
//
// Acyclic only, by construction — skeletons are built as trees.
// ─────────────────────────────────────────────────────────────

import { nameGraph } from '../engine/index.js';
import { prettify } from '../chem/prettify';
import { parentCarbons } from './workedSolution';

// ── Enumeration ──────────────────────────────────────────────

// Every carbon tree with n carbons, as edge lists. Trees, so never cyclic.
function carbonSkeletons(n) {
  const out = [];
  const build = (edges, count) => {
    if (count === n) {
      out.push(edges.slice());
      return;
    }
    for (let parent = 0; parent < count; parent++) {
      const degree = edges.filter(([a, b]) => a === parent || b === parent).length;
      if (degree >= 4) continue;
      build([...edges, [parent, count]], count + 1);
    }
  };
  build([], 1);
  return out;
}

const molFrom = (nC, edges, extra = {}) => {
  const atoms = Array.from({ length: nC }, (_, i) => ({ id: i + 1, x: 0, y: 0, el: 'C' }));
  const bonds = edges.map(([a, b]) => ({ a: a + 1, b: b + 1, order: 1, stereo: null }));
  if (extra.oxygenOn != null) {
    atoms.push({ id: nC + 1, x: 0, y: 0, el: 'O' });
    bonds.push({ a: extra.oxygenOn + 1, b: nC + 1, order: extra.order || 1, stereo: null });
  }
  if (extra.etherBond) {
    const [a, b] = extra.etherBond;
    const idx = bonds.findIndex((x) => (x.a === a + 1 && x.b === b + 1) || (x.a === b + 1 && x.b === a + 1));
    if (idx < 0) return null;
    bonds.splice(idx, 1);
    atoms.push({ id: nC + 1, x: 0, y: 0, el: 'O' });
    bonds.push({ a: a + 1, b: nC + 1, order: 1, stereo: null });
    bonds.push({ a: nC + 1, b: b + 1, order: 1, stereo: null });
  }
  return { atoms, bonds };
};

// Every acyclic molecule the engine will name, built from n carbons and at
// most one oxygen: alkanes, alcohols, ethers, aldehydes and ketones. Keyed
// by molecular formula, then by name — the namer is the deduplicator.
export function enumerateAcyclic(nC, { withOxygen = true } = {}) {
  const byFormula = new Map();
  const add = (raw) => {
    if (!raw) return;
    const r = nameGraph(raw);
    if (!r || !r.ok) return;
    const f = byFormula.get(r.formula) || new Map();
    if (f.has(r.name)) return;
    let mol = raw;
    try { mol = prettify(raw); } catch (e) { mol = raw; }
    f.set(r.name, mol);
    byFormula.set(r.formula, f);
  };

  for (const edges of carbonSkeletons(nC)) {
    add(molFrom(nC, edges));                                   // alkane
    if (!withOxygen) continue;
    for (let c = 0; c < nC; c++) {
      add(molFrom(nC, edges, { oxygenOn: c, order: 1 }));       // alcohol
      add(molFrom(nC, edges, { oxygenOn: c, order: 2 }));       // aldehyde / ketone
    }
    for (const [a, b] of edges) add(molFrom(nC, edges, { etherBond: [a, b] })); // ether
  }
  return byFormula;
}

// ── Scoring ──────────────────────────────────────────────────

const FAMILY_OF_NAME = (n) => {
  if (/oic acid$/.test(n)) return 'carboxylic acid';
  if (/oate$/.test(n)) return 'ester';
  if (/al$/.test(n)) return 'aldehyde';
  if (/one$/.test(n)) return 'ketone';
  if (/ol$/.test(n)) return 'alcohol';
  if (/ether$|oxy/.test(n)) return 'ether';
  if (/ene$/.test(n)) return 'alkene';
  if (/yne$/.test(n)) return 'alkyne';
  if (/ane$/.test(n)) return 'alkane';
  return 'other';
};

// The locant of the principal group, or null where the family has none.
const groupLocant = (n) => {
  const m = n.match(/-(\d+)-(ol|one|amine)/);
  return m ? Number(m[1]) : null;
};

const substituentsOf = (n) =>
  (String(n).match(/(methyl|ethyl|propyl|butyl)/g) || []).sort().join(',');

export const STATE = { HIT: 'hit', NEAR: 'near', MISS: 'miss' };

// Five rows, each a decision the name encodes.
export function scoreGuess(answerName, guessName) {
  const solved = answerName === guessName;
  const aC = parentCarbons(answerName), gC = parentCarbons(guessName);
  const aF = FAMILY_OF_NAME(answerName), gF = FAMILY_OF_NAME(guessName);
  const aL = groupLocant(answerName), gL = groupLocant(guessName);
  const aS = substituentsOf(answerName), gS = substituentsOf(guessName);

  const chain = {
    key: 'chain',
    label: 'Parent chain',
    value: `${gC} carbons`,
    state: gC === aC ? STATE.HIT : STATE.MISS,
    // A direction turns guessing into deduction, which is what makes a
    // ten-guess budget honest.
    hint: gC === aC ? null : gC > aC ? 'shorter' : 'longer',
  };
  const group = {
    key: 'group',
    label: 'Functional group',
    value: gF,
    state: gF === aF ? STATE.HIT : STATE.MISS,
    hint: null,
  };
  const position = {
    key: 'position',
    label: 'Group position',
    value: gL == null ? '—' : `carbon ${gL}`,
    // Yellow means exactly one thing: the right group in the wrong place.
    state:
      aL == null && gL == null
        ? STATE.HIT
        : gF !== aF
        ? STATE.MISS
        : gL === aL
        ? STATE.HIT
        : STATE.NEAR,
    hint: gF === aF && gL != null && aL != null && gL !== aL ? (gL > aL ? 'lower' : 'higher') : null,
  };
  const subs = {
    key: 'subs',
    label: 'Branches',
    value: gS || 'none',
    state: gS === aS ? STATE.HIT : gS && aS ? STATE.NEAR : STATE.MISS,
    hint: null,
  };

  return { solved, rows: [chain, group, position, subs] };
}

// ── Atom-level feedback ──────────────────────────────────────
//
// The same four judgements, attached to the atoms the student actually
// drew, so the canvas carries the feedback rather than a table beside it.
// The engine's own name parts say which atoms are the chain, which are the
// group and which are the branches — no re-derivation, no guessing.
//
//   hit   this part is right
//   near  the right functional group in the wrong place
//   miss  wrong
//
// Every atom in the guess gets a state, so nothing is left unexplained.
export function annotateGuess(answerName, guessMol) {
  const r = nameGraph(guessMol);
  if (!r || !r.ok) {
    return { ok: false, reason: r && r.issue ? r.issue : 'That structure could not be named.', atoms: {} };
  }
  const score = scoreGuess(answerName, r.name);
  const row = (k) => score.rows.find((x) => x.key === k);

  const parts = r.parts || [];
  const parent = parts.find((p) => p.kind === 'parent');
  const suffix = parts.find((p) => p.kind === 'suffix');
  const subs = parts.filter((p) => p.kind === 'substituent');

  const atoms = {};
  // Chain atoms take the chain verdict.
  for (const id of (parent && parent.atoms) || []) atoms[id] = row('chain').state;
  // Branch atoms take the branch verdict.
  for (const sub of subs) for (const id of sub.atoms || []) atoms[id] = row('subs').state;
  // The functional group wins over the chain on its own atoms: it is the
  // most specific thing the student chose, and the one carrying NEAR.
  if (suffix) {
    const groupRow = row('group');
    const posRow = row('position');
    const state =
      groupRow.state !== STATE.HIT ? STATE.MISS : posRow.state === STATE.HIT ? STATE.HIT : STATE.NEAR;
    for (const id of suffix.atoms || []) atoms[id] = state;
  }
  // Anything the name did not account for (a lone heteroatom in an ether,
  // say) is judged by the group row rather than left blank.
  for (const a of guessMol.atoms || []) {
    if (atoms[a.id] === undefined) atoms[a.id] = row('group').state;
  }

  return {
    ok: true,
    name: r.name,
    solved: score.solved,
    rows: score.rows,
    atoms,
    // A one-line reading of the canvas, for screen readers and the history.
    summary: score.solved
      ? `${r.name} — solved.`
      : [
          row('chain').state === STATE.HIT ? 'chain right' : `chain ${row('chain').hint}`,
          row('group').state === STATE.HIT ? 'group right' : 'wrong group',
          row('position').state === STATE.NEAR ? `group misplaced, try ${row('position').hint}` : null,
        ]
          .filter(Boolean)
          .join(' · '),
  };
}

// Two names are indistinguishable to a guesser when they score identically
// against every guess — the partition key a solver reasons with.
export const feedbackKey = (answerName, guessName) =>
  scoreGuess(answerName, guessName).rows.map((r) => `${r.state}${r.hint || ''}`).join('|');

// ── The shipped puzzles ──────────────────────────────────────

// Ten guesses, which is generous: the suite proves every puzzle below is
// solvable in five or fewer by a perfect player, so the budget forgives
// several genuine mistakes rather than merely being survivable.
export const GUESS_BUDGET = 10;

// Formula, carbons to enumerate from, and the difficulty order a learner
// meets them in. Answer spaces are capped at fourteen candidates: beyond
// that the puzzle stops being deduction and starts being bookkeeping.
export const PUZZLES = [
  { formula: 'C3H8O', nC: 3, label: 'Three carbons, one oxygen' },
  { formula: 'C4H10', nC: 4, label: 'Four carbons' },
  { formula: 'C4H8O', nC: 4, label: 'Four carbons, one oxygen' },
  { formula: 'C5H12', nC: 5, label: 'Five carbons' },
  { formula: 'C4H10O', nC: 4, label: 'Four carbons, one oxygen' },
  { formula: 'C5H10O', nC: 5, label: 'Five carbons, one oxygen' },
  { formula: 'C6H14', nC: 6, label: 'Six carbons' },
  { formula: 'C5H12O', nC: 5, label: 'Five carbons, one oxygen' },
  { formula: 'C6H12O', nC: 6, label: 'Six carbons, one oxygen' },
];

export const MAX_CANDIDATES = 14;

// The answer set for a puzzle: every acyclic structure with that formula,
// enumerated and named by the engine.
export function puzzleAnswers(puzzle) {
  const byFormula = enumerateAcyclic(puzzle.nC);
  const m = byFormula.get(puzzle.formula);
  return m ? [...m.keys()] : [];
}

// One puzzle a day, deterministic from the date — the same mechanic as the
// molecule of the day, so two students can compare a result grid.
export function puzzleOfTheDay(now = Date.now(), pool = PUZZLES) {
  const day = Math.floor(
    Date.UTC(new Date(now).getFullYear(), new Date(now).getMonth(), new Date(now).getDate()) / 86400000
  );
  const puzzle = pool[((day % pool.length) + pool.length) % pool.length];
  const answers = puzzleAnswers(puzzle);
  if (!answers.length) return null;
  return {
    day,
    puzzle,
    answers,
    // The day's answer, chosen from its own set — every candidate is a
    // legitimate answer, so no puzzle is unfair.
    answer: answers[Math.abs((day * 2654435761) % answers.length)],
    budget: GUESS_BUDGET,
  };
}

// ── Solving, so the budget is a fact ─────────────────────────

// Worst-case guesses for a perfect player: at each step choose the guess
// that minimises the largest surviving group, and recurse. Exact for the
// small answer spaces we ship.
export function worstCaseGuesses(names, budget = 10) {
  const solve = (candidates, depth) => {
    if (candidates.length <= 1) return candidates.length === 0 ? 0 : 1;
    if (depth > budget) return Infinity;
    let best = Infinity;
    for (const guess of names) {
      const buckets = new Map();
      for (const c of candidates) {
        if (c === guess) continue;
        const k = feedbackKey(c, guess);
        buckets.set(k, (buckets.get(k) || []).concat(c));
      }
      // A guess that separates nothing cannot help.
      const groups = [...buckets.values()];
      if (groups.length <= 1 && groups[0] && groups[0].length === candidates.length) continue;
      let worst = 0;
      for (const g of groups) {
        const d = solve(g, depth + 1);
        if (d + 1 > worst) worst = d + 1;
        if (worst >= best) break;
      }
      if (worst < best) best = worst;
      if (best === 1) break;
    }
    return best;
  };
  return solve(names, 1);
}
