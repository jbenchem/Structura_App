// ─────────────────────────────────────────────────────────────
// Catalyst Cat — the mascot as a tested system.
//
// The brief's checklist, made executable: every state renders, invalid
// states cannot render arbitrary art, proportions hold, the body is the
// coat-free body everywhere, the goggles are one visor, the streak icon
// hovers above the paw with a gap that no frame can close, reduced motion
// disables every loop, loops stop on deactivation, celebration completes,
// decorative mode announces nothing, and no forbidden dependency exists.
// ─────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs';
import { CatalystMascot } from '../src/components/mascot/CatalystMascot.js';
import { STATES, STATE_NAMES, MOTION, shouldAnimate, restingValue, streakGapAtRest, streakGapNeverCloses } from '../src/components/mascot/mascotStateConfig.js';
import * as Geo from '../src/components/mascot/mascotGeometry.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };
// Source assertions judge CODE, not commentary: comments are stripped first.
const codeOnly = (src) => src.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

// Walk a rendered tree collecting props of every element.
const walk = (node, out = []) => {
  if (!node) return out;
  if (Array.isArray(node)) { node.forEach((n) => walk(n, out)); return out; }
  if (typeof node === 'object' && node.props) {
    out.push({ type: node.type, props: node.props });
    walk(node.props.children, out);
  }
  return out;
};
// Function components in the stub render when called; expand them.
const render = (el) => {
  const expand = (node) => {
    if (!node) return node;
    if (Array.isArray(node)) return node.map(expand);
    if (typeof node === 'object' && node.props) {
      if (typeof node.type === 'function') return expand(node.type(node.props));
      return { ...node, props: { ...node.props, children: expand(node.props.children) } };
    }
    return node;
  };
  return expand(el);
};
const tree = (props) => walk(render(CatalystMascot(props)));
const ids = (props) => tree(props).map((n) => n.props.testID).filter(Boolean);

console.log('=== 1–2 · every state renders; an invalid one cannot ===');
{
  for (const st of STATE_NAMES) {
    const t = tree({ state: st, size: 120 });
    ck(t.some((n) => n.props.testID === 'catalyst-mascot'), `${st} renders the mascot container`);
  }
  let threw = false;
  try { CatalystMascot({ state: 'labcoat' }); } catch (e) { threw = /unknown state/.test(e.message); }
  ck(threw, 'an unknown state throws instead of rendering someone else\u2019s artwork');
}

console.log('=== 3 · proportions ===');
{
  const t = tree({ state: 'idle', size: 140 });
  const root = t.find((n) => n.props.testID === 'catalyst-mascot');
  const style = [].concat(root.props.style).filter(Boolean).reduce((a, s) => ({ ...a, ...s }), {});
  ck(Math.abs(style.height / style.width - 310 / 280) < 1e-9, 'the container keeps the 280:310 aspect at any size');
  ck(Geo.CANVAS.w === 280 && Geo.CANVAS.h === 310, 'the canvas is the sheet\u2019s canvas');
}

console.log('=== 4–6 · coat-free body, one visor, in every state ===');
{
  const src = codeOnly(readFileSync(new URL('../src/components/mascot/mascotGeometry.js', import.meta.url), 'utf8'));
  ck(!/coat/i.test(src), 'no lab-coat geometry exists anywhere');
  for (const st of STATE_NAMES) {
    const parts = [];
    const walkL = (ls) => ls.forEach((l) => { parts.push(...(l.parts || [])); if (l.sublayers) walkL(l.sublayers); });
    walkL(STATES[st].layers);
    ck(parts.includes('BodyCore'), `${st} uses the shared coat-free BodyCore`);
    ck(parts.includes('Goggles'), `${st} renders the shared single-piece goggles`);
    ck(parts.includes('HeadShell'), `${st} uses the shared head`);
  }
  ck(/M69 63 Q70 52 82 49/.test(src), 'the goggles are the sheet\u2019s continuous visor path, verbatim');
}

