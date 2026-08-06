// ─────────────────────────────────────────────────────────────
// Structura curriculum — 10 stages, 38 units, matching
// structura-curriculum.md exactly (unit numbers 1–38).
//
// Design principles from the doc that shape authoring here:
//   • the seniority ladder is the spine; unit 10 teaches it
//     explicitly before the carbonyl pile-up
//   • bidirectional (name↔structure) in every unit
//   • one new idea per unit, reusing the last
//   • demotion prefixes taught with their parent group's defeat
//   • counter-examples and error-analysis items are content
//
// Units 1–6 are authored. Per the doc's build order, units 9–13
// (alcohols → priority → aldehydes → ketones → acids) are next.
//
// Lesson step types:
//   teach {title, body, mol?}
//   mc    {prompt, options, answer, explain, mol?}   ← also used
//         for error-analysis items ("what went wrong?")
//   name  {name, accept?, target, hint?}
//   draw  {name, target, hint?}
// ─────────────────────────────────────────────────────────────

import { buildTarget, Cn, chainBonds } from '../chem/questions';
// Authoring shortcut: MOL('nonane') asks the engine for the structure, so a
// molecule can be written by name instead of built by hand. An unrecognised
// name throws at load, naming the string, so a typo fails the test run.
import { fromName as MOL } from './questionFactory';
import { carbonWithFiveBonds, carbonWithNeighbours } from './diagrams';
import {
  POOL_U1L1, POOL_U1L2, POOL_U1L3, POOL_U1L4,
  POOL_U2L1, POOL_U2L2, POOL_U2L3,
  POOL_U3L1, POOL_U3L2, POOL_U3CP,
  POOL_U4L1, POOL_U4L2, POOL_U4L3, POOL_U4CP,
  POOL_U5CP, POOL_U6CP,
  POOL_U7L1, POOL_U7L2, POOL_U7L3, POOL_U7CP,
  POOL_U8L1, POOL_U8L2, POOL_U8CP,
} from './pools';

// ── Authoring helpers ────────────────────────────────────────
// The fourth argument carries display options: { showCarbons, caption }.
// showCarbons draws every atom (CH3-CH2-CH3) instead of a bare skeleton.
// Every teaching card carries a visual: a molecule where one makes the point,
// otherwise `placeholder` describes the image that belongs there.
const T = (title, body, mol, opts = {}) => ({
  type: 'teach',
  title,
  body,
  mol,
  showCarbons: !!opts.showCarbons,
  caption: opts.caption || null,
  placeholder: opts.placeholder || null,
});
// showCarbons draws every atom (CH3-CH2-CH3) instead of the bare skeleton —
// use it whenever the question is about counting hydrogens.
const MC = (prompt, options, answer, explain, mol, showCarbons) => ({
  type: 'mc',
  prompt,
  options,
  answer,
  explain,
  mol,
  showCarbons: !!showCarbons,
});
const NM = (name, target, extra = {}) => ({ type: 'name', name, target, ...extra });
// Interactive: the learner changes the chain length and the name follows.
const BUILD = (title, body, extra = {}) => ({ type: 'build', title, body, ...extra });
// Interactive: the same molecule shown with every atom, then skeletal.
const TOGGLE = (title, body, mol, captionFull, captionSkeletal) =>
  ({ type: 'toggle', title, body, mol, captionFull, captionSkeletal });
// Interactive: tap every carbon in a skeletal drawing.
const COUNT = (title, body, mol, extra = {}) => ({ type: 'count', title, body, mol, ...extra });
// Interactive: tap main-group elements and read off how many bonds each forms.
const ELEMENTS_STEP = (title, body, extra = {}) => ({ type: 'elements', title, body, ...extra });
const DR = (name, target, extra = {}) => ({ type: 'draw', name, target, ...extra });

const chain = (n) => buildTarget(Cn(n), chainBonds(n));

// Methane with its hydrogens drawn explicitly. Skeletal notation hides
// hydrogens, but the very first card has to show the four bonds before that
// convention means anything — so this one molecule is drawn in full.
function methaneWithH() {
  const L = 46;
  return {
    atoms: [
      { id: 't0', el: 'C', x: 0, y: 0, charge: 0, showH: false },
      { id: 't1', el: 'H', x: 0, y: -L, charge: 0, showH: false },
      { id: 't2', el: 'H', x: 0, y: L, charge: 0, showH: false },
      { id: 't3', el: 'H', x: -L, y: 0, charge: 0, showH: false },
      { id: 't4', el: 'H', x: L, y: 0, charge: 0, showH: false },
    ],
    bonds: [1, 2, 3, 4].map((i) => ({
      id: `tb${i}`,
      a: 't0',
      b: `t${i}`,
      order: 1,
      stereo: null,
    })),
  };
}

// Carbon chain drawn with a BEND partway along — same graph as a
// straight chain, different coordinates. Teaches that the chain
// is connectivity, not the drawn shape (doc unit 3).
function bentChain(n, turnAt) {
  // Every bond turns by 60 degrees, so the corner reads as a corner and no
  // two atoms fold back on top of each other. (The earlier version put
  // atoms i and i+2 half a bond length apart.)
  const RUN = [-30, 30];
  const TURN = [30, 90];
  const L = 48;
  const atoms = [];
  const bonds = [];
  let x = 0;
  let y = 0;
  for (let i = 0; i < n; i++) {
    atoms.push({ id: `t${i}`, el: 'C', x, y, charge: 0, showH: false });
    if (i) bonds.push({ id: `tb${i}`, a: `t${i - 1}`, b: `t${i}`, order: 1, stereo: null });
    const deg = (i < turnAt ? RUN : TURN)[i % 2];
    const rad = (deg * Math.PI) / 180;
    x += L * Math.cos(rad);
    y += L * Math.sin(rad);
  }
  return { atoms, bonds };
}

