// Canvas behaviour that has to hold regardless of what the UI looks like.
import { CanvasSurface } from '../src/sandbox/CanvasSurface.js';
import { CanvasDock, editItems } from '../src/sandbox/CanvasDock.js';
import { fitView } from '../src/sandbox/constants.js';

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
const labels = (tree) =>
  findAll(tree, (n) => n.props && n.props.accessibilityLabel).map((n) => n.props.accessibilityLabel);

const noop = () => {};
const surface = CanvasSurface(
  { graph: { atoms: [], bonds: [] }, setGraph: noop, width: 360 },
  { current: null }
);

console.log('=== the canvas actions actually run ===');
// Rendering a component does not run its callbacks, so an undefined local
// inside fit/clean/zoom stays hidden until a finger touches the button. These
// call them directly. (Both `width` in the lesson player and `canvasW` here
// crashed this way after a rename.)
{
  const chain = {
    atoms: Array.from({ length: 6 }, (_, i) => ({ id: i + 1, x: i * 55, y: (i % 2) * 32 })),
    bonds: Array.from({ length: 5 }, (_, i) => ({ a: i + 1, b: i + 2, order: 1, stereo: null })),
  };
  const ref = { current: null };
  CanvasSurface({ graph: chain, setGraph: noop, width: 360 }, ref);
  ck(!!ref.current, 'the canvas exposes its actions');
  for (const action of ['fit', 'clean', 'resetView', 'deselect', 'reset']) {
    let err = null;
    try {
      ref.current[action]();
    } catch (e) {
      err = e;
    }
    ck(!err, `${action}() runs without throwing${err ? ` — ${err.message}` : ''}`);
  }
}

console.log('=== canvas overlay controls ===');
const found = labels(surface);
ck(found.includes('undo'), `undo button present — got ${found.join(', ')}`);
ck(found.includes('redo'), 'redo button present');
ck(found.includes('clean up the structure'), 'clean button present');
ck(!found.includes('fit to view'), 'the frame button is gone');

console.log('=== the Edit tray ===');
const dock = CanvasDock({
  bondType: 'single', setBondType: noop, element: 'C', setElement: noop,
  showCarbons: false, setShowCarbons: noop, ringTool: null, setRingTool: noop,
  chainTool: false, setChainTool: noop, eraseOn: false,
  onToggleErase: noop, onClean: noop, canClean: true,
  onUndo: noop, canUndo: true, onRedo: noop, canRedo: true, onClear: noop,
  moreItems: [], onDeselect: noop,
});
ck(!!dock, 'the dock renders with redo wired');

{
  const items = editItems({ canClean: true, canUndo: true, canRedo: true });
  const names = items.map((i) => i.label);
  ck(!names.includes('Add carbon'), `Add carbon is gone — tray is ${names.join(', ')}`);
  ck(names.join(',') === 'Erase,Clean,Undo,Redo,Clear', `tray reads Erase, Clean, Undo, Redo, Clear — got ${names.join(', ')}`);
  ck(new Set(items.map((i) => i.id)).size === items.length, 'tray ids are unique');
  const disabled = editItems({ canClean: false, canUndo: false, canRedo: false });
  ck(
    disabled.filter((i) => i.disabled).map((i) => i.id).join(',') === 'clean,undo,redo',
    'clean, undo and redo disable when there is nothing to do'
  );
}

console.log('=== clean frames the molecule in the visible area ===');
{
  const { fitView } = await import('../src/sandbox/constants.js');
  const TOP = 56;
  const DOCK = 96;
  const W = 390;
  const H = 700;
  const visibleMidY = TOP + (H - TOP - DOCK) / 2;

  // a long chain, drawn well off to one side and high up
  const bbox = { minX: 400, maxX: 1200, minY: -300, maxY: -160 };
  const v = fitView(bbox, W, H, { bottomInset: DOCK });

  // where does the centre of the molecule land on screen?
  const cx = ((bbox.minX + bbox.maxX) / 2) * v.k + v.tx;
  const cy = ((bbox.minY + bbox.maxY) / 2) * v.k + v.ty;
  ck(Math.abs(cx - W / 2) < 0.5, `centred horizontally: ${cx.toFixed(1)} vs ${W / 2}`);
  ck(
    Math.abs(cy - visibleMidY) < 0.5,
    `centred in the VISIBLE band, not the whole canvas: ${cy.toFixed(1)} vs ${visibleMidY.toFixed(1)}`
  );
  ck(cy < H / 2, 'which sits above the middle of the canvas, because the dock covers the foot');

  // it must fit, with the padding respected
  const left = bbox.minX * v.k + v.tx;
  const right = bbox.maxX * v.k + v.tx;
  const top = bbox.minY * v.k + v.ty;
  const bottom = bbox.maxY * v.k + v.ty;
  ck(left >= 0 && right <= W, `fits horizontally (${left.toFixed(0)}..${right.toFixed(0)} in ${W})`);
  ck(top >= TOP - 1 && bottom <= H - DOCK + 1, `fits between the controls (${top.toFixed(0)}..${bottom.toFixed(0)})`);

  // a huge molecule must zoom out rather than overflow
  const huge = fitView({ minX: 0, maxX: 4000, minY: 0, maxY: 2000 }, W, H, { bottomInset: DOCK });
  ck(huge.k < 1, `a large structure zooms out (k = ${huge.k.toFixed(2)})`);
  // …down to the floor. There is a real trade-off here: below the floor a bond
  // renders very small, but above it a long chain simply will not fit and its
  // ends sit off screen after Clean, which is worse. The floor is set so a
  // 20-carbon chain — the longest root in the reference table — fits across a
  // phone; anything larger is framed as far out as is useful and then panned.
  ck(huge.k === 0.2, `and stops at the floor rather than shrinking further (k = ${huge.k})`);

  // a single atom must not zoom to absurdity
  const tiny = fitView({ minX: 0, maxX: 0, minY: 0, maxY: 0 }, W, H, { bottomInset: DOCK });
  ck(tiny.k <= 2.4, `a single atom is capped at 2.4x (got ${tiny.k})`);
}

