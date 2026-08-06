// ─────────────────────────────────────────────────────────────
// Render smoke test.
//
// Static checks and bundling both pass on code that references an
// unimported identifier — it only fails when the component runs.
// This suite actually CALLS every sandbox component with realistic
// props, against stubbed react / react-native / svg modules, so
// that class of bug fails here instead of on a phone.
//
// It does not verify appearance. It verifies that each component
// executes end to end without throwing.
// ─────────────────────────────────────────────────────────────

import { parseName } from '../src/engine/index.js';
import { AtomLabel, BondShape, RingIcon, StaticMol } from '../src/sandbox/render.js';
import { TappableName } from '../src/sandbox/TappableName.js';
import { SandboxCanvas } from '../src/sandbox/SandboxCanvas.js';
import { DrawView } from '../src/sandbox/DrawView.js';
import { LookupView } from '../src/sandbox/LookupView.js';
import { QuestionCanvas } from '../src/sandbox/QuestionCanvas.js';
import { ChainBuilder } from '../src/screens/main/ChainBuilder.js';
import { StructureToggle, CountAtoms } from '../src/screens/main/InteractiveSteps.js';
import { DeviceFrame, useViewport } from '../src/components/DeviceFrame.js';
import { Overlay, SheetOverlay, LoadingScreen, FadeIn, SectionWipe } from '../src/components/Overlay.js';
import { playCorrect, playIncorrect, setSoundEnabled } from '../src/sounds.js';
import { QuestionShell } from '../src/screens/main/QuestionViews.js';
import { ReferenceSheet } from '../src/screens/main/ReferenceSheet.js';
import { PeriodicTable, ElementDetail } from '../src/components/PeriodicTable.js';
import { ElementExplorer } from '../src/screens/main/InteractiveSteps.js';
import { bySymbol } from '../src/content/periodicTable.js';
import { CanvasSurface } from '../src/sandbox/CanvasSurface.js';
import { CanvasDock } from '../src/sandbox/CanvasDock.js';
import { nameGraph } from '../src/engine/index.js';

let fails = 0;
const run = (label, fn) => {
  try {
    const out = fn();
    if (out === undefined) throw new Error('returned undefined');
    console.log(`  ok   ${label}`);
  } catch (e) {
    console.error(`  FAIL ${label}: ${e.message}`);
    fails++;
  }
};

// A real molecule to render, with a stereocentre and a heteroatom.
const p = parseName('(2R)-butan-2-ol');
if (!p.ok) {
  console.error('setup failed: could not build (2R)-butan-2-ol');
  process.exit(1);
}
const mol = p.mol;
const named = nameGraph(mol);
const atById = (id) => mol.atoms.find((a) => a.id === id);

console.log('=== leaf components ===');
run('AtomLabel', () => AtomLabel({ x: 10, y: 10, el: 'O', nH: 1, fill: '#000', size: 15, bg: '#fff' }));
run('RingIcon', () => RingIcon({ n: 6, aromatic: true, colour: '#000', size: 26 }));
run('BondShape', () =>
  BondShape({
    b: mol.bonds[0],
    A: atById(mol.bonds[0].a),
    B: atById(mol.bonds[0].b),
    showCarbons: false,
    atById,
    scale: 1,
    hydrogens: {},
    hot: false,
    sideHint: null,
  })
);
run('BondShape (showCarbons)', () =>
  BondShape({
    b: mol.bonds[0],
    A: atById(mol.bonds[0].a),
    B: atById(mol.bonds[0].b),
    showCarbons: true,
    atById,
    scale: 1,
    hydrogens: {},
    hot: true,
    sideHint: 1,
  })
);

console.log('=== name rendering ===');
run('TappableName (explain on)', () =>
  TappableName({ parts: named.parts, name: named.name, active: 0, onPick: () => {}, size: 17 })
);
run('TappableName (explain off — parts null)', () =>
  TappableName({ parts: null, name: named.name, active: null, onPick: () => {}, size: 17 })
);

console.log('=== structure views ===');
run('StaticMol', () =>
  StaticMol({ mol, width: 320, showCarbons: false, highlight: null, locants: null, onPickAtom: null })
);
run('StaticMol (highlight + locants + picking)', () =>
  StaticMol({
    mol,
    width: 320,
    showCarbons: true,
    highlight: new Set([mol.atoms[0].id]),
    locants: named.locants,
    onPickAtom: () => {},
  })
);

console.log('=== canvas ===');
run('SandboxCanvas (empty)', () =>
  SandboxCanvas({
    graph: { atoms: [], bonds: [] },
    setGraph: () => {},
    setGraphLive: () => {},
    endDrag: () => {},
    selected: null,
    setSelected: () => {},
    selBond: null,
    setSelBond: () => {},
    ringTool: null,
    onPlaceRing: () => {},
    chainTool: false,
    onDrawChain: () => {},
    mode: 'draw',
    element: 'C',
    bondType: 'single',
    showCarbons: false,
    width: 360,
    height: 300,
    view: { k: 1, tx: 0, ty: 0 },
    setView: () => {},
    highlight: null,
    onPickAtom: null,
    locants: null,
  })
);
run('SandboxCanvas (populated, selection, highlight)', () =>
  SandboxCanvas({
    graph: mol,
    setGraph: () => {},
    setGraphLive: () => {},
    endDrag: () => {},
    selected: mol.atoms[0].id,
    setSelected: () => {},
    selBond: mol.bonds[0],
    setSelBond: () => {},
    ringTool: 'benzene',
    onPlaceRing: () => {},
    chainTool: true,
    onDrawChain: () => {},
    mode: 'erase',
    element: 'O',
    bondType: 'double',
    showCarbons: true,
    width: 360,
    height: 300,
    view: { k: 1.2, tx: 10, ty: 10 },
    setView: () => {},
    highlight: new Set([mol.atoms[0].id]),
    onPickAtom: () => {},
    locants: named.locants,
  })
);

