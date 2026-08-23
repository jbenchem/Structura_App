// ─────────────────────────────────────────────────────────────
// Structura curriculum — 10 stages, 38 units, matching
// structura-curriculum.md exactly (unit numbers 1–38).
//
// Design principles from the doc that shape authoring here:
//   • the [[seniority]] ladder is the spine; unit 10 teaches it
//     explicitly before the [[carbonyl]] pile-up
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
import { parseName } from '../engine/index.js';
import { quietRepeats } from './glossary';
// Authoring shortcut: MOL('nonane') asks the engine for the structure, so a
// molecule can be written by name instead of built by hand. An unrecognised
// name throws at load, naming the string, so a typo fails the test run.
import { fromName as MOL, padOptions } from './questionFactory';
import { carbonWithFiveBonds, carbonWithNeighbours } from './diagrams';
import {
  POOL_U1L1, POOL_U1L2, POOL_U1L3, POOL_U1L4,
  POOL_U2L1, POOL_U2L2, POOL_U2L3,
  POOL_U3L1, POOL_U3L2, POOL_U3CP,
  POOL_U4L1, POOL_U4L2, POOL_U4L3, POOL_U4CP,
  POOL_U5CP, POOL_U6CP,
  POOL_U7L1, POOL_U7L2, POOL_U7L3, POOL_U7CP,
  POOL_U8L1, POOL_U8L2, POOL_U8CP,
  POOL_U9L1, POOL_U9L2, POOL_U9CP,
  POOL_U10L1, POOL_U10L2, POOL_U10CP,
  POOL_U11L1, POOL_U11L2, POOL_U11CP,
  POOL_U12L1, POOL_U12L2, POOL_U12CP,
  POOL_U13L1, POOL_U13L2, POOL_U13CP,
  POOL_U14L1, POOL_U14L2, POOL_U14CP,
  POOL_U11L3, POOL_U11L4, POOL_U12L3, POOL_U12L4,
  POOL_U13L3, POOL_U13L4, POOL_U14L3, POOL_U14L4,
  POOL_U5L1, POOL_U5L2, POOL_U6L1, POOL_U6L2,
  POOL_U15L1, POOL_U15L2, POOL_U15L3, POOL_U15CP,
  POOL_U16L1, POOL_U16L2, POOL_U16L3, POOL_U16CP,
  POOL_U17L1, POOL_U17L2, POOL_U17L3, POOL_U17CP,
  POOL_U18L1, POOL_U18L2, POOL_U18L3, POOL_U18CP,
  POOL_U19L1, POOL_U19L2, POOL_U19CP,
  POOL_U20L1, POOL_U20L2, POOL_U20L3, POOL_U20CP,
  POOL_U21L1, POOL_U21L2, POOL_U21L3, POOL_U21CP,
  POOL_U22L1, POOL_U22L2, POOL_U22CP,
  POOL_U23L1, POOL_U23L2, POOL_U23L3, POOL_U23CP,
  POOL_U24L1, POOL_U24L2, POOL_U24L3, POOL_U24CP,
  POOL_U25L1, POOL_U25L2, POOL_U25L3, POOL_U25L4, POOL_U25CP,
  POOL_U26L1, POOL_U26L2, POOL_U26CP,
  POOL_U27L1, POOL_U27L2, POOL_U27CP,
  POOL_U28L1, POOL_U28L2, POOL_U28CP,
  POOL_U31L1, POOL_U31L2, POOL_U31CP,
  POOL_U29L1, POOL_U29L2, POOL_U29CP,
  POOL_U30L1, POOL_U30L2, POOL_U30CP,
} from './pools';

// ── Authoring helpers ────────────────────────────────────────
// The fourth argument carries display options: { showCarbons, caption }.
// showCarbons draws every atom (CH3-CH2-CH3) instead of a bare skeleton.
// Every teaching card carries a visual: a molecule where one makes the point,
// otherwise `placeholder` describes the image that belongs there.
// Display options pass through whole rather than being whitelisted key by
// key. The whitelist was a standing trap: adding a new kind of visual meant
// remembering to allow it here too, and when that was forgotten the option was
// dropped silently — the card simply rendered without it.
//   showCarbons   draw every atom (CH3-CH2-CH3) instead of a bare skeleton
//   caption       a line under the diagram
//   split         { root, suffix, note } — the name broken into its parts
//   rootTable     the ten roots as a table
//   periodic      the main-group table, with periodicNote beneath
//   placeholder   a described image still to be drawn
const T = (title, body, mol, opts = {}) => ({
  type: 'teach',
  title,
  body,
  mol,
  showCarbons: !!opts.showCarbons,
  caption: opts.caption || null,
  placeholder: opts.placeholder || null,
  ...opts,
});
// showCarbons draws every atom (CH3-CH2-CH3) instead of the bare skeleton —
// use it whenever the question is about counting hydrogens.
// `intentionallyInvalid` marks the rare question that SHOWS a broken structure
// because the fault is the question. Everything else must be a real molecule,
// and tests/valid-structures.test.mjs enforces it.
const MC = (prompt, options, answer, explain, mol, showCarbons, intentionallyInvalid) => {
  // Every multiple choice offers four. The fourth is generated from the shape
  // of the other three so it belongs with them rather than reading as filler.
  const seed = prompt.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const padded = padOptions(options, answer, 'identify THE group', seed);
  return {
  type: 'mc',
  prompt,
  options: padded.options,
  answer: padded.answer,
  explain,
  mol,
  showCarbons: !!showCarbons,
  intentionallyInvalid: !!intentionallyInvalid,
  };
};
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
// Interactive: change the chain length and move the [[hydroxyl]]; the name follows.
const ALCOHOL_STEP = (title, body, extra = {}) => ({ type: 'alcohol', title, body, ...extra });
// Interactive: change the [[parent chain]], the branch position and the branch
// length, and watch the name follow — including when the branch takes over.
const BRANCH_STEP = (title, body, extra = {}) => ({ type: 'branch', title, body, ...extra });
// Interactive: choose which end to number from, with both candidates shown.
const numbering = (title, body, extra = {}) => ({ type: 'numbering', title, body, ...extra });
// Interactive: swap the [[functional group]] on a fixed chain.
const SWAP = (title, body, forms, extra = {}) => ({ type: 'swap', title, body, forms, ...extra });
// Interactive: switch groups on and off and watch which takes the suffix.
const priority = (title, body, extra = {}) => ({ type: 'priority', title, body, ...extra });
// Interactive: flip a configuration — including cases where nothing changes.
const FLIP = (title, body, forms, extra = {}) => ({ type: 'flip', title, body, forms, ...extra });
// Interactive: collect distinct isomers; duplicates are caught by name.
const ISOMERS = (title, body, drawings, extra = {}) => ({ type: 'isomers', title, body, drawings, ...extra });
// Interactive: draw every isomer of a formula, with the engine as referee.
const HUNT = (title, body, extra = {}) => ({ type: 'isomerhunt', title, body, ...extra });
// Interactive: slide a drawing between skeletal and [[semi-structural]].
const FORMS = (title, body, extra = {}) => ({ type: 'formslider', title, body, ...extra });
// Interactive: change ring size and [[substituent]] positions.
const RING = (title, body, extra = {}) => ({ type: 'ring', title, body, ...extra });
// Interactive: compare two [[locant]] sets term by term.
const LOCANTS = (title, body, extra = {}) => ({ type: 'locants', title, body, ...extra });
// Interactive: change the bicyclo bridge numbers and watch the root follow.
const BRACKETS = (title, body, extra = {}) => ({ type: 'brackets', title, body, ...extra });
// Interactive: tap along a path and be told how long it is.
const TRACE = (title, body, extra = {}) => ({ type: 'trace', title, body, ...extra });
// Interactive: order prefixes alphabetically, di- excluded.
const SORT = (title, body, extra = {}) => ({ type: 'sort', title, body, ...extra });
// Interactive: slide a [[carbonyl]] and watch the family change with it.
const SLIDE = (title, body, forms, extra = {}) => ({ type: 'slide', title, body, forms, ...extra });
// Interactive: test whether a group can take the suffix at all.
const SUFFIXTEST = (title, body, groups, extra = {}) => ({ type: 'suffixtest', title, body, groups, ...extra });
// Interactive: work the naming routine one decision at a time.
const STEPTHROUGH = (title, body, extra = {}) => ({ type: 'stepthrough', title, body, ...extra });
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
  const L = 48;
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
    atoms.push({ id: `t${i}`, el: 'C', x, y, charge: 0, showH: false });
    if (i) bonds.push({ id: `tb${i}`, a: `t${i - 1}`, b: `t${i}`, order: 1, stereo: null });
    if (i < n - 1) {
      const rad = (dirs[i] * Math.PI) / 180;
      x += L * Math.cos(rad);
      y += L * Math.sin(rad);
    }
  }
  return { atoms, bonds };
}

