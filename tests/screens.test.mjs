// Every top-level screen, deep-rendered with real app state.
//
// This suite exists because the Sandbox screen shipped a white screen: it had
// never been rendered in a test, only its canvas had. A screen that throws on
// mount is the worst failure the app can have, and it is also the cheapest to
// catch.
import { Sandbox } from '../src/screens/main/Sandbox.js';
import { Home } from '../src/screens/main/Home.js';
import { Learn } from '../src/screens/main/Learn.js';
import { Practice } from '../src/screens/main/Practice.js';
import { Progress } from '../src/screens/main/Progress.js';
import { Account } from '../src/screens/main/Account.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };

// Mirrors the real initial state closely enough that a screen reading a field
// the app provides does not fail here for the wrong reason.
const baseState = (over = {}) => ({
  user: { name: 'Sam', goal: 'vce' },
  savedMolecules: [],
  attempts: [],
  entitlement: {},
  devFlags: {},
  // Mirrors seedProgress() in the store. Divergence here would make screens
  // fail in tests for reasons the app never has, which is worse than no test.
  progress: {
    completedUnits: [],
    current: { unitId: 'u01-alkanes', lesson: 1 },
    weekActivity: [1, 0, 2, 0, 0, 3, 0],
    daysDone: [true, false, true, false, false, true, false],
    skills: [
      { id: 'nomenclature', label: 'Nomenclature', mastered: 3, total: 16 },
      { id: 'drawing', label: 'Structure drawing', mastered: 1, total: 16 },
    ],
  },
  perfectLessons: [],
  lessonResults: {},
  ...over,
});

const withState = (state, isPremium = true) => {
  globalThis.__ctx = {
    state,
    dispatch: () => {},
    isPremium,
    daysRemaining: () => 7,
    isPremiumActive: () => isPremium,
  };
};

function deep(node, d = 0) {
  if (node == null || typeof node !== 'object' || d > 60) return;
  if (Array.isArray(node)) return node.forEach((n) => deep(n, d + 1));
  const { type, props } = node;
  if (typeof type === 'function') return deep(type(props || {}), d + 1);
  if (props && props.children != null) deep(props.children, d + 1);
}

const render = (label, fn) => {
  try { deep(fn()); ck(true, label); }
  catch (e) { ck(false, `${label} — ${e.message}`); }
};

const noop = () => {};

console.log('=== every screen, fresh install ===');
withState(baseState());
render('Home', () => Home({ openLesson: noop, goPractice: noop, goSandbox: noop }));
render('Learn', () => Learn({ openLesson: noop }));
render('Practice', () => Practice({ startSession: noop, prefill: null }));
render('Progress', () => Progress({ goPractice: noop, practiceFocus: noop }));
render('Account', () => Account({ openRedeem: noop }));
render('Sandbox', () => Sandbox({ openRedeem: noop, onExit: noop }));

console.log('=== Sandbox with saved molecules ===');
{
  // the state that broke: a saved molecule rendered as a thumbnail
  const graph = {
    atoms: [{ id: 1, x: 0, y: 0 }, { id: 2, x: 56, y: 32 }, { id: 3, x: 112, y: 0 }],
    bonds: [{ a: 1, b: 2, order: 1, stereo: null }, { a: 2, b: 3, order: 1, stereo: null }],
  };
  withState(baseState({ savedMolecules: [{ id: 'm1', name: 'propane', graph, ts: Date.now() }] }));
  render('Sandbox (one saved)', () => Sandbox({ openRedeem: noop, onExit: noop }));

  // and the defensive case: an entry from an older build with no graph
  withState(baseState({ savedMolecules: [{ id: 'm2', name: 'legacy', ts: Date.now() }] }));
  render('Sandbox (saved entry with no graph)', () => Sandbox({ openRedeem: noop, onExit: noop }));
}

console.log('=== Progress with real attempt data ===');
{
  const mk = (sub, cat, ok, err) => ({ subcategory: sub, category: cat, correct: ok, errorClass: err });
  withState(baseState({ attempts: [
    ...Array(5).fill(0).map((_, i) => mk('draw-molecule:alkene', 'draw-molecule', i < 1, 'chain-selection')),
    ...Array(5).fill(0).map(() => mk('write-name:alkane', 'write-name', true, null)),
  ] }));
  render('Progress (with attempts)', () => Progress({ goPractice: noop, practiceFocus: noop }));
}

console.log('=== a fresh account is told what to do, not shown blanks ===');
{
  withState(baseState({ attempts: [] }));
  const out = [];
  const collect = (node, d = 0) => {
    if (node == null || typeof node !== 'object' || d > 60) return;
    if (Array.isArray(node)) return node.forEach((n) => collect(n, d + 1));
    const { type, props } = node;
    if (props && typeof props.children === 'string') out.push(props.children);
    if (typeof type === 'function') return collect(type(props || {}), d + 1);
    if (props && props.children != null) collect(props.children, d + 1);
  };
  try {
    collect(Progress({ goPractice: noop, practiceFocus: noop, openLesson: noop }));
    const text = out.join(' ');
    // The redesigned zero-data state: a launch ramp, not a placeholder — the
    // pathway hero plus the promise of what evidence will unlock.
    ck(/Your pathway starts here/.test(text), 'an empty Progress screen is a launch ramp');
    ck(/Start Foundations/.test(text), '  with the first unit one tap away');
    ck(/What will appear here/.test(text), '  and an honest preview of what evidence unlocks');
    ck(!/0 of 40|0 of 30/.test(text), '  never a zero-of-forty scoreline');
  } catch (e) {
    ck(false, `empty Progress threw: ${e.message}`);
  }
}

console.log('=== locked / non-premium ===');
withState(baseState(), false);
render('Sandbox (locked)', () => Sandbox({ openRedeem: noop, onExit: noop }));
render('Progress (locked)', () => Progress({ goPractice: noop, practiceFocus: noop }));

console.log(fails ? `\n${fails} FAILURES` : '\nevery screen mounts');
process.exit(fails ? 1 : 0);
