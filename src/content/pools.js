// ─────────────────────────────────────────────────────────────
// Question pools for units 1–3.
//
// Every lesson has a pool of at least 30; the player samples 10 per run, so
// repeating a lesson is not repeating the same questions.
//
// Nothing here states an answer. A molecule is built, the engine names it, and
// the question is assembled around that name — which is why every item can be
// checked by tests/question-pools.test.mjs. Molecules are laid out by the
// tidier at construction, so no question can show a tangled structure.
//
// Conventions throughout:
//   • formulas are written plainly (CH3, C5H12) and subscripted at render
//   • distractor names are real molecules, never invented strings
//   • "correct the name" uses a mistake a student would actually make
//   • concept questions are the only hand-set answers, and are marked as such
// ─────────────────────────────────────────────────────────────

import { buildTarget, Cn, chainBonds } from '../chem/questions';
import { parseName } from '../engine/index.js';
import {
  carbonWithFiveBonds,
  carbonWithFourBonds,
  carbonWithNeighbours,
  hydrogenWithOneBond,
  hydrogenWithTwoBonds,
  oxygenWithThreeBonds,
  oxygenWithTwoBonds,
} from './diagrams';
import {
  categoryForChip,
  familyOf,
  radialMolecule,
  straightChain,
  bentChain,
  branchedChain,
  mcName,
  mcNameFrom,
  mcStructure,
  writeName,
  countCarbons,
  countHydrogens,
  mcFormula,
  drawIt,
  tapCarbons,
  buildNameFrom,
  pool, padOptions } from './questionFactory';

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const bent = (n) => bentChain(n, Math.ceil(n / 2));
const others = (list, i) => list.filter((_, k) => k !== i);

// Hand-written questions about a rule rather than a molecule. The answer index
// is the only thing in this file not derived from the engine.
const concept = (id, chip, prompt, options, answer, explain, mol, showCarbons) => {
  // Every multiple choice offers four. Three gives a third of a mark for
  // guessing, and the fourth is generated from the shape of the others so it
  // belongs with them rather than standing out as filler.
  const seed = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const padded = padOptions(options, answer, chip, seed);
  return {
  id,
  type: 'mcName',
  chip,
  prompt,
  options: padded.options,
  answer: padded.answer,
  explain,
  mol,
  showCarbons: !!showCarbons,
  category: categoryForChip(chip),
  family: familyOf(mol),
  };
};

// ── Molecule catalogues ──────────────────────────────────────
const MONO = [
  branchedChain(4, [{ at: 2, size: 1 }]),
  branchedChain(5, [{ at: 2, size: 1 }]),
  branchedChain(5, [{ at: 3, size: 1 }]),
  branchedChain(6, [{ at: 2, size: 1 }]),
  branchedChain(6, [{ at: 3, size: 1 }]),
  branchedChain(7, [{ at: 2, size: 1 }]),
  branchedChain(7, [{ at: 3, size: 1 }]),
  branchedChain(7, [{ at: 4, size: 1 }]),
];

const ETHYLS = [
  branchedChain(5, [{ at: 3, size: 2 }]),
  branchedChain(6, [{ at: 3, size: 2 }]),
  branchedChain(7, [{ at: 3, size: 2 }]),
  branchedChain(7, [{ at: 4, size: 2 }]),
];

const MULTI = [
  branchedChain(4, [{ at: 2, size: 1 }, { at: 3, size: 1 }]),
  branchedChain(5, [{ at: 2, size: 1 }, { at: 3, size: 1 }]),
  branchedChain(5, [{ at: 2, size: 1 }, { at: 4, size: 1 }]),
  branchedChain(6, [{ at: 2, size: 1 }, { at: 3, size: 1 }]),
  branchedChain(6, [{ at: 2, size: 1 }, { at: 5, size: 1 }]),
  branchedChain(6, [{ at: 3, size: 1 }, { at: 4, size: 1 }]),
];

const BRANCHED = [...MONO, ...ETHYLS, ...MULTI];
const SPARES = ['3-', '4-', 'ethyl', 'methyl', 'di', 'hexane', 'pentane'];

// ═════════════════════════════════════════════════════════════
// UNIT 1 · Alkanes and straight-chain naming
// ═════════════════════════════════════════════════════════════

// ── Before naming: short, fixed sets ─────────────────────────
// Lessons 1 to 3 cover very little ground — bonds, reading a skeleton, and
// what an alkane is. A pool of thirty forced increasingly contrived
// variations of the same two ideas, so these are five basic checks that every
// learner sees. The randomised pools begin at lesson 4, where naming gives
// enough material to vary.

// Each of these shows the element in a real structure, so the answer is read
// off the drawing rather than recalled. Counting the lines leaving the middle
// atom IS the skill.
const METHANE = radialMolecule('C', ['H', 'H', 'H', 'H']);
const AMMONIA = radialMolecule('N', ['H', 'H', 'H']);
const WATER = radialMolecule('O', ['H', 'H']);
const HCHLORIDE = radialMolecule('Cl', ['H']);
const CHLOROMETHANE = radialMolecule('C', ['H', 'H', 'H', 'Cl']);

export const POOL_U1L1 = pool(
  concept('u1l1-a', 'count THE bonds', 'How many bonds does the carbon atom form here?',
    ['2', '3', '4', 'It varies'], 2,
    'Four lines leave the carbon. That is always the count — never three, never five.',
    METHANE, true),
  concept('u1l1-b', 'count THE bonds', 'How many bonds does each hydrogen form here?',
    ['1', '2', '3', '4'], 0,
    'One line each. A hydrogen can only ever sit at the end of a bond, never in the middle of a chain.',
    METHANE, true),
  concept('u1l1-c', 'count THE bonds', 'How many bonds does the oxygen atom form here?',
    ['1', '2', '3', '4'], 1,
    'Two lines leave the oxygen — the count for its whole column.',
    WATER, true),
  concept('u1l1-d', 'count THE bonds', 'How many bonds does the nitrogen atom form here?',
    ['1', '2', '3', '4'], 2,
    'Three lines leave the nitrogen.',
    AMMONIA, true),
  concept('u1l1-e', 'count THE bonds', 'How many bonds does the chlorine atom form here?',
    ['1', '2', '3', '4'], 0,
    'One — the halogens take a single bond, exactly like the hydrogen they replace.',
    CHLOROMETHANE, true)
);


export const POOL_U1L2 = pool(
  concept('u1l2-a', 'read THE drawing', 'In a skeletal drawing, what sits at each corner of the zigzag?',
    ['A hydrogen atom', 'A carbon atom', 'Nothing — it is just a bend'], 1,
    'Every corner and every line end is a carbon.',
    straightChain(5)),
  concept('u1l2-b', 'count THE hydrogens',
    'This carbon has two carbon neighbours. How many hydrogens does it hold?',
    ['1', '2', '3', '4'], 1,
    'Two neighbours use two of its four bonds, leaving two: a CH2 group.',
    carbonWithNeighbours(2), true),
  concept('u1l2-c', 'count THE hydrogens',
    'This carbon has one carbon neighbour. How many hydrogens does it hold?',
    ['1', '2', '3', '4'], 2,
    'One neighbour leaves three bonds free: a CH3 group.',
    carbonWithNeighbours(1), true),
  tapCarbons(straightChain(5)),
  // Bent chains are unit 2's material — they are what that unit teaches — so
  // lesson 2 counts a plain chain here.
  countCarbons(straightChain(6))
);


export const POOL_U1L3 = pool(
  concept('u1l3-a', 'IDENTIFY THE MOLECULE TYPE', 'What is a hydrocarbon?',
    ['A molecule of carbon and hydrogen only', 'Any molecule containing carbon', 'A molecule containing water'],
    0, 'Carbon and hydrogen, nothing else. Add an oxygen and it stops being a hydrocarbon.'),
  concept('u1l3-b', 'IDENTIFY THE MOLECULE TYPE', 'What makes a hydrocarbon an alkane?',
    ['It contains a ring', 'Every carbon-carbon bond is single', 'It contains an oxygen'],
    1, 'Only single bonds — that is the whole definition, and it is what the -ane ending reports.'),
  mcFormula(straightChain(5), { seed: 5 }),
  countHydrogens(straightChain(6)),
  concept('u1l3-c', 'IDENTIFY THE MOLECULE TYPE',
    'Why does an alkane have 2n + 2 hydrogens rather than 2n?',
    ['The two end carbons each take an extra hydrogen', 'Carbon sometimes makes five bonds',
     'Hydrogen sometimes makes two bonds'],
    0, 'The +2 is exactly the two extra hydrogens on the ends, where a carbon has one neighbour instead of two.')
);


export const POOL_U1L4 = pool(
  range(1, 10).map((n) => mcName(straightChain(n), { seed: n })),
  range(1, 10).map((n) => writeName(straightChain(n))),
  range(2, 8).map((n) => mcStructure(n, { seed: n + 3 })),
  range(2, 9).map((n) => buildNameFrom(straightChain(n), { seed: n, spares: SPARES })),
  concept('u1l4-a', 'name THE structure', 'What does the -ane ending tell you?',
    ['How many carbons there are', 'That every carbon-carbon bond is single', 'That the chain is branched'], 1,
    'The root carries the count; the ending carries the bond type.'),
  concept('u1l4-b', 'name THE structure', 'A chain of seven carbons, all single bonds, is called…',
    ['heptene', 'heptane', 'septane'], 1,
    'hept- for seven, plus the default -ane.')
);

export const POOL_U2L1 = pool(
  range(1, 10).map((n) => writeName(straightChain(n))),
  range(4, 9).map((n) => writeName(bent(n), { hint: 'Trace the chain through the bend before counting.' })),
  range(1, 10).map((n) => mcName(straightChain(n), { seed: n + 21 })),
  range(2, 8).map((n) => buildNameFrom(straightChain(n), { seed: n + 60, spares: SPARES }))
);

export const POOL_U2L2 = pool(
  // Name to structure means exactly that: the learner builds it. Counting,
  // choosing and name-assembly all belong to other lessons — mixing them in
  // here meant the lesson tested recognition when it set out to test
  // construction.
  range(2, 10).map((n) => drawIt(straightChain(n))),
  range(2, 10).map((n) =>
    drawIt(straightChain(n), { hint: 'Read the root for the count, then tap that many carbons.' })
  ),
  range(3, 8).map((n) =>
    drawIt(straightChain(n), { hint: 'Every bond is single, so leave them all as plain lines.' })
  ),
  range(4, 9).map((n) => drawIt(bent(n)))
);

export const POOL_U2L3 = pool(
  range(2, 10).map((n) => writeName(straightChain(n))),
  range(1, 8).map((n) => mcFormula(straightChain(n), { seed: n + 51 })),
  range(4, 9).map((n) => writeName(bent(n))),
  range(2, 6).map((n) => drawIt(straightChain(n))),
  range(3, 8).map((n) => countHydrogens(straightChain(n))),
  range(3, 7).map((n) => writeName(straightChain(n)))
);

// ═════════════════════════════════════════════════════════════
// UNIT 2 · Finding the parent chain
// ═════════════════════════════════════════════════════════════

export const POOL_U3L1 = pool(
  range(4, 9).map((n) => tapCarbons(bent(n))),
  range(4, 9).map((n) => countCarbons(bent(n))),
  range(4, 9).map((n) => writeName(bent(n), { hint: 'The bend does not start a new chain.' })),
  range(4, 8).map((n) => mcName(bent(n), { seed: n + 11, hint: 'Trace it right through the corner.' })),
  range(5, 9).map((n) => mcStructure(n, { seed: n + 23 })),
  concept('u2l1-a', 'read THE drawing', 'Does a chain stop where the drawing turns a corner?',
    ['Yes — a corner starts a new chain', 'No — a corner is just another carbon', 'Only if the corner is a sharp one'], 1,
    'A corner is a carbon like any other. The direction of the drawing carries no meaning at all.',
    bent(6)),
  concept('u2l1-b', 'read THE drawing',
    'Two drawings look different but trace out the same chain. Are they the same compound?',
    [
      'Yes — connectivity is what defines a molecule',
      'No — a different shape is a different compound',
      'Only if they are drawn at the same angle',
    ], 0,
    'A molecule is defined by what is bonded to what, never by how the drawing is arranged.')
);

export const POOL_U3L2 = pool(
  range(4, 9).map((n) => writeName(bent(n))),
  range(4, 8).map((n) => mcName(bent(n), { seed: n + 31 })),
  range(4, 9).map((n) => tapCarbons(bent(n))),
  range(4, 8).map((n) => countCarbons(bent(n))),
  concept('u2l2-a', 'find THE error',
    'A student counts a bent seven-carbon chain as five and names it pentane. What went wrong?',
    ['They stopped counting at the bend', 'Nothing — it is pentane', 'They counted the hydrogens'], 0,
    'Stopping at a corner is the single most common counting error, and it stays common with longer chains.',
    bent(7)),
  // topped up after the "correct the name" questions were removed: the same
  // skill, asked directly
  range(4, 9).map((n) => mcName(bentChain(n, Math.ceil(n / 2)), { seed: n + 61 })),
  range(3, 8).map((n) => writeName(straightChain(n)))
);

export const POOL_U3CP = pool(
  range(4, 9).map((n) => writeName(bent(n), { hint: 'Trace the chain through the bend.' })),
  range(4, 9).map((n) => tapCarbons(bent(n))),
  range(3, 9).map((n) => countCarbons(bent(n))),
  range(3, 8).map((n) => mcName(bent(n), { seed: n + 71 })),
  range(2, 8).map((n) => writeName(straightChain(n)))
);

// ═════════════════════════════════════════════════════════════
// UNIT 3 · Alkyl substituents
// ═════════════════════════════════════════════════════════════

export const POOL_U4L1 = pool(
  // Lesson 1 introduces the idea of a branch and its -yl name. It has NOT
  // taught numbering, so nothing here asks for a locant or a full name — the
  // previous pool was mostly carbon counting, which tested the last unit
  // rather than this one.
  concept('u4l1-a', 'identify THE group', 'What is a substituent?',
    ['A group hanging off the parent chain', 'The longest chain in the molecule', 'A double bond'], 0,
    'Anything attached to the parent chain rather than part of it.'),
  concept('u4l1-b', 'identify THE group', 'How many carbons are in a methyl group?',
    ['1', '2', '3'], 0, 'meth = 1 carbon; -yl marks it as a branch.'),
  concept('u4l1-c', 'identify THE group', 'How many carbons are in an ethyl group?',
    ['1', '2', '3'], 1, 'eth = 2 carbons.'),
  concept('u4l1-d', 'identify THE group', 'A three-carbon branch is called…',
    ['propane', 'propyl', 'tripropyl'], 1, 'prop = 3, + -yl for a branch. Propane would be a parent chain.'),
  concept('u4l1-e', 'identify THE group', 'A four-carbon branch is called…',
    ['butyl', 'butane', 'tetrayl'], 0, 'but = 4, + -yl.'),
  concept('u4l1-f', 'identify THE group', 'What does the -yl ending tell you?',
    ['The group is the parent chain', 'The group hangs off the parent chain', 'The group contains a double bond'],
    1, '-yl marks a substituent. The parent keeps -ane.'),
  concept('u4l1-g', 'identify THE group', 'Which part of a branched molecule keeps the -ane ending?',
    ['The branch', 'The parent chain', 'Both'], 1,
    'The parent takes the ending; the branch is cited as a -yl group in front of it.'),
  concept('u4l1-h', 'find THE parent', 'In a branched molecule, which chain is the parent?',
    ['The longest continuous carbon chain', 'The chain drawn horizontally', 'The shorter chain'], 0,
    'Longest continuous chain, however the drawing happens to be arranged.',
    MONO[1]),
  concept('u4l1-i', 'find THE parent',
    'A molecule has a five-carbon chain with a two-carbon branch. Which is the parent?',
    ['The five-carbon chain', 'The two-carbon branch', 'Whichever is drawn first'], 0,
    'The longest continuous run of carbons is always the parent.'),
  concept('u4l1-j', 'find THE parent', 'Why does the parent chain have to be found first?',
    ['It is traditional', 'Everything else in the name depends on it', 'It makes the drawing neater'], 1,
    'The root, the branch names and the numbers all follow from the parent. Choose it wrongly and the whole name is wrong.'),
  concept('u4l1-k', 'find THE parent', 'Can the parent chain bend around a corner in the drawing?',
    ['No, it must be drawn straight', 'Yes — it is about connectivity, not the drawn shape',
     'Only if the branch is a methyl'], 1,
    'The chain is whichever carbons connect, regardless of how the drawing turns.',
    MONO[2]),
  concept('u4l1-l', 'identify THE group', 'Which of these is a branch rather than a parent chain?',
    ['propyl', 'propane', 'propene'], 0, 'The -yl ending marks a substituent.'),
  concept('u4l1-m', 'identify THE group', 'Which ending marks a substituent?',
    ['-ane', '-yl', '-ene'], 1, '-yl. The parent keeps -ane.'),
  concept('u4l1-n', 'identify THE group', 'A branch of one carbon attached to a chain is called…',
    ['methane', 'methyl', 'monoyl'], 1, 'meth = 1, + -yl.'),
  concept('u4l1-o', 'find THE parent',
    'A molecule has a six-carbon chain and a three-carbon chain meeting at a carbon. Which is the parent?',
    ['The six-carbon chain', 'The three-carbon chain', 'Neither — you add them'], 0,
    'The longer of the two continuous runs is the parent; the shorter becomes a propyl branch.'),
  concept('u4l1-p', 'find THE parent', 'What happens if you choose the wrong parent chain?',
    ['Nothing, the name still works', 'The root, the branch names and the numbers all come out wrong',
     'Only the numbers change'], 1,
    'Every other part of the name is derived from the parent, so all of it goes wrong together.'),
  concept('u4l1-q', 'identify THE group', 'Is a branch part of the parent chain?',
    ['Yes', 'No — it hangs off it', 'Only if it has two carbons'], 1,
    'A branch is named separately and written in front of the parent.'),
  concept('u4l1-r', 'identify THE group', 'How many carbons does a propyl group have?',
    ['2', '3', '4'], 1, 'prop = 3.'),
  concept('u4l1-s', 'identify THE group', 'Which of these names a two-carbon branch?',
    ['methyl', 'ethyl', 'propyl'], 1, 'eth = 2 carbons.'),
  concept('u4l1-t', 'find THE parent', 'The parent chain is the…',
    ['shortest continuous chain', 'longest continuous chain', 'chain with the most branches'], 1,
    'Longest continuous chain, always.'),
  // counting the branch itself is fair here: the count is what names the group
  MONO.map((m) => countCarbons(m)),
  ETHYLS.map((m) => countCarbons(m))
);

export const POOL_U4L2 = pool(
  // moved here from lesson 1: naming a branched molecule needs locants, which
  // this lesson is the first to teach
  MONO.map((m, i) => mcNameFrom(m, others(MONO, i), { seed: i + 5 })),
  MONO.map((m) => writeName(m, { hint: 'Longest chain first, then number for the lowest locant.' })),
  MONO.map((m, i) => mcNameFrom(m, others(MONO, i), { seed: i + 15 })),
  MONO.map((m, i) => buildNameFrom(m, { seed: i + 25, spares: SPARES })),
  ETHYLS.map((m) => writeName(m, { hint: 'Check the parent length before naming the branch.' })),
  ETHYLS.map((m, i) => buildNameFrom(m, { seed: i + 35, spares: SPARES })),
  concept('u3l2-a', 'number THE chain', 'From which end should a chain be numbered?',
    ['From the end that gives the branch the lower number', 'Always from the left', 'From the end with more hydrogens'], 0,
    'Lowest locant wins. That is why 3-methylbutane is never correct — from the other end it is 2-methylbutane.')
);

export const POOL_U4L3 = pool(
  MONO.map((m) => drawIt(m, { hint: 'Draw the parent chain first, then tap the branch carbon.' })),
  MONO.map((m) => writeName(m)),
  ETHYLS.map((m) => drawIt(m)),
  MULTI.map((m) => writeName(m, { hint: 'Cite substituents alphabetically; the numbers come from the lowest locant set.' })),
  BRANCHED.map((m, i) => mcNameFrom(m, others(BRANCHED, i), { seed: i + 45 })),
  MONO.map((m) => writeName(m, { hint: 'Longest chain first, then number for the lowest locant.' }))
);

export const POOL_U4CP = pool(
  BRANCHED.map((m) => writeName(m)),
  MONO.map((m, i) => mcNameFrom(m, others(MONO, i), { seed: i + 55 })),
  MULTI.map((m, i) => mcNameFrom(m, others(MULTI, i), { seed: i + 65 })),
  MONO.slice(0, 5).map((m) => drawIt(m)),
  MONO.map((m, i) => buildNameFrom(m, { seed: i + 75, spares: SPARES })),
  range(3, 8).map((n) => writeName(straightChain(n)))
);

// ═════════════════════════════════════════════════════════════
// Checkpoints for units 4–5 (numbering, multiple substituents)
// Kept on the same catalogues so the branching questions stay consistent
// with unit 3. Their lesson content is authored; only these pools are here.
// ═════════════════════════════════════════════════════════════

export const POOL_U5CP = pool(
  MONO.map((m) => writeName(m, { hint: 'Number from the end that gives the branch the lower locant.' })),
  MONO.map((m, i) => mcNameFrom(m, others(MONO, i), { seed: i + 3 })),
  MONO.slice(0, 5).map((m) => drawIt(m, { hint: 'Parent chain first, then the branch.' })),
  MONO.map((m) => countCarbons(m)),
  ETHYLS.map((m) => writeName(m)),
  range(4, 9).map((n) => writeName(straightChain(n)))
);

export const POOL_U6CP = pool(
  MULTI.map((m) => writeName(m, { hint: 'Alphabetical citation; lowest locant set decides the numbers.' })),
  MULTI.map((m, i) => mcNameFrom(m, others(MULTI, i), { seed: i + 17 })),
  MULTI.slice(0, 4).map((m) => drawIt(m)),
  MULTI.map((m) => countCarbons(m)),
  MULTI.map((m, i) => buildNameFrom(m, { seed: i + 27, spares: SPARES })),
  MONO.map((m, i) => mcNameFrom(m, others(MONO, i), { seed: i + 41 })),
  ETHYLS.map((m) => writeName(m))
);


// ── Unsaturation and halogens ────────────────────────────────
// Alkene and alkyne names come back from the engine stereo-free (see nameOf),
// so "but-2-ene" is the answer everywhere in these units — E/Z waits for
// stage 9.
const ALKENES = [
  buildTarget(Cn(3), chainBonds(3, { 1: 2 })),   // prop-1-ene
  buildTarget(Cn(4), chainBonds(4, { 1: 2 })),   // but-1-ene
  buildTarget(Cn(4), chainBonds(4, { 2: 2 })),   // but-2-ene
  buildTarget(Cn(5), chainBonds(5, { 1: 2 })),   // pent-1-ene
  buildTarget(Cn(5), chainBonds(5, { 2: 2 })),   // pent-2-ene
  buildTarget(Cn(6), chainBonds(6, { 2: 2 })),   // hex-2-ene
  buildTarget(Cn(6), chainBonds(6, { 3: 2 })),   // hex-3-ene
  buildTarget(Cn(7), chainBonds(7, { 3: 2 })),   // hept-3-ene
];

const ALKYNES = [
  buildTarget(Cn(3), chainBonds(3, { 1: 3 })),   // prop-1-yne
  buildTarget(Cn(4), chainBonds(4, { 1: 3 })),   // but-1-yne
  buildTarget(Cn(4), chainBonds(4, { 2: 3 })),   // but-2-yne
  buildTarget(Cn(5), chainBonds(5, { 1: 3 })),   // pent-1-yne
  buildTarget(Cn(5), chainBonds(5, { 2: 3 })),   // pent-2-yne
  buildTarget(Cn(6), chainBonds(6, { 3: 3 })),   // hex-3-yne
];

const UNSAT = [...ALKENES, ...ALKYNES];

const halo = (n, el, at) => buildTarget([...Cn(n), el], [...chainBonds(n), [at - 1, n]]);

const HALIDES = [
  halo(2, 'Cl', 1),   // chloroethane
  halo(3, 'Cl', 1),   // 1-chloropropane
  halo(3, 'Cl', 2),   // 2-chloropropane
  halo(4, 'Cl', 2),   // 2-chlorobutane
  halo(2, 'Br', 1),   // bromoethane
  halo(4, 'Br', 1),   // 1-bromobutane
  halo(4, 'F', 1),    // 1-fluorobutane
  halo(5, 'I', 2),    // 2-iodopentane
  halo(5, 'Cl', 3),   // 3-chloropentane
  halo(6, 'Br', 2),   // 2-bromohexane
];

