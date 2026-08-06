// ─────────────────────────────────────────────────────────────
// Sandbox layout suite.
//
// The gesture set itself needs a device, but the graph logic behind
// it does not. These cases come straight from CHECKLIST.md: the ring
// and chain builders must produce the molecules the checklist names,
// and Clean must never change what the structure IS.
//
// CHECKLIST references are given per case so a failure points at the
// manual check it corresponds to.
// ─────────────────────────────────────────────────────────────

import { nameGraph, parseName } from '../src/engine/index.js';
import { tidy, snapToLattice, repairStereo, makeRing, chainAlong, nextPosition } from '../src/sandbox/layout.js';
import { BOND, TEMPLATES } from '../src/sandbox/constants.js';

const TPL = (id) => TEMPLATES.find((t) => t.id === id);

let fails = 0;
const check = (cond, msg) => {
  if (!cond) {
    console.error('  FAIL:', msg);
    fails++;
  }
};
const nameOf = (g) => {
  const r = nameGraph(g);
  return r.ok ? r.name : `<${r.err}>`;
};
const clone = (g) => JSON.parse(JSON.stringify(g));

// ── Ring templates (CHECKLIST 6) ─────────────────────────────
console.log('=== ring templates ===');

// 6.3 arm 6-ring, click empty space -> cyclohexane
let g = makeRing({ atoms: [], bonds: [] }, TPL('c6'), null, null, false, { x: 200, y: 200 });
check(nameOf(g) === 'cyclohexane', `6.3 empty-space 6-ring -> cyclohexane, got ${nameOf(g)}`);

// 6.1 benzene on empty space
g = makeRing({ atoms: [], bonds: [] }, TPL('benzene'), null, null, false, { x: 200, y: 200 });
check(nameOf(g) === 'benzene', `6.1 empty-space benzene -> benzene, got ${nameOf(g)}`);

// 6.4 three-carbon chain + benzene clicked on the end carbon -> propylbenzene
let chain3 = { atoms: [], bonds: [] };
{
  const r = chainAlong(chain3, { x: 100, y: 200 }, BOND * 3, 0, null);
  chain3 = { atoms: r.atoms, bonds: r.bonds };
}
check(nameOf(chain3) === 'propane', `chain tool: 3 bond-lengths -> propane, got ${nameOf(chain3)}`);
{
  const endId = chain3.atoms[chain3.atoms.length - 1].id;
  const r = makeRing(clone(chain3), TPL('benzene'), endId, null, false, null);
  const n = nameOf(r);
  check(n === 'propylbenzene', `6.4 benzene attached to chain end -> propylbenzene, got ${n}`);
}

// 6.6 benzene, fuse benzene onto one of its bonds -> naphthalene
{
  const b = makeRing({ atoms: [], bonds: [] }, TPL('benzene'), null, null, false, { x: 200, y: 200 });
  const r = makeRing(clone(b), TPL('benzene'), null, b.bonds[0], false, null);
  const n = nameOf(r);
  check(n === 'naphthalene', `6.6 benzene fused to benzene -> naphthalene, got ${n}`);
}

// 6.8 cyclohexane fused with 6-ring -> decalin (bicyclo[4.4.0]decane)
{
  const c = makeRing({ atoms: [], bonds: [] }, TPL('c6'), null, null, false, { x: 200, y: 200 });
  const r = makeRing(clone(c), TPL('c6'), null, c.bonds[0], false, null);
  const n = nameOf(r);
  check(/bicyclo\[4\.4\.0\]decane/.test(n), `6.8 two fused 6-rings -> bicyclo[4.4.0]decane, got ${n}`);
}

// 6.9 cyclohexane, long-click a ring carbon with 5-ring armed -> spiro[4.5]decane
{
  const c = makeRing({ atoms: [], bonds: [] }, TPL('c6'), null, null, false, { x: 200, y: 200 });
  const r = makeRing(clone(c), TPL('c5'), c.atoms[0].id, null, true, null);
  const n = nameOf(r);
  check(/spiro\[4\.5\]decane/.test(n), `6.9 spiro 5-ring on cyclohexane -> spiro[4.5]decane, got ${n}`);
}

