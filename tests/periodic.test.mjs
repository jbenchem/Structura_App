// The periodic table is a reference: if it disagrees with the checker, a
// learner will trust it and then be marked wrong.
import { ELEMENTS, BONDS_BY_GROUP, GROUPS, PERIODS, elementAt, bySymbol } from '../src/content/periodicTable.js';
import { LIMIT } from '../src/sandbox/constants.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };

console.log('=== bond counts match the drawing engine ===');
// Every element the canvas knows how to draw must agree with the table.
for (const [sym, limit] of Object.entries(LIMIT)) {
  const el = bySymbol(sym);
  if (!el) continue;
  ck(el.bonds === limit, `${sym}: table says ${el.bonds} bonds, canvas enforces ${limit}`);
}

console.log('=== the column sets the count ===');
for (const el of ELEMENTS) {
  ck(
    el.bonds === BONDS_BY_GROUP[el.group],
    `${el.sym} (group ${el.group}) has ${el.bonds}, group rule says ${BONDS_BY_GROUP[el.group]}`
  );
}
// the pattern the lesson teaches: 4, 3, 2, 1 across the p-block
ck(BONDS_BY_GROUP[14] === 4 && BONDS_BY_GROUP[15] === 3 && BONDS_BY_GROUP[16] === 2 && BONDS_BY_GROUP[17] === 1,
   'counts fall 4, 3, 2, 1 from group 14 to 17');
ck(BONDS_BY_GROUP[18] === 0, 'noble gases form no bonds');

console.log('=== table shape ===');
ck(GROUPS.length === 8, `eight main-group columns, got ${GROUPS.length}`);
for (const period of PERIODS) {
  for (const group of GROUPS) {
    const el = elementAt(group, period);
    if (el) ck(el.z > 0 && !!el.name, `${el.sym} is complete`);
  }
}
ck(!!elementAt(14, 2) && elementAt(14, 2).sym === 'C', 'carbon sits in group 14, period 2');
ck(!!elementAt(16, 2) && elementAt(16, 2).sym === 'O', 'oxygen sits in group 16, period 2');

console.log('=== the organic elements are the ones the course uses ===');
const organic = ELEMENTS.filter((e) => e.organic).map((e) => e.sym).sort();
ck(organic.join(',') === 'Br,C,Cl,F,H,I,N,O,S', `flagged as organic: ${organic.join(', ')}`);
for (const el of ELEMENTS.filter((e) => e.organic)) {
  ck(el.functional.length > 0, `${el.sym} lists where it is met`);
  ck(!!el.role, `${el.sym} explains what it does`);
}

// ── Illustration diagrams ───────────────────────────────────
console.log('=== situational diagrams ===');
{
  const D = await import('../src/content/diagrams.js');
  const { overValence } = await import('../src/chem/model.js');

  const shouldBreak = ['carbonWithFiveBonds', 'hydrogenWithTwoBonds', 'oxygenWithThreeBonds'];
  const shouldHold = ['carbonWithFourBonds', 'hydrogenWithOneBond', 'oxygenWithTwoBonds'];

  for (const name of shouldBreak) {
    const m = D[name]();
    ck(m.impossible === true, `${name} is flagged as an illustration of something impossible`);
    ck(m.atoms.some((a) => overValence(m, a)), `${name} genuinely breaks a valence rule`);
  }
  for (const name of shouldHold) {
    const m = D[name]();
    ck(!m.impossible, `${name} is not flagged impossible`);
    ck(!m.atoms.some((a) => overValence(m, a)), `${name} obeys every valence`);
  }
  for (let n = 0; n <= 4; n++) {
    const m = D.carbonWithNeighbours(n);
    ck(m.bonds.length === 4, `a carbon with ${n} carbon neighbours still draws four bonds`);
    ck(!m.atoms.some((a) => overValence(m, a)), `carbonWithNeighbours(${n}) obeys its valence`);
  }
}

console.log('=== every drawable element is visually distinct ===');
{
  const { EL_COLOUR, elColour } = await import('../src/sandbox/constants.js');
  const { LIMIT } = await import('../src/sandbox/constants.js');
  const drawable = Object.keys(LIMIT);
  const seen = new Map();
  for (const sym of drawable) {
    const colour = elColour(sym);
    ck(!!EL_COLOUR[sym], `${sym} has a colour of its own rather than the fallback`);
    if (seen.has(colour)) ck(false, `${sym} shares its colour with ${seen.get(colour)}`);
    seen.set(colour, sym);
  }
  console.log(`  ${drawable.length} drawable elements, ${seen.size} distinct colours`);
  // the pair that prompted this
  ck(elColour('Cl') !== elColour('H'), 'chlorine and hydrogen are different colours');
  ck(elColour('Cl') !== elColour('F'), 'chlorine and fluorine are different colours');
  ck(elColour('Br') !== elColour('I'), 'bromine and iodine are different colours');
  // and anything new is still visible
  ck(!!elColour('Xx'), 'an unlisted element still gets a colour rather than nothing');
}

console.log(fails ? `\n${fails} FAILURES` : '\nthe periodic reference agrees with the engine');
process.exit(fails ? 1 : 0);