const DIHALIDES = [
  buildTarget([...Cn(2), 'Cl', 'Cl'], [...chainBonds(2), [0, 2], [1, 3]]),      // 1,2-dichloroethane
  buildTarget([...Cn(3), 'Cl', 'Cl'], [...chainBonds(3), [0, 3], [2, 4]]),      // 1,3-dichloropropane
  buildTarget([...Cn(4), 'Br', 'Br'], [...chainBonds(4), [0, 4], [3, 5]]),      // 1,4-dibromobutane
  buildTarget([...Cn(3), 'Cl', 'Br'], [...chainBonds(3), [0, 3], [2, 4]]),      // 1-bromo-3-chloropropane
];

const HALO_ALL = [...HALIDES, ...DIHALIDES];

// ── Unit 6 · Alkenes and alkynes ─────────────────────────────
export const POOL_U7L1 = pool(
  concept('u7l1-a', 'IDENTIFY THE MOLECULE TYPE', 'What makes a hydrocarbon an alkene?',
    ['Every bond is single', 'It contains a carbon-carbon double bond', 'It contains a ring'], 1,
    'One double bond between carbons is what makes it an alkene, and what changes the ending to -ene.'),
  concept('u7l1-b', 'IDENTIFY THE MOLECULE TYPE', 'Which ending marks a double bond?',
    ['-ane', '-ene', '-yne'], 1, '-ene. -ane is all single bonds, -yne is a triple bond.'),
  concept('u7l1-c', 'IDENTIFY THE MOLECULE TYPE', 'What kind of hydrocarbon is this?',
    ['An alkane', 'An alkene', 'An alkyne'], 1,
    'The two parallel lines are a double bond, so it is an alkene.',
    ALKENES[2]),
  concept('u7l1-d', 'IDENTIFY THE MOLECULE TYPE', 'How is a double bond drawn?',
    ['One line', 'Two parallel lines', 'A dashed line'], 1, 'Two lines side by side between the same pair of carbons.'),
  concept('u7l1-e', 'count THE hydrogens',
    'A carbon in a double bond has one other carbon neighbour. How many hydrogens does it hold?',
    ['0', '1', '2'], 1,
    'The double bond uses two of its four bonds and the neighbour a third, leaving one for hydrogen.'),
  concept('u7l1-f', 'IDENTIFY THE MOLECULE TYPE', 'Why can an alkene not have the formula CnH(2n+2)?',
    ['The double bond uses bonds that would otherwise hold hydrogen', 'Alkenes contain oxygen',
     'Alkenes are always rings'], 0,
    'A double bond ties up two more bonds, so an alkene has two fewer hydrogens: CnH2n.'),
  ALKENES.map((m) => mcNameFrom(m, ALKENES.filter((x) => x !== m), { seed: 3 })),
  ALKENES.map((m) => writeName(m, { hint: 'Root for the chain length, -ene for the double bond, and a number for where it starts.' })),
  ALKENES.map((m) => countCarbons(m)),
  ALKENES.slice(0, 4).map((m) => drawIt(m, { hint: 'Draw the chain, then tap the bond to make it double.' }))
);

export const POOL_U7L2 = pool(
  concept('u7l2-a', 'number THE chain', 'What does the number in "but-2-ene" tell you?',
    ['How many carbons there are', 'Which carbon the double bond starts at', 'How many double bonds there are'],
    1, 'The locant gives the lower-numbered carbon of the two joined by the double bond.'),
  concept('u7l2-b', 'number THE chain', 'From which end is the chain numbered in an alkene?',
    ['From the left of the drawing', 'From the end that gives the double bond the lower number',
     'From whichever end has more hydrogens'], 1,
    'The double bond takes priority over everything else you have met so far when choosing a direction.'),
  concept('u7l2-c', 'number THE chain', 'Why is "but-3-ene" never a correct name?',
    ['Butane has only three carbons', 'Numbered from the other end it is but-1-ene',
     'Double bonds cannot sit on carbon 3'], 1,
    'On a four-carbon chain, a bond starting at 3 from one end starts at 1 from the other — and the lower number is compulsory.'),
  concept('u7l2-d', 'number THE chain', 'In prop-1-ene, how much work is the number doing?',
    ['It rules out prop-2-ene', 'None — the bond can only start at carbon 1, but the number is written anyway',
     'It counts the carbons'], 1,
    'With three carbons the double bond can only start at carbon 1, so the locant carries no information. Modern style writes it regardless.'),
  UNSAT.map((m) => writeName(m)),
  ALKENES.map((m) => mcNameFrom(m, ALKENES.filter((x) => x !== m), { seed: 11 })),
  ALKENES.slice(2).map((m) => drawIt(m)),
  ALKENES.map((m) => countCarbons(m))
);

export const POOL_U7L3 = pool(
  concept('u7l3-a', 'IDENTIFY THE MOLECULE TYPE', 'What makes a hydrocarbon an alkyne?',
    ['A carbon-carbon double bond', 'A carbon-carbon triple bond', 'A ring'], 1,
    'Three lines between two carbons: a triple bond, and the ending -yne.'),
  concept('u7l3-b', 'IDENTIFY THE MOLECULE TYPE', 'How many bonds does the triple bond here use up?',
    ['1', '2', '3'], 2, 'Three of the four bonds on each of those carbons — count the parallel lines.',
    ALKYNES[2], true),
  concept('u7l3-c', 'count THE hydrogens',
    'A carbon at the end of a chain joined by a triple bond holds how many hydrogens?',
    ['0', '1', '2'], 1, 'Three bonds go into the triple bond, leaving one for hydrogen.'),
  concept('u7l3-d', 'IDENTIFY THE MOLECULE TYPE', 'Which ending marks a triple bond?',
    ['-ane', '-ene', '-yne'], 2, '-yne.'),
  ALKYNES.map((m) => writeName(m, { hint: 'Same method as an alkene, but the ending is -yne.' })),
  ALKYNES.map((m) => mcNameFrom(m, ALKYNES.filter((x) => x !== m), { seed: 17 })),
  UNSAT.map((m) => countCarbons(m)),
  ALKYNES.slice(0, 4).map((m) => drawIt(m, { hint: 'Draw the chain, then set that bond to triple.' })),
  ALKENES.slice(0, 4).map((m) => writeName(m))
);

export const POOL_U7CP = pool(
  UNSAT.map((m) => writeName(m)),
  UNSAT.map((m) => mcNameFrom(m, UNSAT.filter((x) => x !== m), { seed: 23 })),
  UNSAT.slice(0, 6).map((m) => drawIt(m)),
  UNSAT.map((m) => countCarbons(m)),
  ALKENES.map((m) => mcNameFrom(m, ALKYNES, { seed: 29 }))
);

// ── Unit 7 · Haloalkanes ─────────────────────────────────────
export const POOL_U8L1 = pool(
  concept('u8l1-a', 'identify THE group', 'How is a chlorine atom cited in a name?',
    ['chloro-', 'chlorine-', 'chlor-'], 0, 'chloro-, as a prefix in front of the parent chain.'),
  concept('u8l1-b', 'identify THE group', 'How is a bromine atom cited?',
    ['brom-', 'bromo-', 'bromine-'], 1, 'bromo-.'),
  concept('u8l1-c', 'identify THE group', 'Fluorine and iodine become…',
    ['fluoro- and iodo-', 'fluor- and iod-', 'fluoride- and iodide-'], 0, 'fluoro- and iodo-.'),
  concept('u8l1-d', 'identify THE group', 'Does a halogen ever take the suffix instead of a prefix?',
    ['Yes, when there is only one', 'No — halogens are always prefixes', 'Only for chlorine'], 1,
    'Halogens have no suffix form at all. However many there are, they are cited as prefixes.'),
  concept('u8l1-e', 'identify THE group', 'How many bonds does the chlorine form here?',
    ['1', '2', '3'], 0, 'One, like the hydrogen it replaced — so it always sits at the end of a bond.',
    radialMolecule('C', ['H', 'H', 'H', 'Cl']), true),
  concept('u8l1-f', 'identify THE group', 'What is a haloalkane?',
    ['An alkane with a halogen in place of a hydrogen', 'An alkane with a double bond',
     'A halogen on its own'], 0, 'One or more hydrogens replaced by a halogen.'),
  HALIDES.map((m) => writeName(m, { hint: 'Prefix for the halogen, number for where it sits, then the parent.' })),
  HALIDES.map((m) => mcNameFrom(m, HALIDES.filter((x) => x !== m), { seed: 31 })),
  HALIDES.map((m) => countCarbons(m))
);

export const POOL_U8L2 = pool(
  concept('u8l2-a', 'number THE chain', 'Where does the number in "2-chlorobutane" come from?',
    ['The number of chlorines', 'The carbon the chlorine is attached to', 'The chain length'], 1,
    'The locant is the carbon carrying the halogen, numbered for the lowest possible value.'),
  concept('u8l2-b', 'number THE chain', 'Two chlorines on the same molecule are written…',
    ['dichloro-, with a locant each', 'chlorochloro-', 'chloro2-'], 0,
    'di- for two, and every halogen still gets its own number: 1,2-dichloroethane.'),
  concept('u8l2-c', 'identify THE group',
    'A molecule has both a chlorine and a methyl group. Which is cited first?',
    ['chloro, because halogens come first', 'chloro, because c comes before m alphabetically',
     'methyl, because carbon comes first'], 1,
    'Substituents are listed alphabetically, and halogens are not special: chloro before methyl.'),
  concept('u8l2-d', 'number THE chain', 'Why does bromoethane need no locant?',
    ['Bromine never takes a number', 'Both carbons are equivalent, so there is only one bromoethane',
     'Two-carbon chains are never numbered'], 1,
    'Either position gives the same molecule, so a number would carry no information.'),
  HALO_ALL.map((m) => writeName(m)),
  HALO_ALL.map((m) => mcNameFrom(m, HALO_ALL.filter((x) => x !== m), { seed: 37 })),
  HALIDES.slice(0, 5).map((m) => drawIt(m, { hint: 'Draw the chain, then place the halogen from the Atom menu.' })),
  DIHALIDES.map((m) => countCarbons(m))
);

export const POOL_U8CP = pool(
  HALO_ALL.map((m) => writeName(m)),
  HALO_ALL.map((m) => mcNameFrom(m, HALO_ALL.filter((x) => x !== m), { seed: 41 })),
  HALIDES.slice(0, 6).map((m) => drawIt(m)),
  HALO_ALL.map((m) => countCarbons(m)),
  ALKENES.slice(0, 4).map((m) => writeName(m))
);


// ── Alcohols ─────────────────────────────────────────────────
const ol = (n, at) => buildTarget([...Cn(n), 'O'], [...chainBonds(n), [at - 1, n]]);

const ALCOHOLS = [
  ol(2, 1),   // ethanol
  ol(3, 1),   // propan-1-ol
  ol(3, 2),   // propan-2-ol
  ol(4, 1),   // butan-1-ol
  ol(4, 2),   // butan-2-ol
  ol(5, 1),   // pentan-1-ol
  ol(5, 2),   // pentan-2-ol
  ol(5, 3),   // pentan-3-ol
  ol(6, 2),   // hexan-2-ol
  ol(6, 3),   // hexan-3-ol
];

const DIOLS = [
  buildTarget([...Cn(2), 'O', 'O'], [...chainBonds(2), [0, 2], [1, 3]]),   // ethane-1,2-diol
  buildTarget([...Cn(3), 'O', 'O'], [...chainBonds(3), [0, 3], [2, 4]]),   // propane-1,3-diol
  buildTarget([...Cn(4), 'O', 'O'], [...chainBonds(4), [0, 4], [3, 5]]),   // butane-1,4-diol
];

const BRANCHED_OL = [
  buildTarget([...Cn(4), 'O'], [...chainBonds(3), [1, 3], [0, 4]]),        // 2-methylpropan-1-ol
  buildTarget([...Cn(5), 'O'], [...chainBonds(4), [2, 4], [0, 5]]),        // 3-methylbutan-1-ol
];

const ALL_OL = [...ALCOHOLS, ...DIOLS, ...BRANCHED_OL];

export const POOL_U9L1 = pool(
  // Lesson 1 introduces the hydroxyl group and the -ol suffix. It has NOT
  // taught numbering, and only methanol and ethanol are named without a
  // locant — so this lesson asks about the GROUP: recognising it, what it
  // does to the name, and counting the chain it sits on. Naming proper is
  // lesson 2's job, which is where the locant rule is taught.
  concept('u9l1-a', 'identify THE group', 'What makes a molecule an alcohol?',
    ['An oxygen double-bonded to carbon', 'An -OH group on a carbon', 'A halogen on a carbon'], 1,
    'A hydroxyl group: an oxygen joined to a carbon and to a hydrogen.'),
  concept('u9l1-b', 'identify THE group', 'Which suffix marks an alcohol?',
    ['-ol', '-al', '-ane'], 0, '-ol replaces the -e of the parent: ethane becomes ethanol.'),
  concept('u9l1-c', 'identify THE group', 'How many bonds does the oxygen in an -OH group form?',
    ['1', '2', '3'], 1, 'Two: one to the carbon and one to the hydrogen.',
    ALCOHOLS[0], true),
  concept('u9l1-d', 'identify THE group', 'Is an alcohol a hydrocarbon?',
    ['Yes', 'No — it contains oxygen as well', 'Only if it has fewer than four carbons'], 1,
    'Hydrocarbons are carbon and hydrogen only. An alcohol has an oxygen too.'),
  concept('u9l1-e', 'identify THE group', 'Where does the -ol suffix go in the name?',
    ['In front, like a prefix', 'At the end, replacing the -e of the alkane', 'It does not appear'], 1,
    'butane → butanol: the -e is dropped and -ol added.'),
  concept('u9l1-f', 'identify THE group', 'A halogen is cited as a prefix. How is a hydroxyl cited?',
    ['Also as a prefix', 'As the suffix', 'It is not cited at all'], 1,
    'A halogen goes in front as chloro- or bromo-; a hydroxyl goes on the end as -ol.'),
  concept('u9l1-g', 'identify THE group', 'Which of these is an alcohol?',
    ['CH3-CH2-Cl', 'CH3-CH2-OH', 'CH3-CH2-CH3'], 1, 'The -OH is the hydroxyl group.'),
  concept('u9l1-h', 'identify THE group', 'How many hydrogens does the oxygen in -OH carry?',
    ['0', '1', '2'], 1, 'One. Its other bond goes to the carbon chain.',
    ALCOHOLS[0], true),
  concept('u9l1-i', 'identify THE group', 'Why can a hydroxyl never sit in the middle of a chain?',
    ['It is too large', 'Oxygen has only two bonds, and one holds its hydrogen',
     'It always sits on carbon 1'], 1,
    'With one bond to carbon and one to hydrogen, both are used — so it hangs off the chain.'),
  concept('u9l1-j', 'identify THE group', 'What is the name of the simplest alcohol, with one carbon?',
    ['methanol', 'methane', 'methanal'], 0, 'methane + -ol, with the -e dropped: methanol.'),
  concept('u9l1-k', 'identify THE group', 'Two carbons with a hydroxyl on the end is called…',
    ['ethanol', 'ethane', 'ethanal'], 0, 'ethanol — and it needs no number, because both carbons are equivalent.',
    ALCOHOLS[0]),
  // counting the chain an alcohol sits on: no locant required, and it
  // rehearses that the oxygen is not part of the carbon count
  ALCOHOLS.map((m) => countCarbons(m)),
  DIOLS.map((m) => countCarbons(m)),
  ALCOHOLS.slice(0, 6).map((m) => countHydrogens(m))
);

export const POOL_U9L2 = pool(
  concept('u9l2-a', 'number THE chain', 'In butan-2-ol, what does the 2 refer to?',
    ['The number of carbons', 'The carbon carrying the OH', 'The number of OH groups'], 1,
    'The locant gives the carbon the hydroxyl is attached to.'),
  concept('u9l2-b', 'number THE chain', 'Why is "butan-3-ol" not a correct name?',
    ['Butane has only three carbons', 'Numbered from the other end it is butan-2-ol',
     'Alcohols cannot sit on carbon 3'], 1,
    'The chain is numbered to give the hydroxyl the lower locant, so 3 becomes 2.'),
  concept('u9l2-c', 'number THE chain', 'Does ethanol need a locant?',
    ['Yes, always', 'No — both carbons are equivalent, so there is only one ethanol',
     'Only when written formally'], 1,
    'With two carbons either position gives the same molecule.'),
  concept('u9l2-d', 'identify THE group', 'Two OH groups on one chain are named…',
    ['-diol, with a locant each', '-ol twice', '-dihydroxy'], 0,
    'ethane-1,2-diol: di- for two, a locant for each, and the -e is kept before a consonant.'),
  ALL_OL.map((m) => writeName(m)),
  ALL_OL.map((m, i) => mcNameFrom(m, others(ALL_OL, i), { seed: i + 11 })),
  DIOLS.map((m) => countCarbons(m)),
  ALCOHOLS.slice(2, 8).map((m) => drawIt(m))
);

export const POOL_U9CP = pool(
  ALL_OL.map((m) => writeName(m)),
  ALL_OL.map((m, i) => mcNameFrom(m, others(ALL_OL, i), { seed: i + 23 })),
  ALCOHOLS.slice(0, 6).map((m) => drawIt(m)),
  ALL_OL.map((m) => countCarbons(m)),
  DIOLS.map((m) => writeName(m, { hint: 'Two hydroxyls: di-, and a locant for each.' }))
);


// ── Functional-group priority ────────────────────────────────
// The ladder among everything taught so far:
//   alcohol (-ol)  >  alkyne (-yne)  >  alkene (-ene)  >  alkane (-ane)
//   halogens and alkyl branches have NO suffix form at all
//
// Each molecule below carries two groups that compete, so the name shows the
// winner taking the suffix and the loser demoted to a prefix or an infix.
const enol = (n, ene, oh) => buildTarget([...Cn(n), 'O'], [...chainBonds(n, { [ene]: 2 }), [oh - 1, n]]);
const haloOl = (n, oh, x, el) => buildTarget([...Cn(n), 'O', el], [...chainBonds(n), [oh - 1, n], [x - 1, n + 1]]);
const meOl = (n, oh, me) => buildTarget([...Cn(n + 1), 'O'], [...chainBonds(n), [me - 1, n], [oh - 1, n + 1]]);
const haloEne = (n, ene, x) => buildTarget([...Cn(n), 'Cl'], [...chainBonds(n, { [ene]: 2 }), [x - 1, n]]);

const ENOLS = [
  enol(4, 3, 1),   // but-3-en-1-ol
  enol(5, 4, 1),   // pent-4-en-1-ol
  enol(5, 1, 5),   // pent-4-en-1-ol from the other side
  enol(6, 5, 1),   // hex-5-en-1-ol
];

const HALO_OLS = [
  haloOl(3, 1, 3, 'Cl'),   // 3-chloropropan-1-ol
  haloOl(4, 1, 4, 'Cl'),   // 4-chlorobutan-1-ol
  haloOl(4, 2, 1, 'Cl'),   // 1-chlorobutan-2-ol
  haloOl(5, 1, 5, 'Br'),   // 5-bromopentan-1-ol
  haloOl(5, 2, 1, 'Br'),   // 1-bromopentan-2-ol
];

const BRANCH_OLS = [
  meOl(4, 1, 3),   // 3-methylbutan-1-ol
  meOl(5, 1, 4),   // 4-methylpentan-1-ol
];

const HALO_ENES = [
  haloEne(4, 1, 4),   // 4-chlorobut-1-ene
  haloEne(4, 1, 3),   // 3-chlorobut-1-ene
  haloEne(5, 1, 5),   // 5-chloropent-1-ene
];

const COMPETING = [...ENOLS, ...HALO_OLS, ...BRANCH_OLS, ...HALO_ENES];

export const POOL_U10L1 = pool(
  concept('u10l1-a', 'identify THE group', 'When a molecule has two functional groups, which one takes the suffix?',
    ['Whichever comes first alphabetically', 'The one higher on the priority ladder', 'Whichever has the lower locant'],
    1, 'Seniority decides. The winner takes the suffix; everything else is demoted to a prefix.'),
  concept('u10l1-b', 'identify THE group', 'Which is more senior: an alcohol or an alkene?',
    ['The alcohol', 'The alkene', 'They rank equally'], 0,
    'The alcohol takes -ol as the suffix, and the double bond is reported as -en- inside the name.'),
  concept('u10l1-c', 'identify THE group', 'Can a halogen ever take the suffix?',
    ['Yes, if it is the only group', 'No — halogens have no suffix form at all', 'Only chlorine can'],
    1, 'However many halogens a molecule has, they are always prefixes. They can never be the principal group.'),
  concept('u10l1-d', 'identify THE group', 'Can an alkyl branch take the suffix?',
    ['Yes', 'No — like a halogen, it is prefix-only', 'Only if it is longer than the parent'],
    1, 'A branch is always cited as a -yl prefix. If it were longer than the chain it hangs on, it would simply become the parent.'),
  concept('u10l1-e', 'identify THE group', 'In but-3-en-1-ol, which group is the principal one?',
    ['The double bond', 'The hydroxyl', 'Neither — they rank equally'], 1,
    'The name ends in -ol, so the hydroxyl is principal. The double bond appears as -en- in the middle.',
    ENOLS[0]),
  concept('u10l1-f', 'number THE chain', 'What does the principal group get, besides the suffix?',
    ['The lowest possible locant', 'The highest possible locant', 'No locant at all'], 0,
    'Numbering serves the principal group first: it takes the lowest number it can, and everything else is numbered around it.'),
  concept('u10l1-g', 'identify THE group', 'Why is "1-hydroxybutane" not the preferred name for butan-1-ol?',
    ['Hydroxy- is not a real prefix', 'The alcohol is senior here, so it must take the suffix',
     'Butane cannot carry a hydroxyl'], 1,
    'hydroxy- is a real prefix, but it is only used when something more senior has already taken the suffix.'),
  concept('u10l1-h', 'identify THE group', 'Order these from most to least senior.',
    ['alcohol, alkene, halogen', 'halogen, alcohol, alkene', 'alkene, alcohol, halogen'], 0,
    'Alcohol takes the suffix; an alkene is reported inside the name; a halogen is only ever a prefix.'),
  COMPETING.map((m) => writeName(m, { hint: 'Find the senior group first — it takes the suffix and the lowest number.' })),
  COMPETING.map((m, i) => mcNameFrom(m, others(COMPETING, i), { seed: i + 5 })),
  COMPETING.map((m) => countCarbons(m))
);

export const POOL_U10L2 = pool(
  concept('u10l2-a', 'number THE chain', 'In 4-chlorobutan-1-ol, why is the hydroxyl on carbon 1?',
    ['Chlorine must always be on carbon 4', 'The alcohol is senior, so it takes the lowest locant',
     'The chain can only be numbered one way'], 1,
    'Numbering serves the principal group first. The chlorine takes whatever number follows.',
    HALO_OLS[1]),
  concept('u10l2-b', 'number THE chain', 'Two prefixes on one molecule are listed…',
    ['in order of seniority', 'alphabetically', 'by locant'], 1,
    'Prefixes are cited alphabetically: 1-chloro-4-methylpentane, not 4-methyl-1-chloropentane.'),
  concept('u10l2-c', 'identify THE group', 'In 4-chlorobut-1-ene, which group took the suffix?',
    ['The chlorine', 'The double bond', 'Neither'], 1,
    'The chlorine cannot — it has no suffix form — so the double bond is the most senior thing present.',
    HALO_ENES[0]),
  concept('u10l2-d', 'number THE chain', 'A molecule has a hydroxyl and a double bond at opposite ends. Which end is carbon 1?',
    ['The hydroxyl end', 'The double bond end', 'Either'], 0,
    'The alcohol is senior, so it gets the lowest locant and the numbering starts at its end.',
    ENOLS[0]),
  COMPETING.map((m) => writeName(m)),
  COMPETING.map((m, i) => mcNameFrom(m, others(COMPETING, i), { seed: i + 17 })),
  HALO_OLS.map((m) => countCarbons(m)),
  ENOLS.map((m) => drawIt(m, { hint: 'Draw the chain, set the double bond, then add the oxygen.' }))
);

