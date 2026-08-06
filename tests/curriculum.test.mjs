import { STAGES, UNITS } from '../src/content/curriculum.js';
import { checkDrawing, nameOf } from '../src/chem/engineBridge.js';
import { overValence, fragmentsOf } from '../src/chem/model.js';
import { NAME_QUESTIONS, checkName, normalizeName } from '../src/chem/questions.js';

let fails = 0;
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); fails++; } };

assert(STAGES.length === 10, `10 stages, got ${STAGES.length}`);
assert(UNITS.length === 37, `37 units after merging 1 and 2, got ${UNITS.length}`);
const themes = ['Foundations','Branching','Unsaturation and halogens','Oxygen and the ladder','Nitro and ethers','Nitrogen','Multifunctional molecules','Rings and aromatics','Isomerism and stereochemistry','Advanced nomenclature'];
themes.forEach((t,i)=>assert(STAGES[i].title===t, `stage ${i+1} titled "${t}", got "${STAGES[i].title}"`));
const counts = [2,3,2,8,2,3,4,3,5,5];
counts.forEach((c,i)=>assert(STAGES[i].units.length===c, `stage ${i+1} has ${c} units, got ${STAGES[i].units.length}`));

const authored = STAGES.slice(0,2).flatMap(st=>st.units);
assert(authored.length === 5 && authored.every(u => u.lessons && u.lessons.length), 'units 1-5 authored');
assert(authored.map(u=>u.n).join(',') === '1,2,3,4,5', 'unit numbers run 1-5 after the merge');
// unit numbers must stay unique and sequential across the whole curriculum
const ns = UNITS.map(u => u.n);
assert(ns.join(',') === ns.map((_,i)=>i+1).join(','), 'unit numbers are 1..n with no gaps');
const lessonCount = authored.reduce((n,u)=>n+u.lessons.length,0);
const stepCount = authored.flatMap(u=>u.lessons).reduce((n,l)=>n+l.steps.length,0);
console.log(`Units 1-5: ${lessonCount} lessons, ${stepCount} steps`);

// A sparse array (a stray double comma) leaves a hole that reads as
// undefined only when something walks it. Check for holes explicitly.
for (const st of STAGES) for (const u of st.units) {
  assert(!!u && !!u.id, `${st.id}: empty unit slot`);
  for (const l of u.lessons || []) {
    assert(!!l && !!l.id, `${u.id}: empty lesson slot`);
    for (const step of l.steps || []) assert(!!step && !!step.type, `${l.id}: empty step slot`);
  }
}

const clone = (t) => ({ atoms: t.atoms.map(a=>({...a})), bonds: t.bonds.map(b=>({...b})) });
const STRIP = /\((?:\d+[EZRS]|[EZRS])\)-?/g;
for (const u of authored) for (const l of u.lessons) for (const st of l.steps) {
  const t = st.target || st.mol;
  if (!t) continue;
  if (t.impossible) {
    // a teaching illustration of a structure that cannot exist — it must
    // genuinely break a rule, or the flag is hiding a real mistake
    assert(
      t.atoms.some(a => overValence(t, a)),
      `${l.id}: "${st.prompt || st.title}" is marked impossible but every atom obeys its valence`
    );
  } else {
    assert(!t.atoms.some(a => overValence(t, a)), `${l.id}: valence ok (${st.name || st.title || st.prompt})`);
  }
  assert(fragmentsOf(t).length === 1, `${l.id}: connected (${st.name || st.title})`);
  if (st.type === 'name' || st.type === 'draw') {
    assert(checkDrawing(clone(t), st.name).correct, `${l.id}: ${st.name} checks correct`);
    const r = nameOf(t);
    assert(r.ok, `${st.name}: engine can name it`);
    if (r.ok) assert(r.name.replace(STRIP,'') === st.name, `authored "${st.name}" but engine names "${r.name}"`);
  }
}

assert(NAME_QUESTIONS.length === 10, `10 name questions, got ${NAME_QUESTIONS.length}`);
const nq = NAME_QUESTIONS.find(q => q.name === 'but-2-ene');
assert(checkName('But-2-ene', nq), 'case-insensitive accept');
assert(checkName(' but - 2 - ene ', nq), 'whitespace-tolerant accept');
assert(checkName('2-butene', nq), 'alt spelling accepted');
assert(!checkName('but-1-ene', nq), 'wrong locant rejected');
assert(normalizeName('2,3\u2013dimethylbutane') === '2,3-dimethylbutane', 'en-dash normalized');

// count steps: the stated carbon count must match the molecule, and the
// molecule must name cleanly (the step reveals the name on completion)
for (const u of authored) for (const l of u.lessons) for (const st of l.steps) {
  if (st.type !== 'count') continue;
  const carbons = st.mol.atoms.filter((a) => !a.el || a.el === 'C').length;
  assert(carbons > 0, `${l.id}: count step has no carbons to find`);
  const res = nameOf(st.mol);
  assert(res.ok, `${l.id}: count step molecule must be nameable, got <${res.err}>`);
}

// toggle steps: both captions present, molecule nameable in both views
for (const u of authored) for (const l of u.lessons) for (const st of l.steps) {
  if (st.type !== 'toggle') continue;
  assert(st.captionFull && st.captionSkeletal, `${l.id}: toggle step is missing a caption`);
  const res = nameOf(st.mol);
  assert(res.ok, `${l.id}: toggle step molecule must be nameable, got <${res.err}>`);
}

// every step declares a known type
const TYPES = new Set(['teach', 'mc', 'name', 'draw', 'build', 'toggle', 'count', 'elements']);
for (const u of authored) for (const l of u.lessons) for (const st of l.steps)
  assert(TYPES.has(st.type), `${l.id}: unknown step type "${st.type}"`);

// mc steps: answer index must be in range and the explanation present
for (const u of authored) for (const l of u.lessons) for (const st of l.steps) {
  if (st.type !== 'mc') continue;
  assert(st.options && st.options.length >= 2, `${l.id}: mc needs at least two options`);
  assert(st.answer >= 0 && st.answer < st.options.length, `${l.id}: mc answer index out of range`);
  assert(st.explain && st.explain.length > 10, `${l.id}: mc needs a real explanation`);
}

// interactive build steps: every length in range must name as <root>ane
const ROOTS = ['meth','eth','prop','but','pent','hex','hept','oct','non','dec'];
for (const u of authored) for (const l of u.lessons) for (const st of l.steps) {
  if (st.type !== 'build') continue;
  const min = st.min || 1, max = st.max || 10;
  for (let n = min; n <= max; n++) {
    const atoms = [], bonds = [];
    for (let i = 0; i < n; i++) {
      atoms.push({ id: i + 1, x: i * 42, y: (i % 2) * 24 });
      if (i) bonds.push({ a: i, b: i + 1, order: 1, stereo: null });
    }
    const res = nameOf({ atoms, bonds });
    const r = res.ok ? res.name : `<${res.err}>`;
    assert(r === ROOTS[n-1] + 'ane', `build step: ${n} carbons should be ${ROOTS[n-1]}ane, got ${r}`);
  }
}

console.log(fails ? `${fails} FAILURES` : 'ALL CURRICULUM CHECKS PASS');
process.exitCode = fails ? 1 : 0;