// ── Chain tool (CHECKLIST 5b) ────────────────────────────────
console.log('=== chain tool ===');
{
  // 5b.3 a longer drag gives a longer chain
  const r = chainAlong({ atoms: [], bonds: [] }, { x: 0, y: 0 }, BOND * 10, 0, null);
  const n = nameOf({ atoms: r.atoms, bonds: r.bonds });
  check(n === 'decane', `5b.3 ten bond-lengths -> decane, got ${n}`);
}
{
  // 5b.4 dragging from an existing atom extends it rather than starting fresh
  let base = makeRing({ atoms: [], bonds: [] }, TPL('benzene'), null, null, false, { x: 0, y: 0 });
  const anchor = base.atoms[0];
  const r = chainAlong(clone(base), { x: anchor.x, y: anchor.y }, BOND * 2, 0, anchor.id);
  const n = nameOf({ atoms: r.atoms, bonds: r.bonds });
  check(n === 'ethylbenzene', `5b.4 2-carbon chain from a benzene carbon -> ethylbenzene, got ${n}`);
}

// ── Clean: tidy / snapToLattice / repairStereo (CHECKLIST 8) ──
console.log('=== clean ===');

// 8.4 / 8.4b2 tidying must never change what the molecule is
const CLEAN_CASES = [
  '2,2,4-trimethylpentane',
  'propylbenzene',
  'butylcyclobutane',
  'propylcyclohexane',
  'naphthalene',
  '5,7-diethyl-3,4,7-trimethyldecane',
  '5,5-diethyldecane',
  'pentane-2,4-dione',
  'ethanoic acid',
  'but-2-ene',
];
for (const name of CLEAN_CASES) {
  const p = parseName(name);
  if (!p.ok) {
    check(false, `setup: ${name} should parse`);
    continue;
  }
  const before = nameOf(p.mol);
  const after = nameOf(tidy(clone(p.mol)));
  check(before === after, `8.4 Clean preserves identity: ${name} became ${after}`);
}

// 8.5 a (2R) molecule is still (2R) after Clean
for (const name of ['(2R)-butan-2-ol', '(2S)-butan-2-ol', '(2Z)-but-2-ene', '(2E)-but-2-ene']) {
  const p = parseName(name);
  if (!p.ok) {
    check(false, `setup: ${name} should parse`);
    continue;
  }
  const before = nameOf(p.mol);
  const after = nameOf(tidy(clone(p.mol)));
  check(before === after, `8.5 Clean preserves stereochemistry: ${name} became ${after}`);
}

// 8.4c3 bridged/fused cages are left alone by Clean, not re-laid
for (const name of ['bicyclo[2.2.1]heptane', 'caffeine']) {
  const p = parseName(name);
  if (!p.ok) {
    check(false, `setup: ${name} should parse`);
    continue;
  }
  const after = nameOf(tidy(clone(p.mol)));
  check(after === nameOf(p.mol), `8.4c3 Clean leaves ${name} nameable, got ${after}`);
}

// snapToLattice keeps its result only if the molecule still reads the same
console.log('=== lattice snapping ===');
for (const name of ['2,2,4-trimethylpentane', '(2R)-butan-2-ol', 'oleic acid']) {
  const p = parseName(name);
  if (!p.ok) continue;
  const snapped = snapToLattice(clone(p.mol));
  check(nameOf(snapped) === nameOf(p.mol), `snapToLattice preserves ${name}, got ${nameOf(snapped)}`);
}

// repairStereo puts back a configuration a move would have inverted
{
  const p = parseName('(2R)-butan-2-ol');
  if (p.ok) {
    const before = clone(p.mol);
    const moved = clone(p.mol);
    // mirror the structure, which inverts the centre
    moved.atoms = moved.atoms.map((a) => ({ ...a, x: -a.x }));
    const repaired = repairStereo(before, clone(moved));
    check(
      nameOf(repaired) === '(2R)-butan-2-ol',
      `repairStereo restores (2R) after a mirror, got ${nameOf(repaired)}`
    );
  }
}

// ── nextPosition (one-tap chain growth, CHECKLIST 1.1-1.2) ───
console.log('=== add-atom growth ===');
{
  let g2 = { atoms: [{ id: 1, x: 100, y: 150 }], bonds: [] };
  for (let i = 2; i <= 4; i++) {
    const from = g2.atoms[g2.atoms.length - 1];
    const pos = nextPosition(g2, from);
    g2 = {
      atoms: [...g2.atoms, { id: i, x: pos.x, y: pos.y }],
      bonds: [...g2.bonds, { a: from.id, b: i, order: 1, stereo: null }],
    };
  }
  const n = nameOf(g2);
  check(n === 'butane', `1.1 four Add-C presses -> butane, got ${n}`);
  const ys = g2.atoms.map((a) => a.y);
  const xs = g2.atoms.map((a) => a.x);
  const spreadX = Math.max(...xs) - Math.min(...xs);
  const spreadY = Math.max(...ys) - Math.min(...ys);
  check(spreadX > spreadY, `1.2 chain runs left-to-right, not vertically (dx ${spreadX.toFixed(0)} vs dy ${spreadY.toFixed(0)})`);
}