export const POOL_U10CP = pool(
  COMPETING.map((m) => writeName(m)),
  COMPETING.map((m, i) => mcNameFrom(m, others(COMPETING, i), { seed: i + 29 })),
  COMPETING.map((m) => countCarbons(m)),
  ENOLS.map((m) => drawIt(m)),
  HALO_OLS.slice(0, 3).map((m) => drawIt(m))
);


// ── Oxygen-containing groups ─────────────────────────────────
// Builders for the four carbonyl families. Each was checked against the engine
// before any lesson was written around it.
const al = (n) => buildTarget([...Cn(n), 'O'], [...chainBonds(n), [n - 1, n, 2]]);
const one = (n, at) => buildTarget([...Cn(n), 'O'], [...chainBonds(n), [at - 1, n, 2]]);
const acid = (n) => buildTarget([...Cn(n), 'O', 'O'], [...chainBonds(n), [n - 1, n, 2], [n - 1, n + 1, 1]]);
const ester = (acyl, alkyl) => {
  const n = acyl + alkyl;
  const bonds = [...chainBonds(acyl), [acyl - 1, n, 2], [acyl - 1, n + 1, 1], [n + 1, acyl, 1]];
  for (let i = acyl; i + 1 < n; i++) bonds.push([i, i + 1, 1]);
  return buildTarget([...Cn(n), 'O', 'O'], bonds);
};

const ALDEHYDES = [al(2), al(3), al(4), al(5), al(6), al(7), al(8), al(9)];
const KETONES = [one(3, 2), one(4, 2), one(5, 2), one(5, 3), one(6, 2), one(6, 3), one(7, 2), one(7, 3), one(7, 4), one(8, 2), one(8, 3)];
const ACIDS = [acid(1), acid(2), acid(3), acid(4), acid(5), acid(6), acid(7), acid(8)];
const ESTERS = [ester(1, 1), ester(2, 1), ester(2, 2), ester(3, 1), ester(3, 2), ester(4, 1), ester(4, 2), ester(5, 1), ester(5, 2), ester(1, 2), ester(2, 3), ester(3, 3)];

const SUB_ALDEHYDES = [
  buildTarget([...Cn(5), 'O'], [...chainBonds(4), [2, 4], [0, 5, 2]]),          // 3-methylbutanal
  buildTarget([...Cn(4), 'O', 'Cl'], [...chainBonds(4), [3, 4, 2], [1, 5]]),    // 3-chlorobutanal
];
const SUB_KETONES = [
  buildTarget([...Cn(6), 'O'], [...chainBonds(5), [3, 5], [1, 6, 2]]),          // 4-methylpentan-2-one
  // A dione needs the multifunctional unit, which comes later; a substituted
  // single ketone tests the same numbering skill without getting ahead.
  buildTarget([...Cn(6), 'O', 'Cl'], [...chainBonds(5), [1, 5, 2], [4, 6, 1]]), // chloro + ketone
];
const SUB_ACIDS = [
  buildTarget([...Cn(4), 'O', 'O'], [...chainBonds(3), [1, 3], [0, 4, 2], [0, 5, 1]]),   // 2-methylpropanoic acid
  buildTarget([...Cn(3), 'O', 'O', 'Cl'], [...chainBonds(3), [0, 3, 2], [0, 4, 1], [2, 5]]), // 3-chloropropanoic acid
];

// Where two oxygen groups compete: the senior one takes the suffix and the
// loser is demoted to hydroxy- or oxo-.
const CARBONYL_PRIORITY = [
  buildTarget([...Cn(4), 'O', 'O', 'O'], [...chainBonds(4), [0, 4, 2], [0, 5, 1], [3, 6, 1]]),  // 4-hydroxybutanoic acid
  buildTarget([...Cn(5), 'O', 'O'], [...chainBonds(5), [1, 5, 2], [4, 6, 1]]),                  // 5-hydroxypentan-2-one
  buildTarget([...Cn(4), 'O', 'O'], [...chainBonds(4), [0, 4, 2], [3, 5, 1]]),                  // 4-hydroxybutanal
  buildTarget([...Cn(5), 'O', 'O', 'O'], [...chainBonds(5), [0, 5, 2], [0, 6, 1], [3, 7, 2]]),  // 4-oxopentanoic acid
  buildTarget([...Cn(4), 'O'], [...chainBonds(4, { 3: 2 }), [0, 4, 2]]),                        // but-3-enal
  buildTarget([...Cn(5), 'O'], [...chainBonds(5, { 4: 2 }), [1, 5, 2]]),                        // pent-4-en-2-one
];

const OXY_ALL = [...ALDEHYDES, ...KETONES, ...ACIDS, ...ESTERS];

// ── Unit 10 · Aldehydes ──────────────────────────────────────
export const POOL_U11L1 = pool(
  concept('u11l1-a', 'identify THE group', 'What is a carbonyl group?',
    ['A carbon double-bonded to oxygen', 'A carbon bonded to -OH', 'A carbon bonded to a halogen'], 0,
    'C=O — a carbon joined to an oxygen by a double bond.',
    ALDEHYDES[0]),
  concept('u11l1-b', 'identify THE group', 'What makes a carbonyl an aldehyde?',
    ['It sits at the end of the chain', 'It sits in the middle of the chain', 'It carries an -OH'], 0,
    'A terminal carbonyl: the carbon carries the C=O and a hydrogen.',
    ALDEHYDES[1]),
  concept('u11l1-c', 'identify THE group', 'Which suffix marks an aldehyde?',
    ['-al', '-one', '-ol'], 0, '-al, replacing the -e of the parent: ethane becomes ethanal.'),
  concept('u11l1-d', 'count THE bonds', 'How many bonds does the carbonyl carbon use on its oxygen?',
    ['1', '2', '3'], 1, 'Two — a double bond. That is why it has only two bonds left over.',
    ALDEHYDES[1], true),
  concept('u11l1-e', 'identify THE group', 'Can an aldehyde ever sit in the middle of a chain?',
    ['Yes', 'No — a middle carbonyl is a ketone', 'Only in a ring'], 1,
    'An aldehyde carbon needs a hydrogen, so it can only sit at the end.'),
  ALDEHYDES.map((m) => countCarbons(m)),
  ALDEHYDES.map((m, i) => mcNameFrom(m, others(ALDEHYDES, i), { seed: i + 3 })),
  ALDEHYDES.map((m) => writeName(m, { hint: 'Count the chain including the carbonyl carbon, then add -al.' })),
  ALDEHYDES.map((m) => countHydrogens(m))
);

export const POOL_U11L2 = pool(
  concept('u11l2-a', 'number THE chain', 'Why does butanal need no locant?',
    ['Aldehydes never take locants', 'The carbonyl can only be at carbon 1, so the number carries no information',
     'The chain is too short'], 1,
    'A terminal group has only one possible position, so no number is written.'),
  concept('u11l2-b', 'number THE chain', 'Which carbon is number 1 in an aldehyde?',
    ['The carbonyl carbon', 'The far end', 'Whichever gives a substituent the lower number'], 0,
    'The principal group takes the lowest locant, and being terminal that is always carbon 1.'),
  concept('u11l2-c', 'identify THE group', 'Is the carbonyl carbon counted in the chain length?',
    ['Yes', 'No', 'Only in ketones'], 0,
    'It is part of the chain: ethanal has two carbons in total, one of them the carbonyl.',
    ALDEHYDES[0], true),
  ALDEHYDES.map((m) => writeName(m)),
  SUB_ALDEHYDES.map((m) => writeName(m, { hint: 'The carbonyl is carbon 1; number the substituent from there.' })),
  ALDEHYDES.map((m, i) => mcNameFrom(m, others(ALDEHYDES, i), { seed: i + 11 })),
  ALDEHYDES.slice(0, 4).map((m) => drawIt(m, { hint: 'Draw the chain, then double-bond an oxygen to the end carbon.' })),
  ALDEHYDES.map((m) => countCarbons(m))
);

export const POOL_U11CP = pool(
  ALDEHYDES.map((m) => writeName(m)),
  SUB_ALDEHYDES.map((m) => writeName(m)),
  ALDEHYDES.map((m, i) => mcNameFrom(m, others(ALDEHYDES, i), { seed: i + 23 })),
  ALDEHYDES.slice(0, 5).map((m) => drawIt(m)),
  ALDEHYDES.map((m) => countCarbons(m)),
  ALDEHYDES.map((m) => countHydrogens(m))
);

// ── Unit 11 · Ketones ────────────────────────────────────────
export const POOL_U12L1 = pool(
  concept('u12l1-a', 'identify THE group', 'What makes a carbonyl a ketone?',
    ['It sits at the end of the chain', 'It sits between two carbons', 'It carries an -OH'], 1,
    'A carbonyl with a carbon on each side. At the end it would be an aldehyde.',
    KETONES[0]),
  concept('u12l1-b', 'identify THE group', 'Which suffix marks a ketone?',
    ['-al', '-one', '-oic acid'], 1, '-one, with a locant for the carbonyl carbon.'),
  concept('u12l1-c', 'identify THE group', 'Why is there no two-carbon ketone?',
    ['Two carbons cannot form a C=O', 'A carbonyl needs a carbon on each side, so the chain needs at least three',
     'It would be a gas'], 1,
    'With two carbons the carbonyl must be terminal, which makes it an aldehyde. The smallest ketone is propan-2-one.',
    KETONES[0]),
  concept('u12l1-d', 'identify THE group', 'Are an aldehyde and a ketone with the same formula the same compound?',
    ['Yes, the formula decides', 'No — the carbonyl is in a different place', 'Only if the chain is short'], 1,
    'Propanal and propan-2-one are both C3H6O, but the carbonyl sits at the end in one and the middle in the other.'),
  KETONES.map((m) => countCarbons(m)),
  KETONES.map((m, i) => mcNameFrom(m, others(KETONES, i), { seed: i + 5 })),
  KETONES.map((m) => writeName(m, { hint: 'Number so the carbonyl gets the lowest locant.' }))
);

export const POOL_U12L2 = pool(
  concept('u12l2-a', 'number THE chain', 'Why does a ketone need a locant when an aldehyde does not?',
    ['Ketones are longer', 'A middle carbonyl can sit in more than one place', 'It is only a convention'], 1,
    'pentan-2-one and pentan-3-one are different compounds, so the number is doing real work.'),
  concept('u12l2-b', 'number THE chain', 'Why is "pentan-4-one" never correct?',
    ['Pentane has only four carbons', 'Numbered from the other end it is pentan-2-one',
     'Carbonyls cannot sit on carbon 4'], 1,
    'The carbonyl takes the lower locant, so 4 becomes 2.'),
  concept('u12l2-c', 'number THE chain', 'Does propan-2-one need its number?',
    ['Yes, always write it', 'The carbonyl can only be at carbon 2, but the number is written anyway',
     'No, it is never written'], 1,
    'With three carbons there is only one possible position, but modern style writes the locant regardless.'),
  KETONES.map((m) => writeName(m)),
  SUB_KETONES.map((m) => writeName(m, { hint: 'The carbonyl takes the lowest locant; number substituents around it.' })),
  KETONES.map((m, i) => mcNameFrom(m, others(KETONES, i), { seed: i + 13 })),
  KETONES.slice(0, 5).map((m) => drawIt(m, { hint: 'Draw the chain, then double-bond an oxygen to the right carbon.' })),
  KETONES.map((m) => countCarbons(m))
);

export const POOL_U12CP = pool(
  KETONES.map((m) => writeName(m)),
  SUB_KETONES.map((m) => writeName(m)),
  KETONES.map((m, i) => mcNameFrom(m, others(KETONES, i), { seed: i + 31 })),
  [...ALDEHYDES.slice(0, 3), ...KETONES.slice(0, 3)].map((m, i, arr) => mcNameFrom(m, others(arr, i), { seed: i + 37 })),
  KETONES.slice(0, 5).map((m) => drawIt(m)),
  KETONES.map((m) => countCarbons(m))
);

// ── Unit 12 · Carboxylic acids ───────────────────────────────
export const POOL_U13L1 = pool(
  concept('u13l1-a', 'identify THE group', 'What is a carboxyl group?',
    ['C=O and -OH on the same carbon', 'Two -OH groups on one carbon', 'A carbonyl in the middle of a chain'], 0,
    '-COOH: a carbonyl and a hydroxyl sharing one carbon.',
    ACIDS[1]),
  concept('u13l1-b', 'identify THE group', 'Which suffix marks a carboxylic acid?',
    ['-al', '-one', '-oic acid'], 2, '-oic acid, written as two words: ethanoic acid.'),
  concept('u13l1-c', 'identify THE group', 'Where must a carboxyl group sit?',
    ['At the end of the chain', 'In the middle', 'Anywhere'], 0,
    'The carboxyl carbon already has three bonds spoken for, so it can only sit at an end.',
    ACIDS[2]),
  concept('u13l1-d', 'identify THE group', 'Is a carboxylic acid more senior than an alcohol?',
    ['Yes — it is near the top of the ladder', 'No', 'They rank equally'], 0,
    'The acid takes the suffix; an alcohol present alongside it is demoted to hydroxy-.'),
  concept('u13l1-e', 'identify THE group', 'How many oxygens does a carboxyl group contain?',
    ['1', '2', '3'], 1, 'Two: one double-bonded, one in the -OH.',
    ACIDS[1], true),
  ACIDS.map((m) => countCarbons(m)),
  ACIDS.map((m, i) => mcNameFrom(m, others(ACIDS, i), { seed: i + 7 })),
  ACIDS.map((m) => writeName(m, { hint: 'Count the chain including the carboxyl carbon, then add -oic acid.' })),
  ACIDS.map((m) => mcFormula(m, { seed: 3 }))
);

export const POOL_U13L2 = pool(
  concept('u13l2-a', 'number THE chain', 'Which carbon is number 1 in a carboxylic acid?',
    ['The carboxyl carbon', 'The far end', 'Either'], 0,
    'The most senior group takes carbon 1, and the carboxyl is the most senior group you have met.'),
  concept('u13l2-b', 'number THE chain', 'Why does ethanoic acid need no locant?',
    ['Acids never take locants', 'The carboxyl can only be at carbon 1', 'The chain is too short to number'], 1,
    'Being terminal it has one possible position, so no number is written.'),
  concept('u13l2-c', 'identify THE group', 'A molecule has both a carboxyl and a hydroxyl. Which takes the suffix?',
    ['The carboxyl', 'The hydroxyl', 'Whichever has the lower locant'], 0,
    'The acid outranks the alcohol, so the alcohol is demoted to the prefix hydroxy-.',
    CARBONYL_PRIORITY[0]),
  ACIDS.map((m) => writeName(m)),
  ACIDS.map((m) => countCarbons(m)),
  SUB_ACIDS.map((m) => writeName(m, { hint: 'The carboxyl carbon is number 1.' })),
  ACIDS.map((m, i) => mcNameFrom(m, others(ACIDS, i), { seed: i + 17 })),
  ACIDS.slice(0, 4).map((m) => drawIt(m, { hint: 'Draw the chain, then add both oxygens to the end carbon.' })),
  ACIDS.map((m) => countCarbons(m))
);

export const POOL_U13CP = pool(
  ACIDS.map((m) => writeName(m)),
  SUB_ACIDS.map((m) => writeName(m)),
  ACIDS.map((m, i) => mcNameFrom(m, others(ACIDS, i), { seed: i + 41 })),
  ACIDS.slice(0, 4).map((m) => drawIt(m)),
  ACIDS.map((m) => countCarbons(m)),
  ACIDS.map((m) => countHydrogens(m)),
  CARBONYL_PRIORITY.slice(0, 4).map((m) => writeName(m))
);

// ── Unit 13 · Esters ─────────────────────────────────────────
export const POOL_U14L1 = pool(
  concept('u14l1-a', 'identify THE group', 'What is an ester group?',
    ['A carbonyl with an -O- bridging to another carbon', 'A carbonyl with an -OH', 'Two carbonyls in a row'], 0,
    '-COO-: the acid\'s -OH replaced by a chain.',
    ESTERS[1]),
  concept('u14l1-b', 'identify THE group', 'An ester name is written as…',
    ['one word', 'two words', 'three words'], 1,
    'Two words: the alkyl half first, then the acyl half — methyl ethanoate.'),
  concept('u14l1-c', 'identify THE group', 'In methyl ethanoate, which half came from the acid?',
    ['methyl', 'ethanoate', 'neither — both came from the alcohol'], 1,
    'The -oate half is the acid; the alkyl half named first came from the alcohol.',
    ESTERS[1]),
  concept('u14l1-d', 'identify THE group', 'Which suffix marks an ester?',
    ['-oic acid', '-oate', '-one'], 1, '-oate, replacing the -oic acid of the parent acid.'),
  concept('u14l1-e', 'identify THE group', 'Is methyl ethanoate the same as ethyl methanoate?',
    ['Yes, same atoms', 'No — the two halves are swapped', 'Only in solution'], 1,
    'They contain the same atoms but joined differently, which is the commonest trap in ester naming.'),
  ESTERS.map((m) => countCarbons(m)),
  ESTERS.map((m, i) => mcNameFrom(m, others(ESTERS, i), { seed: i + 9 })),
  ESTERS.map((m) => writeName(m, { hint: 'Alkyl half first, then the acyl half as -oate.' }))
);

export const POOL_U14L2 = pool(
  concept('u14l2-a', 'identify THE group', 'Which half of an ester name is written first?',
    ['The half from the alcohol', 'The half from the acid', 'The longer half'], 0,
    'The alkyl group from the alcohol comes first: ethyl ethanoate.'),
  concept('u14l2-b', 'identify THE group', 'Which carbon does the -oate half count from?',
    ['The carbonyl carbon', 'The bridging oxygen', 'The far end'], 0,
    'The acyl chain is counted from its carbonyl carbon, exactly as an acid is.'),
  concept('u14l2-c', 'identify THE group', 'How would you make an ester from ethanoic acid and methanol?',
    ['methyl ethanoate', 'ethyl methanoate', 'methanoic ethanoate'], 0,
    'The acid gives the -oate half and the alcohol gives the alkyl half.'),
  ESTERS.map((m) => writeName(m)),
  ESTERS.map((m, i) => mcNameFrom(m, others(ESTERS, i), { seed: i + 19 })),
  ESTERS.slice(0, 5).map((m) => drawIt(m, { hint: 'Draw the acyl chain, add the carbonyl, then bridge an oxygen to the second chain.' })),
  ESTERS.map((m) => countCarbons(m))
);

export const POOL_U14CP = pool(
  ESTERS.map((m) => writeName(m)),
  ESTERS.map((m, i) => mcNameFrom(m, others(ESTERS, i), { seed: i + 43 })),
  ESTERS.slice(0, 5).map((m) => drawIt(m)),
  ESTERS.map((m) => countCarbons(m)),
  OXY_ALL.slice(0, 12).map((m, i, arr) => mcNameFrom(m, others(arr, i), { seed: i + 47 }))
);


// ── Demotion and discrimination ──────────────────────────────
// Two ideas that only make sense once a family has been met: what happens to
// it when something more senior is present, and how to tell it apart from the
// families that look like it on the page.
const HYDROXY_ALDEHYDES = [
  buildTarget([...Cn(3), 'O', 'O'], [...chainBonds(3), [0, 3, 2], [2, 4, 1]]),   // 3-hydroxypropanal
  buildTarget([...Cn(4), 'O', 'O'], [...chainBonds(4), [0, 4, 2], [3, 5, 1]]),   // 4-hydroxybutanal
  buildTarget([...Cn(5), 'O', 'O'], [...chainBonds(5), [0, 5, 2], [4, 6, 1]]),   // 5-hydroxypentanal
];
const HYDROXY_KETONES = [
  buildTarget([...Cn(5), 'O', 'O'], [...chainBonds(5), [1, 5, 2], [4, 6, 1]]),   // 5-hydroxypentan-2-one
  buildTarget([...Cn(6), 'O', 'O'], [...chainBonds(6), [1, 6, 2], [5, 7, 1]]),   // 6-hydroxyhexan-2-one
];
const OXO_ALDEHYDES = [
  buildTarget([...Cn(5), 'O', 'O'], [...chainBonds(5), [0, 5, 2], [3, 6, 2]]),   // 4-oxopentanal
  buildTarget([...Cn(6), 'O', 'O'], [...chainBonds(6), [0, 6, 2], [4, 7, 2]]),   // 5-oxohexanal
];
const DEMOTED = [...HYDROXY_ALDEHYDES, ...HYDROXY_KETONES, ...OXO_ALDEHYDES, ...CARBONYL_PRIORITY];

// Same formula, different family — the discrimination that exams test.
const C3H6O_SET = [
  buildTarget([...Cn(3), 'O'], [...chainBonds(3), [2, 3, 2]]),          // propanal
  buildTarget([...Cn(3), 'O'], [...chainBonds(3), [1, 3, 2]]),          // propan-2-one
  buildTarget([...Cn(3), 'O'], [...chainBonds(3, { 1: 2 }), [2, 3, 1]]), // prop-2-en-1-ol
];
const C2H4O2_SET = [
  buildTarget([...Cn(2), 'O', 'O'], [...chainBonds(2), [1, 2, 2], [1, 3, 1]]),  // ethanoic acid
  buildTarget([...Cn(2), 'O', 'O'], [[0, 2, 2], [0, 3, 1], [3, 1, 1]]),         // methyl methanoate
];
const FAMILY_MIX = [...ALDEHYDES.slice(0, 4), ...KETONES.slice(0, 4), ...ACIDS.slice(1, 5), ...ESTERS.slice(0, 4)];

// ── Aldehydes: telling apart, and being outranked ────────────
export const POOL_U11L3 = pool(
  concept('u11l3-a', 'IDENTIFY THE MOLECULE TYPE', 'What tells an aldehyde apart from an alcohol?',
    ['The aldehyde has a double bond to oxygen', 'The alcohol has more carbons',
     'They are the same thing'], 0,
    'An alcohol has C-O-H with single bonds; an aldehyde has C=O.',
    ALDEHYDES[0]),
  concept('u11l3-b', 'IDENTIFY THE MOLECULE TYPE', 'Which of these is an aldehyde?',
    ['CH3-CH2-OH', 'CH3-CHO', 'CH3-O-CH3'], 1, 'CHO at the end of a chain is the aldehyde group.'),
  concept('u11l3-c', 'IDENTIFY THE MOLECULE TYPE', 'This structure is an…',
    ['alcohol', 'aldehyde', 'alkene'], 1, 'A double bond from carbon to oxygen at the end of the chain.',
    ALDEHYDES[2]),
  concept('u11l3-d', 'IDENTIFY THE MOLECULE TYPE', 'How many oxygens does an aldehyde group contain?',
    ['1', '2', '3'], 0, 'One, double-bonded to the carbonyl carbon.',
    ALDEHYDES[1], true),
  concept('u11l3-e', 'IDENTIFY THE MOLECULE TYPE', 'Propanal and propan-1-ol both have three carbons and one oxygen. What differs?',
    ['The number of hydrogens and how the oxygen is bonded', 'Nothing', 'The chain length'], 0,
    'The aldehyde is C3H6O with a double bond; the alcohol is C3H8O with two single bonds.'),
  ALDEHYDES.map((m, i) => mcNameFrom(m, others(ALDEHYDES, i), { seed: i + 51 })),
  C3H6O_SET.map((m, i) => mcNameFrom(m, others(C3H6O_SET, i), { seed: i + 53 })),
  ALDEHYDES.map((m) => writeName(m)),
  ALDEHYDES.map((m) => countCarbons(m)),
  ALDEHYDES.slice(0, 4).map((m) => mcFormula(m, { seed: 7 }))
);

