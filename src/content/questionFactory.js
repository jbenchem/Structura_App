// ─────────────────────────────────────────────────────────────
// Question factory.
//
// Every question here is GENERATED from a molecule and named by the
// engine, so the answer is correct by construction. Hand-authoring
// 30 questions per lesson would mean 30 chances to write the wrong
// name; this way the only thing an author chooses is which
// molecules to ask about and how to phrase the prompt.
//
// Question shape (rendered by QuestionShell in the lesson player):
//   { id, type, chip, prompt, subtitle?, mol?, options?, answer,
//     explain, hint? }
//
// Types
//   mcName       choose the correct name from four names
//   mcStructure  choose the correct structure from four drawings
//   write        type the name
//   number       enter a number on a keypad
//   draw         build the structure on the canvas
//   countTap     tap every carbon in the drawing
// ─────────────────────────────────────────────────────────────

import { nameGraph, parseName } from '../engine/index.js';
import { tidy } from '../sandbox/layout';
// One lattice everywhere: the tidier works at the canvas's bond length, so
// generating at a different one made structures jump scale when cleaned.
import { BOND } from '../sandbox/constants';

// Questions always show a cleanly laid-out structure. tidy is
// identity-preserving — it keeps its result only when the molecule still names
// the same — so this can never change what is being asked, only how it looks.
export function clean(mol) {
  if (!mol || mol.atoms.length < 2) return mol;
  try {
    return tidy(mol);
  } catch (e) {
    return mol;
  }
}

const ROOTS = ['meth', 'eth', 'prop', 'but', 'pent', 'hex', 'hept', 'oct', 'non', 'dec'];

// ── molecule builders ────────────────────────────────────────
export function straightChain(n) {
  const atoms = [];
  const bonds = [];
  for (let i = 0; i < n; i++) {
    atoms.push({ id: i + 1, x: i * BOND * 0.87, y: (i % 2) * BOND * 0.5 });
    if (i) bonds.push({ a: i, b: i + 1, order: 1, stereo: null });
  }
  return { atoms, bonds };
}

// Same molecule, drawn with a corner partway along — for questions about
// reading a drawing rather than about the molecule itself.
//
// Every bond turns by exactly 60 degrees (a 120 degree interior angle), which
// is what keeps the drawing clean: the earlier version alternated in a way
// that folded atoms back to within half a bond length of each other.
export function bentChain(n, turnAt) {
  const RUN = [-30, 30];   // the usual zigzag, running right
  const TURN = [30, 90];   // after the corner, running down-right
  const atoms = [];
  const bonds = [];
  let x = 0;
  let y = 0;
  for (let i = 0; i < n; i++) {
    atoms.push({ id: i + 1, x, y });
    if (i) bonds.push({ a: i, b: i + 1, order: 1, stereo: null });
    const set = i < turnAt ? RUN : TURN;
    const deg = set[i % 2];
    const rad = (deg * Math.PI) / 180;
    x += BOND * Math.cos(rad);
    y += BOND * Math.sin(rad);
  }
  return { atoms, bonds };
}

// ── Authoring by name ────────────────────────────────────────
// Ask the engine for a structure instead of building it by hand:
//
//   MOL('nonane')
//   MOL('2-methylbutane')
//   MOL('but-2-ene')
//   MOL('1,2-dichloroethane')
//
// Anything the engine can parse works, including trivial names (aspirin) and
// alternative spellings (2-butene), which are converted to the preferred form.
//
// A name the engine cannot build throws IMMEDIATELY, at module load, naming
// the offending string — so a typo in a lesson fails the test run rather than
// rendering as an empty box on someone's phone.
export function fromName(name) {
  const p = parseName(name);
  if (!p.ok) {
    throw new Error(
      `MOL(${JSON.stringify(name)}) — the engine could not build this structure.\n` +
        `  ${p.err}: ${p.message}\n` +
        `  Check the spelling, or draw it in the sandbox to find the name the engine expects.`
    );
  }
  return clean(p.mol);
}