// ── NaN guard (a bad transform unmounts the whole canvas) ────
console.log('=== transform safety ===');
{
  const { safeTransform } = await import('../src/sandbox/constants.js');
  for (const bad of [
    { k: NaN, tx: 0, ty: 0 },
    { k: 1, tx: NaN, ty: 0 },
    { k: 1, tx: 0, ty: Infinity },
    { k: 0, tx: 0, ty: 0 },
    null,
    undefined,
    {},
  ]) {
    const t = safeTransform(bad);
    if (/NaN|Infinity|undefined/.test(t)) console.error('  BAD:', t);
    check(!/NaN|Infinity|undefined/.test(t), `safeTransform survives ${JSON.stringify(bad)} → ${t}`);
  }
  check(safeTransform({ k: 2, tx: 10, ty: -5 }) === 'translate(10,-5) scale(2)', 'good values pass through');
}


// ── Device frame keeps the phone's aspect ratio ──────────────
console.log('=== device frame ===');
{
  const { frameSize } = await import('../src/components/deviceSizes.js');
  const device = { width: 393, height: 852 };
  const ratio = device.width / device.height;
  for (const win of [
    { width: 1440, height: 900 },
    { width: 1280, height: 620 },
    { width: 900, height: 500 },
    { width: 420, height: 700 },
    { width: 320, height: 400 },
  ]) {
    const f = frameSize(device, win);
    const got = f.width / f.height;
    check(
      Math.abs(got - ratio) < 0.02,
      `frame keeps ratio in ${win.width}x${win.height}: wanted ${ratio.toFixed(3)}, got ${got.toFixed(3)}`
    );
    check(f.width <= device.width && f.height <= device.height, 'frame never exceeds the real device size');
    // …and it must actually fit the window, or the phone runs off screen
    const { TOOLBAR, MARGIN } = await import('../src/components/deviceSizes.js');
    check(
      f.height <= win.height - TOOLBAR - MARGIN * 2 + 1,
      `frame fits the window height at ${win.width}x${win.height}: ${f.height} > ${win.height - TOOLBAR - MARGIN * 2}`
    );
    check(f.width <= win.width - MARGIN * 2 + 1, `frame fits the window width at ${win.width}x${win.height}`);
  }
  const big = frameSize(device, { width: 2000, height: 1400 });
  check(big.width === device.width && big.height === device.height, 'on a large window the frame is full size');
}


// ── Canvas measurement cannot run away ──────────────────────
console.log('=== canvas size clamping ===');
{
  const { clampCanvasSize, CANVAS_MAX_H, CANVAS_MIN_H } = await import('../src/sandbox/constants.js');
  const start = { w: 360, h: 400 };
  // the runaway case: each layout reports a taller box than the last
  let sz = start;
  for (let i = 0; i < 50; i++) sz = clampCanvasSize({ w: 360, h: sz.h * 1.5 }, sz);
  check(sz.h <= CANVAS_MAX_H, `runaway growth is capped: ${sz.h} <= ${CANVAS_MAX_H}`);

  check(clampCanvasSize({ w: 360, h: 20 }, start).h >= CANVAS_MIN_H, 'a collapsed height is floored');
  check(clampCanvasSize({ w: NaN, h: 400 }, start) === start, 'NaN width is rejected');
  check(clampCanvasSize({ w: 360, h: Infinity }, start).h <= CANVAS_MAX_H, 'infinite height is capped');
  check(clampCanvasSize(null, start) === start, 'a missing layout keeps the previous size');
  check(clampCanvasSize({ w: 360.2, h: 400.3 }, start) === start, 'sub-pixel change does not re-render');
  const changed = clampCanvasSize({ w: 360, h: 520 }, start);
  check(changed.h === 520, 'a real change is accepted');
}

console.log(fails ? `\n${fails} FAILURES` : '\nSANDBOX LAYOUT OK');
process.exit(fails ? 1 : 0);