export const POOL_U11L4 = pool(
  concept('u11l4-a', 'identify THE group', 'An aldehyde and an alcohol share a molecule. Which takes the suffix?',
    ['The aldehyde', 'The alcohol', 'Whichever has the lower locant'], 0,
    'The aldehyde is more senior, so the alcohol is demoted to the prefix hydroxy-.',
    HYDROXY_ALDEHYDES[1]),
  concept('u11l4-b', 'identify THE group', 'What does a demoted alcohol become?',
    ['oxo-', 'hydroxy-', 'alkoxy-'], 1, 'hydroxy-, cited in front with a locant.'),
  concept('u11l4-c', 'number THE chain', 'In 4-hydroxybutanal, which carbon is number 1?',
    ['The carbonyl carbon', 'The carbon carrying the OH', 'Either end'], 0,
    'The aldehyde is the principal group, so it takes carbon 1 and the hydroxyl is numbered from there.',
    HYDROXY_ALDEHYDES[1]),
  concept('u11l4-d', 'identify THE group', 'Does a demoted group disappear from the name?',
    ['Yes', 'No — it becomes a prefix', 'Only if there are two of them'], 1,
    'Both groups are always reported. Only their position in the name changes.'),
  HYDROXY_ALDEHYDES.map((m) => writeName(m, { hint: 'The aldehyde is senior: carbon 1, and -al. The alcohol becomes hydroxy-.' })),
  HYDROXY_ALDEHYDES.map((m, i) => mcNameFrom(m, [...others(HYDROXY_ALDEHYDES, i), ...ALDEHYDES.slice(0, 3)], { seed: i + 57 })),
  ALDEHYDES.map((m) => writeName(m)),
  HYDROXY_ALDEHYDES.map((m) => countCarbons(m)),
  ALDEHYDES.map((m, i) => mcNameFrom(m, others(ALDEHYDES, i), { seed: i + 59 })),
  ALDEHYDES.slice(0, 4).map((m) => drawIt(m))
);

// ── Ketones: telling apart, and being outranked ──────────────
export const POOL_U12L3 = pool(
  concept('u12l3-a', 'IDENTIFY THE MOLECULE TYPE', 'What tells a ketone apart from an aldehyde?',
    ['Where the carbonyl sits', 'The number of oxygens', 'The chain length'], 0,
    'End of the chain is an aldehyde; between two carbons is a ketone. Same group, different place.'),
  concept('u12l3-b', 'IDENTIFY THE MOLECULE TYPE', 'This structure is an…',
    ['aldehyde', 'ketone', 'alcohol'], 1, 'The carbonyl has a carbon on each side.',
    KETONES[1]),
  concept('u12l3-c', 'IDENTIFY THE MOLECULE TYPE', 'This structure is an…',
    ['aldehyde', 'ketone', 'carboxylic acid'], 0, 'The carbonyl is at the end of the chain.',
    ALDEHYDES[2]),
  concept('u12l3-d', 'IDENTIFY THE MOLECULE TYPE', 'Propanal and propan-2-one are both C3H6O. How do you tell them apart?',
    ['Count the carbons', 'Look at where the C=O sits', 'Count the oxygens'], 1,
    'Same atoms, different arrangement: end of the chain versus the middle.'),
  concept('u12l3-e', 'IDENTIFY THE MOLECULE TYPE', 'Which cannot exist?',
    ['propan-2-one', 'ethan-1-one', 'butan-2-one'], 1,
    'A two-carbon chain cannot hold a carbonyl in the middle, so there is no ethanone — it would be ethanal.'),
  C3H6O_SET.map((m, i) => mcNameFrom(m, others(C3H6O_SET, i), { seed: i + 61 })),
  [...ALDEHYDES.slice(0, 4), ...KETONES.slice(0, 4)].map((m, i, arr) => mcNameFrom(m, others(arr, i), { seed: i + 63 })),
  KETONES.map((m) => writeName(m)),
  KETONES.map((m) => countCarbons(m)),
  ALDEHYDES.slice(0, 4).map((m) => writeName(m))
);

export const POOL_U12L4 = pool(
  concept('u12l4-a', 'identify THE group', 'A ketone and an alcohol share a molecule. Which takes the suffix?',
    ['The ketone', 'The alcohol', 'Neither'], 0,
    'The ketone is more senior, so the alcohol becomes hydroxy-.',
    HYDROXY_KETONES[0]),
  concept('u12l4-b', 'identify THE group', 'An aldehyde and a ketone share a molecule. Which takes the suffix?',
    ['The aldehyde', 'The ketone', 'Whichever comes first'], 0,
    'The aldehyde outranks the ketone, so the ketone is demoted to oxo-.',
    OXO_ALDEHYDES[0]),
  concept('u12l4-c', 'identify THE group', 'What does a demoted carbonyl become?',
    ['hydroxy-', 'oxo-', 'carbonyl-'], 1, 'oxo-, with a locant: 4-oxopentanal.'),
  concept('u12l4-d', 'number THE chain', 'In 5-hydroxypentan-2-one, which group set the numbering?',
    ['The ketone', 'The alcohol', 'Neither'], 0,
    'The ketone is senior, so it takes the lowest locant it can and the hydroxyl is numbered around it.',
    HYDROXY_KETONES[0]),
  HYDROXY_KETONES.map((m) => writeName(m, { hint: 'The ketone is senior; the alcohol becomes hydroxy-.' })),
  OXO_ALDEHYDES.map((m) => writeName(m, { hint: 'The aldehyde is senior; the ketone becomes oxo-.' })),
  DEMOTED.map((m, i) => mcNameFrom(m, others(DEMOTED, i), { seed: i + 67 })),
  KETONES.map((m) => writeName(m)),
  KETONES.map((m) => countCarbons(m)),
  HYDROXY_KETONES.map((m) => countCarbons(m))
);

// ── Acids: telling apart, and what they demote ───────────────
export const POOL_U13L3 = pool(
  concept('u13l3-a', 'IDENTIFY THE MOLECULE TYPE', 'What tells a carboxylic acid apart from an aldehyde?',
    ['The acid has two oxygens on that carbon', 'The acid has more carbons', 'Nothing'], 0,
    'An aldehyde carbon carries C=O and an H; an acid carbon carries C=O and an -OH.'),
  concept('u13l3-b', 'IDENTIFY THE MOLECULE TYPE', 'This structure is a…',
    ['aldehyde', 'carboxylic acid', 'ketone'], 1, 'Two oxygens on the end carbon: a carboxyl group.',
    ACIDS[2]),
  concept('u13l3-c', 'IDENTIFY THE MOLECULE TYPE', 'Which has the formula C2H4O2?',
    ['ethanal', 'ethanoic acid', 'ethanol'], 1, 'Two oxygens gives O2. Ethanal is C2H4O.'),
  concept('u13l3-d', 'IDENTIFY THE MOLECULE TYPE', 'What tells a carboxylic acid apart from a ketone?',
    ['The acid has two oxygens; the ketone has one', 'The ketone has more carbons', 'Nothing'], 0,
    'A ketone carbonyl carries one oxygen and a carbon on each side; a carboxyl carries two oxygens at the end.'),
  concept('u13l3-e', 'IDENTIFY THE MOLECULE TYPE', 'Ethanoic acid and ethanal differ by…',
    ['one oxygen', 'one carbon', 'nothing'], 0,
    'C2H4O2 against C2H4O. The acid carries an -OH where the aldehyde carries a hydrogen.'),
  // esters are not taught until the next unit, so the comparison set here is
  // aldehyde/ketone/acid only
  [...ALDEHYDES.slice(0, 4), ...KETONES.slice(0, 4), ...ACIDS.slice(0, 4)]
    .map((m, i, arr) => mcNameFrom(m, others(arr, i), { seed: i + 73 })),
  ACIDS.map((m) => writeName(m)),
  ACIDS.map((m) => countCarbons(m)),
  ACIDS.slice(0, 4).map((m) => mcFormula(m, { seed: 11 }))
);

export const POOL_U13L4 = pool(
  concept('u13l4-a', 'identify THE group', 'A carboxylic acid and a ketone share a molecule. Which takes the suffix?',
    ['The acid', 'The ketone', 'Whichever has the lower locant'], 0,
    'The acid is the most senior group here, so the ketone is demoted to oxo-.',
    CARBONYL_PRIORITY[3]),
  concept('u13l4-b', 'identify THE group', 'Which of these can a carboxylic acid be demoted BY?',
    ['An alcohol', 'A ketone', 'Nothing you have met'], 2,
    'The acid is the most senior group in this course, so it always takes the suffix.'),
  concept('u13l4-c', 'identify THE group', 'In 4-hydroxybutanoic acid, what does hydroxy- tell you?',
    ['There is an alcohol at carbon 4 that lost to the acid', 'The acid is at carbon 4',
     'There are two acids'], 0,
    'The alcohol is still reported — as a prefix, because the acid took the suffix.',
    CARBONYL_PRIORITY[0]),
  concept('u13l4-d', 'identify THE group', 'Order these from most to least senior.',
    ['acid, aldehyde, ketone, alcohol', 'alcohol, ketone, aldehyde, acid',
     'ketone, acid, alcohol, aldehyde'], 0,
    'The acid takes the suffix over all of them; the alcohol loses to all of them.'),
  DEMOTED.map((m) => writeName(m, { hint: 'Find the senior group: it takes the suffix and the lowest locant.' })),
  DEMOTED.map((m, i) => mcNameFrom(m, others(DEMOTED, i), { seed: i + 79 })),
  ACIDS.map((m) => writeName(m)),
  DEMOTED.map((m) => countCarbons(m)),
  ACIDS.slice(0, 4).map((m) => drawIt(m))
);

// ── Esters: telling apart, and reading any carbonyl name ─────
export const POOL_U14L3 = pool(
  concept('u14l3-a', 'IDENTIFY THE MOLECULE TYPE', 'How do you spot an ester in a structure?',
    ['A carbonyl whose second oxygen leads to another carbon chain',
     'Any molecule with two oxygens', 'A carbonyl at the end of a chain'], 0,
    'The bridging oxygen with a carbon on the far side is what makes it an ester rather than an acid.',
    ESTERS[1]),
  concept('u14l3-b', 'IDENTIFY THE MOLECULE TYPE', 'This structure is a…',
    ['carboxylic acid', 'ester', 'ketone'], 1, 'The second oxygen leads to a carbon chain, not a hydrogen.',
    ESTERS[2]),
  concept('u14l3-c', 'IDENTIFY THE MOLECULE TYPE', 'This structure is a…',
    ['carboxylic acid', 'ester', 'aldehyde'], 0, 'The second oxygen carries a hydrogen, so it is an acid.',
    ACIDS[3]),
  concept('u14l3-d', 'IDENTIFY THE MOLECULE TYPE', 'Which family has one oxygen?',
    ['aldehyde and ketone', 'acid and ester', 'all of them'], 0,
    'Aldehydes and ketones have a single carbonyl oxygen; acids and esters have two.'),
  concept('u14l3-e', 'IDENTIFY THE MOLECULE TYPE', 'A carbonyl in the middle of a chain with no other oxygen is a…',
    ['ketone', 'ester', 'acid'], 0, 'One oxygen, carbon on each side: a ketone.',
    KETONES[2]),
  concept('u14l3-f', 'IDENTIFY THE MOLECULE TYPE', 'How many words does an ester name have?',
    ['One', 'Two', 'Three'], 1, 'Two: the alkyl half, then the acyl half as -oate.'),
  FAMILY_MIX.map((m, i) => mcNameFrom(m, others(FAMILY_MIX, i), { seed: i + 83 })),
  ESTERS.map((m) => writeName(m)),
  C2H4O2_SET.map((m, i) => mcNameFrom(m, others(C2H4O2_SET, i), { seed: i + 87 })),
  ESTERS.map((m) => countCarbons(m))
);

export const POOL_U14L4 = pool(
  concept('u14l4-a', 'identify THE group', 'Reading any carbonyl name: what does the ending tell you?',
    ['The family', 'The chain length', 'The number of oxygens'], 0,
    '-al, -one, -oic acid and -oate each name a different family.'),
  concept('u14l4-b', 'identify THE group', 'What does "3-oxobutanoate" tell you is present?',
    ['An ester and a ketone', 'Two esters', 'An acid and an alcohol'], 0,
    '-oate is the ester, and oxo- is a demoted carbonyl: a ketone at carbon 3.'),
  concept('u14l4-c', 'identify THE group', 'A name ends in -oate. Which family is it?',
    ['carboxylic acid', 'ester', 'ketone'], 1, '-oate is the ester ending; -oic acid is the acid.'),
  concept('u14l4-d', 'identify THE group', 'A name contains both hydroxy- and -al. What is present?',
    ['An alcohol and an aldehyde, with the aldehyde senior',
     'Two alcohols', 'An aldehyde only'], 0,
    'The suffix names the senior group; every prefix names something that lost to it.'),
  FAMILY_MIX.map((m) => writeName(m)),
  DEMOTED.map((m) => writeName(m)),
  ESTERS.map((m, i) => mcNameFrom(m, others(ESTERS, i), { seed: i + 89 })),
  ESTERS.slice(0, 5).map((m) => drawIt(m)),
  FAMILY_MIX.map((m) => countCarbons(m))
);


// ── Units 4 and 5: the lessons that had no pool ──────────────
// These shipped with teaching but nothing to practise on. Locants and multiple
// substituents are exactly where marks are lost, so they need real drilling.
const LOCANT_SET = [
  branchedChain(5, [{ at: 2, size: 1 }]),
  branchedChain(6, [{ at: 2, size: 1 }]),
  branchedChain(6, [{ at: 3, size: 1 }]),
  branchedChain(7, [{ at: 2, size: 1 }]),
  branchedChain(7, [{ at: 3, size: 1 }]),
  branchedChain(7, [{ at: 4, size: 1 }]),
  branchedChain(8, [{ at: 3, size: 1 }]),
  branchedChain(6, [{ at: 3, size: 2 }]),
  branchedChain(7, [{ at: 3, size: 2 }]),
];

const MULTI_SET = [
  branchedChain(4, [{ at: 2, size: 1 }, { at: 3, size: 1 }]),
  branchedChain(5, [{ at: 2, size: 1 }, { at: 3, size: 1 }]),
  branchedChain(5, [{ at: 2, size: 1 }, { at: 4, size: 1 }]),
  branchedChain(6, [{ at: 2, size: 1 }, { at: 4, size: 1 }]),
  branchedChain(6, [{ at: 2, size: 1 }, { at: 5, size: 1 }]),
  branchedChain(6, [{ at: 3, size: 1 }, { at: 4, size: 1 }]),
  branchedChain(7, [{ at: 2, size: 1 }, { at: 5, size: 1 }]),
  branchedChain(6, [{ at: 3, size: 2 }, { at: 2, size: 1 }]),
  branchedChain(7, [{ at: 3, size: 2 }, { at: 5, size: 1 }]),
];

export const POOL_U5L1 = pool(
  concept('u5l1-a', 'number THE chain', 'From which end is a chain numbered?',
    ['From the left', 'From the end that gives the substituent the lower number', 'From the longer side'], 1,
    'The lowest locant wins, whichever end that means counting from.'),
  concept('u5l1-b', 'number THE chain', 'Why is 4-methylpentane never a correct name?',
    ['Pentane cannot carry a methyl', 'Counted from the other end it is 2-methylpentane',
     'Methyls cannot sit on carbon 4'], 1,
    'The same molecule numbered the other way gives 2, and the lower number is compulsory.'),
  concept('u5l1-c', 'number THE chain', 'A methyl sits three carbons from one end and four from the other. Which number is used?',
    ['3', '4', 'either'], 0, 'Always the lower.'),
  concept('u5l1-d', 'number THE chain', 'What separates a number from a word in a name?',
    ['A comma', 'A hyphen', 'A space'], 1, '2-methylbutane: hyphen between number and word, commas only between numbers.'),
  concept('u5l1-e', 'number THE chain', 'When both directions give the same locant, what does that mean?',
    ['The name is ambiguous', 'The molecule is symmetrical about that point', 'You must pick the left'], 1,
    'Both ways describe the same molecule, so either is right — 3-methylpentane counts 3 from both ends.'),
  LOCANT_SET.map((m) => writeName(m, { hint: 'Number from the end nearer the branch.' })),
  LOCANT_SET.map((m, i) => mcNameFrom(m, others(LOCANT_SET, i), { seed: i + 91 })),
  LOCANT_SET.map((m) => countCarbons(m)),
  LOCANT_SET.slice(0, 4).map((m) => drawIt(m))
);

export const POOL_U5L2 = pool(
  LOCANT_SET.map((m) => writeName(m)),
  LOCANT_SET.map((m, i) => mcNameFrom(m, others(LOCANT_SET, i), { seed: i + 97 })),
  LOCANT_SET.map((m) => drawIt(m, { hint: 'Draw the parent chain, then count to the locant.' })),
  LOCANT_SET.map((m) => countCarbons(m)),
  MULTI_SET.slice(0, 4).map((m) => countCarbons(m))
);

export const POOL_U6L1 = pool(
  concept('u6l1-a', 'identify THE group', 'Two methyl groups on one chain are written…',
    ['methylmethyl', 'dimethyl', 'methyl2'], 1, 'di- for two, tri- for three, tetra- for four.'),
  concept('u6l1-b', 'number THE chain', 'Does each substituent need its own number?',
    ['Yes, always', 'Only the first', 'Only if they differ'], 0,
    '2,3-dimethylbutane: a locant for every group, even when they repeat.'),
  concept('u6l1-c', 'identify THE group', 'Three methyls would be…',
    ['dimethyl', 'trimethyl', 'tetramethyl'], 1, 'tri- for three.'),
  concept('u6l1-d', 'number THE chain', 'What separates two numbers in a name?',
    ['A hyphen', 'A comma', 'A space'], 1, '2,3-dimethylbutane: commas between numbers, a hyphen before the word.'),
  concept('u6l1-e', 'identify THE group', 'Does di- count towards alphabetical order?',
    ['Yes', 'No — alphabetise by the substituent name itself', 'Only when there are three or more'], 1,
    'dimethyl alphabetises under m, not d. The multiplying prefix is ignored.'),
  MULTI_SET.map((m) => writeName(m, { hint: 'Every group gets a locant; commas between the numbers.' })),
  MULTI_SET.map((m, i) => mcNameFrom(m, others(MULTI_SET, i), { seed: i + 101 })),
  MULTI_SET.map((m) => countCarbons(m)),
  LOCANT_SET.slice(0, 4).map((m) => writeName(m))
);

export const POOL_U6L2 = pool(
  concept('u6l2-a', 'identify THE group', 'Two different substituents are listed…',
    ['by size', 'alphabetically', 'by locant'], 1, 'Alphabetically: ethyl before methyl.'),
  concept('u6l2-b', 'identify THE group', 'Which is cited first, ethyl or methyl?',
    ['ethyl', 'methyl', 'whichever has the lower number'], 0, 'e comes before m.'),
  concept('u6l2-c', 'identify THE group', 'In 3-ethyl-2-methylpentane, why is ethyl first despite the higher number?',
    ['Because it is longer', 'Because substituents are cited alphabetically, not by locant',
     'It is a mistake'], 1,
    'Alphabetical order decides the citation; the numbers come from wherever the groups sit.'),
  concept('u6l2-d', 'number THE chain', 'When two substituents differ, which gets the lower locant?',
    ['The one first alphabetically', 'Whichever comes out lower from the better numbering direction',
     'Always the methyl'], 1,
    'Numbering serves the lowest set of locants overall; alphabetical order only decides the order they are written in.'),
  MULTI_SET.map((m) => writeName(m)),
  MULTI_SET.map((m, i) => mcNameFrom(m, others(MULTI_SET, i), { seed: i + 103 })),
  MULTI_SET.map((m) => drawIt(m, { hint: 'Parent chain first, then place each branch at its number.' })),
  MULTI_SET.map((m) => countCarbons(m)),
  LOCANT_SET.slice(0, 5).map((m) => writeName(m))
);


// ── Nitrogen families ────────────────────────────────────────
const amine = (n, at) => buildTarget([...Cn(n), 'N'], [...chainBonds(n), [at - 1, n]]);
const amide = (n) => buildTarget([...Cn(n), 'O', 'N'], [...chainBonds(n), [n - 1, n, 2], [n - 1, n + 1, 1]]);
const nitrile = (n) => buildTarget([...Cn(n), 'N'], [...chainBonds(n), [n - 1, n, 3]]);

const AMINES = [
  amine(1, 1), amine(2, 1), amine(3, 1), amine(4, 1), amine(5, 1), amine(6, 1),
  amine(4, 2), amine(5, 2), amine(5, 3), amine(6, 2), amine(6, 3),
];
const AMIDES = [amide(1), amide(2), amide(3), amide(4), amide(5), amide(6)];
const NITRILES = [nitrile(2), nitrile(3), nitrile(4), nitrile(5), nitrile(6), nitrile(7)];

const SUB_AMINES = [
  buildTarget([...Cn(4), 'N', 'Cl'], [...chainBonds(4), [0, 4], [3, 5]]),          // 4-chlorobutan-1-amine
  buildTarget([...Cn(5), 'N'], [...chainBonds(4), [2, 4], [0, 5]]),                // 3-methylbutan-1-amine
  buildTarget([...Cn(4), 'N', 'N'], [...chainBonds(4), [0, 4], [3, 5]]),           // butane-1,4-diamine
  buildTarget([...Cn(4), 'N'], [...chainBonds(4, { 3: 2 }), [0, 4]]),              // but-3-en-1-amine
];
const AMINO_ALCOHOLS = [
  buildTarget([...Cn(3), 'N', 'O'], [...chainBonds(3), [0, 3], [2, 4]]),           // 3-aminopropan-1-ol
  buildTarget([...Cn(4), 'N', 'O'], [...chainBonds(4), [0, 4], [3, 5]]),           // 4-aminobutan-1-ol
];
const AMINO_ACIDS = [
  buildTarget([...Cn(2), 'O', 'O', 'N'], [...chainBonds(2), [1, 2, 2], [1, 3, 1], [0, 4, 1]]),   // 2-aminoethanoic acid
  buildTarget([...Cn(3), 'O', 'O', 'N'], [...chainBonds(3), [2, 3, 2], [2, 4, 1], [1, 5, 1]]),   // 2-aminopropanoic acid
  buildTarget([...Cn(3), 'O', 'O', 'N'], [...chainBonds(3), [0, 3, 2], [0, 4, 1], [2, 5, 1]]),   // 3-aminopropanoic acid
];
const SUB_AMIDES = [
  buildTarget([...Cn(3), 'O', 'N', 'Cl'], [...chainBonds(3), [0, 3, 2], [0, 4, 1], [2, 5, 1]]),  // 3-chloropropanamide
];
const SUB_NITRILES = [
  buildTarget([...Cn(5), 'N'], [...chainBonds(4), [2, 4], [0, 5, 3]]),             // 3-methylbutanenitrile
];
const N_ALL = [...AMINES, ...AMIDES, ...NITRILES];

// ── Unit 14 · Amines ─────────────────────────────────────────
export const POOL_U15L1 = pool(
  concept('u15l1-a', 'identify THE group', 'What is an amine?',
    ['A nitrogen bonded to a carbon chain', 'A nitrogen double-bonded to carbon',
     'A nitrogen bonded to an oxygen'], 0,
    'An -NH2 group on a chain. Nitrogen makes three bonds, so one goes to the chain and two hold hydrogens.',
    AMINES[1]),
  concept('u15l1-b', 'count THE bonds', 'How many bonds does the nitrogen in an amine form?',
    ['1', '2', '3'], 2, 'Three — one to the chain and two to hydrogens.',
    AMINES[1], true),
  concept('u15l1-c', 'identify THE group', 'Which suffix marks an amine?',
    ['-amine', '-amide', '-amino'], 0, '-amine, with a locant: butan-1-amine.'),
  concept('u15l1-d', 'identify THE group', 'How many hydrogens does the nitrogen of a terminal -NH2 carry?',
    ['1', '2', '3'], 1, 'Two. Three bonds in total, one spent on the chain.',
    AMINES[2], true),
  concept('u15l1-e', 'identify THE group', 'Is an amine a hydrocarbon?',
    ['Yes', 'No — it contains nitrogen', 'Only the short ones'], 1,
    'Hydrocarbons contain only carbon and hydrogen.'),
  AMINES.map((m) => countCarbons(m)),
  AMINES.map((m, i) => mcNameFrom(m, others(AMINES, i), { seed: i + 107 })),
  AMINES.map((m) => writeName(m, { hint: 'Root, then -amine, with a locant for the nitrogen.' }))
);