console.log('=== 7–9 · the streak icon hovers over the paw ===');
{
  const t = ids({ state: 'streakConcern', size: 120 });
  ck(t.includes('mascot-streak-paw') && t.includes('mascot-streak-icon'), 'both streak layers render');
  const iconBottom = Geo.STREAK_ICON.cy + Geo.STREAK_ICON.r;
  ck(Geo.STREAK_ICON.cx === 226 && Geo.STREAK_ICON.cy === 179 && Geo.STREAK_ICON.r === 22, 'the icon sits at the reference (226, 179), r 22');
  ck(iconBottom < Geo.STREAK_PAW_TOP, `the icon is above the paw (bottom ${iconBottom} < paw top ${Geo.STREAK_PAW_TOP})`);
  ck(streakGapAtRest(iconBottom, Geo.STREAK_PAW_TOP) >= 3, 'a visible gap at rest');
  ck(streakGapNeverCloses(), 'the icon\u2019s own hover only ever moves it up, so the gap never closes on any frame');
  const paw = STATES.streakConcern.layers.find((l) => l.id === 'streak-paw');
  ck(paw.sublayers && paw.sublayers[0].id === 'streak-icon', 'the icon rides inside the paw layer, so they cannot drift apart');
}

console.log('=== 10–12 · reduced motion and lifecycle ===');
{
  ck(!shouldAnimate({ active: true, reducedMotion: true }), 'reduced motion disables every animation');
  ck(!shouldAnimate({ active: false, reducedMotion: false }), 'active=false disables every animation');
  ck(!shouldAnimate({ active: true, appState: 'background', reducedMotion: false }), 'backgrounding disables every animation');
  ck(shouldAnimate({ active: true, reducedMotion: false }), 'and otherwise it runs');
  // Every motion rests at a sensible frame 0: what reduced motion shows.
  ck(Object.keys(MOTION).every((k) => restingValue(k) !== undefined), 'every motion has a frame-0 resting pose');
  ck(MOTION.blink.keyframes[0][1] === 1, 'the resting eye is open, not mid-blink');
  ck(MOTION.checkScale.keyframes[0][1] > 0.9, 'the resting check is visible, not collapsed');
}

console.log('=== 13 · the celebration completes and never loops ===');
{
  ck(MOTION.bounce.plays === 1 && MOTION.pawLeft.plays === 1 && MOTION.confettiFade.plays === 1, 'celebration motions play once');
  ck(STATES.celebrate.complete === 'bounce', 'and the bounce is the motion that reports completion');
  ck(MOTION.wave.plays === 2 && MOTION.point.plays === 2, 'welcome waves twice, guide points twice — then settle');
  ck(MOTION.bounce.duration === 2250 && MOTION.wave.duration === 1700 && MOTION.thinkRotate.duration === 3800 && MOTION.worryPaw.duration === 4000 && MOTION.blink.duration === 5400, 'durations match the brief');
}

console.log('=== 14–15 · decorative by default; no forbidden dependencies ===');
{
  const t = tree({ state: 'idle', size: 100 });
  const root = t.find((n) => n.props.testID === 'catalyst-mascot');
  ck(root.props.accessible === false && root.props.importantForAccessibility === 'no-hide-descendants', 'decorative mode hides the mascot from screen readers');
  const labelled = tree({ state: 'streakConcern', size: 100, accessibilityLabel: 'Your streak is alive; today is not done yet' })
    .find((n) => n.props.testID === 'catalyst-mascot');
  ck(labelled.props.accessible === true && !!labelled.props.accessibilityLabel, 'a parent-supplied label makes it announceable, once');
  const all = codeOnly(['CatalystMascot', 'mascotGeometry', 'mascotStateConfig'].map((f) => readFileSync(new URL(`../src/components/mascot/${f}.js`, import.meta.url), 'utf8')).join('\n'));
  ck(!/reanimated|skia|lottie|WebView|@keyframes|setInterval/i.test(all), 'no Reanimated, Skia, Lottie, WebView, CSS keyframes or timers');
  ck(!/useNativeDriver:\s*false/.test(all), 'every animation is on the native driver');
  ck(!/<Use\b/.test(all), 'no SVG <Use> with shared ids across instances');
}

console.log(fails ? `\n${fails} FAILED\n` : '\nCat is exact, honest, and quiet when asked to be\n');
process.exit(fails ? 1 : 0);