// ── Target molecules for units 1–6 ───────────────────────────
const M = {
  propane: chain(3),
  butane: chain(4),
  pentane: chain(5),
  hexane: chain(6),
  heptane: chain(7),
  octane: chain(8),
  hexaneBent: bentChain(6, 3),
  heptaneBent: bentChain(7, 4),
  methylpropane: buildTarget(Cn(4), [...chainBonds(3), [1, 3, 1]]),
  m2butane: buildTarget(Cn(5), [...chainBonds(4), [1, 4, 1]]),
  m2pentane: buildTarget(Cn(6), [...chainBonds(5), [1, 5, 1]]),
  m3pentane: buildTarget(Cn(6), [...chainBonds(5), [2, 5, 1]]),
  m2hexane: buildTarget(Cn(7), [...chainBonds(6), [1, 6, 1]]),
  m3hexane: buildTarget(Cn(7), [...chainBonds(6), [2, 6, 1]]),
  dm22propane: buildTarget(Cn(5), [[0, 1, 1], [1, 2, 1], [1, 3, 1], [1, 4, 1]]),
  dm23butane: buildTarget(Cn(6), [...chainBonds(4), [1, 4, 1], [2, 5, 1]]),
  dm22butane: buildTarget(Cn(6), [...chainBonds(4), [1, 4, 1], [1, 5, 1]]),
  e3pentane: buildTarget(Cn(7), [...chainBonds(5), [2, 5, 1], [5, 6, 1]]),
  tm224pentane: buildTarget(Cn(8), [...chainBonds(5), [1, 5, 1], [1, 6, 1], [3, 7, 1]]),
  e3m2pentane: buildTarget(Cn(8), [...chainBonds(5), [2, 5, 1], [5, 6, 1], [1, 7, 1]]),
  m2heptane: buildTarget(Cn(8), [...chainBonds(7), [1, 7, 1]]),
  m3heptane: buildTarget(Cn(8), [...chainBonds(7), [2, 7, 1]]),
  m4heptane: buildTarget(Cn(8), [...chainBonds(7), [3, 7, 1]]),
  e3hexane: buildTarget(Cn(8), [...chainBonds(6), [2, 6, 1], [6, 7, 1]]),
  // unsaturation
  propene: buildTarget(Cn(3), chainBonds(3, { 1: 2 })),
  but1ene: buildTarget(Cn(4), chainBonds(4, { 1: 2 })),
  but2ene: buildTarget(Cn(4), chainBonds(4, { 2: 2 })),
  pent2ene: buildTarget(Cn(5), chainBonds(5, { 2: 2 })),
  hex3ene: buildTarget(Cn(6), chainBonds(6, { 3: 2 })),
  but1yne: buildTarget(Cn(4), chainBonds(4, { 1: 3 })),
  but2yne: buildTarget(Cn(4), chainBonds(4, { 2: 3 })),
  pent2yne: buildTarget(Cn(5), chainBonds(5, { 2: 3 })),
  // halogens
  chloroethane: buildTarget([...Cn(2), 'Cl'], [...chainBonds(2), [0, 2]]),
  cl1propane: buildTarget([...Cn(3), 'Cl'], [...chainBonds(3), [0, 3]]),
  cl2butane: buildTarget([...Cn(4), 'Cl'], [...chainBonds(4), [1, 4]]),
  br1butane: buildTarget([...Cn(4), 'Br'], [...chainBonds(4), [0, 4]]),
  dcl12ethane: buildTarget([...Cn(2), 'Cl', 'Cl'], [...chainBonds(2), [0, 2], [1, 3]]),
  cl1m2butane: buildTarget([...Cn(5), 'Cl'], [...chainBonds(4), [1, 4], [0, 5]]),
};