export const POOL_U15L2 = pool(
  concept('u15l2-a', 'number THE chain', 'In butan-2-amine, what does the 2 refer to?',
    ['The number of nitrogens', 'The carbon carrying the nitrogen', 'The chain length'], 1,
    'The locant gives the carbon the -NH2 is attached to.'),
  concept('u15l2-b', 'number THE chain', 'Why is "butan-3-amine" not correct?',
    ['Butane has only three carbons', 'Numbered from the other end it is butan-2-amine',
     'Amines cannot sit on carbon 3'], 1,
    'The amine takes the lower locant, so 3 becomes 2.'),
  concept('u15l2-c', 'identify THE group', 'Two -NH2 groups on one chain are named…',
    ['-diamine, with a locant each', '-amine twice', '-diamino'], 0,
    'butane-1,4-diamine: di- for two, and a locant for each.'),
  concept('u15l2-d', 'identify THE group', 'An amine and an alcohol share a molecule. Which takes the suffix?',
    ['The amine', 'The alcohol', 'Neither'], 1,
    'The alcohol is more senior, so the amine is demoted to the prefix amino-.',
    AMINO_ALCOHOLS[1]),
  AMINES.map((m) => writeName(m)),
  SUB_AMINES.map((m) => writeName(m, { hint: 'The amine takes the lowest locant it can.' })),
  AMINES.map((m, i) => mcNameFrom(m, others(AMINES, i), { seed: i + 109 })),
  AMINES.slice(0, 5).map((m) => drawIt(m, { hint: 'Draw the chain, then add a nitrogen from the Atom menu.' })),
  AMINES.map((m) => countCarbons(m))
);

export const POOL_U15L3 = pool(
  concept('u15l3-a', 'IDENTIFY THE MOLECULE TYPE', 'What tells an amine apart from an alcohol?',
    ['The atom on the chain: nitrogen against oxygen', 'The chain length', 'Nothing'], 0,
    'Same shape, different atom — and nitrogen carries two hydrogens where oxygen carries one.'),
  concept('u15l3-b', 'IDENTIFY THE MOLECULE TYPE', 'This structure is an…',
    ['alcohol', 'amine', 'aldehyde'], 1, 'The atom on the end of the chain is nitrogen.',
    AMINES[3]),
  concept('u15l3-c', 'count THE bonds', 'Why does an amine nitrogen hold two hydrogens where an alcohol oxygen holds one?',
    ['Nitrogen makes three bonds, oxygen two', 'Nitrogen is bigger', 'It does not'], 0,
    'One bond each goes to the chain, leaving two free on nitrogen and one on oxygen.'),
  concept('u15l3-d', 'IDENTIFY THE MOLECULE TYPE', 'Which is more senior, an alcohol or an amine?',
    ['The alcohol', 'The amine', 'They rank equally'], 0,
    'The alcohol takes -ol; the amine is demoted to amino-.'),
  AMINO_ALCOHOLS.map((m) => writeName(m, { hint: 'The alcohol is senior, so the amine becomes amino-.' })),
  AMINES.map((m, i) => mcNameFrom(m, others(AMINES, i), { seed: i + 113 })),
  AMINES.map((m) => writeName(m)),
  SUB_AMINES.map((m) => writeName(m)),
  AMINES.map((m) => countCarbons(m))
);

export const POOL_U15CP = pool(
  AMINES.map((m) => writeName(m)),
  SUB_AMINES.map((m) => writeName(m)),
  AMINO_ALCOHOLS.map((m) => writeName(m)),
  AMINES.map((m, i) => mcNameFrom(m, others(AMINES, i), { seed: i + 127 })),
  AMINES.slice(0, 5).map((m) => drawIt(m)),
  AMINES.map((m) => countCarbons(m))
);

// ── Unit 15 · Amides and nitriles ────────────────────────────
export const POOL_U16L1 = pool(
  concept('u16l1-a', 'identify THE group', 'What is an amide?',
    ['A carbonyl with a nitrogen attached', 'A nitrogen with three carbons', 'A carbonyl with an -OH'], 0,
    '-CONH2: a carbonyl carbon bonded to nitrogen.',
    AMIDES[1]),
  concept('u16l1-b', 'identify THE group', 'Which suffix marks an amide?',
    ['-amine', '-amide', '-anoic acid'], 1, '-amide: ethanamide, propanamide.'),
  concept('u16l1-c', 'IDENTIFY THE MOLECULE TYPE', 'What tells an amide apart from an amine?',
    ['The amide has a carbonyl', 'The amine has more nitrogens', 'Nothing'], 0,
    'An amine is nitrogen on a plain chain; an amide has C=O on the carbon holding the nitrogen.'),
  concept('u16l1-d', 'identify THE group', 'Where must an amide group sit?',
    ['At the end of the chain', 'In the middle', 'Anywhere'], 0,
    'The carbon carries C=O and N, so it can only sit at an end — like an acid.',
    AMIDES[2]),
  concept('u16l1-e', 'identify THE group', 'Does an amide need a locant?',
    ['Yes', 'No — it is terminal, so there is only one place it can be', 'Only above four carbons'], 1,
    'Like an aldehyde and an acid, it is terminal and takes carbon 1.'),
  AMIDES.map((m) => countCarbons(m)),
  AMIDES.map((m, i) => mcNameFrom(m, others(AMIDES, i), { seed: i + 131 })),
  AMIDES.map((m) => writeName(m, { hint: 'Count the chain including the carbonyl carbon, then add -amide.' })),
  AMIDES.map((m) => countHydrogens(m)),
  AMINES.slice(0, 5).map((m) => writeName(m))
);

export const POOL_U16L2 = pool(
  concept('u16l2-a', 'identify THE group', 'What is a nitrile?',
    ['A carbon triple-bonded to nitrogen', 'A carbon double-bonded to nitrogen',
     'A nitrogen with three hydrogens'], 0,
    '-C≡N at the end of a chain.',
    NITRILES[1]),
  concept('u16l2-b', 'identify THE group', 'Which suffix marks a nitrile?',
    ['-amide', '-nitrile', '-amine'], 1, '-nitrile, added to the full parent name: ethanenitrile.'),
  concept('u16l2-c', 'identify THE group', 'Is the nitrile carbon counted in the chain?',
    ['Yes', 'No', 'Only above three carbons'], 0,
    'It is part of the chain — which is the commonest slip. Ethanenitrile has two carbons, not one.',
    NITRILES[0], true),
  concept('u16l2-d', 'count THE bonds', 'How many bonds join the carbon and nitrogen in a nitrile?',
    ['1', '2', '3'], 2, 'Three — a triple bond, which uses three of the carbon\'s four.',
    NITRILES[1], true),
  concept('u16l2-e', 'identify THE group', 'Why does the -nitrile suffix keep the -e of the parent?',
    ['It does not', 'Because -nitrile begins with a consonant', 'Nitriles are irregular'], 1,
    'ethane + nitrile = ethanenitrile. The -e is only dropped before a vowel.'),
  NITRILES.map((m) => countCarbons(m)),
  NITRILES.map((m, i) => mcNameFrom(m, others(NITRILES, i), { seed: i + 137 })),
  NITRILES.map((m) => writeName(m, { hint: 'Count the nitrile carbon too, then add -nitrile.' })),
  AMIDES.map((m) => writeName(m)),
  NITRILES.map((m) => countCarbons(m))
);

export const POOL_U16L3 = pool(
  concept('u16l3-a', 'IDENTIFY THE MOLECULE TYPE', 'Three nitrogen families: which has a triple bond?',
    ['amine', 'amide', 'nitrile'], 2, 'The nitrile: C≡N.'),
  concept('u16l3-b', 'IDENTIFY THE MOLECULE TYPE', 'Which nitrogen family has a carbonyl?',
    ['amine', 'amide', 'nitrile'], 1, 'The amide: C=O with a nitrogen on the same carbon.'),
  concept('u16l3-c', 'IDENTIFY THE MOLECULE TYPE', 'This structure is an…',
    ['amine', 'amide', 'nitrile'], 1, 'A carbonyl with a nitrogen on the same carbon.',
    AMIDES[2]),
  concept('u16l3-d', 'IDENTIFY THE MOLECULE TYPE', 'This structure is an…',
    ['amine', 'amide', 'nitrile'], 2, 'Three lines between the carbon and the nitrogen.',
    NITRILES[2]),
  concept('u16l3-e', 'IDENTIFY THE MOLECULE TYPE', 'This structure is an…',
    ['amine', 'amide', 'nitrile'], 0, 'A nitrogen on a plain chain, with no carbonyl and no triple bond.',
    AMINES[3]),
  concept('u16l3-f', 'IDENTIFY THE MOLECULE TYPE', 'How do you tell an amide from an acid?',
    ['The amide has nitrogen where the acid has -OH', 'The acid has a carbonyl and the amide does not',
     'Nothing'], 0,
    'Both are terminal carbonyls. The acid carries -OH; the amide carries -NH2.'),
  N_ALL.map((m, i) => mcNameFrom(m, others(N_ALL, i), { seed: i + 139 })),
  AMIDES.map((m) => writeName(m)),
  NITRILES.map((m) => writeName(m)),
  N_ALL.map((m) => countCarbons(m))
);

export const POOL_U16CP = pool(
  AMIDES.map((m) => writeName(m)),
  NITRILES.map((m) => writeName(m)),
  SUB_AMIDES.map((m) => writeName(m)),
  SUB_NITRILES.map((m) => writeName(m)),
  N_ALL.map((m, i) => mcNameFrom(m, others(N_ALL, i), { seed: i + 149 })),
  AMIDES.slice(0, 4).map((m) => drawIt(m)),
  N_ALL.map((m) => countCarbons(m))
);


// ── Ethers, acyl halides, anhydrides, nitro ──────────────────
const ether = (a, b) => {
  const n = a + b;
  const bonds = [...chainBonds(a), [a - 1, n, 1], [n, a, 1]];
  for (let i = a; i + 1 < n; i++) bonds.push([i, i + 1, 1]);
  return buildTarget([...Cn(n), 'O'], bonds);
};
const acylCl = (n, el = 'Cl') =>
  buildTarget([...Cn(n), 'O', el], [...chainBonds(n), [n - 1, n, 2], [n - 1, n + 1, 1]]);

const ETHERS = [
  ether(1, 1), ether(1, 2), ether(2, 2), ether(1, 3), ether(2, 3),
  ether(1, 4), ether(3, 3), ether(2, 4), ether(1, 5),
];
const ACYL_HALIDES = [
  acylCl(2), acylCl(3), acylCl(4), acylCl(5), acylCl(6),
  acylCl(2, 'Br'), acylCl(3, 'Br'), acylCl(4, 'Br'), acylCl(2, 'F'),
];
const SUB_ACYL = [
  buildTarget([...Cn(4), 'O', 'Cl', 'Cl'], [...chainBonds(4), [3, 4, 2], [3, 5, 1], [1, 6, 1]]),  // 3-chlorobutanoyl chloride
];
// alcohols that share a formula with an ether — the isomerism point
const ISOMER_PAIRS = [
  [ether(1, 1), buildTarget([...Cn(2), 'O'], [...chainBonds(2), [0, 2]])],            // C2H6O
  [ether(1, 2), buildTarget([...Cn(3), 'O'], [...chainBonds(3), [0, 3]])],            // C3H8O
  [ether(1, 2), buildTarget([...Cn(3), 'O'], [...chainBonds(3), [1, 3]])],            // C3H8O
];
const ISOMER_SET = ISOMER_PAIRS.flat();

// ── Unit 14 · Ethers ─────────────────────────────────────────
export const POOL_U17L1 = pool(
  concept('u17l1-a', 'identify THE group', 'What is an ether?',
    ['An oxygen bridging two carbon chains', 'An oxygen with a hydrogen', 'A carbon double-bonded to oxygen'], 0,
    'C-O-C: both of the oxygen\'s bonds go to carbon, so it has no hydrogen of its own.',
    ETHERS[1]),
  concept('u17l1-b', 'count THE bonds', 'How many hydrogens does the oxygen in an ether carry?',
    ['0', '1', '2'], 0, 'None. Oxygen makes two bonds and both are spent on carbon.',
    ETHERS[0], true),
  concept('u17l1-c', 'identify THE group', 'How is an ether cited in a name?',
    ['As the suffix -ether', 'As the prefix alkoxy-', 'It is not cited'], 1,
    'methoxy-, ethoxy-, propoxy-: an alkyl group plus -oxy.'),
  concept('u17l1-d', 'identify THE group', 'Can an ether take the suffix?',
    ['Yes', 'No — like a halogen, it is prefix-only', 'Only when there are two'], 1,
    'An ether is always a prefix, however many are present.'),
  concept('u17l1-e', 'identify THE group', 'Which half of an ether becomes the alkoxy prefix?',
    ['The shorter one', 'The longer one', 'Either'], 0,
    'The shorter chain becomes the prefix; the longer one is the parent.'),
  ETHERS.map((m) => countCarbons(m)),
  ETHERS.map((m, i) => mcNameFrom(m, others(ETHERS, i), { seed: i + 151 })),
  ETHERS.map((m) => writeName(m, { hint: 'Longer chain is the parent; the shorter becomes an -oxy prefix.' }))
);

export const POOL_U17L2 = pool(
  concept('u17l2-a', 'identify THE group', 'In methoxyethane, which chain is the parent?',
    ['The ethane', 'The methoxy', 'Either'], 0, 'The longer chain is the parent; the shorter becomes methoxy-.',
    ETHERS[1]),
  concept('u17l2-b', 'identify THE group', 'A two-carbon chain on the oxygen becomes…',
    ['methoxy-', 'ethoxy-', 'propoxy-'], 1, 'eth + oxy.'),
  concept('u17l2-c', 'number THE chain', 'Does an alkoxy prefix need a locant?',
    ['Yes, when the parent has three or more carbons', 'Never', 'Always'], 0,
    '1-methoxypropane and 2-methoxypropane are different compounds, so the number matters once there is a choice.'),
  concept('u17l2-d', 'identify THE group', 'Ethoxyethane has how many carbons in total?',
    ['2', '3', '4'], 2, 'Two on each side of the oxygen.',
    ETHERS[2]),
  ETHERS.map((m) => writeName(m)),
  ETHERS.map((m, i) => mcNameFrom(m, others(ETHERS, i), { seed: i + 157 })),
  ETHERS.map((m) => countCarbons(m)),
  ETHERS.slice(0, 5).map((m) => drawIt(m, { hint: 'Draw one chain, add the oxygen, then continue the second chain.' }))
);

export const POOL_U17L3 = pool(
  concept('u17l3-a', 'IDENTIFY THE MOLECULE TYPE', 'What tells an ether apart from an alcohol?',
    ['The ether oxygen has no hydrogen', 'The ether has more carbons', 'Nothing'], 0,
    'An alcohol oxygen holds a hydrogen; an ether oxygen holds two carbons.'),
  concept('u17l3-b', 'IDENTIFY THE MOLECULE TYPE', 'Methoxymethane and ethanol are both C2H6O. What are they called?',
    ['The same compound', 'Structural isomers', 'Different formulas'], 1,
    'Same formula, different structure — the oxygen bridges in one and dangles in the other.'),
  concept('u17l3-c', 'IDENTIFY THE MOLECULE TYPE', 'This structure is an…',
    ['alcohol', 'ether', 'aldehyde'], 1, 'The oxygen sits between two carbons.',
    ETHERS[2]),
  concept('u17l3-d', 'IDENTIFY THE MOLECULE TYPE', 'Why can an ether not be an alcohol as well?',
    ['Oxygen has only two bonds, and both are used on carbon', 'Ethers are too large',
     'They can be both'], 0,
    'With both bonds spent on carbon there is nothing left to hold a hydrogen.'),
  ISOMER_SET.map((m, i) => mcNameFrom(m, others(ISOMER_SET, i), { seed: i + 163 })),
  ETHERS.map((m) => writeName(m)),
  ETHERS.map((m) => countCarbons(m)),
  ETHERS.map((m, i) => mcNameFrom(m, others(ETHERS, i), { seed: i + 167 }))
);

export const POOL_U17CP = pool(
  ETHERS.map((m) => writeName(m)),
  ETHERS.map((m, i) => mcNameFrom(m, others(ETHERS, i), { seed: i + 173 })),
  ISOMER_SET.map((m) => writeName(m)),
  ETHERS.slice(0, 5).map((m) => drawIt(m)),
  ETHERS.map((m) => countCarbons(m))
);

// ── Unit 15 · Acyl halides and anhydrides ────────────────────
export const POOL_U18L1 = pool(
  concept('u18l1-a', 'identify THE group', 'What is an acyl halide?',
    ['A carbonyl with a halogen attached', 'A halogen on a plain chain', 'A carbonyl with an -OH'], 0,
    '-COCl: the acid\'s -OH replaced by a halogen.',
    ACYL_HALIDES[0]),
  concept('u18l1-b', 'identify THE group', 'Which suffix marks an acyl chloride?',
    ['-oyl chloride', '-chloro', '-oic chloride'], 0, 'ethanoyl chloride: -oic acid becomes -oyl chloride.'),
  concept('u18l1-c', 'IDENTIFY THE MOLECULE TYPE', 'What tells an acyl chloride apart from a chloroalkane?',
    ['The acyl chloride has a carbonyl on that carbon', 'The chloroalkane has more chlorines',
     'Nothing'], 0,
    'A chlorine on a plain chain is a prefix, chloro-. A chlorine on a [[carbonyl]] carbon is a different family with its own suffix.'),
  concept('u18l1-d', 'identify THE group', 'Where must an acyl halide group sit?',
    ['At the end of the chain', 'In the middle', 'Anywhere'], 0,
    'The carbon carries C=O and the halogen, so all four bonds are spoken for.',
    ACYL_HALIDES[1]),
  concept('u18l1-e', 'identify THE group', 'Is an acyl halide more senior than a halogen substituent?',
    ['Yes — it takes the suffix', 'No', 'They rank equally'], 0,
    'A plain halogen can never take a suffix; an acyl halide has one of its own.'),
  ACYL_HALIDES.map((m) => countCarbons(m)),
  ACYL_HALIDES.map((m, i) => mcNameFrom(m, others(ACYL_HALIDES, i), { seed: i + 179 })),
  ACYL_HALIDES.map((m) => writeName(m, { hint: 'Count the carbonyl carbon, then -oyl chloride.' }))
);

export const POOL_U18L2 = pool(
  ACYL_HALIDES.map((m) => writeName(m)),
  SUB_ACYL.map((m) => writeName(m, { hint: 'The acyl carbon is number 1; the other chlorine is a prefix.' })),
  ACYL_HALIDES.map((m, i) => mcNameFrom(m, others(ACYL_HALIDES, i), { seed: i + 181 })),
  ACYL_HALIDES.map((m) => countCarbons(m)),
  ACYL_HALIDES.slice(0, 4).map((m) => drawIt(m))
);

export const POOL_U18L3 = pool(
  concept('u18l3-a', 'identify THE group', 'Two chlorines, one on a carbonyl carbon and one on carbon 3. How are they cited?',
    ['Both as chloro- prefixes', 'The carbonyl one as -oyl chloride, the other as chloro-',
     'Both as -oyl chloride'], 1,
    'The one on the carbonyl is the principal group; the other is an ordinary substituent.',
    SUB_ACYL[0]),
  concept('u18l3-b', 'IDENTIFY THE MOLECULE TYPE', 'Rank these: acyl chloride, ester, ketone.',
    ['acyl chloride, ester, ketone', 'ketone, ester, acyl chloride', 'ester, ketone, acyl chloride'], 0,
    'The acyl halide sits above the ester, and both above the ketone.'),
  concept('u18l3-c', 'IDENTIFY THE MOLECULE TYPE', 'This structure is an…',
    ['acyl chloride', 'chloroalkane', 'ester'], 0, 'The chlorine sits on a carbonyl carbon.',
    ACYL_HALIDES[2]),
  concept('u18l3-d', 'identify THE group', 'What happens to the -oic acid ending when it becomes an acyl chloride?',
    ['It becomes -oyl chloride', 'It stays -oic acid', 'It becomes -oate'], 0,
    'propanoic acid → propanoyl chloride.'),
  ACYL_HALIDES.map((m) => writeName(m)),
  SUB_ACYL.map((m) => writeName(m)),
  ACYL_HALIDES.map((m, i) => mcNameFrom(m, others(ACYL_HALIDES, i), { seed: i + 191 })),
  ACYL_HALIDES.map((m) => countCarbons(m)),
  ACYL_HALIDES.slice(0, 5).map((m) => drawIt(m))
);

export const POOL_U18CP = pool(
  ACYL_HALIDES.map((m) => writeName(m)),
  SUB_ACYL.map((m) => writeName(m)),
  ACYL_HALIDES.map((m, i) => mcNameFrom(m, others(ACYL_HALIDES, i), { seed: i + 193 })),
  ACYL_HALIDES.slice(0, 5).map((m) => drawIt(m)),
  ACYL_HALIDES.map((m) => countCarbons(m)),
  ACYL_HALIDES.map((m) => countHydrogens(m))
);


// ── Nitro compounds ──────────────────────────────────────────
// NO2 is group shorthand the engine expands into a real N with two oxygens.
// The nitrogen legitimately carries four bonds — it is N+ with an O- — which
// is why it needs the shorthand rather than being drawn atom by atom.
const nitro = (n, at) => buildTarget([...Cn(n), 'NO2'], [...chainBonds(n), [at - 1, n]]);

const NITROS = [
  nitro(1, 1), nitro(2, 1), nitro(3, 1), nitro(4, 1), nitro(5, 1), nitro(6, 1),
  nitro(3, 2), nitro(4, 2), nitro(5, 2), nitro(5, 3), nitro(6, 2), nitro(6, 3),
];
const SUB_NITROS = [
  buildTarget([...Cn(3), 'NO2', 'Cl'], [...chainBonds(3), [0, 3], [2, 4]]),        // 3-chloro-1-nitropropane
  buildTarget([...Cn(5), 'NO2'], [...chainBonds(4), [2, 4], [0, 5]]),              // 3-methyl-1-nitrobutane
  buildTarget([...Cn(4), 'NO2', 'NO2'], [...chainBonds(4), [0, 4], [3, 5]]),       // 1,4-dinitrobutane
  buildTarget([...Cn(4), 'NO2'], [...chainBonds(4, { 3: 2 }), [0, 4]]),            // 4-nitrobut-1-ene
];
const NITRO_OLS = [
  buildTarget([...Cn(3), 'NO2', 'O'], [...chainBonds(3), [0, 3], [2, 4]]),         // 3-nitropropan-1-ol
  buildTarget([...Cn(4), 'NO2', 'O'], [...chainBonds(4), [0, 4], [3, 5]]),         // 4-nitrobutan-1-ol
];

export const POOL_U19L1 = pool(
  concept('u19n-a', 'identify THE group', 'What is a nitro group?',
    ['A nitrogen carrying two oxygens', 'A nitrogen carrying two hydrogens',
     'A nitrogen triple-bonded to carbon'], 0,
    '-NO2: one nitrogen with two oxygens attached, joined to the chain.',
    NITROS[1]),
  concept('u19n-b', 'identify THE group', 'How is a nitro group cited in a name?',
    ['As the suffix -nitro', 'As the prefix nitro-', 'It is not cited'], 1,
    'nitro-, always in front of the parent.'),
  concept('u19n-c', 'identify THE group', 'Can a nitro group ever take the suffix?',
    ['Yes, when it is the only group', 'No — it is prefix-only, like a halogen',
     'Only when there are two'], 1,
    'A nitro group has no suffix form at all. However many there are, they stay prefixes.'),
  concept('u19n-d', 'count THE bonds', 'How many oxygens does a nitro group carry?',
    ['1', '2', '3'], 1, 'Two, both on the same nitrogen.',
    NITROS[1]),
  concept('u19n-e', 'identify THE group', 'Two nitro groups on one chain are named…',
    ['dinitro-, with a locant each', 'nitro- twice', 'nitro2-'], 0,
    '1,4-dinitrobutane: di- for two, and a number for each.'),
  NITROS.map((m) => countCarbons(m)),
  NITROS.map((m, i) => mcNameFrom(m, others(NITROS, i), { seed: i + 197 })),
  NITROS.map((m) => writeName(m, { hint: 'nitro- in front, with a locant if the chain allows a choice.' }))
);

