// ─────────────────────────────────────────────────────────────
// Reactions.
//
// The naming course's founding rule — content is verified by the engine, not
// trusted — extended to chemistry that HAPPENS. Three guarantees, all machine
// checked (tests/reactions.test.mjs):
//
//   1. Every species on every card is a name the engine parses, draws and
//      round-trips. Existing discipline, nothing new.
//   2. Every reaction CONSERVES ATOMS. The engine computes molecular
//      formulas, so the suite can assert, on every authored card, that what
//      goes in comes out. An unbalanced esterification cannot ship.
//   3. Every reaction obeys the GRAMMAR of its claimed type: an "addition"
//      whose reactant is not unsaturated, or an "oxidation" that starts from
//      a tertiary alcohol, fails the build.
//
// What the engine does NOT know, stated plainly: reagents and conditions.
// Cr₂O₇²⁻/H⁺ is a string on a whitelist, rendered as a chip over the arrow —
// a typo'd reagent still fails the build, but nothing here derives that
// dichromate oxidises. WHETHER a reaction goes is asserted by the author and
// guarded by the grammar; the engine guards WHAT it produces.
//
// No mechanisms anywhere. VCE excludes curly arrows, and that exclusion is
// what keeps this model finite: a reaction is (type, reactants, reagent,
// conditions, products) and nothing else.
// ─────────────────────────────────────────────────────────────

import { parseName, canonicalName } from '../chem/engineBridge';
import { formulaOf } from '../chem/model';
import { familyOf, padOptions, CATEGORY } from './questionFactory';

// ── Reagents ─────────────────────────────────────────────────
// The whitelist. `adds`/`removes` are what the ORGANIC molecule gains and
// loses — the inorganic remainder (the NaBr, the HCl) is implied and checked
// as the difference. Wording matches the VCE data-booklet style; if Jack
// wants "acidified potassium dichromate" spelled out instead, this table is
// the one place it changes.
export const REAGENTS = {
  'H₂ / Ni': { adds: { H: 2 }, removes: {}, types: ['addition'] },
  'Br₂': { adds: { Br: 2 }, removes: {}, types: ['addition'] },
  'Cl₂': { adds: { Cl: 2 }, removes: {}, types: ['addition'] },
  'HBr': { adds: { H: 1, Br: 1 }, removes: {}, types: ['addition'] },
  'HCl': { adds: { H: 1, Cl: 1 }, removes: {}, types: ['addition'] },
  'H₂O / H₂SO₄': { adds: { H: 2, O: 1 }, removes: {}, types: ['addition'] },
  'Cl₂ / UV': { adds: { Cl: 1 }, removes: { H: 1 }, types: ['substitution'] },
  'Br₂ / UV': { adds: { Br: 1 }, removes: { H: 1 }, types: ['substitution'] },
  'NaOH(aq)': { adds: { O: 1, H: 1 }, removes: { halo: 1 }, types: ['substitution'] },
  'NH₃': { adds: { N: 1, H: 2 }, removes: { halo: 1 }, types: ['substitution'] },
  'HBr (conc.)': { adds: { Br: 1 }, removes: { O: 1, H: 1 }, types: ['substitution'] },
  'Cr₂O₇²⁻ / H⁺': { adds: null, removes: null, types: ['oxidation'] },
  'MnO₄⁻ / H⁺': { adds: null, removes: null, types: ['oxidation'] },
  'H₂SO₄ (conc.)': { adds: null, removes: null, types: ['condensation', 'hydrolysis'] },
  'H₂O / H⁺': { adds: null, removes: null, types: ['hydrolysis'] },
  'yeast (fermentation)': { adds: null, removes: null, types: ['biological'] },
  // Amide condensation runs on heat alone — the reagent chip is honest about
  // that rather than inventing a catalyst.
  'heat': { adds: null, removes: null, types: ['condensation'] },
};

// Small molecules that appear beside the arrow — byproducts and co-reactants
// that are not organic enough for the engine. Element maps, so conservation
// arithmetic can include them.
export const SMALL = {
  'H₂O': { H: 2, O: 1 },
  'HCl': { H: 1, Cl: 1 },
  'HBr': { H: 1, Br: 1 },
  'NaCl': { Na: 1, Cl: 1 },
  'NaBr': { Na: 1, Br: 1 },
  'NH₄Br': { N: 1, H: 4, Br: 1 },
  'NH₄Cl': { N: 1, H: 4, Cl: 1 },
  'CO₂': { C: 1, O: 2 },
  'H₂': { H: 2 },
  'O₂': { O: 2 },
};