// ── Authored units (1–6) ─────────────────────────────────────
const U1 = {
  id: 'u01-alkanes',
  n: 1,
  title: 'Alkanes and straight-chain naming',
  subtitle: 'From atoms and bonds to naming in both directions',
  level: 'VCE',
  topics: ['alkanes'],
  difficulty: 1,
  lessons: [
    {
      id: 'u01-l1',
      // Bonds only. Working out hydrogens needs skeletal notation to be worth
      // doing, so it belongs with lesson 2 rather than being mentioned here
      // and then tested.
      teaches: ['valence'],
      title: 'Atoms and bonds',
      pool: POOL_U1L1,
      ask: 5,
      steps: [
        T(
          'Start here',
          'Organic chemistry is the chemistry of carbon compounds. Millions of them exist, and every one has a name that describes exactly how it is built.\n\nThis course teaches you to read those names and to draw what they describe. You need no prior chemistry — we start with what a molecule actually is.',
          null,
          {
            placeholder:
              'Everyday things built from organic molecules — fuel, plastics, medicines, food — with one structure drawn beside them.',
          }
        ),
        T(
          'Atoms join by sharing bonds',
          'A molecule is a group of atoms held together. Each connection between two atoms is called a bond, and we draw it as a line.\n\nEvery kind of atom will make a fixed number of bonds. Hydrogen makes one. Oxygen makes two. Carbon makes four — always exactly four, never three, never five.\n\nThat number is not arbitrary: it is set by where the element sits in the periodic table. This course works almost entirely within the MAIN GROUP — the tall columns at either side, shaded below — because those elements bond predictably. The metals in the middle do not, and you will not meet them here.',
          methaneWithH(),
          {
            showCarbons: true,
            caption: 'Methane, CH4. Four lines leave the carbon — one to each hydrogen.',
            periodic: true,
            periodicNote:
              'The main group. Filled cells are the elements these molecules are built from: carbon, hydrogen, oxygen, nitrogen and the halogens.',
          }
        ),
        ELEMENTS_STEP(
          'The column sets the number of bonds',
          'Tap around the table. Each element shows how many bonds it normally forms — and the number is the same all the way down a column.\n\nGroup 14 makes four. Group 15 makes three. Group 16 makes two. Group 17 makes one. The count falls by one as you move right, because the outer shell is filling up.\n\nExplore at least three columns before moving on.',
          { start: 'C', need: 3 }
        ),
        MC(
          'Count the lines leaving the carbon below. How many bonds does it form?',
          ['Two', 'Three', 'Four', 'It varies'],
          2,
          'Four, always. This one rule decides whether a structure is possible, and later it is the first thing the app checks when you draw.',
          methaneWithH(),
          true
        ),
        T(
          'Carbon chains',
          'Because carbon makes four bonds, it can bond to another carbon and still have bonds to spare. Join carbons in a row and you get a chain — the backbone of nearly every organic molecule.\n\nEvery bond that is not spent on a neighbouring carbon is filled with hydrogen. Exactly how many that is per carbon is the next lesson; for now, the point is that no bond is ever left empty.',
          chain(3),
          {
            showCarbons: true,
            caption: 'Three carbons joined in a row, with hydrogen filling every remaining bond.',
          }
        ),
        MC(
          'This carbon is drawn with five lines. What is wrong?',
          ['Nothing', 'Carbon forms only four bonds', 'Carbon must have exactly three bonds'],
          1,
          'Four is carbon\'s limit, so five is impossible — this is the commonest reason a drawn structure is rejected. The app marks an over-bonded atom in red.',
          carbonWithFiveBonds(),
          true
        ),
      ],
    },
    {
      id: 'u01-l2',
      teaches: ['valence', 'skeletal', 'h-per-carbon'],
      title: 'Reading a drawing',
      pool: POOL_U1L2,
      ask: 5,
      steps: [
        T(
          'Why chemists take a shortcut',
          'Real molecules get large. The one below has twenty carbons — and by the four-bond rule it also carries forty-two hydrogens. That is sixty-two atoms and sixty-one bonds to draw, for a molecule that is nothing more than a plain chain.\n\nHydrogen and carbon make up almost every atom in an organic molecule, so writing them all out is mostly labour, and the shape gets buried in the detail.\n\nSo chemists draw the SKELETON: just the lines between carbons. Nothing has been thrown away — every hydrogen is still there, and the four-bond rule tells you exactly how many sit on each carbon.',
          MOL('icosane'),
          {
            caption:
              'Icosane, C20H42, drawn as a skeleton. Writing out all sixty-two atoms would take a page and tell you nothing extra.',
          }
        ),
        TOGGLE(
          'The same molecule, two ways',
          'Switch between the two views. Nothing about the molecule changes — only how much of it we bother to draw.',
          chain(4),
          'Every atom drawn: CH3-CH2-CH2-CH3. Four carbons, ten hydrogens.',
          'The skeleton. Each line end and each corner is a carbon; its hydrogens are implied.'
        ),
        T(
          'Where the carbons hide',
          'In a skeletal drawing there are no letters for carbon. Instead:\n\n• every line END is a carbon\n• every CORNER is a carbon\n\nThe zigzag is not decoration — each bend marks another atom.',
          chain(5),
          { caption: 'Two ends and three corners: five carbons, pentane.' }
        ),
        T(
          'Working out the hydrogens',
          'Now that the carbons are visible, the hydrogens follow. Each carbon has four bonds; whatever is not used on a neighbour is hydrogen.\n\nA carbon at the END of a chain has one neighbour, so it carries THREE hydrogens — a CH3 group.\nA carbon in the MIDDLE has two neighbours, so it carries TWO — a CH2 group.\n\nThat is the whole rule. You never need to draw them; you count the neighbours and subtract.',
          chain(4),
          {
            showCarbons: true,
            caption: 'Butane written out: CH3 at each end, CH2 in the middle. Four bonds on every carbon.',
          }
        ),
        MC(
          'This carbon has two carbon neighbours. How many hydrogens does it hold?',
          ['One', 'Two', 'Three', 'Four'],
          1,
          'Two neighbours use two of its four bonds, leaving two for hydrogen: a CH2 group.',
          carbonWithNeighbours(2),
          true
        ),
        MC(
          'This carbon has one carbon neighbour. How many hydrogens does it hold?',
          ['One', 'Two', 'Three', 'Four'],
          2,
          'One neighbour leaves three bonds free: a CH3 group.',
          carbonWithNeighbours(1),
          true
        ),
        COUNT(
          'Find every carbon',
          'Tap each carbon in this structure. Remember: the ends and the corners.',
          chain(5),
          { doneNote: 'Two ends plus three corners.' }
        ),
        COUNT(
          'One more, a little longer',
          'Same rule. Tap every carbon.',
          chain(7),
          { doneNote: 'The bends are easy to miss when the chain gets long — count deliberately.' }
        ),
        MC(
          'How many carbons are in this structure?',
          ['4', '5', '6', '7'],
          2,
          'Two ends and four corners: six carbons.',
          chain(6)
        ),
      ],
    },
    {
      id: 'u01-l3',
      teaches: ['valence', 'h-per-carbon', 'skeletal', 'alkane-def', 'formula'],
      title: 'Alkanes',
      pool: POOL_U1L3,
      ask: 5,
      steps: [
        T(
          'What makes something an alkane',
          'A molecule built only from carbon and hydrogen is a hydrocarbon.\n\nIf every carbon-carbon bond in it is a single bond — one line, never two or three — it is an alkane. Alkanes are the simplest family in organic chemistry and the foundation for everything after, which is why they come first.',
          chain(4),
          { caption: 'Butane: only carbon and hydrogen, only single bonds. An alkane.' }
        ),
        T(
          'Counting the hydrogens',
          'Because ends carry three hydrogens and middles carry two, the hydrogen count follows automatically from the carbon count.\n\nAn alkane with n carbons always has 2n + 2 hydrogens.\n\nSo 4 carbons gives 2(4) + 2 = 10 hydrogens: C4H10.',
          chain(4),
          { showCarbons: true, caption: 'Two CH3 ends and two CH2 middles: C4H10.' }
        ),
        MC(
          'Which formula fits an alkane with 5 carbons?',
          ['C5H10', 'C5H12', 'C5H8', 'C5H14'],
          1,
          '2n + 2 with n = 5 gives 12 hydrogens, so C5H12. You never have to count them by hand.'
        ),
        MC(
          'Why does an alkane with 6 carbons have 14 hydrogens rather than 12?',
          [
            'The two end carbons each take an extra hydrogen',
            'Carbon sometimes makes five bonds',
            'Hydrogen sometimes makes two bonds',
          ],
          0,
          'The +2 in the formula is exactly the two extra hydrogens on the ends, where a carbon has one neighbour instead of two.'
        ),
      ],
    },
    {
      id: 'u01-l4',
      teaches: ['valence', 'h-per-carbon', 'skeletal', 'alkane-def', 'formula', 'roots', 'naming'],
      title: 'The first ten names',
      pool: POOL_U1L4,
      ask: 5,
      steps: [
        T(
          'A name has two halves',
          'Every name in this course is built from parts. The first two are all you need for now:\n\nROOT — how many carbons are in the main chain\nENDING — what kind of molecule it is\n\nGet those two right and you have named an alkane.',
          null,
          {
            placeholder:
              'The word "hexane" split into two coloured blocks: "hex" labelled ROOT (six carbons) and "ane" labelled ENDING (all single bonds).',
          }
        ),
        T(
          'The ten roots',
          'meth (1)   eth (2)   prop (3)   but (4)   pent (5)\nhex (6)   hept (7)   oct (8)   non (9)   dec (10)\n\nThe first four are historical names and simply have to be learnt. From pent- onwards they are the Greek number words you already know from pentagon, hexagon and octagon.',
          chain(10),
          { caption: 'Ten carbons: decane. Tap the reference button any time to see this table.' }
        ),
        BUILD(
          'Change the chain, watch the name',
          'Add and remove carbons. The root changes to match the count every single time — and the ending never moves.',
          { start: 3, min: 1, max: 10 }
        ),
        T(
          'Why the ending is -ane',
          '-ane is the default ending. It means the chain is saturated: every carbon-carbon bond is a single bond and every remaining space is filled with hydrogen.\n\nUnless the molecule contains something worth reporting, it gets -ane. Later you will meet endings that replace it — -ene for a double bond, -yne for a triple bond, -ol for an alcohol — but each of those replaces -ane only because something has changed. Change nothing, and it stays -ane.',
          chain(6),
          { caption: 'hex- (six carbons) + -ane (all single bonds) = hexane.' }
        ),
        MC(
          'What does the -ane ending tell you?',
          [
            'How many carbons there are',
            'That every carbon-carbon bond is single',
            'That the chain is branched',
          ],
          1,
          'The root carries the count; the ending carries the bond type. -ane means nothing but single bonds.'
        ),
        MC(
          'A chain of seven carbons, all single bonds, is called…',
          ['heptene', 'heptane', 'septane'],
          1,
          'hept- for seven, plus the default -ane. (sept- is Latin; organic nomenclature uses the Greek hept-.)'
        ),
      ],
    },
    {
      id: 'u02-l1',
      teaches: ['skeletal', 'roots', 'naming', 'bent-chains'],
      title: 'Structure to name',
      pool: POOL_U2L1,
      ask: 5,
      steps: [
        T(
          'Three steps, every time',
          'To name a straight-chain alkane:\n\n1. Count the carbons — ends and corners.\n2. Take the root for that number.\n3. Add -ane.\n\nThat is the whole method. The rest of this course adds cases to it, but never replaces it.',
          null,
          {
            placeholder:
              'Three numbered steps left to right: a skeleton with its carbons circled, then the root "hex", then the finished word "hexane".',
          }
        ),
        COUNT(
          'Step 1 on a real structure',
          'Before naming this, count it. Tap every carbon.',
          chain(4),
          { doneNote: 'Four carbons, so the root is but-.' }
        ),
        NM('butane', M.butane, { hint: 'Four carbons → but-, and all single bonds → -ane.' }),
        NM('hexane', M.hexane, { hint: 'Count the ends and the corners before you commit.' }),
        NM('pentane', M.pentane),
        NM('heptane', M.heptane, { hint: 'Seven carbons. hept- is the root.' }),
      ],
    },
    {
      id: 'u02-l2',
      teaches: ['skeletal', 'roots', 'naming', 'drawing'],
      title: 'Name to structure',
      pool: POOL_U2L2,
      ask: 5,
      steps: [
        T(
          'Reading a name backwards',
          'Naming and drawing are the same skill in reverse. Given a name:\n\n1. Read the root to get the carbon count.\n2. Draw that many carbons in a zigzag.\n3. The -ane ending tells you every bond is single, so leave them all as plain lines.\n\nYou never draw hydrogens.',
          null,
          {
            placeholder:
              'The same three steps running right to left: the word "hexane", then "6 carbons", then the drawn zigzag.',
          }
        ),
        T(
          'Using the canvas',
          'On the next step you will draw. Tap the canvas to place your first carbon, then tap again to add the next one joined to it. Keep tapping to extend the chain.\n\nThe dock at the bottom holds everything else — bond types, other elements, rings, undo and clear. For now you need none of it.',
          chain(3),
          { caption: 'This is what three taps produces: propane.' }
        ),
        DR('propane', M.propane, { hint: 'Three carbons. Tap once to place, then twice more to extend.' }),
        DR('butane', M.butane, { hint: 'One more carbon than propane.' }),
        DR('hexane', M.hexane, { hint: 'Six carbons in a row.' }),
      ],
    },
    {
      id: 'u02-l3',
      teaches: ['skeletal', 'roots', 'naming', 'drawing', 'formula', 'bent-chains'],
      title: 'Checkpoint',
      checkpoint: true,
      pool: POOL_U2L3,
      ask: 10,
      steps: [
        MC(
          'What is the molecular formula of octane?',
          ['C8H16', 'C8H18', 'C8H20'],
          1,
          '2n + 2 with n = 8 gives 18 hydrogens.'
        ),
        NM('octane', M.octane),
        DR('pentane', M.pentane),
        MC(
          'A student counts this structure as five carbons and names it pentane. What went wrong?',
          [
            'They missed a corner',
            'Nothing — it is pentane',
            'They counted the hydrogens as carbons',
          ],
          0,
          'It has six carbons, so hexane. Missing a corner in the zigzag is the single most common counting error, and it stays common with longer chains.',
          M.hexane
        ),
        NM('hexane', M.hexaneBent, { hint: 'The bend is only how it is drawn. Trace the chain right through it.' }),
      ],
    },
  ],
};