export const POOL_U19L2 = pool(
  concept('u19n-f', 'number THE chain', 'Why does nitroethane need no locant?',
    ['Nitro groups never take locants', 'Both carbons are equivalent, so there is only one nitroethane',
     'The chain is too short to number'], 1,
    'Either position gives the same molecule.'),
  concept('u19n-g', 'number THE chain', 'Why is "3-nitrobutane" not correct?',
    ['Butane cannot carry a nitro group', 'Numbered from the other end it is 2-nitrobutane',
     'Nitro groups cannot sit on carbon 3'], 1,
    'The lowest locant is compulsory, exactly as for any other prefix.'),
  concept('u19n-h', 'identify THE group', 'A nitro group and a chlorine on one chain are cited…',
    ['nitro first', 'chloro first, because it comes earlier alphabetically', 'by locant'], 1,
    '3-chloro-1-nitropropane: prefixes are alphabetical, and neither can take a suffix.',
    SUB_NITROS[0]),
  concept('u19n-i', 'identify THE group', 'A nitro group and an alcohol share a molecule. Which takes the suffix?',
    ['The nitro group', 'The alcohol', 'Neither'], 1,
    'The nitro group can never take a suffix, so the alcohol does — and the nitro stays a prefix.',
    NITRO_OLS[0]),
  NITROS.map((m) => writeName(m)),
  SUB_NITROS.map((m) => writeName(m, { hint: 'Prefixes alphabetically; numbers from the lowest set.' })),
  NITRO_OLS.map((m) => writeName(m, { hint: 'The alcohol takes the suffix; nitro- stays in front.' })),
  NITROS.map((m, i) => mcNameFrom(m, others(NITROS, i), { seed: i + 199 })),
  NITROS.map((m) => countCarbons(m)),
  NITROS.slice(0, 5).map((m) => drawIt(m, { hint: 'Place the NO2 group from the Atom menu.' }))
);

export const POOL_U19CP = pool(
  NITROS.map((m) => writeName(m)),
  SUB_NITROS.map((m) => writeName(m)),
  NITRO_OLS.map((m) => writeName(m)),
  NITROS.map((m, i) => mcNameFrom(m, others(NITROS, i), { seed: i + 211 })),
  NITROS.slice(0, 5).map((m) => drawIt(m)),
  NITROS.map((m) => countCarbons(m))
);


// ── Rings and aromatics ──────────────────────────────────────
// Built from names rather than coordinates: the parser is the shortest route
// to a correct ring, and every one below was checked against the engine.
const fromName = (n) => {
  const p = parseName(n);
  return p.ok ? p.mol : null;
};
const molsFor = (names) => names.map(fromName).filter(Boolean);

const CYCLOALKANES = molsFor([
  'cyclopropane', 'cyclobutane', 'cyclopentane', 'cyclohexane', 'cycloheptane', 'cyclooctane',
]);
const SUB_RINGS = molsFor([
  'methylcyclohexane', 'ethylcyclohexane', 'propylcyclohexane', 'methylcyclopentane',
  'ethylcyclopentane', 'methylcyclobutane', 'butylcyclohexane', 'ethylcyclobutane',
]);
const DI_RINGS = molsFor([
  '1,2-dimethylcyclohexane', '1,3-dimethylcyclohexane', '1,4-dimethylcyclohexane',
  '1,1-dimethylcyclohexane', '1,2-dimethylcyclopentane', '1,3-dimethylcyclopentane',
  '1-ethyl-2-methylcyclohexane', '1,2-dichlorocyclohexane', 'chlorocyclohexane',
]);
const RING_GROUPS = molsFor([
  'cyclohexan-1-ol', 'cyclopentan-1-ol', 'cyclohexan-1-one', 'cyclopentan-1-one',
  'cyclohex-1-ene', 'cyclopent-1-ene', 'cyclohexane-1,2-diol', 'cyclohexane-1,4-diol',
]);
const RINGS_ALL = [...CYCLOALKANES, ...SUB_RINGS, ...DI_RINGS];

const AROMATICS = molsFor([
  'benzene', 'methylbenzene', 'ethylbenzene', 'propylbenzene',
  '1,2-dimethylbenzene', '1,3-dimethylbenzene', '1,4-dimethylbenzene',
  'chlorobenzene', 'bromobenzene', '1,2-dichlorobenzene', '1,4-dichlorobenzene',
]);
const AROMATIC_GROUPS = molsFor([
  'phenol', 'aniline', 'benzoic acid', 'benzaldehyde', 'nitrobenzene', 'ethenylbenzene',
]);
const AROM_ALL = [...AROMATICS, ...AROMATIC_GROUPS];

// same formula, ring versus chain — the isomerism that rings introduce
const RING_CHAIN_ISOMERS = [
  ...molsFor(['cyclohexane']),
  buildTarget(Cn(6), chainBonds(6, { 1: 2 })),     // hex-1-ene, also C6H12
  ...molsFor(['cyclopentane']),
  buildTarget(Cn(5), chainBonds(5, { 1: 2 })),     // pent-1-ene, also C5H10
];

export const POOL_U20L1 = pool(
  concept('u20r-a', 'IDENTIFY THE MOLECULE TYPE', 'What is a cycloalkane?',
    ['A chain of carbons joined into a ring', 'A chain with a double bond', 'A chain with a branch'], 0,
    'The two ends of the chain join, closing a ring.',
    CYCLOALKANES[3]),
  concept('u20r-b', 'identify THE group', 'How is a ring shown in the name?',
    ['With the prefix cyclo-', 'With the suffix -ring', 'With brackets'], 0,
    'cyclohexane: cyclo- in front of the usual root.'),
  concept('u20r-c', 'count THE carbons', 'How many carbons does cyclohexane have?',
    ['5', '6', '7'], 1, 'hex- means six, exactly as in hexane.',
    CYCLOALKANES[3]),
  concept('u20r-d', 'count THE hydrogens', 'Why does cyclohexane have fewer hydrogens than hexane?',
    ['Closing the ring uses a bond at each end', 'Rings are smaller', 'It does not'], 0,
    'hexane is C6H14 and cyclohexane C6H12: joining the ends costs one hydrogen from each.'),
  concept('u20r-e', 'IDENTIFY THE MOLECULE TYPE', 'What is the general formula of a cycloalkane?',
    ['CnH2n+2', 'CnH2n', 'CnH2n-2'], 1,
    'CnH2n — two hydrogens fewer than the open chain, because the ring closure uses two bonds.'),
  CYCLOALKANES.map((m) => countCarbons(m)),
  CYCLOALKANES.map((m, i) => mcNameFrom(m, others(CYCLOALKANES, i), { seed: i + 223 })),
  RINGS_ALL.map((m) => writeName(m, { hint: 'cyclo- plus the root for the number of ring carbons.' })),
  CYCLOALKANES.map((m) => mcFormula(m, { seed: 13 }))
);

export const POOL_U20L2 = pool(
  concept('u20r-f', 'identify THE group', 'A methyl on a cyclohexane ring is named…',
    ['methylcyclohexane', 'cyclohexylmethane', 'cyclomethylhexane'], 0,
    'The ring is the parent; the methyl is a substituent on it.'),
  concept('u20r-g', 'number THE chain', 'Does methylcyclohexane need a locant?',
    ['Yes, always', 'No — every ring carbon is equivalent until there is a second group',
     'Only for rings above six carbons'], 1,
    'With one substituent every position on the ring is the same, so no number is needed.'),
  concept('u20r-h', 'number THE chain', 'Where does numbering start on a substituted ring?',
    ['At a carbon carrying a substituent', 'At the top', 'Anywhere'], 0,
    'A substituted carbon is carbon 1, and you count round whichever way gives the lowest set.'),
  concept('u20r-i', 'number THE chain', 'Why is 1,5-dimethylcyclohexane not a correct name?',
    ['Counting the other way round gives 1,3', 'Cyclohexane has only four carbons',
     'Methyls cannot sit on carbon 5'], 0,
    'Going round the other way gives the lower set, so it is 1,3-dimethylcyclohexane.'),
  DI_RINGS.map((m) => writeName(m, { hint: 'Start at a substituted carbon and count the way that gives the lowest set.' })),
  DI_RINGS.map((m, i) => mcNameFrom(m, others(DI_RINGS, i), { seed: i + 227 })),
  SUB_RINGS.map((m) => writeName(m)),
  RINGS_ALL.map((m) => countCarbons(m))
);

export const POOL_U20L3 = pool(
  concept('u20r-j', 'IDENTIFY THE MOLECULE TYPE', 'Cyclohexane and hex-1-ene are both C6H12. What are they?',
    ['The same compound', 'Structural isomers', 'Different formulas'], 1,
    'A ring and a double bond each cost two hydrogens, so they share a formula.'),
  concept('u20r-k', 'IDENTIFY THE MOLECULE TYPE', 'A formula of CnH2n could be…',
    ['an alkane', 'an alkene or a cycloalkane', 'an alcohol'], 1,
    'Both a ring and a double bond reduce the hydrogen count by two.'),
  concept('u20r-l', 'identify THE group', 'A hydroxyl on a ring is named…',
    ['cyclohexan-1-ol', 'hydroxycyclohexane', 'cyclohexanhydroxide'], 0,
    'The ring is the parent and the alcohol takes the suffix, as it does on a chain.',
    RING_GROUPS[0]),
  concept('u20r-m', 'number THE chain', 'Which carbon carries the group in cyclohexan-1-ol?',
    ['Carbon 1', 'Carbon 2', 'Any of them'], 0,
    'The principal group takes carbon 1, and on a ring you start numbering there.'),
  RING_GROUPS.map((m) => writeName(m, { hint: 'The ring is the parent; the group takes the suffix and carbon 1.' })),
  RING_CHAIN_ISOMERS.map((m, i) => mcNameFrom(m, others(RING_CHAIN_ISOMERS, i), { seed: i + 229 })),
  RING_GROUPS.map((m, i) => mcNameFrom(m, others(RING_GROUPS, i), { seed: i + 233 })),
  RINGS_ALL.map((m) => writeName(m))
);

export const POOL_U20CP = pool(
  RINGS_ALL.map((m) => writeName(m)),
  RING_GROUPS.map((m) => writeName(m)),
  RINGS_ALL.map((m, i) => mcNameFrom(m, others(RINGS_ALL, i), { seed: i + 239 })),
  RINGS_ALL.map((m) => countCarbons(m)),
  CYCLOALKANES.map((m) => mcFormula(m, { seed: 17 }))
);

// ── Aromatics ────────────────────────────────────────────────
export const POOL_U21L1 = pool(
  concept('u21a-a', 'IDENTIFY THE MOLECULE TYPE', 'What is benzene?',
    ['A six-carbon ring with alternating double bonds', 'A six-carbon chain',
     'A six-carbon ring with all single bonds'], 0,
    'C6H6: a ring of six carbons sharing three double bonds around it.',
    AROMATICS[0]),
  concept('u21a-b', 'count THE hydrogens', 'How many hydrogens does benzene have?',
    ['6', '10', '12'], 0, 'One per carbon: C6H6.',
    AROMATICS[0]),
  concept('u21a-c', 'IDENTIFY THE MOLECULE TYPE', 'How does benzene differ from cyclohexane?',
    ['Benzene has three double bonds in the ring', 'Benzene has more carbons',
     'They are the same'], 0,
    'C6H6 against C6H12 — six hydrogens fewer, because of the three double bonds.'),
  concept('u21a-d', 'identify THE group', 'A methyl on a benzene ring gives…',
    ['methylbenzene', 'benzylmethane', 'cyclomethylbenzene'], 0,
    'The ring is the parent, exactly as with a cycloalkane. It is also known by the older name toluene.'),
  concept('u21a-e', 'IDENTIFY THE MOLECULE TYPE', 'Is benzene saturated?',
    ['Yes, it is a ring', 'No — it contains double bonds', 'Only in solution'], 1,
    'Saturated means single bonds only. Benzene has three double bonds in its ring.'),
  AROMATICS.map((m) => countCarbons(m)),
  AROMATICS.map((m, i) => mcNameFrom(m, others(AROMATICS, i), { seed: i + 241 })),
  AROMATICS.map((m) => writeName(m, { hint: 'Benzene is the parent; anything on it is a substituent.' }))
);

export const POOL_U21L2 = pool(
  concept('u21a-f', 'number THE chain', 'Two methyls on a benzene ring can be…',
    ['1,2 or 1,3 or 1,4', 'only 1,2', 'any numbers at all'], 0,
    'Three distinct arrangements, and they are three different compounds.'),
  concept('u21a-g', 'number THE chain', 'Why is 1,6-dimethylbenzene not correct?',
    ['Counting the other way gives 1,2', 'Benzene has only four carbons',
     'Methyls cannot sit on carbon 6'], 0,
    'Round the other way it is 1,2 — the lowest set wins.'),
  concept('u21a-h', 'identify THE group', 'A chlorine on benzene gives…',
    ['chlorobenzene', 'benzene chloride', 'chlorocyclohexene'], 0,
    'A halogen is a prefix here as everywhere else.'),
  concept('u21a-i', 'number THE chain', 'Does chlorobenzene need a locant?',
    ['Yes, always', 'No — every position on the ring is equivalent with one group',
     'Only when there are two groups'], 1,
    'A number is only needed once a second group creates a choice.'),
  AROMATICS.map((m) => writeName(m)),
  AROMATICS.map((m, i) => mcNameFrom(m, others(AROMATICS, i), { seed: i + 251 })),
  AROMATICS.map((m) => countCarbons(m)),
  AROMATICS.slice(0, 5).map((m) => drawIt(m, { hint: 'Use the benzene tool in the Ring menu.' }))
);

export const POOL_U21L3 = pool(
  concept('u21a-j', 'identify THE group', 'A hydroxyl on benzene is called…',
    ['phenol', 'benzenol', 'hydroxybenzene'], 0,
    'phenol — a retained name you simply have to know.',
    AROMATIC_GROUPS[0]),
  concept('u21a-k', 'identify THE group', 'An -NH2 on benzene is called…',
    ['aniline', 'benzenamine', 'aminobenzene'], 0,
    'aniline, another retained name.',
    AROMATIC_GROUPS[1]),
  concept('u21a-l', 'identify THE group', 'A carboxyl on benzene gives…',
    ['benzoic acid', 'benzene acid', 'cyclohexanoic acid'], 0, 'benzoic acid.',
    AROMATIC_GROUPS[2]),
  concept('u21a-m', 'identify THE group', 'An aldehyde on benzene gives…',
    ['benzaldehyde', 'benzenal', 'phenylmethanal'], 0, 'benzaldehyde.',
    AROMATIC_GROUPS[3]),
  concept('u21a-n', 'IDENTIFY THE MOLECULE TYPE', 'Why do these have their own names rather than systematic ones?',
    ['They are historical names kept because they are so widely used',
     'They cannot be named systematically', 'They are not real compounds'], 0,
    'Retained names: phenol, aniline, benzoic acid and benzaldehyde predate the systematic rules and stayed.'),
  AROMATIC_GROUPS.map((m) => writeName(m, { hint: 'Several of these are retained names worth memorising.' })),
  AROM_ALL.map((m, i) => mcNameFrom(m, others(AROM_ALL, i), { seed: i + 257 })),
  AROM_ALL.map((m) => countCarbons(m)),
  AROMATIC_GROUPS.map((m) => mcFormula(m, { seed: 19 }))
);

export const POOL_U21CP = pool(
  AROM_ALL.map((m) => writeName(m)),
  AROM_ALL.map((m, i) => mcNameFrom(m, others(AROM_ALL, i), { seed: i + 263 })),
  AROMATICS.slice(0, 6).map((m) => drawIt(m)),
  AROM_ALL.map((m) => countCarbons(m)),
  RINGS_ALL.slice(0, 6).map((m) => writeName(m))
);


// ── Isomerism and stereochemistry ────────────────────────────
// Stereo content is the one place the app must NOT be stereo-blind: these
// questions turn on the descriptor, so they carry stereo names in full.
const C4H10 = molsFor(['butane', '2-methylpropane']);
const C5H12 = molsFor(['pentane', '2-methylbutane', '2,2-dimethylpropane']);
const C3H8O = molsFor(['propan-1-ol', 'propan-2-ol', 'methoxyethane']);
const C4H8 = molsFor(['but-1-ene', 'but-2-ene', '2-methylprop-1-ene', 'cyclobutane']);
const C2H6O = molsFor(['ethanol', 'methoxymethane']);
const ISOMER_FAMILIES = [...C4H10, ...C5H12, ...C3H8O, ...C4H8, ...C2H6O];

// Molecules that DO show cis/trans, and controls that cannot.
const STEREO_PAIRS = molsFor([
  'cis-but-2-ene', 'trans-but-2-ene',
  'cis-pent-2-ene', 'trans-pent-2-ene',
  'cis-hex-3-ene', 'trans-hex-3-ene',
]);
const NO_STEREO = molsFor([
  'but-1-ene', 'prop-1-ene', '2-methylprop-1-ene', '2-methylbut-2-ene', 'ethene',
]);
const EZ_SET = molsFor([
  '(2Z)-but-2-ene', '(2E)-but-2-ene', '(2Z)-pent-2-ene', '(2E)-pent-2-ene',
  '(3E)-hex-3-ene', '(3Z)-hex-3-ene', '(2E)-3-methylpent-2-ene',
]);

export const POOL_U22L1 = pool(
  concept('u22i-a', 'IDENTIFY THE MOLECULE TYPE', 'What are constitutional isomers?',
    ['Compounds with the same formula but different connectivity',
     'The same compound drawn two ways', 'Compounds with different formulas'], 0,
    'Same atoms, joined up differently — so genuinely different compounds.'),
  concept('u22i-b', 'IDENTIFY THE MOLECULE TYPE', 'Butane and 2-methylpropane are both C4H10. They are…',
    ['the same compound', 'constitutional isomers', 'not isomers'], 1,
    'One is a straight chain, the other is branched.',
    C4H10[1]),
  concept('u22i-c', 'IDENTIFY THE MOLECULE TYPE', 'How many isomers does C5H12 have?',
    ['1', '2', '3'], 2, 'pentane, 2-methylbutane and 2,2-dimethylpropane.',
    C5H12[2]),
  concept('u22i-d', 'IDENTIFY THE MOLECULE TYPE', 'Two structures give the same IUPAC name. What does that mean?',
    ['They are the same compound', 'They are isomers', 'One of them is wrong'], 0,
    'A correct name identifies exactly one compound. Same name means same molecule, however differently it is drawn.'),
  concept('u22i-e', 'IDENTIFY THE MOLECULE TYPE', 'Do isomers have to be the same family?',
    ['Yes, always', 'No — ethanol and methoxymethane are both C2H6O',
     'Only for compounds with rings'], 1,
    'Different families can share a formula, which is called functional-group isomerism.',
    C2H6O[1]),
  ISOMER_FAMILIES.map((m) => writeName(m)),
  ISOMER_FAMILIES.map((m, i) => mcNameFrom(m, others(ISOMER_FAMILIES, i), { seed: i + 269 })),
  ISOMER_FAMILIES.map((m) => countCarbons(m)),
  C5H12.map((m) => mcFormula(m, { seed: 23 }))
);

export const POOL_U22L2 = pool(
  concept('u22i-f', 'IDENTIFY THE MOLECULE TYPE', 'Which of these is not an isomer of the others?',
    ['pentane', '2-methylbutane', 'hexane'], 2, 'Hexane is C6H14; the other two are C5H12.'),
  concept('u22i-g', 'IDENTIFY THE MOLECULE TYPE', 'C4H8 could be…',
    ['an alkane', 'an alkene or a cycloalkane', 'an alcohol'], 1,
    'Both a double bond and a ring cost two hydrogens, so both fit CnH2n.'),
  concept('u22i-h', 'IDENTIFY THE MOLECULE TYPE', 'How do you prove two structures are the same compound?',
    ['Compare their formulas', 'Name them both and compare the names', 'Count the bonds'], 1,
    'The name is the test: one compound has exactly one correct name.'),
  concept('u22i-i', 'IDENTIFY THE MOLECULE TYPE', 'Does branching change the formula?',
    ['Yes', 'No — a branched chain has the same atoms rearranged',
     'Only if the branch is longer than two carbons'], 1,
    'butane and 2-methylpropane are both C4H10.'),
  ISOMER_FAMILIES.map((m) => writeName(m)),
  C4H8.map((m, i) => mcNameFrom(m, others(C4H8, i), { seed: i + 271 })),
  C3H8O.map((m, i) => mcNameFrom(m, others(C3H8O, i), { seed: i + 277 })),
  ISOMER_FAMILIES.map((m) => countCarbons(m)),
  C4H10.map((m) => mcFormula(m, { seed: 29 }))
);

export const POOL_U22CP = pool(
  ISOMER_FAMILIES.map((m) => writeName(m)),
  ISOMER_FAMILIES.map((m, i) => mcNameFrom(m, others(ISOMER_FAMILIES, i), { seed: i + 281 })),
  ISOMER_FAMILIES.map((m) => countCarbons(m)),
  [...C5H12, ...C4H10].map((m) => mcFormula(m, { seed: 31 })),
  C4H8.map((m) => writeName(m))
);

// ── Cis/trans and E/Z ────────────────────────────────────────
export const POOL_U23L1 = pool(
  concept('u23s-a', 'IDENTIFY STEREOCHEMISTRY', 'Why can groups not swap sides across a double bond?',
    ['The double bond stops the carbons rotating', 'The groups are too large',
     'They can swap'], 0,
    'A single bond rotates freely; a double bond does not, so the two arrangements are locked and are different compounds.'),
  concept('u23s-b', 'IDENTIFY STEREOCHEMISTRY', 'What does cis mean?',
    ['The two like groups are on the same side', 'They are on opposite sides',
     'The molecule is branched'], 0,
    'cis: same side. trans: opposite sides.'),
  concept('u23s-c', 'IDENTIFY STEREOCHEMISTRY', 'What does trans mean?',
    ['Same side', 'Opposite sides', 'Either'], 1, 'trans: across, on opposite sides.'),
  concept('u23s-d', 'IDENTIFY STEREOCHEMISTRY', 'Are cis- and trans-but-2-ene the same compound?',
    ['Yes, they interconvert freely', 'No — they are different compounds with different properties',
     'Only above room temperature'], 1,
    'They have the same connectivity but cannot be interconverted without breaking the double bond.'),
  concept('u23s-e', 'IDENTIFY STEREOCHEMISTRY', 'Does but-1-ene have cis and trans forms?',
    ['Yes', 'No — one of its double-bond carbons carries two hydrogens',
     'Only in a ring'], 1,
    'Cis/trans needs each carbon of the double bond to carry two different groups. Two hydrogens on one carbon means there is nothing to distinguish.',
    NO_STEREO[0]),
  STEREO_PAIRS.map((m) => writeName(m, { stereo: true, hint: 'Which side is each group on?' })),
  STEREO_PAIRS.map((m, i) => mcNameFrom(m, others(STEREO_PAIRS, i), { seed: i + 283, stereo: true })),
  NO_STEREO.map((m) => writeName(m)),
  STEREO_PAIRS.map((m) => countCarbons(m)),
  NO_STEREO.map((m) => countCarbons(m)),
  STEREO_PAIRS.map((m) => mcFormula(m, { seed: 37 }))
);

export const POOL_U23L2 = pool(
  concept('u23s-f', 'IDENTIFY STEREOCHEMISTRY', 'When does cis/trans not apply?',
    ['When one double-bond carbon carries two identical groups',
     'When the chain is short', 'It always applies'], 0,
    'If either carbon holds two of the same thing, swapping them changes nothing — there is only one compound.',
    NO_STEREO[2]),
  concept('u23s-g', 'IDENTIFY STEREOCHEMISTRY', 'Does 2-methylprop-1-ene show cis/trans?',
    ['Yes', 'No — one carbon carries two methyls', 'Only at low temperature'], 1,
    'That carbon has two identical groups, so there is nothing to be on opposite sides of.',
    NO_STEREO[2]),
  concept('u23s-h', 'IDENTIFY STEREOCHEMISTRY', 'Does an alkane show cis/trans?',
    ['Yes', 'No — single bonds rotate freely', 'Only for long chains'], 1,
    'Free rotation means the arrangements interconvert, so they are one compound.'),
  concept('u23s-i', 'IDENTIFY STEREOCHEMISTRY', 'What is the test for cis/trans at a double bond?',
    ['Each carbon of the double bond must carry two different groups',
     'The molecule must have four carbons', 'There must be a branch'], 0,
    'Both carbons need two different groups. One pair of identical groups is enough to rule it out.'),
  STEREO_PAIRS.map((m) => writeName(m, { stereo: true })),
  NO_STEREO.map((m) => writeName(m)),
  [...STEREO_PAIRS, ...NO_STEREO].map((m, i, arr) => mcNameFrom(m, others(arr, i), { seed: i + 293, stereo: true })),
  STEREO_PAIRS.map((m) => countCarbons(m))
);

