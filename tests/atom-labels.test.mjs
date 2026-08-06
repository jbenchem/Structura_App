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

console.log(fails ? `\n${fails} FAILURES` : '\natom labels read correctly');
process.exit(fails ? 1 : 0);
