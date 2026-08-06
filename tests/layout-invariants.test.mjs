// The rule: every part of a question must be reachable. Either it fits the
// screen, or it scrolls. It must never overflow silently, because the last
// option then sits behind the Check answer button.
import { questionSizing, estimateHeight } from '../src/screens/main/questionSizing.js';
import { QuestionShell } from '../src/screens/main/QuestionViews.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };

const flat = (style) => (Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style || {});
function findAll(node, typeName, out = [], depth = 0) {
  if (node == null || typeof node !== 'object' || depth > 40) return out;
  if (Array.isArray(node)) { node.forEach((n) => findAll(n, typeName, out, depth + 1)); return out; }
  const { type, props } = node;
  if (type === typeName) out.push(node);
  if (typeof type === 'function') { findAll(type(props || {}), typeName, out, depth + 1); return out; }
  if (props && props.children != null) findAll(props.children, typeName, out, depth + 1);
  return out;
}

// the narrowest and shortest devices the app claims to support, plus the
// device-frame presets rendered on web
const DEVICES = [
  { label: 'small phone', width: 320, height: 568 },
  { label: 'iPhone SE', width: 375, height: 667 },
  { label: 'SE in the web frame at 88%', width: 330, height: 587 },
  { label: 'iPhone 15', width: 393, height: 852 },
  { label: 'Android', width: 412, height: 915 },
];

const KINDS = ['mcName', 'mcStructure', 'write', 'number', 'correctName', 'buildName', 'compareNames', 'countTap'];

console.log('=== every question either fits or scrolls ===');
for (const d of DEVICES) {
  const z = questionSizing(d);
  for (const kind of KINDS) {
    const est = estimateHeight(kind, z, 4);
    const fits = est <= z.available;
    const shell = QuestionShell({
      q: { chip: 'X', prompt: 'p', explain: 'e', type: kind, options: ['1', '2', '3', '4'] },
      children: null, canCheck: false, checked: false, correct: false,
      onCheck() {}, onContinue() {}, last: false,
    });
    const areas = findAll(shell, 'ScrollView');
    ck(areas.length === 1, `${d.label} / ${kind}: content is inside a scroll area, so nothing can hide`);
    if (areas.length) {
      const st = flat(areas[0].props.style);
      const cc = flat(areas[0].props.contentContainerStyle);
      ck(st.minHeight === 0, `${d.label} / ${kind}: scroll area can shrink (minHeight 0)`);
      ck(cc.flexGrow === 1, `${d.label} / ${kind}: fills the screen when it fits (flexGrow 1)`);
      ck((cc.paddingBottom || 0) >= 12, `${d.label} / ${kind}: content clears the button`);
    }
    if (!fits) console.log(`       (${kind} on ${d.label} needs ${est.toFixed(0)} of ${z.available.toFixed(0)} — will scroll)`);
  }
}

console.log('=== canvas questions never scroll ===');
{
  const shell = QuestionShell({
    q: { chip: 'X', prompt: 'p', explain: 'e', type: 'draw' },
    children: null, canCheck: true, checked: false, correct: false,
    onCheck() {}, onContinue() {}, last: false, scroll: false,
  });
  ck(findAll(shell, 'ScrollView').length === 0, 'the canvas measures itself, so no scroll wrapper');
}

console.log(fails ? `\n${fails} FAILURES` : '\nevery question is fully reachable on every supported size');
process.exit(fails ? 1 : 0);