export const POOL_U23L3 = pool(
  concept('u23s-j', 'IDENTIFY STEREOCHEMISTRY', 'Why is E/Z used instead of cis/trans?',
    ['cis/trans fails when the four groups are all different',
     'E/Z is shorter', 'They mean different things'], 0,
    'With four different groups there is no "like pair" to be on the same side, so cis/trans has nothing to refer to.'),
  concept('u23s-k', 'IDENTIFY STEREOCHEMISTRY', 'What does Z mean?',
    ['The higher-priority groups are on the same side', 'On opposite sides', 'Nothing'], 0,
    'Z from zusammen, together. E from entgegen, opposite.'),
  concept('u23s-l', 'IDENTIFY STEREOCHEMISTRY', 'What does E mean?',
    ['Same side', 'The higher-priority groups are on opposite sides', 'Either'], 1,
    'E: entgegen, opposite.'),
  concept('u23s-m', 'IDENTIFY STEREOCHEMISTRY', 'How is priority decided at each carbon?',
    ['By atomic number of the attached atom', 'By size of the group', 'Alphabetically'], 0,
    'Higher atomic number wins. Where the first atoms tie, look at what is attached to them.'),
  concept('u23s-n', 'IDENTIFY STEREOCHEMISTRY', 'In (2E)-but-2-ene, what does E tell you?',
    ['The two methyls are on opposite sides', 'The two methyls are on the same side',
     'There are two double bonds'], 0,
    'The higher-priority group on each carbon — the methyls here — are opposite. That is the same arrangement as trans.',
    EZ_SET[1]),
  concept('u23s-o', 'IDENTIFY STEREOCHEMISTRY', 'Where does the E or Z go in the name?',
    ['In brackets at the front, with the locant', 'At the end', 'It does not appear'], 0,
    '(2E)-but-2-ene: the number says which double bond it describes.'),
  EZ_SET.map((m) => writeName(m, { stereo: true, hint: 'Rank the groups on each carbon, then look at which side the winners are.' })),
  EZ_SET.map((m, i) => mcNameFrom(m, others(EZ_SET, i), { seed: i + 307, stereo: true })),
  STEREO_PAIRS.map((m) => writeName(m, { stereo: true })),
  EZ_SET.map((m) => countCarbons(m))
);

export const POOL_U23CP = pool(
  EZ_SET.map((m) => writeName(m, { stereo: true })),
  STEREO_PAIRS.map((m) => writeName(m, { stereo: true })),
  NO_STEREO.map((m) => writeName(m)),
  [...EZ_SET, ...NO_STEREO].map((m, i, arr) => mcNameFrom(m, others(arr, i), { seed: i + 311, stereo: true })),
  EZ_SET.map((m) => countCarbons(m))
);


// ── Chirality ────────────────────────────────────────────────
// The achiral controls matter as much as the chiral examples: the commonest
// error is assigning a descriptor to a centre that does not have one.
const CHIRAL = molsFor([
  '(R)-butan-2-ol', '(S)-butan-2-ol',
  '(R)-2-chlorobutane', '(S)-2-chlorobutane',
  '(R)-pentan-2-ol', '(S)-pentan-2-ol',
  '(R)-3-methylhexane', '(S)-3-methylhexane',
  '(R)-2-aminopropanoic acid', '(S)-2-aminopropanoic acid',
]);
const ACHIRAL = molsFor([
  'butan-1-ol', 'propan-2-ol', '2-methylpropan-2-ol', 'butane',
  'pentan-3-ol', '2-chloropropane', 'cyclohexane', 'ethanol',
]);
const TWO_CENTRES = molsFor([
  '(2R,3R)-butane-2,3-diol', '(2R,3S)-butane-2,3-diol', '(2S,3S)-butane-2,3-diol',
]);
const CHIRAL_ALL = [...CHIRAL, ...TWO_CENTRES];

export const POOL_U24L1 = pool(
  concept('u24c-a', 'IDENTIFY STEREOCHEMISTRY', 'What makes a carbon a chiral centre?',
    ['It carries four different groups', 'It carries four groups', 'It is at the end of a chain'], 0,
    'Four different groups. Any repeat and the centre is not chiral.',
    CHIRAL[0]),
  concept('u24c-b', 'IDENTIFY STEREOCHEMISTRY', 'How many groups must differ?',
    ['Two', 'Three', 'All four'], 2, 'All four. Two the same is enough to destroy it.'),
  concept('u24c-c', 'IDENTIFY STEREOCHEMISTRY', 'Is butan-1-ol chiral?',
    ['Yes', 'No — carbon 1 carries two hydrogens', 'Only in solution'], 1,
    'Two hydrogens on the same carbon means two identical groups, so no chiral centre.',
    ACHIRAL[0]),
  concept('u24c-d', 'IDENTIFY STEREOCHEMISTRY', 'Is propan-2-ol chiral?',
    ['Yes', 'No — carbon 2 carries two identical methyls', 'Only one form exists'], 1,
    'Carbon 2 holds OH, H and two methyls. Two the same, so it is achiral.',
    ACHIRAL[1]),
  concept('u24c-e', 'IDENTIFY STEREOCHEMISTRY', 'What do the two forms of a chiral molecule look like?',
    ['Mirror images that cannot be superimposed', 'Identical', 'Different formulas'], 0,
    'Like a left and right hand: same parts, opposite arrangement, and no way to lay one on the other.'),
  concept('u24c-f', 'IDENTIFY STEREOCHEMISTRY', 'Is butan-2-ol chiral?',
    ['Yes — carbon 2 carries four different groups', 'No', 'Only above four carbons'], 0,
    'OH, H, methyl and ethyl: four different groups.',
    CHIRAL[0]),
  CHIRAL.map((m) => countCarbons(m)),
  ACHIRAL.map((m) => writeName(m)),
  CHIRAL.map((m) => writeName(m, { stereo: true, hint: 'The centre has a descriptor — R or S.' })),
  CHIRAL.map((m, i) => mcNameFrom(m, others(CHIRAL, i), { seed: i + 317, stereo: true }))
);

export const POOL_U24L2 = pool(
  concept('u24c-g', 'IDENTIFY STEREOCHEMISTRY', 'How do you assign R or S?',
    ['Rank the four groups, point the lowest away, read the circle',
     'Count the carbons', 'Look at the formula'], 0,
    'Rank by atomic number, put the lowest-priority group behind, then read 1→2→3.'),
  concept('u24c-h', 'IDENTIFY STEREOCHEMISTRY', 'Which direction is R?',
    ['Clockwise', 'Anticlockwise', 'Either'], 0, 'R from rectus, right: clockwise.'),
  concept('u24c-i', 'IDENTIFY STEREOCHEMISTRY', 'Which direction is S?',
    ['Clockwise', 'Anticlockwise', 'Either'], 1, 'S from sinister, left: anticlockwise.'),
  concept('u24c-j', 'IDENTIFY STEREOCHEMISTRY', 'Which group is pointed away from you?',
    ['The highest priority', 'The lowest priority', 'The largest'], 1,
    'The lowest — usually a hydrogen. Then the remaining three form the circle you read.'),
  concept('u24c-k', 'IDENTIFY STEREOCHEMISTRY', 'How is priority decided?',
    ['By atomic number of the attached atom', 'By group size', 'Alphabetically'], 0,
    'Higher atomic number wins; where the first atoms tie, compare what is attached to them.'),
  concept('u24c-l', 'IDENTIFY STEREOCHEMISTRY', 'Where does the descriptor go in the name?',
    ['In brackets at the front, with the locant', 'At the end', 'It does not appear'], 0,
    '(2R)-butan-2-ol: the number says which centre it describes.'),
  CHIRAL.map((m) => writeName(m, { stereo: true })),
  CHIRAL.map((m, i) => mcNameFrom(m, others(CHIRAL, i), { seed: i + 331, stereo: true })),
  CHIRAL.map((m) => countCarbons(m)),
  ACHIRAL.map((m) => writeName(m))
);

export const POOL_U24L3 = pool(
  concept('u24c-m', 'IDENTIFY STEREOCHEMISTRY', 'A molecule has two chiral centres. How is it named?',
    ['One descriptor for both', 'A descriptor for each, with its locant', 'No descriptors'], 1,
    '(2R,3S)-butane-2,3-diol: each centre gets its own letter and number.',
    TWO_CENTRES[1]),
  concept('u24c-n', 'IDENTIFY STEREOCHEMISTRY', 'Are (2R,3R) and (2S,3S) forms the same compound?',
    ['Yes', 'No — they are mirror images', 'They have different formulas'], 1,
    'Reversing every centre gives the mirror image, which is a different compound.'),
  concept('u24c-o', 'IDENTIFY STEREOCHEMISTRY', 'Are (2R,3R) and (2R,3S) mirror images?',
    ['Yes', 'No — only one centre differs, so they are not mirror images',
     'Only if both are R'], 1,
    'A mirror image reverses every centre. Changing only one gives a different relationship.'),
  concept('u24c-p', 'IDENTIFY STEREOCHEMISTRY', 'Why does 2-methylpropan-2-ol have no chiral centre?',
    ['Its central carbon carries three identical methyls', 'It is too small', 'It does'], 0,
    'Three the same is more than enough to rule it out.',
    ACHIRAL[2]),
  TWO_CENTRES.map((m) => writeName(m, { stereo: true, hint: 'One descriptor per centre, each with its locant.' })),
  CHIRAL_ALL.map((m, i) => mcNameFrom(m, others(CHIRAL_ALL, i), { seed: i + 337, stereo: true })),
  CHIRAL.map((m) => writeName(m, { stereo: true })),
  ACHIRAL.map((m) => writeName(m)),
  CHIRAL_ALL.map((m) => countCarbons(m))
);

export const POOL_U24CP = pool(
  CHIRAL_ALL.map((m) => writeName(m, { stereo: true })),
  ACHIRAL.map((m) => writeName(m)),
  CHIRAL_ALL.map((m, i) => mcNameFrom(m, others(CHIRAL_ALL, i), { seed: i + 347, stereo: true })),
  CHIRAL_ALL.map((m) => countCarbons(m)),
  ACHIRAL.map((m) => countCarbons(m))
);


// ── Multifunctional molecules ────────────────────────────────
const DIALS_DIONES = molsFor([
  'propanedial', 'butanedial', 'pentanedial',
  'pentane-2,4-dione', 'hexane-2,5-dione',
  'butanedioic acid', 'pentanedioic acid', 'hexanedioic acid',
]);
const OXO_HYDROXY = molsFor([
  '4-oxopentanoic acid', '3-oxobutanal', '4-hydroxybutanal',
  '5-hydroxypentan-2-one', '2-hydroxypropanoic acid', '3-hydroxybutanoic acid',
  '4-hydroxybutanoic acid', '5-hydroxy-4-oxopentanoic acid',
]);
const N_AND_O = molsFor([
  '2-aminoethanoic acid', '2-aminopropanoic acid', '3-aminopropanoic acid',
  '4-aminobutanoic acid', '4-aminobutan-1-ol', '2-aminobutan-1-ol',
  '3-aminopropan-1-ol', '3-aminopropanamide',
]);
const OL_PLUS = molsFor([
  '3-chloropropan-1-ol', '4-bromobutan-1-ol', '4-chlorobutan-1-ol',
  'but-3-en-1-ol', 'pent-4-en-2-ol', '3-methoxypropan-1-ol',
  '3-nitropropan-1-ol', '2-chloroethanol',
]);
const FULL_MULTI = molsFor([
  '4-amino-3-hydroxybutanoic acid', '2-amino-3-hydroxypropanoic acid',
  '3-chloro-4-hydroxybutanoic acid', '5-hydroxy-4-oxopentanoic acid',
]);
const MULTI_ALL = [...OXO_HYDROXY, ...N_AND_O, ...OL_PLUS];

export const POOL_U25L1 = pool(
  concept('u25m-a', 'identify THE group', 'Two aldehydes on one chain give the suffix…',
    ['-dial', '-dione', '-dioic acid'], 0, 'propanedial: one at each end, so no locants are needed.',
    DIALS_DIONES[0]),
  concept('u25m-b', 'identify THE group', 'Two ketones on one chain give…',
    ['-dial', '-dione', '-dioic acid'], 1, 'pentane-2,4-dione, with a locant for each.',
    DIALS_DIONES[3]),
  concept('u25m-c', 'identify THE group', 'Two carboxyl groups give…',
    ['-dial', '-dione', '-dioic acid'], 2, 'butanedioic acid: one at each end of the chain.',
    DIALS_DIONES[5]),
  concept('u25m-d', 'number THE chain', 'Why does propanedial need no locants?',
    ['Aldehydes are always terminal, so both positions are forced', 'It has too few carbons',
     'Locants are optional'], 0,
    'An aldehyde can only sit at an end, and a three-carbon chain has exactly two ends.'),
  concept('u25m-e', 'number THE chain', 'Why does pentane-2,4-dione need locants?',
    ['A ketone can sit at several positions', 'It has more carbons', 'It does not'], 0,
    'Internal carbonyls have a choice of position, so the numbers do real work.'),
  concept('u25m-f', 'identify THE group', 'Does the -e of the parent survive before -dial?',
    ['No, it is always dropped', 'Yes — propane + dial = propanedial',
     'Only for chains above four carbons'], 1,
    'The -e is only dropped before a vowel. -dial begins with a consonant, so it stays.'),
  DIALS_DIONES.map((m) => writeName(m, { hint: 'Two of the same group: di-, and a locant each unless the positions are forced.' })),
  DIALS_DIONES.map((m, i) => mcNameFrom(m, others(DIALS_DIONES, i), { seed: i + 353 })),
  DIALS_DIONES.map((m) => countCarbons(m)),
  DIALS_DIONES.slice(0, 4).map((m) => mcFormula(m, { seed: 41 }))
);

export const POOL_U25L2 = pool(
  concept('u25m-g', 'identify THE group', 'A ketone and a carboxylic acid on one chain. Which takes the suffix?',
    ['The ketone', 'The acid', 'Whichever has the lower locant'], 1,
    'The acid is more senior, so the ketone is demoted to oxo-.',
    OXO_HYDROXY[0]),
  concept('u25m-h', 'identify THE group', 'What prefix does a demoted carbonyl take?',
    ['hydroxy-', 'oxo-', 'carbonyl-'], 1, 'oxo-, with its own locant.'),
  concept('u25m-i', 'identify THE group', 'What prefix does a demoted alcohol take?',
    ['hydroxy-', 'oxo-', 'alkoxy-'], 0, 'hydroxy-.'),
  concept('u25m-j', 'identify THE group', 'In 5-hydroxy-4-oxopentanoic acid, how many groups are reported?',
    ['One', 'Two', 'Three'], 2,
    'An acid at carbon 1, a ketone at 4 and an alcohol at 5 — one suffix and two prefixes.',
    OXO_HYDROXY[7]),
  concept('u25m-k', 'number THE chain', 'Which group sets the numbering when several are present?',
    ['The one taking the suffix', 'The first alphabetically', 'The one nearest an end'], 0,
    'The principal group takes the lowest locant; everything else is numbered around it.'),
  OXO_HYDROXY.map((m) => writeName(m, { hint: 'Senior group takes the suffix and carbon 1; the rest become prefixes.' })),
  OXO_HYDROXY.map((m, i) => mcNameFrom(m, others(OXO_HYDROXY, i), { seed: i + 359 })),
  OXO_HYDROXY.map((m) => countCarbons(m)),
  OL_PLUS.map((m) => writeName(m))
);

export const POOL_U25L3 = pool(
  concept('u25m-l', 'identify THE group', 'An amine and a carboxylic acid on one chain. Which takes the suffix?',
    ['The amine', 'The acid', 'Neither'], 1,
    'The acid outranks the amine, so the amine becomes amino-. That is the amino-acid pattern.',
    N_AND_O[1]),
  concept('u25m-m', 'identify THE group', 'An amine and an alcohol on one chain. Which takes the suffix?',
    ['The amine', 'The alcohol', 'Neither'], 1,
    'The alcohol is more senior, so the amine becomes amino-.',
    N_AND_O[4]),
  concept('u25m-n', 'identify THE group', 'What is 2-aminoethanoic acid better known as?',
    ['glycine', 'alanine', 'serine'], 0, 'Glycine, the simplest amino acid.',
    N_AND_O[0]),
  concept('u25m-o', 'identify THE group', 'Why are amino acids named as acids rather than amines?',
    ['The acid is the more senior group', 'They contain more oxygen', 'It is arbitrary'], 0,
    'The carboxylic acid takes the suffix, so the name ends in -oic acid and the amine is a prefix.'),
  concept('u25m-p', 'number THE chain', 'In 2-aminopropanoic acid, which carbon is number 1?',
    ['The carboxyl carbon', 'The carbon carrying the amine', 'Either'], 0,
    'The acid is the principal group, so it takes carbon 1 and the amine is numbered from there.',
    N_AND_O[1]),
  N_AND_O.map((m) => writeName(m, { hint: 'Rank the groups first: the winner takes the suffix.' })),
  N_AND_O.map((m, i) => mcNameFrom(m, others(N_AND_O, i), { seed: i + 367 })),
  N_AND_O.map((m) => countCarbons(m)),
  FULL_MULTI.map((m) => writeName(m))
);

export const POOL_U25L4 = pool(
  concept('u25m-q', 'identify THE group', 'What is the first step in naming any multifunctional molecule?',
    ['Count the carbons', 'Find the most senior group', 'Number from the left'], 1,
    'Seniority decides the suffix, and the suffix decides the numbering.'),
  concept('u25m-r', 'identify THE group', 'What is the second step?',
    ['Choose the parent chain, containing that group', 'Number the chain', 'List the prefixes'], 0,
    'The parent chain must contain the principal group — that constraint beats "longest chain".'),
  concept('u25m-s', 'number THE chain', 'What is the third step?',
    ['Number so the principal group gets the lowest locant', 'Number from the left', 'Number alphabetically'], 0,
    'Then everything else takes whatever number falls out.'),
  concept('u25m-t', 'identify THE group', 'What is the last step?',
    ['Cite the remaining groups as prefixes, alphabetically', 'Count the hydrogens', 'Add the formula'], 0,
    'Every other group becomes a prefix, listed alphabetically with its locant.'),
  concept('u25m-u', 'identify THE group', 'In 4-amino-3-hydroxybutanoic acid, which group took the suffix?',
    ['The amine', 'The alcohol', 'The acid'], 2,
    'The acid is the most senior. Both the amine and the alcohol are prefixes, cited alphabetically.',
    FULL_MULTI[0]),
  concept('u25m-v', 'identify THE group', 'Why is amino- written before hydroxy- in that name?',
    ['Amines are more senior', 'Prefixes are alphabetical and a comes before h',
     'It has a lower locant'], 1,
    'Seniority chooses the suffix; alphabetical order arranges the prefixes.'),
  FULL_MULTI.map((m) => writeName(m, { hint: 'Senior group first, then the parent, then the numbering, then the prefixes.' })),
  MULTI_ALL.map((m) => writeName(m)),
  MULTI_ALL.map((m, i) => mcNameFrom(m, others(MULTI_ALL, i), { seed: i + 373 })),
  MULTI_ALL.map((m) => countCarbons(m))
);

export const POOL_U25CP = pool(
  MULTI_ALL.map((m) => writeName(m)),
  DIALS_DIONES.map((m) => writeName(m)),
  FULL_MULTI.map((m) => writeName(m)),
  MULTI_ALL.map((m, i) => mcNameFrom(m, others(MULTI_ALL, i), { seed: i + 379 })),
  MULTI_ALL.map((m) => countCarbons(m))
);


// ── Aromatic functional groups ───────────────────────────────
// The point of this unit: on a substituted aromatic the RETAINED name fixes
// carbon 1, so numbering is anchored rather than chosen.
const AR_PHENOLS = molsFor([
  '2-chlorophenol', '3-chlorophenol', '4-chlorophenol',
  '2-nitrophenol', '3-nitrophenol', '4-nitrophenol',
  '2-methylphenol', '3-methylphenol', '4-methylphenol', '2-aminophenol',
]);
const AR_ANILINES = molsFor([
  '2-chloroaniline', '3-chloroaniline', '4-chloroaniline',
  '4-nitroaniline', '2-methylaniline', '4-methylaniline',
]);
const AR_ACIDS = molsFor([
  '2-methylbenzoic acid', '3-methylbenzoic acid', '4-methylbenzoic acid',
  '2-hydroxybenzoic acid', '4-chlorobenzoic acid', '4-nitrobenzoic acid',
  '4-chlorobenzaldehyde', '2-chlorobenzaldehyde',
]);
const AR_SUB_ALL = [...AR_PHENOLS, ...AR_ANILINES, ...AR_ACIDS];

export const POOL_U26L1 = pool(
  concept('u26a-a', 'number THE chain', 'In 2-chlorophenol, which carbon is number 1?',
    ['The one carrying the -OH', 'The one carrying the chlorine', 'Either'], 0,
    'The retained name phenol fixes the hydroxyl at carbon 1; everything else is numbered from there.',
    AR_PHENOLS[0]),
  concept('u26a-b', 'number THE chain', 'Why does the naming group anchor carbon 1?',
    ['It is the principal group, so it takes the lowest locant',
     'It is alphabetically first', 'It is arbitrary'], 0,
    'Exactly as on a chain: the principal group takes carbon 1 and the ring is numbered around it.'),
  concept('u26a-c', 'identify THE group', 'A chlorine on aniline gives…',
    ['chloroaniline', 'chlorobenzeneamine', 'anilinochloride'], 0,
    'The retained parent stays, and the substituent is a prefix on it.',
    AR_ANILINES[0]),
  concept('u26a-d', 'number THE chain', 'Which direction do you count round the ring?',
    ['The way that gives the lowest set of locants', 'Always clockwise', 'Always left'], 0,
    'Once carbon 1 is fixed by the naming group, you count whichever way gives the lower numbers.'),
  concept('u26a-e', 'identify THE group', 'What is 2-hydroxybenzoic acid better known as?',
    ['salicylic acid', 'benzoic alcohol', 'phenolic acid'], 0,
    'Salicylic acid — the basis of aspirin. The carboxyl is senior, so the alcohol is a prefix.',
    AR_ACIDS[3]),
  AR_SUB_ALL.map((m) => writeName(m, { hint: 'The retained parent fixes carbon 1; number round from there.' })),
  AR_SUB_ALL.map((m, i) => mcNameFrom(m, others(AR_SUB_ALL, i), { seed: i + 383 })),
  AR_SUB_ALL.map((m) => countCarbons(m))
);

export const POOL_U26L2 = pool(
  concept('u26a-f', 'identify THE group', 'Two groups on a ring, one senior. Which is the parent?',
    ['The senior group decides the parent name', 'The larger group', 'Either'], 0,
    'A carboxyl beats a hydroxyl, so the parent is benzoic acid and the alcohol becomes hydroxy-.',
    AR_ACIDS[3]),
  concept('u26a-g', 'number THE chain', 'In 4-nitroaniline, where is the nitro group?',
    ['Directly opposite the -NH2', 'Next to the -NH2', 'On the -NH2'], 0,
    'Carbon 4 is across the ring from carbon 1.',
    AR_ANILINES[3]),
  concept('u26a-h', 'identify THE group', 'Can a nitro group be the parent of an aromatic name?',
    ['Yes, on a ring it can', 'No — it is prefix-only wherever it appears',
     'Only when there are two'], 1,
    'Nitro has no suffix form on a ring any more than on a chain.'),
  concept('u26a-i', 'number THE chain', 'Why is 6-chlorophenol not a correct name?',
    ['Counting the other way gives 2-chlorophenol', 'Phenol has only four carbons',
     'Chlorine cannot sit there'], 0,
    'Carbon 1 is fixed by the -OH, and you count round whichever way is lower.'),
  AR_SUB_ALL.map((m) => writeName(m)),
  AR_SUB_ALL.map((m, i) => mcNameFrom(m, others(AR_SUB_ALL, i), { seed: i + 389 })),
  AR_SUB_ALL.map((m) => countCarbons(m)),
  AR_PHENOLS.slice(0, 4).map((m) => mcFormula(m, { seed: 43 }))
);

export const POOL_U26CP = pool(
  AR_SUB_ALL.map((m) => writeName(m)),
  AR_SUB_ALL.map((m, i) => mcNameFrom(m, others(AR_SUB_ALL, i), { seed: i + 397 })),
  AR_SUB_ALL.map((m) => countCarbons(m))
);

// ── Complex substituents ─────────────────────────────────────
const BRANCHY = molsFor([
  '2,3-dimethylbutane', '2,2-dimethylbutane', '2,2,4-trimethylpentane',
  '3-ethyl-2,2-dimethylpentane', '2,2,3-trimethylbutane', '3,3-dimethylpentane',
  '2,3,4-trimethylpentane', '4-(2-methylpropyl)heptane', '3-ethyl-2-methylpentane',
  '2,2-dimethylpropane', '2,3-dimethylpentane',
]);
const BRANCHED_RINGS = molsFor(['propan-2-ylcyclohexane', 'propan-2-ylbenzene']);
const COMPLEX_ALL = [...BRANCHY, ...BRANCHED_RINGS];

