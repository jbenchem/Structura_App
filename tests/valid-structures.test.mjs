// Every structure a question shows must be a real molecule.
//
// A drawing with an over-valent carbon or a detached fragment is not a
// molecule, and a learner asked to name or count one is being tested on
// nonsense. The only exception is a question ABOUT the fault, which must say
// so with `intentionallyInvalid: true`.
import * as POOLS from '../src/content/pools.js';
import { STAGES } from '../src/content/curriculum.js';
import { nameGraph } from '../src/engine/index.js';
import { LIMIT } from '../src/sandbox/constants.js';
import { CATEGORY } from '../src/content/questionFactory.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } };

const elOf = (a) => a.el || 'C';

function faultsIn(mol) {
  const out = [];
  if (!mol || !mol.atoms || !mol.atoms.length) return ['empty'];

  // over-valence
  const load = {};
  for (const b of mol.bonds) {
    load[b.a] = (load[b.a] || 0) + (b.order || 1);
    load[b.b] = (load[b.b] || 0) + (b.order || 1);
  }
  for (const a of mol.atoms) {
    const limit = LIMIT[elOf(a)] ?? 4;
    if ((load[a.id] || 0) > limit) out.push(`${elOf(a)} with ${load[a.id]} bonds (max ${limit})`);
  }

  // one connected molecule, not several pieces
  if (mol.atoms.length > 1) {
    const adj = new Map(mol.atoms.map((a) => [a.id, []]));
    for (const b of mol.bonds) {
      if (adj.has(b.a)) adj.get(b.a).push(b.b);
      if (adj.has(b.b)) adj.get(b.b).push(b.a);
    }
    const seen = new Set([mol.atoms[0].id]);
    const queue = [mol.atoms[0].id];
    while (queue.length) {
      for (const n of adj.get(queue.pop()) || []) if (!seen.has(n)) { seen.add(n); queue.push(n); }
    }
    if (seen.size !== mol.atoms.length) out.push(`${mol.atoms.length - seen.size} atom(s) detached`);
  }

  // a bond pointing at an atom that is not there
  const ids = new Set(mol.atoms.map((a) => a.id));
  for (const b of mol.bonds) if (!ids.has(b.a) || !ids.has(b.b)) out.push('bond to a missing atom');

  return out;
}

const molesOf = (q) => {
  const out = [];
  if (q.mol) out.push(['mol', q.mol]);
  if (q.type === 'mcStructure' && q.options) q.options.forEach((m, i) => out.push([`option ${i}`, m]));
  return out;
};

console.log('=== question structures ===');
let checked = 0;
let allowed = 0;
for (const [key, pool] of Object.entries(POOLS).filter(([k]) => k.startsWith('POOL_'))) {
  for (const q of pool) {
    for (const [where, mol] of molesOf(q)) {
      checked++;
      const faults = faultsIn(mol);
      if (!faults.length) continue;
      if (q.intentionallyInvalid) { allowed++; continue; }
      ck(false, `${key}/${q.id} ${where}: ${faults.join('; ')}`);
    }
  }
}
console.log(`  ${checked} structures checked, ${allowed} deliberately faulty and declared`);

console.log('=== teaching structures ===');
let t = 0;
// An interactive constructs its molecules at run time from its configuration
// — the names it is given are checked by tests/interactives.test.mjs — so
// there is no attached structure to audit here.
const INTERACTIVE = new Set(['toggle', 'count', 'build', 'elements', 'alcohol', 'branch',
  'numbering', 'swap', 'priority', 'flip', 'isomers', 'ring', 'locants', 'brackets', 'trace', 'sort', 'slide', 'suffixtest', 'stepthrough', 'isomerhunt', 'formslider']);
for (const st of STAGES) for (const u of st.units) for (const l of u.lessons || []) for (const s of l.steps || []) {
  if (INTERACTIVE.has(s.type)) continue;
  for (const mol of [s.mol, s.target].filter(Boolean)) {
    t++;
    const faults = faultsIn(mol);
    if (faults.length && !s.intentionallyInvalid)
      ck(false, `${l.id} "${s.title || s.prompt || s.name}": ${faults.join('; ')}`);
  }
}
console.log(`  ${t} teaching structures checked`);

console.log('=== anything named must actually name ===');
let named = 0;
for (const [key, pool] of Object.entries(POOLS).filter(([k]) => k.startsWith('POOL_'))) {
  for (const q of pool) {
    // Only questions whose ANSWER is a name need a nameable molecule. The
    // discriminator is the category, not the type: a bond-counting question
    // uses the same multiple-choice type but shows methane with explicit
    // hydrogens, which the engine deliberately refuses to name.
    const NAMING = [CATEGORY.NAME_STRUCTURE, CATEGORY.WRITE_NAME, CATEGORY.BUILD_NAME];
    if (!NAMING.includes(q.category) || !q.mol) continue;
    if (q.intentionallyInvalid) continue;
    named++;
    const r = nameGraph(q.mol);
    ck(r.ok, `${key}/${q.id}: molecule cannot be named (${r.err})`);
  }
}
console.log(`  ${named} name-answer questions verified`);

console.log(fails ? `\n${fails} FAILURES` : '\nevery structure shown is a real molecule');
process.exit(fails ? 1 : 0);