const U3 = {
  id: 'u03-parent-chain',
  n: 2,
  title: 'Finding the parent chain',
  subtitle: 'The chain is connectivity, not the drawn shape',
  level: 'VCE',
  topics: ['alkanes'],
  difficulty: 2,
  lessons: [
    {
      id: 'u03-l1',
      teaches: ['skeletal', 'bent-chains'],
      title: 'Chains that bend',
      pool: POOL_U3L1,
      ask: 5,
      steps: [
        T(
          'Drawings lie about shape',
          'A chain does not stop being one chain because the drawing turns a corner. This molecule bends across the page — but trace it carbon to carbon and it is one continuous six-carbon chain: hexane. Always read connectivity, never the drawn direction.',
          M.hexaneBent
        ),
        MC('How many carbons are in this bent skeleton?', ['5', '6', '7'], 1, 'Trace it end to end: the bend is just a drawing choice. Six carbons — hexane.', M.hexaneBent),
        NM('hexane', M.hexaneBent, { hint: 'Trace the chain through the bend before counting.' }),
      ],
    },
    {
      id: 'u03-l2',
      teaches: ['bent-chains', 'naming'],
      title: 'Error analysis: the missed bend',
      pool: POOL_U3L2,
      ask: 5,
      steps: [
        MC(
          'A student names this molecule "hexane". What went wrong?',
          ['They stopped counting at the bend', 'Nothing — it is hexane', 'They counted a corner twice'],
          0,
          'The chain continues through the corner: it is seven carbons — heptane. Stopping at a bend is the most common parent-chain error.',
          M.heptaneBent
        ),
        NM('heptane', M.heptaneBent),
        DR('pentane', M.pentane, { hint: 'Draw it any shape you like — the checker reads connectivity, exactly as you should.' }),
      ],
    },
    {
      id: 'u03-checkpoint',
      teaches: ['bent-chains', 'naming', 'drawing'],
      title: 'Checkpoint: parent chains',
      checkpoint: true,
      pool: POOL_U3CP,
      ask: 10,
      steps: [],
    }
  ],
};