console.log('=== the two views, explain on and off ===');
for (const explain of [true, false]) {
  run(`DrawView (explain=${explain})`, () =>
    DrawView({ width: 390, height: 844, explain, stereoStyle: 'ez' })
  );
  run(`LookupView (explain=${explain})`, () =>
    LookupView({ width: 390, explain, stereoStyle: 'ez' })
  );
}
run('LookupView (cis/trans style)', () =>
  LookupView({ width: 390, explain: true, stereoStyle: 'cistrans' })
);

console.log('=== dock and question canvas ===');
const noop = () => {};
run('CanvasDock (all tabs)', () =>
  CanvasDock({
    bondType: 'single', setBondType: noop,
    element: 'C', setElement: noop, showCarbons: false, setShowCarbons: noop,
    ringTool: null, setRingTool: noop, chainTool: false, setChainTool: noop,
    onAddAtom: noop, eraseOn: false, onToggleErase: noop,
    onClean: noop, canClean: true, onUndo: noop, canUndo: true, onClear: noop,
    moreItems: [{ id: 'x', label: 'X', icon: 'bookmark-outline', onPress: noop }],
    onDeselect: noop,
  })
);
run('CanvasDock (question subset)', () =>
  CanvasDock({
    tabs: ['bond', 'atom', 'edit'],
    bondType: 'double', setBondType: noop, element: 'O', setElement: noop,
    showCarbons: true, setShowCarbons: noop, ringTool: null, setRingTool: noop,
    onAddAtom: noop, eraseOn: true, onToggleErase: noop, onClean: noop, canClean: false,
    onUndo: noop, canUndo: false, onClear: noop, onDeselect: noop,
  })
);
run('CanvasSurface (empty)', () =>
  CanvasSurface({ graph: { atoms: [], bonds: [] }, setGraph: noop,
    emptyHint: { title: 'x', body: 'y' } }, { current: null })
);
run('QuestionCanvas (with structure + error banner)', () => {
  const g = parseName('2-methylbutane').mol;
  return QuestionCanvas({ graph: g, setGraph: noop,
    banner: { kind: 'error', title: 'Check the position', message: 'msg', onDismiss: noop } },
    { current: null });
});

run('ChainBuilder', () =>
  ChainBuilder({ step: { title: 'x', body: 'y', start: 3, min: 1, max: 10 }, width: 360, onContinue: () => {} })
);

run('StructureToggle', () => {
  const mol = parseName('butane').mol;
  return StructureToggle({ step: { title: 't', body: 'b', mol, captionFull: 'f', captionSkeletal: 's' }, width: 360, onContinue: () => {} });
});
run('CountAtoms', () => {
  const mol = parseName('pentane').mol;
  return CountAtoms({ step: { title: 't', body: 'b', mol, doneNote: 'n' }, width: 360, onContinue: () => {} });
});

run('DeviceFrame (native pass-through)', () => DeviceFrame({ children: 'app' }));
run('useViewport falls back to the window', () => {
  const v = useViewport();
  if (!v || typeof v.width !== 'number') throw new Error('viewport has no width');
  return v;
});

run('Overlay (visible)', () => Overlay({ visible: true, children: 'x' }));
run('Overlay (hidden renders nothing)', () => Overlay({ visible: false, children: 'x' }));
run('SheetOverlay', () => SheetOverlay({ visible: true, onClose: () => {}, children: 'x' }));
run('LoadingScreen', () => LoadingScreen({ title: 'The roots', subtitle: 'Unit 1' }));
run('FadeIn', () => FadeIn({ children: 'x' }));

run('sounds (placeholder, must not throw)', () => {
  playCorrect();
  playIncorrect();
  setSoundEnabled(false);
  playCorrect();
  setSoundEnabled(true);
  return null;
});
run('QuestionShell with verdict', () =>
  QuestionShell({
    q: { chip: 'X', prompt: 'p', explain: 'e' },
    children: null, canCheck: true, checked: true, correct: false,
    onCheck: () => {}, onContinue: () => {}, last: false,
  })
);

run('ReferenceSheet (open)', () => ReferenceSheet({ visible: true, onClose: () => {} }));
run('ReferenceSheet (closed)', () => ReferenceSheet({ visible: false, onClose: () => {} }));

run('SectionWipe', () =>
  SectionWipe({
    label: 'Test your understanding',
    sub: '10 questions',
    onCover: () => {},
    onDone: () => {},
    width: 380,
  })
);

run('PeriodicTable (static)', () => PeriodicTable({}));
run('PeriodicTable (interactive)', () => PeriodicTable({ selected: 'C', onSelect: () => {} }));
run('ElementDetail (organic element)', () => ElementDetail({ el: bySymbol('O') }));
run('ElementDetail (noble gas)', () => ElementDetail({ el: bySymbol('Ne') }));
run('ElementExplorer', () => ElementExplorer({ step: { title: 't', body: 'b', start: 'C', need: 3 }, width: 380, onContinue: () => {} }));

run('StaticMol with stereo hydrogens', () => {
  const mol = parseName('cis-but-2-ene').mol;
  return StaticMol({ mol, width: 260, showCarbons: false, showStereoH: true });
});

console.log(fails ? `\n${fails} FAILURES` : '\nRENDER SMOKE OK');
process.exit(fails ? 1 : 0);
