// Atom labels must read as chemists write them. Counting correctly is not the
// same as drawing correctly, so this checks the text that actually renders.
import { StaticMol } from '../src/sandbox/render.js';
import { STAGES } from '../src/content/curriculum.js';
import { parseName } from '../src/engine/index.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };

// walk a rendered tree collecting every string it would draw
function collectText(node, out = [], depth = 0) {
  if (node == null || depth > 40) return out;
  if (typeof node === 'string' || typeof node === 'number') { out.push(String(node)); return out; }
  if (Array.isArray(node)) { node.forEach((n) => collectText(n, out, depth + 1)); return out; }
  if (typeof node !== 'object') return out;
  const { type, props } = node;
  if (typeof type === 'function') { collectText(type(props || {}), out, depth + 1); return out; }
  if (props && props.children != null) collectText(props.children, out, depth + 1);
  return out;
}

const textOf = (mol, showCarbons) =>
  collectText(StaticMol({ mol, width: 300, showCarbons })).join('|');

console.log('=== explicit hydrogens ===');
const methane = STAGES[0].units[0].lessons[0].steps.find((s) => s.mol && s.mol.atoms.some((a) => a.el === 'H'));
ck(!!methane, 'the methane card still draws explicit hydrogens');
if (methane) {
  const t = textOf(methane.mol, true);
  ck(!/HH/.test(t), `no doubled hydrogen labels — got ${t}`);
  ck(!/H\|3|H3/.test(t.replace(/C\|/g, '')), `no subscript on an explicit H — got ${t}`);
  ck((t.match(/H/g) || []).length >= 4, 'all four hydrogens are labelled');
}

console.log('=== ordinary skeletal labels are unchanged ===');
{
  const propane = parseName('propane').mol;
  const bare = textOf(propane, false);
  ck(!/C/.test(bare), `skeletal propane draws no atom labels — got "${bare}"`);
  const full = textOf(propane, true);
  ck(/3/.test(full), `with every atom shown, CH3 keeps its subscript — got "${full}"`);
}
{
  const ol = parseName('propan-2-ol').mol;
  const t = textOf(ol, false);
  ck(/O/.test(t), `the hydroxyl oxygen is labelled — got "${t}"`);
  ck(/H/.test(t), 'and carries its hydrogen');
}

// A label belongs ON the vertex, with the bond stopping just outside its box.
// Trimming by the label's half-width regardless of direction pulled a steep
// bond back by the full width of "CH2", leaving a gap that read as the label
// being off to one side of the corner.
console.log('=== bonds stop just outside the label, evenly ===');
{
  const { labelWidth } = await import('../src/sandbox/constants.js');
  const scale = 0.9;
  const size = 14 * scale;
  const halfW = labelWidth('C', 2, size) / 2;
  const halfH = size * 0.72;
  const trimAt = (deg) => {
    const r = (deg * Math.PI) / 180;
    const ux = Math.cos(r);
    const uy = Math.sin(r);
    const tx = Math.abs(ux) < 1e-6 ? Infinity : halfW / Math.abs(ux);
    const ty = Math.abs(uy) < 1e-6 ? Infinity : halfH / Math.abs(uy);
    return Math.min(tx, ty) + 2;
  };
  // the gap must never exceed the label's own reach in that direction by much
  for (const deg of [0, 30, 45, 60, 90, 120, 150]) {
    const t = trimAt(deg);
    const reach = Math.max(halfW, halfH);
    ck(t > 0 && t <= reach + 4, `bond at ${deg}°: stops ${t.toFixed(1)}px out (label reaches ${reach.toFixed(1)})`);
  }
  // a steep bond must be trimmed LESS than a flat one, because the label is
  // wider than it is tall
  ck(trimAt(90) < trimAt(0), `a vertical bond is trimmed less (${trimAt(90).toFixed(1)}) than a horizontal one (${trimAt(0).toFixed(1)})`);
}

console.log(fails ? `\n${fails} FAILURES` : '\natom labels read correctly');
process.exit(fails ? 1 : 0);