// A single central atom with its bonds drawn explicitly — methane, ammonia,
// water and so on.
//
// These exist so a question about how many bonds an element forms can be
// ANSWERED FROM THE PICTURE rather than recalled. The learner counts the lines
// leaving the middle atom.
//
// Angles are spread evenly and never fold back, so the drawing passes the same
// geometry audit as everything else.
export function radialMolecule(centreEl, ligandEls, opts = {}) {
  const n = ligandEls.length;
  // A sensible spread for each count: two bonds are drawn bent rather than
  // straight through, which is both more accurate and easier to count.
  const defaults = {
    1: [0],
    2: [-38, 38],
    3: [-90, 30, 150],
    4: [-90, 0, 90, 180],
  };
  const angles = opts.angles || defaults[n] || Array.from({ length: n }, (_, i) => (360 / n) * i);
  const atoms = [{ id: 1, x: 0, y: 0, el: centreEl }];
  const bonds = [];
  ligandEls.forEach((el, i) => {
    const rad = (angles[i] * Math.PI) / 180;
    atoms.push({ id: i + 2, x: BOND * Math.cos(rad), y: BOND * Math.sin(rad), el });
    bonds.push({ a: 1, b: i + 2, order: opts.orders ? opts.orders[i] : 1, stereo: null });
  });
  return { atoms, bonds };
}

// A chain of n carbons with substituents hung off it.
// subs: [{ at, size }] — `at` is the 1-based position along the chain, `size`
// the number of carbons in the branch. The rough placement here is only a
// starting point; `clean` lays it out properly before it is ever shown.
export function branchedChain(n, subs = []) {
  const g = straightChain(n);
  let id = n;
  for (const { at, size } of subs) {
    const anchor = g.atoms[at - 1];
    let prev = anchor.id;
    for (let k = 0; k < size; k++) {
      id += 1;
      g.atoms.push({ id, x: anchor.x + k * BOND * 0.5, y: anchor.y + BOND * (k + 1) * 0.87 });
      g.bonds.push({ a: prev, b: id, order: 1, stereo: null });
      prev = id;
    }
  }
  return clean(g);
}

// Content names are stereo-free. A drawn zigzag makes an internal alkene E,
// so the engine reports "(2E)-but-2-ene" — correct, but E/Z is not taught
// until stage 9, and answering "but-2-ene" must be right everywhere before
// then. Checking is stereo-blind for the same reason.
export const nameOf = (mol) => {
  const r = nameGraph(mol);
  if (!r.ok) return null;
  return r.name.replace(/\((?:\d+[EZRS]|[EZRS])\)-?/g, '').trim();
};

// The full name including any descriptor, for the stereochemistry units.
export const stereoNameOf = (mol) => {
  const r = nameGraph(mol);
  return r.ok ? r.name : null;
};

export const formulaOf = (mol) => {
  const r = nameGraph(mol);
  return r.ok ? r.formula : null;
};

