// A render fault must not leave a white screen.
//
// Three faults shipped from this codebase in one week — a missing import each
// time, invisible until the screen was opened. In a beta on unfamiliar devices
// the difference between "it broke" and "it broke on Progress, and here is the
// message" is the difference between a report you can act on and one you cannot.
import { ErrorBoundary } from '../src/components/ErrorBoundary.js';
import { PAYWALL_ACTIVE, SHOW_DEV_TOOLS, SHOW_FEEDBACK, BUILD } from '../src/config.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };

const textOf = (node, out = [], d = 0) => {
  if (node == null || d > 40) return out;
  if (typeof node === 'string' || typeof node === 'number') { out.push(String(node)); return out; }
  if (Array.isArray(node)) { node.forEach((n) => textOf(n, out, d + 1)); return out; }
  if (typeof node !== 'object') return out;
  const { type, props } = node;
  if (typeof type === 'function') { textOf(type(props || {}), out, d + 1); return out; }
  if (props && props.children != null) textOf(props.children, out, d + 1);
  return out;
};

console.log('=== a healthy tree passes straight through ===');
{
  const b = new ErrorBoundary({ children: 'the app', label: 'Home' });
  ck(b.render() === 'the app', 'children are returned untouched when nothing is wrong');
}

console.log('=== a fault is caught and explained ===');
{
  const b = new ErrorBoundary({ children: 'the app', label: 'Progress' });
  const err = new Error('R is not defined');
  b.state = ErrorBoundary.getDerivedStateFromError(err);
  const shown = textOf(b.render()).join(' | ');
  ck(!!b.state.error, 'the boundary enters its error state');
  ck(/Something broke/.test(shown), 'it says something broke');
  ck(/R is not defined/.test(shown), 'it shows the actual message, not a generic apology');
  ck(/Progress/.test(shown), 'and names the screen it happened on');
  ck(/Go back/.test(shown), 'it offers a way out');
  ck(!/white/i.test(shown), 'and is not blank');
}

console.log('=== the fault does not blame the user ===');
{
  const b = new ErrorBoundary({ children: 'x', label: 'Sandbox' });
  b.state = ErrorBoundary.getDerivedStateFromError(new Error('boom'));
  const shown = textOf(b.render()).join(' ');
  ck(/not something you did/i.test(shown), 'it says explicitly that this is not the user\'s fault');
}

console.log('=== recovery clears the error ===');
{
  const b = new ErrorBoundary({ children: 'the app', label: 'Learn' });
  let next = null;
  b.setState = (s) => { next = s; };
  b.state = ErrorBoundary.getDerivedStateFromError(new Error('boom'));
  b.reset();
  ck(next && next.error === null, 'pressing Go back clears the error so the screen can re-render');
}

console.log('=== the build switch is coherent ===');
{
  ck(['dev', 'beta', 'release'].includes(BUILD), `BUILD is "${BUILD}"`);
  if (BUILD === 'beta') {
    ck(PAYWALL_ACTIVE === false, 'beta: the paywall is off — testers cannot pay, so locking them out tests the wrong app');
    ck(SHOW_DEV_TOOLS === false, 'beta: dev tools are hidden — a tester pressing "complete every unit" stops testing what was built');
    ck(SHOW_FEEDBACK === true, 'beta: a feedback route exists');
  }
  if (BUILD === 'release') {
    ck(PAYWALL_ACTIVE === true, 'release: the paywall is on');
    ck(SHOW_DEV_TOOLS === false, 'release: no dev tools');
  }
}

console.log(fails ? `\n${fails} FAILURES` : '\na crash is survivable and reportable');
process.exit(fails ? 1 : 0);
