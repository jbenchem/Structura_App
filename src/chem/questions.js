// ─────────────────────────────────────────────────────────────
// Draw-question bank. Each question carries full metadata
// (foundation #2) and a target molecular graph built from a
// compact spec — coordinates are auto-generated (only the graph
// matters for checking).
//
// Spec: atoms as element list; bonds as [i, j, order].
// ─────────────────────────────────────────────────────────────

import { newId, BOND_LENGTH } from './model';
import { tidy } from '../sandbox/layout';

export function buildTarget(els, bondSpecs) {
  const atoms = els.map((el, i) => ({
    id: `t${i}`,
    el,
    // zigzag layout, unused by the checker but harmless to have
    x: i * BOND_LENGTH * 0.87,
    y: (i % 2) * BOND_LENGTH * 0.5,
    charge: 0,
    showH: false,
  }));
  const bonds = bondSpecs.map(([a, b, order], i) => ({
    id: `tb${i}`,
    a: `t${a}`,
    b: `t${b}`,
    order: order || 1,
    stereo: null,
  }));
  // The row-of-atoms placement above is only a scaffold: a branch bonded back
  // to the chain would stretch across the whole molecule. tidy lays it out
  // properly, and is identity-preserving so the molecule is unchanged.
  const raw = { atoms, bonds };
  if (atoms.length < 2) return raw;
  try {
    return tidy(raw);
  } catch (e) {
    return raw;
  }
}

export const Cn = (n) => Array(n).fill('C');
export const chainBonds = (n, orders = {}) =>
  Array.from({ length: n - 1 }, (_, i) => [i, i + 1, orders[i + 1] || 1]);

// Question schema: id, name (IUPAC target), prompt, level, topics,
// difficulty, qType, target graph.
export const DRAW_QUESTIONS = [
  {
    id: 'dq-butane',
    name: 'butane',
    level: 'VCE',
    topics: ['alkanes'],
    difficulty: 1,
    target: buildTarget(Cn(4), chainBonds(4)),
  },
  {
    id: 'dq-2-methylbutane',
    name: '2-methylbutane',
    level: 'VCE',
    topics: ['alkanes'],
    difficulty: 2,
    target: buildTarget(Cn(5), [...chainBonds(4), [1, 4, 1]]),
  },
  {
    id: 'dq-22-dimethylpropane',
    name: '2,2-dimethylpropane',
    level: 'VCE',
    topics: ['alkanes'],
    difficulty: 3,
    target: buildTarget(Cn(5), [
      [0, 1, 1],
      [1, 2, 1],
      [1, 3, 1],
      [1, 4, 1],
    ]),
  },
  {
    id: 'dq-but-2-ene',
    name: 'but-2-ene',
    level: 'VCE',
    topics: ['alkenes'],
    difficulty: 1,
    target: buildTarget(Cn(4), chainBonds(4, { 2: 2 })),
  },
  {
    id: 'dq-pent-1-ene',
    name: 'pent-1-ene',
    level: 'VCE',
    topics: ['alkenes'],
    difficulty: 1,
    target: buildTarget(Cn(5), chainBonds(5, { 1: 2 })),
  },
  {
    id: 'dq-3-methylpent-2-ene',
    name: '3-methylpent-2-ene',
    level: 'VCE',
    topics: ['alkenes'],
    difficulty: 2,
    // C1=C2 chain of 5 with double 2-3 and methyl on C3
    target: buildTarget(Cn(6), [...chainBonds(5, { 2: 2 }), [2, 5, 1]]),
  },
  {
    id: 'dq-2-methylbut-2-ene',
    name: '2-methylbut-2-ene',
    level: 'VCE',
    topics: ['alkenes'],
    difficulty: 2,
    target: buildTarget(Cn(5), [...chainBonds(4, { 2: 2 }), [1, 4, 1]]),
  },
  {
    id: 'dq-hex-2-ene',
    name: 'hex-2-ene',
    level: 'VCE',
    topics: ['alkenes'],
    difficulty: 2,
    target: buildTarget(Cn(6), chainBonds(6, { 2: 2 })),
  },
  {
    id: 'dq-23-dimethylbut-2-ene',
    name: '2,3-dimethylbut-2-ene',
    level: 'VCE',
    topics: ['alkenes'],
    difficulty: 3,
    target: buildTarget(Cn(6), [...chainBonds(4, { 2: 2 }), [1, 4, 1], [2, 5, 1]]),
  },
  {
    id: 'dq-but-1-yne',
    name: 'but-1-yne',
    level: 'VCE',
    topics: ['alkenes'],
    difficulty: 2,
    target: buildTarget(Cn(4), chainBonds(4, { 1: 3 })),
  },
];

// Build a session's worth of questions from the practice config.
export function pickDrawQuestions({ level, topics, count }) {
  const pool = DRAW_QUESTIONS.filter(
    (q) => q.level === level && q.topics.some((t) => topics.includes(t))
  );
  const source = pool.length ? pool : DRAW_QUESTIONS;
  const shuffled = [...source].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count || 10, shuffled.length));
}

// ─────────────────────────────────────────────────────────────
// Name questions (structure-to-name): show the molecule, type
// the IUPAC name. Derived from the draw bank plus its own
// entries; `accept` lists tolerated alternative spellings.
// ─────────────────────────────────────────────────────────────

export function normalizeName(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[\u2010-\u2015\u2212]/g, '-') // any dash variant -> hyphen
    .replace(/\s+/g, '')
    .replace(/\.+$/, '');
}

const ACCEPT_ALTS = {
  'but-2-ene': ['2-butene'],
  'pent-1-ene': ['1-pentene'],
  'hex-2-ene': ['2-hexene'],
  '3-methylpent-2-ene': ['3-methyl-2-pentene'],
  '2-methylbut-2-ene': ['2-methyl-2-butene'],
  '2,3-dimethylbut-2-ene': ['2,3-dimethyl-2-butene'],
  'but-1-yne': ['1-butyne'],
};

export const NAME_QUESTIONS = DRAW_QUESTIONS.map((q) => ({
  id: q.id.replace('dq-', 'nq-'),
  name: q.name,
  accept: [q.name, ...(ACCEPT_ALTS[q.name] || [])],
  level: q.level,
  topics: q.topics,
  difficulty: q.difficulty,
  target: q.target,
}));

export function checkName(input, question) {
  const norm = normalizeName(input);
  return question.accept.some((a) => normalizeName(a) === norm);
}

export function pickNameQuestions({ level, topics, count }) {
  const pool = NAME_QUESTIONS.filter(
    (q) => q.level === level && q.topics.some((t) => topics.includes(t))
  );
  const source = pool.length ? pool : NAME_QUESTIONS;
  const shuffled = [...source].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count || 10, shuffled.length));
}

// Mixed sessions interleave draw + name questions, each tagged
// with a kind so the session controller renders the right screen.
export function pickMixedQuestions({ level, topics, count }) {
  const draws = pickDrawQuestions({ level, topics, count }).map((q) => ({ ...q, kind: 'draw' }));
  const names = pickNameQuestions({ level, topics, count }).map((q) => ({ ...q, kind: 'name' }));
  const merged = [...draws, ...names].sort(() => Math.random() - 0.5);
  return merged.slice(0, Math.min(count || 10, merged.length));
}