// ── The grammar ──────────────────────────────────────────────
// What each reaction type is allowed to connect. familyOf() is the engine's
// verdict on a structure, so a card claiming "addition" from something the
// engine says is an alkane fails before a student ever sees it.
//
// Oxidation is the interesting row: the LEVEL matters, not just the family.
// A primary alcohol may become an aldehyde or (with excess oxidant) the acid;
// a secondary alcohol only the ketone; a tertiary alcohol nothing at all —
// and that last fact is taught as content, so the grammar has to know it too.
// Family strings are familyOf()'s vocabulary, checked by the suite — 'acid',
// not 'carboxylic acid', because agreeing with the engine matters more than
// agreeing with a textbook.
export const RXN_TYPES = {
  addition: { from: ['alkene', 'alkyne'], to: ['alkane', 'haloalkane', 'alcohol'] },
  substitution: {
    from: ['alkane', 'haloalkane', 'alcohol'],
    to: ['haloalkane', 'alcohol', 'amine'],
  },
  oxidation: { from: ['alcohol', 'aldehyde'], to: ['aldehyde', 'ketone', 'acid'] },
  condensation: { from: ['acid'], with: ['alcohol', 'amine'], to: ['ester', 'amide'] },
  hydrolysis: { from: ['ester', 'amide'], to: ['acid'] },
  biological: { from: [], to: ['alcohol'] },
};

// ── Parsing and arithmetic ───────────────────────────────────
const parseCache = new Map();
export function molOf(name) {
  if (!parseCache.has(name)) {
    const p = parseName(name);
    parseCache.set(name, p && p.ok ? p.mol : null);
  }
  return parseCache.get(name);
}

export function formulaOfName(name) {
  const mol = molOf(name);
  if (!mol) return null;
  const f = formulaOf(mol);
  // Engine graphs leave carbon's element implicit; formulaOf() faithfully
  // reports that as a key called "undefined". Those are the carbons.
  if (f.undefined) {
    f.C = (f.C || 0) + f.undefined;
    delete f.undefined;
  }
  return f;
}

const addMaps = (a, b) => {
  const out = { ...a };
  for (const k of Object.keys(b || {})) out[k] = (out[k] || 0) + b[k];
  return out;
};

export const sameFormula = (a, b) => {
  if (!a || !b) return false;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) if ((a[k] || 0) !== (b[k] || 0)) return false;
  return true;
};

// Conservation for one card: everything on the left equals everything on the
// right, element by element. `left`/`right` are lists of organic names and
// SMALL keys mixed freely.
export function conserves(left, right) {
  const total = (side) => {
    let f = {};
    for (const item of side) {
      const part = SMALL[item] || formulaOfName(item);
      if (!part) return null;
      f = addMaps(f, part);
    }
    return f;
  };
  const L = total(left);
  const R = total(right);
  return !!L && !!R && sameFormula(L, R);
}

// ── Masses and atom economy ──────────────────────────────────
// Standard atomic masses, two decimals — the precision the VCE data booklet
// uses. Every mass and atom-economy figure the content shows is COMPUTED
// from these and the engine's formulas, then the test suite recomputes it:
// a typed number that disagrees with arithmetic cannot ship.
export const ATOMIC_MASS = {
  H: 1.008, C: 12.011, N: 14.007, O: 15.999,
  F: 18.998, Na: 22.99, Cl: 35.453, Br: 79.904, I: 126.904,
};

export function massOf(formula) {
  if (!formula) return null;
  let m = 0;
  for (const el of Object.keys(formula)) {
    if (!ATOMIC_MASS[el]) return null;
    m += ATOMIC_MASS[el] * formula[el];
  }
  return m;
}

export const molarMassOfName = (name) => massOf(SMALL[name] || formulaOfName(name));

// Atom economy of a registered reaction, from the product side: desired
// product over everything the equation produces. By conservation this equals
// the textbook definition (product over all reactants) while needing no
// bookkeeping about which reagent atoms transfer.
export function atomEconomy(rxn) {
  const product = molarMassOfName(rxn.to);
  if (!product) return null;
  let waste = 0;
  for (const w of rxn.also.right) {
    const m = molarMassOfName(w);
    if (m == null) return null;
    waste += m;
  }
  return (product / (product + waste)) * 100;
}