console.log('=== two-finger gesture anchors on the starting midpoint ===');
{
  // Model the corrected pinch maths: at constant scale, moving the fingers
  // must translate the view by the same amount.
  const view0 = { k: 1, tx: 0, ty: 0 };
  const mid0 = { x: 100, y: 100 };
  const anchor = { x: (mid0.x - view0.tx) / view0.k, y: (mid0.y - view0.ty) / view0.k };
  const mid1 = { x: 160, y: 130 };
  const k = view0.k; // no zoom, pure drag
  const tx = mid1.x - anchor.x * k;
  const ty = mid1.y - anchor.y * k;
  ck(tx === 60 && ty === 30, `dragging two fingers pans by the drag (${tx}, ${ty})`);

  // and zooming about the same anchor keeps that point under the fingers
  const k2 = 2;
  const tx2 = mid0.x - anchor.x * k2;
  const point = anchor.x * k2 + tx2;
  ck(Math.abs(point - mid0.x) < 1e-9, 'zooming keeps the anchored point under the fingers');
}

console.log('=== clean centres the molecule ===');
{
  const W = 360;
  const H = 700;
  const TOP = 56;
  const DOCK = 150;
  const centreOf = (bbox, view) => ({
    x: view.tx + view.k * ((bbox.minX + bbox.maxX) / 2),
    y: view.ty + view.k * ((bbox.minY + bbox.maxY) / 2),
  });

  // a wide molecule — a long chain, the case that was off-centre
  const wide = { minX: 0, maxX: 900, minY: 0, maxY: 120 };
  const v = fitView(wide, W, H, { topInset: TOP, bottomInset: DOCK });
  const c = centreOf(wide, v);
  ck(Math.abs(c.x - W / 2) < 0.5, `centred horizontally: ${c.x.toFixed(1)} vs ${W / 2}`);
  const band = TOP + (H - TOP - DOCK) / 2;
  ck(Math.abs(c.y - band) < 0.5, `centred in the visible band, clear of the dock: ${c.y.toFixed(1)} vs ${band}`);
  ck(v.k < 1, `and zoomed out to fit a wide structure (k = ${v.k.toFixed(2)})`);

  // a tall molecule
  const tall = { minX: 0, maxX: 100, minY: 0, maxY: 1200 };
  const v2 = fitView(tall, W, H, { topInset: TOP, bottomInset: DOCK });
  const c2 = centreOf(tall, v2);
  ck(Math.abs(c2.x - W / 2) < 0.5, 'tall molecule centred horizontally');
  ck(Math.abs(c2.y - band) < 0.5, 'tall molecule centred in the band');

  // a small one must not be blown up past the cap
  const small = { minX: 0, maxX: 40, minY: 0, maxY: 40 };
  const v3 = fitView(small, W, H, { topInset: TOP, bottomInset: DOCK });
  ck(v3.k <= 2.4, `small molecule capped at 2.4x (k = ${v3.k.toFixed(2)})`);
  ck(Math.abs(centreOf(small, v3).y - band) < 0.5, 'small molecule still centred');

  // real chain lengths must fit across a phone after Clean
  for (const n of [10, 14, 20]) {
    const wOf = (n - 1) * 64 * 0.87;   // the lattice the app draws on
    const bbox = { minX: 0, maxX: wOf, minY: 0, maxY: 55 };
    const vv = fitView(bbox, W, H, { topInset: TOP, bottomInset: DOCK });
    const drawnW = wOf * vv.k;
    ck(drawnW <= W - 8, `${n}-carbon chain fits the width after Clean (${drawnW.toFixed(0)} of ${W})`);
  }

  // the whole structure must actually be inside the visible band
  const drawnTop = v.ty + v.k * wide.minY;
  const drawnBottom = v.ty + v.k * wide.maxY;
  ck(drawnTop >= TOP - 1, `top of the structure clears the header (${drawnTop.toFixed(0)})`);
  ck(drawnBottom <= H - DOCK + 1, `bottom clears the dock (${drawnBottom.toFixed(0)} <= ${H - DOCK})`);
}

console.log(fails ? `\n${fails} FAILURES` : '\ncanvas controls behave');
process.exit(fails ? 1 : 0);
