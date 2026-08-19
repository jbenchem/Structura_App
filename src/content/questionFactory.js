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
import { prettify } from '../chem/prettify';
// One lattice everywhere: the tidier works at the canvas's bond length, so
// generating at a different one made structures jump scale when cleaned.
import { BOND } from '../sandbox/constants';

// Questions always show a cleanly laid-out structure. tidy is
// identity-preserving — it keeps its result only when the molecule still names
// the same — so this can never change what is being asked, only how it looks.
export function clean(mol) {
  if (!mol || mol.atoms.length < 2) return mol;
  try {
    return prettify(mol);
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
  // Direction turns by exactly 60 degrees at every step. At the corner the
  // turn keeps the SAME rotational sense instead of alternating, which swings
  // the chain onto a new axis.
  //
  // The earlier version picked directions from two fixed pairs, and where the
  // pairs met it could repeat a direction — two parallel bonds in a row, which
  // draw as a single long line with a carbon hidden inside it. A counting
  // question on such a drawing cannot be answered by counting.
  const dirs = [-30];
  let sign = -1;
  for (let k = 1; k < n - 1; k++) {
    if (k !== turnAt) sign = -sign;
    dirs.push(dirs[k - 1] + 60 * sign);
  }

  const atoms = [];
  const bonds = [];
  let x = 0;
  let y = 0;
  for (let i = 0; i < n; i++) {
    atoms.push({ id: i + 1, x, y });
    if (i) bonds.push({ a: i, b: i + 1, order: 1, stereo: null });
    if (i < n - 1) {
      const rad = (dirs[i] * Math.PI) / 180;
      x += BOND * Math.cos(rad);
      y += BOND * Math.sin(rad);
    }
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

// Skeletal notation draws a lone carbon as nothing at all, so any molecule
// with a single carbon is shown with its atoms explicit: methane reads CH4
// rather than an empty box. Applied wherever a question attaches a molecule.
export const needsExplicitAtoms = (mol) =>
  !!mol && mol.atoms.filter((a) => !a.el || a.el === 'C').length < 2;

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
    2: [-52, 52],   // ~104°, the real angle in water
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
// How many CARBONS a molecule has. Everything that talks about chain length
// must use this rather than atoms.length: with an oxygen or a halogen in the
// molecule those differ, and the difference marked correct answers wrong.
export const carbonCount = (mol) =>
  mol && mol.atoms ? mol.atoms.filter((a) => !a.el || a.el === 'C').length : 0;

// A description of the structure that is actually true of it. The previous
// text was hard-coded to "N carbons in a row, all single bonds", which was
// written when every molecule was an alkane and became false the moment
// anything else arrived: it told learners that but-2-ene and benzene had only
// single bonds, and that a ring was a row.
export function describeStructure(mol) {
  const n = carbonCount(mol);
  const rings = Math.max(0, mol.bonds.length - mol.atoms.length + 1);
  const bits = [];
  bits.push(rings > 0 ? `${n} carbons` : `${n} carbons in a chain`);
  if (rings === 1) bits[0] = `${n} carbons including a ring`;
  else if (rings > 1) bits[0] = `${n} carbons in ${rings} rings`;
  const dbl = mol.bonds.filter((b) => b.order === 2).length;
  const trp = mol.bonds.filter((b) => b.order === 3).length;
  if (trp) bits.push(`${trp === 1 ? 'a triple bond' : `${trp} triple bonds`}`);
  if (dbl) bits.push(`${dbl === 1 ? 'a double bond' : `${dbl} double bonds`}`);
  if (!dbl && !trp) bits.push('all single bonds');
  const hetero = [...new Set(mol.atoms.map((a) => a.el).filter((e) => e && e !== 'C' && e !== 'H'))];
  if (hetero.length) bits.push(`with ${hetero.join(' and ')}`);
  return bits.join(', ');
}

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

// ── Categories ───────────────────────────────────────────────
// Every question carries one. They drive the breakdown on the results screen,
// and they are the unit of analysis for anything measured later — "this
// student can name but cannot draw" is only answerable if the data says which
// kind each question was.
export const CATEGORY = {
  // what the learner does
  NAME_STRUCTURE: 'name-structure',
  CHOOSE_STRUCTURE: 'choose-structure',
  WRITE_NAME: 'write-name',
  DRAW_MOLECULE: 'draw-molecule',
  BUILD_NAME: 'build-name',
  COMPARE_NAMES: 'compare-names',
  COUNT_ATOMS: 'count-atoms',
  // what the question is about
  BONDS: 'bonds',
  HYDROGENS: 'hydrogens',
  MOLECULE_TYPE: 'molecule-type',
  READING: 'reading',
  GROUPS: 'groups',
  PARENT_CHAIN: 'parent-chain',
  NUMBERING: 'numbering',
  FORMULA: 'formula',
};

// Labels name the SKILL, not the mechanic. "Check your understanding" told a
// learner nothing about what to practise; "Number of bonds" and "Drawing
// structures" do.
export const CATEGORY_META = {
  [CATEGORY.NAME_STRUCTURE]: { label: 'Naming structures', icon: 'create-outline' },
  [CATEGORY.CHOOSE_STRUCTURE]: { label: 'Choosing structures', icon: 'grid-outline' },
  [CATEGORY.WRITE_NAME]: { label: 'Writing names', icon: 'text-outline' },
  [CATEGORY.DRAW_MOLECULE]: { label: 'Drawing structures', icon: 'git-network-outline' },
  [CATEGORY.BUILD_NAME]: { label: 'Building names', icon: 'apps-outline' },
  [CATEGORY.COMPARE_NAMES]: { label: 'Comparing names', icon: 'swap-vertical-outline' },
  [CATEGORY.COUNT_ATOMS]: { label: 'Counting atoms', icon: 'calculator-outline' },
  [CATEGORY.BONDS]: { label: 'Number of bonds', icon: 'link-outline' },
  [CATEGORY.HYDROGENS]: { label: 'Counting hydrogens', icon: 'water-outline' },
  [CATEGORY.MOLECULE_TYPE]: { label: 'Molecule types', icon: 'pricetag-outline' },
  [CATEGORY.READING]: { label: 'Reading structures', icon: 'eye-outline' },
  [CATEGORY.GROUPS]: { label: 'Functional groups', icon: 'color-filter-outline' },
  [CATEGORY.PARENT_CHAIN]: { label: 'Finding the parent chain', icon: 'trail-sign-outline' },
  [CATEGORY.NUMBERING]: { label: 'Numbering the chain', icon: 'list-outline' },
  [CATEGORY.FORMULA]: { label: 'Molecular formulas', icon: 'flask-outline' },
};

// Hand-written questions already say what they are about in their chip, so the
// category is read from it rather than tagged twice and allowed to disagree.
const CHIP_CATEGORY = {
  'COUNT THE BONDS': CATEGORY.BONDS,
  'COUNT THE HYDROGENS': CATEGORY.HYDROGENS,
  'IDENTIFY THE MOLECULE TYPE': CATEGORY.MOLECULE_TYPE,
  'READ THE DRAWING': CATEGORY.READING,
  'IDENTIFY THE GROUP': CATEGORY.GROUPS,
  'IDENTIFY STEREOCHEMISTRY': CATEGORY.MOLECULE_TYPE,
  'FIND THE PARENT': CATEGORY.PARENT_CHAIN,
  'NUMBER THE CHAIN': CATEGORY.NUMBERING,
  'CHOOSE THE FORMULA': CATEGORY.FORMULA,
  'ENTER A NUMBER': CATEGORY.COUNT_ATOMS,
  'COUNT THE CARBONS': CATEGORY.COUNT_ATOMS,
  'NAME THE STRUCTURE': CATEGORY.NAME_STRUCTURE,
  'CHOOSE THE STRUCTURE': CATEGORY.CHOOSE_STRUCTURE,
  'WRITE THE NAME': CATEGORY.WRITE_NAME,
  'DRAW THE MOLECULE': CATEGORY.DRAW_MOLECULE,
  'BUILD THE NAME': CATEGORY.BUILD_NAME,
  'COMPARE NAMES': CATEGORY.COMPARE_NAMES,
  'CHECK YOUR UNDERSTANDING': CATEGORY.MOLECULE_TYPE,
};

export const categoryForChip = (chip) => CHIP_CATEGORY[chip] || CATEGORY.MOLECULE_TYPE;

// ── Families ─────────────────────────────────────────────────
// The chemical family a question is about, READ FROM THE MOLECULE rather than
// tagged by hand — a question showing a double bond is about alkenes whatever
// anyone labelled it.
//
// Category answers "what skill?", family answers "on what?". Together they
// give the subcategory: "Drawing alkenes" rather than just "Drawing".
export const FAMILY = {
  ALKANE: 'alkane',
  BRANCHED: 'branched-alkane',
  ALKENE: 'alkene',
  ALKYNE: 'alkyne',
  HALOALKANE: 'haloalkane',
  ALCOHOL: 'alcohol',
  // The carbonyl families are kept apart. One "carbonyl" bucket held a third
  // of the curriculum, which made a weakness report say "naming carbonyls"
  // when it could say "naming esters", and made a practice topic unusable.
  ALDEHYDE: 'aldehyde',
  KETONE: 'ketone',
  ACID: 'acid',
  ESTER: 'ester',
  AMIDE: 'amide',
  ACYL_HALIDE: 'acyl-halide',
  ANHYDRIDE: 'anhydride',
  CARBONYL: 'carbonyl',
  // These three were previously misfiled: an amine came back as "alkane", a
  // nitrile as "alkyne" and an ether as "alcohol", because nothing looked at
  // nitrogen and an ether oxygen is indistinguishable from a hydroxyl unless
  // you check what it is bonded to.
  ETHER: 'ether',
  AMINE: 'amine',
  NITRILE: 'nitrile',
  NITRO: 'nitro',
  GENERAL: 'general',
};

export const FAMILY_META = {
  [FAMILY.ALKANE]: { one: 'alkane', many: 'alkanes', icon: 'remove-outline' },
  [FAMILY.BRANCHED]: { one: 'branched alkane', many: 'branched alkanes', icon: 'git-branch-outline' },
  [FAMILY.ALKENE]: { one: 'alkene', many: 'alkenes', icon: 'reorder-two-outline' },
  [FAMILY.ALKYNE]: { one: 'alkyne', many: 'alkynes', icon: 'reorder-three-outline' },
  [FAMILY.HALOALKANE]: { one: 'haloalkane', many: 'haloalkanes', icon: 'flask-outline' },
  [FAMILY.ALCOHOL]: { one: 'alcohol', many: 'alcohols', icon: 'water-outline' },
  [FAMILY.ALDEHYDE]: { one: 'aldehyde', many: 'aldehydes', icon: 'chevron-forward-outline' },
  [FAMILY.KETONE]: { one: 'ketone', many: 'ketones', icon: 'ellipse-outline' },
  [FAMILY.ACID]: { one: 'carboxylic acid', many: 'carboxylic acids', icon: 'flask-outline' },
  [FAMILY.ESTER]: { one: 'ester', many: 'esters', icon: 'link-outline' },
  [FAMILY.AMIDE]: { one: 'amide', many: 'amides', icon: 'color-filter-outline' },
  [FAMILY.ACYL_HALIDE]: { one: 'acyl halide', many: 'acyl halides', icon: 'flash-outline' },
  [FAMILY.ANHYDRIDE]: { one: 'anhydride', many: 'anhydrides', icon: 'copy-outline' },
  [FAMILY.CARBONYL]: { one: 'carbonyl', many: 'carbonyls', icon: 'ellipse-outline' },
  [FAMILY.ETHER]: { one: 'ether', many: 'ethers', icon: 'swap-horizontal-outline' },
  [FAMILY.AMINE]: { one: 'amine', many: 'amines', icon: 'people-outline' },
  [FAMILY.NITRILE]: { one: 'nitrile', many: 'nitriles', icon: 'reorder-three-outline' },
  [FAMILY.NITRO]: { one: 'nitro compound', many: 'nitro compounds', icon: 'warning-outline' },
  [FAMILY.GENERAL]: { one: 'structure', many: 'structures', icon: 'shapes-outline' },
};

const HALOGENS = ['F', 'Cl', 'Br', 'I'];

// Checked in seniority order, so a molecule with both a double bond and a
// halogen is filed under the more senior feature.
export function familyOf(mol) {
  if (!mol || !mol.atoms || !mol.atoms.length) return FAMILY.GENERAL;
  const el = (a) => a.el || 'C';
  const has = (sym) => mol.atoms.some((a) => el(a) === sym);
  const bondsOf = (id) => mol.bonds.filter((b) => b.a === id || b.b === id);
  const nbrs = (id) =>
    bondsOf(id)
      .map((b) => mol.atoms.find((x) => x.id === (b.a === id ? b.b : b.a)))
      .filter(Boolean);
  const orderTo = (a, b) => {
    const bond = mol.bonds.find(
      (x) => (x.a === a && x.b === b) || (x.a === b && x.b === a)
    );
    return bond ? bond.order || 1 : 0;
  };

  // Checked in seniority order, exactly as the naming rules are: the most
  // senior feature present decides the family, because that is what decides
  // the suffix and therefore what the question is really about.
  const carbonyls = mol.atoms.filter(
    (a) => el(a) === 'C' && nbrs(a.id).some((n) => el(n) === 'O' && orderTo(a.id, n.id) === 2)
  );

  if (carbonyls.length) {
    const c = carbonyls[0];
    const around = nbrs(c.id);
    const singleO = around.filter((n) => el(n) === 'O' && orderTo(c.id, n.id) === 1);

    // an oxygen bridging TWO carbonyl carbons is an anhydride
    if (
      carbonyls.length > 1 &&
      singleO.some((o) => nbrs(o.id).filter((f) => carbonyls.some((cc) => cc.id === f.id)).length >= 2)
    )
      return FAMILY.ANHYDRIDE;

    if (around.some((n) => HALOGENS.includes(el(n)))) return FAMILY.ACYL_HALIDE;
    if (around.some((n) => el(n) === 'N')) return FAMILY.AMIDE;
    if (singleO.length) {
      const bridging = singleO.some((o) =>
        nbrs(o.id).some((f) => f.id !== c.id && el(f) === 'C')
      );
      return bridging ? FAMILY.ESTER : FAMILY.ACID;
    }
    return around.filter((n) => el(n) === 'C').length >= 2 ? FAMILY.KETONE : FAMILY.ALDEHYDE;
  }

  if (mol.atoms.some((a) => el(a) === 'N' && nbrs(a.id).some((n) => orderTo(a.id, n.id) === 3)))
    return FAMILY.NITRILE;
  if (has('NO2')) return FAMILY.NITRO;
  if (has('N')) return FAMILY.AMINE;

  // An ether oxygen carries two carbons; a hydroxyl carries one and a hidden
  // hydrogen. Nothing distinguished them before, so every ether was an alcohol.
  const oxygens = mol.atoms.filter((a) => el(a) === 'O');
  if (oxygens.length) {
    const bridging = oxygens.some((o) => nbrs(o.id).filter((n) => el(n) === 'C').length >= 2);
    return bridging ? FAMILY.ETHER : FAMILY.ALCOHOL;
  }

  if (HALOGENS.some(has)) return FAMILY.HALOALKANE;
  if (mol.bonds.some((b) => b.order === 3)) return FAMILY.ALKYNE;
  if (mol.bonds.some((b) => b.order === 2)) return FAMILY.ALKENE;

  const branched = mol.atoms.some(
    (a) => el(a) === 'C' && nbrs(a.id).filter((n) => el(n) === 'C').length >= 3
  );
  return branched ? FAMILY.BRANCHED : FAMILY.ALKANE;
}

// How each skill reads once a family is attached.
const SUB_TEMPLATE = {
  'name-structure': (f) => `Naming ${f.many}`,
  'choose-structure': (f) => `Choosing ${f.many}`,
  'write-name': (f) => `Writing ${f.one} names`,
  'draw-molecule': (f) => `Drawing ${f.many}`,
  'build-name': (f) => `Building ${f.one} names`,
  'compare-names': (f) => `Comparing ${f.one} names`,
  'count-atoms': (f) => `Counting atoms in ${f.many}`,
  bonds: () => 'Number of bonds',
  hydrogens: () => 'Counting hydrogens',
  'molecule-type': (f) => `Identifying ${f.many}`,
  reading: (f) => `Reading ${f.one} structures`,
  groups: () => 'Functional groups',
  'parent-chain': (f) => `Parent chain in ${f.many}`,
  numbering: (f) => `Numbering ${f.many}`,
  formula: (f) => `Formulas of ${f.many}`,
};

// Some skills are about a rule rather than a family: how many bonds an atom
// forms is the same question whatever molecule illustrates it. Those are
// normalised so they do not split into near-identical subcategories.
const FAMILY_IRRELEVANT = new Set([
  CATEGORY.BONDS,
  CATEGORY.HYDROGENS,
  CATEGORY.GROUPS,
]);

export const normaliseFamily = (category, family) =>
  FAMILY_IRRELEVANT.has(category) ? FAMILY.GENERAL : family || FAMILY.GENERAL;

// When a question is answered wrongly and nothing more specific is known, the
// CATEGORY still says something about what went wrong. A locant question got
// wrong is a locant error; a priority question is a seniority error. That is a
// better default than filing everything under "other", which tells an analysis
// nothing at all.
//
// Anything the engine classified directly wins over this — see checkDrawing.
const CATEGORY_ERROR = {
  [CATEGORY.NAME_STRUCTURE]: 'other',
  [CATEGORY.CHOOSE_STRUCTURE]: 'chain-selection',
  [CATEGORY.WRITE_NAME]: 'other',
  [CATEGORY.DRAW_MOLECULE]: 'chain-selection',
  [CATEGORY.BUILD_NAME]: 'substituent-order',
  [CATEGORY.COMPARE_NAMES]: 'other',
  [CATEGORY.COUNT_ATOMS]: 'formula',
  [CATEGORY.BONDS]: 'valence',
  [CATEGORY.HYDROGENS]: 'formula',
  [CATEGORY.MOLECULE_TYPE]: 'suffix-seniority',
  [CATEGORY.READING]: 'chain-selection',
  [CATEGORY.GROUPS]: 'suffix-seniority',
  [CATEGORY.PARENT_CHAIN]: 'chain-selection',
  [CATEGORY.NUMBERING]: 'locant',
  [CATEGORY.FORMULA]: 'formula',
};

export const errorClassForCategory = (category) => CATEGORY_ERROR[category] || 'other';

// Every question in the curriculum that matches a given skill×family.
//
// This is what makes a recommendation actionable: "work on numbering the
// chain" is advice, but a set of questions that are all numbering questions
// is the thing itself. Drawing from the real pools means the practice is the
// same material the lessons use, tagged the same way, so the attempt log
// stays consistent.
// The families a student can practise, in teaching order, with how many
// questions each holds. Built from the pools rather than hand-listed, so it
// cannot drift from the content.
export function practiceTopics(pools, { modes = null } = {}) {
  const NAME_CATS = [CATEGORY.NAME_STRUCTURE, CATEGORY.WRITE_NAME, CATEGORY.CHOOSE_STRUCTURE, CATEGORY.BUILD_NAME];
  const DRAW_CATS = [CATEGORY.DRAW_MOLECULE];
  const ORDER = [
    FAMILY.ALKANE, FAMILY.BRANCHED, FAMILY.ALKENE, FAMILY.ALKYNE, FAMILY.HALOALKANE,
    FAMILY.ALCOHOL, FAMILY.ETHER, FAMILY.ALDEHYDE, FAMILY.KETONE, FAMILY.ACID,
    FAMILY.ESTER, FAMILY.ACYL_HALIDE, FAMILY.ANHYDRIDE, FAMILY.AMINE, FAMILY.AMIDE,
    FAMILY.NITRILE, FAMILY.NITRO,
  ];
  const counts = {};
  for (const pool of Object.values(pools)) {
    if (!Array.isArray(pool)) continue;
    for (const q of pool) {
      const f = q.family;
      if (!f || f === FAMILY.GENERAL) continue;
      const c = (counts[f] = counts[f] || { total: 0, name: 0, draw: 0 });
      c.total += 1;
      if (NAME_CATS.includes(q.category)) c.name += 1;
      if (DRAW_CATS.includes(q.category)) c.draw += 1;
    }
  }
  return ORDER.filter((f) => counts[f] && counts[f].total >= 8).map((f) => ({
    id: f,
    label: FAMILY_META[f] ? FAMILY_META[f].many.replace(/^./, (m) => m.toUpperCase()) : f,
    ...counts[f],
  }));
}

// Build a practice set from the curriculum pools: chosen families, chosen
// mode. The old practice bank was a separate set of questions with its own
// shape; drawing from the pools means practice and lessons are the same
// material, tagged the same way, so the attempt log stays coherent.
export function practiceQuestions(pools, { families = [], mode = 'mixed', count = 20, seed = 1 } = {}) {
  const NAME_CATS = [CATEGORY.NAME_STRUCTURE, CATEGORY.WRITE_NAME, CATEGORY.CHOOSE_STRUCTURE, CATEGORY.BUILD_NAME];
  const DRAW_CATS = [CATEGORY.DRAW_MOLECULE];
  const wanted = new Set(families);
  const hits = [];
  for (const pool of Object.values(pools)) {
    if (!Array.isArray(pool)) continue;
    for (const q of pool) {
      if (wanted.size && !wanted.has(q.family)) continue;
      if (mode === 'name' && !NAME_CATS.includes(q.category)) continue;
      if (mode === 'draw' && !DRAW_CATS.includes(q.category)) continue;
      hits.push(q);
    }
  }
  const seen = new Set();
  const unique = hits.filter((q) => (seen.has(q.id) ? false : (seen.add(q.id), true)));
  return shuffleWith(seeded(seed), unique).slice(0, count);
}

export function questionsMatching(pools, subcategory, { count = 10, seed = 1 } = {}) {
  const [category, family] = String(subcategory).split(':');
  const hits = [];
  for (const pool of Object.values(pools)) {
    if (!Array.isArray(pool)) continue;
    for (const q of pool) {
      if (q.category !== category) continue;
      // A rule-based skill has no family of its own, so it matches any.
      const fam = normaliseFamily(q.category, q.family);
      if (family && family !== 'general' && fam !== family) continue;
      hits.push(q);
    }
  }
  // de-duplicate: the same question can appear in several pools
  const seen = new Set();
  const unique = hits.filter((q) => (seen.has(q.id) ? false : (seen.add(q.id), true)));
  return shuffleWith(seeded(seed), unique).slice(0, count);
}

export const subcategoryKey = (category, family) =>
  `${category}:${normaliseFamily(category, family)}`;

export function subcategoryMeta(category, family) {
  const fam = normaliseFamily(category, family);
  const meta = FAMILY_META[fam] || FAMILY_META[FAMILY.GENERAL];
  const cat = CATEGORY_META[category] || { label: category, icon: 'help-outline' };
  // Without a family there is nothing to add, so the subcategory is just the
  // skill: "Reading structures", not "Reading structure structures".
  if (fam === FAMILY.GENERAL) {
    return { label: cat.label, icon: cat.icon, family: fam, category };
  }
  const tpl = SUB_TEMPLATE[category];
  return {
    label: tpl ? tpl(meta) : `${cat.label} · ${meta.many}`,
    icon: meta.icon,
    family: fam,
    category,
  };
}

// Wrong parts for "build the name". Drawn at random from a pool sized to the
// question rather than a fixed pair, so the same molecule does not always come
// with the same two decoys — and so guessing by elimination is harder.
//
// Every decoy is a real piece of nomenclature: a root, an ending, a locant or
// a multiplying prefix. Nonsense fragments would be dismissed on sight and
// teach nothing.
function nameDecoys(parts, n, rand, want) {
  const pool = [];
  // neighbouring roots — the miscount
  for (const k of [n - 2, n - 1, n + 1, n + 2]) if (k >= 1 && k <= 10) pool.push(ROOTS[k - 1]);
  // the other endings
  pool.push('ene', 'yne', 'ol', 'anol');
  // locants and multipliers, which belong to branched names
  pool.push('2-', '3-', '4-', 'di', 'tri', 'methyl', 'ethyl');
  const usable = [...new Set(pool)].filter((x) => !parts.includes(x));
  const picked = [];
  const bag = [...usable];
  while (picked.length < want && bag.length) {
    picked.push(bag.splice(Math.floor(rand() * bag.length), 1)[0]);
  }
  return picked;
}

let uid = 0;
const nextId = (kind) => `${kind}-${++uid}`;

export function mcName(mol, { chip = 'NAME THE STRUCTURE', prompt, seed = 1, hint } = {}) {
  const answer = nameOf(mol);
  if (!answer) return null;
  const n = carbonCount(mol);
  const wrong = nameDistractors(n).filter((w) => w !== answer).slice(0, 3);
  const options = shuffleWith(seeded(seed), [answer, ...wrong]);
  return {
    id: nextId('mcname'),
    category: CATEGORY.NAME_STRUCTURE,
    family: familyOf(mol),
    type: 'mcName',
    chip,
    prompt: prompt || 'Which name correctly describes this structure?',
    mol,
    showCarbons: needsExplicitAtoms(mol),
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
    category: CATEGORY.CHOOSE_STRUCTURE,
    family: familyOf(answer),
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

// `stereo: true` keeps the E/Z or cis/trans descriptor in the answer and marks
// the question so checking is stereo-AWARE. Everywhere else the app is
// deliberately stereo-blind, because a drawn zigzag implies a configuration
// the learner was never asked about — but in a stereochemistry lesson the
// descriptor IS the question, so it must count.
export function writeName(mol, { chip = 'WRITE THE NAME', hint, stereo = false } = {}) {
  const answer = stereo ? stereoNameOf(mol) : nameOf(mol);
  if (!answer) return null;
  if (stereo && !/\([\dEZRS,]+\)/.test(answer)) return null;   // nothing to test
  return {
    id: nextId('write'),
    category: CATEGORY.WRITE_NAME,
    family: familyOf(mol),
    type: 'write',
    chip,
    prompt: 'Give the preferred IUPAC name for this structure.',
    mol,
    showCarbons: needsExplicitAtoms(mol),
    stereo,
    answer,
    explain: `${describeStructure(mol)} — ${answer}.`,
    hint: hint || 'Count the carbons, take the root, then add -ane.',
    needs: [CONCEPT.SKELETAL, CONCEPT.ROOTS, CONCEPT.NAMING],
  };
}

// `named: true` phrases the question around the molecule's name, which only
// makes sense once the roots are known. By default it asks about the drawing,
// so the question can be used before naming has been taught.
export function countCarbons(mol, { chip = 'ENTER A NUMBER', named = false } = {}) {
  const name = nameOf(mol);
  const n = carbonCount(mol);
  return {
    id: nextId('count'),
    category: CATEGORY.COUNT_ATOMS,
    family: familyOf(mol),
    type: 'number',
    chip,
    prompt: named ? `How many carbon atoms are in ${name}?` : 'How many carbon atoms are in this structure?',
    mol,
    showCarbons: needsExplicitAtoms(mol),
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
  const n = carbonCount(mol);
  const name = nameOf(mol);
  return {
    id: nextId('hcount'),
    category: CATEGORY.COUNT_ATOMS,
    family: familyOf(mol),
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
  const n = carbonCount(mol);
  const answer = formulaOf(mol);
  if (!answer) return null;
  const wrong = [`C${n}H${2 * n}`, `C${n}H${2 * n + 4}`, `C${n}H${2 * n - 2}`].filter((w) => w !== answer);
  const options = shuffleWith(seeded(seed + 13), [answer, ...wrong.slice(0, 3)]);
  return {
    id: nextId('mcform'),
    category: CATEGORY.FORMULA,
    family: familyOf(mol),
    type: 'mcName',
    chip,
    // Same rule as counting: name the molecule only where the roots are known.
    prompt: named
      ? `What is the molecular formula of ${nameOf(mol)}?`
      : `What is the molecular formula of an alkane with ${n} carbons?`,
    mol: named ? undefined : mol,
    showCarbons: needsExplicitAtoms(mol),
    options,
    answer: options.indexOf(answer),
    explain: `2n + 2 with n = ${n} gives ${2 * n + 2} hydrogens: ${answer}.`,
    needs: named ? [CONCEPT.FORMULA, CONCEPT.ROOTS] : [CONCEPT.FORMULA],
  };
}

export function drawIt(mol, { chip = 'DRAW THE MOLECULE', hint } = {}) {
  const name = nameOf(mol);
  if (!name) return null;
  // Methane is one carbon and no bonds. On the canvas that is a single tap
  // with nothing to see, so it teaches nothing about drawing and reads as a
  // broken question. pool() drops anything returning null.
  if (mol.atoms.filter((a) => !a.el || a.el === 'C').length < 2) return null;
  return {
    id: nextId('draw'),
    category: CATEGORY.DRAW_MOLECULE,
    family: familyOf(mol),
    type: 'draw',
    chip,
    prompt: `Draw ${name}.`,
    subtitle: 'Build the complete structure on the canvas.',
    name,
    answer: name,
    explain: `${name}: ${carbonCount(mol)} carbons joined in a row.`,
    hint: hint || 'Tap once to place a carbon, then tap again to add the next.',
    needs: [CONCEPT.ROOTS, CONCEPT.DRAWING],
  };
}

export function tapCarbons(mol, { chip = 'COUNT THE CARBONS', named = false } = {}) {
  return {
    id: nextId('tap'),
    category: CATEGORY.COUNT_ATOMS,
    family: familyOf(mol),
    type: 'countTap',
    chip,
    prompt: 'Tap every carbon in this structure.',
    subtitle: 'Remember: each line end and each corner.',
    mol,
    showCarbons: needsExplicitAtoms(mol),
    answer: carbonCount(mol),
    // The explanation must not name the molecule before the roots are taught:
    // revealing "hexane" here is a naming lesson the learner has not had.
    explain: named
      ? `${carbonCount(mol)} carbons — ${nameOf(mol)}.`
      : `${carbonCount(mol)} carbons: every line end and every corner.`,
    needs: named ? [CONCEPT.SKELETAL, CONCEPT.ROOTS] : [CONCEPT.SKELETAL],
  };
}

// Multiple choice where the wrong answers are the names of REAL neighbouring
// molecules, so every distractor is a name the engine agrees exists — and is
// verified to differ from the answer.
export function mcNameFrom(mol, distractorMols, { chip = 'NAME THE STRUCTURE', prompt, seed = 1, hint, stereo = false } = {}) {
  // In stereo mode the descriptor is the point, so both the answer AND the
  // distractors keep theirs — otherwise "(2E)-but-2-ene" would be offered
  // against "but-2-ene", which is not a wrong answer so much as a different
  // question.
  const nameFn = stereo ? stereoNameOf : nameOf;
  const answer = nameFn(mol);
  if (!answer) return null;
  const wrong = [];
  for (const d of distractorMols) {
    const nm = nameFn(d);
    if (nm && nm !== answer && !wrong.includes(nm)) wrong.push(nm);
    if (wrong.length === 3) break;
  }
  if (wrong.length < 2) return null;
  const options = shuffleWith(seeded(seed + 29), [answer, ...wrong]);
  return {
    id: nextId('mcnamefrom'),
    stereo,
    category: CATEGORY.NAME_STRUCTURE,
    family: familyOf(mol),
    type: 'mcName',
    chip,
    prompt: prompt || 'Which name correctly describes this structure?',
    mol,
    showCarbons: needsExplicitAtoms(mol),
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
    category: CATEGORY.COMPARE_NAMES,
    family: familyOf(pa.mol),
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
  const n = carbonCount(mol);
  if (!answer) return null;
  const parts = [ROOTS[n - 1], 'ane'];
  const rand = seeded(seed + 61);
  const spare = nameDecoys(parts, n, rand, 4);
  return {
    id: nextId('build'),
    category: CATEGORY.BUILD_NAME,
    family: familyOf(mol),
    type: 'buildName',
    chip,
    prompt: 'Build the correct IUPAC name.',
    subtitle: 'Tap the parts in the right order.',
    mol,
    parts,
    options: shuffleWith(seeded(seed + 62), [...parts, ...spare]),
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
  const rand = seeded(seed + 83);
  const given = spares.filter((x) => !parts.includes(x));
  // top the caller's decoys up to five wrong parts
  const extra = [...new Set([...given, ...nameDecoys(parts, carbonCount(mol), rand, 5)])].slice(0, 5);
  return {
    id: nextId('buildfrom'),
    category: CATEGORY.BUILD_NAME,
    family: familyOf(mol),
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