const U4 = {
  id: 'u04-alkyl-substituents',
  n: 3,
  title: 'Alkyl substituents',
  subtitle: 'Branches, their names, and where they sit',
  level: 'VCE',
  topics: ['alkanes'],
  difficulty: 2,
  lessons: [
    {
      id: 'u04-l1',
      title: 'When chains branch',
      teaches: ['branches'],
      pool: POOL_U4L1,
      ask: 10,
      steps: [
        T(
          'Not every molecule is a straight line',
          'So far every chain has run end to end with nothing hanging off it. Most real molecules are not like that: somewhere along the chain, another group of carbons branches away.\n\nThat changes nothing about the rules you already know. It adds one question: what do you call the piece that branches off?',
          M.m2butane,
          { caption: 'A four-carbon chain with one carbon branching off it.' }
        ),
        T(
          'Parent and substituent',
          'Every branched molecule splits into two parts:\n\nThe PARENT CHAIN — the longest continuous run of carbons. It gives the root and keeps the -ane ending.\n\nA SUBSTITUENT — anything hanging off that chain. It is named separately and written in front.\n\nThe parent is not "the horizontal one" or "the one drawn first". It is simply the longest path you can trace through the carbons.',
          M.m3pentane,
          { caption: 'Parent chain: five carbons. Substituent: the single carbon branching from the middle.' }
        ),
        MC(
          'In this molecule, which is the parent chain?',
          ['The five-carbon chain', 'The single branching carbon', 'Whichever is drawn horizontally'],
          0,
          'The longest continuous run of carbons is the parent, however the molecule happens to be drawn.',
          M.m3pentane
        ),
        T(
          'The -yl ending names a branch',
          'A substituent is named from its own carbon count, using the same roots as before but ending in -yl instead of -ane:\n\nmethyl (1 carbon)   ethyl (2)   propyl (3)   butyl (4)\n\nThe ending is the whole difference. -ane says "this is the parent chain"; -yl says "this hangs off it".',
          M.e3pentane,
          { caption: 'A two-carbon branch on a five-carbon parent: an ethyl group on pentane.' }
        ),
        MC(
          'How many carbons are in a methyl group?',
          ['1', '2', '3'],
          0,
          'meth = 1 carbon, and -yl marks it as a substituent rather than a parent.'
        ),
        MC(
          'A two-carbon branch is called…',
          ['ethane', 'ethyl', 'diethyl'],
          1,
          'eth = 2 carbons, + -yl for a branch. Ethane would be the parent chain; diethyl means two separate ethyl groups.'
        ),
        T(
          'Why the longest chain matters',
          'Pick the wrong parent and every part of the name goes wrong: the root, the branch names and the numbers.\n\nSo before naming anything, trace the carbons and find the longest continuous path. Do that first, every time, and the rest of the name follows.',
          M.e3m2pentane,
          {
            caption: 'Trace carefully: the longest path here is five carbons, with an ethyl and a methyl hanging off it.',
          }
        ),
      ],
    },
    {
      id: 'u04-l2',
      title: 'Naming a branched alkane',
      teaches: ['branches', 'locants', 'naming'],
      pool: POOL_U4L2,
      ask: 10,
      steps: [
        T(
          'Four steps, in order',
          '1. Find the longest continuous chain — that is the parent, and gives the root.\n2. Number the chain from the end NEAREST the branch.\n3. Name the branch with its -yl ending.\n4. Write the number, a hyphen, the branch, then the parent: 2-methylbutane.\n\nThe order matters. Numbering before you have settled the parent chain is the commonest way to get a wrong answer.',
          M.m2butane,
          { caption: '2-methylbutane: butane parent, methyl branch, sitting on carbon 2.' }
        ),
        T(
          'Numbering starts at the nearer end',
          'A chain can be numbered from either end, and only one direction is right: the one that gives the branch the lower number.\n\nCount from the left of this molecule and the branch is on carbon 2. Count from the right and it is on carbon 4. Two is lower, so it is 2-methylpentane — never 4-methylpentane.',
          M.m2pentane,
          { caption: 'The same molecule numbered both ways gives 2 or 4. The lower number wins.' }
        ),
        MC(
          'This molecule is correctly named…',
          ['2-methylhexane', '5-methylhexane', 'either is acceptable'],
          0,
          'Counting from the near end puts the methyl on carbon 2; from the far end it would be carbon 5. The lower locant is compulsory.',
          M.m2hexane
        ),
        MC(
          'Why is "3-methylbutane" never a correct name?',
          [
            'Butane cannot carry a branch',
            'Numbered from the other end it is 2-methylbutane',
            'Methyl groups cannot sit on carbon 3',
          ],
          1,
          'On a four-carbon chain, position 3 from one end is position 2 from the other — and the lower number is compulsory.'
        ),
        T(
          'How the name is punctuated',
          'A number is separated from a word by a hyphen, and nothing else:\n\n2-methylbutane — correct\n2 methylbutane, 2,methylbutane, methyl-2-butane — all wrong\n\nThe branch is written in front of the parent as one word: methyl + butane becomes methylbutane, with the locant in front of the whole thing.',
          M.m3hexane,
          { caption: '3-methylhexane: locant, hyphen, branch, parent — in that order, as one word.' }
        ),
        NM('2-methylbutane', M.m2butane, { hint: 'Four-carbon parent; number from the end nearer the branch.' }),
        NM('3-methylpentane', M.m3pentane, { hint: 'Five-carbon parent. Check both directions before you commit.' }),
      ],
    },
    {
      id: 'u04-l3',
      title: 'Drawing branched molecules',
      teaches: ['branches', 'locants', 'drawing'],
      pool: POOL_U4L3,
      ask: 10,
      steps: [
        T(
          'Reading a name backwards',
          'Given a branched name, work through it in reverse:\n\n1. The parent tells you the chain length — draw that zigzag first.\n2. The number tells you which carbon carries the branch — count along from either end.\n3. The -yl name tells you how many carbons the branch has — add them.\n\nFor 2-methylbutane: four carbons in a row, then one more carbon on the second.',
          M.m2butane,
          { caption: 'Parent first, then count to the locant, then attach the branch.' }
        ),
        T(
          'Which end you count from does not matter when drawing',
          'When you are drawing rather than naming, either end will do. Carbon 2 counted from the left and carbon 2 counted from the right give the same molecule as long as the chain is otherwise symmetrical — and where they differ, the name has already told you which is meant by choosing the lower number.\n\nDraw it, then check: does your structure name back to what you were given?',
          M.m2pentane,
          { caption: '2-methylpentane. Counting from the left gives carbon 2 — the end nearer the branch.' }
        ),
        DR('2-methylbutane', M.m2butane, {
          hint: 'Draw four carbons, then tap the second one and add a fifth.',
        }),
        DR('3-methylpentane', M.m3pentane, { hint: 'Five carbons, branch on the middle one.' }),
      ],
    },
    {
      id: 'u04-checkpoint',
      title: 'Checkpoint: substituents',
      checkpoint: true,
      teaches: ['branches', 'locants', 'naming', 'drawing'],
      pool: POOL_U4CP,
      ask: 15,
      steps: [],
    },
  ],
};

