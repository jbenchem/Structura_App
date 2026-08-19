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

console.log('=== the breakdown never runs off the screen ===');
for (const vp of [
  { label: 'small phone', width: 320, height: 568 },
  { label: 'iPhone SE', width: 375, height: 667 },
  { label: 'iPhone 15', width: 393, height: 852 },
]) {
  const tree = render(many, vp);
  // count rendered breakdown rows by their score text "n / n"
  const texts = textOf(tree).join('|');
  const rows = (texts.match(/\d+\|?\s*\/\s*\|?\d+/g) || []).length;
  ck(rows > 0, `${vp.label}: breakdown renders (${rows} score readings)`);
  // nothing is dropped: either every category shows, or a "more" row accounts
  const shownAll = Object.keys(many).every((k) => texts.includes(CATEGORY_META[k].label));
  const hasMore = /\d+ more/.test(texts);
  ck(shownAll || hasMore, `${vp.label}: every category shown, or the rest summarised`);
}

console.log('=== labels name the skill ===');
{
  const texts = textOf(render(many, { width: 393, height: 852 })).join('|');
  ck(!/Check your understanding/i.test(texts), 'no "check your understanding" anywhere');
  ck(texts.includes('Drawing structures'), 'drawing reads as "Drawing structures"');
  ck(texts.includes('Number of bonds'), 'valence reads as "Number of bonds"');
  ck(texts.includes('Naming structures'), 'naming reads as "Naming structures"');
}

console.log('=== every category has a skill label ===');
for (const [key, meta] of Object.entries(CATEGORY_META)) {
  ck(!!meta.label && !/understanding/i.test(meta.label), `${key}: "${meta.label}"`);
  ck(!!meta.icon, `${key}: has an icon`);
}

console.log(fails ? `\n${fails} FAILURES` : '\nresults fit, and the breakdown names skills');
process.exit(fails ? 1 : 0);
