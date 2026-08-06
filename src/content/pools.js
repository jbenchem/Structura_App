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
  pool,
} from './questionFactory';

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const bent = (n) => bentChain(n, Math.ceil(n / 2));
const others = (list, i) => list.filter((_, k) => k !== i);

// Hand-written questions about a rule rather than a molecule. The answer index
// is the only thing in this file not derived from the engine.
const concept = (id, chip, prompt, options, answer, explain, mol, showCarbons) => ({
  id,
  type: 'mcName',
  chip,
  prompt,
  options,
  answer,
  explain,
  mol,
  showCarbons: !!showCarbons,
});

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
  concept('u1l1-a', 'COUNT THE BONDS', 'How many bonds does the carbon atom form here?',
    ['2', '3', '4', 'It varies'], 2,
    'Four lines leave the carbon. That is always the count — never three, never five.',
    METHANE, true),
  concept('u1l1-b', 'COUNT THE BONDS', 'How many bonds does each hydrogen form here?',
    ['1', '2', '3', '4'], 0,
    'One line each. A hydrogen can only ever sit at the end of a bond, never in the middle of a chain.',
    METHANE, true),
  concept('u1l1-c', 'COUNT THE BONDS', 'How many bonds does the oxygen atom form here?',
    ['1', '2', '3', '4'], 1,
    'Two lines leave the oxygen — the count for its whole column.',
    WATER, true),
  concept('u1l1-d', 'COUNT THE BONDS', 'How many bonds does the nitrogen atom form here?',
    ['1', '2', '3', '4'], 2,
    'Three lines leave the nitrogen.',
    AMMONIA, true),
  concept('u1l1-e', 'COUNT THE BONDS', 'How many bonds does the chlorine atom form here?',
    ['1', '2', '3', '4'], 0,
    'One — the halogens take a single bond, exactly like the hydrogen they replace.',
    CHLOROMETHANE, true)
);