// ── Authoring a reaction ─────────────────────────────────────
// RXN() is to reactions what the engine parser is to molecules: the only door
// content comes through, so everything that comes through is checkable.
//
//   RXN({
//     type: 'oxidation',
//     from: 'propan-1-ol',
//     reagent: 'Cr₂O₇²⁻ / H⁺',
//     conditions: 'excess oxidant, reflux',
//     to: 'propanoic acid',
//     also: { left: [], right: [] },   // small species, e.g. right: ['H₂O']
//   })
//
// Nothing is validated at call time — authoring stays cheap — but the record
// carries everything the test suite needs to validate ALL of it at build.
export function RXN(spec) {
  return {
    kind: 'rxn',
    type: spec.type,
    from: spec.from,
    with: spec.with || null,
    reagent: spec.reagent || null,
    conditions: spec.conditions || null,
    to: spec.to,
    also: { left: (spec.also && spec.also.left) || [], right: (spec.also && spec.also.right) || [] },
    note: spec.note || null,
  };
}

// Everything on each side of the arrow, for conservation checks and for the
// completeEquation questions that quiz exactly this bookkeeping.
export function sidesOf(rxn) {
  const left = [rxn.from, ...(rxn.with ? [rxn.with] : []), ...rxn.also.left];
  const right = [rxn.to, ...rxn.also.right];
  return { left, right };
}

// The registry: every reaction the content mentions, in one list, so the
// suite has a single thing to walk and the pathway unit (later) has a single
// thing to search. Units register their reactions by importing and spreading.
export const ALL_REACTIONS = [];
export function register(rxns) {
  ALL_REACTIONS.push(...rxns);
  return rxns;
}

// ── Question builders ────────────────────────────────────────
// Each builder emits a question of an EXISTING player type (mcName,
// mcStructure, write, draw) carrying the reaction as a payload. The player
// needed no new routing — only the renderers learned to draw a reaction card
// when q.rxn is present.
//
// Wrong options carry their diagnosis. `errorClasses[i]` names the mistake
// option i embodies, and the player logs that class on a wrong answer — this
// is the data the study runs on, and it cannot be collected retroactively.

let qSeq = 0;
const qid = (stem) => `${stem}-${++qSeq}`;

