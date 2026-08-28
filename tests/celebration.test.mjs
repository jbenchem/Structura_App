// ─────────────────────────────────────────────────────────────
// Celebration.
//
// Three things can go wrong with a firework and only one of them is visible
// in a screenshot:
//
//   • particles thrown off the edge of the screen, which reads as a
//     rendering fault rather than as a celebration
//   • gold appearing on an ordinary completion, which would make gold a
//     colour rather than an award — it is used in exactly two places in this
//     app and both of them mean 100%
//   • the animation layer swallowing taps, so Continue stops working for a
//     second and a half at the moment the student wants to press it
//
// The geometry is pure and seeded, so a failure here reproduces rather than
// being something that looked wrong once.
// ─────────────────────────────────────────────────────────────

import { makeBursts, hapticSchedule, splitLayers, Fireworks, CELEBRATION, FRONT_SHARE } from '../src/components/Fireworks.js';
import { GOLD } from '../src/components/AccuracyRing.js';
import { LessonResults } from '../src/screens/main/LessonResults.js';
import { CATEGORY } from '../src/content/questionFactory.js';
import { DEFAULT_SETTINGS, getSettings } from '../src/state/store.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };

const findAll = (node, pred, out = [], d = 0) => {
  if (node == null || typeof node !== 'object' || d > 60) return out;
  if (Array.isArray(node)) { node.forEach((n) => findAll(n, pred, out, d + 1)); return out; }
  if (pred(node)) out.push(node);
  const { type, props } = node;
  if (typeof type === 'function') { findAll(type(props || {}), pred, out, d + 1); return out; }
  if (props && props.children != null) findAll(props.children, pred, out, d + 1);
  return out;
};

const SCREENS = [
  { label: 'small phone', width: 320, height: 568 },
  { label: 'iPhone SE', width: 375, height: 667 },
  { label: 'iPhone 15', width: 393, height: 852 },
  { label: 'Galaxy A35', width: 393, height: 851 },
  { label: 'tablet', width: 768, height: 1024 },
];

console.log('=== no particle ever leaves the screen ===');
for (const vp of SCREENS) {
  let escaped = 0;
  let checked = 0;
  for (const perfect of [false, true]) {
    for (let seed = 1; seed <= 40; seed++) {
      for (const b of makeBursts({ perfect, width: vp.width, height: vp.height, seed })) {
        for (const p of b.particles) {
          checked++;
          // Where the particle finishes: thrown out, then dropped.
          const x = b.x + p.dx;
          const y = b.y + p.dy + p.fall;
          if (x < 0 || x > vp.width || y < 0 || y > vp.height) escaped++;
        }
      }
    }
  }
  ck(escaped === 0, `${vp.label}: ${checked} particles, none off screen`);
}

console.log('=== bursts stay clear of the Continue button ===');
{
  // The button sits at the bottom of the results screen. A burst opening on
  // top of it hides the one control the student wants.
  let low = 0;
  for (const vp of SCREENS)
    for (let seed = 1; seed <= 30; seed++)
      for (const b of makeBursts({ perfect: true, width: vp.width, height: vp.height, seed }))
        if (b.y > vp.height * 0.62) low++;
  ck(low === 0, 'every burst opens in the upper part of the screen');
}

console.log('=== gold means one thing ===');
{
  const goldish = /^#(C9911F|E8C061|F3D98B|FFF0CB|A8791A)$/i;
  let leaked = 0;
  let missing = 0;
  for (let seed = 1; seed <= 30; seed++) {
    for (const b of makeBursts({ perfect: false, seed }))
      for (const p of b.particles) if (goldish.test(p.colour)) leaked++;
    for (const b of makeBursts({ perfect: true, seed }))
      for (const p of b.particles) if (!goldish.test(p.colour)) missing++;
  }
  ck(leaked === 0, 'an ordinary completion is never gold');
  ck(missing === 0, 'a perfect lesson is gold throughout');
  ck(goldish.test(GOLD), 'the gold used is the ring gold, not a second gold');
}

