// ─────────────────────────────────────────────────────────────
// The first-run tour.
//
// The failure worth guarding is the silent one. A tour step names a target;
// a screen registers that name. Rename the element and the tour does not
// crash — it quietly falls back to a card with no hole in it, pointing at
// nothing, and reads to a new student as a broken app on their first minute.
// Nothing else in the codebase would report that.
//
// The second guard is on the hole itself. It is one even-odd path rather
// than four grey panels arranged around a gap, and an even-odd path with one
// subpath is not a hole — it is a grey screen.
// ─────────────────────────────────────────────────────────────

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { TOUR_STEPS, TOUR_TARGETS } from '../src/content/tour.js';
import {
  SpotlightTour,
  TourProvider,
  useTourTarget,
  spotlightPath,
  padHole,
  cardPlacement,
} from '../src/components/Spotlight.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };

const walk = (d) =>
  readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    return statSync(p).isDirectory() ? (f === 'engine' ? [] : walk(p)) : p.endsWith('.js') ? [p] : [];
  });

console.log('=== every step points at something a screen actually registers ===');
{
  const registered = new Set();
  const where = new Map();
  for (const f of ['App.js', ...walk('src')]) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/useTourTarget\(\s*['"]([^'"]+)['"]\s*\)/g)) {
      registered.add(m[1]);
      where.set(m[1], f);
    }
    // The tab bar builds its key from the tab id, so the literal never
    // appears. Read the ids out of the same list the bar renders from.
    for (const m of src.matchAll(/useTourTarget\(`tab\.\$\{([\w.]+)\}`\)/g)) {
      for (const t of src.matchAll(/\{\s*id:\s*'([\w-]+)',\s*label:/g)) {
        registered.add(`tab.${t[1]}`);
        where.set(`tab.${t[1]}`, f);
      }
    }
  }

  const missing = TOUR_TARGETS.filter((t) => !registered.has(t));
  if (missing.length) missing.forEach((t) => console.error(`  FAIL: no screen registers "${t}"`));
  ck(missing.length === 0, `${TOUR_TARGETS.length} targets, all registered`);
  if (!missing.length) TOUR_TARGETS.forEach((t) => console.log(`       ${t} → ${where.get(t)}`));

  // The other direction is a warning rather than a failure: a screen may
  // reasonably register something a future step will point at.
  const unused = [...registered].filter((t) => !TOUR_TARGETS.includes(t));
  if (unused.length) console.log(`       (registered but not used by any step: ${unused.join(', ')})`);
}

console.log('=== the tour is short enough that somebody reads it ===');
{
  ck(TOUR_STEPS.length >= 3, `it says something (${TOUR_STEPS.length} steps)`);
  ck(TOUR_STEPS.length <= 8, `and stops saying it (${TOUR_STEPS.length} steps)`);
  const ids = TOUR_STEPS.map((s) => s.id);
  ck(new Set(ids).size === ids.length, 'no two steps share an id');
  let thin = 0;
  for (const s of TOUR_STEPS) {
    if (!s.title || !s.body) { console.error(`  FAIL: step "${s.id}" is missing a title or body`); thin++; fails++; }
    // A tour card long enough to need scrolling is a page of documentation
    // wearing a spotlight.
    if (s.body && s.body.length > 210) { console.error(`  FAIL: step "${s.id}" is ${s.body.length} chars`); thin++; fails++; }
  }
  ck(thin === 0, 'every card is a title and a couple of sentences');
  ck(TOUR_STEPS[0].target === null, 'it opens with a plain card rather than a spotlight on nothing');
  ck(TOUR_STEPS.filter((s) => s.target).length >= 3, 'and most of it actually points somewhere');
}

console.log('=== the hole is a hole ===');
{
  const hole = { x: 40, y: 120, w: 300, h: 96, r: 16 };
  const d = spotlightPath(393, 851, hole);
  const subpaths = (d.match(/M/g) || []).length;
  ck(subpaths === 2, `outer rectangle plus one inner subpath (${subpaths} found)`);
  ck(/A/.test(d), 'the inner subpath has rounded corners');
  ck(spotlightPath(393, 851, null) === 'M0 0 H393 V851 H0 Z', 'with no target it is a plain scrim');

  // Every coordinate has to be a real number. One NaN and react-native-svg
  // silently draws nothing, which on a dark scrim means the whole screen
  // goes clear and the tour looks like it failed to start.
  const nums = d.match(/-?\d+(\.\d+)?/g) || [];
  ck(nums.length > 0 && nums.every((n) => Number.isFinite(Number(n))), 'no NaN reaches the path');
  ck(!/NaN|undefined|null/.test(d), `the path is clean: ${d.slice(0, 46)}…`);
}