export const POOL_U1L2 = pool(
  concept('u1l2-a', 'READ THE DRAWING', 'In a skeletal drawing, what sits at each corner of the zigzag?',
    ['A hydrogen atom', 'A carbon atom', 'Nothing — it is just a bend'], 1,
    'Every corner and every line end is a carbon.',
    straightChain(5)),
  concept('u1l2-b', 'COUNT THE HYDROGENS',
    'This carbon has two carbon neighbours. How many hydrogens does it hold?',
    ['1', '2', '3', '4'], 1,
    'Two neighbours use two of its four bonds, leaving two: a CH2 group.',
    carbonWithNeighbours(2), true),
  concept('u1l2-c', 'COUNT THE HYDROGENS',
    'This carbon has one carbon neighbour. How many hydrogens does it hold?',
    ['1', '2', '3', '4'], 2,
    'One neighbour leaves three bonds free: a CH3 group.',
    carbonWithNeighbours(1), true),
  tapCarbons(straightChain(5)),
  countCarbons(bentChain(7, 4)) // the bend is what people miscount
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
  concept('u1l4-a', 'NAME THE STRUCTURE', 'What does the -ane ending tell you?',
    ['How many carbons there are', 'That every carbon-carbon bond is single', 'That the chain is branched'], 1,
    'The root carries the count; the ending carries the bond type.'),
  concept('u1l4-b', 'NAME THE STRUCTURE', 'A chain of seven carbons, all single bonds, is called…',
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
  range(1, 8).map((n) => drawIt(straightChain(n))),
  range(1, 10).map((n) => mcStructure(n, { seed: n + 41 })),
  range(2, 10).map((n) => countCarbons(straightChain(n))),
  range(3, 8).map((n) => drawIt(straightChain(n), { hint: 'Read the root for the count, then tap that many carbons.' })),
  range(2, 7).map((n) => buildNameFrom(straightChain(n), { seed: n + 71, spares: SPARES }))
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
  concept('u2l1-a', 'READ THE DRAWING', 'Does a chain stop where the drawing turns a corner?',
    ['Yes — a corner starts a new chain', 'No — a corner is just another carbon', 'Only if the corner is a sharp one'], 1,
    'A corner is a carbon like any other. The direction of the drawing carries no meaning at all.',
    bent(6)),
  concept('u2l1-b', 'READ THE DRAWING',
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
  concept('u2l2-a', 'FIND THE ERROR',
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
  concept('u4l1-a', 'IDENTIFY THE GROUP', 'What is a substituent?',
    ['A group hanging off the parent chain', 'The longest chain in the molecule', 'A double bond'], 0,
    'Anything attached to the parent chain rather than part of it.'),
  concept('u4l1-b', 'IDENTIFY THE GROUP', 'How many carbons are in a methyl group?',
    ['1', '2', '3'], 0, 'meth = 1 carbon; -yl marks it as a branch.'),
  concept('u4l1-c', 'IDENTIFY THE GROUP', 'How many carbons are in an ethyl group?',
    ['1', '2', '3'], 1, 'eth = 2 carbons.'),
  concept('u4l1-d', 'IDENTIFY THE GROUP', 'A three-carbon branch is called…',
    ['propane', 'propyl', 'tripropyl'], 1, 'prop = 3, + -yl for a branch. Propane would be a parent chain.'),
  concept('u4l1-e', 'IDENTIFY THE GROUP', 'A four-carbon branch is called…',
    ['butyl', 'butane', 'tetrayl'], 0, 'but = 4, + -yl.'),
  concept('u4l1-f', 'IDENTIFY THE GROUP', 'What does the -yl ending tell you?',
    ['The group is the parent chain', 'The group hangs off the parent chain', 'The group contains a double bond'],
    1, '-yl marks a substituent. The parent keeps -ane.'),
  concept('u4l1-g', 'IDENTIFY THE GROUP', 'Which part of a branched molecule keeps the -ane ending?',
    ['The branch', 'The parent chain', 'Both'], 1,
    'The parent takes the ending; the branch is cited as a -yl group in front of it.'),
  concept('u4l1-h', 'FIND THE PARENT', 'In a branched molecule, which chain is the parent?',
    ['The longest continuous carbon chain', 'The chain drawn horizontally', 'The shorter chain'], 0,
    'Longest continuous chain, however the drawing happens to be arranged.',
    MONO[1]),
  concept('u4l1-i', 'FIND THE PARENT',
    'A molecule has a five-carbon chain with a two-carbon branch. Which is the parent?',
    ['The five-carbon chain', 'The two-carbon branch', 'Whichever is drawn first'], 0,
    'The longest continuous run of carbons is always the parent.'),
  concept('u4l1-j', 'FIND THE PARENT', 'Why does the parent chain have to be found first?',
    ['It is traditional', 'Everything else in the name depends on it', 'It makes the drawing neater'], 1,
    'The root, the branch names and the numbers all follow from the parent. Choose it wrongly and the whole name is wrong.'),
  concept('u4l1-k', 'FIND THE PARENT', 'Can the parent chain bend around a corner in the drawing?',
    ['No, it must be drawn straight', 'Yes — it is about connectivity, not the drawn shape',
     'Only if the branch is a methyl'], 1,
    'The chain is whichever carbons connect, regardless of how the drawing turns.',
    MONO[2]),
  concept('u4l1-l', 'IDENTIFY THE GROUP', 'Which of these is a branch rather than a parent chain?',
    ['propyl', 'propane', 'propene'], 0, 'The -yl ending marks a substituent.'),
  concept('u4l1-m', 'IDENTIFY THE GROUP', 'Which ending marks a substituent?',
    ['-ane', '-yl', '-ene'], 1, '-yl. The parent keeps -ane.'),
  concept('u4l1-n', 'IDENTIFY THE GROUP', 'A branch of one carbon attached to a chain is called…',
    ['methane', 'methyl', 'monoyl'], 1, 'meth = 1, + -yl.'),
  concept('u4l1-o', 'FIND THE PARENT',
    'A molecule has a six-carbon chain and a three-carbon chain meeting at a carbon. Which is the parent?',
    ['The six-carbon chain', 'The three-carbon chain', 'Neither — you add them'], 0,
    'The longer of the two continuous runs is the parent; the shorter becomes a propyl branch.'),
  concept('u4l1-p', 'FIND THE PARENT', 'What happens if you choose the wrong parent chain?',
    ['Nothing, the name still works', 'The root, the branch names and the numbers all come out wrong',
     'Only the numbers change'], 1,
    'Every other part of the name is derived from the parent, so all of it goes wrong together.'),
  concept('u4l1-q', 'IDENTIFY THE GROUP', 'Is a branch part of the parent chain?',
    ['Yes', 'No — it hangs off it', 'Only if it has two carbons'], 1,
    'A branch is named separately and written in front of the parent.'),
  concept('u4l1-r', 'IDENTIFY THE GROUP', 'How many carbons does a propyl group have?',
    ['2', '3', '4'], 1, 'prop = 3.'),
  concept('u4l1-s', 'IDENTIFY THE GROUP', 'Which of these names a two-carbon branch?',
    ['methyl', 'ethyl', 'propyl'], 1, 'eth = 2 carbons.'),
  concept('u4l1-t', 'FIND THE PARENT', 'The parent chain is the…',
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
  concept('u3l2-a', 'NUMBER THE CHAIN', 'From which end should a chain be numbered?',
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
  concept('u7l1-e', 'COUNT THE HYDROGENS',
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
  concept('u7l2-a', 'NUMBER THE CHAIN', 'What does the number in "but-2-ene" tell you?',
    ['How many carbons there are', 'Which carbon the double bond starts at', 'How many double bonds there are'],
    1, 'The locant gives the lower-numbered carbon of the two joined by the double bond.'),
  concept('u7l2-b', 'NUMBER THE CHAIN', 'From which end is the chain numbered in an alkene?',
    ['From the left of the drawing', 'From the end that gives the double bond the lower number',
     'From whichever end has more hydrogens'], 1,
    'The double bond takes priority over everything else you have met so far when choosing a direction.'),
  concept('u7l2-c', 'NUMBER THE CHAIN', 'Why is "but-3-ene" never a correct name?',
    ['Butane has only three carbons', 'Numbered from the other end it is but-1-ene',
     'Double bonds cannot sit on carbon 3'], 1,
    'On a four-carbon chain, a bond starting at 3 from one end starts at 1 from the other — and the lower number is compulsory.'),
  concept('u7l2-d', 'NUMBER THE CHAIN', 'In prop-1-ene, how much work is the number doing?',
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
  concept('u7l3-c', 'COUNT THE HYDROGENS',
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
  concept('u8l1-a', 'IDENTIFY THE GROUP', 'How is a chlorine atom cited in a name?',
    ['chloro-', 'chlorine-', 'chlor-'], 0, 'chloro-, as a prefix in front of the parent chain.'),
  concept('u8l1-b', 'IDENTIFY THE GROUP', 'How is a bromine atom cited?',
    ['brom-', 'bromo-', 'bromine-'], 1, 'bromo-.'),
  concept('u8l1-c', 'IDENTIFY THE GROUP', 'Fluorine and iodine become…',
    ['fluoro- and iodo-', 'fluor- and iod-', 'fluoride- and iodide-'], 0, 'fluoro- and iodo-.'),
  concept('u8l1-d', 'IDENTIFY THE GROUP', 'Does a halogen ever take the suffix instead of a prefix?',
    ['Yes, when there is only one', 'No — halogens are always prefixes', 'Only for chlorine'], 1,
    'Halogens have no suffix form at all. However many there are, they are cited as prefixes.'),
  concept('u8l1-e', 'IDENTIFY THE GROUP', 'How many bonds does the chlorine form here?',
    ['1', '2', '3'], 0, 'One, like the hydrogen it replaced — so it always sits at the end of a bond.',
    radialMolecule('C', ['H', 'H', 'H', 'Cl']), true),
  concept('u8l1-f', 'IDENTIFY THE GROUP', 'What is a haloalkane?',
    ['An alkane with a halogen in place of a hydrogen', 'An alkane with a double bond',
     'A halogen on its own'], 0, 'One or more hydrogens replaced by a halogen.'),
  HALIDES.map((m) => writeName(m, { hint: 'Prefix for the halogen, number for where it sits, then the parent.' })),
  HALIDES.map((m) => mcNameFrom(m, HALIDES.filter((x) => x !== m), { seed: 31 })),
  HALIDES.map((m) => countCarbons(m))
);

export const POOL_U8L2 = pool(
  concept('u8l2-a', 'NUMBER THE CHAIN', 'Where does the number in "2-chlorobutane" come from?',
    ['The number of chlorines', 'The carbon the chlorine is attached to', 'The chain length'], 1,
    'The locant is the carbon carrying the halogen, numbered for the lowest possible value.'),
  concept('u8l2-b', 'NUMBER THE CHAIN', 'Two chlorines on the same molecule are written…',
    ['dichloro-, with a locant each', 'chlorochloro-', 'chloro2-'], 0,
    'di- for two, and every halogen still gets its own number: 1,2-dichloroethane.'),
  concept('u8l2-c', 'IDENTIFY THE GROUP',
    'A molecule has both a chlorine and a methyl group. Which is cited first?',
    ['chloro, because halogens come first', 'chloro, because c comes before m alphabetically',
     'methyl, because carbon comes first'], 1,
    'Substituents are listed alphabetically, and halogens are not special: chloro before methyl.'),
  concept('u8l2-d', 'NUMBER THE CHAIN', 'Why does bromoethane need no locant?',
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