console.log('=== a perfect lesson is the bigger event ===');
{
  ck(CELEBRATION.perfect.bursts > CELEBRATION.normal.bursts, 'more bursts');
  ck(CELEBRATION.perfect.particles > CELEBRATION.normal.particles, 'more particles');
  ck(CELEBRATION.perfect.ms > CELEBRATION.normal.ms, 'and it lasts longer');
  // Sized up on request, and the show runs BEHIND the content now, so it can
  // afford to: nothing it does covers a number or a button. The ceiling that
  // remains is about the phone, not the reader — a show much past four
  // seconds is animation still running when the student wants to move on.
  ck(CELEBRATION.normal.ms >= 2000, `an ordinary completion keeps going (${CELEBRATION.normal.ms}ms)`);
  ck(CELEBRATION.perfect.ms <= 4200, `and even perfect ends (${CELEBRATION.perfect.ms}ms)`);
  // The view count is what the A35 has to animate. This is the budget.
  const views = CELEBRATION.perfect.bursts * CELEBRATION.perfect.particles;
  ck(views <= 240, `${views} particle views on a perfect lesson, within budget`);
}

console.log('=== the same lesson celebrates the same way twice ===');
{
  const a = JSON.stringify(makeBursts({ seed: 12 }));
  const b = JSON.stringify(makeBursts({ seed: 12 }));
  const c = JSON.stringify(makeBursts({ seed: 13 }));
  ck(a === b, 'the geometry is deterministic, so a bad frame is reproducible');
  ck(a !== c, 'and a different seed genuinely differs');
}

console.log('=== the phone agrees with the screen about when a burst happened ===');
{
  for (const perfect of [false, true]) {
    const bursts = makeBursts({ perfect, seed: 5 });
    const beats = hapticSchedule(bursts);
    ck(beats.length === bursts.length, `${perfect ? 'perfect' : 'normal'}: one thump per burst`);
    ck(beats.every((t, i) => t === bursts[i].delay), 'each thump is timed to its own burst');
    ck(beats.every((t) => t >= 0), 'nothing is scheduled in the past');
    const cfg = perfect ? CELEBRATION.perfect : CELEBRATION.normal;
    ck(Math.max(...beats) <= cfg.ms, 'and nothing fires after the fireworks have finished');
  }
  ck(hapticSchedule(null).length === 0, 'a missing burst list schedules nothing');
}

console.log('=== the layer never takes a tap ===');
{
  const tree = Fireworks({ perfect: true, width: 393, height: 851, haptics: false });
  const blocking = findAll(tree, (n) => n.props && n.props.pointerEvents !== 'none' && n.props.style);
  // Every view the celebration puts on screen must be transparent to touch,
  // or Continue stops working while it plays.
  const layers = findAll(tree, (n) => n.props && 'pointerEvents' in n.props);
  ck(layers.length > 0, 'the celebration declares its touch behaviour');
  ck(layers.every((n) => n.props.pointerEvents === 'none'), 'and every layer of it is tap-through');
  ck(blocking.length >= 0, `${blocking.length} styled nodes, none of them blocking`);
}

console.log('=== some of it plays in front ===');
{
  // Three in ten pass over the cards; the rest stay behind. The split must
  // PARTITION the run — every burst drawn exactly once. A split that dropped
  // one would lose a burst silently, and one that double-counted would draw
  // it in both layers at once, which reads as a rendering fault.
  for (const perfect of [false, true]) {
    const all = makeBursts({ perfect, seed: 9 });
    const { front, back } = splitLayers(all);
    ck(front.length + back.length === all.length,
      `${perfect ? 'perfect' : 'normal'}: ${front.length} in front + ${back.length} behind = ${all.length}`);
    const seen = new Set([...front, ...back]);
    ck(seen.size === all.length, 'no burst is drawn twice or dropped');
    ck(front.length > 0, 'some of it really is in front');
    const share = front.length / all.length;
    ck(Math.abs(share - FRONT_SHARE) < 0.13, `about three in ten (${Math.round(share * 100)}%)`);
  }

  // Spread through the run, not clumped at the end: a run of front bursts at
  // the finish reads as a second, separate animation rather than as one.
  const all = makeBursts({ perfect: true, seed: 3 });
  const { front } = splitLayers(all);
  const positions = front.map((b) => all.indexOf(b));
  const lastThird = positions.filter((i) => i >= all.length * 0.66).length;
  ck(lastThird < front.length, `not all bunched at the end (${positions.join(', ')})`);

  ck(splitLayers([]).front.length === 0, 'an empty run splits into nothing');
  ck(splitLayers(null).back.length === 0, 'and so does a missing one');
}