console.log('=== a small target does not get a corner radius bigger than itself ===');
{
  const d = spotlightPath(393, 851, { x: 10, y: 10, w: 20, h: 12, r: 40 });
  ck(!/NaN/.test(d), 'a radius larger than the box is survivable');
  // Clamped to half the shorter side, or the arcs cross over each other and
  // the hole turns inside out.
  ck(/A6 6/.test(d), `radius clamped to half the height: ${/A[\d.]+ [\d.]+/.exec(d)[0]}`);
}

console.log('=== the spotlight stays inside the screen ===');
{
  const bounds = { width: 393, height: 851 };
  // A card flush against the top edge: padding must not push the hole to a
  // negative origin, which renders as a hole in the wrong place.
  const top = padHole({ x: 0, y: 0, w: 393, h: 60 }, 12, bounds);
  ck(top.x >= 0 && top.y >= 0, `no negative origin (${top.x}, ${top.y})`);
  ck(top.x + top.w <= bounds.width, 'and it does not run off the right');

  const bottom = padHole({ x: 20, y: 800, w: 200, h: 60 }, 12, bounds);
  ck(bottom.y + bottom.h <= bounds.height, 'nor off the bottom');
  ck(padHole(null, 8, bounds) === null, 'no measurement yet means no hole rather than a broken one');
  ck(padHole({ x: 10, y: 10, w: 50, h: 50 }, undefined, bounds).w === 66, 'padding has a sensible default');
}

console.log('=== the card never covers the thing it describes ===');
{
  const bounds = { width: 393, height: 851 };
  const high = cardPlacement({ x: 20, y: 100, w: 350, h: 90 }, bounds);
  ck(high.arrow === 'up' && high.top > 190, `a target near the top is explained below it (${high.top})`);

  const low = cardPlacement({ x: 20, y: 700, w: 350, h: 90 }, bounds);
  ck(low.arrow === 'down' && low.top + 190 <= 700, `a target near the bottom is explained above it (${low.top})`);

  // The tab bar: right at the bottom edge, which is the case that made the
  // 'above' branch necessary in the first place.
  const tabs = cardPlacement({ x: 0, y: 790, w: 393, h: 61 }, bounds);
  ck(tabs.arrow === 'down', 'the tab bar is explained from above');
  ck(tabs.top >= 20, 'and the card is still on screen');

  const huge = cardPlacement({ x: 0, y: 0, w: 393, h: 851 }, bounds);
  ck(huge.arrow === null, 'a target with no room on either side gets a centred card and no arrow');

  const none = cardPlacement(null, bounds);
  ck(none.arrow === null && none.top > 0, 'and a step with no target is simply centred');
}

console.log('=== the overlay renders, and stays out of the way when it should ===');
{
  const run = (label, fn) => {
    try { const out = fn(); ck(out !== undefined, label); }
    catch (e) { ck(false, `${label} — ${e.message}`); }
  };
  run('hidden when the tour is done', () => {
    const out = SpotlightTour({ steps: TOUR_STEPS, visible: false, onFinish() {}, onSkip() {} });
    return out === null ? null : out;
  });
  ck(SpotlightTour({ steps: TOUR_STEPS, visible: false, onFinish() {}, onSkip() {} }) === null,
    'and renders literally nothing, not an invisible layer over the app');
  run('visible on the first step', () =>
    SpotlightTour({ steps: TOUR_STEPS, visible: true, onFinish() {}, onSkip() {} }));
  run('with no steps at all', () =>
    SpotlightTour({ steps: [], visible: true, onFinish() {}, onSkip() {} }) ?? null);
  run('the provider', () => TourProvider({ children: null }));
}

console.log('=== a screen can register a target with no tour above it ===');
{
  // Home is rendered in tests, in the sandbox, and on web outside the
  // provider during development. Registering must be harmless everywhere.
  try {
    const ref = useTourTarget('home.continue');
    ck(ref && typeof ref === 'object' && 'current' in ref, 'it still hands back a usable ref');
  } catch (e) {
    ck(false, `registering outside a provider threw: ${e.message}`);
  }
}

console.log(fails ? `\n${fails} FAILED\n` : '\nthe tour points at things that are really there\n');
process.exit(fails ? 1 : 0);