// ── Target molecules for units 1–6 ───────────────────────────
// Rings are far easier to build from their name than from coordinates, and
// the parser is the engine's own, so anything it returns is correct by
// construction.
const byName = (n) => {
  const p = parseName(n);
  return p.ok ? p.mol : null;
};

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
  // alcohols
  ethanol: buildTarget([...Cn(2), 'O'], [...chainBonds(2), [0, 2]]),
  propan1ol: buildTarget([...Cn(3), 'O'], [...chainBonds(3), [0, 3]]),
  propan2ol: buildTarget([...Cn(3), 'O'], [...chainBonds(3), [1, 3]]),
  butan1ol: buildTarget([...Cn(4), 'O'], [...chainBonds(4), [0, 4]]),
  butan2ol: buildTarget([...Cn(4), 'O'], [...chainBonds(4), [1, 4]]),
  pentan2ol: buildTarget([...Cn(5), 'O'], [...chainBonds(5), [1, 5]]),
  ethanediol: buildTarget([...Cn(2), 'O', 'O'], [...chainBonds(2), [0, 2], [1, 3]]),
  // competing groups
  butenol: buildTarget([...Cn(4), 'O'], [...chainBonds(4, { 3: 2 }), [0, 4]]),
  chlorobutanol: buildTarget([...Cn(4), 'O', 'Cl'], [...chainBonds(4), [0, 4], [3, 5]]),
  chlorobutene: buildTarget([...Cn(4), 'Cl'], [...chainBonds(4, { 1: 2 }), [3, 4]]),
  chloromethylpentane: buildTarget([...Cn(6), 'Cl'], [...chainBonds(5), [3, 5], [0, 6]]),
  // [[carbonyl]] families
  ethanal: buildTarget([...Cn(2), 'O'], [...chainBonds(2), [1, 2, 2]]),
  propanal: buildTarget([...Cn(3), 'O'], [...chainBonds(3), [2, 3, 2]]),
  butanal: buildTarget([...Cn(4), 'O'], [...chainBonds(4), [3, 4, 2]]),
  propanone: buildTarget([...Cn(3), 'O'], [...chainBonds(3), [1, 3, 2]]),
  butanone: buildTarget([...Cn(4), 'O'], [...chainBonds(4), [1, 4, 2]]),
  pentan2one: buildTarget([...Cn(5), 'O'], [...chainBonds(5), [1, 5, 2]]),
  pentan3one: buildTarget([...Cn(5), 'O'], [...chainBonds(5), [2, 5, 2]]),
  ethanoicAcid: buildTarget([...Cn(2), 'O', 'O'], [...chainBonds(2), [1, 2, 2], [1, 3, 1]]),
  propanoicAcid: buildTarget([...Cn(3), 'O', 'O'], [...chainBonds(3), [2, 3, 2], [2, 4, 1]]),
  butanoicAcid: buildTarget([...Cn(4), 'O', 'O'], [...chainBonds(4), [3, 4, 2], [3, 5, 1]]),
  methylEthanoate: buildTarget([...Cn(3), 'O', 'O'], [[0, 1, 1], [1, 3, 2], [1, 4, 1], [4, 2, 1]]),
  ethylEthanoate: buildTarget([...Cn(4), 'O', 'O'], [[0, 1, 1], [1, 4, 2], [1, 5, 1], [5, 2, 1], [2, 3, 1]]),
  hydroxybutanoic: buildTarget([...Cn(4), 'O', 'O', 'O'], [...chainBonds(4), [0, 4, 2], [0, 5, 1], [3, 6, 1]]),
  oxopentanoic: buildTarget([...Cn(5), 'O', 'O', 'O'], [...chainBonds(5), [0, 5, 2], [0, 6, 1], [3, 7, 2]]),
  hydroxybutanal: buildTarget([...Cn(4), 'O', 'O'], [...chainBonds(4), [0, 4, 2], [3, 5, 1]]),
  hydroxypentanone: buildTarget([...Cn(5), 'O', 'O'], [...chainBonds(5), [1, 5, 2], [4, 6, 1]]),
  oxopentanal: buildTarget([...Cn(5), 'O', 'O'], [...chainBonds(5), [0, 5, 2], [3, 6, 2]]),
  propenol: buildTarget([...Cn(3), 'O'], [...chainBonds(3, { 1: 2 }), [2, 3, 1]]),
  methylMethanoate: buildTarget([...Cn(2), 'O', 'O'], [[0, 2, 2], [0, 3, 1], [3, 1, 1]]),
  oxobutanoate: buildTarget([...Cn(5), 'O', 'O', 'O'], [[0, 1, 1], [1, 2, 1], [2, 3, 1], [0, 5, 2], [0, 6, 1], [6, 4, 1], [2, 7, 2]]),
  // nitrogen families
  ethanamine: buildTarget([...Cn(2), 'N'], [...chainBonds(2), [0, 2]]),
  butan1amine: buildTarget([...Cn(4), 'N'], [...chainBonds(4), [0, 4]]),
  butan2amine: buildTarget([...Cn(4), 'N'], [...chainBonds(4), [1, 4]]),
  butanediamine: buildTarget([...Cn(4), 'N', 'N'], [...chainBonds(4), [0, 4], [3, 5]]),
  aminobutanol: buildTarget([...Cn(4), 'N', 'O'], [...chainBonds(4), [0, 4], [3, 5]]),
  ethanamide: buildTarget([...Cn(2), 'O', 'N'], [...chainBonds(2), [1, 2, 2], [1, 3, 1]]),
  propanamide: buildTarget([...Cn(3), 'O', 'N'], [...chainBonds(3), [2, 3, 2], [2, 4, 1]]),
  ethanenitrile: buildTarget([...Cn(2), 'N'], [...chainBonds(2), [1, 2, 3]]),
  butanenitrile: buildTarget([...Cn(4), 'N'], [...chainBonds(4), [3, 4, 3]]),
  glycine: buildTarget([...Cn(2), 'O', 'O', 'N'], [...chainBonds(2), [1, 2, 2], [1, 3, 1], [0, 4, 1]]),
  // ethers and acyl halides
  methoxymethane: buildTarget([...Cn(2), 'O'], [[0, 2, 1], [2, 1, 1]]),
  methoxyethane: buildTarget([...Cn(3), 'O'], [[0, 3, 1], [3, 1, 1], [1, 2, 1]]),
  ethoxyethane: buildTarget([...Cn(4), 'O'], [[0, 1, 1], [1, 4, 1], [4, 2, 1], [2, 3, 1]]),
  ethanolForEther: buildTarget([...Cn(2), 'O'], [...chainBonds(2), [0, 2]]),
  ethanoylChloride: buildTarget([...Cn(2), 'O', 'Cl'], [...chainBonds(2), [1, 2, 2], [1, 3, 1]]),
  propanoylChloride: buildTarget([...Cn(3), 'O', 'Cl'], [...chainBonds(3), [2, 3, 2], [2, 4, 1]]),
  chlorobutanoylChloride: buildTarget([...Cn(4), 'O', 'Cl', 'Cl'], [...chainBonds(4), [3, 4, 2], [3, 5, 1], [1, 6, 1]]),
  nitroethane: buildTarget([...Cn(2), 'NO2'], [...chainBonds(2), [0, 2]]),
  nitropropane2: buildTarget([...Cn(3), 'NO2'], [...chainBonds(3), [1, 3]]),
  dinitrobutane: buildTarget([...Cn(4), 'NO2', 'NO2'], [...chainBonds(4), [0, 4], [3, 5]]),
  nitropropanol: buildTarget([...Cn(3), 'NO2', 'O'], [...chainBonds(3), [0, 3], [2, 4]]),
  // rings and aromatics, built from names the engine verifies
  cyclohexane: byName('cyclohexane'),
  cyclopentane: byName('cyclopentane'),
  methylcyclohexane: byName('methylcyclohexane'),
  dimethylcyclohexane13: byName('1,3-dimethylcyclohexane'),
  cyclohexanol: byName('cyclohexan-1-ol'),
  benzene: byName('benzene'),
  methylbenzene: byName('methylbenzene'),
  dimethylbenzene14: byName('1,4-dimethylbenzene'),
  phenol: byName('phenol'),
  aniline: byName('aniline'),
  benzoicAcid: byName('benzoic acid'),
  hexene1: buildTarget(Cn(6), chainBonds(6, { 1: 2 })),
  // isomer counting
  hexaneIso: byName('hexane'),
  methylpentane2: byName('2-methylpentane'),
  methylpentane3: byName('3-methylpentane'),
  dimethylbutane22: byName('2,2-dimethylbutane'),
  dimethylbutane23: byName('2,3-dimethylbutane'),
  heptaneIso: byName('heptane'),
  // [[isomer|isomers]] and stereochemistry
  butaneStraight: byName('butane'),
  methylpropane: byName('2-methylpropane'),
  pentaneStraight: byName('pentane'),
  dimethylpropane: byName('2,2-dimethylpropane'),
  cisButene: byName('cis-but-2-ene'),
  transButene: byName('trans-but-2-ene'),
  butene1: byName('but-1-ene'),
  methylpropene: byName('2-methylprop-1-ene'),
  ezPentene: byName('(2E)-pent-2-ene'),
  ezMethylpentene: byName('(2E)-3-methylpent-2-ene'),
  rButanol: byName('(R)-butan-2-ol'),
  sButanol: byName('(S)-butan-2-ol'),
  butan1ol_achiral: byName('butan-1-ol'),
  propan2ol_achiral: byName('propan-2-ol'),
  butanediolRS: byName('(2R,3S)-butane-2,3-diol'),
  alanineS: byName('(S)-2-aminopropanoic acid'),
  // multifunctional
  propanedial: byName('propanedial'),
  pentanedione: byName('pentane-2,4-dione'),
  butanedioic: byName('butanedioic acid'),
  oxopentanoicAcid: byName('4-oxopentanoic acid'),
  hydroxyOxo: byName('5-hydroxy-4-oxopentanoic acid'),
  glycineMulti: byName('2-aminoethanoic acid'),
  alanineMulti: byName('2-aminopropanoic acid'),
  aminoButanol: byName('4-aminobutan-1-ol'),
  serine: byName('2-amino-3-hydroxypropanoic acid'),
  aminoHydroxyButanoic: byName('4-amino-3-hydroxybutanoic acid'),
  chlorophenol2: byName('2-chlorophenol'),
  nitroaniline4: byName('4-nitroaniline'),
  salicylic: byName('2-hydroxybenzoic acid'),
  trimethylpentane: byName('2,2,4-trimethylpentane'),
  methylpropylheptane: byName('4-(2-methylpropyl)heptane'),
  isopropylbenzene: byName('propan-2-ylbenzene'),
  norbornane: byName('bicyclo[2.2.1]heptane'),
  spiroDecane: byName('spiro[4.5]decane'),
  naphthaleneM: byName('naphthalene'),
  pyridineM: byName('pyridine'),
  furanM: byName('furan'),
  pyrimidineM: byName('pyrimidine'),
  ethanoicAnhydride: byName('ethanoic anhydride'),
  propanoicAnhydride: byName('propanoic anhydride'),
  ethanoylCl: byName('ethanoyl chloride'),
  methylEthanoateM: byName('methyl ethanoate'),
  ethanamideM: byName('ethanamide'),
  ethanoicAcidM: byName('ethanoic acid'),
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
          'Organic chemistry is the chemistry of carbon compounds. Millions of them exist — the fuel in a car, the plastic in a bottle, the active ingredient in a medicine — and every one has a name that describes exactly how it is built.\n\nThis course teaches you to read those names and to draw what they describe. You need no prior chemistry: we start with what a molecule actually is.',
          M.m2butane,
          {
            caption:
              'By the end of this unit you will be able to look at a structure like this one and name it.',
          }
        ),
        T(
          'Atoms join by sharing bonds',
          'A molecule is a group of atoms held together. Each connection between two atoms is called a bond, and we draw it as a line.\n\nEvery kind of atom will make a fixed number of bonds. Hydrogen makes one. Oxygen makes two. Carbon makes four — always exactly four, never three, never five.\n\nThat number is not arbitrary: it is set by where the element sits in the periodic table. This course works almost entirely within the [[main group]] — the tall columns at either side, shaded below — because those elements bond predictably. The metals in the middle do not, and you will not meet them here.',
          methaneWithH(),
          {
            showCarbons: true,
            caption: 'Methane, CH4. Four lines leave the carbon — one to each hydrogen.',
            periodic: true,
            periodicNote:
              'The [[main group]]. Filled cells are the elements these molecules are built from: carbon, hydrogen, oxygen, nitrogen and the halogens.',
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
          true,
          true // the broken structure IS the question
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
          'Real molecules get large. The one below has twenty carbons — and by the four-bond rule it also carries forty-two hydrogens. That is sixty-two atoms and sixty-one bonds to draw, for a molecule that is nothing more than a plain chain.\n\nHydrogen and carbon make up almost every atom in an organic molecule, so writing them all out is mostly labour, and the shape gets buried in the detail.\n\nSo chemists draw the [[skeletal form]]: just the lines between carbons. Nothing has been thrown away — every hydrogen is still there, and the four-bond rule tells you exactly how many sit on each carbon.',
          MOL('icosane'),
          {
            caption:
              'Icosane, C20H42, drawn as a [[skeletal form]]. Writing out all sixty-two atoms would take a page and tell you nothing extra.',
          }
        ),
        TOGGLE(
          'The same molecule, two ways',
          'Switch between the two views. Nothing about the molecule changes — only how much of it we bother to draw.',
          chain(4),
          'Every atom drawn: CH3-CH2-CH2-CH3. Four carbons, ten hydrogens.',
          'The [[skeletal form]]. Each line end and each corner is a carbon; its hydrogens are implied.'
        ),
        T(
          'Where the carbons hide',
          'In a skeletal drawing there are no letters for carbon. Instead:\n\n• every line end is a carbon\n• every corner is a carbon\n\nThe zigzag is not decoration — each bend marks another atom.',
          chain(5),
          { caption: 'Two ends and three corners: five carbons, pentane.' }
        ),
        T(
          'How it is normally drawn — and how else it might be',
          'Chains are almost always drawn as a zigzag with roughly 120° between bonds, running left to right. That is a convention, not a rule: it keeps bond angles honest and makes the carbons easy to count.\n\nBut the same molecule is still the same molecule drawn at an odd angle, turned upside down, or bent around a corner. In an exam you may well meet one drawn awkwardly on purpose.\n\nSo read the connections, never the orientation. Count the line ends and corners, and ignore which way the drawing happens to face.',
          chain(5),
          {
            caption: 'Pentane in the usual zigzag. Rotated or bent, it is still pentane.',
          }
        ),
        T(
          'Working out the hydrogens',
          'Now that the carbons are visible, the hydrogens follow. Each carbon has four bonds; whatever is not used on a neighbour is hydrogen.\n\nA carbon at the end of a chain has one neighbour, so it carries three hydrogens — a CH3 group.\nA carbon in the middle has two neighbours, so it carries two — a CH2 group.\n\nThat is the whole rule. You never need to draw them; you count the neighbours and subtract.',
          chain(4),
          {
            showCarbons: true,
            caption: 'Butane written out: CH3 at each end, CH2 in the middle. Four bonds on every carbon.',
          }
        ),
        FORMS(
          'Watch one turn into the other',
          'Slide from left to right and the drawing converts a carbon at a time.\n\nStop halfway and you have both notations on screen at once — the left in [[skeletal form]], the right written out with its hydrogens. Nothing about the molecule changes; only how it is written.',
          { name: 'pentane' }
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
          'What makes something an [[alkane]]',
          'A molecule built only from carbon and hydrogen is a [[hydrocarbon]].\n\nIf every carbon-carbon bond in it is a single bond — one line, never two or three — it is an [[alkane]]. Alkanes are the simplest family in organic chemistry and the foundation for everything after, which is why they come first.',
          chain(4),
          { caption: 'Butane: only carbon and hydrogen, only single bonds. An [[alkane]].' }
        ),
        T(
          'Counting the hydrogens',
          'Because ends carry three hydrogens and middles carry two, the hydrogen count follows automatically from the carbon count.\n\nAn [[alkane]] with n carbons always has 2n + 2 hydrogens.\n\nSo 4 carbons gives 2(4) + 2 = 10 hydrogens: C4H10.',
          chain(4),
          { showCarbons: true, caption: 'Two CH3 ends and two CH2 middles: C4H10.' }
        ),
        MC(
          'Which formula fits an [[alkane]] with 5 carbons?',
          ['C5H10', 'C5H12', 'C5H8', 'C5H14'],
          1,
          '2n + 2 with n = 5 gives 12 hydrogens, so C5H12. You never have to count them by hand.'
        ),
        MC(
          'Why does an [[alkane]] with 6 carbons have 14 hydrogens rather than 12?',
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
          'A name has two parts',
          'Every name in this course is built from parts. The first two are all you need for now:\n\nThe [[root]] says how many carbons are in the main chain.\nThe [[suffix]] says what kind of molecule it is.\n\nGet those two right and you have named an [[alkane]].',
          chain(6),
          {
            caption: 'Six carbons in a chain — the molecule the name below describes.',
            split: {
              root: 'hex',
              suffix: 'ane',
              note: 'hex- counts the six carbons; -ane says every bond is single. Together: hexane.',
            },
          }
        ),
        T(
          'The ten roots',
          'The first four are historical names and simply have to be learnt. From pent- onwards they are the Greek number words you already know from pentagon, hexagon and octagon.\n\nYou do not need to memorise this before moving on: tap the book icon in the top right at any time and this table is the first thing you will see.',
          null,
          { rootTable: true }
        ),
        BUILD(
          'Change the chain, watch the name',
          'Add and remove carbons. The root changes to match the count every single time — and the ending never moves.',
          { start: 3, min: 1, max: 10 }
        ),
        T(
          'Why the ending is -ane',
          '-ane is the default ending. It means the chain is [[saturated]]: every carbon-carbon bond is a single bond and every remaining space is filled with hydrogen.\n\nUnless the molecule contains something worth reporting, it gets -ane. Later you will meet endings that replace it — -ene for a double bond, -yne for a triple bond, -ol for an alcohol — but each of those replaces -ane only because something has changed. Change nothing, and it stays -ane.',
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
      ask: 10,
      steps: [
        T(
          'Three steps, every time',
          'To name a straight-chain [[alkane]]:\n\n1. Count the carbons — ends and corners.\n2. Take the root for that number.\n3. Add the suffix -ane.\n\nThat is the whole method. The rest of this course adds cases to it, but never replaces it.',
          chain(6),
          {
            caption: 'Step 1: count. Two ends and four corners — six carbons.',
            split: {
              root: 'hex',
              suffix: 'ane',
              note: 'Step 2: six carbons gives hex-. Step 3: single bonds throughout gives -ane.',
            },
          }
        ),
        COUNT(
          'Step 1 on a real structure',
          'Before naming this, count it. Tap every carbon.',
          chain(4),
          { doneNote: 'Four carbons, so the root is but-.' }
        ),
        // One worked example is enough here: the quiz that follows is entirely
        // naming, so repeating it four times before getting there just delays
        // the same practice.
        NM('butane', M.butane, { hint: 'Four carbons → but-, and all single bonds → -ane.' }),
      ],
    },
    {
      id: 'u02-l2',
      teaches: ['skeletal', 'roots', 'naming', 'drawing'],
      title: 'Name to structure',
      pool: POOL_U2L2,
      ask: 10,
      steps: [
        T(
          'Reading a name backwards',
          'Naming and drawing are the same skill in reverse. Given a name:\n\n1. Read the root to get the carbon count.\n2. Draw that many carbons in a zigzag.\n3. The -ane suffix tells you every bond is single, so leave them all as plain lines.\n\nYou never draw hydrogens.',
          chain(6),
          {
            split: {
              root: 'hex',
              suffix: 'ane',
              note: 'Read it backwards: hex- means six carbons, -ane means single bonds only.',
            },
            caption: 'Which gives exactly this: six carbons in a zigzag, every bond a plain line.',
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
      ask: 15,
      steps: [],
    },
  ],
};

const U3 = {
  id: 'u03-parent-chain',
  n: 2,
  title: 'Finding the [[parent chain]]',
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
      ask: 10,
      steps: [
        T(
          'Drawings lie about shape',
          'A chain does not stop being one chain because the drawing turns a corner. This molecule bends across the page — but trace it carbon to carbon and it is one continuous six-carbon chain: hexane. Always read connectivity, never the drawn direction.',
          M.hexaneBent
        ),
        TRACE(
          'Trace it yourself',
          'Tap a carbon to start, then tap along a connected path. The counter tells you how many carbons you have covered.\n\nThe [[parent chain]] is the longest path through the molecule — and it does not have to be the one drawn straight across.',
          { molecule: { chain: 6, branches: [{ at: 3, size: 2 }] } }
        ),
        MC('How many carbons are in this bent [[skeletal form]]?', ['5', '6', '7'], 1, 'Trace it end to end: the bend is just a drawing choice. Six carbons — hexane.', M.hexaneBent),
        NM('hexane', M.hexaneBent, { hint: 'Trace the chain through the bend before counting.' }),
      ],
    },
    {
      id: 'u03-l2',
      teaches: ['bent-chains', 'naming'],
      title: 'Error analysis: the missed bend',
      pool: POOL_U3L2,
      ask: 10,
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
      ask: 15,
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
          'Parent and [[substituent]]',
          'Every branched molecule splits into two parts:\n\nThe [[parent chain]] — the longest continuous run of carbons. It gives the root and keeps the -ane ending.\n\nA [[substituent]] — anything hanging off that chain. It is named separately and written in front.\n\nThe parent is not "the horizontal one" or "the one drawn first". It is simply the longest path you can trace through the carbons.',
          M.m3pentane,
          { caption: 'Parent chain: five carbons. Substituent: the single carbon branching from the middle.' }
        ),
        MC(
          'In this molecule, which is the [[parent chain]]?',
          ['The five-carbon chain', 'The single branching carbon', 'Whichever is drawn horizontally'],
          0,
          'The longest continuous run of carbons is the parent, however the molecule happens to be drawn.',
          M.m3pentane
        ),
        T(
          'The -yl ending names a branch',
          'A [[substituent]] is named from its own carbon count, using the same roots as before but ending in -yl instead of -ane:\n\nmethyl (1 carbon)   ethyl (2)   propyl (3)   butyl (4)\n\nThe ending is the whole difference. -ane says "this is the [[parent chain]]"; -yl says "this hangs off it".',
          M.e3pentane,
          { caption: 'A two-carbon branch on a five-carbon parent: an ethyl group on pentane.' }
        ),
        MC(
          'How many carbons are in a methyl group?',
          ['1', '2', '3'],
          0,
          'meth = 1 carbon, and -yl marks it as a [[substituent]] rather than a parent.'
        ),
        MC(
          'A two-carbon branch is called…',
          ['ethane', 'ethyl', 'diethyl'],
          1,
          'eth = 2 carbons, + -yl for a branch. Ethane would be the [[parent chain]]; diethyl means two separate ethyl groups.'
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
      title: 'Naming a branched [[alkane]]',
      teaches: ['branches', 'locants', 'naming'],
      pool: POOL_U4L2,
      ask: 10,
      steps: [
        T(
          'Four steps, in order',
          '1. Find the longest continuous chain — that is the parent, and gives the root.\n2. Number the chain from the end nearest the branch.\n3. Name the branch with its -yl ending.\n4. Write the number, a hyphen, the branch, then the parent: 2-methylbutane.\n\nThe order matters. Numbering before you have settled the [[parent chain]] is the commonest way to get a wrong answer.',
          M.m2butane,
          { caption: '2-methylbutane: butane parent, methyl branch, sitting on carbon 2.' }
        ),
        BRANCH_STEP(
          'Build one and watch the name',
          'Three things to change: how many carbons run across, where the branch sits, and how long the branch is.\n\nStart by moving the branch along the chain and watch the number. Then make the branch longer, and watch what happens to the parent — the rule is always "longest continuous chain", and a branch that grows past the chain it hangs on simply becomes the new parent.',
          { startParent: 6, startAt: 3, startBranch: 1, minParent: 4, maxParent: 8 }
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
          'Counting from the near end puts the methyl on carbon 2; from the far end it would be carbon 5. The lower [[locant]] is compulsory.',
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
          'A number is separated from a word by a hyphen, and nothing else:\n\n2-methylbutane — correct\n2 methylbutane, 2,methylbutane, methyl-2-butane — all wrong\n\nThe branch is written in front of the parent as one word: methyl + butane becomes methylbutane, with the [[locant]] in front of the whole thing.',
          M.m3hexane,
          { caption: '3-methylhexane: [[locant]], hyphen, branch, parent — in that order, as one word.' }
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
          { caption: 'Parent first, then count to the [[locant]], then attach the branch.' }
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
      pool: POOL_U5L1,
      ask: 10,
      teaches: ['locants'],
      title: 'The lowest-locant rule',
      steps: [
        T(
          'Direction matters',
          'A chain can be numbered from either end — but only one direction is correct. Number from the end that gives substituents the lowest locants. A methyl on the second carbon from the right is 2-methyl, not 5-methyl, if you count from the correct end.',
          M.m2hexane
        ),
        numbering(
          'Try it both ways',
          'Here is a five-carbon chain with one methyl. Number it from the left and the methyl gets one [[locant]]; number from the right and it gets another.\n\nBoth describe the same molecule, and only one is the correct name. Choose an end and see which survives.',
          { chain: 5, at: 2 }
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
          'On a four-carbon chain, position 3 from one end is position 2 from the other. The lower [[locant]] is compulsory, so it is always 2-methylbutane.'
        ),
      ],
    },
    {
      id: 'u05-l2',
      pool: POOL_U5L2,
      ask: 10,
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
      steps: [],
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
      pool: POOL_U6L1,
      ask: 10,
      teaches: ['branches', 'locants'],
      title: 'di-, tri-, tetra-',
      steps: [
        T(
          'Counting identical branches',
          'Two identical substituents take the prefix di-, three tri-, four tetra-. Every [[substituent]] still needs its own [[locant]], separated by commas: 2,3-dimethylbutane has methyls on C2 and C3. Numbers repeat if branches share a carbon: 2,2-dimethylpropane.',
          M.dm23butane
        ),
        MC(
          'What is this molecule called?',
          ['2,2-dimethylpropane', '1,1-dimethylpropane', 'trimethylethane'],
          0,
          'Parent chain propane; both methyls sit on C2 — each gets a [[locant]], so 2,2-.',
          M.dm22propane
        ),
        NM('2,3-dimethylbutane', M.dm23butane, { hint: 'Two methyls, two locants, one comma.' }),
      ],
    },
    {
      id: 'u06-l2',
      pool: POOL_U6L2,
      ask: 10,
      teaches: ['branches', 'locants', 'naming'],
      title: 'Alphabetical order',
      steps: [
        T(
          'ethyl before methyl',
          'Different substituents are listed alphabetically — ethyl before methyl — ignoring multiplying prefixes (dimethyl still alphabetizes under m). Punctuation rules: commas between numbers, hyphens between numbers and letters.',
          M.e3m2pentane,
          { caption: '3-ethyl-2-methylpentane: ethyl is cited first even though methyl has the lower [[locant]].' }
        ),
        SORT(
          'Put the prefixes in citation order',
          'Three substituents to cite. Put them in the order they would appear in the name.\n\nThe one to watch is the multiplying prefix — di-, tri- and so on do not count towards alphabetical order.',
          {
            items: [
              { label: 'dimethyl', sortKey: 'm' },
              { label: 'ethyl', sortKey: 'e' },
              { label: 'chloro', sortKey: 'c' },
            ],
            order: ['c', 'e', 'm'],
            noteRight: 'chloro, ethyl, dimethyl — and dimethyl files under m, not d. The di- is ignored for ordering.',
            noteWrong: 'Not yet. Remember that di- is not alphabetised: dimethyl files under m.',
          }
        ),
        MC(
          'Which ordering is correct for a molecule with an ethyl and a methyl branch?',
          ['…-methyl…-ethyl…', '…-ethyl…-methyl…'],
          1,
          'Alphabetical: e before m, regardless of locants.'
        ),
        NM('3-ethylpentane', M.e3pentane, { hint: 'The parent is the longest chain — check it is really 5, not 6.' }),
        NM('3-ethyl-2-methylpentane', M.e3m2pentane, { hint: 'Ethyl is cited first (alphabetical), even though methyl has the lower [[locant]].' }),
      ],
    },
    {
      id: 'u06-l3',
      teaches: ['branches', 'locants', 'naming', 'drawing'],
      title: 'Checkpoint: multiple substituents',
      checkpoint: true,
      pool: POOL_U6CP,
      ask: 15,
      steps: [],
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
          'Every molecule so far has been an [[alkane]]: carbon joined to carbon by a single bond, with hydrogen filling everything else.\n\nTwo carbons can also share a double bond — two connections instead of one, drawn as two parallel lines. A [[hydrocarbon]] containing one is an [[alkene]], and the ending changes from -ane to -ene.',
          M.but2ene,
          { caption: 'But-2-ene. The two lines in the middle are one double bond, not two separate bonds.' }
        ),
        T(
          'A double bond costs hydrogens',
          'A double bond uses two of a carbon\'s four bonds instead of one. Those carbons therefore hold one hydrogen fewer each.\n\nSo where an [[alkane]] is CnH(2n+2), an [[alkene]] with one double bond is CnH2n — two hydrogens fewer for the same number of carbons. This is what "[[unsaturated]]" means: there is room for more hydrogen.',
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
          'Naming an [[alkene]]',
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
          'A chain can still be numbered from either end, and now the double bond decides which. Number so the double bond gets the lowest possible [[locant]] — ahead of any branch.\n\nThe number given is always the lower of the two carbons the bond joins. A bond between carbons 2 and 3 is reported as 2.',
          M.pent2ene,
          { caption: 'Pent-2-ene: the bond joins carbons 2 and 3, so the name says 2.' }
        ),
        numbering(
          'The same rule, now for the double bond',
          'Nothing about numbering has changed — the double bond simply takes the place of the branch as the thing that must get the lowest number.\n\nChoose an end and check.',
          { chain: 5, at: 2 }
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
          'The bond must be in the [[parent chain]]',
          'When you pick the longest chain, it has to be one that contains the double bond. If a longer path exists that misses the bond, it is not the parent.\n\nThis is the one place where "longest chain" is not the whole rule — the double bond comes first.',
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
          'Carbons can share three bonds as well as one or two. A [[hydrocarbon]] containing a carbon-carbon triple bond is an [[alkyne]], and the ending is -yne.\n\nEverything else is unchanged: longest chain, lowest [[locant]] for the bond, number in front of the ending.',
          M.but2yne,
          { caption: 'But-2-yne. Three parallel lines mark one triple bond.' }
        ),
        T(
          'Even fewer hydrogens',
          'A triple bond uses three of each carbon\'s four bonds, so those carbons hold at most one hydrogen. An [[alkyne]] with one triple bond is CnH(2n-2) — four fewer hydrogens than the matching [[alkane]].',
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
          'Swapping a hydrogen for a [[halogen]]',
          'Replace one of an [[alkane]]\'s hydrogens with a [[halogen]] — fluorine, chlorine, bromine or iodine — and you have a haloalkane.\n\nHalogens form one bond, exactly like the hydrogen they replace, so they always sit at the end of a bond and never in the middle of a chain.',
          M.cl2butane,
          { caption: '2-chlorobutane: a butane chain with a chlorine on carbon 2.' }
        ),
        T(
          'They are always prefixes',
          'Each [[halogen]] is cited in front of the [[parent chain]], with -o replacing the usual ending:\n\nfluoro-   chloro-   bromo-   iodo-\n\nUnlike the groups you meet later, a [[halogen]] has no suffix form at all. However many there are, and whatever else the molecule contains, a [[halogen]] is always a prefix — it can never take over the ending.',
          M.br1butane,
          { caption: '1-bromobutane: bromo- in front, butane unchanged behind it.' }
        ),
        SUFFIXTEST(
          'Which groups can take the suffix?',
          'Tap each group to see whether it can end a name, or whether it is stuck as a prefix however it appears.',
          [
            { label: 'chloro', example: '1-chlorobutane', canSuffix: false,
              note: 'A [[halogen]] has no suffix form at all. However many there are, they stay in front.' },
            { label: 'alcohol', example: 'butan-1-ol', canSuffix: true,
              note: 'The [[hydroxyl]] takes -ol, which makes it the [[principal group]] whenever nothing more senior is present.' },
            { label: 'methyl', example: '2-methylbutane', canSuffix: false,
              note: 'An alkyl branch is always a prefix. A branch longer than the chain simply becomes the parent instead.' },
          ],
          { need: 3 }
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
          'Where the [[halogen]] sits',
          'The prefix needs a [[locant]], chosen the same way as always: number the chain so the [[substituent]] gets the lowest possible value.\n\n1-chloropropane and 2-chloropropane are different molecules, so the number is doing real work. Where both ends give the same answer — chloroethane, for instance — no number is needed.',
          M.cl1propane,
          { caption: '1-chloropropane. Counting from the other end would give 3, so 1 wins.' }
        ),
        T(
          'More than one [[halogen]]',
          'Several halogens follow the rules you already know: di- or tri- for repeats, a [[locant]] for every one, and commas between the numbers.\n\n1,2-dichloroethane has a chlorine on each carbon. Different halogens are listed alphabetically — bromo before chloro — exactly as alkyl branches are.',
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

const U9 = {
  id: 'u09-alcohols',
  n: 8,
  title: 'Alcohols',
  subtitle: 'The -OH group, and the suffix that outranks a prefix',
  level: 'VCE',
  topics: ['alcohols'],
  difficulty: 3,
  lessons: [
    {
      id: 'u09-l1',
      title: 'The [[hydroxyl]] group',
      teaches: ['alcohols', 'naming'],
      pool: POOL_U9L1,
      ask: 10,
      steps: [
        T(
          'A new atom in the chain',
          'Every molecule so far has been carbon and hydrogen, with at most a [[halogen]] hanging off. An alcohol adds an oxygen: one bonded to a carbon and to a hydrogen, written -OH and called a [[hydroxyl]] group.\n\nOxygen forms two bonds, which is exactly what -OH uses: one to the chain, one to its hydrogen.',
          M.ethanol,
          { caption: 'Ethanol: a two-carbon chain with a [[hydroxyl]] on the end.' }
        ),
        T(
          'The suffix changes, not a prefix',
          'A [[halogen]] is cited in front of the name as a prefix. A [[hydroxyl]] is not: it takes the [[suffix]], replacing the final -e of the parent [[alkane]].\n\nethane → ethanol\npropane → propan-1-ol\n\nThat difference matters more than it looks. A group that takes the suffix is the [[principal group]], and it decides how the chain is numbered.',
          M.propan1ol,
          { caption: 'Propan-1-ol. The parent is propane; the -e is dropped and -ol added.' }
        ),
        MC(
          'Which suffix marks an alcohol?',
          ['-ol', '-al', '-yl'],
          0,
          '-ol. -al is an aldehyde and -yl marks a [[substituent]] branch.'
        ),
        T(
          'Why oxygen only makes two bonds',
          'Look back at the periodic table: oxygen sits in group 16, so it forms two bonds. In an alcohol both are used — one to carbon, one to hydrogen — which is why -OH always hangs off the chain rather than sitting inside it.',
          M.butan1ol,
          { showCarbons: true, caption: 'Butan-1-ol drawn in full. The oxygen has exactly two bonds.' }
        ),
        NM('ethanol', M.ethanol, { hint: 'Two carbons, one [[hydroxyl]]. Does it need a number?' }),
      ],
    },
    {
      id: 'u09-l2',
      title: 'Numbering and diols',
      teaches: ['alcohols', 'naming', 'locants'],
      pool: POOL_U9L2,
      ask: 10,
      steps: [
        T(
          'The [[hydroxyl]] takes the lowest number',
          'The chain is numbered so the [[hydroxyl]] gets the lowest possible [[locant]], and the number goes immediately before the -ol.\n\nbutan-2-ol, not butan-3-ol: counted from the other end the same molecule gives 2, and the lower number is compulsory.',
          M.butan2ol,
          { caption: 'Butan-2-ol. From the left the OH is on carbon 2; from the right it would be 3.' }
        ),
        ALCOHOL_STEP(
          'Move the group, watch the number',
          'Change the chain length, then slide the [[hydroxyl]] along it. The number in the name is the carbon the -OH sits on — and it is always counted from the nearer end.\n\nPush it past the middle and watch what happens: the number does not keep climbing, because the chain is renumbered from the other side.',
          { start: 5, startAt: 1, min: 2, max: 8 }
        ),
        MC(
          'This molecule is correctly named…',
          ['pentan-2-ol', 'pentan-4-ol', 'either is acceptable'],
          0,
          'Numbering from the nearer end gives 2. The lower [[locant]] is compulsory.',
          M.pentan2ol
        ),
        T(
          'The [[hydroxyl]] outranks a branch',
          'When a molecule has both a branch and a [[hydroxyl]], the [[hydroxyl]] decides the numbering — it takes the suffix, and the suffix always gets the lowest [[locant]] it can. The branch takes whatever number follows.\n\nThis is the first step of the priority ladder you will meet in full later: some groups outrank others, and the winner takes the suffix.',
          M.butan2ol,
          { caption: 'The -ol is numbered first; any branch is numbered around it.' }
        ),
        T(
          'Two hydroxyls: a diol',
          'Two -OH groups on the same chain are named with di-, a [[locant]] for each, and commas between them.\n\nethane-1,2-diol — and note the -e of ethane is kept this time, because -diol begins with a consonant.',
          M.ethanediol,
          { caption: 'Ethane-1,2-diol: a [[hydroxyl]] on each carbon.' }
        ),
        NM('propan-2-ol', M.propan2ol, { hint: 'Three carbons, [[hydroxyl]] in the middle.' }),
      ],
    },
    {
      id: 'u09-checkpoint',
      title: 'Checkpoint: alcohols',
      checkpoint: true,
      teaches: ['alcohols', 'naming', 'locants', 'drawing'],
      pool: POOL_U9CP,
      ask: 15,
      steps: [],
    },
  ],
};

const U10 = {
  id: 'u10-priority',
  n: 9,
  title: 'Functional-group priority',
  subtitle: 'When two groups compete, one takes the suffix',
  level: 'VCE',
  topics: ['functional-groups'],
  difficulty: 3,
  lessons: [
    {
      id: 'u10-l1',
      title: 'The [[seniority]] ladder',
      teaches: ['priority', 'naming'],
      pool: POOL_U10L1,
      ask: 10,
      steps: [
        T(
          'What happens when a molecule has two groups',
          'Every molecule so far has had one thing worth reporting: a double bond, or a [[halogen]], or a [[hydroxyl]]. Real molecules often have several.\n\nOnly one of them can take the suffix — a name has one ending. So the groups are ranked, and the most senior one present wins. Everything else is demoted to a prefix.',
          M.butenol,
          {
            caption: 'but-3-en-1-ol: the [[hydroxyl]] took the -ol suffix, and the double bond was demoted to -en- inside the name.',
          }
        ),
        T(
          'The ladder, as far as you have met it',
          'Of everything taught so far, the order is:\n\n1. alcohol — takes -ol\n2. [[alkyne]] — takes -yne\n3. [[alkene]] — takes -ene\n4. [[alkane]] — takes -ane, the default\n\nAnd below all of them, two groups that can never take a suffix, however many there are:\n\nhalogens — always chloro-, bromo-, fluoro-, iodo-\nalkyl branches — always methyl-, ethyl-, propyl-\n\nThe full ladder is longer, and you can see all of it any time by tapping the book icon: it is the Naming priority tab.',
          null,
          {
            placeholder:
              'The ladder as a vertical staircase: alcohol at the top taking -ol, then [[alkyne]], [[alkene]], [[alkane]], with halogens and alkyl groups on a separate step below marked "prefix only".',
          }
        ),
        priority(
          'Add a group and watch who wins',
          'One four-carbon chain. Switch groups on and off, and watch the name rearrange — the most senior group present always takes the suffix, and whatever loses moves into a prefix.',
          {
            base: 'butane',
            groups: ['alcohol', 'double bond'],
            start: [],
            nameFor: {
              '': 'butane',
              '0': 'butan-1-ol',
              '1': 'but-1-ene',
              '0,1': 'but-3-en-1-ol',
            },
            noteFor: {
              '': 'A plain [[alkane]]: nothing to compete, so the ending is -ane.',
              '0': 'The alcohol is the only group, so it takes the suffix: -ol.',
              '1': 'The double bond is the only group, so it takes the suffix: -ene.',
              '0,1': 'Both present — the alcohol wins the suffix, and the double bond is demoted to -en- inside the name.',
            },
          }
        ),
        MC(
          'Which group takes the suffix in this molecule?',
          ['The chlorine', 'The [[hydroxyl]]', 'Whichever has the lower number'],
          1,
          'A [[halogen]] has no suffix form at all, so the [[hydroxyl]] is the most senior thing present and takes -ol.',
          M.chlorobutanol
        ),
        T(
          'Losing does not mean disappearing',
          'A demoted group is still named — it just moves. An [[alkene]] that loses to an alcohol becomes -en- inside the word; a [[hydroxyl]] that loses to something more senior becomes the prefix hydroxy-.\n\nSo but-3-en-1-ol reports both groups: -en- for the double bond at carbon 3, -ol for the [[hydroxyl]] at carbon 1.',
          M.butenol,
          { caption: 'Both groups appear. Only their position in the name changes.' }
        ),
        MC(
          'In 4-chlorobut-1-ene, which group took the suffix?',
          ['The chlorine', 'The double bond', 'Neither'],
          1,
          'The chlorine cannot take a suffix, so the double bond is the most senior group present.',
          M.chlorobutene
        ),
      ],
    },
    {
      id: 'u10-l2',
      title: 'Numbering when groups compete',
      teaches: ['priority', 'naming', 'locants'],
      pool: POOL_U10L2,
      ask: 10,
      steps: [
        T(
          'The [[principal group]] takes the lowest number',
          'Once you know which group is senior, numbering follows: it gets the lowest [[locant]] the chain allows, and everything else takes whatever number falls out.\n\nThat is why 4-chlorobutan-1-ol is not 1-chlorobutan-4-ol. Both describe the same molecule, but only one numbers from the end that serves the [[hydroxyl]].',
          M.chlorobutanol,
          { caption: 'The -ol is senior, so it takes carbon 1 and the chlorine ends up on carbon 4.' }
        ),
        MC(
          'Why is this molecule not called 1-chlorobutan-4-ol?',
          [
            'Chlorine cannot sit on carbon 1',
            'The alcohol is senior, so it must take the lower number',
            'Both names are equally acceptable',
          ],
          1,
          'Numbering serves the [[principal group]] first. The [[hydroxyl]] gets 1; the chlorine takes whatever follows.',
          M.chlorobutanol
        ),
        T(
          'Prefixes are still listed alphabetically',
          'Seniority decides which group takes the [[suffix]]. It does not decide the order of the prefixes — those are still cited alphabetically, exactly as with alkyl branches.\n\n1-chloro-4-methylpentane: chloro before methyl, because c comes before m. Their numbers come from wherever they happen to sit.',
          M.chloromethylpentane,
          { caption: '1-chloro-4-methylpentane. Nothing here can take a suffix, so both are prefixes in alphabetical order.' }
        ),
        NM('but-3-en-1-ol', M.butenol, {
          hint: 'The alcohol is senior: it takes the suffix and carbon 1. Report the double bond inside the name.',
        }),
      ],
    },
    {
      id: 'u10-checkpoint',
      title: 'Checkpoint: priority',
      checkpoint: true,
      teaches: ['priority', 'naming', 'locants', 'drawing'],
      pool: POOL_U10CP,
      ask: 15,
      steps: [],
    },
  ],
};

const U11 = {
  id: 'u11-aldehydes',
  n: 10,
  title: 'Aldehydes',
  subtitle: 'The [[carbonyl]] at the end of a chain',
  level: 'VCE',
  topics: ['carbonyls'],
  difficulty: 3,
  lessons: [
    {
      id: 'u11-l1',
      title: 'The [[carbonyl]] group',
      teaches: ['carbonyls', 'naming'],
      pool: POOL_U11L1,
      ask: 10,
      steps: [
        T(
          'A double bond to oxygen',
          'An alcohol had an oxygen with two single bonds — one to carbon, one to hydrogen. Spend both of those on the same carbon instead and you get a double bond: C=O.\n\nThat group is a [[carbonyl]], and it is the foundation of the next four units. Aldehydes, ketones, carboxylic acids and esters are all carbonyls; what separates them is what else is attached.',
          M.ethanal,
          { caption: 'Ethanal. The oxygen is joined to the end carbon by a double bond.' }
        ),
        T(
          'At the end of the chain: an aldehyde',
          'Put the [[carbonyl]] on a carbon at the end of the chain and that carbon still has a hydrogen. That is an aldehyde, and the suffix is -al.\n\nethane → ethanal\npropane → propanal\n\nAs with every suffix so far, the final -e of the parent is dropped.',
          M.propanal,
          { caption: 'Propanal: three carbons, with the [[carbonyl]] on the first.' }
        ),
        MC(
          'Which suffix marks an aldehyde?',
          ['-ol', '-al', '-one'],
          1,
          '-al. -ol is an alcohol and -one is a ketone.'
        ),
        T(
          'The [[carbonyl]] carbon counts',
          'A common slip is to count the chain and forget that the [[carbonyl]] carbon is part of it. Ethanal has two carbons — the CH3 and the [[carbonyl]] carbon itself.\n\nCount every carbon including the one carrying the oxygen, then apply the root as usual.',
          M.butanal,
          { showCarbons: true, caption: 'Butanal drawn in full: four carbons, the last of them the [[carbonyl]].' }
        ),
        MC(
          'How many carbons does ethanal have?',
          ['1', '2', '3'],
          1,
          'Two — the methyl carbon and the [[carbonyl]] carbon. The oxygen is not counted.',
          M.ethanal,
          true
        ),
      ],
    },
    {
      id: 'u11-l2',
      title: 'Naming aldehydes',
      teaches: ['carbonyls', 'naming', 'locants'],
      pool: POOL_U11L2,
      ask: 10,
      steps: [
        T(
          'No [[locant]] needed',
          'An aldehyde carbon must be at the end of the chain — it needs a spare bond for its hydrogen — so there is only one place it can be.\n\nWith only one possible position, a number would carry no information. So butanal is just butanal: no [[locant]], ever.',
          M.butanal,
          { caption: 'Butanal. There is nowhere else the [[carbonyl]] could sit and still be an aldehyde.' }
        ),
        T(
          'It is always carbon 1',
          'The [[principal group]] takes the lowest [[locant]], and for an aldehyde that is always carbon 1. Everything else on the chain is numbered from there.\n\nSo a methyl two carbons along is 3-methylbutanal, counted from the [[carbonyl]] — never from the far end.',
          M.butanal,
          { caption: 'Numbering starts at the [[carbonyl]] and runs away from it.' }
        ),
        SLIDE(
          'Why an aldehyde needs no number',
          'Try to move the [[carbonyl]] along the chain. It only has one legal position — at the end — because an aldehyde carbon must keep a hydrogen.\n\nOne possible position means a number would carry no information, which is why butanal is never butan-1-al.',
          [
            { name: 'butanal', at: 1, family: 'aldehyde',
              note: 'At the end of the chain the [[carbonyl]] carbon still holds a hydrogen — an aldehyde, and the only place it can be.' },
          ],
          { locked: true }
        ),
        MC(
          'In 3-chlorobutanal, which carbon carries the [[carbonyl]]?',
          ['Carbon 1', 'Carbon 3', 'Carbon 4'],
          0,
          'Always carbon 1 — the chlorine at 3 is counted from there.'
        ),
        NM('propanal', M.propanal, { hint: 'Three carbons, [[carbonyl]] on the end.' }),
      ],
    },
    {
      id: 'u11-l3',
      title: 'Aldehyde or something else?',
      teaches: ['carbonyls', 'naming'],
      pool: POOL_U11L3,
      ask: 10,
      steps: [
        T(
          'One oxygen, two ways to hold it',
          'An alcohol and an aldehyde both contain one oxygen on a carbon chain, and on a page they can look similar. The difference is the bond.\n\nAn alcohol has two single bonds from its oxygen — one to carbon, one to hydrogen. An aldehyde has one double bond to carbon and nothing else.\n\nThat single distinction changes the family, the suffix and the formula.',
          M.ethanal,
          { showCarbons: true, caption: 'Ethanal, C2H4O. Ethanol is C2H6O — two more hydrogens, and no double bond.' }
        ),
        MC(
          'What tells an aldehyde apart from an alcohol?',
          ['The aldehyde has a double bond to oxygen', 'The alcohol has more carbons', 'Nothing — they are the same'],
          0,
          'C=O rather than C-O-H. The alcohol also carries two more hydrogens for the same carbon count.'
        ),
        T(
          'Count the oxygens, then look at the bonds',
          'A quick way through any structure with oxygen in it:\n\nONE oxygen, double-bonded, at the end → aldehyde\nONE oxygen, double-bonded, in the middle → ketone\nONE oxygen, single bonds → alcohol\n\nTwo oxygens on the same carbon means an acid or an [[ester]], which are the next two units.',
          M.propanal,
          { caption: 'Propanal: one oxygen, double-bonded, at the end of the chain.' }
        ),
        MC(
          'This structure is an…',
          ['alcohol', 'aldehyde', '[[alkene]]'],
          1,
          'A double bond from carbon to oxygen, at the end of the chain.',
          M.butanal
        ),
      ],
    },
    {
      id: 'u11-l4',
      title: 'When the aldehyde wins',
      teaches: ['carbonyls', 'naming', 'locants', 'priority'],
      pool: POOL_U11L4,
      ask: 10,
      steps: [
        T(
          'An aldehyde outranks an alcohol',
          'Put an aldehyde and a [[hydroxyl]] in the same molecule and only one can take the suffix. The aldehyde is more senior, so it wins.\n\nThe alcohol is not lost — it is demoted to the prefix hydroxy-, with a [[locant]] of its own.',
          M.hydroxybutanal,
          { caption: '4-hydroxybutanal: -al for the aldehyde, hydroxy- for the alcohol it beat.' }
        ),
        T(
          'The winner sets the numbering',
          'Once the aldehyde has taken the suffix, it also takes carbon 1 — and everything else is numbered from there.\n\nSo the [[hydroxyl]] in 4-hydroxybutanal is at carbon 4 counting from the [[carbonyl]], not from whichever end happens to be drawn on the left.',
          M.hydroxybutanal,
          { caption: 'Carbon 1 is the [[carbonyl]]. The [[hydroxyl]] falls at 4.' }
        ),
        MC(
          'In 4-hydroxybutanal, which carbon is number 1?',
          ['The [[carbonyl]] carbon', 'The carbon carrying the OH', 'Either end'],
          0,
          'The [[principal group]] takes carbon 1, and here that is the aldehyde.',
          M.hydroxybutanal
        ),
        NM('4-hydroxybutanal', M.hydroxybutanal, {
          hint: 'The aldehyde is senior: it takes -al and carbon 1. The alcohol becomes a prefix.',
        }),
      ],
    },
    {
      id: 'u11-checkpoint',
      title: 'Checkpoint: aldehydes',
      checkpoint: true,
      teaches: ['carbonyls', 'naming', 'locants', 'drawing'],
      pool: POOL_U11CP,
      ask: 15,
      steps: [],
    },
  ],
};

const U12 = {
  id: 'u12-ketones',
  n: 11,
  title: 'Ketones',
  subtitle: 'The same [[carbonyl]], moved into the chain',
  level: 'VCE',
  topics: ['carbonyls'],
  difficulty: 3,
  lessons: [
    {
      id: 'u12-l1',
      title: 'A [[carbonyl]] in the middle',
      teaches: ['carbonyls', 'naming'],
      pool: POOL_U12L1,
      ask: 10,
      steps: [
        T(
          'Move the [[carbonyl]] inward',
          'Take an aldehyde and move the [[carbonyl]] off the end, so it has a carbon on both sides. That is a ketone, and the suffix is -one.\n\nNothing about the group has changed — it is the same C=O. Only its position has, and that is enough to make it a different family with a different suffix.',
          M.propanone,
          { caption: 'Propan-2-one: the [[carbonyl]] has a carbon either side of it.' }
        ),
        MC(
          'What makes this a ketone rather than an aldehyde?',
          ['The [[carbonyl]] is at the end', 'The [[carbonyl]] has a carbon on each side', 'It has more oxygens'],
          1,
          'A [[carbonyl]] between two carbons is a ketone; at the end of the chain it would be an aldehyde.',
          M.butanone
        ),
        T(
          'Why there is no two-carbon ketone',
          'A ketone needs a carbon on each side of the [[carbonyl]], so the chain must be at least three carbons long. With two, the [[carbonyl]] has to sit at an end — and that makes it an aldehyde.\n\nSo the smallest ketone is propan-2-one, and there is no such thing as "ethanone".',
          M.propanone,
          { caption: 'Propan-2-one is the smallest ketone possible.' }
        ),
        T(
          'Same formula, different compound',
          'Propanal and propan-2-one are both C3H6O. Same atoms, same count — but the [[carbonyl]] sits at the end in one and the middle in the other, so they are different compounds with different names and different chemistry.\n\nThis is why the position matters enough to earn its own suffix.',
          M.propanone,
          { caption: 'Propan-2-one, C3H6O. Propanal has the same formula and a different structure.' }
        ),
      ],
    },
    {
      id: 'u12-l2',
      title: 'Numbering a ketone',
      teaches: ['carbonyls', 'naming', 'locants'],
      pool: POOL_U12L2,
      ask: 10,
      steps: [
        T(
          'Now the number matters',
          'An aldehyde needs no [[locant]] because it has one possible position. A ketone has several, so the number does real work.\n\npentan-2-one and pentan-3-one are different compounds. Getting the number wrong names the wrong molecule.',
          M.pentan2one,
          { caption: 'Pentan-2-one. Move the [[carbonyl]] one carbon along and it becomes pentan-3-one.' }
        ),
        MC(
          'This molecule is correctly named…',
          ['pentan-2-one', 'pentan-4-one', 'either is acceptable'],
          0,
          'Numbering from the nearer end gives 2. The [[carbonyl]] takes the lowest [[locant]] it can.',
          M.pentan2one
        ),
        T(
          'The [[carbonyl]] takes the lowest number',
          'As always, the [[principal group]] is served first: number from whichever end gives the [[carbonyl]] the lower [[locant]], and number everything else from there.\n\nSo pentan-4-one is never a correct name — counted from the other end it is pentan-2-one.',
          M.pentan3one,
          { caption: 'Pentan-3-one. Here both directions give 3, so the molecule is symmetrical.' }
        ),
        NM('butan-2-one', M.butanone, { hint: 'Four carbons, [[carbonyl]] on the second.' }),
      ],
    },
    {
      id: 'u12-l3',
      title: 'Aldehyde or ketone?',
      teaches: ['carbonyls', 'naming'],
      pool: POOL_U12L3,
      ask: 10,
      steps: [
        T(
          'The same group, two families',
          'An aldehyde and a ketone contain exactly the same group: one carbon double-bonded to one oxygen. What separates them is only where it sits.\n\nAt the end of the chain, the [[carbonyl]] carbon still holds a hydrogen — an aldehyde. Between two carbons, it does not — a ketone.',
          M.propanone,
          { caption: 'Propan-2-one. Move that [[carbonyl]] to the end and it becomes propanal.' }
        ),
        T(
          'Same formula, different molecule',
          'Propanal and propan-2-one are both C3H6O. The formula cannot tell them apart, and neither can counting oxygens.\n\nYou have to look at the structure: is the [[carbonyl]] carbon at an end, or does it have a carbon on each side? That one question decides the family, the suffix and whether a [[locant]] is needed at all.',
          M.propanal,
          { caption: 'Propanal, C3H6O: [[carbonyl]] at the end. Propan-2-one is the same formula, [[carbonyl]] in the middle.' }
        ),
        SLIDE(
          'Move the [[carbonyl]] inward',
          'Now slide the same group along the chain and watch the family change under it.\n\nNothing about the group changes — only where it sits.',
          [
            { name: 'pentanal', at: 1, family: 'aldehyde',
              note: 'At the end: the carbon keeps a hydrogen, so this is an aldehyde, -al, and no [[locant]] is needed.' },
            { name: 'pentan-2-one', at: 2, family: 'ketone',
              note: 'One step inward and it has a carbon on each side — a ketone now, -one, and the [[locant]] starts doing work.' },
            { name: 'pentan-3-one', at: 3, family: 'ketone',
              note: 'Still a ketone, in the middle of a five-carbon chain. Move further and the numbering would count from the other end.' },
          ]
        ),
        MC(
          'This structure is a…',
          ['aldehyde', 'ketone', 'alcohol'],
          1,
          'The [[carbonyl]] has a carbon on each side of it.',
          M.pentan2one
        ),
        MC(
          'Which of these cannot exist?',
          ['propan-2-one', 'ethan-1-one', 'butan-2-one'],
          1,
          'A two-carbon chain cannot hold a [[carbonyl]] in the middle — it would be at an end, making it ethanal.'
        ),
      ],
    },
    {
      id: 'u12-l4',
      title: 'Which [[carbonyl]] wins',
      teaches: ['carbonyls', 'naming', 'locants', 'priority'],
      pool: POOL_U12L4,
      ask: 10,
      steps: [
        T(
          'A ketone outranks an alcohol',
          'The same contest as before, one rung lower. A ketone beats a [[hydroxyl]], so the ketone takes -one and the alcohol is demoted to hydroxy-.',
          M.hydroxypentanone,
          { caption: '5-hydroxypentan-2-one: the ketone took the suffix and carbon 2.' }
        ),
        T(
          'An aldehyde outranks a ketone',
          'Put both carbonyls in one molecule and the aldehyde wins, because a terminal [[carbonyl]] outranks an internal one.\n\nThe ketone is then demoted — and a demoted [[carbonyl]] becomes the prefix oxo-.\n\nSo 4-oxopentanal has an aldehyde at carbon 1 and a ketone at carbon 4, both reported, only one taking the suffix.',
          M.oxopentanal,
          { caption: '4-oxopentanal. The aldehyde took -al; the ketone became oxo-.' }
        ),
        MC(
          'What does a demoted [[carbonyl]] become?',
          ['hydroxy-', 'oxo-', 'carbonyl-'],
          1,
          'oxo-, with its own [[locant]]. A demoted alcohol becomes hydroxy-.'
        ),
        NM('5-hydroxypentan-2-one', M.hydroxypentanone, {
          hint: 'The ketone is senior. Number so it gets the lowest [[locant]], then place the [[hydroxyl]].',
        }),
      ],
    },
    {
      id: 'u12-checkpoint',
      title: 'Checkpoint: ketones',
      checkpoint: true,
      teaches: ['carbonyls', 'naming', 'locants', 'drawing'],
      pool: POOL_U12CP,
      ask: 15,
      steps: [],
    },
  ],
};

const U13 = {
  id: 'u13-acids',
  n: 12,
  title: 'Carboxylic acids',
  subtitle: 'Carbonyl and [[hydroxyl]] on one carbon',
  level: 'VCE',
  topics: ['carbonyls'],
  difficulty: 3,
  lessons: [
    {
      id: 'u13-l1',
      title: 'The [[carboxyl]] group',
      teaches: ['carbonyls', 'acids', 'naming'],
      pool: POOL_U13L1,
      ask: 10,
      steps: [
        T(
          'Two oxygens on one carbon',
          'Put a [[carbonyl]] and a [[hydroxyl]] on the same carbon and you get a [[carboxyl]] group, written -COOH.\n\nThat carbon now holds a double bond to one oxygen, a single bond to another, and a bond to the chain. All four bonds are spoken for — which is why a [[carboxyl]] can only ever sit at the end of a chain.',
          M.ethanoicAcid,
          { caption: 'Ethanoic acid. One carbon carries both oxygens.' }
        ),
        T(
          'Two words',
          'The suffix is -oic acid, and unusually it is written as two words:\n\nethane → ethanoic acid\npropane → propanoic acid\n\nAs with the aldehyde, the [[carboxyl]] carbon is part of the chain and must be counted. Ethanoic acid has two carbons.',
          M.propanoicAcid,
          { caption: 'Propanoic acid: three carbons, the last of them the [[carboxyl]].' }
        ),
        MC(
          'How many oxygens are in a [[carboxyl]] group?',
          ['1', '2', '3'],
          1,
          'Two — one double-bonded, one in the -OH.',
          M.ethanoicAcid,
          true
        ),
        T(
          'Near the top of the ladder',
          'The carboxylic acid is the most senior group you have met. Put one in a molecule alongside an alcohol, a ketone or an aldehyde and the acid takes the suffix — everything else is demoted to a prefix.\n\nThat is why an alcohol sharing a molecule with an acid appears as hydroxy-.',
          M.hydroxybutanoic,
          { caption: '4-hydroxybutanoic acid: the acid took the suffix, so the alcohol became hydroxy-.' }
        ),
      ],
    },
    {
      id: 'u13-l2',
      title: 'Naming acids',
      teaches: ['carbonyls', 'acids', 'naming', 'locants', 'priority'],
      pool: POOL_U13L2,
      ask: 10,
      steps: [
        T(
          'Always carbon 1, never a [[locant]]',
          'Like an aldehyde, a [[carboxyl]] must be terminal, so it has one possible position and needs no number of its own.\n\nAnd being the most senior group present, it takes carbon 1 — everything else on the chain is numbered from there.',
          M.butanoicAcid,
          { caption: 'Butanoic acid. The [[carboxyl]] carbon is number 1 by definition.' }
        ),
        MC(
          'In 3-chloropropanoic acid, which carbon is the [[carboxyl]]?',
          ['Carbon 1', 'Carbon 2', 'Carbon 3'],
          0,
          'Carbon 1 always. The chlorine at 3 is counted from the [[carboxyl]] end.'
        ),
        T(
          'What a demoted group looks like',
          'When the acid wins, the loser still appears — as a prefix:\n\nan alcohol becomes hydroxy-\na ketone or aldehyde becomes oxo-\n\nSo 4-oxopentanoic acid has a ketone at carbon 4 and an acid at carbon 1. Both groups are reported; only one took the suffix.',
          M.oxopentanoic,
          { caption: '4-oxopentanoic acid: the acid took -oic acid, and the ketone was demoted to oxo-.' }
        ),
        NM('propanoic acid', M.propanoicAcid, { hint: 'Three carbons, counting the [[carboxyl]] carbon.' }),
      ],
    },
    {
      id: 'u13-l3',
      title: 'Acid or aldehyde?',
      teaches: ['carbonyls', 'acids', 'naming'],
      pool: POOL_U13L3,
      ask: 10,
      steps: [
        T(
          'Count the oxygens on that carbon',
          'An aldehyde and a carboxylic acid both put a [[carbonyl]] at the end of a chain. The difference is what else that carbon holds.\n\nAn aldehyde carbon holds C=O and a hydrogen.\nAn acid carbon holds C=O and an -OH.\n\nSo one oxygen means an aldehyde; two on the same carbon mean an acid.',
          M.ethanoicAcid,
          { showCarbons: true, caption: 'Ethanoic acid, C2H4O2. Ethanal is C2H4O — one oxygen fewer.' }
        ),
        MC(
          'What tells a carboxylic acid apart from an aldehyde?',
          ['The acid has two oxygens on that carbon', 'The acid has more carbons', 'Nothing'],
          0,
          'C=O plus -OH on the same carbon is a [[carboxyl]] group.'
        ),
        T(
          'The formula gives it away',
          'Because an acid carries an extra oxygen, the [[molecular formula]] separates the two families immediately:\n\nethanal C2H4O — one oxygen\nethanoic acid C2H4O2 — two\n\nSo when a chain compound shows two oxygens, look at the end carbon: a [[carbonyl]] and a [[hydroxyl]] together mean a carboxylic acid.',
          M.propanoicAcid,
          { caption: 'Propanoic acid, C3H6O2.' }
        ),
        SWAP(
          'Count the oxygens on that carbon',
          'One two-carbon chain. Change what the end carbon holds and watch both the family and the formula move.',
          [
            { label: 'C-O-H', name: 'ethanol', note: 'One oxygen, single bonds: an alcohol, C2H6O.' },
            { label: 'C=O', name: 'ethanal', note: 'One oxygen, double-bonded: an aldehyde, C2H4O.' },
            { label: 'C=O and OH', name: 'ethanoic acid', note: 'two oxygens on the same carbon: a carboxylic acid, C2H4O2.' },
          ],
          { need: 3 }
        ),
        MC(
          'This structure is a…',
          ['aldehyde', 'carboxylic acid', 'ketone'],
          1,
          'Two oxygens on the end carbon: a [[carboxyl]] group.',
          M.butanoicAcid
        ),
      ],
    },
    {
      id: 'u13-l4',
      title: 'The group that always wins',
      teaches: ['carbonyls', 'acids', 'naming', 'locants', 'priority'],
      pool: POOL_U13L4,
      ask: 10,
      steps: [
        T(
          'The acid takes the suffix from everything',
          'Of every group in this course, the carboxylic acid is the most senior. Put one in a molecule and it takes the suffix, whatever else is present.\n\nAn alcohol alongside it becomes hydroxy-. A ketone or aldehyde becomes oxo-. A [[halogen]] or alkyl branch was never in the running.',
          M.hydroxybutanoic,
          { caption: '4-hydroxybutanoic acid: the acid won, so the alcohol is a prefix.' }
        ),
        T(
          'Two prefixes, one suffix',
          'A demoted group is always still named. Reading a name backwards tells you exactly what is present:\n\n4-oxopentanoic acid\n└ the acid took the suffix, at carbon 1\n      └ oxo- means a [[carbonyl]] at carbon 4 that lost to it\n\nSo the molecule holds both an acid and a ketone.',
          M.oxopentanoic,
          { caption: '4-oxopentanoic acid: an acid at carbon 1, a ketone at carbon 4.' }
        ),
        MC(
          'In 4-hydroxybutanoic acid, what does hydroxy- tell you?',
          ['There is an alcohol at carbon 4 that lost to the acid', 'The acid is at carbon 4', 'There are two acids'],
          0,
          'Every prefix names a group that was demoted. Only the suffix names the winner.',
          M.hydroxybutanoic
        ),
        NM('4-oxopentanoic acid', M.oxopentanoic, {
          hint: 'The acid takes carbon 1 and the suffix. What is the other [[carbonyl]] called once it loses?',
        }),
      ],
    },
    {
      id: 'u13-checkpoint',
      title: 'Checkpoint: acids',
      checkpoint: true,
      teaches: ['carbonyls', 'acids', 'naming', 'locants', 'priority', 'drawing'],
      pool: POOL_U13CP,
      ask: 15,
      steps: [],
    },
  ],
};

const U14 = {
  id: 'u14-esters',
  n: 13,
  title: 'Esters',
  subtitle: 'Two halves, two words, and which comes first',
  level: 'VCE',
  topics: ['carbonyls'],
  difficulty: 4,
  lessons: [
    {
      id: 'u14-l1',
      title: 'Two halves joined by an oxygen',
      teaches: ['carbonyls', 'esters', 'naming'],
      pool: POOL_U14L1,
      ask: 10,
      steps: [
        T(
          'An acid with its hydrogen replaced',
          'Take a carboxylic acid and replace the hydrogen of its -OH with a carbon chain. The result is an [[ester]]: a [[carbonyl]] with an oxygen bridging to a second chain.\n\nSo an [[ester]] has two halves — the acyl half, which came from the acid, and the alkyl half, which came from an alcohol.',
          M.methylEthanoate,
          { caption: 'Methyl ethanoate. The bridging oxygen joins the two halves.' }
        ),
        T(
          'Two words, alcohol half first',
          'An [[ester]] name is two words, and the order is the opposite of the way it is built:\n\nmethyl ethanoate\n└ alkyl half (from the alcohol), written first\n      └ acyl half (from the acid), written second as -oate\n\nThe acid ending -oic acid becomes -oate.',
          M.ethylEthanoate,
          { caption: 'Ethyl ethanoate: an ethyl group from ethanol, an ethanoate from ethanoic acid.' }
        ),
        MC(
          'In methyl ethanoate, which half came from the acid?',
          ['methyl', 'ethanoate'],
          1,
          'The -oate half. The alkyl group written first came from the alcohol.',
          M.methylEthanoate
        ),
        T(
          'The swapped-half trap',
          'Methyl ethanoate and ethyl methanoate contain exactly the same atoms — C3H6O2 — but they are different compounds.\n\nIn one, the two-carbon half carries the [[carbonyl]]; in the other, the one-carbon half does. Reading the name in the wrong order gives the wrong molecule, and this is the commonest mistake in [[ester]] naming.',
          M.methylEthanoate,
          { caption: 'Methyl ethanoate. Swap which half carries the C=O and it becomes ethyl methanoate.' }
        ),
      ],
    },
    {
      id: 'u14-l2',
      title: 'Naming esters',
      teaches: ['carbonyls', 'esters', 'naming'],
      pool: POOL_U14L2,
      ask: 10,
      steps: [
        T(
          'Find the [[carbonyl]] first',
          'To name an [[ester]], find the C=O. The chain carrying it is the acyl half — count it, including the [[carbonyl]] carbon, and give it -oate.\n\nThe chain on the far side of the bridging oxygen is the alkyl half — count it and name it as a -yl group. Write the alkyl half first.',
          M.ethylEthanoate,
          { caption: 'Two carbons carry the [[carbonyl]] (ethanoate); two more sit past the oxygen (ethyl).' }
        ),
        MC(
          'Which chain gets the -oate ending?',
          ['The one carrying the C=O', 'The one past the bridging oxygen', 'The longer one'],
          0,
          'The acyl half — the chain with the [[carbonyl]]. Length has nothing to do with it.',
          M.methylEthanoate
        ),
        T(
          'Building one from its parts',
          'Working the other way is a good check. Ethanoic acid plus methanol gives:\n\nthe acid → ethanoate\nthe alcohol → methyl\n\nwritten alcohol-half first: methyl ethanoate.',
          M.methylEthanoate,
          { caption: 'Methyl ethanoate, built from ethanoic acid and methanol.' }
        ),
        NM('methyl ethanoate', M.methylEthanoate, {
          hint: 'Which chain carries the C=O? That one is the -oate. The other is written first.',
        }),
      ],
    },
    {
      id: 'u14-l3',
      title: 'Which family is this?',
      teaches: ['carbonyls', 'esters', 'acids', 'naming'],
      pool: POOL_U14L3,
      ask: 10,
      steps: [
        T(
          'Four families, two questions',
          'You now know every [[carbonyl]] family in this course. Telling them apart from a structure takes two questions, in order:\n\n1. HOW many oxygens on the [[carbonyl]] carbon?\n   One → aldehyde or ketone\n   Two → acid or [[ester]]\n\n2. Then, for one oxygen: is the [[carbonyl]] at the end (aldehyde) or in the middle (ketone)?\n   And for two: does the second oxygen hold a hydrogen (acid) or a carbon chain ([[ester]])?',
          M.methylEthanoate,
          { caption: 'Two oxygens, and the second leads to a carbon chain: an [[ester]].' }
        ),
        SWAP(
          'One chain, four families',
          'The chain below never changes. Only the group on its end does — and each one gives a different suffix and a different family.\n\nTap through all four and watch the ending.',
          [
            { label: 'CH3', name: 'butane', note: 'No [[functional group]] at all: an [[alkane]], ending in -ane.' },
            { label: 'CHO', name: 'butanal', note: 'A [[carbonyl]] at the end of the chain: an aldehyde, -al.' },
            { label: 'C=O in chain', name: 'butan-2-one', note: 'The same [[carbonyl]] moved inside the chain: a ketone, -one.' },
            { label: 'COOH', name: 'butanoic acid', note: 'Carbonyl plus [[hydroxyl]] on one carbon: a carboxylic acid, -oic acid.' },
            { label: 'COOCH3', name: 'methyl butanoate', note: 'The acid with its -OH replaced by a chain: an [[ester]], -oate.' },
          ],
          { need: 4 }
        ),
        MC(
          'This structure is a…',
          ['carboxylic acid', '[[ester]]', 'ketone'],
          0,
          'Two oxygens on the end carbon, and the second holds a hydrogen: an acid.',
          M.butanoicAcid
        ),
        T(
          'The same two oxygens, arranged differently',
          'Ethanoic acid and methyl methanoate are both C2H4O2. Same atoms, same count of everything.\n\nIn the acid, the second oxygen holds a hydrogen. In the [[ester]], it holds a carbon — which moves one carbon from the acyl half to the alkyl half and makes a different compound entirely.',
          M.methylMethanoate,
          { caption: 'Methyl methanoate, C2H4O2. Ethanoic acid has the same formula.' }
        ),
        MC(
          'Which two families have two oxygens?',
          ['aldehyde and ketone', 'acid and [[ester]]', 'alcohol and [[ether]]'],
          1,
          'Aldehydes and ketones have one [[carbonyl]] oxygen; acids and esters have a second.'
        ),
      ],
    },
    {
      id: 'u14-l4',
      title: 'Reading any [[carbonyl]] name',
      teaches: ['carbonyls', 'esters', 'acids', 'naming', 'priority'],
      pool: POOL_U14L4,
      ask: 10,
      steps: [
        T(
          'The ending names the family',
          'Every [[carbonyl]] name tells you its family in the last few letters:\n\n-al → aldehyde\n-one → ketone\n-oic acid → carboxylic acid\n-oate → [[ester]]\n\nRead the ending first and you know what you are looking at before you have counted a single carbon.',
          M.ethylEthanoate,
          { caption: 'Ethyl ethanoate: the -oate ending makes it an [[ester]].' }
        ),
        T(
          'Every prefix is something that lost',
          'A name reports every group in the molecule. The suffix names the senior one; each prefix names one that was demoted.\n\nmethyl 3-oxobutanoate\n└ -oate: an [[ester]], the senior group\n      └ oxo-: a ketone at carbon 3, demoted\n└ methyl: the alkyl half from the alcohol\n\nSo that one name describes an [[ester]] and a ketone in the same molecule.',
          M.oxobutanoate,
          { caption: 'methyl 3-oxobutanoate: an [[ester]] and a demoted ketone.' }
        ),
        MC(
          'A name contains both hydroxy- and -al. What is present?',
          ['An alcohol and an aldehyde, with the aldehyde senior', 'Two alcohols', 'An aldehyde only'],
          0,
          'The suffix names the winner; every prefix names a group that lost to it.'
        ),
        MC(
          'A name ends in -oate. Which family is it?',
          ['carboxylic acid', '[[ester]]', 'ketone'],
          1,
          '-oate is the [[ester]]. An acid ends in -oic acid.'
        ),
      ],
    },
    {
      id: 'u14-checkpoint',
      title: 'Checkpoint: esters',
      checkpoint: true,
      teaches: ['carbonyls', 'esters', 'naming', 'drawing'],
      pool: POOL_U14CP,
      ask: 15,
      steps: [],
    },
  ],
};

const U15 = {
  id: 'u19-amines',
  n: 18,
  title: 'Amines',
  subtitle: 'Nitrogen on a chain, and the group that outranks it',
  level: 'VCE',
  topics: ['nitrogen'],
  difficulty: 3,
  lessons: [
    {
      id: 'u19-l1',
      title: 'The amino group',
      teaches: ['amines', 'naming'],
      pool: POOL_U15L1,
      ask: 10,
      steps: [
        T(
          'A third element on the chain',
          'You have built molecules from carbon, hydrogen, halogens and oxygen. Nitrogen is the last one this course needs.\n\nGo back to the periodic table: nitrogen sits in group 15, so it forms three bonds. Put one on a carbon chain and it uses one bond on the chain and two on hydrogens — an -NH2 group, called an [[amine]].',
          M.ethanamine,
          { showCarbons: true, caption: 'Ethanamine. The nitrogen holds two hydrogens and one bond to the chain.' }
        ),
        MC(
          'How many bonds does the nitrogen form here?',
          ['1', '2', '3'],
          2,
          'Three — one to the chain and two to hydrogens. That is the group 15 count.',
          M.ethanamine,
          true
        ),
        T(
          'The suffix is -amine',
          'The [[parent chain]] is named as usual and -amine is added, with a [[locant]] for the nitrogen:\n\nbutane → butan-1-amine\n\nAs with an alcohol, the number says which carbon carries the group, and the chain is numbered to make it as low as possible.',
          M.butan1amine,
          { caption: 'Butan-1-amine: four carbons, nitrogen on the first.' }
        ),
        MC(
          'Is an [[amine]] a [[hydrocarbon]]?',
          ['Yes', 'No — it contains nitrogen', 'Only the short ones'],
          1,
          'A [[hydrocarbon]] is carbon and hydrogen only.'
        ),
      ],
    },
    {
      id: 'u19-l2',
      title: 'Numbering and diamines',
      teaches: ['amines', 'naming', 'locants'],
      pool: POOL_U15L2,
      ask: 10,
      steps: [
        T(
          'The lowest [[locant]], as always',
          'Number the chain so the nitrogen gets the lowest possible number. butan-2-amine, never butan-3-amine — counted from the other end the same molecule gives 2.\n\nEverything you learned about numbering alcohols applies unchanged.',
          M.butan2amine,
          { caption: 'Butan-2-amine. From the other end the nitrogen would be at carbon 3.' }
        ),
        MC(
          'This molecule is correctly named…',
          ['butan-2-amine', 'butan-3-amine', 'either'],
          0,
          'The lower [[locant]] is compulsory.',
          M.butan2amine
        ),
        T(
          'Two nitrogens: a diamine',
          'Two -NH2 groups follow the pattern you already know: di-, a [[locant]] for each, commas between the numbers.\n\nbutane-1,4-diamine — and note the -e of butane is kept, because -diamine begins with a consonant.',
          M.butanediamine,
          { caption: 'Butane-1,4-diamine: a nitrogen at each end.' }
        ),
        NM('butan-1-amine', M.butan1amine, { hint: 'Four carbons, nitrogen on the first.' }),
      ],
    },
    {
      id: 'u19-l3',
      title: 'Amine or alcohol?',
      teaches: ['amines', 'naming', 'priority'],
      pool: POOL_U15L3,
      ask: 10,
      steps: [
        T(
          'The same shape, a different atom',
          'An [[amine]] and an alcohol are drawn almost identically: a chain with one atom hanging off the end. The difference is which atom.\n\nOxygen makes two bonds, so an alcohol is -OH.\nNitrogen makes three, so an [[amine]] is -NH2.\n\nCount the hydrogens on that atom and the family is settled.',
          M.butan1amine,
          { showCarbons: true, caption: 'Butan-1-amine. Butan-1-ol looks the same but has -OH in place of -NH2.' }
        ),
        SWAP(
          'Swap the atom on the chain',
          'One four-carbon chain with one atom hanging off the end. Switch that atom between oxygen and nitrogen.\n\nTwo things change at once — see if you can spot both.',
          [
            { label: 'O', name: 'butan-1-ol', note: 'Oxygen makes two bonds: one to the chain, one to a hydrogen. So -OH, and the suffix -ol.' },
            { label: 'N', name: 'butan-1-amine', note: 'Nitrogen makes three: one to the chain and two hydrogens. So -NH2, and the suffix -amine.' },
          ],
          { need: 2 }
        ),
        MC(
          'Why does an [[amine]] nitrogen hold two hydrogens where an alcohol oxygen holds one?',
          ['Nitrogen makes three bonds, oxygen two', 'Nitrogen is larger', 'It does not'],
          0,
          'One bond each goes to the chain, leaving two free on nitrogen and one on oxygen.'
        ),
        T(
          'The alcohol outranks the [[amine]]',
          'Put both in one molecule and the alcohol takes the suffix. The [[amine]] is demoted to the prefix amino-.\n\nSo 4-aminobutan-1-ol has an -OH at carbon 1 and an -NH2 at carbon 4: both reported, one as the suffix and one as a prefix.',
          M.aminobutanol,
          { caption: '4-aminobutan-1-ol: the alcohol won, so the [[amine]] became amino-.' }
        ),
        T(
          'Where this is heading',
          'One combination matters more than the rest. Put an amino group on a carboxylic acid and you have an amino acid — the molecules proteins are built from.\n\n2-aminoethanoic acid is the simplest of them, known as glycine. The acid takes the suffix, as it always does; the [[amine]] is a prefix.',
          M.glycine,
          { caption: '2-aminoethanoic acid — glycine, the simplest amino acid.' }
        ),
      ],
    },
    {
      id: 'u19-checkpoint',
      title: 'Checkpoint: amines',
      checkpoint: true,
      teaches: ['amines', 'naming', 'locants', 'priority', 'drawing'],
      pool: POOL_U15CP,
      ask: 15,
      steps: [],
    },
  ],
};

const U16 = {
  id: 'u20-amides',
  n: 19,
  title: 'Amides and nitriles',
  subtitle: 'Nitrogen next to a [[carbonyl]], and nitrogen on a triple bond',
  level: 'VCE',
  topics: ['nitrogen'],
  difficulty: 4,
  lessons: [
    {
      id: 'u20-l1',
      title: 'Amides',
      teaches: ['amides', 'naming'],
      pool: POOL_U16L1,
      ask: 10,
      steps: [
        T(
          'A [[carbonyl]] with nitrogen attached',
          'Take a carboxylic acid and replace its -OH with an -NH2. The carbon now carries a double-bonded oxygen AND a nitrogen: that is an amide, and the suffix is -amide.\n\nethane → ethanamide\n\nLike an acid, the carbon has all four bonds spoken for, so an amide can only sit at the end of a chain — and needs no [[locant]].',
          M.ethanamide,
          { caption: 'Ethanamide. The [[carbonyl]] carbon carries both the oxygen and the nitrogen.' }
        ),
        MC(
          'What tells an amide apart from an [[amine]]?',
          ['The amide has a [[carbonyl]]', 'The [[amine]] has more nitrogens', 'Nothing'],
          0,
          'An [[amine]] is nitrogen on a plain chain. An amide has C=O on the same carbon as the nitrogen.'
        ),
        T(
          'Amide against acid',
          'An amide and an acid are the same molecule bar one atom: the acid ends -C(=O)OH, the amide ends -C(=O)NH2.\n\nSo ethanoic acid is C2H4O2 and ethanamide is C2H5NO. If you can see whether the second atom on that carbon is an oxygen or a nitrogen, you can tell them apart every time.',
          M.propanamide,
          { caption: 'Propanamide. Propanoic acid has -OH where this has -NH2.' }
        ),
        NM('ethanamide', M.ethanamide, { hint: 'Two carbons, counting the [[carbonyl]]. No [[locant]] needed.' }),
      ],
    },
    {
      id: 'u20-l2',
      title: 'Nitriles',
      teaches: ['nitriles', 'naming'],
      pool: POOL_U16L2,
      ask: 10,
      steps: [
        T(
          'A triple bond to nitrogen',
          'Carbon and nitrogen can share three bonds, exactly as two carbons can. A chain ending in C≡N is a nitrile.\n\nThe triple bond uses three of that carbon\'s four bonds, so the fourth goes to the chain and nothing else fits.',
          M.ethanenitrile,
          { caption: 'Ethanenitrile. Three lines join the carbon to the nitrogen.' }
        ),
        T(
          'The counting trap',
          'The nitrile carbon is part of the chain and must be counted. This is where marks are lost.\n\nEthanenitrile has two carbons — the methyl and the nitrile carbon — even though only one of them looks like a normal chain carbon.\n\nNote also that the suffix keeps the -e: ethane + nitrile = ethanenitrile, because -nitrile begins with a consonant.',
          M.butanenitrile,
          { showCarbons: true, caption: 'Butanenitrile: four carbons, the last of them triple-bonded to nitrogen.' }
        ),
        MC(
          'How many carbons does ethanenitrile have?',
          ['1', '2', '3'],
          1,
          'Two. The nitrile carbon counts, which is the commonest slip in this family.',
          M.ethanenitrile,
          true
        ),
        NM('butanenitrile', M.butanenitrile, { hint: 'Count the nitrile carbon as part of the chain.' }),
      ],
    },
    {
      id: 'u20-l3',
      title: 'Telling the nitrogen families apart',
      teaches: ['amines', 'amides', 'nitriles', 'naming'],
      pool: POOL_U16L3,
      ask: 10,
      steps: [
        T(
          'Three families, one question each',
          'Every nitrogen compound in this course falls into one of three families, and one look at the bond settles it:\n\nNitrogen on a plain chain → [[amine]] (-amine)\nNitrogen beside a C=O → amide (-amide)\nNitrogen on a triple bond → nitrile (-nitrile)\n\nSo: is there a [[carbonyl]]? Is there a triple bond? If neither, it is an [[amine]].',
          M.ethanamide,
          { caption: 'A [[carbonyl]] on the carbon holding the nitrogen: an amide.' }
        ),
        SWAP(
          'One nitrogen, three families',
          'A nitrogen attached to a carbon chain. Change what is happening at that carbon and the family changes with it.',
          [
            { label: 'plain C-N', name: 'butan-1-amine', note: 'Just a nitrogen on the chain: an [[amine]], -amine.' },
            { label: 'add a C=O', name: 'butanamide', note: 'Put a [[carbonyl]] on the same carbon and it becomes an amide, -amide.' },
            { label: 'make it C≡N', name: 'butanenitrile', note: 'Triple-bond the carbon to the nitrogen instead: a nitrile, -nitrile. And that carbon still counts in the chain.' },
          ],
          { need: 3 }
        ),
        MC(
          'This structure is a…',
          ['[[amine]]', 'amide', 'nitrile'],
          2,
          'Three lines between the carbon and the nitrogen.',
          M.butanenitrile
        ),
        MC(
          'This structure is a…',
          ['[[amine]]', 'amide', 'nitrile'],
          0,
          'A nitrogen on a plain chain, with no [[carbonyl]] and no triple bond.',
          M.butan1amine
        ),
        T(
          'The same trap in three places',
          'All three families count the nitrogen-bearing carbon as part of the chain — but only in the amide and the nitrile is that carbon easy to overlook.\n\nethanamide: 2 carbons\nethanenitrile: 2 carbons\nethanamine: 2 carbons\n\nCount every carbon, including any that carries the nitrogen or the [[carbonyl]], before choosing the root.',
          M.propanamide,
          { showCarbons: true, caption: 'Propanamide: three carbons, one of them the [[carbonyl]].' }
        ),
      ],
    },
    {
      id: 'u20-checkpoint',
      title: 'Checkpoint: amides and nitriles',
      checkpoint: true,
      teaches: ['amides', 'nitriles', 'naming', 'drawing'],
      pool: POOL_U16CP,
      ask: 15,
      steps: [],
    },
  ],
};

const U17 = {
  id: 'u18-ethers',
  n: 17,
  title: 'Ethers',
  subtitle: 'An oxygen between two chains, and the isomer trap',
  level: 'VCE',
  topics: ['functional-groups'],
  difficulty: 3,
  lessons: [
    {
      id: 'u18-l1',
      title: 'An oxygen with no hydrogen',
      teaches: ['ethers', 'naming'],
      pool: POOL_U17L1,
      ask: 10,
      steps: [
        T(
          'Both bonds spent on carbon',
          'An alcohol uses one of oxygen\'s two bonds on the chain and the other on a hydrogen. Spend both on carbon instead and the oxygen sits between two chains, with no hydrogen of its own.\n\nThat is an [[ether]].',
          M.methoxymethane,
          { showCarbons: true, caption: 'Methoxymethane. The oxygen bridges two methyl groups and holds no hydrogen.' }
        ),
        MC(
          'How many hydrogens does the oxygen in an [[ether]] carry?',
          ['0', '1', '2'],
          0,
          'None — oxygen makes two bonds and both are spent on carbon.',
          M.methoxymethane,
          true
        ),
        T(
          'Always a prefix',
          'An [[ether]] has no suffix form at all. Like a [[halogen]], it is cited in front of the parent, as an alkoxy group:\n\nmethoxy-   ethoxy-   propoxy-\n\nThe longer chain becomes the parent; the shorter one becomes the prefix.',
          M.methoxyethane,
          { caption: 'Methoxyethane: ethane is the parent, and the one-carbon side becomes methoxy-.' }
        ),
        MC(
          'Which half of an [[ether]] becomes the alkoxy prefix?',
          ['The shorter chain', 'The longer chain', 'Either'],
          0,
          'The longer chain is the parent, exactly as with any [[substituent]].'
        ),
      ],
    },
    {
      id: 'u18-l2',
      title: 'Naming ethers',
      teaches: ['ethers', 'naming', 'locants'],
      pool: POOL_U17L2,
      ask: 10,
      steps: [
        T(
          'Parent, prefix, [[locant]]',
          'Three steps, all familiar:\n\n1. The longer chain is the parent — name it as an [[alkane]].\n2. The shorter chain plus the oxygen becomes an -oxy prefix.\n3. Give the prefix a [[locant]] if the parent is long enough for there to be a choice.\n\nSo an oxygen joining a methyl to a propane gives 1-methoxypropane.',
          M.ethoxyethane,
          { caption: 'Ethoxyethane: two carbons each side, so either can be the parent.' }
        ),
        MC(
          'A two-carbon chain on the oxygen becomes…',
          ['methoxy-', 'ethoxy-', 'propoxy-'],
          1,
          'eth for two carbons, plus -oxy.'
        ),
        T(
          'When the number matters',
          'On a short parent there is only one place the oxygen can attach, so no number is needed. Once the parent has three carbons there is a choice — 1-methoxypropane and 2-methoxypropane are different compounds — so the [[locant]] does real work.',
          M.methoxyethane,
          { caption: 'Methoxyethane needs no number: both carbons of ethane are equivalent here.' }
        ),
        NM('methoxyethane', M.methoxyethane, { hint: 'Longer chain is the parent; the one-carbon side is the prefix.' }),
      ],
    },
    {
      id: 'u18-l3',
      title: 'Ether or alcohol?',
      teaches: ['ethers', 'naming', 'isomers'],
      pool: POOL_U17L3,
      ask: 10,
      steps: [
        T(
          'The same formula, a different molecule',
          'Methoxymethane and ethanol are both C2H6O. Same atoms, same count — but in one the oxygen bridges two carbons, and in the other it hangs off the end holding a hydrogen.\n\nThey are structural [[isomer|isomers]]: same formula, different structure, different compound.',
          M.methoxymethane,
          { showCarbons: true, caption: 'Methoxymethane, C2H6O. Ethanol has the same formula.' }
        ),
        T(
          'A formula cannot tell you the family',
          'This is the first place where the [[molecular formula]] genuinely fails you. C3H8O could be propan-1-ol, propan-2-ol or methoxyethane — three different compounds.\n\nSo when a question gives you a formula and asks what it is, the honest answer is that you need the structure.',
          M.ethanolForEther,
          { showCarbons: true, caption: 'Ethanol, C2H6O — the oxygen carries a hydrogen, so it is an alcohol.' }
        ),
        FLIP(
          'Move the hydrogen',
          'Take the hydrogen off the oxygen and put it on a carbon instead. Same atoms, same formula — watch the name.',
          ['ethanol', 'methoxymethane'],
          {
            flipLabel: 'Move the hydrogen',
            noteDiffer:
              'Both are C2H6O, and the name changed completely. The oxygen holds a hydrogen in one and bridges two carbons in the other — an alcohol and an [[ether]], two different compounds.',
          }
        ),
        MC(
          'Methoxymethane and ethanol are both C2H6O. They are…',
          ['the same compound', 'structural [[isomer|isomers]]', 'different formulas'],
          1,
          'Same formula, different arrangement of the same atoms.'
        ),
        MC(
          'What tells an [[ether]] apart from an alcohol?',
          ['The [[ether]] oxygen has no hydrogen', 'The [[ether]] has more carbons', 'Nothing'],
          0,
          'An alcohol oxygen holds a hydrogen; an [[ether]] oxygen holds two carbons.'
        ),
      ],
    },
    {
      id: 'u18-checkpoint',
      title: 'Checkpoint: ethers',
      checkpoint: true,
      teaches: ['ethers', 'naming', 'locants', 'isomers', 'drawing'],
      pool: POOL_U17CP,
      ask: 15,
      steps: [],
    },
  ],
};

const U18 = {
  id: 'u15-acyl-halides',
  n: 14,
  title: 'Acyl halides',
  subtitle: 'A [[halogen]] on a [[carbonyl]] is a different animal',
  level: 'VCE',
  topics: ['carbonyls'],
  difficulty: 4,
  lessons: [
    {
      id: 'u15-l1',
      title: 'A [[halogen]] on the [[carbonyl]]',
      teaches: ['acyl-halides', 'naming'],
      pool: POOL_U18L1,
      ask: 10,
      steps: [
        T(
          'The acid with its -OH replaced',
          'You have seen an acid become an [[ester]] by swapping its -OH for a carbon chain. Swap the -OH for a [[halogen]] instead and you get an acyl halide.\n\nThe carbon still carries its double-bonded oxygen; what changed is the atom beside it.',
          M.ethanoylChloride,
          { caption: 'Ethanoyl chloride: a [[carbonyl]] carbon carrying a chlorine.' }
        ),
        T(
          'The suffix is -oyl chloride',
          'The acid ending -oic acid becomes -oyl chloride:\n\nethanoic acid → ethanoyl chloride\npropanoic acid → propanoyl chloride\n\nAs with the acid, the group is terminal and the [[carbonyl]] carbon is number 1.',
          M.propanoylChloride,
          { caption: 'Propanoyl chloride: three carbons, counting the [[carbonyl]].' }
        ),
        MC(
          'Which suffix marks an acyl chloride?',
          ['-oyl chloride', '-chloro', '-oic chloride'],
          0,
          'ethanoic acid becomes ethanoyl chloride.'
        ),
      ],
    },
    {
      id: 'u15-l2',
      title: 'Acyl chloride or chloroalkane?',
      teaches: ['acyl-halides', 'naming', 'priority'],
      pool: POOL_U18L2,
      ask: 10,
      steps: [
        T(
          'The same atom, two very different roles',
          'A chlorine on a plain chain carbon is an ordinary [[substituent]]: cited as the prefix chloro-, never able to take a suffix.\n\nA chlorine on a [[carbonyl]] carbon is something else entirely — an acyl halide, with a suffix of its own and a place near the top of the priority ladder.\n\nSo before naming any chlorine, look at the carbon it sits on.',
          M.chlorobutanoylChloride,
          {
            caption: '3-chlorobutanoyl chloride: one chlorine is the [[principal group]], the other is just a prefix.',
          }
        ),
        SWAP(
          'The same chlorine, two different roles',
          'A chlorine on a plain chain carbon and a chlorine on a [[carbonyl]] carbon are the same atom doing completely different jobs.\n\nTap between them and read what each is called.',
          [
            { label: 'Cl on a chain carbon', name: '1-chlorobutane',
              note: 'An ordinary [[substituent]]: cited as the prefix chloro-, and it can never take a suffix.' },
            { label: 'Cl on a [[carbonyl]] carbon', name: 'butanoyl chloride',
              note: 'Now it is part of the [[principal group]]: the name ends -oyl chloride, and it outranks an [[ester]].' },
            { label: 'both at once', name: '3-chlorobutanoyl chloride',
              note: 'One molecule, both roles. The [[carbonyl]] one takes the suffix; the other is just a prefix at carbon 3.' },
          ],
          { need: 3 }
        ),
        MC(
          'Two chlorines, one on the [[carbonyl]] carbon and one on carbon 3. How are they cited?',
          ['Both as chloro- prefixes', 'The [[carbonyl]] one as -oyl chloride, the other as chloro-', 'Both as -oyl chloride'],
          1,
          'Only the one on the [[carbonyl]] is the [[principal group]]. The other is an ordinary [[substituent]].',
          M.chlorobutanoylChloride
        ),
        T(
          'Where it sits on the ladder',
          'The acyl halide ranks above the [[ester]], and both above aldehydes, ketones and alcohols. Only the carboxylic acid and the anhydride outrank it.\n\nA plain [[halogen]], by contrast, is not on the ladder at all — it can never take a suffix, however many there are.',
          M.ethanoylChloride,
          { caption: 'The chlorine here is part of the [[principal group]], not a [[substituent]].' }
        ),
        NM('propanoyl chloride', M.propanoylChloride, { hint: 'Count the [[carbonyl]] carbon, then -oyl chloride.' }),
      ],
    },
    {
      id: 'u15-checkpoint',
      title: 'Checkpoint: acyl halides',
      checkpoint: true,
      teaches: ['acyl-halides', 'naming', 'priority', 'drawing'],
      pool: POOL_U18CP,
      ask: 15,
      steps: [],
    },
  ],
};

const U19N = {
  id: 'u17-nitro',
  n: 16,
  title: 'Nitro compounds',
  subtitle: 'A group that can never win',
  level: 'VCE',
  topics: ['nitrogen'],
  difficulty: 3,
  lessons: [
    {
      id: 'u17-l1',
      title: 'The nitro group',
      teaches: ['nitro', 'naming'],
      pool: POOL_U19L1,
      ask: 10,
      steps: [
        T(
          'Nitrogen carrying two oxygens',
          'A nitro group is a nitrogen with two oxygens attached, joined to a carbon chain and written -NO2.\n\nIt is worth knowing why this one is unusual: that nitrogen carries four bonds, not the three you would expect from group 15. It manages this by carrying a positive charge while one oxygen carries a negative one. You do not need the charges to name it — but it explains why -NO2 is treated as a single unit rather than drawn atom by atom.',
          M.nitroethane,
          { caption: 'Nitroethane. The nitrogen holds the chain and both oxygens.' }
        ),
        T(
          'Always a prefix',
          'The nitro group has no suffix form at all. Like a [[halogen]], it is cited in front of the parent as nitro-, with a [[locant]] where the chain allows a choice.\n\nnitromethane   nitroethane   1-nitropropane   2-nitropropane',
          M.nitropropane2,
          { caption: '2-nitropropane: the group sits on the middle carbon.' }
        ),
        SUFFIXTEST(
          'Test the nitro group',
          'Tap each group and see whether it can end a name.',
          [
            { label: 'nitro', example: '1-nitrobutane', canSuffix: false,
              note: 'No suffix form exists. A nitro group is not low on the ladder — it is not on it.' },
            { label: 'alcohol', example: 'butan-1-ol', canSuffix: true,
              note: 'Takes -ol, so it wins against anything prefix-only.' },
            { label: 'nitro AND alcohol', example: '3-nitropropan-1-ol', canSuffix: true,
              note: 'Both present: the alcohol takes the suffix because the nitro group cannot.' },
          ],
          { need: 3 }
        ),
        MC(
          'Can a nitro group ever take the suffix?',
          ['Yes, when it is the only group', 'No — it is prefix-only, like a [[halogen]]', 'Only when there are two'],
          1,
          'It has no suffix form, so whatever else is present takes the ending.'
        ),
        MC(
          'How many oxygens does a nitro group carry?',
          ['1', '2', '3'],
          1,
          'Two, both attached to the same nitrogen.',
          M.nitroethane
        ),
      ],
    },
    {
      id: 'u17-l2',
      title: 'Numbering and losing',
      teaches: ['nitro', 'naming', 'locants', 'priority'],
      pool: POOL_U19L2,
      ask: 10,
      steps: [
        T(
          'The usual numbering rules',
          'Nothing new here: number the chain so the nitro group gets the lowest [[locant]], and drop the number where every position gives the same molecule.\n\nnitroethane needs no number; 2-nitrobutane does, and 3-nitrobutane is never correct.',
          M.nitropropane2,
          { caption: '2-nitropropane. Both ends give 2, so the molecule is symmetrical about it.' }
        ),
        T(
          'Two nitro groups',
          'Two of them follow the pattern you already know: di-, a [[locant]] for each, commas between the numbers.\n\nAnd because they are prefixes, they are cited alphabetically alongside any other prefix — chloro before nitro, nitro before propyl.',
          M.dinitrobutane,
          { caption: '1,4-dinitrobutane: one at each end.' }
        ),
        T(
          'It always loses',
          'Put a nitro group with anything that HAS a suffix — an alcohol, a ketone, an acid — and the other group takes the ending every time.\n\nSo 3-nitropropan-1-ol is an alcohol with a nitro prefix, never the other way round. The nitro group is not low on the ladder; it is not on the ladder at all.',
          M.nitropropanol,
          { caption: '3-nitropropan-1-ol: the alcohol took the suffix because the nitro group cannot.' }
        ),
        NM('2-nitropropane', M.nitropropane2, { hint: 'Three carbons, nitro on the middle one.' }),
      ],
    },
    {
      id: 'u17-checkpoint',
      title: 'Checkpoint: nitro compounds',
      checkpoint: true,
      teaches: ['nitro', 'naming', 'locants', 'priority', 'drawing'],
      pool: POOL_U19CP,
      ask: 15,
      steps: [],
    },
  ],
};

const U20 = {
  id: 'u26-cycloalkanes',
  n: 21,
  title: 'Cycloalkanes',
  subtitle: 'Chains that close, and the [[isomer|isomers]] they create',
  level: 'VCE',
  topics: ['rings'],
  difficulty: 3,
  lessons: [
    {
      id: 'u26-l1',
      title: 'Closing the chain',
      teaches: ['rings', 'naming'],
      pool: POOL_U20L1,
      ask: 10,
      steps: [
        T(
          'Join the two ends',
          'Every molecule so far has had two ends. Bring those ends together and bond them, and the chain becomes a ring.\n\nThe name takes the prefix cyclo-: six carbons in a ring is cyclohexane, five is cyclopentane.',
          M.cyclohexane,
          { caption: 'Cyclohexane: the same six carbons as hexane, joined into a ring.' }
        ),
        T(
          'A ring costs two hydrogens',
          'Closing the ring uses one bond at each end — bonds that were holding hydrogens. So a ring always has two hydrogens fewer than the open chain with the same carbons.\n\nhexane C6H14 → cyclohexane C6H12\n\nThat gives cycloalkanes the general formula CnH2n, exactly the same as an [[alkene]].',
          M.cyclopentane,
          { caption: 'Cyclopentane, C5H10. Pentane is C5H12.' }
        ),
        MC(
          'What is the general formula of a cycloalkane?',
          ['CnH2n+2', 'CnH2n', 'CnH2n-2'],
          1,
          'Two hydrogens fewer than the open chain, because the ring closure spends two bonds.'
        ),
        MC(
          'How many carbons does cyclohexane have?',
          ['5', '6', '7'],
          1,
          'hex- means six here exactly as it does in hexane.',
          M.cyclohexane
        ),
      ],
    },
    {
      id: 'u26-l2',
      title: 'Numbering a ring',
      teaches: ['rings', 'naming', 'locants'],
      pool: POOL_U20L2,
      ask: 10,
      steps: [
        T(
          'The ring is the parent',
          'Anything attached to a ring is a [[substituent]] on it, named exactly as it would be on a chain: methylcyclohexane, chlorocyclohexane.\n\nWith only one group there is no need for a number — every carbon of the ring is equivalent until something distinguishes them.',
          M.methylcyclohexane,
          { caption: 'Methylcyclohexane needs no [[locant]]: every ring position is the same.' }
        ),
        RING(
          'Build a ring and move a group round it',
          'Change the ring size, then add a second methyl and slide it round.\n\nWatch what happens when you push it past halfway — the name comes back with a lower pair of numbers than the one you placed, because a ring can be counted in either direction.',
          { start: 6, startSubs: 2, startAt: 2, min: 3, max: 8 }
        ),
        T(
          'A second group creates a choice',
          'Add a second [[substituent]] and position starts to matter. Numbering begins at a substituted carbon — that becomes carbon 1 — and you count round whichever way gives the lowest set of numbers.\n\nSo two methyls two apart are 1,3-dimethylcyclohexane, never 1,5: going the other way round gives the lower pair.',
          M.dimethylcyclohexane13,
          { caption: '1,3-dimethylcyclohexane. Counting the other way would give 1,5, which loses.' }
        ),
        MC(
          'Why is 1,5-dimethylcyclohexane not a correct name?',
          ['Counting the other way round gives 1,3', 'Cyclohexane has only four carbons', 'Methyls cannot sit on carbon 5'],
          0,
          'A ring can be counted in either direction, and the lowest set wins.'
        ),
        NM('methylcyclohexane', M.methylcyclohexane, { hint: 'The ring is the parent. Does it need a number?' }),
      ],
    },
    {
      id: 'u26-l3',
      title: 'Rings and [[isomer|isomers]]',
      teaches: ['rings', 'naming', 'isomers'],
      pool: POOL_U20L3,
      ask: 10,
      steps: [
        T(
          'A ring and a double bond cost the same',
          'Both a ring and a double bond remove two hydrogens. So cyclohexane and hex-1-ene are both C6H12 — structural [[isomer|isomers]], with nothing in the formula to tell them apart.\n\nWhen you meet CnH2n, it is an [[alkene]] OR a cycloalkane, and only the structure decides.',
          M.hexene1,
          { caption: 'Hex-1-ene, C6H12. Cyclohexane has the same formula.' }
        ),
        T(
          'Functional groups on rings',
          'A group on a ring behaves exactly as it does on a chain: it takes the suffix, and it takes carbon 1.\n\ncyclohexan-1-ol — the ring is the parent, the alcohol is the [[principal group]], and numbering starts where it sits.',
          M.cyclohexanol,
          { caption: 'Cyclohexan-1-ol: the [[hydroxyl]] takes the suffix and carbon 1.' }
        ),
        MC(
          'Cyclohexane and hex-1-ene are both C6H12. They are…',
          ['the same compound', 'structural [[isomer|isomers]]', 'different formulas'],
          1,
          'Same formula, different structure — one closes a ring, the other opens a double bond.'
        ),
        NM('cyclohexan-1-ol', M.cyclohexanol, { hint: 'Ring parent, alcohol suffix, carbon 1.' }),
      ],
    },
    {
      id: 'u26-checkpoint',
      title: 'Checkpoint: cycloalkanes',
      checkpoint: true,
      teaches: ['rings', 'naming', 'locants', 'isomers', 'drawing'],
      pool: POOL_U20CP,
      ask: 15,
      steps: [],
    },
  ],
};

const U21 = {
  id: 'u27-benzene',
  n: 22,
  title: 'Benzene and aromatics',
  subtitle: 'The ring with three double bonds, and its retained names',
  level: 'VCE',
  topics: ['aromatics'],
  difficulty: 4,
  lessons: [
    {
      id: 'u27-l1',
      title: 'Benzene',
      teaches: ['aromatics', 'naming'],
      pool: POOL_U21L1,
      ask: 10,
      steps: [
        T(
          'A ring with three double bonds',
          'benzene is a six-carbon ring carrying three double bonds around it, C6H6. One hydrogen per carbon and nothing to spare.\n\nCompare it with cyclohexane, C6H12: same six carbons in a ring, six hydrogens fewer, because three double bonds cost two hydrogens each.',
          M.benzene,
          { caption: 'Benzene, C6H6. The circle of double bonds is what makes it aromatic.' }
        ),
        MC(
          'How does benzene differ from cyclohexane?',
          ['Benzene has three double bonds in the ring', 'Benzene has more carbons', 'They are the same'],
          0,
          'C6H6 against C6H12 — the double bonds account for every missing hydrogen.'
        ),
        T(
          'Benzene is the parent',
          'Anything attached is a [[substituent]] on benzene, named the way you already know:\n\nmethylbenzene   ethylbenzene   chlorobenzene\n\nWith a single group no number is needed, because every position on the ring is equivalent.',
          M.methylbenzene,
          { caption: 'Methylbenzene — also known by the older name toluene.' }
        ),
        MC(
          'Is benzene [[saturated]]?',
          ['Yes', 'No — it contains double bonds'],
          1,
          'Saturated means single bonds only, and benzene has three double bonds.'
        ),
      ],
    },
    {
      id: 'u27-l2',
      title: 'Numbering the ring',
      teaches: ['aromatics', 'naming', 'locants'],
      pool: POOL_U21L2,
      ask: 10,
      steps: [
        T(
          'Three ways to place two groups',
          'Two substituents on a benzene ring can sit next to each other, one apart, or opposite. Those are three different compounds:\n\n1,2-dimethylbenzene\n1,3-dimethylbenzene\n1,4-dimethylbenzene\n\nYou may also meet the older names ortho, meta and para for the same three arrangements.',
          M.dimethylbenzene14,
          { caption: '1,4-dimethylbenzene: the two groups sit directly opposite each other.' }
        ),
        RING(
          'Move the second group round the ring',
          'Two methyls on a benzene ring. Slide the second one round and watch the locants.\n\nThere are only three distinct arrangements, whatever number you place it at — and they have older names too: ortho, meta and para.',
          { start: 6, startSubs: 2, startAt: 2, min: 6, max: 6, aromatic: true }
        ),
        MC(
          'Why is 1,6-dimethylbenzene not a correct name?',
          ['Counting the other way gives 1,2', 'Benzene has only four carbons', 'Methyls cannot sit on carbon 6'],
          0,
          'A ring counts in either direction and the lowest set wins.'
        ),
        T(
          'Numbering works as it does on any ring',
          'Start at a substituted carbon, count round the way that gives the lowest set, and cite the substituents alphabetically.\n\nNothing here is new — it is the cycloalkane rule applied to an aromatic ring.',
          M.dimethylbenzene14,
          { caption: 'Start at a substituted carbon and count the shorter way round.' }
        ),
        NM('methylbenzene', M.methylbenzene, { hint: 'One [[substituent]] on benzene. Does it need a number?' }),
      ],
    },
    {
      id: 'u27-l3',
      title: 'Names you have to know',
      teaches: ['aromatics', 'naming'],
      pool: POOL_U21L3,
      ask: 10,
      steps: [
        T(
          'Four retained names',
          'Most aromatic compounds are named systematically. Four are not — they predate the rules and are so widely used that they were kept:\n\nphenol — a [[hydroxyl]] on benzene\naniline — an -NH2 on benzene\nbenzoic acid — a [[carboxyl]] on benzene\nbenzaldehyde — an aldehyde on benzene\n\nThese have to be memorised. There is no rule that produces them.',
          M.phenol,
          { caption: 'Phenol: a [[hydroxyl]] on benzene. Not "benzenol".' }
        ),
        MC(
          'A [[hydroxyl]] on benzene is called…',
          ['phenol', 'benzenol', 'hydroxybenzene'],
          0,
          'phenol — a retained name.',
          M.phenol
        ),
        T(
          'Why these four survived',
          'They were named long before systematic nomenclature existed, and by the time the rules arrived they were too entrenched in use to change.\n\nIt is worth knowing that this is the exception rather than the pattern: nearly everything else you meet is built from rules you can apply.',
          M.benzoicAcid,
          { caption: 'Benzoic acid: a [[carboxyl]] group on a benzene ring.' }
        ),
        MC(
          'An -NH2 on benzene is called…',
          ['aniline', 'benzenamine', 'aminobenzene'],
          0,
          'aniline, another retained name.',
          M.aniline
        ),
      ],
    },
    {
      id: 'u27-checkpoint',
      title: 'Checkpoint: aromatics',
      checkpoint: true,
      teaches: ['aromatics', 'naming', 'locants', 'drawing'],
      pool: POOL_U21CP,
      ask: 15,
      steps: [],
    },
  ],
};

const U22 = {
  id: 'u29-constitutional',
  n: 24,
  title: 'Constitutional [[isomer|isomers]]',
  subtitle: 'Same formula, different molecule',
  level: 'VCE',
  topics: ['stereochemistry'],
  difficulty: 3,
  lessons: [
    {
      id: 'u29-l1',
      title: 'Same atoms, joined differently',
      teaches: ['isomers', 'naming'],
      pool: POOL_U22L1,
      ask: 10,
      steps: [
        T(
          'One formula, more than one compound',
          'C4H10 describes two different substances. Four carbons in a row is butane; three in a row with one hanging off is 2-methylpropane.\n\nSame atoms, same counts, different connections — so different compounds, with different boiling points and different chemistry. These are [[isomer|constitutional isomers]].',
          M.methylpropane,
          { caption: '2-methylpropane, C4H10. Butane has the same formula and a different shape.' }
        ),
        ISOMERS(
          'Find every distinct compound',
          'Six drawings below, all with the formula C5H12 — but there are only three compounds. The rest are repeats, drawn differently.\n\nTap each one. If its name has already come up, the app will say so. Find all three.',
          [
            { name: 'pentane' },
            { name: '2-methylbutane' },
            { name: 'pentane' },
            { name: '2,2-dimethylpropane' },
            { name: '2-methylbutane' },
            { name: 'pentane' },
          ],
          { target: 3 }
        ),
        T(
          'More carbons, more [[isomer|isomers]]',
          'C5H12 has three: pentane, 2-methylbutane and 2,2-dimethylpropane. The count grows quickly after that — C6H14 has five, C10H22 has seventy-five.\n\nThis is exactly why naming matters. A formula cannot identify a compound once there is more than one way to build it; a name always can.',
          M.dimethylpropane,
          { caption: '2,2-dimethylpropane: the most branched of the three C5H12 [[isomer|isomers]].' }
        ),
        MC(
          'How many constitutional [[isomer|isomers]] does C5H12 have?',
          ['1', '2', '3'],
          2,
          'pentane, 2-methylbutane and 2,2-dimethylpropane.'
        ),
        T(
          'The name is the test',
          'Two drawings represent the same compound if and only if they produce the same IUPAC name. That is the whole value of a systematic name: it identifies exactly one molecule.\n\nSo when you are unsure whether two structures are [[isomer|isomers]] or the same thing drawn twice, name them both.',
          M.butaneStraight,
          { caption: 'Butane. Draw it bent, drawn straight, or upside down — it is still butane.' }
        ),
      ],
    },
    {
      id: 'u29-l2',
      title: 'Isomers across families',
      teaches: ['isomers', 'naming'],
      pool: POOL_U22L2,
      ask: 10,
      steps: [
        T(
          'Isomers need not be the same family',
          'You have already met two cases where a formula spans families:\n\nC2H6O — ethanol or methoxymethane\nC6H12 — cyclohexane or hex-1-ene\n\nAn alcohol and an [[ether]]; a ring and an [[alkene]]. Same formula, different [[functional group]] entirely. This is called functional-group isomerism.',
          M.hexene1,
          { caption: 'Hex-1-ene, C6H12 — the same formula as cyclohexane.' }
        ),
        MC(
          'C4H8 could be…',
          ['an [[alkane]]', 'an [[alkene]] or a cycloalkane', 'an alcohol'],
          1,
          'Both a double bond and a ring cost two hydrogens, so both fit CnH2n.'
        ),
        T(
          'Reading a formula honestly',
          'Given a formula alone, the most you can work out is the degree of unsaturation — how many rings and double bonds are present in total.\n\nCnH2n+2 → no rings, no double bonds\nCnH2n → one ring OR one double bond\nCnH2n-2 → two of them, in some combination\n\nWhich it actually is, only the structure tells you.',
          M.methylpropene,
          { caption: '2-methylprop-1-ene, C4H8 — an [[alkene]], though the formula alone could not tell you.' }
        ),
      ],
    },
    {
      id: 'u29-checkpoint',
      title: 'Checkpoint: [[isomer|isomers]]',
      checkpoint: true,
      teaches: ['isomers', 'naming'],
      pool: POOL_U22CP,
      ask: 15,
      steps: [],
    },
  ],
};

const U31 = {
  id: 'u31-isomer-counting',
  n: 25,
  title: 'Counting [[isomer|isomers]]',
  subtitle: 'Finding them all, and knowing when you have',
  level: 'VCE',
  topics: ['stereochemistry'],
  difficulty: 4,
  lessons: [
    {
      id: 'u31-l1',
      title: 'How many are there?',
      teaches: ['isomers', 'naming'],
      pool: POOL_U31L1,
      ask: 10,
      steps: [
        T(
          'The count grows faster than you expect',
          'C4H10 has two [[isomer|isomers]]. C5H12 has three. C6H14 has five, C7H16 has nine, and C10H22 has seventy-five.\n\nEach extra carbon adds more ways to branch, so the number climbs steeply. That is why "draw all the [[isomer|isomers]]" is a fair exam question at five or six carbons and an unreasonable one at ten.',
          M.dimethylbutane23,
          { caption: '2,3-dimethylbutane — one of the five compounds with the formula C6H14.' }
        ),
        MC(
          'How many [[isomer|isomers]] does C6H14 have?',
          ['4', '5', '6'],
          1,
          'hexane, 2-methylpentane, 3-methylpentane, 2,2-dimethylbutane and 2,3-dimethylbutane.'
        ),
        T(
          'Branching shortens the [[parent chain]]',
          'The [[isomer|isomers]] of C6H14 do not all have six-carbon chains. Hexane does; the methylpentanes have five; the dimethylbutanes have four.\n\nSo a useful way to work through them is by parent length: start with the longest chain, then shorten it by one and find every place the leftover carbons can attach.',
          M.methylpentane2,
          { caption: '2-methylpentane: six carbons, but only five in the [[parent chain]].' }
        ),
        HUNT(
          'Find all five',
          'Draw each isomer of C6H14, one at a time. Submit each one and the app will name it.\n\nIf you draw the same compound twice — and on paper this is easy to do without noticing — you will be told, and told which one it was.',
          { carbons: 6 }
        ),
      ],
    },
    {
      id: 'u31-l2',
      title: 'Knowing when you have them all',
      teaches: ['isomers', 'naming', 'branches'],
      pool: POOL_U31L2,
      ask: 10,
      steps: [
        T(
          'Two names is not two compounds',
          'The commonest way to over-count is to draw one compound twice and give it two names.\n\n"4-methylpentane" is not a sixth isomer of C6H14 — it is 2-methylpentane numbered from the wrong end. "2-ethylbutane" is not one either — its longest chain is five carbons, so it is 3-methylpentane.\n\nA correct name identifies exactly one compound, which is why naming each drawing is the check.',
          M.methylpentane3,
          { caption: '3-methylpentane. Drawn carelessly, it is easily mistaken for a new compound.' }
        ),
        MC(
          'Why is "2-ethylbutane" not an isomer of C6H14?',
          ['It is 3-methylpentane named incorrectly', 'It has seven carbons', 'Ethyl groups are not allowed'],
          0,
          'Trace the longest chain: five carbons, not four. The correct name is 3-methylpentane.'
        ),
        T(
          'A method rather than a guess',
          'Work down by parent length, and within each length place the branches methodically:\n\n1. The straight chain.\n2. One carbon shorter, with a methyl — try every position.\n3. Two shorter, with two methyls or one ethyl — again, every position.\n\nStop when a shorter parent cannot hold the leftover carbons without becoming a longer chain again. Guessing finds most of them and repeats a few; this finds all of them once.',
          M.heptaneIso,
          { caption: 'Heptane. Its nine [[isomer|isomers]] come out in order if you work down by parent length.' }
        ),
        HUNT(
          'Now try C5H12',
          'Three compounds this time. Use the method: straight chain, then one shorter with a methyl, then shorter again.',
          { carbons: 5 }
        ),
      ],
    },
    {
      id: 'u31-checkpoint',
      title: 'Checkpoint: counting [[isomer|isomers]]',
      checkpoint: true,
      teaches: ['isomers', 'naming', 'branches', 'drawing'],
      pool: POOL_U31CP,
      ask: 15,
      steps: [],
    },
  ],
};

const U23 = {
  id: 'u30-cis-trans',
  n: 26,
  title: 'Cis/trans and E/Z',
  subtitle: 'When a double bond locks two arrangements apart',
  level: 'VCE',
  topics: ['stereochemistry'],
  difficulty: 4,
  lessons: [
    {
      id: 'u30-l1',
      title: 'Restricted rotation',
      teaches: ['stereochemistry', 'naming'],
      pool: POOL_U23L1,
      ask: 10,
      steps: [
        T(
          'A single bond spins; a double bond does not',
          'Two carbons joined by a single bond can rotate freely about it. Any arrangement of groups turns into any other, so there is only ever one compound.\n\nA double bond cannot rotate. Whatever sides the groups are on, they stay there — and that means two genuinely different compounds.',
          M.cisButene,
          { showStereoH: true, caption: 'cis-but-2-ene: both methyls on the same side, and locked there.' }
        ),
        T(
          'cis and trans',
          'Two names for the two possibilities:\n\nCIS — the like groups are on the same side\ntrans — they are on opposite sides\n\ncis-but-2-ene and trans-but-2-ene contain the same atoms joined the same way, but they are different substances with different melting points.',
          M.transButene,
          { showStereoH: true, caption: 'trans-but-2-ene: the methyls sit across from each other.' }
        ),
        FLIP(
          'Flip the groups across the bond',
          'Both methyls start on the same side. Flip one across and watch what happens to the name.',
          ['cis-but-2-ene', 'trans-but-2-ene'],
          {
            showStereoH: true,
            flipLabel: 'Flip across the double bond',
            noteDiffer:
              'The name changed — so these are two different compounds. The double bond cannot rotate, so nothing turns one into the other.',
          }
        ),
        MC(
          'What does cis mean?',
          ['The like groups are on the same side', 'They are on opposite sides', 'The molecule is branched'],
          0,
          'cis: same side. trans: across.'
        ),
        MC(
          'Are cis- and trans-but-2-ene the same compound?',
          ['Yes, they interconvert freely', 'No — they are different compounds with different properties', 'Only above room temperature'],
          1,
          'Converting one to the other would mean breaking the double bond.'
        ),
      ],
    },
    {
      id: 'u30-l2',
      title: 'When it does not apply',
      teaches: ['stereochemistry', 'naming'],
      pool: POOL_U23L2,
      ask: 10,
      steps: [
        T(
          'Two identical groups kill it',
          'Cis/trans needs something to compare. If either carbon of the double bond carries two identical groups, swapping them changes nothing — there is only one compound and no descriptor is used.\n\nbut-1-ene has two hydrogens on its end carbon, so it has no cis or trans form. Neither does 2-methylprop-1-ene, whose carbon holds two methyls.',
          M.butene1,
          { showStereoH: true, caption: 'But-1-ene: the end carbon carries two hydrogens, so there is nothing to be on opposite sides of.' }
        ),
        FLIP(
          'Now try it on but-1-ene',
          'The same flip, on a molecule whose end carbon holds two hydrogens. Watch the name.',
          ['but-1-ene', 'but-1-ene'],
          {
            showStereoH: true,
            flipLabel: 'Flip across the double bond',
            noteSame:
              'Nothing changed. Swapping two identical hydrogens gives back the same molecule, so there is only one but-1-ene and no cis or trans form exists.',
          }
        ),
        MC(
          'Does but-1-ene have cis and trans forms?',
          ['Yes', 'No — one of its double-bond carbons carries two hydrogens', 'Only in a ring'],
          1,
          'With two identical groups on one carbon there is only one compound.',
          M.butene1
        ),
        T(
          'The test, stated once',
          'Cis/trans applies when both carbons of the double bond carry two different groups.\n\nCheck each carbon in turn. One pair of identical groups anywhere is enough to rule it out — and that is the commonest reason a stereochemistry answer is marked wrong: the descriptor was applied where none exists.',
          M.methylpropene,
          { showStereoH: true, caption: '2-methylprop-1-ene: two methyls on one carbon, so no cis or trans.' }
        ),
        MC(
          'Does an [[alkane]] show cis/trans?',
          ['Yes', 'No — single bonds rotate freely', 'Only for long chains'],
          1,
          'Free rotation means the arrangements are the same compound.'
        ),
      ],
    },
    {
      id: 'u30-l3',
      title: 'E and Z',
      teaches: ['stereochemistry', 'naming', 'priority'],
      pool: POOL_U23L3,
      ask: 10,
      steps: [
        T(
          'When cis and trans run out',
          'cis and trans work by comparing like groups. But if all four groups around the double bond are different, there is no like pair to point at — and the words stop meaning anything.\n\nThe fix is to rank the groups. On each carbon, decide which of its two groups has priority; then ask whether the two winners are on the same side or opposite sides.',
          M.ezMethylpentene,
          { caption: '(2E)-3-methylpent-2-ene: four different groups, so cis/trans cannot describe it.' }
        ),
        T(
          'Z together, E opposite',
          'Z — the two higher-priority groups are on the same side (from zusammen, together)\nE — they are on opposite sides (from entgegen, opposite)\n\nPriority goes by atomic number: the heavier atom wins. Where the first atoms tie, look at what is attached to each of them.\n\nThe descriptor goes in brackets at the front, with the [[locant]] of the double bond: (2E)-but-2-ene.',
          M.ezPentene,
          { caption: '(2E)-pent-2-ene: the higher-priority groups sit on opposite sides.' }
        ),
        MC(
          'What does Z mean?',
          ['The higher-priority groups are on the same side', 'On opposite sides', 'Nothing'],
          0,
          'Z from zusammen — together.'
        ),
        T(
          'E/Z always works',
          'Cis/trans is a shortcut that only applies when there is a like pair. E/Z applies to every double bond that has two different groups on each carbon, so it never runs out.\n\nFor simple cases the two agree: cis-but-2-ene is (2Z)-but-2-ene, and trans-but-2-ene is (2E)-but-2-ene.',
          M.transButene,
          { showStereoH: true, caption: 'trans-but-2-ene is the same compound as (2E)-but-2-ene.' }
        ),
      ],
    },
    {
      id: 'u30-checkpoint',
      title: 'Checkpoint: stereochemistry',
      checkpoint: true,
      teaches: ['stereochemistry', 'naming', 'priority'],
      pool: POOL_U23CP,
      ask: 15,
      steps: [],
    },
  ],
};

const U24 = {
  id: 'u32-chiral-centres',
  n: 27,
  title: 'Chirality and R/S',
  subtitle: 'Four different groups — and the centres that only look chiral',
  level: 'VCE',
  topics: ['stereochemistry'],
  difficulty: 5,
  lessons: [
    {
      id: 'u32-l1',
      title: 'What makes a centre chiral',
      teaches: ['chirality', 'naming'],
      pool: POOL_U24L1,
      ask: 10,
      steps: [
        T(
          'Four different groups',
          'A carbon carrying four different groups is a [[chiral|chiral centre]]. A molecule with one exists in two forms that are mirror images — and, like your two hands, no amount of turning will lay one on the other.\n\nButan-2-ol is the smallest common example: carbon 2 carries an -OH, a hydrogen, a methyl and an ethyl. Four different things.',
          M.rButanol,
          { caption: '(2R)-butan-2-ol. Carbon 2 carries four different groups.' }
        ),
        T(
          'All four, or none',
          'The requirement is strict. two identical groups anywhere on that carbon and the centre is not chiral — the two mirror images turn out to be the same molecule after all.\n\nThis is where most marks are lost: a centre is assumed chiral because it looks busy, when two of its groups are in fact the same.',
          M.propan2ol_achiral,
          { caption: 'Propan-2-ol is not chiral: carbon 2 carries two identical methyls.' }
        ),
        FLIP(
          'Try the same swap on propan-2-ol',
          'This carbon carries an -OH, a hydrogen and two methyls. Swap two groups and watch the name.',
          ['propan-2-ol', 'propan-2-ol'],
          {
            flipLabel: 'Swap two groups',
            noteSame:
              'Nothing changed. Two of the four groups are identical, so the "mirror image" is the same molecule — which is exactly what it means for a centre not to be chiral.',
          }
        ),
        MC(
          'Is propan-2-ol chiral?',
          ['Yes', 'No — carbon 2 carries two identical methyls', 'Only one form exists'],
          1,
          'OH, H and two methyls. Two the same, so no [[chiral|chiral centre]].',
          M.propan2ol_achiral
        ),
        MC(
          'Is butan-1-ol chiral?',
          ['Yes', 'No — carbon 1 carries two hydrogens', 'Only in solution'],
          1,
          'Two hydrogens on the same carbon rules it out immediately.',
          M.butan1ol_achiral
        ),
      ],
    },
    {
      id: 'u32-l2',
      title: 'Assigning R and S',
      teaches: ['chirality', 'naming', 'priority'],
      pool: POOL_U24L2,
      ask: 10,
      steps: [
        T(
          'Rank, point away, read the circle',
          'Three steps, always the same:\n\n1. rank the four groups by priority — higher atomic number wins, and where the first atoms tie you compare what is attached to them.\n2. point the lowest-priority group away from you. It is usually the hydrogen.\n3. read the remaining three in order 1 → 2 → 3.\n\nClockwise is R. Anticlockwise is S.',
          M.rButanol,
          { caption: '(2R)-butan-2-ol: the top three priorities read clockwise.' }
        ),
        MC(
          'Which group is pointed away from you?',
          ['The highest priority', 'The lowest priority', 'The largest'],
          1,
          'The lowest — usually a hydrogen. The other three form the circle you read.'
        ),
        T(
          'R and S in the name',
          'The descriptor goes in brackets at the front, with the [[locant]] of the centre it describes:\n\n(2R)-butan-2-ol\n(2S)-butan-2-ol\n\nThese are different compounds. In living systems they often behave completely differently, which is why the distinction earns its place in the name.',
          M.sButanol,
          { caption: '(2S)-butan-2-ol: the mirror image of the R form.' }
        ),
        FLIP(
          'Swap two groups at the centre',
          'Swapping any two groups on a [[chiral|chiral centre]] gives its mirror image. Try it.',
          ['(R)-butan-2-ol', '(S)-butan-2-ol'],
          {
            flipLabel: 'Swap two groups',
            noteDiffer:
              'R became S — the mirror image, and a different compound. Swapping any two groups on a [[chiral|chiral centre]] always reverses it.',
          }
        ),
        MC(
          'Which direction is R?',
          ['Clockwise', 'Anticlockwise', 'Either'],
          0,
          'R from rectus, right — clockwise, once the lowest priority points away.'
        ),
      ],
    },
    {
      id: 'u32-l3',
      title: 'More than one centre',
      teaches: ['chirality', 'naming', 'priority'],
      pool: POOL_U24L3,
      ask: 10,
      steps: [
        T(
          'A descriptor for each',
          'A molecule can hold several chiral centres, and each takes its own letter and [[locant]]:\n\n(2R,3S)-butane-2,3-diol\n\nCarbons 2 and 3 are both chiral here, and they are assigned independently — you run the ranking procedure once per centre.',
          M.butanediolRS,
          { caption: '(2R,3S)-butane-2,3-diol: two centres, two descriptors.' }
        ),
        T(
          'A mirror image flips every centre',
          'The mirror image of (2R,3R) is (2S,3S) — every centre reverses.\n\n(2R,3S) is not the mirror image of (2R,3R): only one centre changed. It is a different compound again, related but not a mirror image.\n\nSo two centres give up to four distinct compounds, not two.',
          M.butanediolRS,
          { caption: 'Changing one centre gives a different compound, not a mirror image.' }
        ),
        MC(
          'Are (2R,3R) and (2R,3S) mirror images?',
          ['Yes', 'No — only one centre differs, so they are not mirror images', 'Only if both are R'],
          1,
          'A mirror image reverses every centre.'
        ),
        T(
          'Why this matters',
          'The amino acids are the reason. 2-aminopropanoic acid — alanine — has one [[chiral|chiral centre]], and living systems build proteins almost exclusively from the S form.\n\nThe R form has the same atoms joined the same way. Biologically it is a different substance.',
          M.alanineS,
          { caption: '(2S)-2-aminopropanoic acid — the form found in proteins.' }
        ),
      ],
    },
    {
      id: 'u32-checkpoint',
      title: 'Checkpoint: chirality',
      checkpoint: true,
      teaches: ['chirality', 'naming', 'priority'],
      pool: POOL_U24CP,
      ask: 15,
      steps: [],
    },
  ],
};

const U25 = {
  id: 'u22-multifunctional',
  n: 20,
  title: 'Molecules with several groups',
  subtitle: 'Two of a kind, demotion, and the four-step routine',
  level: 'VCE',
  topics: ['functional-groups'],
  difficulty: 4,
  lessons: [
    {
      id: 'u22m-l1',
      title: 'Two of the same group',
      teaches: ['multifunctional', 'naming'],
      pool: POOL_U25L1,
      ask: 10,
      steps: [
        T(
          'Two of a kind take a multiplying prefix',
          'A molecule can carry the same group twice. The suffix then takes di-, exactly as a repeated [[substituent]] does:\n\ntwo aldehydes → -dial\ntwo ketones → -dione\ntwo [[carboxyl]] groups → -dioic acid\n\nNote that the -e of the parent survives here: propane + dial = propanedial, because -dial begins with a consonant.',
          M.propanedial,
          { caption: 'Propanedial: an aldehyde at each end of a three-carbon chain.' }
        ),
        T(
          'Locants only where there is a choice',
          'An aldehyde or a [[carboxyl]] must be terminal, so on a single chain there are only two possible positions and both are used. No numbers are needed: propanedial, butanedioic acid.\n\nA ketone is internal and has a genuine choice, so it needs them: pentane-2,4-dione.',
          M.pentanedione,
          { caption: 'Pentane-2,4-dione: internal carbonyls, so the locants do real work.' }
        ),
        MC(
          'Why does propanedial need no locants?',
          ['Aldehydes are always terminal, so both positions are forced', 'It has too few carbons', 'Locants are optional'],
          0,
          'An aldehyde can only sit at an end, and a chain has exactly two ends.'
        ),
        NM('butanedioic acid', M.butanedioic, { hint: 'Four carbons, a [[carboxyl]] at each end.' }),
      ],
    },
    {
      id: 'u22m-l2',
      title: 'Demotion in practice',
      teaches: ['multifunctional', 'naming', 'priority'],
      pool: POOL_U25L2,
      ask: 10,
      steps: [
        T(
          'One suffix, any number of prefixes',
          'When different groups share a molecule, only the most senior takes the suffix. Every other one is demoted — but still named.\n\nThe two prefixes you meet most:\n\noxo- — a demoted aldehyde or ketone\nhydroxy- — a demoted alcohol',
          M.oxopentanoicAcid,
          { caption: '4-oxopentanoic acid: the acid took the suffix, the ketone became oxo-.' }
        ),
        T(
          'Reading a name backwards',
          'A name reports everything present, so it can be read as an inventory:\n\n5-hydroxy-4-oxopentanoic acid\n└ -oic acid: a carboxylic acid at carbon 1, the senior group\n      └ 4-oxo: a ketone at carbon 4\n      └ 5-hydroxy: an alcohol at carbon 5\n\nThree groups, one suffix, two prefixes.',
          M.hydroxyOxo,
          { caption: 'Three functional groups reported in one name.' }
        ),
        MC(
          'In 5-hydroxy-4-oxopentanoic acid, how many functional groups are reported?',
          ['One', 'Two', 'Three'],
          2,
          'An acid, a ketone and an alcohol — one suffix and two prefixes.',
          M.hydroxyOxo
        ),
        NM('4-oxopentanoic acid', M.oxopentanoicAcid, {
          hint: 'The acid is senior. What does the ketone become once it loses?',
        }),
      ],
    },
    {
      id: 'u22m-l3',
      title: 'Nitrogen and oxygen together',
      teaches: ['multifunctional', 'naming', 'priority'],
      pool: POOL_U25L3,
      ask: 10,
      steps: [
        T(
          'The amino-acid pattern',
          'Put an [[amine]] on a carboxylic acid and the acid wins, as it wins against everything. The [[amine]] is demoted to amino-.\n\nThat single arrangement is the amino acid — the class of molecules proteins are built from. 2-aminoethanoic acid is the simplest, known as glycine.',
          M.glycineMulti,
          { caption: '2-aminoethanoic acid — glycine.' }
        ),
        T(
          'Why they are named as acids',
          'It is worth being explicit about this, because the name can mislead: an amino acid is named as an acid with an [[amine]] prefix, not as an [[amine]].\n\nThat is simply [[seniority]]. The [[carboxyl]] outranks the [[amine]], so it takes the suffix and carbon 1, and the [[amine]] takes whatever [[locant]] falls out.',
          M.alanineMulti,
          { caption: '2-aminopropanoic acid — alanine. The acid is carbon 1.' }
        ),
        T(
          'The [[amine]] loses to an alcohol too',
          'An [[amine]] is fairly low on the ladder. Against an alcohol it also loses, giving names like 4-aminobutan-1-ol — an alcohol with an amino prefix.\n\nSo an [[amine]] takes the suffix only when nothing more senior is present.',
          M.aminoButanol,
          { caption: '4-aminobutan-1-ol: the alcohol took the suffix.' }
        ),
        MC(
          'Why are amino acids named as acids rather than amines?',
          ['The acid is the more senior group', 'They contain more oxygen', 'It is arbitrary'],
          0,
          'Seniority decides the suffix, and the [[carboxyl]] outranks the [[amine]].'
        ),
      ],
    },
    {
      id: 'u22m-l4',
      title: 'The four-step routine',
      teaches: ['multifunctional', 'naming', 'priority', 'locants'],
      pool: POOL_U25L4,
      ask: 10,
      steps: [
        T(
          'Every name, in four steps',
          'Everything in this course reduces to the same routine, in this order:\n\n1. find the most senior group present. It takes the suffix.\n2. choose the [[parent chain]] — the longest one that contains that group.\n3. number so the [[principal group]] gets the lowest [[locant]].\n4. cite everything else as prefixes, alphabetically, each with its number.\n\nThe order matters. Step 1 constrains step 2, which constrains step 3.',
          M.aminoHydroxyButanoic,
          { caption: '4-amino-3-hydroxybutanoic acid: acid senior, four-carbon parent, acid at carbon 1.' }
        ),
        T(
          'Worked through',
          '4-amino-3-hydroxybutanoic acid:\n\n1. Groups present: acid, alcohol, [[amine]]. The acid is most senior.\n2. Longest chain containing it: four carbons — butanoic acid.\n3. The acid takes carbon 1, so numbering runs away from it.\n4. The alcohol lands at 3 and the [[amine]] at 4. Cited alphabetically: amino before hydroxy.',
          M.aminoHydroxyButanoic,
          { caption: 'Same molecule, now with every step accounted for.' }
        ),
        STEPTHROUGH(
          'Work the four steps yourself',
          'One molecule, four decisions, in order. Each one narrows what comes next.',
          {
            name: '4-amino-3-hydroxybutanoic acid',
            stages: [
              {
                q: 'Step 1 — which group is the most senior?',
                options: ['The [[amine]]', 'The alcohol', 'The carboxylic acid'],
                answer: 2,
                hint: 'Work down the ladder: the acid outranks both the alcohol and the [[amine]].',
              },
              {
                q: 'Step 2 — what is the [[parent chain]]?',
                options: ['The longest chain anywhere in the molecule', 'The longest chain containing the acid', 'The shortest chain'],
                answer: 1,
                hint: 'The parent must contain the [[principal group]]. That constraint beats "longest chain".',
              },
              {
                q: 'Step 3 — where does numbering start?',
                options: ['At the [[carboxyl]] carbon', 'At the far end', 'Wherever gives the [[amine]] the lowest number'],
                answer: 0,
                hint: 'The [[principal group]] takes the lowest [[locant]], and being terminal that is carbon 1.',
              },
              {
                q: 'Step 4 — in what order are the prefixes cited?',
                options: ['By [[seniority]]: hydroxy before amino', 'Alphabetically: amino before hydroxy', 'By [[locant]]: hydroxy at 3 first'],
                answer: 1,
                hint: 'Seniority chose the suffix. Alphabetical order arranges the prefixes — a before h.',
              },
            ],
            noteDone: 'Senior group, then parent, then numbering, then prefixes. The name follows from the order.',
          }
        ),
        MC(
          'Why is amino- written before hydroxy- in that name?',
          ['Amines are more senior', 'Prefixes are alphabetical and a comes before h', 'It has a lower [[locant]]'],
          1,
          'Seniority chooses the suffix; alphabetical order arranges the prefixes.'
        ),
        T(
          'One more, from biology',
          '2-amino-3-hydroxypropanoic acid is serine, another amino acid found in proteins.\n\nSame routine: the acid is senior and takes carbon 1; the [[amine]] falls at 2 and the alcohol at 3; the prefixes are cited alphabetically.',
          M.serine,
          { caption: '2-amino-3-hydroxypropanoic acid — serine.' }
        ),
      ],
    },
    {
      id: 'u22m-checkpoint',
      title: 'Checkpoint: several groups',
      checkpoint: true,
      teaches: ['multifunctional', 'naming', 'priority', 'locants'],
      pool: POOL_U25CP,
      ask: 15,
      steps: [],
    },
  ],
};

const U26 = {
  id: 'u28-aromatic-groups',
  n: 23,
  title: 'Aromatic functional groups',
  subtitle: 'The retained name fixes carbon 1',
  level: 'VCE',
  topics: ['aromatics'],
  difficulty: 4,
  lessons: [
    {
      id: 'u28a-l1',
      title: 'Numbering from the naming group',
      teaches: ['aromatics', 'naming', 'locants'],
      pool: POOL_U26L1,
      ask: 10,
      steps: [
        T(
          'The parent decides where 1 is',
          'On a plain benzene ring, numbering starts wherever you like — every carbon is equivalent until something distinguishes them.\n\nOnce a retained parent is involved, that freedom disappears. In phenol the [[hydroxyl]] is carbon 1 by definition; in aniline the -NH2 is; in benzoic acid the [[carboxyl]] is. Everything else is numbered from there.',
          M.chlorophenol2,
          { caption: '2-chlorophenol: the -OH is carbon 1, so the chlorine is at 2.' }
        ),
        MC(
          'In 2-chlorophenol, which carbon is number 1?',
          ['The one carrying the -OH', 'The one carrying the chlorine', 'Either'],
          0,
          'phenol fixes the [[hydroxyl]] at carbon 1.',
          M.chlorophenol2
        ),
        T(
          'Which way round the ring',
          'Carbon 1 is fixed, but the direction is not — you still count whichever way gives the lowest locants.\n\nSo a chlorine adjacent to the [[hydroxyl]] is 2-chlorophenol, never 6-chlorophenol.',
          M.nitroaniline4,
          { caption: '4-nitroaniline: the nitro group sits directly opposite the -NH2.' }
        ),
        SWAP(
          'Carbon 1 does not move',
          'A chlorine on phenol, in each of its three distinct positions. The [[hydroxyl]] is carbon 1 in every one of them — the chlorine is what gets numbered.',
          [
            { label: 'next to it', name: '2-chlorophenol', note: 'Adjacent to the -OH: carbon 2.' },
            { label: 'one further', name: '3-chlorophenol', note: 'One further round: carbon 3.' },
            { label: 'opposite', name: '4-chlorophenol', note: 'Directly across the ring: carbon 4. Beyond this, counting the other way gives a lower number.' },
          ],
          { need: 3 }
        ),
        MC(
          'Why is 6-chlorophenol not a correct name?',
          ['Counting the other way gives 2-chlorophenol', 'Phenol has only four carbons', 'Chlorine cannot sit there'],
          0,
          'Carbon 1 is fixed by the -OH; the direction is chosen to give the lower number.'
        ),
      ],
    },
    {
      id: 'u28a-l2',
      title: 'Seniority on a ring',
      teaches: ['aromatics', 'naming', 'priority'],
      pool: POOL_U26L2,
      ask: 10,
      steps: [
        T(
          'The senior group chooses the parent',
          'Put a [[hydroxyl]] and a [[carboxyl]] on the same ring and the usual ladder applies: the acid wins, so the parent is benzoic acid and the alcohol is demoted to hydroxy-.\n\n2-hydroxybenzoic acid — better known as salicylic acid, the compound aspirin is made from.',
          M.salicylic,
          { caption: '2-hydroxybenzoic acid, or salicylic acid.' }
        ),
        MC(
          'Two groups on a ring, one senior. Which decides the parent?',
          ['The senior group', 'The larger group', 'Either'],
          0,
          'A [[carboxyl]] beats a [[hydroxyl]], so the parent is benzoic acid.',
          M.salicylic
        ),
        T(
          'Prefix-only groups stay prefix-only',
          'Nothing changes on a ring. A nitro group can never take a suffix, so 4-nitroaniline is an aniline with a nitro prefix — never the other way round.\n\nEverything you learned about [[seniority]] applies unchanged; only the shape of the parent is different.',
          M.nitroaniline4,
          { caption: '4-nitroaniline: aniline is the parent because nitro cannot be.' }
        ),
      ],
    },
    {
      id: 'u28a-checkpoint',
      title: 'Checkpoint: aromatic groups',
      checkpoint: true,
      teaches: ['aromatics', 'naming', 'locants', 'priority'],
      pool: POOL_U26CP,
      ask: 15,
      steps: [],
    },
  ],
};

const U27 = {
  id: 'u34-complex-substituents',
  n: 28,
  title: 'Complex substituents',
  subtitle: 'Branched branches, and picking a parent under pressure',
  level: 'VCE',
  topics: ['functional-groups'],
  difficulty: 5,
  lessons: [
    {
      id: 'u34-l1',
      title: 'A branch with its own branch',
      teaches: ['branches', 'naming'],
      pool: POOL_U27L1,
      ask: 10,
      steps: [
        T(
          'Name it like a little chain',
          'A [[substituent]] can itself be branched. When that happens it is named as a chain in its own right and wrapped in brackets.\n\n4-(2-methylpropyl)heptane: a heptane parent carrying, at carbon 4, a three-carbon branch that has a methyl on its own carbon 2.',
          M.methylpropylheptane,
          { caption: '4-(2-methylpropyl)heptane. The brackets keep the two numbering systems apart.' }
        ),
        T(
          'Its carbon 1 is where it attaches',
          'A [[substituent]] is always numbered from its point of attachment: the atom bonded to the [[parent chain]] is its carbon 1.\n\nThat is why the brackets matter — inside them, the numbers refer to the [[substituent]], not to the parent.',
          M.isopropylbenzene,
          { caption: 'Propan-2-ylbenzene: a three-carbon group attached through its middle carbon.' }
        ),
        MC(
          'What is the systematic name for an isopropyl group?',
          ['propan-2-yl', 'propyl', '2-methylethyl'],
          0,
          'propan-2-yl — attached through carbon 2 of a propane chain.'
        ),
      ],
    },
    {
      id: 'u34-l2',
      title: 'Choosing between [[locant]] sets',
      teaches: ['branches', 'naming', 'locants'],
      pool: POOL_U27L2,
      ask: 10,
      steps: [
        T(
          'Two substituents on one carbon',
          'A chain carbon can carry two branches — it has four bonds, and two of them are spare. Each branch still gets its own [[locant]], so the same number appears twice:\n\n2,2,4-trimethylpentane',
          M.trimethylpentane,
          { caption: '2,2,4-trimethylpentane: two methyls on carbon 2, one on carbon 4.' }
        ),
        T(
          'Comparing [[locant]] sets, term by term',
          'When two numbering directions are possible, compare the sets one term at a time and stop at the first difference.\n\n2,2,4 against 2,4,4: the first terms tie, the second decides, and 2 beats 4.\n\nNot by the total — 2,2,5 beats 2,3,4 despite summing higher.',
          M.trimethylpentane,
          { caption: 'The lowest set wins term by term, not by sum.' }
        ),
        LOCANTS(
          'Which set wins?',
          'This molecule can be numbered from either end, giving two different sets of locants. One of them is correct.\n\nPick the winning set — then check the totals underneath.',
          {
            name: '2,2,4-trimethylpentane',
            setA: [2, 2, 4],
            setB: [2, 4, 4],
          }
        ),
        MC(
          'How do you compare two [[locant]] sets?',
          ['Term by term, first difference wins', 'By their total', 'By their largest number'],
          0,
          'Not by the sum: 2,2,5 beats 2,3,4.'
        ),
      ],
    },
    {
      id: 'u34-checkpoint',
      title: 'Checkpoint: complex substituents',
      checkpoint: true,
      teaches: ['branches', 'naming', 'locants', 'drawing'],
      pool: POOL_U27CP,
      ask: 15,
      steps: [],
    },
  ],
};

const U28 = {
  id: 'u35-fused-bridged',
  n: 29,
  title: 'Polycyclic and heterocyclic rings',
  subtitle: 'Two rings sharing atoms, and rings that are not all carbon',
  level: 'UNI',
  topics: ['rings'],
  difficulty: 5,
  lessons: [
    {
      id: 'u35-l1',
      title: 'Rings that share atoms',
      teaches: ['rings', 'naming'],
      pool: POOL_U28L1,
      ask: 10,
      steps: [
        T(
          'How many atoms do they share?',
          'Two rings in one molecule can share atoms, and how many they share decides the name:\n\nTWO or more shared atoms → bicyclo\nExactly one shared atom → spiro\n\nNaphthalene shares two — its rings are fused along a bond. Spiro compounds pivot around a single shared carbon.',
          M.norbornane,
          { caption: 'Bicyclo[2.2.1]heptane: two bridgehead atoms, three bridges between them.' }
        ),
        T(
          'Reading the brackets',
          'The numbers count the carbons in each bridge between the two shared atoms, largest first.\n\nbicyclo[2.2.1]heptane — bridges of 2, 2 and 1 carbons, plus the two bridgeheads: 2+2+1+2 = 7, which is what hept- says.\n\nThe numbers and the root always agree, so they check each other.',
          M.spiroDecane,
          { caption: 'Spiro[4.5]decane: rings of 4 and 5 carbons either side of one shared atom, plus that atom: 10.' }
        ),
        BRACKETS(
          'Change a bridge, watch the root',
          'The three numbers count the carbons in each bridge between the two shared atoms. Change one and see what happens to the name.\n\nThe bridge numbers and the root are never independent — they always add up.',
          { start: [2, 2, 1] }
        ),
        MC(
          'What makes a spiro compound different from a bicyclo?',
          ['Its two rings share exactly one atom', 'Its rings share two atoms', 'It has three rings'],
          0,
          'One shared atom for spiro; two or more for bicyclo.',
          M.spiroDecane
        ),
        MC(
          'How many carbons does bicyclo[2.2.1]heptane have?',
          ['6', '7', '8'],
          1,
          '2 + 2 + 1 bridge carbons plus two bridgeheads — and hept- says seven.',
          M.norbornane
        ),
      ],
    },
    {
      id: 'u35-l2',
      title: 'Rings that are not all carbon',
      teaches: ['rings', 'heterocycles', 'naming'],
      pool: POOL_U28L2,
      ask: 10,
      steps: [
        T(
          'A different atom in the ring',
          'A heterocycle is a ring in which one or more carbons is replaced by another element — usually nitrogen, oxygen or sulfur.\n\npyridine — benzene with one carbon replaced by nitrogen\nfuran — a five-membered ring containing oxygen\nthiophene — the same, with sulfur\npyrrole — the same, with nitrogen',
          M.pyridineM,
          { caption: 'Pyridine, C5H5N: benzene with a nitrogen in place of one carbon.' }
        ),
        T(
          'Almost all retained names',
          'These names are not built from rules — they are historical, and have to be learnt. The useful pattern is in the fragments:\n\nthio- signals sulfur, as it does in thiols\nox- signals oxygen\naz- signals nitrogen\n\nSo thiazole holds sulfur and nitrogen; oxazole holds oxygen and nitrogen.',
          M.furanM,
          { caption: 'Furan: a five-membered ring with oxygen.' }
        ),
        MC(
          'Which contains sulfur in the ring?',
          ['furan', 'pyrrole', 'thiophene'],
          2,
          'thio- signals sulfur.'
        ),
        T(
          'Where you meet them',
          'Heterocycles are everywhere in biology. Pyrimidine — a six-membered ring with two nitrogens — is the [[skeletal form]] of cytosine and thymine, two of the four bases of DNA.\n\nThat is a fair note to end on: the naming system you have worked through is the one used to describe the molecules life is built from.',
          M.pyrimidineM,
          { caption: 'Pyrimidine: two nitrogens in a six-membered ring, and the core of two DNA bases.' }
        ),
      ],
    },
    {
      id: 'u35-checkpoint',
      title: 'Checkpoint: polycyclic and heterocyclic',
      checkpoint: true,
      teaches: ['rings', 'heterocycles', 'naming'],
      pool: POOL_U28CP,
      ask: 15,
      steps: [],
    },
  ],
};

const U29 = {
  id: 'u16-anhydrides',
  n: 15,
  title: 'Acid anhydrides',
  subtitle: 'Two carbonyls sharing one oxygen',
  level: 'VCE',
  topics: ['carbonyls'],
  difficulty: 4,
  lessons: [
    {
      id: 'u16-l1',
      title: 'Two acyl groups, one bridge',
      teaches: ['anhydrides', 'naming'],
      pool: POOL_U29L1,
      ask: 10,
      steps: [
        T(
          'An oxygen between two carbonyls',
          'An [[ester]] bridges a [[carbonyl]] to a plain carbon chain. Bridge it to another [[carbonyl]] instead and you get an acid anhydride.\n\nSo the middle oxygen has a C=O on each side rather than one — that single difference is what separates the two families on the page.',
          M.ethanoicAnhydride,
          { caption: 'Ethanoic anhydride: two acyl groups sharing one bridging oxygen.' }
        ),
        T(
          'Named from the acid it came from',
          'Take the acid, keep everything, and swap the word:\n\nethanoic acid → ethanoic anhydride\npropanoic acid → propanoic anhydride\n\nWhen both halves are the same — which is the only case you will meet here — the name is written once.',
          M.propanoicAnhydride,
          { caption: 'Propanoic anhydride: two three-carbon acyl groups, C6H10O3.' }
        ),
        MC(
          'What tells an anhydride apart from an [[ester]]?',
          ['The anhydride has a [[carbonyl]] on both sides of the bridging oxygen', 'The [[ester]] has more oxygens', 'Nothing'],
          0,
          'An [[ester]] bridges to a plain chain; an anhydride bridges to a second [[carbonyl]].'
        ),
        MC(
          'How many carbons does ethanoic anhydride have?',
          ['2', '3', '4'],
          2,
          'Two acyl groups of two carbons each — C4H6O3.',
          M.ethanoicAnhydride
        ),
      ],
    },
    {
      id: 'u16-l2',
      title: 'The acid derivatives',
      teaches: ['anhydrides', 'naming', 'priority'],
      pool: POOL_U29L2,
      ask: 10,
      steps: [
        T(
          'One pattern, five families',
          'You have now met every acid derivative, and they differ only in what sits beside the [[carbonyl]]:\n\n-OH → carboxylic acid\n-O-C(=O)- → anhydride\n-Cl → acyl chloride\n-O-C → [[ester]]\n\nSame [[carbonyl]], a different atom in one position, a different family and suffix each time. One more joins this list when you meet amides.',
          M.ethanoicAcidM,
          { caption: 'Ethanoic acid. Replace the -OH and you have any of the other four.' }
        ),
        T(
          'Reading a structure, in one question',
          'Find the [[carbonyl]]. Then look at what else that carbon holds:\n\nnothing but H or C → aldehyde or ketone\nOH → acid\nCl → acyl chloride\nO leading to a chain → [[ester]]\nO leading to another C=O → anhydride\n\nOne look at that one atom settles the family every time.',
          M.methylEthanoateM,
          { caption: 'Methyl ethanoate: the bridging oxygen leads to a plain chain, so it is an [[ester]].' }
        ),
        SWAP(
          'Change what sits beside the [[carbonyl]]',
          'The [[carbonyl]] stays put. Only the atom next to it changes — and each one gives a different family with a different suffix.',
          [
            { label: 'OH', name: 'ethanoic acid', note: 'A [[hydroxyl]]: carboxylic acid, -oic acid. The most senior of them all.' },
            { label: 'Cl', name: 'ethanoyl chloride', note: 'A [[halogen]]: acyl chloride, -oyl chloride.' },
            { label: 'O-CH3', name: 'methyl ethanoate', note: 'An oxygen leading to a chain: [[ester]], -oate.' },
            { label: 'O-C(=O)', name: 'ethanoic anhydride', note: 'An oxygen leading to a second [[carbonyl]]: anhydride.' },
          ],
          { need: 4 }
        ),
        MC(
          'A [[carbonyl]] bridging by -O- to another [[carbonyl]] is a…',
          ['[[ester]]', '[[ether]]', 'anhydride'],
          2,
          'Two carbonyls sharing one oxygen.',
          M.ethanoicAnhydride
        ),
        MC(
          'A [[carbonyl]] with -Cl is a…',
          ['carboxylic acid', 'acyl chloride', '[[ester]]'],
          1,
          'The [[halogen]] sits where the -OH was.',
          M.ethanoylCl
        ),
      ],
    },
    {
      id: 'u16-checkpoint',
      title: 'Checkpoint: anhydrides',
      checkpoint: true,
      teaches: ['anhydrides', 'naming', 'priority'],
      pool: POOL_U29CP,
      ask: 15,
      steps: [],
    },
  ],
};

const U30 = {
  id: 'u38-mastery',
  n: 30,
  title: 'Mastery review',
  subtitle: 'Every family, and the traps that keep recurring',
  level: 'VCE',
  topics: ['functional-groups'],
  difficulty: 5,
  lessons: [
    {
      id: 'u38-l1',
      title: 'The whole method, once more',
      teaches: ['mastery', 'naming', 'priority', 'locants'],
      pool: POOL_U30L1,
      ask: 10,
      steps: [
        T(
          'Everything reduces to four steps',
          'However complicated a molecule looks, the routine has not changed since unit 20:\n\n1. find the most senior group. It takes the suffix.\n2. choose the longest chain that contains it.\n3. number so that group gets the lowest [[locant]].\n4. cite everything else as prefixes, alphabetically.\n\nEach step constrains the next, which is why the order matters more than any individual rule.',
          M.aminoHydroxyButanoic,
          { caption: '4-amino-3-hydroxybutanoic acid: acid senior, four-carbon parent, prefixes alphabetical.' }
        ),
        T(
          'The ladder, in full',
          'Ranked from the top:\n\ncarboxylic acid → anhydride → [[ester]] → acyl halide → amide → nitrile → aldehyde → ketone → alcohol → [[amine]]\n\nAnd below all of them, groups that can never take a suffix at all: halogens, alkyl branches, nitro, and alkoxy.\n\nYou can see this any time from the book icon — it is the Naming priority tab.',
          M.ethanoicAcidM,
          { caption: 'The carboxylic acid outranks everything else in this course.' }
        ),
        MC(
          'Which of these can never take a suffix?',
          ['an alcohol', 'a [[halogen]]', 'a ketone'],
          1,
          'Halogens, alkyl branches, nitro and alkoxy groups are prefix-only.'
        ),
        MC(
          'Which carbons count towards the [[parent chain]]?',
          ['Only the plain ones', 'Every carbon in the chain, including any [[carbonyl]] or nitrile carbon', 'Only those with hydrogens'],
          1,
          'The [[carbonyl]] carbon of an acid and the nitrile carbon are both part of the chain.'
        ),
      ],
    },
    {
      id: 'u38-l2',
      title: 'The traps, collected',
      teaches: ['mastery', 'naming', 'priority', 'locants'],
      pool: POOL_U30L2,
      ask: 10,
      steps: [
        T(
          'The mistakes that keep recurring',
          'Across this whole course, the same handful of errors account for most lost marks:\n\ncounting — forgetting the [[carbonyl]] or nitrile carbon\nnumbering — counting from the wrong end, or by total instead of term by term\npriority — letting a prefix-only group take the suffix\nstereochemistry — assigning cis/trans or R/S where none exists\nformula — assuming a formula identifies a compound',
          M.hydroxyOxo,
          { caption: '5-hydroxy-4-oxopentanoic acid: three groups, one suffix, two prefixes.' }
        ),
        T(
          'Reading a name backwards',
          'A name is a complete inventory. Every prefix names a group that lost; the suffix names the one that won.\n\nSo you can always work back from a name to the structure — and checking that you can is the fastest way to catch an error before it costs you.',
          M.serine,
          { caption: '2-amino-3-hydroxypropanoic acid: an acid at 1, an [[amine]] at 2, an alcohol at 3.' }
        ),
        STEPTHROUGH(
          'One last molecule, start to finish',
          'Everything you have learned, on one structure. Four decisions.',
          {
            name: '5-hydroxy-4-oxopentanoic acid',
            stages: [
              {
                q: 'Which group takes the suffix?',
                options: ['The alcohol', 'The ketone', 'The carboxylic acid'],
                answer: 2,
                hint: 'The acid is the most senior group in this course — it always wins.',
              },
              {
                q: 'How many carbons is the [[parent chain]]?',
                options: ['Four', 'Five', 'Six'],
                answer: 1,
                hint: 'Count every carbon including the [[carboxyl]] carbon: five, giving pentanoic acid.',
              },
              {
                q: 'What does the ketone become?',
                options: ['hydroxy-', 'oxo-', 'It disappears'],
                answer: 1,
                hint: 'A demoted [[carbonyl]] is cited as oxo-. A demoted alcohol is hydroxy-.',
              },
              {
                q: 'How are the two prefixes ordered?',
                options: ['hydroxy before oxo, alphabetically', 'oxo before hydroxy, by [[locant]]', 'By [[seniority]]'],
                answer: 0,
                hint: 'Alphabetically: h comes before o, whatever their locants are.',
              },
            ],
            noteDone: 'An acid at carbon 1, a ketone at 4, an alcohol at 5 — one suffix and two prefixes, and the name reports all three.',
          }
        ),
        MC(
          'A name contains oxo-. What is present?',
          ['A demoted aldehyde or ketone', 'An alcohol', 'An [[ether]]'],
          0,
          'oxo- is a [[carbonyl]] that lost the suffix to something more senior.'
        ),
        MC(
          'CnH2n could be…',
          ['an [[alkane]]', 'an [[alkene]] or a cycloalkane', 'an alcohol'],
          1,
          'A ring and a double bond cost the same two hydrogens.'
        ),
      ],
    },
    {
      id: 'u38-checkpoint',
      title: 'Final checkpoint',
      checkpoint: true,
      teaches: ['mastery', 'naming', 'priority', 'locants', 'drawing'],
      pool: POOL_U30CP,
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
  { id: 'stage-1', n: 1, title: 'Foundations', blurb: 'Alkanes, chains, the naming [[skeletal form]]', units: [U1, U3] },
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
      U9,
      U10,
      U11,
      U12,
      U13,
      U14,
      U18,
      U29,
    ],
  },
  {
    id: 'stage-5', n: 5, title: 'Nitro and ethers', blurb: 'A breather: prefix-only groups',
    units: [
      U19N,
      U17,
    ],
  },
  {
    id: 'stage-6', n: 6, title: 'Nitrogen', blurb: 'Slotting nitrogen into the ladder',
    units: [
      U15,
      U16,
    ],
  },
  {
    id: 'stage-7', n: 7, title: 'Multifunctional molecules', blurb: 'No new groups — combining what exists',
    units: [
      U25,
    ],
  },
  {
    id: 'stage-8', n: 8, title: 'Rings and aromatics', blurb: 'cyclo-, benzene, retained parents',
    units: [
      U20,
      U21,
      U26,
    ],
  },
  {
    id: 'stage-9', n: 9, title: 'Isomerism and stereochemistry', blurb: 'Distinctions expressed through naming',
    units: [
      U22,
      U31,
      U23,
      U24,
    ],
  },
  {
    id: 'stage-10', n: 10, title: 'Advanced nomenclature', blurb: 'Complex systems and mastery',
    units: [
      U27,
      U28,
      U30,
    ],
  },
];

// A term is blue and bold the first couple of times it appears, then settles
// to a faint underline — still tappable, no longer shouting. Applied here
// because it has to be counted in teaching order, which the file's own
// layout does not follow.
quietRepeats(STAGES);

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