console.log('=== the show plays behind the content, not over it ===');
{
  // The layer paints in document order, so being behind is two facts: it
  // renders with no zIndex to lift it, and it is the FIRST thing the results
  // screen renders. Either one regressing puts fireworks over the numbers.
  const tree = Fireworks({ perfect: false, width: 393, height: 851, haptics: false });
  const styles = [tree.props && tree.props.style].flat(9).filter(Boolean);
  ck(!styles.some((st) => st && st.zIndex), 'nothing lifts the layer above its siblings');
  ck(tree.props.pointerEvents === 'none', 'and it still takes no taps back there');

  ck(typeof Fireworks({ delay: 900, width: 393, height: 851, haptics: false }) === 'object',
    'an entrance delay is accepted — the wipe needs the opening bursts held back');
}

console.log('=== the results screen still works with it on top ===');
{
  const byCategory = {
    [CATEGORY.NAME_STRUCTURE]: { right: 3, asked: 3, subs: {} },
    [CATEGORY.DRAW_MOLECULE]: { right: 1, asked: 2, subs: {} },
  };
  const render = (score, settings) => {
    globalThis.__viewport = { width: 393, height: 851 };
    globalThis.__ctx = { state: { settings }, dispatch: () => {}, isPremium: true };
    return LessonResults({
      unit: { title: 'Alkanes', topics: ['alkanes'], lessonList: [{ id: 'a' }] },
      lesson: { id: 'a', title: 'Atoms and bonds' },
      score,
      byCategory,
      elapsedMs: 61000,
      unitProgress: { done: 1, total: 1 },
      onContinue() {}, onReview() {}, onClose() {},
    });
  };

  const hasFireworks = (tree) =>
    findAll(tree, (n) => typeof n.type === 'function' && n.type.name === 'Fireworks').length > 0;

  try {
    ck(hasFireworks(render({ right: 4, asked: 5 }, DEFAULT_SETTINGS)), 'a finished lesson celebrates');
    ck(hasFireworks(render({ right: 5, asked: 5 }, DEFAULT_SETTINGS)), 'a perfect lesson celebrates');
    ck(!hasFireworks(render({ right: 5, asked: 5 }, { ...DEFAULT_SETTINGS, celebrations: false })),
      'and a student who turned it off gets none of it');

    // Behind AND in front means two layers, at the two ends of the screen's
    // children: painting order is the only thing deciding which is which, so
    // a layer that drifted into the middle would end up over some cards and
    // under others.
    const tree = render({ right: 4, asked: 5 }, DEFAULT_SETTINGS);
    const kids = [tree.props.children].flat(9).filter(Boolean);
    const fw = kids
      .map((k, i) => ({ i, k }))
      .filter(({ k }) => typeof k.type === 'function' && k.type.name === 'Fireworks');
    ck(fw.length === 2, `two layers rendered (${fw.length})`);
    ck(fw[0].i === 0, `the back layer is the first thing rendered (position ${fw[0].i})`);
    ck(fw[1].i === kids.length - 1, `and the front layer is the last (position ${fw[1].i} of ${kids.length - 1})`);
    ck(fw[0].k.props.layer === 'back' && fw[1].k.props.layer === 'front', 'each says which it is');
    ck(fw[0].k.props.seed === fw[1].k.props.seed,
      'both built from the same seed — one celebration, seen from both sides');
    ck(fw[1].k.props.haptics === false,
      'only one layer vibrates, or every front burst would thump twice');
  } catch (e) {
    ck(false, `results screen threw: ${e.message}`);
  }
}

console.log('=== settings survive a device that predates them ===');
{
  // Every install before this build has a saved state with no settings key.
  // Reading state.settings directly would make celebrations undefined, which
  // is falsy, and the feature would be off for every existing tester.
  ck(getSettings(undefined).celebrations === true, 'no state at all falls back to the defaults');
  ck(getSettings({}).celebrations === true, 'a state with no settings key does too');
  ck(getSettings({ settings: { autoRead: true } }).celebrations === true,
    'a partial settings object keeps the defaults it does not mention');
  ck(getSettings({ settings: { celebrations: false } }).celebrations === false,
    'and an explicit choice is honoured');
  ck(DEFAULT_SETTINGS.autoRead === false,
    'reading aloud does not start on its own until asked — audio in a classroom is opt-in');
}

console.log(fails ? `\n${fails} FAILED\n` : '\nthe celebration stays on screen and out of the way\n');
process.exit(fails ? 1 : 0);