const U5 = {
  id: 'u05-numbering-locants',
  n: 4,
  title: 'Numbering and locants',
  subtitle: 'The lowest-locant rule',
  level: 'VCE',
  topics: ['alkanes'],
  difficulty: 2,
  lessons: [
    {
      id: 'u05-l1',
      teaches: ['locants'],
      title: 'The lowest-locant rule',
      steps: [
        T(
          'Direction matters',
          'A chain can be numbered from either end — but only one direction is correct. Number from the end that gives substituents the lowest locants. A methyl on the second carbon from the right is 2-methyl, not 5-methyl, if you count from the correct end.',
          M.m2hexane
        ),
        MC(
          'This molecule is correctly named…',
          ['2-methylhexane', '5-methylhexane'],
          0,
          'Counting from the near end puts the methyl at C2; from the far end it would be C5. Lower wins: 2-methylhexane.',
          M.m2hexane
        ),
        MC(
          'Why is "3-methylbutane" never a correct name?',
          ['Butane cannot have branches', 'Counting from the other end gives 2-methyl', 'Methyl cannot sit on C3'],
          1,
          'On a four-carbon chain, position 3 from one end is position 2 from the other. The lower locant is compulsory, so it is always 2-methylbutane.'
        ),
      ],
    },
    {
      id: 'u05-l2',
      teaches: ['locants', 'naming', 'drawing'],
      title: 'Practice: numbering',
      steps: [
        NM('3-methylhexane', M.m3hexane, { hint: 'Check both directions before committing.' }),
        DR('2-methylhexane', M.m2hexane),
        NM('2-methylpentane', M.m2pentane),
      ],
    },
    {
      id: 'u05-l3',
      teaches: ['locants', 'naming', 'drawing', 'branches'],
      title: 'Checkpoint: locants',
      checkpoint: true,
      pool: POOL_U5CP,
      ask: 15,
      steps: [
        MC(
          'Two names are proposed for one molecule: 2-methylheptane and 6-methylheptane. Which is right?',
          ['2-methylheptane', '6-methylheptane', 'Both are acceptable'],
          0,
          'They describe the same structure numbered from opposite ends — and only the lower locant set is valid.'
        ),
        DR('3-methylpentane', M.m3pentane),
        NM('2-methylhexane', M.m2hexane),
      ],
    },
  ],
};

const U6 = {
  id: 'u06-multiple-substituents',
  n: 5,
  title: 'Multiple substituents',
  subtitle: 'di/tri, alphabetical order, lowest-locant sets',
  level: 'VCE',
  topics: ['alkanes'],
  difficulty: 2,
  lessons: [
    {
      id: 'u06-l1',
      teaches: ['branches', 'locants'],
      title: 'di-, tri-, tetra-',
      steps: [
        T(
          'Counting identical branches',
          'Two identical substituents take the prefix di-, three tri-, four tetra-. Every substituent still needs its own locant, separated by commas: 2,3-dimethylbutane has methyls on C2 and C3. Numbers repeat if branches share a carbon: 2,2-dimethylpropane.',
          M.dm23butane
        ),
        MC(
          'What is this molecule called?',
          ['2,2-dimethylpropane', '1,1-dimethylpropane', 'trimethylethane'],
          0,
          'Parent chain propane; both methyls sit on C2 — each gets a locant, so 2,2-.',
          M.dm22propane
        ),
        NM('2,3-dimethylbutane', M.dm23butane, { hint: 'Two methyls, two locants, one comma.' }),
      ],
    },
    {
      id: 'u06-l2',
      teaches: ['branches', 'locants', 'naming'],
      title: 'Alphabetical order',
      steps: [
        T(
          'ethyl before methyl',
          'Different substituents are listed alphabetically — ethyl before methyl — ignoring multiplying prefixes (dimethyl still alphabetizes under m). Punctuation rules: commas between numbers, hyphens between numbers and letters.',
          M.e3m2pentane,
          { caption: '3-ethyl-2-methylpentane: ethyl is cited first even though methyl has the lower locant.' }
        ),
        MC(
          'Which ordering is correct for a molecule with an ethyl and a methyl branch?',
          ['…-methyl…-ethyl…', '…-ethyl…-methyl…'],
          1,
          'Alphabetical: e before m, regardless of locants.'
        ),
        NM('3-ethylpentane', M.e3pentane, { hint: 'The parent is the longest chain — check it is really 5, not 6.' }),
        NM('3-ethyl-2-methylpentane', M.e3m2pentane, { hint: 'Ethyl is cited first (alphabetical), even though methyl has the lower locant.' }),
      ],
    },
    {
      id: 'u06-l3',
      teaches: ['branches', 'locants', 'naming', 'drawing'],
      title: 'Checkpoint: multiple substituents',
      checkpoint: true,
      pool: POOL_U6CP,
      ask: 15,
      steps: [
        T(
          'First point of difference',
          'With several substituents, compare the whole locant set from each end and take the set that is lower at the FIRST point of difference. For 2,2,4-trimethylpentane: one direction gives {2,2,4}, the other {2,4,4}. They tie at the first number, so compare the second: 2 beats 4. {2,2,4} wins.',
          M.tm224pentane
        ),
        MC(
          'A molecule could be numbered {2,3,5} or {2,4,5}. Which set is correct?',
          ['{2,3,5}', '{2,4,5}', 'Either — they start the same'],
          0,
          'Tie at the first locant (2 vs 2), so compare the second: 3 beats 4. First point of difference decides.'
        ),
        NM('2,2,4-trimethylpentane', M.tm224pentane),
        DR('2,3-dimethylbutane', M.dm23butane),
        DR('2,2-dimethylpropane', M.dm22propane, { hint: 'One central carbon carrying four others.' }),
      ],
    },
  ],
};