const shuffleIn = (options, answer, seed) => {
  // Deterministic placement, same idea as padOptions: the answer must not
  // live at a favourite index.
  const order = [...options.keys()];
  let s = seed >>> 0 || 1;
  for (let i = order.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { options: order.map((i) => options[i]), answer: order.indexOf(answer) };
};

// 1. Predict the product — four structures.
export function predictProduct(rxn, distractors, { explain, errorClasses, seed = 1 } = {}) {
  const raw = [rxn.to, ...distractors];
  const mix = shuffleIn(raw, 0, seed);
  return {
    id: qid('pp'),
    type: 'mcStructure',
    chip: 'PREDICT THE PRODUCT',
    prompt: 'Which structure forms?',
    rxn: { ...rxn, to: null },              // the product is the question
    optionNames: mix.options,
    options: mix.options.map(molOf),
    answer: mix.answer,
    explain,
    errorClasses: remap(errorClasses, raw, mix.options),
    category: CATEGORY.PREDICT_PRODUCT,
    family: familyOf(molOf(rxn.to)),
  };
}

// 2. Predict the product — four names. Quietly re-tests nomenclature reading.
export function predictProductName(rxn, distractors, { explain, errorClasses, seed = 1 } = {}) {
  const raw = [rxn.to, ...distractors];
  const mix = shuffleIn(raw, 0, seed);
  return {
    id: qid('ppn'),
    type: 'mcName',
    chip: 'PREDICT THE PRODUCT',
    prompt: 'Which product forms?',
    rxn: { ...rxn, to: null },
    options: mix.options,
    answer: mix.answer,
    explain,
    errorClasses: remap(errorClasses, raw, mix.options),
    category: CATEGORY.PREDICT_PRODUCT,
    family: familyOf(molOf(rxn.to)),
  };
}

// 3. Name the product — structure shown, name typed. One unknown at a time:
// hiding the structure too would stack the reaction guess on the naming task
// and make the error data unreadable.
export function nameProduct(rxn, { hint } = {}) {
  return {
    id: qid('np'),
    type: 'write',
    chip: 'NAME THE PRODUCT',
    prompt: 'Name the product of this reaction.',
    rxn: { ...rxn, showProduct: true },
    mol: molOf(rxn.to),
    answer: canonicalName(rxn.to) || rxn.to,
    hint,
    category: CATEGORY.WRITE_NAME,
    family: familyOf(molOf(rxn.to)),
  };
}

// 4. Draw the product. The canvas is the whole screen on these, so the
// reaction lives in the prompt rather than as a card.
export function drawProduct(rxn, { hint } = {}) {
  return {
    id: qid('dp'),
    type: 'draw',
    chip: 'DRAW THE PRODUCT',
    prompt: `Draw the product: ${rxn.from} + ${rxn.reagent}`,
    subtitle: rxn.conditions || undefined,
    answer: canonicalName(rxn.to) || rxn.to,
    hint,
    category: CATEGORY.DRAW_MOLECULE,
    family: familyOf(molOf(rxn.to)),
  };
}

// 5. Pick the reagent — both structures shown, the arrow blank.
export function pickReagent(rxn, distractorReagents, { explain, errorClasses, seed = 1 } = {}) {
  const raw = [rxn.reagent, ...distractorReagents];
  const mix = shuffleIn(raw, 0, seed);
  return {
    id: qid('pr'),
    type: 'mcName',
    chip: 'PICK THE REAGENT',
    prompt: 'What takes you from the left structure to the right one?',
    rxn: { ...rxn, reagent: null, showProduct: true },
    options: mix.options,
    answer: mix.answer,
    explain,
    errorClasses: remap(errorClasses, raw, mix.options),
    category: CATEGORY.PICK_REAGENT,
    family: familyOf(molOf(rxn.to)),
  };
}

// 6. Classify the reaction — the vocabulary itself, fixed option set.
const TYPE_LABELS = ['addition', 'substitution', 'oxidation', 'condensation'];
export function classifyReaction(rxn, { explain, seed = 1 } = {}) {
  const set = TYPE_LABELS.includes(rxn.type)
    ? TYPE_LABELS
    : ['hydrolysis', 'condensation', 'substitution', 'addition'];
  const mix = shuffleIn(set, set.indexOf(rxn.type), seed);
  return {
    id: qid('cr'),
    type: 'mcName',
    chip: 'CLASSIFY THE REACTION',
    prompt: 'What type of reaction is this?',
    rxn: { ...rxn, showProduct: true },
    options: mix.options,
    answer: mix.answer,
    explain,
    // Which type was chosen instead is itself the data.
    errorClasses: Object.fromEntries(mix.options.map((t, i) => [i, `confused-${t}`])),
    category: CATEGORY.CLASSIFY_REACTION,
    family: familyOf(molOf(rxn.to)),
  };
}

// 7. Complete the equation — the missing small molecule. The one type where
// the ANSWER is derived: the suite recomputes it from the formulas and fails
// the card if the author disagrees with arithmetic.
export function completeEquation(rxn, options, { explain, seed = 1 } = {}) {
  const missing = rxn.also.right[0];
  const raw = [missing, ...options.filter((o) => o !== missing)].slice(0, 4);
  const mix = shuffleIn(raw, 0, seed);
  return {
    id: qid('ce'),
    type: 'mcName',
    chip: 'BALANCE THE BOOKS',
    prompt: 'One product is missing. Atoms have to go somewhere — which is it?',
    rxn: { ...rxn, showProduct: true, hideAlso: true },
    options: mix.options,
    answer: mix.answer,
    explain,
    errorClasses: Object.fromEntries(mix.options.map((_, i) => [i, 'unbalanced'])),
    category: CATEGORY.COMPLETE_EQUATION,
    family: familyOf(molOf(rxn.to)),
  };
}

// 8. Classify the carbon — 1°/2°/3°, with the carbon in question ringed on
// the structure. The answer is not trusted: degreeOf() recounts it from the
// graph, and the suite compares.
export function classifyCarbon(name, at, { explain, seed = 1 } = {}) {
  const mol = molOf(name);
  const answer = degreeOf(mol, at);
  const set = ['primary (1°)', 'secondary (2°)', 'tertiary (3°)', 'quaternary (4°)'];
  const mix = shuffleIn(set, answer - 1, seed);
  return {
    id: qid('cc'),
    type: 'mcName',
    chip: 'CLASSIFY THE CARBON',
    prompt: 'How many carbons is the ringed carbon bonded to?',
    mol,
    highlight: [at],
    options: mix.options,
    answer: mix.answer,
    explain,
    errorClasses: Object.fromEntries(mix.options.map((_, i) => [i, 'off-by-one-degree'])),
    category: CATEGORY.CLASSIFY_CARBON,
    family: familyOf(mol),
    // For the suite: recount and compare.
    _at: at,
    _claimed: answer,
  };
}

// How many CARBONS a carbon is bonded to — not hydrogens, which is the
// misconception classifyCarbon exists to kill.
export function degreeOf(mol, atomId) {
  if (!mol) return 0;
  return mol.bonds
    .filter((b) => b.a === atomId || b.b === atomId)
    .map((b) => mol.atoms.find((x) => x.id === (b.a === atomId ? b.b : b.a)))
    .filter((x) => x && (x.el === 'C' || !x.el)).length;
}

// ── Pathways ─────────────────────────────────────────────────
// The registry is a graph: molecules are nodes, registered reactions are
// edges, and a tile is an edge's label. The walker and the searcher below
// are what make pathway questions checkable — the authored route is walked,
// not believed, and the tile set is searched for unintended answers.

// How a reaction appears on a tile. The co-reactant matters — esterification
// with ethanol and with methanol are different tiles going different places.
export const tileLabelOf = (rxn) =>
  rxn.with ? `${rxn.with}, ${rxn.reagent}` : rxn.reagent;

// One step: what does `current` become under this tile? Null if the registry
// has no such edge — which the UI shows as "no reaction" the moment the tile
// lands in the slot.
export function stepFrom(current, tileLabel) {
  const hit = ALL_REACTIONS.find(
    (r) => r.from === current && tileLabelOf(r) === tileLabel
  );
  return hit ? hit.to : null;
}

// Walk a whole route. Returns every intermediate and, if a step has no edge,
// where it broke — the component renders exactly this, so what the student
// sees and what the test asserts are the same walk.
export function walkRoute(from, tiles) {
  const mols = [from];
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i] == null) return { mols, brokeAt: null, complete: false };
    const next = stepFrom(mols[mols.length - 1], tiles[i]);
    if (!next) return { mols, brokeAt: i, complete: false };
    mols.push(next);
  }
  return { mols, brokeAt: null, complete: true };
}

