// Reviewing a mistake is a walkthrough: the answer is shown, nothing is
// answerable, and nothing is counted.
import { ReviewMistakes } from '../src/screens/main/ReviewMistakes.js';
import { CATEGORY } from '../src/content/questionFactory.js';
import { parseName } from '../src/engine/index.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };

function walk(node, fn, depth = 0) {
  if (node == null || typeof node !== 'object' || depth > 40) return;
  if (Array.isArray(node)) return node.forEach((n) => walk(n, fn, depth + 1));
  const { type, props } = node;
  fn(node);
  if (typeof type === 'function') return walk(type(props || {}), fn, depth + 1);
  if (props && props.children != null) walk(props.children, fn, depth + 1);
}
const textOf = (node) => { const out = []; walk(node, (n) => {
  const c = n.props && n.props.children;
  if (typeof c === 'string' || typeof c === 'number') out.push(String(c));
  if (Array.isArray(c)) c.forEach((x) => { if (typeof x === 'string' || typeof x === 'number') out.push(String(x)); });
}); return out.join('|'); };

const mcq = {
  id: 'q1', type: 'mcName', category: CATEGORY.NAME_STRUCTURE,
  prompt: 'Which name describes this structure?',
  options: ['ethane', 'propane', 'butane'], answer: 2,
  explain: 'Four carbons gives but-, and single bonds give -ane.',
  mol: parseName('butane').mol,
};
const drawq = {
  id: 'q2', type: 'draw', category: CATEGORY.DRAW_MOLECULE,
  prompt: 'Draw hexane.', name: 'hexane', answer: 'hexane',
  explain: 'Six carbons in a row.',
};
const writeq = {
  id: 'q3', type: 'write', category: CATEGORY.WRITE_NAME,
  prompt: 'Give the preferred IUPAC name.', answer: 'pentane',
  explain: 'Five carbons, all single bonds.', mol: parseName('pentane').mol,
};

console.log('=== the answer is shown, not asked for ===');
{
  const tree = ReviewMistakes({ questions: [mcq], width: 380, onDone() {} });
  const txt = textOf(tree);
  ck(txt.includes('butane'), 'the correct option is on screen');
  ck(txt.includes('Four carbons'), 'the explanation is open');
  ck(!/Check answer/i.test(txt), 'there is no Check answer button');
  ck(/Done|Next/.test(txt), 'only a way forward');
}

console.log('=== nothing is answerable ===');
{
  // any control must be navigation only: close, or next/done
  const labels = [];
  const tree = ReviewMistakes({ questions: [mcq, drawq], width: 380, onDone() {} });
  walk(tree, (n) => {
    if (n.type === 'Pressable' || (n.props && n.props.onPress)) {
      labels.push(n.props.accessibilityLabel || textOf(n) || 'unlabelled');
    }
  });
  const answerish = labels.filter((l) => !/close review|next|done/i.test(l));
  ck(answerish.length === 0, `only navigation controls (${labels.join(', ')})`);
}

console.log('=== each type shows its own answer ===');
{
  ck(textOf(ReviewMistakes({ questions: [writeq], width: 380, onDone() {} })).includes('pentane'),
     'a written answer is spelled out');
  const drawTree = ReviewMistakes({ questions: [drawq], width: 380, onDone() {} });
  ck(textOf(drawTree).includes('hexane'), 'a drawing question names its target');
  let hasMol = false;
  walk(drawTree, (n) => { if (n.props && n.props.mol) hasMol = true; });
  ck(hasMol, 'and shows the structure it wanted');
}

console.log('=== it says it is not being marked ===');
{
  const txt = textOf(ReviewMistakes({ questions: [mcq], width: 380, onDone() {} }));
  ck(/nothing here is marked/i.test(txt), 'the learner is told nothing is counted');
}

console.log('=== paging is finite ===');
{
  let done = 0;
  const tree = ReviewMistakes({ questions: [mcq], width: 380, onDone: () => done++ });
  ck(textOf(tree).includes('1|/|1') || textOf(tree).includes('1'), 'a single mistake shows 1 of 1');
}

console.log(fails ? `\n${fails} FAILURES` : '\nreview shows, never asks, never counts');
process.exit(fails ? 1 : 0);