const U7 = {
  id: 'u07-alkenes-alkynes',
  n: 6,
  title: 'Alkenes and alkynes',
  subtitle: 'Double and triple bonds, and where they sit',
  level: 'VCE',
  topics: ['alkenes'],
  difficulty: 2,
  lessons: [
    {
      id: 'u07-l1',
      title: 'The double bond',
      teaches: ['unsaturation', 'naming'],
      pool: POOL_U7L1,
      ask: 10,
      steps: [
        T(
          'Not every bond is single',
          'Every molecule so far has been an alkane: carbon joined to carbon by a single bond, with hydrogen filling everything else.\n\nTwo carbons can also share a DOUBLE bond — two connections instead of one, drawn as two parallel lines. A hydrocarbon containing one is an alkene, and the ending changes from -ane to -ene.',
          M.but2ene,
          { caption: 'But-2-ene. The two lines in the middle are one double bond, not two separate bonds.' }
        ),
        T(
          'A double bond costs hydrogens',
          'A double bond uses two of a carbon\'s four bonds instead of one. Those carbons therefore hold one hydrogen fewer each.\n\nSo where an alkane is CnH(2n+2), an alkene with one double bond is CnH2n — two hydrogens fewer for the same number of carbons. This is what "unsaturated" means: there is room for more hydrogen.',
          M.but2ene,
          { showCarbons: true, caption: 'But-2-ene written out: C4H8, where butane would be C4H10.' }
        ),
        MC(
          'What does the -ene ending tell you?',
          ['How many carbons there are', 'That there is a carbon-carbon double bond', 'That the chain is branched'],
          1,
          'The root still carries the count; the ending reports the double bond.'
        ),
        T(
          'Naming an alkene',
          'The method does not change. Find the longest chain, take its root, and use -ene instead of -ane.\n\nThe one addition is a number: which carbon the double bond starts at. It goes immediately before the ending, so a four-carbon chain with the bond between carbons 1 and 2 is but-1-ene.',
          M.but1ene,
          { caption: 'But-1-ene: four carbons, double bond starting at carbon 1.' }
        ),
        NM('but-2-ene', M.but2ene, { hint: 'Four carbons, and the double bond starts at carbon 2.' }),
      ],
    },
    {
      id: 'u07-l2',
      title: 'Where the double bond sits',
      teaches: ['unsaturation', 'naming', 'locants'],
      pool: POOL_U7L2,
      ask: 10,
      steps: [
        T(
          'The double bond decides the numbering',
          'A chain can still be numbered from either end, and now the double bond decides which. Number so the double bond gets the LOWEST possible locant — ahead of any branch.\n\nThe number given is always the lower of the two carbons the bond joins. A bond between carbons 2 and 3 is reported as 2.',
          M.pent2ene,
          { caption: 'Pent-2-ene: the bond joins carbons 2 and 3, so the name says 2.' }
        ),
        MC(
          'Why is "but-3-ene" never correct?',
          [
            'Butane has only three carbons',
            'Numbered from the other end it is but-1-ene',
            'A double bond cannot start at carbon 3',
          ],
          1,
          'A bond starting at carbon 3 from one end starts at carbon 1 from the other, and the lower number is compulsory.'
        ),
        T(
          'The bond must be in the parent chain',
          'When you pick the longest chain, it has to be one that CONTAINS the double bond. If a longer path exists that misses the bond, it is not the parent.\n\nThis is the one place where "longest chain" is not the whole rule — the double bond comes first.',
          M.hex3ene,
          { caption: 'Hex-3-ene: six carbons, bond between 3 and 4.' }
        ),
        NM('pent-2-ene', M.pent2ene, { hint: 'Count from the end that gives the bond the lower number.' }),
        DR('but-1-ene', M.but1ene, { hint: 'Draw four carbons, then tap the first bond and set it to double.' }),
      ],
    },
    {
      id: 'u07-l3',
      title: 'Alkynes',
      teaches: ['unsaturation', 'naming', 'locants'],
      pool: POOL_U7L3,
      ask: 10,
      steps: [
        T(
          'Three bonds between two carbons',
          'Carbons can share three bonds as well as one or two. A hydrocarbon containing a carbon-carbon TRIPLE bond is an alkyne, and the ending is -yne.\n\nEverything else is unchanged: longest chain, lowest locant for the bond, number in front of the ending.',
          M.but2yne,
          { caption: 'But-2-yne. Three parallel lines mark one triple bond.' }
        ),
        T(
          'Even fewer hydrogens',
          'A triple bond uses three of each carbon\'s four bonds, so those carbons hold at most one hydrogen. An alkyne with one triple bond is CnH(2n-2) — four fewer hydrogens than the matching alkane.',
          M.but1yne,
          { showCarbons: true, caption: 'But-1-yne: C4H6, against C4H10 for butane.' }
        ),
        MC(
          'Which ending marks a triple bond?',
          ['-ane', '-ene', '-yne'],
          2,
          '-yne. Single bonds only is -ane, one double bond is -ene.'
        ),
        NM('but-1-yne', M.but1yne, { hint: 'Four carbons, triple bond starting at carbon 1.' }),
      ],
    },
    {
      id: 'u07-checkpoint',
      title: 'Checkpoint: unsaturation',
      checkpoint: true,
      teaches: ['unsaturation', 'naming', 'locants', 'drawing'],
      pool: POOL_U7CP,
      ask: 15,
      steps: [],
    },
  ],
};

const U8 = {
  id: 'u08-haloalkanes',
  n: 7,
  title: 'Haloalkanes',
  subtitle: 'Halogens as prefixes that never take the suffix',
  level: 'VCE',
  topics: ['functional-groups'],
  difficulty: 2,
  lessons: [
    {
      id: 'u08-l1',
      title: 'Halogens on a chain',
      teaches: ['halogens', 'naming'],
      pool: POOL_U8L1,
      ask: 10,
      steps: [
        T(
          'Swapping a hydrogen for a halogen',
          'Replace one of an alkane\'s hydrogens with a halogen — fluorine, chlorine, bromine or iodine — and you have a haloalkane.\n\nHalogens form one bond, exactly like the hydrogen they replace, so they always sit at the end of a bond and never in the middle of a chain.',
          M.cl2butane,
          { caption: '2-chlorobutane: a butane chain with a chlorine on carbon 2.' }
        ),
        T(
          'They are always prefixes',
          'Each halogen is cited in front of the parent chain, with -o replacing the usual ending:\n\nfluoro-   chloro-   bromo-   iodo-\n\nUnlike the groups you meet later, a halogen has no suffix form at all. However many there are, and whatever else the molecule contains, a halogen is always a prefix — it can never take over the ending.',
          M.br1butane,
          { caption: '1-bromobutane: bromo- in front, butane unchanged behind it.' }
        ),
        MC(
          'How is a chlorine atom cited in a name?',
          ['chlorine-', 'chloro-', 'chlor-'],
          1,
          'chloro-, as a prefix. The -ine ending becomes -o.'
        ),
        NM('chloroethane', M.chloroethane, { hint: 'Two carbons, one chlorine. Does it need a number?' }),
      ],
    },
    {
      id: 'u08-l2',
      title: 'Numbering and multiple halogens',
      teaches: ['halogens', 'naming', 'locants', 'branches'],
      pool: POOL_U8L2,
      ask: 10,
      steps: [
        T(
          'Where the halogen sits',
          'The prefix needs a locant, chosen the same way as always: number the chain so the substituent gets the lowest possible value.\n\n1-chloropropane and 2-chloropropane are different molecules, so the number is doing real work. Where both ends give the same answer — chloroethane, for instance — no number is needed.',
          M.cl1propane,
          { caption: '1-chloropropane. Counting from the other end would give 3, so 1 wins.' }
        ),
        T(
          'More than one halogen',
          'Several halogens follow the rules you already know: di- or tri- for repeats, a locant for every one, and commas between the numbers.\n\n1,2-dichloroethane has a chlorine on each carbon. Different halogens are listed alphabetically — bromo before chloro — exactly as alkyl branches are.',
          M.dcl12ethane,
          { caption: '1,2-dichloroethane: two chlorines, two locants, one comma.' }
        ),
        MC(
          'A molecule has a chlorine and a methyl group. Which is cited first?',
          ['chloro, because halogens always come first', 'chloro, because c comes before m alphabetically', 'methyl, because carbon comes first'],
          1,
          'Substituents are listed alphabetically and halogens get no special treatment: chloro before methyl.'
        ),
        NM('1-chloro-2-methylbutane', M.cl1m2butane, {
          hint: 'Two substituents: cite them alphabetically, and number for the lowest set.',
        }),
      ],
    },
    {
      id: 'u08-checkpoint',
      title: 'Checkpoint: haloalkanes',
      checkpoint: true,
      teaches: ['halogens', 'naming', 'locants', 'drawing'],
      pool: POOL_U8CP,
      ask: 15,
      steps: [],
    },
  ],
};