// Every ordering of every subset of the tiles, up to maxSteps, that legally
// reaches the target. Tile counts are tiny (≤6), so brute force is honest
// and fast. Used by the suite to prove the authored route is THE route —
// no shorter one hiding in the tile set, no unintended sibling at the same
// length — and by "design under constraint" lessons to declare routes: 'any'.
export function routesBetween(from, to, tiles, maxSteps) {
  const found = [];
  const walk = (current, used, path) => {
    if (current === to && path.length > 0) {
      found.push([...path]);
      // A route that continues past the target is a different, longer route;
      // still explore, so overshoots are found too.
    }
    if (path.length >= maxSteps) return;
    tiles.forEach((t, i) => {
      if (used.has(i)) return;
      const next = stepFrom(current, t);
      if (!next) return;
      used.add(i);
      path.push(t);
      walk(next, used, path);
      path.pop();
      used.delete(i);
    });
  };
  walk(from, new Set(), []);
  return found;
}

// 9. Build the pathway — the capstone question. Start and target fixed,
// tiles to arrange in order, every placed step deriving its intermediate
// live through the same walker the suite uses.
export function pathwayQ({ from, to, steps, tiles, route, routes, prompt, explain, hint }) {
  return {
    id: qid('pw'),
    type: 'pathway',
    chip: 'BUILD THE PATHWAY',
    prompt: prompt || `Get from ${from} to ${to} in ${steps} step${steps > 1 ? 's' : ''}.`,
    from,
    to,
    steps,
    tiles,
    route,
    routes: routes || 'unique',
    explain,
    hint,
    category: CATEGORY.PATHWAY,
    family: familyOf(molOf(to)),
  };
}

function remap(errorClasses, rawOptions, mixedOptions) {
  if (!errorClasses) return null;
  const out = {};
  mixedOptions.forEach((opt, i) => {
    const rawIdx = rawOptions.indexOf(opt);
    if (errorClasses[rawIdx] != null) out[i] = errorClasses[rawIdx];
  });
  return out;
}
