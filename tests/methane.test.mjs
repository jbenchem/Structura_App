// Two rules about methane.
//
// It is one carbon with no bonds, so skeletal notation draws it as nothing at
// all — it must always be shown as CH4. And it must never be a drawing task:
// on the canvas it is a single tap with nothing to see.
import * as POOLS from '../src/content/pools.js';
import { STAGES } from '../src/content/curriculum.js';
import { StaticMol } from '../src/sandbox/render.js';
import { drawIt, straightChain, needsExplicitAtoms } from '../src/content/questionFactory.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };
const carbons = (m) => m.atoms.filter((a) => !a.el || a.el === 'C').length;

function textOf(node, out = [], depth = 0) {
  if (node == null || depth > 40) return out;
  if (typeof node === 'string' || typeof node === 'number') { out.push(String(node)); return out; }
  if (Array.isArray(node)) { node.forEach((n) => textOf(n, out, depth + 1)); return out; }
  if (typeof node !== 'object') return out;
  const { type, props } = node;
  if (typeof type === 'function') { textOf(type(props || {}), out, depth + 1); return out; }
  if (props && props.children != null) textOf(props.children, out, depth + 1);
  return out;
}

console.log('=== methane always draws as CH4 ===');
{
  // the outcome, not the flag: whatever the caller passes, something visible
  // must come out
  for (const showCarbons of [true, false]) {
    const drawn = textOf(StaticMol({ mol: straightChain(1), width: 240, showCarbons })).join('');
    ck(/C/.test(drawn) && /4/.test(drawn), `showCarbons=${showCarbons} renders "${drawn}"`);
  }
  const propane = textOf(StaticMol({ mol: straightChain(3), width: 240, showCarbons: false })).join('');
  ck(propane === '', 'a normal chain is still drawn skeletally (no labels)');
}

console.log('=== every single-carbon molecule in a question is visible ===');
let single = 0;
for (const [key, pool] of Object.entries(POOLS).filter(([k]) => k.startsWith('POOL_'))) {
  for (const q of pool) {
    const mols = q.type === 'mcStructure' ? q.options : q.mol ? [q.mol] : [];
    for (const m of mols) {
      if (carbons(m) !== 1) continue;
      single++;
      const drawn = textOf(StaticMol({ mol: m, width: 200, showCarbons: !!q.showCarbons })).join('');
      ck(drawn.length > 0, `${key}/${q.id}: renders something (${drawn || 'NOTHING'})`);
    }
  }
}
console.log(`  ${single} single-carbon molecules checked`);

console.log('=== nobody is asked to draw methane ===');
ck(drawIt(straightChain(1)) === null, 'drawIt refuses a single carbon');
ck(drawIt(straightChain(2)) !== null, 'and still accepts ethane');
for (const [key, pool] of Object.entries(POOLS).filter(([k]) => k.startsWith('POOL_'))) {
  for (const q of pool) {
    if (q.type !== 'draw') continue;
    ck(!/^methane$/i.test(q.name || ''), `${key}/${q.id}: not methane`);
  }
}
for (const st of STAGES) for (const u of st.units) for (const l of u.lessons || []) for (const s of l.steps || []) {
  if (s.type === 'draw') ck(!/^methane$/i.test(s.name || ''), `${l.id}: teaching draw step is not methane`);
}

console.log(fails ? `\n${fails} FAILURES` : '\nmethane is always visible and never drawn');
process.exit(fails ? 1 : 0);