export const POOL_U27L1 = pool(
  concept('u27c-a', 'identify THE group', 'A branch that is itself branched is written…',
    ['in brackets, named as its own little chain', 'as a single letter', 'ignored'], 0,
    '4-(2-methylpropyl)heptane: the substituent is named in full and bracketed.',
    BRANCHY[7]),
  concept('u27c-b', 'identify THE group', 'Where does numbering of a substituent start?',
    ['At the atom attached to the parent chain', 'At its far end', 'Anywhere'], 0,
    'Carbon 1 of a substituent is always its point of attachment.'),
  concept('u27c-c', 'identify THE group', 'What is the systematic name for an isopropyl group?',
    ['propan-2-yl', 'propyl', '2-methylethyl'], 0,
    'propan-2-yl: a three-carbon group attached through its middle carbon.',
    BRANCHED_RINGS[0]),
  concept('u27c-d', 'identify THE group', 'How are bracketed substituents alphabetised?',
    ['By the first letter of the complete substituent name', 'By the bracket', 'By size'], 0,
    '(2-methylpropyl) alphabetises under m.'),
  concept('u27c-e', 'number THE chain', 'Two chains of equal length. Which is the parent?',
    ['The one with more substituents', 'The shorter one', 'Either'], 0,
    'When the longest chain is a tie, the one carrying more substituents wins.'),
  COMPLEX_ALL.map((m) => writeName(m, { hint: 'Longest chain first; a branched branch goes in brackets.' })),
  COMPLEX_ALL.map((m, i) => mcNameFrom(m, others(COMPLEX_ALL, i), { seed: i + 401 })),
  COMPLEX_ALL.map((m) => countCarbons(m))
);

export const POOL_U27L2 = pool(
  concept('u27c-f', 'number THE chain', 'In 2,2,4-trimethylpentane, what does 2,2 mean?',
    ['Two methyls on the same carbon', 'Two methyls on adjacent carbons', 'A mistake'], 0,
    'A carbon can carry two substituents, and each still gets its own locant.',
    BRANCHY[2]),
  concept('u27c-g', 'number THE chain', 'Which set of locants is preferred: 2,2,4 or 2,4,4?',
    ['2,2,4', '2,4,4', 'either'], 0,
    'Compare term by term: the first difference decides, and 2 beats 4.'),
  concept('u27c-h', 'identify THE group', 'Can one carbon carry two branches?',
    ['Yes', 'No', 'Only in a ring'], 0,
    'A carbon has four bonds; two to the chain and two to branches is perfectly possible.',
    BRANCHY[1]),
  concept('u27c-i', 'number THE chain', 'How do you compare two locant sets?',
    ['Term by term, first difference wins', 'By their total', 'By their largest number'], 0,
    'Not by the sum. 2,2,5 beats 2,3,4 even though it totals more.'),
  COMPLEX_ALL.map((m) => writeName(m)),
  COMPLEX_ALL.map((m, i) => mcNameFrom(m, others(COMPLEX_ALL, i), { seed: i + 409 })),
  COMPLEX_ALL.map((m) => countCarbons(m)),
  BRANCHY.slice(0, 5).map((m) => drawIt(m))
);

export const POOL_U27CP = pool(
  COMPLEX_ALL.map((m) => writeName(m)),
  COMPLEX_ALL.map((m, i) => mcNameFrom(m, others(COMPLEX_ALL, i), { seed: i + 419 })),
  COMPLEX_ALL.map((m) => countCarbons(m)),
  BRANCHY.slice(0, 5).map((m) => drawIt(m))
);

// ── Polycyclic and heterocyclic ──────────────────────────────
const BICYCLICS = molsFor([
  'bicyclo[2.2.1]heptane', 'bicyclo[2.2.2]octane', 'bicyclo[3.2.1]octane',
  'bicyclo[4.4.0]decane', 'bicyclo[3.3.0]octane', 'bicyclo[2.1.0]pentane',
]);
const SPIROS = molsFor(['spiro[4.5]decane', 'spiro[3.3]heptane', 'spiro[2.2]pentane', 'spiro[4.4]nonane']);
const FUSED = molsFor(['naphthalene', 'indole', 'quinoline']);
const HETERO = molsFor([
  'pyridine', 'furan', 'thiophene', 'pyrrole', 'piperidine',
  'pyrimidine', 'imidazole', 'oxazole', 'thiazole',
]);
const POLY_ALL = [...BICYCLICS, ...SPIROS, ...FUSED];

export const POOL_U28L1 = pool(
  concept('u28p-a', 'IDENTIFY THE MOLECULE TYPE', 'What does bicyclo mean?',
    ['Two rings sharing more than one atom', 'Two separate rings', 'A ring with two branches'], 0,
    'Two rings fused or bridged, so they share atoms.',
    BICYCLICS[0]),
  concept('u28p-b', 'IDENTIFY THE MOLECULE TYPE', 'What do the numbers in bicyclo[2.2.1] count?',
    ['The carbons in each bridge, largest first', 'The rings', 'The substituents'], 0,
    'Three bridges between the two shared atoms, counted in descending order.'),
  concept('u28p-c', 'count THE carbons', 'How many carbons does bicyclo[2.2.1]heptane have?',
    ['6', '7', '8'], 1, 'hept- says seven: 2 + 2 + 1 bridge carbons, plus the two bridgeheads.',
    BICYCLICS[0]),
  concept('u28p-d', 'IDENTIFY THE MOLECULE TYPE', 'What makes a spiro compound different?',
    ['Its two rings share exactly one atom', 'Its rings share two atoms', 'It has three rings'], 0,
    'One shared atom for spiro; two or more for bicyclo.',
    SPIROS[0]),
  concept('u28p-e', 'IDENTIFY THE MOLECULE TYPE', 'How many atoms do the rings of naphthalene share?',
    ['1', '2', '3'], 1, 'Two — the rings are fused along a shared bond.',
    FUSED[0]),
  POLY_ALL.map((m) => writeName(m, { hint: 'Count the bridges, largest first, then the total carbons.' })),
  POLY_ALL.map((m, i) => mcNameFrom(m, others(POLY_ALL, i), { seed: i + 421 })),
  POLY_ALL.map((m) => countCarbons(m))
);

export const POOL_U28L2 = pool(
  concept('u28p-f', 'IDENTIFY THE MOLECULE TYPE', 'What is a heterocycle?',
    ['A ring containing an atom other than carbon', 'A ring with two double bonds',
     'A ring with a branch'], 0,
    'Nitrogen, oxygen or sulfur in place of a ring carbon.',
    HETERO[0]),
  concept('u28p-g', 'IDENTIFY THE MOLECULE TYPE', 'Pyridine is benzene with one carbon replaced by…',
    ['nitrogen', 'oxygen', 'sulfur'], 0, 'C5H5N: a nitrogen in the ring.',
    HETERO[0]),
  concept('u28p-h', 'IDENTIFY THE MOLECULE TYPE', 'Which contains oxygen in the ring?',
    ['furan', 'pyrrole', 'thiophene'], 0, 'furan has oxygen; pyrrole nitrogen; thiophene sulfur.',
    HETERO[1]),
  concept('u28p-i', 'IDENTIFY THE MOLECULE TYPE', 'Which contains sulfur in the ring?',
    ['furan', 'pyrrole', 'thiophene'], 2, 'thio- signals sulfur, as it does in thiols.',
    HETERO[2]),
  concept('u28p-j', 'IDENTIFY THE MOLECULE TYPE', 'How many nitrogens does pyrimidine have?',
    ['1', '2', '3'], 1, 'Two, and it is one of the bases in DNA.',
    HETERO[5]),
  concept('u28p-k', 'IDENTIFY THE MOLECULE TYPE', 'Are heterocycle names systematic?',
    ['Yes, all of them', 'No — most are retained names to be learnt',
     'Only the five-membered ones'], 1,
    'pyridine, furan, thiophene and the rest are retained names.'),
  HETERO.map((m) => writeName(m, { hint: 'These are retained names — learn them by their ring atom.' })),
  HETERO.map((m, i) => mcNameFrom(m, others(HETERO, i), { seed: i + 431 })),
  HETERO.map((m) => countCarbons(m)),
  POLY_ALL.map((m) => writeName(m))
);

export const POOL_U28CP = pool(
  POLY_ALL.map((m) => writeName(m)),
  HETERO.map((m) => writeName(m)),
  [...POLY_ALL, ...HETERO].map((m, i, arr) => mcNameFrom(m, others(arr, i), { seed: i + 433 })),
  [...POLY_ALL, ...HETERO].map((m) => countCarbons(m))
);


// ── Acid anhydrides ──────────────────────────────────────────
const ANHYDRIDES = molsFor([
  'methanoic anhydride', 'ethanoic anhydride', 'propanoic anhydride',
  'butanoic anhydride', 'pentanoic anhydride', 'hexanoic anhydride',
]);
// the four acid derivatives side by side — what the unit is really about
// Amides come later in the pathway, so the contrast set here is limited to
// the derivatives already taught.
const DERIVATIVES = molsFor([
  'ethanoic acid', 'ethanoyl chloride', 'methyl ethanoate',
  'propanoic acid', 'propanoyl chloride', 'methyl propanoate',
  'butanoic acid', 'butanoyl chloride', 'methyl butanoate',
]);

export const POOL_U29L1 = pool(
  concept('u29h-a', 'identify THE group', 'What is an acid anhydride?',
    ['Two carbonyls sharing one bridging oxygen', 'A carbonyl with two oxygens',
     'Two acids side by side'], 0,
    'Two acyl groups joined through a single oxygen: C(=O)-O-C(=O).',
    ANHYDRIDES[1]),
  concept('u29h-b', 'identify THE group', 'Which suffix marks an anhydride?',
    ['-oic anhydride', '-anhydride', '-oyl oxide'], 0, 'ethanoic anhydride.'),
  concept('u29h-c', 'count THE bonds', 'How many carbonyls does an anhydride contain?',
    ['1', '2', '3'], 1, 'Two, one on each side of the bridging oxygen.',
    ANHYDRIDES[1]),
  concept('u29h-d', 'IDENTIFY THE MOLECULE TYPE', 'What tells an anhydride apart from an ester?',
    ['The anhydride has a carbonyl on both sides of the bridging oxygen',
     'The ester has more oxygens', 'Nothing'], 0,
    'An ester has one carbonyl and a plain chain across the bridge; an anhydride has a carbonyl on each side.'),
  concept('u29h-e', 'identify THE group', 'Where does an anhydride sit on the priority ladder?',
    ['Above the acid', 'Below the ester', 'Between the acid and the ester'], 2,
    'Anhydrides rank just below carboxylic acids and above esters.'),
  concept('u29h-f', 'count THE carbons', 'How many carbons does ethanoic anhydride have?',
    ['2', '3', '4'], 2, 'Two acyl groups of two carbons each: C4H6O3.',
    ANHYDRIDES[1]),
  ANHYDRIDES.map((m) => writeName(m, { hint: 'Name the acid it came from, then replace acid with anhydride.' })),
  ANHYDRIDES.map((m, i) => mcNameFrom(m, others(ANHYDRIDES, i), { seed: i + 439 })),
  ANHYDRIDES.map((m) => countCarbons(m)),
  ANHYDRIDES.map((m) => mcFormula(m, { seed: 47 }))
);

export const POOL_U29L2 = pool(
  concept('u29h-g', 'IDENTIFY THE MOLECULE TYPE', 'What do the acid derivatives share?',
    ['A carbonyl carbon carrying a second heteroatom', 'Two carbonyls', 'A ring'], 0,
    'Acid, acyl halide, ester and anhydride are all a carbonyl plus something else on that carbon.'),
  concept('u29h-h', 'IDENTIFY THE MOLECULE TYPE', 'A carbonyl with -OH is a…',
    ['carboxylic acid', 'ester', 'amide'], 0, 'The carboxyl group.',
    DERIVATIVES[0]),
  concept('u29h-i', 'IDENTIFY THE MOLECULE TYPE', 'A carbonyl with -Cl is a…',
    ['carboxylic acid', 'acyl chloride', 'ester'], 1, 'The halogen sits where the -OH was.',
    DERIVATIVES[1]),
  concept('u29h-j', 'IDENTIFY THE MOLECULE TYPE', 'A carbonyl with -OH is a…',
    ['acyl chloride', 'carboxylic acid', 'ester'], 1, 'The carboxyl group.',
    DERIVATIVES[0]),
  concept('u29h-k', 'IDENTIFY THE MOLECULE TYPE', 'A carbonyl bridging by -O- to a chain is a…',
    ['ester', 'ether', 'anhydride'], 0, 'An ester — the bridge leads to a plain carbon chain.',
    DERIVATIVES[2]),
  concept('u29h-l', 'IDENTIFY THE MOLECULE TYPE', 'A carbonyl bridging by -O- to another carbonyl is a…',
    ['ester', 'ether', 'anhydride'], 2, 'Two carbonyls sharing one oxygen.',
    ANHYDRIDES[1]),
  DERIVATIVES.map((m) => writeName(m)),
  DERIVATIVES.map((m, i) => mcNameFrom(m, others(DERIVATIVES, i), { seed: i + 443 })),
  ANHYDRIDES.map((m) => writeName(m)),
  DERIVATIVES.map((m) => countCarbons(m))
);

export const POOL_U29CP = pool(
  ANHYDRIDES.map((m) => writeName(m)),
  DERIVATIVES.map((m) => writeName(m)),
  [...ANHYDRIDES, ...DERIVATIVES].map((m, i, arr) => mcNameFrom(m, others(arr, i), { seed: i + 449 })),
  [...ANHYDRIDES, ...DERIVATIVES].map((m) => countCarbons(m))
);

// ── Mastery review ───────────────────────────────────────────
// Draws on every catalogue in this file. The value of a mixed pool is that
// the learner no longer knows which family is coming, which is the condition
// an exam actually tests.
const EVERY_FAMILY = [
  ...ALKENES.slice(0, 3), ...ALKYNES.slice(0, 3),
  ...HALIDES.slice(0, 3), ...ALCOHOLS.slice(0, 3),
  ...ALDEHYDES.slice(0, 3), ...KETONES.slice(0, 3),
  ...ACIDS.slice(0, 3), ...ESTERS.slice(0, 3),
  ...AMINES.slice(0, 3), ...AMIDES.slice(0, 2), ...NITRILES.slice(0, 2),
  ...ETHERS.slice(0, 2), ...ACYL_HALIDES.slice(0, 2), ...NITROS.slice(0, 2),
  ...CYCLOALKANES.slice(0, 2), ...AROMATICS.slice(0, 3),
];
const EVERY_TRAP = [
  ...CARBONYL_PRIORITY,        // demotion
  ...OXO_HYDROXY.slice(0, 4),  // two prefixes
  ...N_AND_O.slice(0, 3),      // amino acids
  ...DIALS_DIONES.slice(0, 3), // repeated groups
  ...ISOMER_FAMILIES.slice(0, 6),
  ...BRANCHY.slice(0, 4),      // locant sets
];
const MASTERY_ALL = [...EVERY_FAMILY, ...EVERY_TRAP];

export const POOL_U30L1 = pool(
  concept('u30r-a', 'identify THE group', 'Step 1 of naming anything:',
    ['Count the carbons', 'Find the most senior group', 'Number from the left'], 1,
    'Seniority decides the suffix, and the suffix decides everything after it.'),
  concept('u30r-b', 'identify THE group', 'Step 2:',
    ['Choose the longest chain containing that group', 'Choose the longest chain',
     'Choose any chain'], 0,
    '"Longest chain" is subject to containing the principal group — that constraint wins.'),
  concept('u30r-c', 'number THE chain', 'Step 3:',
    ['Number for the principal group\'s lowest locant', 'Number from the left',
     'Number alphabetically'], 0,
    'Everything else takes whatever number falls out.'),
  concept('u30r-d', 'identify THE group', 'Step 4:',
    ['Cite the rest as prefixes, alphabetically', 'Add the formula', 'Count the hydrogens'], 0,
    'Alphabetical order arranges the prefixes; seniority never does.'),
  concept('u30r-e', 'identify THE group', 'Which of these can never take a suffix?',
    ['an alcohol', 'a halogen', 'a ketone'], 1,
    'Halogens, alkyl branches, nitro and alkoxy groups are prefix-only.'),
  concept('u30r-f', 'count THE carbons', 'Which carbons are counted in the parent chain?',
    ['Only the plain ones', 'Every carbon in the chain, including any carbonyl or nitrile carbon',
     'Only those with hydrogens'], 1,
    'The carbonyl carbon of an acid, and the nitrile carbon, are part of the chain — a common slip.'),
  EVERY_FAMILY.map((m) => writeName(m)),
  EVERY_FAMILY.map((m, i) => mcNameFrom(m, others(EVERY_FAMILY, i), { seed: i + 457 })),
  EVERY_FAMILY.map((m) => countCarbons(m))
);

export const POOL_U30L2 = pool(
  concept('u30r-g', 'IDENTIFY THE MOLECULE TYPE', 'A name ends in -al. Which family?',
    ['aldehyde', 'ketone', 'alcohol'], 0, '-al is an aldehyde; -ol an alcohol; -one a ketone.'),
  concept('u30r-h', 'IDENTIFY THE MOLECULE TYPE', 'A name ends in -oate. Which family?',
    ['carboxylic acid', 'ester', 'amide'], 1, '-oate is an ester; -oic acid is the acid.'),
  concept('u30r-i', 'identify THE group', 'A name contains oxo-. What is present?',
    ['A demoted aldehyde or ketone', 'An alcohol', 'An ether'], 0,
    'oxo- is a carbonyl that lost the suffix to something more senior.'),
  concept('u30r-j', 'identify THE group', 'A name contains hydroxy-. What is present?',
    ['A demoted alcohol', 'A ketone', 'An acid'], 0, 'An alcohol that lost the suffix.'),
  concept('u30r-k', 'count THE carbons', 'Ethanenitrile has how many carbons?',
    ['1', '2', '3'], 1, 'Two — the nitrile carbon counts, which is the classic trap.'),
  concept('u30r-l', 'IDENTIFY THE MOLECULE TYPE', 'CnH2n could be…',
    ['an alkane', 'an alkene or a cycloalkane', 'an alcohol'], 1,
    'A ring and a double bond cost the same two hydrogens.'),
  EVERY_TRAP.map((m) => writeName(m)),
  EVERY_TRAP.map((m, i) => mcNameFrom(m, others(EVERY_TRAP, i), { seed: i + 461 })),
  MASTERY_ALL.map((m) => countCarbons(m))
);

export const POOL_U30CP = pool(
  MASTERY_ALL.map((m) => writeName(m)),
  MASTERY_ALL.map((m, i) => mcNameFrom(m, others(MASTERY_ALL, i), { seed: i + 463 })),
  MASTERY_ALL.map((m) => countCarbons(m)),
  EVERY_FAMILY.slice(0, 8).map((m) => drawIt(m))
);


// ── Counting isomers ─────────────────────────────────────────
// The exam skill this supports is enumeration: given a formula, how many
// distinct compounds are there, and can you draw them all without repeating
// yourself. The counts below are the published ones and are checked against
// the app's own enumeration in tests/isomers.test.mjs.
const C4_ISOMERS = molsFor(['butane', '2-methylpropane']);
const C5_ISOMERS = molsFor(['pentane', '2-methylbutane', '2,2-dimethylpropane']);
const C6_ISOMERS = molsFor([
  'hexane', '2-methylpentane', '3-methylpentane', '2,2-dimethylbutane', '2,3-dimethylbutane',
]);
const C7_ISOMERS = molsFor([
  'heptane', '2-methylhexane', '3-methylhexane', '3-ethylpentane',
  '2,2-dimethylpentane', '2,3-dimethylpentane', '2,4-dimethylpentane',
  '3,3-dimethylpentane', '2,2,3-trimethylbutane',
]);
const ALL_ISOMERS = [...C4_ISOMERS, ...C5_ISOMERS, ...C6_ISOMERS, ...C7_ISOMERS];

export const POOL_U31L1 = pool(
  concept('u31i-a', 'IDENTIFY THE MOLECULE TYPE', 'How many isomers does C4H10 have?',
    ['1', '2', '3'], 1, 'butane and 2-methylpropane.'),
  concept('u31i-b', 'IDENTIFY THE MOLECULE TYPE', 'How many isomers does C5H12 have?',
    ['2', '3', '4'], 1, 'pentane, 2-methylbutane and 2,2-dimethylpropane.'),
  concept('u31i-c', 'IDENTIFY THE MOLECULE TYPE', 'How many isomers does C6H14 have?',
    ['4', '5', '6'], 1, 'hexane, two methylpentanes and two dimethylbutanes.'),
  concept('u31i-d', 'IDENTIFY THE MOLECULE TYPE', 'What makes the count grow so quickly?',
    ['More carbons means more ways to branch', 'More hydrogens', 'Nothing — it grows steadily'], 0,
    'C4 has 2, C7 has 9, C10 has 75. Each extra carbon multiplies the arrangements.'),
  concept('u31i-e', 'IDENTIFY THE MOLECULE TYPE', 'How do you know two drawings are the same isomer?',
    ['They look alike', 'They produce the same IUPAC name', 'They have the same formula'], 1,
    'Same formula only means they are isomers. Same name means they are the same compound.'),
  concept('u31i-f', 'IDENTIFY THE MOLECULE TYPE', 'Is 2-methylbutane an isomer of pentane?',
    ['Yes — same formula, different structure', 'No, they are the same', 'No, different formulas'], 0,
    'Both are C5H12.'),
  ALL_ISOMERS.map((m) => writeName(m)),
  ALL_ISOMERS.map((m, i) => mcNameFrom(m, others(ALL_ISOMERS, i), { seed: i + 467 })),
  ALL_ISOMERS.map((m) => countCarbons(m)),
  [...C5_ISOMERS, ...C6_ISOMERS].map((m) => mcFormula(m, { seed: 53 }))
);

export const POOL_U31L2 = pool(
  concept('u31i-g', 'IDENTIFY THE MOLECULE TYPE', 'The longest chain in an isomer of C6H14 could be…',
    ['only 6', '4, 5 or 6', 'any length'], 1,
    'hexane has 6, the methylpentanes 5, the dimethylbutanes 4. Branching shortens the parent.'),
  concept('u31i-h', 'IDENTIFY THE MOLECULE TYPE', 'Why is "4-methylpentane" not a sixth isomer of C6H14?',
    ['It is 2-methylpentane numbered from the wrong end', 'It has too many carbons',
     'It is not an alkane'], 0,
    'Two names for one compound is not two compounds. The correct name identifies exactly one.'),
  concept('u31i-i', 'IDENTIFY THE MOLECULE TYPE', 'Why is "2-ethylbutane" not an isomer of C6H14?',
    ['It is 3-methylpentane named incorrectly', 'It has seven carbons',
     'Ethyl groups are not allowed'], 0,
    'The longest chain there is five carbons, not four — so it is 3-methylpentane.'),
  concept('u31i-j', 'IDENTIFY THE MOLECULE TYPE', 'A systematic way to find them all is…',
    ['guess until you stop finding new ones',
     'start with the longest chain, then shorten it by one and branch',
     'draw them at random'], 1,
    'Longest chain first, then shorten and place branches methodically. Guessing misses some and repeats others.'),
  ALL_ISOMERS.map((m) => writeName(m)),
  C7_ISOMERS.map((m, i) => mcNameFrom(m, others(C7_ISOMERS, i), { seed: i + 479 })),
  ALL_ISOMERS.map((m) => countCarbons(m)),
  C6_ISOMERS.map((m) => drawIt(m, { hint: 'Longest chain first, then place the branches.' }))
);

export const POOL_U31CP = pool(
  ALL_ISOMERS.map((m) => writeName(m)),
  ALL_ISOMERS.map((m, i) => mcNameFrom(m, others(ALL_ISOMERS, i), { seed: i + 487 })),
  ALL_ISOMERS.map((m) => countCarbons(m)),
  C6_ISOMERS.map((m) => drawIt(m)),
  [...C5_ISOMERS, ...C6_ISOMERS].map((m) => mcFormula(m, { seed: 59 }))
);