// ── deterministic shuffling ──────────────────────────────────
// Seeded so a generated pool is stable between runs; the lesson
// player does the per-session shuffling separately.
function seeded(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function shuffleWith(rand, list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── distractor names ─────────────────────────────────────────
// Wrong answers a student might plausibly give: the neighbouring
// root (miscounting by one) and the wrong ending.
function nameDistractors(n) {
  const out = [];
  if (n > 1) out.push(`${ROOTS[n - 2]}ane`);
  if (n < 10) out.push(`${ROOTS[n]}ane`);
  out.push(`${ROOTS[n - 1]}ene`);
  if (n > 2) out.push(`${ROOTS[n - 3]}ane`);
  return out;
}

// ── question builders ────────────────────────────────────────
// ── Concepts ─────────────────────────────────────────────────
// What a question requires the learner to already know. A lesson may only ask
// questions whose requirements it has taught, or that an earlier lesson has —
// otherwise a pool quietly tests material the learner has not met yet.
export const CONCEPT = {
  VALENCE: 'valence',          // carbon makes four bonds
  H_COUNT: 'h-per-carbon',     // ends carry 3 H, middles 2
  SKELETAL: 'skeletal',        // reading line ends and corners as carbons
  ALKANE: 'alkane-def',        // what makes a hydrocarbon an alkane
  FORMULA: 'formula',          // CnH(2n+2)
  ROOTS: 'roots',              // meth… dec
  NAMING: 'naming',            // structure to name
  DRAWING: 'drawing',          // name to structure on the canvas
  BENT: 'bent-chains',         // a chain that turns a corner
  BRANCH: 'branches',          // substituents
  LOCANTS: 'locants',          // numbering for the lowest locant
};

let uid = 0;
const nextId = (kind) => `${kind}-${++uid}`;

export function mcName(mol, { chip = 'NAME THE STRUCTURE', prompt, seed = 1, hint } = {}) {
  const answer = nameOf(mol);
  if (!answer) return null;
  const n = mol.atoms.length;
  const wrong = nameDistractors(n).filter((w) => w !== answer).slice(0, 3);
  const options = shuffleWith(seeded(seed), [answer, ...wrong]);
  return {
    id: nextId('mcname'),
    type: 'mcName',
    chip,
    prompt: prompt || 'Which name correctly describes this structure?',
    mol,
    options,
    answer: options.indexOf(answer),
    explain: `${n} carbons gives the root ${ROOTS[n - 1]}-, and all single bonds gives -ane: ${answer}.`,
    hint,
    needs: [CONCEPT.SKELETAL, CONCEPT.ROOTS, CONCEPT.NAMING],
  };
}

export function mcStructure(n, { chip = 'CHOOSE THE STRUCTURE', seed = 1 } = {}) {
  const answer = straightChain(n);
  const name = nameOf(answer);
  if (!name) return null;
  // Near neighbours first, widening outwards — methane and decane have
  // no neighbour on one side, so a fixed offset list leaves them short.
  const others = [n - 1, n + 1, n - 2, n + 2, n - 3, n + 3]
    .filter((k) => k >= 1 && k <= 10 && k !== n)
    .slice(0, 3)
    .map((k) => straightChain(k));
  const options = shuffleWith(seeded(seed + 7), [answer, ...others]);
  return {
    id: nextId('mcstruct'),
    type: 'mcStructure',
    chip,
    prompt: `Which structure is ${name}?`,
    subtitle: 'Select one structure.',
    options,
    answer: options.indexOf(answer),
    explain: `${name} has ${n} carbons — count the line ends and the corners in each option.`,
    needs: [CONCEPT.SKELETAL, CONCEPT.ROOTS],
  };
}

export function writeName(mol, { chip = 'WRITE THE NAME', hint } = {}) {
  const answer = nameOf(mol);
  if (!answer) return null;
  return {
    id: nextId('write'),
    type: 'write',
    chip,
    prompt: 'Give the preferred IUPAC name for this structure.',
    mol,
    answer,
    explain: `${mol.atoms.length} carbons in a row, all single bonds: ${answer}.`,
    hint: hint || 'Count the carbons, take the root, then add -ane.',
    needs: [CONCEPT.SKELETAL, CONCEPT.ROOTS, CONCEPT.NAMING],
  };
}

// `named: true` phrases the question around the molecule's name, which only
// makes sense once the roots are known. By default it asks about the drawing,
// so the question can be used before naming has been taught.
export function countCarbons(mol, { chip = 'ENTER A NUMBER', named = false } = {}) {
  const name = nameOf(mol);
  const n = mol.atoms.length;
  return {
    id: nextId('count'),
    type: 'number',
    chip,
    prompt: named ? `How many carbon atoms are in ${name}?` : 'How many carbon atoms are in this structure?',
    mol,
    unit: 'carbon atoms',
    answer: n,
    explain: named
      ? `${name} has ${n} carbons — the root ${ROOTS[n - 1]}- tells you so.`
      : `${n} carbons: count each line end and each corner.`,
    hint: 'Every line end and every corner is a carbon.',
    needs: named ? [CONCEPT.SKELETAL, CONCEPT.ROOTS] : [CONCEPT.SKELETAL],
  };
}

export function countHydrogens(mol, { chip = 'ENTER A NUMBER', named = false } = {}) {
  const n = mol.atoms.length;
  const name = nameOf(mol);
  return {
    id: nextId('hcount'),
    type: 'number',
    chip,
    mol: named ? undefined : mol,
    prompt: named
      ? `How many hydrogen atoms are in ${name}?`
      : `How many hydrogen atoms are in an alkane with ${n} carbons?`,
    unit: 'hydrogen atoms',
    answer: 2 * n + 2,
    explain: `An alkane has 2n + 2 hydrogens. With n = ${n}: 2(${n}) + 2 = ${2 * n + 2}, so ${formulaOf(mol)}.`,
    hint: 'Use the formula rather than counting them one by one.',
    needs: named ? [CONCEPT.FORMULA, CONCEPT.ROOTS] : [CONCEPT.FORMULA],
  };
}

export function mcFormula(mol, { chip = 'CHOOSE THE FORMULA', seed = 1, named = false } = {}) {
  const n = mol.atoms.length;
  const answer = formulaOf(mol);
  if (!answer) return null;
  const wrong = [`C${n}H${2 * n}`, `C${n}H${2 * n + 4}`, `C${n}H${2 * n - 2}`].filter((w) => w !== answer);
  const options = shuffleWith(seeded(seed + 13), [answer, ...wrong.slice(0, 3)]);
  return {
    id: nextId('mcform'),
    type: 'mcName',
    chip,
    // Same rule as counting: name the molecule only where the roots are known.
    prompt: named
      ? `What is the molecular formula of ${nameOf(mol)}?`
      : `What is the molecular formula of an alkane with ${n} carbons?`,
    mol: named ? undefined : mol,
    options,
    answer: options.indexOf(answer),
    explain: `2n + 2 with n = ${n} gives ${2 * n + 2} hydrogens: ${answer}.`,
    needs: named ? [CONCEPT.FORMULA, CONCEPT.ROOTS] : [CONCEPT.FORMULA],
  };
}

export function drawIt(mol, { chip = 'DRAW THE MOLECULE', hint } = {}) {
  const name = nameOf(mol);
  if (!name) return null;
  return {
    id: nextId('draw'),
    type: 'draw',
    chip,
    prompt: `Draw ${name}.`,
    subtitle: 'Build the complete structure on the canvas.',
    name,
    answer: name,
    explain: `${name}: ${mol.atoms.length} carbons joined in a row.`,
    hint: hint || 'Tap once to place a carbon, then tap again to add the next.',
    needs: [CONCEPT.ROOTS, CONCEPT.DRAWING],
  };
}

export function tapCarbons(mol, { chip = 'COUNT THE CARBONS', named = false } = {}) {
  return {
    id: nextId('tap'),
    type: 'countTap',
    chip,
    prompt: 'Tap every carbon in this structure.',
    subtitle: 'Remember: each line end and each corner.',
    mol,
    answer: mol.atoms.length,
    // The explanation must not name the molecule before the roots are taught:
    // revealing "hexane" here is a naming lesson the learner has not had.
    explain: named
      ? `${mol.atoms.length} carbons — ${nameOf(mol)}.`
      : `${mol.atoms.length} carbons: every line end and every corner.`,
    needs: named ? [CONCEPT.SKELETAL, CONCEPT.ROOTS] : [CONCEPT.SKELETAL],
  };
}

// Multiple choice where the wrong answers are the names of REAL neighbouring
// molecules, so every distractor is a name the engine agrees exists — and is
// verified to differ from the answer.
export function mcNameFrom(mol, distractorMols, { chip = 'NAME THE STRUCTURE', prompt, seed = 1, hint } = {}) {
  const answer = nameOf(mol);
  if (!answer) return null;
  const wrong = [];
  for (const d of distractorMols) {
    const nm = nameOf(d);
    if (nm && nm !== answer && !wrong.includes(nm)) wrong.push(nm);
    if (wrong.length === 3) break;
  }
  if (wrong.length < 2) return null;
  const options = shuffleWith(seeded(seed + 29), [answer, ...wrong]);
  return {
    id: nextId('mcnamefrom'),
    type: 'mcName',
    chip,
    prompt: prompt || 'Which name correctly describes this structure?',
    mol,
    options,
    answer: options.indexOf(answer),
    explain: `Longest chain and lowest locants give ${answer}.`,
    hint,
    needs: [CONCEPT.SKELETAL, CONCEPT.ROOTS, CONCEPT.NAMING, CONCEPT.BRANCH, CONCEPT.LOCANTS],
  };
}



// ── COMPARE NAMES ────────────────────────────────────────────
// Two names, one structure: do they describe the same compound? Both names
// are parsed by the engine and compared, so the answer is never asserted.
export function compareNames(a, b, { chip = 'COMPARE NAMES', labelA = 'Preferred IUPAC', labelB } = {}) {
  const pa = parseName(a);
  const pb = parseName(b);
  if (!pa.ok || !pb.ok) return null;
  const canonA = nameGraph(pa.mol);
  const canonB = nameGraph(pb.mol);
  if (!canonA.ok || !canonB.ok) return null;
  const same = canonA.name === canonB.name;
  return {
    id: nextId('compare'),
    type: 'compareNames',
    chip,
    prompt: 'Do these names describe the same compound?',
    nameA: a,
    nameB: b,
    labelA,
    labelB: labelB || (same ? 'Alternate style' : 'A different compound'),
    mol: pa.mol,
    answer: same ? 0 : 1,
    explain: same
      ? `Both build the same structure — ${canonA.name}. The second is just written differently.`
      : `They are different compounds: ${canonA.name} and ${canonB.name}.`,
  };
}

// ── BUILD THE NAME ───────────────────────────────────────────
// The name is broken into its parts and shuffled; the learner puts them back
// in order. Distractor parts come from neighbouring roots.
export function buildName(mol, { chip = 'BUILD THE NAME', seed = 1 } = {}) {
  const answer = nameOf(mol);
  const n = mol.atoms.length;
  if (!answer) return null;
  const parts = [ROOTS[n - 1], 'ane'];
  const spare = [];
  if (n > 1) spare.push(ROOTS[n - 2]);
  if (n < 10) spare.push(ROOTS[n]);
  spare.push('ene');
  return {
    id: nextId('build'),
    type: 'buildName',
    chip,
    prompt: 'Build the correct IUPAC name.',
    subtitle: 'Tap the parts in the right order.',
    mol,
    parts,
    options: shuffleWith(seeded(seed + 61), [...parts, ...spare.slice(0, 2)]),
    answer,
    explain: `${ROOTS[n - 1]}- for ${n} carbons, then -ane because every bond is single: ${answer}.`,
    needs: [CONCEPT.ROOTS, CONCEPT.NAMING],
  };
}

// ── BUILD THE NAME, for any name we can split ────────────────
// The name is cut into the parts a student assembles it from. Only patterns
// we can split confidently are used; anything else returns null and simply
// does not become a question.
export function splitName(name) {
  let m = name.match(/^(\d+(?:,\d+)*)-(di|tri|tetra)?(methyl|ethyl|propyl|butyl)(\w+ane)$/);
  if (m) return [`${m[1]}-`, ...(m[2] ? [m[2]] : []), m[3], m[4]];
  m = name.match(/^(\w+?)(ane|ene|yne)$/);
  if (m) return [m[1], m[2]];
  return null;
}

export function buildNameFrom(mol, { chip = 'BUILD THE NAME', seed = 1, spares = [] } = {}) {
  const answer = nameOf(mol);
  if (!answer) return null;
  const parts = splitName(answer);
  if (!parts) return null;
  const extra = spares.filter((x) => !parts.includes(x)).slice(0, 2);
  return {
    id: nextId('buildfrom'),
    type: 'buildName',
    chip,
    prompt: 'Build the correct IUPAC name.',
    subtitle: 'Tap the parts in the right order.',
    mol,
    parts,
    options: shuffleWith(seeded(seed + 83), [...parts, ...extra]),
    answer,
    explain: `${parts.join(' + ')} gives ${answer}.`,
  };
}

// ── pool assembly ────────────────────────────────────────────
// Drops anything the engine could not name, so a pool can never
// contain a question with no correct answer.
export function pool(...questions) {
  return questions.flat().filter(Boolean);
}

function shuffled(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Sample n questions, spread across the kinds of question in the pool rather
// than drawn flat.
//
// Flat sampling clusters: a lesson pool that happens to hold twice as many
// hydrogen questions as bond questions will often give five hydrogen
// questions in a row, so a learner sees one idea tested and the other not at
// all — and the run feels like it is examining something the lesson barely
// covered. Round-robin across kinds keeps a short run representative.
export function sample(list, n, keyOf = (q) => q.chip || q.type) {
  const want = Math.min(n, list.length);
  const groups = new Map();
  for (const q of list) {
    const k = keyOf(q);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(q);
  }
  for (const [k, arr] of groups) groups.set(k, shuffled(arr));

  const keys = shuffled([...groups.keys()]);
  const out = [];
  let i = 0;
  const guard = list.length * 2 + 10;
  while (out.length < want && i < guard) {
    const arr = groups.get(keys[i % keys.length]);
    if (arr && arr.length) out.push(arr.pop());
    i++;
  }
  return shuffled(out);
}

export { ROOTS, parseName };
