// The results screen must fit the screen. Scrolling to find out how you did is
// a poor reward for finishing a lesson.
import { LessonResults } from '../src/screens/main/LessonResults.js';
import { CATEGORY, CATEGORY_META } from '../src/content/questionFactory.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };

function findAll(node, pred, out = [], depth = 0) {
  if (node == null || typeof node !== 'object' || depth > 40) return out;
  if (Array.isArray(node)) { node.forEach((n) => findAll(n, pred, out, depth + 1)); return out; }
  const { type, props } = node;
  if (pred(node)) out.push(node);
  if (typeof type === 'function') { findAll(type(props || {}), pred, out, depth + 1); return out; }
  if (props && props.children != null) findAll(props.children, pred, out, depth + 1);
  return out;
}
const textOf = (node, out = [], depth = 0) => {
  if (node == null || depth > 40) return out;
  if (typeof node === 'string' || typeof node === 'number') { out.push(String(node)); return out; }
  if (Array.isArray(node)) { node.forEach((n) => textOf(n, out, depth + 1)); return out; }
  if (typeof node !== 'object') return out;
  const { type, props } = node;
  if (typeof type === 'function') { textOf(type(props || {}), out, depth + 1); return out; }
  if (props && props.children != null) textOf(props.children, out, depth + 1);
  return out;
};

const many = {
  [CATEGORY.NAME_STRUCTURE]: { right: 3, asked: 3 },
  [CATEGORY.CHOOSE_STRUCTURE]: { right: 2, asked: 2 },
  [CATEGORY.WRITE_NAME]: { right: 2, asked: 3 },
  [CATEGORY.DRAW_MOLECULE]: { right: 1, asked: 2 },
  [CATEGORY.BONDS]: { right: 1, asked: 1 },
  [CATEGORY.HYDROGENS]: { right: 1, asked: 2 },
  [CATEGORY.FORMULA]: { right: 0, asked: 1 },
};

const render = (byCategory, viewport) => {
  globalThis.__viewport = viewport;
  return LessonResults({
    unit: { title: 'Alkanes', topics: ['alkanes'], lessonList: [{ id: 'a' }, { id: 'b' }] },
    lesson: { id: 'a', title: 'Atoms and bonds' },
    score: { right: 10, asked: 14 },
    byCategory,
    elapsedMs: 61000,
    unitProgress: { done: 1, total: 2 },
    onContinue() {}, onReview() {}, onClose() {},
  });
};

const VIEWPORTS = [
  { label: 'small phone', width: 320, height: 568, fontScale: 1 },
  { label: 'iPhone SE', width: 375, height: 667, fontScale: 1 },
  { label: 'iPhone 15', width: 393, height: 852, fontScale: 1 },
  { label: 'Galaxy A35', width: 384, height: 854, fontScale: 1 },
  { label: 'Galaxy A35 (large text)', width: 384, height: 854, fontScale: 1.3 },
];

console.log('=== the breakdown lives on Progress now, not here ===');
for (const vp of VIEWPORTS) {
  const tree = render(many, vp);
  const texts = textOf(tree);
  // The results page keeps the moment — score, streak, celebration — and
  // sends the analysis to the Progress tab, where the same numbers sit
  // beside their trend. No per-skill rows, no "n / n" score readings beyond
  // the headline, on any viewport.
  ck(!texts.includes('Question breakdown'), `${vp.label}: no breakdown section on the results page`);
  const skillRows = texts.filter((t) => /^\d+ \/ \d+$/.test(t)).length;
  ck(skillRows === 0, `${vp.label}: no per-skill score rows (${skillRows})`);
}

{
  // And the analysis genuinely lives on the other side: the analytics model
  // serves per-skill rows with the same category labels the results page
  // used to show.
  const { skillsFor } = await import('../src/state/analyticsModel.js');
  const state = {
    attempts: Object.entries(many).flatMap(([category, v]) =>
      Array.from({ length: v.asked }, (_, i) => ({ category, correct: i < v.right, ts: Date.now() - i }))
    ),
    rollups: {},
  };
  const view = { showReactions: true, categoryLabel: (c) => (CATEGORY_META[c] || {}).label, categoryIcon: () => 'square' };
  const { rows } = skillsFor(state, view);
  ck(rows.length > 0, 'the Progress tab serves the per-skill rows instead');
  ck(rows.some((r) => r.label === 'Drawing structures'), 'and drawing still reads as "Drawing structures" there');
}

console.log(fails ? `\n${fails} FAILURES` : '\nresults keep the moment; Progress keeps the analysis');
process.exit(fails ? 1 : 0);
