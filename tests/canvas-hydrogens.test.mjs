// Placing a heteroatom on the canvas fills its hydrogens automatically.
//
// They are NOT added to the graph: the naming engine rejects explicit
// hydrogens, so storing them would make every drawing unnameable. They are
// counted from the four-bond rule and drawn — so an oxygen dropped on a chain
// reads OH immediately, and the molecule still names as an alcohol.
import { implicitH } from '../src/sandbox/constants.js';
import { SandboxCanvas } from '../src/sandbox/SandboxCanvas.js';
import { nameGraph } from '../src/engine/index.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };

const shown = (el, bonds) => {
  const nH = implicitH({ el, id: 1 }, { 1: bonds });
  return el + (nH > 0 ? 'H' : '') + (nH > 1 ? String(nH) : '');
};

console.log('=== what a placed atom reads as ===');
ck(shown('O', 1) === 'OH', `oxygen on a chain reads ${shown('O', 1)}`);
ck(shown('N', 1) === 'NH2', `nitrogen on a chain reads ${shown('N', 1)}`);
ck(shown('S', 1) === 'SH', `sulfur on a chain reads ${shown('S', 1)}`);
ck(shown('Cl', 1) === 'Cl', `chlorine reads ${shown('Cl', 1)} — it has no hydrogen to carry`);
ck(shown('O', 2) === 'O', 'an oxygen bridging two carbons is a bare O — both bonds are used');
ck(shown('N', 2) === 'NH', 'a nitrogen with two bonds keeps one hydrogen');

console.log('=== drawing an alcohol still names ===');
{
  // a propane chain with an oxygen tapped onto the middle carbon
  const drawn = {
    atoms: [
      { id: 1, x: 0, y: 0 },
      { id: 2, x: 56, y: 32 },
      { id: 3, x: 112, y: 0 },
      { id: 4, x: 56, y: 96, el: 'O' },
    ],
    bonds: [
      { a: 1, b: 2, order: 1, stereo: null },
      { a: 2, b: 3, order: 1, stereo: null },
      { a: 2, b: 4, order: 1, stereo: null },
    ],
  };
  const r = nameGraph(drawn);
  ck(r.ok && r.name === 'propan-2-ol', `names as ${r.ok ? r.name : r.err}`);
  ck(!drawn.atoms.some((a) => a.el === 'H'), 'and no hydrogen was added to the graph');
  ck(shown('O', 1) === 'OH', 'while the oxygen still reads OH on screen');
}

console.log('=== the canvas renders without complaint ===');
{
  const graph = {
    atoms: [{ id: 1, x: 0, y: 0 }, { id: 2, x: 56, y: 32, el: 'O' }],
    bonds: [{ a: 1, b: 2, order: 1, stereo: null }],
  };
  const noop = () => {};
  const tree = SandboxCanvas({
    graph, setGraph: noop, setGraphLive: noop, endDrag: noop,
    selected: null, setSelected: noop, selBond: null, setSelBond: noop,
    ringTool: null, onPlaceRing: noop, chainTool: false, onDrawChain: noop,
    mode: null, element: 'C', bondType: 'single', showCarbons: false,
    width: 340, height: 400, view: { k: 1, tx: 0, ty: 0 }, setView: noop,
  });
  ck(!!tree, 'a chain with an oxygen on it renders');
}

console.log(fails ? `\n${fails} FAILURES` : '\nheteroatoms carry their hydrogens on sight');
process.exit(fails ? 1 : 0);