// ── Planned units (7–38) ─────────────────────────────────────
const P = (id, n, title, subtitle, level, topics, difficulty, plannedLessons) => ({
  id,
  n,
  title,
  subtitle,
  level,
  topics,
  difficulty,
  plannedLessons,
});

export const STAGES = [
  { id: 'stage-1', n: 1, title: 'Foundations', blurb: 'Alkanes, chains, the naming skeleton', units: [U1, U3] },
  { id: 'stage-2', n: 2, title: 'Branching', blurb: 'Branching and substituents', units: [U4, U5, U6] },
  {
    id: 'stage-3', n: 3, title: 'Unsaturation and halogens', blurb: 'Multiple bonds and the first ranks',
    units: [
      U7,
      U8,
    ],
  },
  {
    id: 'stage-4', n: 4, title: 'Oxygen and the ladder', blurb: 'The heart of the course', 
    units: [
      P('u09-alcohols', 8, 'Alcohols', '-ol, -diol, and beating the double bond', 'VCE', ['functional-groups'], 3, 4),
      P('u10-priority', 9, 'Functional-group priority', 'The seniority ladder, stated explicitly', 'VCE', ['functional-groups'], 3, 4),
      P('u11-aldehydes', 10, 'Aldehydes', '-al: locant-free because terminal', 'VCE', ['functional-groups'], 3, 3),
      P('u12-ketones', 11, 'Ketones', '-one with a locant; why propan-2-one is the smallest', 'VCE', ['functional-groups'], 3, 3),
      P('u13-carboxylic-acids', 12, 'Carboxylic acids', '-oic acid, top of the ladder', 'VCE', ['functional-groups'], 3, 4),
      P('u14-esters', 13, 'Esters', 'The two-word name and the swapped-half trap', 'VCE', ['functional-groups'], 4, 4),
      P('u15-acyl-halides', 14, 'Acyl halides', '-oyl chloride vs a halogen substituent', 'UNI', ['functional-groups'], 4, 3),
      P('u16-anhydrides', 15, 'Acid anhydrides', 'Two carbonyls flanking one oxygen', 'UNI', ['functional-groups'], 4, 3),
    ],
  },
  {
    id: 'stage-5', n: 5, title: 'Nitro and ethers', blurb: 'A breather: prefix-only groups',
    units: [
      P('u17-nitro', 16, 'Nitro compounds', 'nitro-: a permanent prefix', 'UNI', ['functional-groups'], 3, 3),
      P('u18-ethers', 17, 'Ethers', 'alkoxy- prefixes and functional-group isomerism', 'UNI', ['functional-groups'], 3, 3),
    ],
  },
  {
    id: 'stage-6', n: 6, title: 'Nitrogen', blurb: 'Slotting nitrogen into the ladder',
    units: [
      P('u19-amines', 18, 'Amines', '-amine, amino-, and the amino-acid preview', 'VCE', ['functional-groups'], 4, 4),
      P('u20-amides', 19, 'Amides', 'Amide vs amine: the carbonyl decides', 'VCE', ['functional-groups'], 4, 4),
      P('u21-nitriles', 20, 'Nitriles', '-nitrile and the counting trap', 'UNI', ['functional-groups'], 4, 3),
    ],
  },
  {
    id: 'stage-7', n: 7, title: 'Multifunctional molecules', blurb: 'No new groups — combining what exists',
    units: [
      P('u22-oh-with-others', 21, 'Alcohols with other groups', '-OH wins some, loses some', 'VCE', ['functional-groups'], 4, 3),
      P('u23-carbonyl-combos', 22, 'Carbonyl combinations', '-dial, -dione, and oxo-', 'VCE', ['functional-groups'], 4, 3),
      P('u24-n-and-o', 23, 'Nitrogen and oxygen together', 'The amino-acid pattern', 'VCE', ['functional-groups'], 5, 3),
      P('u25-full-multifunctional', 24, 'Full multifunctional', 'The four-step routine, made explicit', 'UNI', ['functional-groups'], 5, 4),
    ],
  },
  {
    id: 'stage-8', n: 8, title: 'Rings and aromatics', blurb: 'cyclo-, benzene, retained parents',
    units: [
      P('u26-cycloalkanes', 25, 'Cycloalkanes', 'cyclo- and exocyclic groups', 'UNI', ['functional-groups'], 4, 3),
      P('u27-benzene', 26, 'Benzene and aromatics', 'ortho/meta/para and retained parents', 'UNI', ['functional-groups'], 4, 4),
      P('u28-aromatic-groups', 27, 'Aromatic functional groups', 'Numbering anchored at the naming group', 'UNI', ['functional-groups'], 5, 3),
    ],
  },
  {
    id: 'stage-9', n: 9, title: 'Isomerism and stereochemistry', blurb: 'Distinctions expressed through naming',
    units: [
      P('u29-constitutional', 28, 'Constitutional isomers', 'Different names, different compounds', 'UNI', ['stereochemistry'], 4, 3),
      P('u30-cis-trans', 29, 'Cis/trans isomerism', 'Restricted rotation — including the failures', 'VCE', ['stereochemistry'], 4, 3),
      P('u31-ez', 30, 'E/Z nomenclature', 'CIP priorities at the double bond', 'UNI', ['stereochemistry'], 5, 4),
      P('u32-chiral-centres', 31, 'Chiral centres', 'Four different groups — with achiral controls', 'UNI', ['stereochemistry'], 5, 3),
      P('u33-rs', 32, 'R/S configuration', 'Rank, point away, read the circle', 'UNI', ['stereochemistry'], 5, 4),
    ],
  },
  {
    id: 'stage-10', n: 10, title: 'Advanced nomenclature', blurb: 'Complex systems and mastery',
    units: [
      P('u34-complex-substituents', 33, 'Complex substituents', 'isopropyl, tert-butyl, and parent choice under pressure', 'UNI', ['functional-groups'], 5, 3),
      P('u35-fused-bridged', 34, 'Fused and bridged rings', 'bicyclo[x.y.z] decoded', 'UNI', ['functional-groups'], 5, 3),
      P('u36-spiro', 35, 'Spiro compounds', 'One shared atom vs two', 'UNI', ['functional-groups'], 5, 3),
      P('u37-heterocycles', 36, 'Heterocycles', 'Pyridine to pyrimidine', 'UNI', ['functional-groups'], 5, 3),
      P('u38-mastery', 37, 'Mastery review', 'Every family, plus the recurring traps', 'UNI', ['functional-groups'], 5, 4),
    ],
  },
];

// ── Flat unit list (order = curriculum order) ────────────────
export const UNITS = STAGES.flatMap((s) =>
  s.units.map((u) => ({
    ...u,
    stageId: s.id,
    stageN: s.n,
    stageTitle: s.title,
    lessons: u.lessons ? u.lessons.length : u.plannedLessons,
    lessonList: u.lessons || null,
  }))
);

export const unitById = (id) => UNITS.find((u) => u.id === id) || null;
export const totalUnits = UNITS.length;
