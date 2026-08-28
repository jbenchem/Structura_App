// ─────────────────────────────────────────────────────────────
// Reactions blocks II and III — the rest of the thread.
//
//   R1  Boiling points and branching      (stage 2 — alkanes only)
//   R2  The first reactions               (stage 3 — combustion, UV
//                                          substitution, addition)
//   R6  Water, oil and hydrogen bonds     (stage 4 — solubility)
//   R7  Nitrogen reactions                (stage 6 — amines, amides)
//   R9  Polymers                          (stage 7 — both kinds)
//   R10 Yield and atom economy            (stage 10 — the numbers)
//
// The placement rule holds throughout: nothing here mentions a family the
// student cannot already name at that point in the course. R1 is the strict
// test of it — stage 2 knows alkanes and branches and NOTHING else, so every
// molecule in it is an alkane.
//
// Every number in R10 is computed, not typed: atom economy comes from
// atomEconomy() over the engine's own formulas, and the suite recomputes it.
// ─────────────────────────────────────────────────────────────

import {
  RXN,
  register,
  predictProduct,
  predictProductName,
  nameProduct,
  drawProduct,
  pickReagent,
  classifyReaction,
  completeEquation,
  classifyCarbon,
  molOf,
  atomEconomy,
  molarMassOfName,
} from './reactions';
import { pool } from './questionFactory';

const T = (title, body, extra = {}) => ({ type: 'teach', title, body, ...extra });

// Hand-authored MC in one line. Property and polymer questions have no
// registry reaction behind them, so they are written directly — but their
// molecules still go through molOf(), and the marker/soundness guards still
// apply.
let hq = 0;
const mcQ = (prompt, options, answer, explain, errorClasses = null, extra = {}) => ({
  id: `hq-${++hq}`,
  type: 'mcName',
  chip: extra.chip || 'PREDICT THE PROPERTY',
  prompt,
  options,
  answer,
  explain,
  errorClasses,
  category: extra.category || 'molecule-type',
  ...(extra.mol ? { mol: extra.mol } : {}),
});

// ── New reactions for R2 and R7 ──────────────────────────────
export const R2R7 = register([
  RXN({ type: 'substitution', from: 'ethane', reagent: 'Br₂ / UV', conditions: 'UV light', to: 'bromoethane', also: { right: ['HBr'] }, note: 'In practice a mixture forms; this is the mono-substituted product.' }),
  RXN({ type: 'substitution', from: 'propane', reagent: 'Cl₂ / UV', conditions: 'UV light', to: '1-chloropropane', also: { right: ['HCl'] } }),
  RXN({ type: 'addition', from: 'ethene', reagent: 'H₂ / Ni', conditions: 'nickel catalyst', to: 'ethane' }),
  RXN({ type: 'addition', from: 'but-2-ene', reagent: 'H₂ / Ni', conditions: 'nickel catalyst', to: 'butane' }),
  RXN({ type: 'addition', from: 'ethene', reagent: 'Br₂', conditions: 'room temperature', to: '1,2-dibromoethane' }),
  RXN({ type: 'addition', from: 'propene', reagent: 'HBr', conditions: null, to: '2-bromopropane', note: 'The major product: H to the carbon that already has more hydrogens.' }),
  RXN({ type: 'addition', from: 'ethene', reagent: 'HCl', conditions: null, to: 'chloroethane' }),
  RXN({ type: 'substitution', from: 'bromoethane', reagent: 'NH₃', conditions: 'excess ammonia, heat', to: 'ethan-1-amine', also: { right: ['NH₄Br'] } }),
  RXN({ type: 'condensation', from: 'ethanoic acid', with: 'methanamine', reagent: 'heat', conditions: null, to: 'N-methylethanamide', also: { right: ['H₂O'] } }),
  RXN({ type: 'hydrolysis', from: 'N-methylethanamide', reagent: 'H₂O / H⁺', conditions: 'reflux', to: 'ethanoic acid', also: { left: ['H₂O'], right: ['methanamine'] } }),
]);

const [
  SUB_ETHANE_UV, SUB_PROPANE_UV,
  ADD_ETHENE_H2, ADD_BUT2ENE_H2, ADD_ETHENE_BR2, ADD_PROPENE_HBR, ADD_ETHENE_HCL,
  AMINE_FROM_BROMO, AMIDE_COND, AMIDE_HYD,
] = R2R7;

// ─────────────────────────────────────────────────────────────
// R1 · Boiling points and branching (stage 2: alkanes only)
// ─────────────────────────────────────────────────────────────

const R1_L1 = {
  id: 'r01-l1',
  title: 'Longer chains hold on harder',
  teaches: ['properties'],
  ask: 6,
  steps: [
    T(
      'Why anything boils at all',
      'Molecules cling to each other through [[dispersion forces]] — weak, flickering attractions that every molecule has. Boiling means pulling molecules apart, so the stronger the cling, the higher the boiling point.\n\nDispersion forces grow with size: more atoms, more surface, more cling. That is the whole story for alkanes, and it is enough to predict real numbers.',
      { mol: molOf('hexane'), caption: 'hexane boils at 69°. Add two carbons and octane needs 126°.' }
    ),
    T(
      'The trend is a ladder',
      'butane −1° · pentane 36° · hexane 69° · heptane 98° · octane 126°.\n\nEach carbon adds surface, each bit of surface adds cling. Given two unbranched alkanes, the longer one always boils higher — no exceptions to memorise, just one force to reason from.',
      { mol: molOf('octane'), caption: 'Eight carbons of surface to hold on with.' }
    ),
    {
      type: 'question',
      q: mcQ('Which boils highest?', ['butane', 'hexane', 'octane', 'pentane'], 2,
        'Most carbons, most surface, most cling: octane.',
        { 0: 'inverted', 1: 'adjacent-swap', 3: 'inverted' }),
    },
  ],
  pool: pool(
    mcQ('Which boils lowest?', ['heptane', 'propane', 'pentane', 'hexane'], 1,
      'The smallest molecule lets go first.', { 0: 'inverted', 2: 'adjacent-swap', 3: 'adjacent-swap' }),
    mcQ('Which pair is closest in boiling point?', ['methane and octane', 'hexane and heptane', 'ethane and heptane', 'propane and octane'], 1,
      'Neighbours on the ladder differ by one carbon of surface — everything else on this list is far apart.',
      { 0: 'inverted', 2: 'adjacent-swap', 3: 'adjacent-swap' }),
    mcQ('Why does octane boil above butane?', ['Its bonds are stronger', 'More surface, so stronger dispersion forces between molecules', 'It is a liquid', 'Butane is a gas'], 1,
      'The bonds inside the molecule never break at boiling — what breaks is the grip between molecules, and octane has more surface to grip with.',
      { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }),
    mcQ('Boiling points climb along butane, pentane, hexane because…', ['each has one more carbon of surface for dispersion forces', 'each is more branched', 'the C–C bonds get weaker', 'the molecules get more polar'], 0,
      'Same family, same forces — only the amount of surface changes.',
      { 1: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }),
    mcQ('Which is a gas at room temperature?', ['hexane', 'octane', 'ethane', 'heptane'], 2,
      'Two carbons of cling is not enough to stay liquid at 25°.',
      { 0: 'inverted', 1: 'inverted', 3: 'inverted' }),
    mcQ('Predict: nonane (nine carbons) boils…', ['below octane', 'between hexane and heptane', 'above octane', 'exactly at 100°'], 2,
      'One more rung on the same ladder.', { 0: 'inverted', 1: 'adjacent-swap', 3: 'adjacent-swap' })
  ),
};

const R1_L2 = {
  id: 'r01-l2',
  title: 'Branching lowers the boiling point',
  teaches: ['properties'],
  ask: 6,
  steps: [
    T(
      'Same formula, different grip',
      'pentane, 2-methylbutane and 2,2-dimethylpropane are all C₅H₁₂ — you learned to name all three. They boil at 36°, 28° and 9.5°.\n\nBranching pulls a molecule into a compact ball. Less surface touches the neighbour, the [[dispersion forces]] have less to work with, and the boiling point drops. Same atoms, weaker grip.',
      { mol: molOf('2,2-dimethylpropane'), caption: '2,2-dimethylpropane: C₅H₁₂ rolled into a ball. It boils 27° below pentane.' }
    ),
    {
      type: 'question',
      q: mcQ('All three are C₅H₁₂. Which boils lowest?', ['pentane', '2-methylbutane', '2,2-dimethylpropane', 'they boil at the same temperature'], 2,
        'Most branched, most compact, least surface to cling with.',
        { 0: 'inverted', 1: 'adjacent-swap', 3: 'right-answer-wrong-reason' }),
    },
  ],
  pool: pool(
    mcQ('Which boils highest?', ['2,2-dimethylbutane', 'hexane', '2-methylpentane', 'they are equal — same formula'], 1,
      'All C₆H₁₄; the straight chain has the most surface.',
      { 0: 'inverted', 2: 'adjacent-swap', 3: 'right-answer-wrong-reason' }),
    mcQ('Branching lowers boiling point because…', ['branched molecules are lighter', 'a compact shape has less surface for dispersion forces', 'branches repel each other', 'branched alkanes are more reactive'], 1,
      'The formula — and so the mass — is identical. Only the shape, and with it the touching surface, changes.',
      { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }),
    mcQ('Rank lowest to highest: pentane, 2-methylbutane, 2,2-dimethylpropane.',
      ['2,2-dimethylpropane < 2-methylbutane < pentane', 'pentane < 2-methylbutane < 2,2-dimethylpropane', '2-methylbutane < pentane < 2,2-dimethylpropane', '2,2-dimethylpropane < pentane < 2-methylbutane'], 0,
      'More branches, lower boiling: the ball first, the chain last.',
      { 1: 'inverted', 2: 'adjacent-swap', 3: 'adjacent-swap' }),
    mcQ('Two C₆H₁₄ isomers differ in boiling point by 19°. The higher one is…', ['the more branched', 'the less branched', 'impossible to say', 'the one with more hydrogens'], 1,
      'Less branching means more chain touching the neighbours.',
      { 0: 'inverted', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }),
    mcQ('A fuel blender wants the C₈H₁₈ isomer that evaporates most readily. Choose…', ['octane', 'a highly branched isomer like 2,2,4-trimethylpentane', 'the heaviest isomer', 'evaporation does not depend on structure'], 1,
      'Evaporating easily is boiling low, and branching is how you get there without changing the formula.',
      { 0: 'inverted', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }),
    mcQ('Same carbon count, one is a gas and one a liquid at 25°. The gas is likely…', ['the straight chain', 'the branched isomer', 'both equally likely', 'the one drawn larger'], 1,
      'The branched isomer boils lower, so it is the one already boiled at room temperature.',
      { 0: 'inverted', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' })
  ),
};

const R1_CP = {
  id: 'r01-cp',
  title: 'Checkpoint: chains and boiling points',
  teaches: ['properties'],
  checkpoint: true,
  ask: 15,
  steps: [],
  pool: pool(
    mcQ('Which boils highest?', ['pentane', 'octane', 'butane', 'hexane'], 1, 'Longest chain, most cling.', { 0: 'adjacent-swap', 2: 'inverted', 3: 'adjacent-swap' }),
    mcQ('Which boils lowest?', ['hexane', 'heptane', 'butane', 'pentane'], 2, 'Smallest surface lets go first.', { 0: 'adjacent-swap', 1: 'inverted', 3: 'adjacent-swap' }),
    mcQ('Which is closest to hexane\u2019s boiling point?', ['methane', 'heptane', 'decane', 'ethane'], 1, 'One carbon apart on the ladder.', { 0: 'inverted', 2: 'adjacent-swap', 3: 'inverted' }),
    mcQ('The force between alkane molecules is…', ['covalent bonding', 'hydrogen bonding', 'dispersion forces', 'ionic attraction'], 2, 'The weak universal one — the only one alkanes have.', { 0: 'right-answer-wrong-reason', 1: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }),
    mcQ('Boiling breaks…', ['C–C bonds', 'C–H bonds', 'the attractions between molecules', 'the molecule into atoms'], 2, 'The molecules leave intact; only the grip between them fails.', { 0: 'right-answer-wrong-reason', 1: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }),
    mcQ('All C₅H₁₂. Which boils highest?', ['2,2-dimethylpropane', '2-methylbutane', 'pentane', 'all equal'], 2, 'Least branched, most surface.', { 0: 'inverted', 1: 'adjacent-swap', 3: 'right-answer-wrong-reason' }),
    mcQ('All C₆H₁₄. Which boils lowest?', ['hexane', '2-methylpentane', '2,2-dimethylbutane', 'all equal'], 2, 'The double branch makes the tightest ball.', { 0: 'inverted', 1: 'adjacent-swap', 3: 'right-answer-wrong-reason' }),
    mcQ('Branching changes boiling point by changing…', ['mass', 'formula', 'the surface molecules touch with', 'bond strength'], 2, 'Mass and formula are fixed by the isomer; shape is what branching moves.', { 0: 'right-answer-wrong-reason', 1: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }),
    mcQ('2-methylpentane boils at 60°. hexane boils…', ['lower', 'higher', 'the same', 'as a gas'], 1, 'Straighter chain of the same formula: higher.', { 0: 'inverted', 2: 'adjacent-swap', 3: 'right-answer-wrong-reason' }),
    mcQ('Which comparison is fair evidence that branching lowers boiling point?', ['pentane vs hexane', 'pentane vs 2-methylbutane', 'butane vs octane', 'methane vs 2-methylbutane'], 1,
      'Only isomers isolate the branching: same formula, different shape. The others change the size too.',
      { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }),
    mcQ('heptane boils at 98°. Predict 3-methylhexane.', ['about 92°', 'about 120°', 'about 40°', 'exactly 98°'], 0, 'One branch: a little lower, not wildly lower.', { 1: 'inverted', 2: 'adjacent-swap', 3: 'right-answer-wrong-reason' }),
    mcQ('Two unbranched alkanes: A boils at 36°, B at 126°. B is…', ['smaller than A', 'larger than A', 'the same size', 'branched'], 1, 'Higher boiling on the same ladder means more carbons.', { 0: 'inverted', 2: 'adjacent-swap', 3: 'right-answer-wrong-reason' }),
    mcQ('Candle wax (long alkanes) is solid at 25° because…', ['long chains have strong dispersion forces', 'wax molecules are ionic', 'long chains hydrogen-bond', 'wax is not made of molecules'], 0,
      'Enough surface and the grip holds solid at room temperature.',
      { 1: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }),
    mcQ('Natural gas (methane) is a gas, petrol (around C₈) a liquid. This is mostly…', ['chain length and dispersion forces', 'branching', 'hydrogen bonding', 'polarity'], 0,
      'The ladder again: size sets the grip.',
      { 1: 'adjacent-swap', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }),
    mcQ('An isomer of octane boils 27° below octane. It is probably…', ['unbranched', 'lightly branched', 'heavily branched', 'not an alkane'], 2, 'A large drop from the same formula means a compact shape.', { 0: 'inverted', 1: 'adjacent-swap', 3: 'right-answer-wrong-reason' }),
    mcQ('Which prediction is safe without a data table?', ['hexane boils above pentane', 'hexane boils at 69.2°', 'hexane freezes at −95°', 'hexane is denser than water'], 0,
      'Trends are reasoned; exact values are measured.',
      { 1: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }),
    mcQ('All C₇H₁₆: rank lowest to highest.', ['2,2-dimethylpentane < 2-methylhexane < heptane', 'heptane < 2-methylhexane < 2,2-dimethylpentane', '2-methylhexane < heptane < 2,2-dimethylpentane', '2-methylhexane < 2,2-dimethylpentane < heptane'], 0,
      'Two branches, one branch, none: the ball, the kink, the chain.',
      { 1: 'inverted', 2: 'adjacent-swap', 3: 'adjacent-swap' }),
    mcQ('Dispersion forces are…', ['permanent charges', 'temporary, flickering attractions all molecules have', 'bonds within the molecule', 'only between different compounds'], 1,
      'Weak, universal, and everything R1 predicts follows from them.',
      { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }),
    mcQ('Between pentane molecules there are…', ['hydrogen bonds', 'dispersion forces only', 'ionic attractions', 'no forces at all'], 1, 'An alkane brings nothing else to the table.', { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }),
    mcQ('Doubling chain length roughly…', ['halves the boiling point', 'raises the boiling point substantially', 'leaves it unchanged', 'makes the alkane ionic'], 1, 'More surface, more cling, higher boiling.', { 0: 'inverted', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }),
    mcQ('Which is liquid at 25°?', ['methane', 'ethane', 'propane', 'hexane'], 3, 'Six carbons is past the gas line.', { 0: 'inverted', 1: 'inverted', 2: 'adjacent-swap' }),
    mcQ('2,2,3,3-tetramethylbutane is C₈H₁₈, like octane. Its boiling point is…', ['well above octane', 'close to but below octane', 'exactly octane\u2019s', 'unpredictable'], 1,
      'Four branches: compact, lower — but the same formula keeps it in the same neighbourhood.',
      { 0: 'inverted', 2: 'adjacent-swap', 3: 'right-answer-wrong-reason' }),
    mcQ('The best explanation sentence for an exam: pentane boils above 2,2-dimethylpropane because…',
      ['it is heavier', 'its straighter shape gives more surface contact, so stronger dispersion forces between molecules', 'it has stronger covalent bonds', 'it is more flammable'], 1,
      'Same mass, same bonds. Surface and forces between molecules is the whole answer, and the sentence to write.',
      { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }),
    mcQ('Which needs the most energy to boil, per mole?', ['butane', 'pentane', 'heptane', 'propane'], 2, 'The strongest total grip to break.', { 0: 'adjacent-swap', 1: 'adjacent-swap', 3: 'inverted' }),
    mcQ('A student says branching lowers boiling point because branched molecules weigh less. What is wrong?', ['nothing', 'isomers weigh the same — the shape, not the mass, changes', 'branched molecules weigh more', 'boiling point does not depend on forces'], 1,
      'The most common wrong reason, worth killing precisely: isomers share a formula and a mass.',
      { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }),
    mcQ('Petrol evaporating on a warm day is…', ['dispersion forces failing before hydrogen bonds', 'small and branched alkanes boiling away first', 'a chemical reaction', 'the C–H bonds breaking'], 1,
      'The lowest-boiling components leave first — the small and the branched.',
      { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }),
    mcQ('From the ladder butane −1°, pentane 36°, hexane 69°: the gaps…', ['grow without limit', 'shrink slightly as chains lengthen', 'alternate up and down', 'are exactly equal'], 1,
      'Each added carbon matters a little less than the one before — the trend is strong, the steps taper.',
      { 0: 'adjacent-swap', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }),
    mcQ('Which single change raises an alkane\u2019s boiling point?', ['adding a branch', 'removing a carbon', 'lengthening the chain', 'nothing can'], 2, 'Surface up, boiling up.', { 0: 'inverted', 1: 'inverted', 3: 'right-answer-wrong-reason' }),
    mcQ('C₁₀H₂₂ vs C₄H₁₀: the difference in boiling point is roughly…', ['a few degrees', 'over a hundred degrees', 'zero', 'negative'], 1, 'Six carbons of extra surface is a lot of extra grip.', { 0: 'adjacent-swap', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }),
    mcQ('The property thread\u2019s one rule so far:', ['stronger forces between molecules, higher boiling point', 'heavier molecules always boil higher', 'branched molecules always boil higher', 'boiling point is random'], 0,
      'Everything else in these two lessons is this rule applied.',
      { 1: 'right-answer-wrong-reason', 2: 'inverted', 3: 'right-answer-wrong-reason' })
  ),
};

// ─────────────────────────────────────────────────────────────
// R2 · The first reactions (stage 3)
// ─────────────────────────────────────────────────────────────

const R2_L1 = {
  id: 'r02-l1',
  title: 'Every hydrocarbon burns',
  teaches: ['reactions'],
  ask: 5,
  steps: [
    T(
      'Complete combustion',
      'With enough oxygen, any hydrocarbon burns to carbon dioxide and water:\n\nCH₄ + 2 O₂ → CO₂ + 2 H₂O\n\nAll the carbon leaves as CO₂, all the hydrogen as H₂O — which is why the products can be predicted from the formula alone, and why fuels are compared by how much energy this reaction releases.',
      { mol: molOf('methane'), caption: 'Natural gas: one carbon in, one CO₂ out.' }
    ),
    T(
      'Incomplete combustion',
      'Starve the flame of oxygen and the carbon cannot all reach CO₂: carbon monoxide, or soot, forms instead.\n\n2 CH₄ + 3 O₂ → 2 CO + 4 H₂O\n\nSame fuel, less oxygen, a poisonous product — the reason gas heaters need ventilation, and the yellow in a sooty flame.',
      { mol: molOf('methane'), caption: 'The same fuel. The oxygen supply decides the products.' }
    ),
    {
      type: 'question',
      q: mcQ('Propane burns completely. The products are…',
        ['CO₂ and H₂O', 'CO and H₂O', 'CO₂ and H₂', 'carbon and water'], 0,
        'Complete combustion: every carbon to CO₂, every hydrogen to H₂O.',
        { 1: 'confused-incomplete', 2: 'wrong-type', 3: 'confused-incomplete' },
        { chip: 'PREDICT THE PRODUCT', category: 'predict-product' }),
    },
  ],
  pool: pool(
    mcQ('Which condition pushes combustion toward CO instead of CO₂?', ['excess oxygen', 'limited oxygen', 'a nickel catalyst', 'UV light'], 1,
      'Not enough oxygen to finish the job.', { 0: 'inverted', 2: 'wrong-reagent', 3: 'wrong-reagent' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    mcQ('Butane burns completely: C₄H₁₀ + O₂ → … Which lists every product?', ['4 CO₂ + 5 H₂O', '4 CO + 5 H₂O', 'CO₂ + H₂O + C', '4 CO₂ + 10 H₂O'], 0,
      'Four carbons, ten hydrogens: four CO₂, five H₂O. Atoms have to go somewhere.',
      { 1: 'confused-incomplete', 2: 'confused-incomplete', 3: 'unbalanced' }, { chip: 'BALANCE THE BOOKS', category: 'complete-equation' }),
    mcQ('A sooty yellow flame under a beaker means…', ['complete combustion', 'incomplete combustion', 'no reaction', 'substitution'], 1,
      'Soot is carbon that never reached CO₂.', { 0: 'inverted', 2: 'wrong-type', 3: 'confused-substitution' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    mcQ('Why is CO dangerous while CO₂ from the same heater is not, at these levels?', ['CO is flammable', 'CO binds to haemoglobin and displaces oxygen', 'CO is heavier than air', 'CO is acidic'], 1,
      'The blood mistakes it for oxygen and holds it tighter.',
      { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }),
    mcQ('Combustion of any alkane always produces…', ['water', 'carbon monoxide', 'soot', 'hydrogen gas'], 0,
      'The hydrogen always leaves as water; what the carbon becomes depends on the oxygen supply.',
      { 1: 'confused-incomplete', 2: 'confused-incomplete', 3: 'wrong-type' })
  ),
};

const R2_L2 = {
  id: 'r02-l2',
  title: 'Substitution: swap under UV',
  teaches: ['reactions'],
  ask: 6,
  steps: [
    T(
      'Alkanes are unreactive — until the light comes on',
      'An [[alkane]] and bromine sit together indefinitely at room temperature. Shine UV light on them and a hydrogen is swapped for a bromine: a [[haloalkane]] forms, and HBr carries the swapped hydrogen away.\n\nOne group replaces another on a saturated carbon — substitution, the same word you will meet again and again.',
      { rxn: SUB_ETHANE_UV, caption: 'ethane + Br₂ under UV → bromoethane + HBr. No light, no reaction.' }
    ),
    T(
      'Honesty about the mixture',
      'In a real flask the reaction does not stop politely at one swap: some molecules trade two hydrogens, some three, and on a longer chain the bromine can land at different positions.\n\nThe cards here show the mono-substituted product, which is what VCE asks you to predict — but "a mixture forms" is worth a mark of its own.',
      { rxn: SUB_PROPANE_UV, caption: 'propane + Cl₂ under UV: 1-chloropropane shown; 2-chloropropane and multi-substituted molecules form too.' }
    ),
    { type: 'question', q: classifyReaction(SUB_ETHANE_UV, { seed: 701, explain: 'A hydrogen traded for a bromine on a saturated carbon: substitution.' }) },
  ],
  pool: pool(
    predictProductName(SUB_ETHANE_UV, ['1,2-dibromoethane', 'ethene', 'ethanol'], {
      seed: 711, explain: 'One hydrogen swaps for one bromine: bromoethane. The dibromide is what ADDITION to ethene gives.',
      errorClasses: { 1: 'wrong-type', 2: 'wrong-type', 3: 'wrong-reagent' },
    }),
    pickReagent(SUB_ETHANE_UV, ['Br₂', 'HBr', 'H₂ / Ni'], {
      seed: 712, explain: 'Bromine with UV light. Bromine alone does nothing to an alkane — the light is the reagent\u2019s other half.',
      errorClasses: { 1: 'wrong-reagent', 2: 'wrong-reagent', 3: 'wrong-type' },
    }),
    completeEquation(SUB_ETHANE_UV, ['H₂', 'H₂O', 'CO₂'], {
      seed: 713, explain: 'The swapped-out hydrogen leaves with a bromine: HBr.',
    }),
    classifyReaction(SUB_PROPANE_UV, { seed: 714, explain: 'Substitution again — the chain is untouched, one H traded.' }),
    nameProduct(SUB_PROPANE_UV, { hint: 'Chlorine on carbon 1 of a three-carbon chain.' }),
    mcQ('Why does the flask also contain 2-chloropropane?', ['chlorine prefers the middle', 'UV substitution is unselective — any hydrogen can be swapped', 'propane rearranges first', 'it does not'], 1,
      'The light makes radicals, and radicals are not fussy. VCE wants the mono-product predicted and the mixture acknowledged.',
      { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' })
  ),
};

const R2_L3 = {
  id: 'r02-l3',
  title: 'Addition: the double bond opens',
  teaches: ['reactions'],
  ask: 6,
  steps: [
    T(
      'Unsaturated means room to add',
      'An [[alkene]]\u2019s double bond is a stored seat: hydrogen over a nickel catalyst adds straight across it, one H to each carbon, and the alkene becomes an alkane.\n\nNothing leaves. Two molecules became one — that is addition, and only unsaturated molecules can do it.',
      { rxn: ADD_ETHENE_H2, caption: 'ethene + H₂ over nickel → ethane. Count the atoms: all still there.' }
    ),
    T(
      'The bromine water test',
      'Bromine adds the same way — Br to each carbon — and the result is the test you do in a school lab: orange bromine water shaken with an alkene goes colourless as the Br₂ is consumed.\n\nAn alkane, with no double bond to open, leaves it orange (in the dark). One colour change separates the two families.',
      { rxn: ADD_ETHENE_BR2, caption: 'ethene + Br₂ → 1,2-dibromoethane: the orange disappears into the product.' }
    ),
    { type: 'question', q: classifyReaction(ADD_ETHENE_BR2, { seed: 721, explain: 'The double bond opened and both bromines stayed: addition.' }) },
  ],
  pool: pool(
    predictProductName(ADD_BUT2ENE_H2, ['but-1-ene', 'butanal', '2-bromobutane'], {
      seed: 731, explain: 'Hydrogen across the double bond saturates it: butane.',
      errorClasses: { 1: 'wrong-type', 2: 'wrong-type', 3: 'wrong-reagent' },
    }),
    predictProductName(ADD_ETHENE_BR2, ['bromoethane', 'ethane', '1,1-dibromoethane'], {
      seed: 732, explain: 'One Br to each carbon of the old double bond: 1,2-dibromoethane. Just one Br is substitution\u2019s result, not addition\u2019s.',
      errorClasses: { 1: 'confused-substitution', 2: 'wrong-reagent', 3: 'wrong-position' },
    }),
    pickReagent(ADD_ETHENE_H2, ['Br₂ / UV', 'H₂O / H₂SO₄', 'Br₂'], {
      seed: 733, explain: 'Hydrogen with a nickel catalyst. UV bromine substitutes ALKANES — the families and the reagents pair up.',
      errorClasses: { 1: 'wrong-reagent', 2: 'wrong-reagent', 3: 'wrong-reagent' },
    }),
    classifyReaction(ADD_ETHENE_H2, { seed: 734, explain: 'Two molecules became one and nothing left: addition.' }),
    mcQ('Bromine water: hexane vs hex-1-ene, in the dark. What happens?', ['both decolourise it', 'neither does', 'only hex-1-ene decolourises it', 'only hexane decolourises it'], 2,
      'The double bond consumes the Br₂; the alkane, in the dark, cannot.',
      { 0: 'confused-substitution', 1: 'wrong-type', 3: 'inverted' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    drawProduct(ADD_ETHENE_BR2, { hint: 'Two carbons, a bromine on each.' })
  ),
};

const R2_L4 = {
  id: 'r02-l4',
  title: 'Adding HX: where does it land?',
  teaches: ['reactions'],
  ask: 6,
  steps: [
    T(
      'HBr adds across too',
      'Hydrogen halides add the same way: H to one carbon of the double bond, the halogen to the other. On a symmetrical alkene like ethene there is only one possible product.',
      { rxn: ADD_ETHENE_HCL, caption: 'ethene + HCl → chloroethane. Symmetrical alkene, one answer.' }
    ),
    T(
      'Unsymmetrical alkenes give a major product',
      'On propene the two ends of the double bond differ, so two products are possible — and they do not form equally. The hydrogen goes mainly to the carbon that already has more hydrogens, putting the bromine on the middle carbon.\n\n2-bromopropane is the major product; 1-bromopropane the minor. State the major one, and say "major" when you do.',
      { rxn: ADD_PROPENE_HBR, caption: 'propene + HBr → 2-bromopropane (major). H to the CH₂ end, Br to the CH.' }
    ),
    {
      type: 'question',
      q: predictProductName(ADD_PROPENE_HBR, ['1-bromopropane', 'propane', '1,2-dibromopropane'], {
        seed: 741, explain: 'H to the end carbon that already has two hydrogens; Br to the middle: 2-bromopropane, the major product.',
        errorClasses: { 1: 'wrong-position', 2: 'wrong-reagent', 3: 'wrong-reagent' },
      }),
    },
  ],
  pool: pool(
    predictProductName(ADD_ETHENE_HCL, ['1,2-dichloroethane', 'ethane', 'ethanol'], {
      seed: 751, explain: 'H to one carbon, Cl to the other: chloroethane.',
      errorClasses: { 1: 'wrong-reagent', 2: 'wrong-reagent', 3: 'wrong-reagent' },
    }),
    predictProduct(ADD_PROPENE_HBR, ['1-bromopropane', 'propane', '2-chloropropane'], {
      seed: 752, explain: 'The major product carries Br on the more substituted carbon.',
      errorClasses: { 1: 'wrong-position', 2: 'wrong-reagent', 3: 'wrong-reagent' },
    }),
    mcQ('The minor product of propene + HBr is…', ['2-bromopropane', '1-bromopropane', 'propane', '2,2-dibromopropane'], 1,
      'The bromine on the end carbon: possible, just outnumbered.',
      { 0: 'inverted', 2: 'wrong-type', 3: 'wrong-reagent' }, { chip: 'PREDICT THE PRODUCT', category: 'predict-product' }),
    classifyReaction(ADD_PROPENE_HBR, { seed: 753, explain: 'H and Br both stayed on: addition, with a preferred orientation.' }),
    pickReagent(ADD_ETHENE_HCL, ['Cl₂ / UV', 'Cl₂', 'NaOH(aq)'], {
      seed: 754, explain: 'HCl adds H and Cl across the bond. Cl₂ would add two chlorines; UV chlorine is for alkanes.',
      errorClasses: { 1: 'wrong-reagent', 2: 'wrong-reagent', 3: 'wrong-type' },
    }),
    mcQ('Why does but-2-ene + HBr give only one bromobutane?', ['HBr is selective', 'the two ends of its double bond are equivalent', 'bromine cannot reach C1', 'it gives none'], 1,
      'A symmetrical alkene has no major/minor question to ask.',
      { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'wrong-type' }, { chip: 'PREDICT THE PRODUCT', category: 'predict-product' })
  ),
};

const R2_CP = {
  id: 'r02-cp',
  title: 'Checkpoint: burn, swap, add',
  teaches: ['reactions'],
  checkpoint: true,
  ask: 15,
  steps: [],
  pool: pool(
    predictProductName(SUB_ETHANE_UV, ['ethene', '1,2-dibromoethane', 'ethanol'], {
      seed: 761, explain: 'One H swapped for Br under UV.',
      errorClasses: { 1: 'wrong-type', 2: 'confused-addition', 3: 'wrong-reagent' },
    }),
    predictProductName(SUB_PROPANE_UV, ['2-chloropropane', 'propene', '1,2-dichloropropane'], {
      seed: 762, explain: 'The card shows the 1-position mono-product; the flask also holds its siblings.',
      errorClasses: { 1: 'wrong-position', 2: 'wrong-type', 3: 'confused-addition' },
    }),
    predictProductName(ADD_ETHENE_H2, ['ethyne', 'bromoethane', 'ethanol'], {
      seed: 763, explain: 'Saturated: ethane.',
      errorClasses: { 1: 'wrong-reagent', 2: 'wrong-reagent', 3: 'wrong-reagent' },
    }),
    predictProductName(ADD_BUT2ENE_H2, ['but-1-ene', '2-bromobutane', 'butan-2-ol'], {
      seed: 764, explain: 'Hydrogen across the double bond: butane.',
      errorClasses: { 1: 'wrong-type', 2: 'wrong-reagent', 3: 'wrong-reagent' },
    }),
    predictProduct(ADD_ETHENE_BR2, ['bromoethane', 'ethane', 'chloroethane'], {
      seed: 765, explain: 'Both bromines stay: 1,2-dibromoethane.',
      errorClasses: { 1: 'confused-substitution', 2: 'wrong-reagent', 3: 'wrong-reagent' },
    }),
    predictProduct(ADD_PROPENE_HBR, ['1-bromopropane', '1,2-dibromopropane', 'propan-2-ol'], {
      seed: 766, explain: 'Major product: bromine on the middle carbon.',
      errorClasses: { 1: 'wrong-position', 2: 'wrong-reagent', 3: 'wrong-reagent' },
    }),
    predictProductName(ADD_ETHENE_HCL, ['1,1-dichloroethane', 'ethane', 'ethanal'], {
      seed: 767, explain: 'chloroethane — one H, one Cl, across the old double bond.',
      errorClasses: { 1: 'wrong-position', 2: 'wrong-reagent', 3: 'wrong-type' },
    }),
    pickReagent(ADD_ETHENE_BR2, ['Br₂ / UV', 'HBr', 'H₂ / Ni'], {
      seed: 771, explain: 'Bromine, no light needed — the double bond does the work.',
      errorClasses: { 1: 'wrong-reagent', 2: 'wrong-reagent', 3: 'wrong-reagent' },
    }),
    pickReagent(SUB_PROPANE_UV, ['Cl₂', 'HCl', 'NaOH(aq)'], {
      seed: 772, explain: 'Chlorine AND ultraviolet light: the pair is the reagent.',
      errorClasses: { 1: 'wrong-reagent', 2: 'wrong-reagent', 3: 'wrong-type' },
    }),
    pickReagent(ADD_BUT2ENE_H2, ['Br₂', 'H₂O / H₂SO₄', 'Cl₂ / UV'], {
      seed: 773, explain: 'Hydrogen over nickel saturates the alkene.',
      errorClasses: { 1: 'wrong-reagent', 2: 'wrong-reagent', 3: 'wrong-type' },
    }),
    classifyReaction(SUB_ETHANE_UV, { seed: 781, explain: 'Substitution: trade, not add.' }),
    classifyReaction(ADD_ETHENE_H2, { seed: 782, explain: 'Addition: the bond opens, everything stays.' }),
    classifyReaction(ADD_PROPENE_HBR, { seed: 783, explain: 'Addition, with an orientation preference.' }),
    completeEquation(SUB_PROPANE_UV, ['H₂O', 'H₂', 'Cl₂'], { seed: 784, explain: 'The swapped hydrogen leaves as HCl.' }),
    completeEquation(SUB_ETHANE_UV, ['H₂', 'NaBr', 'H₂O'], { seed: 785, explain: 'HBr: the traded hydrogen and a bromine.' }),
    nameProduct(ADD_ETHENE_BR2, { hint: 'Two carbons, a bromine on each, locants for both.' }),
    nameProduct(ADD_PROPENE_HBR, { hint: 'The major product: Br on carbon 2.' }),
    nameProduct(SUB_ETHANE_UV, { hint: 'Bromo- on a two-carbon chain.' }),
    drawProduct(ADD_ETHENE_HCL, { hint: 'Two carbons, one chlorine.' }),
    drawProduct(ADD_BUT2ENE_H2, { hint: 'Four carbons, all single bonds.' }),
    mcQ('Which reagent set distinguishes hexane from hex-2-ene fastest?', ['bromine water, dark', 'UV light alone', 'nickel catalyst alone', 'water'], 0,
      'The alkene decolourises it; the alkane does not. One shake.',
      { 1: 'wrong-reagent', 2: 'wrong-reagent', 3: 'wrong-reagent' }, { chip: 'PICK THE REAGENT', category: 'pick-reagent' }),
    mcQ('Complete combustion of ethane gives…', ['2 CO₂ + 3 H₂O', 'CO + 3 H₂O', '2 CO₂ + 6 H₂O', 'C + H₂O'], 0,
      'Two carbons, six hydrogens: two CO₂, three H₂O.',
      { 1: 'confused-incomplete', 2: 'unbalanced', 3: 'confused-incomplete' }, { chip: 'BALANCE THE BOOKS', category: 'complete-equation' }),
    mcQ('Which reaction needs UV light?', ['ethene + Br₂', 'ethane + Br₂', 'ethene + H₂ / Ni', 'ethene + HCl'], 1,
      'Only the alkane needs the light; the double bond reacts without it.',
      { 0: 'confused-addition', 2: 'wrong-reagent', 3: 'wrong-reagent' }, { chip: 'PICK THE REAGENT', category: 'pick-reagent' }),
    mcQ('An unknown gas decolourises bromine water in the dark. It is…', ['an alkane', 'unsaturated', 'a haloalkane', 'water vapour'], 1,
      'Something in it opened for the bromine: a double or triple bond.',
      { 0: 'inverted', 2: 'wrong-family', 3: 'wrong-type' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    mcQ('Substitution and addition differ in that…', ['substitution releases a small molecule, addition keeps everything', 'addition needs UV', 'substitution needs a double bond', 'they are the same'], 0,
      'Trade versus absorb: HBr leaves a substitution; nothing leaves an addition.',
      { 1: 'confused-substitution', 2: 'confused-addition', 3: 'right-answer-wrong-reason' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    mcQ('The major product rule for HX addition: H goes to…', ['the carbon with fewer hydrogens', 'the carbon with more hydrogens', 'either, equally', 'the halogen\u2019s carbon'], 1,
      'To them that hath: H joins the H-rich carbon, X takes the other.',
      { 0: 'inverted', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }, { chip: 'PREDICT THE PRODUCT', category: 'predict-product' }),
    mcQ('but-1-ene + HBr, major product:', ['1-bromobutane', '2-bromobutane', 'butane', '1,2-dibromobutane'], 1,
      'H to the CH₂ end, Br to carbon 2.',
      { 0: 'wrong-position', 2: 'wrong-reagent', 3: 'wrong-reagent' }, { chip: 'PREDICT THE PRODUCT', category: 'predict-product' }),
    mcQ('Which will NOT react with bromine in the dark at room temperature?', ['ethene', 'propene', 'hexane', 'but-2-ene'], 2,
      'No double bond, no seat to offer — and no light to force the swap.',
      { 0: 'inverted', 1: 'inverted', 3: 'inverted' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    classifyCarbon('2-bromopropane', 2, { seed: 786, explain: 'The bromine sits on a secondary carbon — which is exactly where the major-product rule put it.' }),
    mcQ('Ethyne (a triple bond) with excess Br₂ would…', ['not react', 'add twice, taking four bromines', 'substitute one H', 'burn'], 1,
      'Two seats to fill: addition can happen across each of them.',
      { 0: 'wrong-type', 2: 'confused-substitution', 3: 'wrong-type' }, { chip: 'PREDICT THE PRODUCT', category: 'predict-product' })
  ),
};

// ─────────────────────────────────────────────────────────────
// R6 · Water, oil and hydrogen bonds (stage 4, after the ladder)
// ─────────────────────────────────────────────────────────────

const R6_L1 = {
  id: 'r06-l1',
  title: 'Like dissolves like',
  teaches: ['properties'],
  ask: 6,
  steps: [
    T(
      'What dissolving asks of a molecule',
      'To dissolve in water a molecule must be worth water\u2019s while: it has to offer attractions comparable to the hydrogen bonds the water gives up to make room.\n\nAn OH group can — it hydrogen-bonds into the water network. An alkane offers only [[dispersion forces]], so water keeps its own company and the oil floats. Like dissolves like.',
      { mol: molOf('ethanol'), caption: 'ethanol: the OH buys its way into water in any proportion.' }
    ),
    T(
      'The chain drags against it',
      'The OH is the ticket in; the carbon chain is dead weight. ethanol mixes with water completely; butan-1-ol only partly; hexan-1-ol barely at all.\n\nOne group, one trend: solubility falls as the non-polar chain grows. The [[hydroxyl]] has not changed — it is simply outvoted.',
      { mol: molOf('hexan-1-ol'), caption: 'Six carbons of grease against one OH: the chain wins.' }
    ),
    {
      type: 'question',
      q: mcQ('Which dissolves best in water?', ['hexane', 'hexan-1-ol', 'methanol', 'octane'], 2,
        'An OH with almost no chain attached: maximum ticket, minimum drag.',
        { 0: 'inverted', 1: 'adjacent-swap', 3: 'inverted' }),
    },
  ],
  pool: pool(
    mcQ('Which is least soluble in water?', ['ethanol', 'propan-1-ol', 'octane', 'ethanoic acid'], 2,
      'Nothing to offer the water network but dispersion forces.',
      { 0: 'inverted', 1: 'adjacent-swap', 3: 'inverted' }),
    mcQ('Why does oil float unmixed on water?', ['oil is ionic', 'oil cannot match the hydrogen bonds water would give up', 'oil repels water electrically', 'oil is heavier'], 1,
      'Water declines a bad trade: its hydrogen bonds for mere dispersion forces.',
      { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }),
    mcQ('ethanol mixes with water in all proportions because…', ['it is small and light', 'its OH hydrogen-bonds into the water network', 'it is an acid', 'it contains carbon'], 1,
      'The OH is the whole ticket.',
      { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }),
    mcQ('Rank by water solubility, highest first: methanol, butan-1-ol, hexan-1-ol.',
      ['methanol > butan-1-ol > hexan-1-ol', 'hexan-1-ol > butan-1-ol > methanol', 'butan-1-ol > methanol > hexan-1-ol', 'all equal — all have OH'], 0,
      'Same ticket, growing drag.',
      { 1: 'inverted', 2: 'adjacent-swap', 3: 'right-answer-wrong-reason' }),
    mcQ('Which pair will mix completely?', ['hexane and water', 'hexane and octane', 'octane and ethanoic acid', 'water and octane'], 1,
      'Like dissolves like runs both ways: two oils are happy together.',
      { 0: 'inverted', 2: 'adjacent-swap', 3: 'inverted' }),
    mcQ('Propan-2-ol wipes clean off skin with water; hexane needs soap. Because…', ['propan-2-ol is lighter', 'the OH makes propan-2-ol water-soluble; hexane is not', 'hexane is a solid', 'water reacts with propan-2-ol'], 1,
      'Solubility is the cleaning.',
      { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' })
  ),
};

const R6_L2 = {
  id: 'r06-l2',
  title: 'Arguing a property from a structure',
  teaches: ['properties'],
  ask: 6,
  steps: [
    T(
      'The two-marker recipe',
      'Every property comparison is the same three sentences: name the forces each molecule has, say which forces are stronger, connect that to the property.\n\n"butan-1-ol hydrogen-bonds and butanal cannot donate one; hydrogen bonds are stronger than dipole attractions; so butan-1-ol boils higher." Structure → forces → property. Marks follow the arrow.',
      { mol: molOf('butan-1-ol'), caption: 'One O–H is the entire difference between 75° and 117°.' }
    ),
    {
      type: 'question',
      q: mcQ('Propanone (a ketone) or propan-1-ol: which boils higher, and the right reason?',
        ['propanone — the C=O is polar', 'propan-1-ol — its O–H donates hydrogen bonds', 'propanone — it is more compact', 'propan-1-ol — it is heavier'], 1,
        'Both are polar; only the alcohol can donate a hydrogen bond, and that is the sentence to write.',
        { 0: 'inverted', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }),
    },
  ],
  pool: pool(
    mcQ('ethanoic acid boils above ethanol because…', ['it is more acidic', 'it forms hydrogen-bonded pairs, two bonds at a time', 'it has more atoms', 'acids always boil higher'], 1,
      'The dimer: two clasped hydrogen bonds per pair. Acidity is true and irrelevant.',
      { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }),
    mcQ('Which has hydrogen bonding between its OWN molecules?', ['propanal', 'propan-2-one', 'propan-1-ol', 'propene'], 2,
      'Only the one with an O–H to donate.',
      { 0: 'adjacent-swap', 1: 'adjacent-swap', 3: 'inverted' }),
    mcQ('Same size, which boils lowest?', ['butan-1-ol', 'butanal', 'butane', 'butanoic acid'], 2,
      'Dispersion only: the alkane lets go first.',
      { 0: 'inverted', 1: 'adjacent-swap', 3: 'inverted' }),
    mcQ('Methyl ethanoate vs ethanoic acid (isomers, C₂H₄O₂ vs C₃H₆O₂ — compare the acid with methyl methanoate, its true isomer): the ester boils far lower because…',
      ['esters are lighter', 'the ester has no O–H to donate a hydrogen bond', 'esters are non-polar', 'acids decompose'], 1,
      'Isomers weigh the same; the ester spent its O–H becoming an ester.',
      { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }),
    mcQ('Which argument earns both marks?', ['"propan-1-ol is bigger, so it boils higher"', '"propan-1-ol hydrogen-bonds; propanal cannot donate; hydrogen bonds are stronger; so propan-1-ol boils higher"', '"alcohols boil high"', '"propanal is a gas"'], 1,
      'Structure, then forces, then property — the full arrow.',
      { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }),
    mcQ('Water solubility, highest first: propan-1-ol, propanal, propane.',
      ['propan-1-ol > propanal > propane', 'propane > propanal > propan-1-ol', 'propanal > propan-1-ol > propane', 'all insoluble'], 0,
      'Hydrogen-bond donor, then polar acceptor, then nothing.',
      { 1: 'inverted', 2: 'adjacent-swap', 3: 'right-answer-wrong-reason' })
  ),
};

const R6_CP = {
  id: 'r06-cp',
  title: 'Checkpoint: properties from structures',
  teaches: ['properties'],
  checkpoint: true,
  ask: 15,
  steps: [],
  pool: pool(
    mcQ('Which boils highest — same carbon count?', ['pentane', 'pentan-1-ol', 'pentanal', 'pentanoic acid'], 3, 'Paired hydrogen bonds beat everything.', { 0: 'inverted', 1: 'adjacent-swap', 2: 'adjacent-swap' }),
    mcQ('Which boils lowest — same carbon count?', ['butanal', 'butan-1-ol', 'butane', 'butanoic acid'], 2, 'Dispersion only.', { 0: 'adjacent-swap', 1: 'inverted', 3: 'inverted' }),
    mcQ('Which dissolves best in water?', ['octane', 'ethanol', 'hexan-1-ol', 'hexane'], 1, 'Big ticket, no drag.', { 0: 'inverted', 2: 'adjacent-swap', 3: 'inverted' }),
    mcQ('Which is essentially insoluble in water?', ['methanol', 'ethanoic acid', 'heptane', 'propan-1-ol'], 2, 'Nothing to offer but dispersion.', { 0: 'inverted', 1: 'inverted', 3: 'inverted' }),
    mcQ('Hydrogen bonding needs…', ['any oxygen atom', 'an O–H (or N–H) to donate', 'a double bond', 'a halogen'], 1, 'A donor hydrogen on O or N — a lone C=O can only accept.', { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }),
    mcQ('Ketones and aldehydes boil above alkanes of the same size because…', ['they hydrogen-bond', 'their polar C=O adds dipole attractions', 'they are heavier', 'they are acids'], 1, 'Polar, but no donor: a middle rung.', { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }),
    mcQ('An ester and its parent acid: the smell reaches you from…', ['the acid — it is stronger', 'the ester — no O–H, low boiling, volatile', 'both equally', 'neither'], 1, 'Volatility is the smell.', { 0: 'inverted', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }),
    mcQ('Solubility of alcohols in water falls as…', ['the OH count rises', 'the carbon chain lengthens', 'temperature rises', 'pressure falls'], 1, 'The drag grows; the ticket does not.', { 0: 'inverted', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }),
    mcQ('ethane-1,2-diol (two OH groups) is fully miscible with water even at C₂ because…', ['it is ionic', 'two donors double the ticket', 'it has no carbon chain', 'diols are acids'], 1, 'Twice the hydrogen bonding for the same drag.', { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }),
    mcQ('Rank by boiling point, lowest first: propane, propanal, propan-1-ol.', ['propane < propanal < propan-1-ol', 'propanal < propane < propan-1-ol', 'propan-1-ol < propanal < propane', 'propane < propan-1-ol < propanal'], 0, 'Dispersion, dipole, donor.', { 1: 'adjacent-swap', 2: 'inverted', 3: 'adjacent-swap' }),
    mcQ('Which pair mixes completely?', ['water and hexane', 'ethanol and water', 'octane and water', 'hexane and ethanoic acid'], 1, 'Donor meets network.', { 0: 'inverted', 2: 'inverted', 3: 'adjacent-swap' }),
    mcQ('A molecule boils at 141° while its isomer boils at 57°. The 141° one probably…', ['is branched', 'can hydrogen-bond, twice over', 'is a gas', 'weighs more'], 1, 'That gap is a force gap, not a mass gap — isomers weigh the same.', { 0: 'inverted', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }),
    mcQ('Best exam sentence for "why is ethanol miscible with water"?', ['"ethanol is polar"', '"ethanol\u2019s O–H hydrogen-bonds with water, matching the bonds water gives up"', '"ethanol is small"', '"alcohol dissolves things"'], 1, 'Name the force AND the trade.', { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }),
    mcQ('Petrol spilled on water…', ['dissolves', 'sinks and dissolves', 'spreads as a floating layer', 'reacts'], 2, 'No ticket into the network, and less dense besides.', { 0: 'inverted', 1: 'right-answer-wrong-reason', 3: 'wrong-type' }),
    mcQ('Which change makes an alcohol LESS water-soluble?', ['shortening the chain', 'lengthening the chain', 'adding a second OH', 'nothing can'], 1, 'More grease, same ticket.', { 0: 'inverted', 2: 'inverted', 3: 'right-answer-wrong-reason' }),
    mcQ('Which has dipole attractions but NOT hydrogen bonding between its own molecules?', ['butan-1-ol', 'butanoic acid', 'butanal', 'butane'], 2, 'Polar C=O, no donor H.', { 0: 'adjacent-swap', 1: 'adjacent-swap', 3: 'adjacent-swap' }),
    mcQ('Same forces argument, different property: the most viscous is likely…', ['a small alkane', 'a diol with two hydrogen-bond donors', 'an ester', 'a gas'], 1, 'Grip resists flowing exactly as it resists boiling.', { 0: 'inverted', 2: 'adjacent-swap', 3: 'right-answer-wrong-reason' }),
    mcQ('Why does ethanoic acid dissolve in water AND boil high?', ['two unrelated accidents', 'the same O–H hydrogen bonds do both jobs', 'it is ionic', 'it is small'], 1, 'One structural fact, two properties.', { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }),
    mcQ('An unknown liquid mixes with water and boils at 78°. It is most likely…', ['hexane', 'ethanol', 'octane', 'ethane'], 1, 'Miscible plus that boiling point is the fingerprint of a small alcohol.', { 0: 'inverted', 2: 'inverted', 3: 'wrong-type' }),
    mcQ('Which is the acceptor-only oxygen?', ['the O–H of an alcohol', 'the C=O of a ketone', 'the O–H of an acid', 'there is none'], 1, 'It can receive a hydrogen bond but never donate one.', { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }),
    mcQ('Rank water solubility, highest first: ethanoic acid, ethyl ethanoate, octane.', ['acid > ester > octane', 'ester > acid > octane', 'octane > ester > acid', 'all equal'], 0, 'Donor, acceptor, neither.', { 1: 'adjacent-swap', 2: 'inverted', 3: 'right-answer-wrong-reason' }),
    mcQ('The single structural feature that most raises both boiling point and water solubility:', ['a longer chain', 'an O–H group', 'a halogen', 'a double bond'], 1, 'The donor does both.', { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }),
    mcQ('A branched alkane vs its straight isomer, in water:', ['branched dissolves well', 'straight dissolves well', 'neither dissolves appreciably', 'both dissolve fully'], 2, 'Branching moves boiling point; it buys no ticket into water.', { 0: 'right-answer-wrong-reason', 1: 'right-answer-wrong-reason', 3: 'inverted' }),
    mcQ('propan-1-ol and propan-2-ol have similar boiling points because…', ['they are the same compound', 'both carry one O–H donor on the same chain', 'neither hydrogen-bonds', 'both are branched'], 1, 'Position moves the number a little; the force is identical.', { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }),
    mcQ('Which boils higher: methyl propanoate or butanoic acid (isomers)?', ['the ester', 'the acid', 'equal — same formula', 'cannot say'], 1, 'Same formula is exactly why the O–H decides it.', { 0: 'inverted', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }),
    mcQ('Adding one CH₂ to an alcohol chain…', ['raises boiling point and lowers water solubility', 'lowers both', 'raises both', 'changes neither'], 0, 'More surface for the grip, more grease against the water.', { 1: 'inverted', 2: 'adjacent-swap', 3: 'right-answer-wrong-reason' }),
    mcQ('The forces broken when ethanol boils are…', ['O–H covalent bonds', 'hydrogen bonds and dispersion forces between molecules', 'C–C bonds', 'ionic bonds'], 1, 'Between, never within.', { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }),
    mcQ('Which liquid needs soap to wash off skin?', ['ethanol', 'propan-2-ol', 'hexane', 'ethanoic acid'], 2, 'The one water refuses.', { 0: 'inverted', 1: 'inverted', 3: 'inverted' }),
    mcQ('Ethyl ethanoate is used as nail-polish remover partly because it evaporates fast. Structurally that is…', ['its hydrogen bonding', 'its lack of an O–H donor, so weak intermolecular grip', 'its acidity', 'its mass'], 1,
      'No donor, low boiling, quick to leave the nail.',
      { 0: 'inverted', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }),
    mcQ('The whole properties thread in one sentence:', ['structure sets the forces between molecules, and those forces set the properties', 'mass sets everything', 'branching sets everything', 'properties are memorised'], 0, 'Structure → forces → property. The arrow the marks follow.', { 1: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' })
  ),
};

// ─────────────────────────────────────────────────────────────
// R7 · Nitrogen reactions (stage 6)
// ─────────────────────────────────────────────────────────────

const R7_L1 = {
  id: 'r07-l1',
  title: 'Making amines',
  teaches: ['reactions'],
  ask: 6,
  steps: [
    T(
      'Ammonia takes the halogen\u2019s place',
      'Heat a [[haloalkane]] with excess ammonia and the nitrogen substitutes in where the halogen was: an [[amine]] forms, and the displaced pieces leave as an ammonium salt.\n\nThe same move as hydroxide making an alcohol — a nucleophile trades places with the halogen — with nitrogen making the swap this time.',
      { rxn: AMINE_FROM_BROMO, caption: 'bromoethane + NH₃ → ethan-1-amine + NH₄Br. Excess ammonia keeps it to one swap.' }
    ),
    { type: 'question', q: classifyReaction(AMINE_FROM_BROMO, { seed: 801, explain: 'A group traded on a saturated carbon: substitution, nitrogen edition.' }) },
  ],
  pool: pool(
    predictProductName(AMINE_FROM_BROMO, ['ethanamide', 'ethanol', 'ethan-1-ol'], {
      seed: 811, explain: 'NH₂ in, Br out: ethan-1-amine. Hydroxide would have given the alcohol; ammonia gives the amine.',
      errorClasses: { 1: 'wrong-family', 2: 'wrong-reagent', 3: 'wrong-reagent' },
    }),
    pickReagent(AMINE_FROM_BROMO, ['NaOH(aq)', 'HBr (conc.)', 'H₂ / Ni'], {
      seed: 812, explain: 'Ammonia, in excess, with heat. Hydroxide makes the alcohol instead — same move, different nucleophile.',
      errorClasses: { 1: 'wrong-reagent', 2: 'reversed', 3: 'wrong-type' },
    }),
    completeEquation(AMINE_FROM_BROMO, ['HBr', 'H₂O', 'NaBr'], {
      seed: 813, explain: 'The bromine leaves in the ammonium salt: NH₄Br.',
    }),
    classifyCarbon('ethan-1-amine', 1, { seed: 814, explain: 'The nitrogen sits on a primary carbon — the amine landed exactly where the bromine was.' }),
    nameProduct(AMINE_FROM_BROMO, { hint: 'Two carbons, the amine suffix with its locant.' }),
    mcQ('Why excess ammonia?', ['ammonia is cheap', 'to keep the product amine from substituting again', 'to neutralise the haloalkane', 'no reason'], 1,
      'The amine formed is itself a nucleophile; swamping it with NH₃ keeps the swap to one.',
      { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }, { chip: 'PICK THE REAGENT', category: 'pick-reagent' })
  ),
};

const R7_L2 = {
  id: 'r07-l2',
  title: 'The amide link',
  teaches: ['reactions'],
  ask: 6,
  steps: [
    T(
      'Acid meets amine, water leaves',
      'A [[carboxylic acid]] and an amine condense on heating: the nitrogen bonds to the carbonyl carbon, water is expelled, and the C(=O)–N link that remains is an [[amide]].\n\nYou named amides in the last unit; this is where they come from. And this exact link, made between amino acids, is the peptide bond that holds every protein together.',
      { rxn: AMIDE_COND, caption: 'ethanoic acid + methanamine → N-methylethanamide + water. The link in the middle is the one proteins run on.' }
    ),
    { type: 'question', q: classifyReaction(AMIDE_COND, { seed: 821, explain: 'Two molecules joined, water out: condensation — the ester\u2019s twin, with nitrogen.' }) },
  ],
  pool: pool(
    predictProductName(AMIDE_COND, ['methyl ethanoate', 'ethan-1-amine', 'ethanamide'], {
      seed: 831, explain: 'The amine\u2019s methyl ends up on the nitrogen: N-methylethanamide. The ester is what an ALCOHOL would have given.',
      errorClasses: { 1: 'confused-ester', 2: 'reversed', 3: 'wrong-position' },
    }),
    pickReagent(AMIDE_COND, ['H₂O / H⁺', 'Cr₂O₇²⁻ / H⁺', 'NaOH(aq)'], {
      seed: 832, explain: 'Heat alone drives the condensation. Dilute acid with water runs it backwards.',
      errorClasses: { 1: 'reversed', 2: 'wrong-type', 3: 'wrong-reagent' },
    }),
    completeEquation(AMIDE_COND, ['H₂', 'CO₂', 'NH₄Br'], {
      seed: 833, explain: 'Condensation expels water, whichever family is doing the joining.',
    }),
    classifyReaction(ESTER_LINK_REVIEW(), { seed: 834, explain: 'The oxygen twin of the same move: condensation.' }),
    nameProduct(AMIDE_COND, { hint: 'N- names the group on the nitrogen; the acid gives the -amide stem.' }),
    mcQ('Esterification and amide formation share…', ['a reagent', 'the pattern: join two molecules, expel water', 'a product', 'nothing'], 1,
      'Same condensation, different nucleophile: O–H versus N–H.',
      { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' })
  ),
};

const R7_L3 = {
  id: 'r07-l3',
  title: 'Amides come apart in water',
  teaches: ['reactions'],
  ask: 5,
  steps: [
    T(
      'Hydrolysis, nitrogen edition',
      'Reflux an [[amide]] with dilute acid and water splits the C–N link: the carboxylic acid returns, and the amine with it.\n\nEsters and amides now sit in complete symmetry: both made by condensation, both unmade by hydrolysis — and digesting protein is exactly this reaction, run on peptide bonds by enzymes instead of acid.',
      { rxn: AMIDE_HYD, caption: 'N-methylethanamide + water → ethanoic acid + methanamine. Digestion, in a flask.' }
    ),
    { type: 'question', q: classifyReaction(AMIDE_HYD, { seed: 841, explain: 'Water in, one molecule becomes two: hydrolysis.' }) },
  ],
  pool: pool(
    predictProductName(AMIDE_HYD, ['ethanamide', 'N-methylethanamide', 'ethanal'], {
      seed: 851, explain: 'The acid half returns: ethanoic acid, with methanamine beside it.',
      errorClasses: { 1: 'reversed', 2: 'wrong-position', 3: 'wrong-type' },
    }),
    pickReagent(AMIDE_HYD, ['heat', 'MnO₄⁻ / H⁺', 'NH₃'], {
      seed: 852, explain: 'Water with dilute acid, at reflux. Heat alone is the FORWARD direction\u2019s driver.',
      errorClasses: { 1: 'reversed', 2: 'wrong-type', 3: 'wrong-reagent' },
    }),
    completeEquation(AMIDE_HYD, ['H₂O', 'NH₄Br', 'CO₂'], {
      seed: 853, explain: 'The nitrogen leaves as the amine it originally was: methanamine.',
    }),
    classifyReaction(AMIDE_COND, { seed: 854, explain: 'The forward twin: condensation.' }),
    mcQ('Digesting protein is chemically…', ['oxidation of amides', 'hydrolysis of amide (peptide) links', 'condensation of amino acids', 'combustion'], 1,
      'Enzymes run the same reaction this lesson runs with acid.',
      { 0: 'wrong-type', 2: 'reversed', 3: 'wrong-type' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' })
  ),
};

// esterification review card without re-importing across files
function ESTER_LINK_REVIEW() {
  return RXN({
    type: 'condensation',
    from: 'ethanoic acid',
    with: 'ethanol',
    reagent: 'H₂SO₄ (conc.)',
    conditions: 'reflux',
    to: 'ethyl ethanoate',
    also: { right: ['H₂O'] },
  });
}

const R7_CP = {
  id: 'r07-cp',
  title: 'Checkpoint: nitrogen',
  teaches: ['reactions'],
  checkpoint: true,
  ask: 15,
  steps: [],
  pool: pool(
    predictProductName(AMINE_FROM_BROMO, ['ethanol', 'ethanamide', 'N-methylethanamide'], {
      seed: 861, explain: 'Ammonia substitutes: ethan-1-amine.',
      errorClasses: { 1: 'wrong-reagent', 2: 'wrong-family', 3: 'wrong-family' },
    }),
    predictProductName(AMIDE_COND, ['ethyl ethanoate', 'ethanamide', 'methanamine'], {
      seed: 862, explain: 'Acid + amine, heated: the N-substituted amide.',
      errorClasses: { 1: 'confused-ester', 2: 'wrong-position', 3: 'reversed' },
    }),
    predictProductName(AMIDE_HYD, ['N-methylethanamide', 'ethanamide', 'ethanol'], {
      seed: 863, explain: 'Hydrolysis returns the acid (and the amine).',
      errorClasses: { 1: 'reversed', 2: 'wrong-position', 3: 'wrong-family' },
    }),
    pickReagent(AMINE_FROM_BROMO, ['NaOH(aq)', 'H₂O / H⁺', 'Cr₂O₇²⁻ / H⁺'], {
      seed: 871, explain: 'Excess ammonia with heat.',
      errorClasses: { 1: 'wrong-reagent', 2: 'wrong-reagent', 3: 'wrong-type' },
    }),
    pickReagent(AMIDE_COND, ['H₂O / H⁺', 'NH₃', 'H₂ / Ni'], {
      seed: 872, explain: 'Heat drives the condensation; dilute acid would undo it.',
      errorClasses: { 1: 'reversed', 2: 'wrong-reagent', 3: 'wrong-type' },
    }),
    pickReagent(AMIDE_HYD, ['heat', 'NaOH(aq)', 'H₂ / Ni'], {
      seed: 873, explain: 'Water and dilute acid at reflux.',
      errorClasses: { 1: 'reversed', 2: 'wrong-reagent', 3: 'wrong-type' },
    }),
    classifyReaction(AMINE_FROM_BROMO, { seed: 881, explain: 'Substitution.' }),
    classifyReaction(AMIDE_COND, { seed: 882, explain: 'Condensation.' }),
    classifyReaction(AMIDE_HYD, { seed: 883, explain: 'Hydrolysis.' }),
    completeEquation(AMIDE_COND, ['NH₄Br', 'H₂', 'HBr'], { seed: 884, explain: 'Water out, as in every condensation.' }),
    completeEquation(AMINE_FROM_BROMO, ['H₂O', 'HBr', 'NaBr'], { seed: 885, explain: 'NH₄Br carries the bromine away.' }),
    nameProduct(AMINE_FROM_BROMO, { hint: 'amine suffix, locant 1.' }),
    nameProduct(AMIDE_HYD, { hint: 'The acid half of the old amide.' }),
    nameProduct(AMIDE_COND, { hint: 'N-methyl, then the acid\u2019s stem as -amide.' }),
    drawProduct(AMINE_FROM_BROMO, { hint: 'Two carbons, NH₂ on carbon 1.' }),
    classifyCarbon('propan-1-amine', 1, { seed: 886, explain: 'Primary carbon under the nitrogen.' }),
    mcQ('The peptide bond of proteins is…', ['an ester link', 'an amide link between amino acids', 'a hydrogen bond', 'an ionic bond'], 1,
      'The same C(=O)–N this unit builds and breaks.',
      { 0: 'confused-ester', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    mcQ('Hydroxide vs ammonia on bromoethane: the difference is…', ['reaction type', 'which nucleophile substitutes in — O gives alcohol, N gives amine', 'temperature only', 'no difference'], 1,
      'One move, two nucleophiles, two families.',
      { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    mcQ('Amide vs ester hydrolysis differ in…', ['the reagent needed', 'the link broken — C–N versus C–O — with the same water-in pattern', 'one is condensation', 'amides cannot hydrolyse'], 1,
      'Twins throughout.',
      { 0: 'right-answer-wrong-reason', 2: 'confused-hydrolysis', 3: 'wrong-type' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    mcQ('Which molecule can form an amide with ethanoic acid?', ['ethanol', 'methanamine', 'ethane', 'ethyl ethanoate'], 1,
      'An N–H to donate into the link.',
      { 0: 'confused-ester', 2: 'wrong-type', 3: 'wrong-family' }, { chip: 'PICK THE REAGENT', category: 'pick-reagent' }),
    predictProduct(AMINE_FROM_BROMO, ['ethanol', 'ethanamide', 'bromoethane'], {
      seed: 887, explain: 'The NH₂ takes the bromine\u2019s carbon: ethan-1-amine.',
      errorClasses: { 1: 'wrong-reagent', 2: 'wrong-family', 3: 'reversed' },
    }),
    predictProduct(AMIDE_HYD, ['N-methylethanamide', 'ethan-1-amine', 'ethanamide'], {
      seed: 888, explain: 'The acid returns: ethanoic acid.',
      errorClasses: { 1: 'wrong-family', 2: 'reversed', 3: 'wrong-position' },
    }),
    classifyCarbon('ethan-1-amine', 1, { seed: 889, explain: 'Primary carbon under the nitrogen.' }),
    drawProduct(AMIDE_HYD, { hint: 'Two carbons, COOH.' }),
    completeEquation(AMIDE_HYD, ['NH₄Br', 'H₂O', 'H₂'], { seed: 890, explain: 'The nitrogen leaves as methanamine.' }),
    mcQ('Amine, amide: which suffix pairs with which family?', ['-amine for C(=O)N, -amide for C–NH₂', '-amine for C–NH₂, -amide for C(=O)N', 'both -amine', 'both -amide'], 1,
      'The carbonyl is what makes it an amide.',
      { 0: 'inverted', 2: 'wrong-family', 3: 'wrong-family' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    mcQ('Heating ethanoic acid with ethan-1-amine gives…', ['N-ethylethanamide', 'ethyl ethanoate', 'ethanamide', 'no reaction'], 0,
      'The amine\u2019s ethyl lands on the nitrogen: N-ethylethanamide.',
      { 1: 'confused-ester', 2: 'wrong-position', 3: 'wrong-type' }, { chip: 'PREDICT THE PRODUCT', category: 'predict-product' }),
    mcQ('Which reagent turns bromoethane into ethan-1-amine?', ['NaOH(aq)', 'excess NH₃, heat', 'HBr', 'MnO₄⁻ / H⁺'], 1,
      'Nitrogen\u2019s nucleophile makes nitrogen\u2019s family.',
      { 0: 'wrong-reagent', 2: 'reversed', 3: 'wrong-type' }, { chip: 'PICK THE REAGENT', category: 'pick-reagent' }),
    mcQ('Amide hydrolysis needs harsher conditions than ester hydrolysis because…', ['the C–N link is the stronger, more stable one', 'amides are insoluble', 'water avoids nitrogen', 'it does not'], 0,
      'The peptide bond\u2019s stability is why proteins need enzymes to digest.',
      { 1: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'wrong-type' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    mcQ('The nitrogen thread\u2019s symmetry with oxygen: amine is to alcohol as amide is to…', ['ester', 'ketone', 'acid', 'alkane'], 0,
      'Substituted nucleophile, condensed link — the same two roles.',
      { 1: 'wrong-family', 2: 'wrong-family', 3: 'wrong-family' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' })
  ),
};

// ─────────────────────────────────────────────────────────────
// R9 · Polymers (stage 7)
// ─────────────────────────────────────────────────────────────

const R9_L1 = {
  id: 'r09-l1',
  title: 'Addition polymers',
  teaches: ['reactions'],
  ask: 5,
  steps: [
    T(
      'Thousands of additions in a row',
      'Open an [[alkene]]\u2019s double bond and let it add to a second alkene, and another, and the additions never need to stop: the result is a chain thousands of carbons long. Poly(ethene) — polythene — is ethene added to itself.\n\nNo small molecule leaves. The polymer contains every atom of every monomer, which is the fingerprint of addition polymerisation.',
      { mol: molOf('ethene'), caption: 'The monomer. The polymer is this, opened and repeated n times: –CH₂–CH₂– along a chain with nothing lost.' }
    ),
    T(
      'Reading a repeat unit',
      'To find the monomer, find the repeat unit — the two-carbon slice that recurs — and close its bond back into a double bond.\n\nPoly(chloroethene), PVC, repeats –CH₂–CHCl–: close it up and the monomer is chloroethene. The side groups hang off the chain unchanged, which is how one mechanism gives plastics as different as cling film and pipes.',
      { mol: molOf('1-chloroethene'), caption: 'chloroethene: open the double bond, repeat, and it is PVC.' }
    ),
    {
      type: 'question',
      q: mcQ('Poly(propene) is made from…', ['propane', 'propene', 'propan-1-ol', 'propyne'], 1,
        'Only a double bond can open and chain: the alkene is the monomer.',
        { 0: 'wrong-family', 2: 'wrong-family', 3: 'wrong-family' },
        { chip: 'PREDICT THE PRODUCT', category: 'predict-product', mol: molOf('propene') }),
    },
  ],
  pool: pool(
    mcQ('Addition polymerisation requires monomers with…', ['an OH group', 'a C=C double bond', 'a halogen', 'nitrogen'], 1,
      'The opening double bond is the whole mechanism.',
      { 0: 'wrong-family', 2: 'right-answer-wrong-reason', 3: 'wrong-family' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    mcQ('During addition polymerisation, the small molecule released is…', ['water', 'HCl', 'nothing — every atom stays', 'CO₂'], 2,
      'Addition keeps everything; that is what makes it addition.',
      { 0: 'confused-condensation', 1: 'confused-condensation', 3: 'wrong-type' }, { chip: 'BALANCE THE BOOKS', category: 'complete-equation' }),
    mcQ('The repeat unit –CH₂–CHCl– came from the monomer…', ['chloroethane', 'chloroethene', '1,2-dichloroethene', 'ethene'], 1,
      'Close the repeat unit\u2019s spare bonds into a double bond: chloroethene.',
      { 0: 'wrong-family', 2: 'wrong-position', 3: 'wrong-reagent' }, { chip: 'PREDICT THE PRODUCT', category: 'predict-product', mol: molOf('1-chloroethene') }),
    mcQ('Poly(ethene) and the ethene it came from differ in…', ['elements present', 'the double bond, now opened into chain links', 'carbon count per repeat unit', 'nothing'], 1,
      'Same atoms, new connectivity.',
      { 0: 'unbalanced', 2: 'unbalanced', 3: 'right-answer-wrong-reason' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    mcQ('Which CANNOT form an addition polymer?', ['ethene', 'propene', 'chloroethene', 'ethane'], 3,
      'No double bond, nothing to open.',
      { 0: 'inverted', 1: 'inverted', 2: 'inverted' }, { chip: 'PICK THE REAGENT', category: 'pick-reagent', mol: molOf('ethane') })
  ),
};

const R9_L2 = {
  id: 'r09-l2',
  title: 'Condensation polymers',
  teaches: ['reactions'],
  ask: 5,
  steps: [
    T(
      'The ester link, repeated',
      'Give a molecule an acid group at each end, its partner an OH at each end, and every join leaves both ends still able to join again: ester links form down the whole chain, one water out per link. A polyester.\n\nThis is esterification from R5, industrialised — the same condensation, made endless by having two reactive ends per monomer.',
      { mol: molOf('hexanedioic acid'), caption: 'A diacid: an acid group at each end is what lets the chain keep growing.' }
    ),
    T(
      'And the amide link makes nylon — and you',
      'Swap the diol for a diamine and the links are amides instead: a polyamide — nylon. Proteins are the same idea built by cells: amino acids carry an acid end AND an amine end on the one molecule, so each is its own two-ended monomer.\n\nCondensation polymers announce themselves in the count: n monomer pairs, (2n−1) waters gone.',
      { mol: molOf('ethane-1,2-diol'), caption: 'The diol: an OH at each end, ready to ester-link in both directions.' }
    ),
    {
      type: 'question',
      q: mcQ('A polyester forms from a diacid and a diol. Each link expels…', ['nothing', 'one water molecule', 'one CO₂', 'one HCl'], 1,
        'Condensation, per link — which is how the two polymer families are told apart.',
        { 0: 'confused-addition', 2: 'wrong-type', 3: 'wrong-type' },
        { chip: 'BALANCE THE BOOKS', category: 'complete-equation' }),
    },
  ],
  pool: pool(
    mcQ('Condensation polymerisation needs monomers with…', ['one double bond', 'two reactive ends each', 'no functional groups', 'a benzene ring'], 1,
      'Two ends per monomer is what keeps the chain able to grow.',
      { 0: 'confused-addition', 2: 'wrong-family', 3: 'right-answer-wrong-reason' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    mcQ('Nylon\u2019s links are…', ['ester links', 'amide links', 'ether links', 'double bonds'], 1,
      'Diacid + diamine: the amide, repeated.',
      { 0: 'confused-ester', 2: 'wrong-family', 3: 'confused-addition' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    mcQ('Proteins are condensation polymers of…', ['glucose', 'amino acids', 'alkenes', 'esters'], 1,
      'Each amino acid carries both ends itself.',
      { 0: 'wrong-family', 2: 'confused-addition', 3: 'wrong-family' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    mcQ('How do you tell an addition polymer from a condensation polymer chemically?', ['colour', 'condensation lost a small molecule per link; addition kept every atom', 'addition polymers are stronger', 'you cannot'], 1,
      'The bookkeeping is the fingerprint.',
      { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }, { chip: 'BALANCE THE BOOKS', category: 'complete-equation' }),
    mcQ('Which pair could form a polyester?', ['hexanedioic acid + ethane-1,2-diol', 'ethene + propene', 'ethanol + ethanol', 'hexane + water'], 0,
      'Two acid ends meet two alcohol ends: links in both directions.',
      { 1: 'confused-addition', 2: 'wrong-family', 3: 'wrong-type' }, { chip: 'PICK THE REAGENT', category: 'pick-reagent' })
  ),
};

const R9_L3 = {
  id: 'r09-l3',
  title: 'From polymer back to monomer',
  teaches: ['reactions'],
  ask: 5,
  steps: [
    T(
      'Running the count backwards',
      'Given a polymer section, the questions run in reverse: find the repeat unit, name the monomer(s), say which mechanism built it — and the mechanism is read straight off the links.\n\nChain of C–C with side groups and no oxygen or nitrogen in the backbone: addition, monomer had a double bond. Ester or amide links in the backbone: condensation, monomers had two ends, water left.',
      { mol: molOf('propene'), caption: 'A –CH₂–CH(CH₃)– repeat unit closes back up into propene.' }
    ),
    {
      type: 'question',
      q: mcQ('A polymer\u2019s backbone contains regular ester links. It was made by…', ['addition of an alkene', 'condensation of a diacid with a diol', 'oxidation', 'substitution'], 1,
        'The link IS the mechanism\u2019s signature.',
        { 0: 'confused-addition', 2: 'wrong-type', 3: 'wrong-type' },
        { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    },
  ],
  pool: pool(
    mcQ('Repeat unit –CH₂–CH(CH₃)–: the monomer is…', ['propane', 'propene', 'but-1-ene', 'methylpropene'], 1,
      'Three carbons, close the spare bonds: propene.',
      { 0: 'wrong-family', 2: 'unbalanced', 3: 'wrong-position' }, { chip: 'PREDICT THE PRODUCT', category: 'predict-product', mol: molOf('propene') }),
    mcQ('A backbone of only carbons, chlorine side groups every second carbon:', ['polyester from a chlorodiol', 'addition polymer of chloroethene', 'polyamide', 'not a polymer'], 1,
      'All-carbon backbone says addition; the side group names the monomer.',
      { 0: 'confused-condensation', 2: 'wrong-family', 3: 'wrong-type' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction', mol: molOf('1-chloroethene') }),
    mcQ('Amide links in the backbone mean the monomers were…', ['dienes', 'a diacid and a diamine (or amino acids)', 'two alcohols', 'alkynes'], 1,
      'N in the backbone is condensation\u2019s nitrogen signature.',
      { 0: 'confused-addition', 2: 'wrong-family', 3: 'confused-addition' }, { chip: 'PREDICT THE PRODUCT', category: 'predict-product' }),
    mcQ('Hydrolysing a polyester would return…', ['the alkene monomer', 'the diacid and the diol', 'CO₂ and water', 'nothing — polyesters cannot hydrolyse'], 1,
      'Every link made by losing water can be unmade by adding it — R5\u2019s rule, chain-length notwithstanding.',
      { 0: 'confused-addition', 2: 'wrong-type', 3: 'wrong-type' }, { chip: 'PREDICT THE PRODUCT', category: 'predict-product' }),
    mcQ('Which polymer resists hydrolysis entirely?', ['a polyester', 'a polyamide', 'poly(ethene)', 'a protein'], 2,
      'No link that water can attack: the addition polymer\u2019s C–C backbone is water-proof chemistry.',
      { 0: 'inverted', 1: 'inverted', 3: 'inverted' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' })
  ),
};

const R9_CP = {
  id: 'r09-cp',
  title: 'Checkpoint: polymers',
  teaches: ['reactions'],
  checkpoint: true,
  ask: 15,
  steps: [],
  pool: pool(
    mcQ('Poly(ethene) is built by…', ['condensation', 'addition', 'substitution', 'oxidation'], 1, 'Double bonds opening into a chain.', { 0: 'confused-condensation', 2: 'wrong-type', 3: 'wrong-type' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    mcQ('A polyester is built by…', ['addition', 'condensation', 'combustion', 'hydrolysis'], 1, 'Ester links, water out per link.', { 0: 'confused-addition', 2: 'wrong-type', 3: 'reversed' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    mcQ('The monomer of PVC (–CH₂–CHCl– repeating):', ['chloroethane', 'chloroethene', 'ethene', '1,1-dichloroethene'], 1, 'Close the repeat unit into its double bond.', { 0: 'wrong-family', 2: 'wrong-reagent', 3: 'wrong-position' }, { chip: 'PREDICT THE PRODUCT', category: 'predict-product', mol: molOf('1-chloroethene') }),
    mcQ('The monomer of poly(propene):', ['propane', 'propan-1-ol', 'propene', 'propyne'], 2, 'The alkene.', { 0: 'wrong-family', 1: 'wrong-family', 3: 'wrong-family' }, { chip: 'PREDICT THE PRODUCT', category: 'predict-product', mol: molOf('propene') }),
    mcQ('Addition polymerisation releases…', ['water per link', 'HCl per link', 'nothing', 'CO₂'], 2, 'Every atom of every monomer stays.', { 0: 'confused-condensation', 1: 'confused-condensation', 3: 'wrong-type' }, { chip: 'BALANCE THE BOOKS', category: 'complete-equation' }),
    mcQ('Condensation polymerisation of n diacid + n diol molecules releases about…', ['no small molecules', 'one water in total', 'a water per link formed', 'n CO₂'], 2, 'The count is the fingerprint.', { 0: 'confused-addition', 1: 'unbalanced', 3: 'wrong-type' }, { chip: 'BALANCE THE BOOKS', category: 'complete-equation' }),
    mcQ('Monomers for nylon:', ['diacid + diol', 'diacid + diamine', 'two alkenes', 'ester + water'], 1, 'The amide needs the nitrogen end.', { 0: 'confused-ester', 2: 'confused-addition', 3: 'wrong-type' }, { chip: 'PICK THE REAGENT', category: 'pick-reagent' }),
    mcQ('Monomers for a polyester:', ['diacid + diamine', 'diacid + diol', 'alkene + water', 'two amines'], 1, 'Acid ends meet alcohol ends.', { 0: 'confused-hydrolysis', 2: 'confused-addition', 3: 'wrong-family' }, { chip: 'PICK THE REAGENT', category: 'pick-reagent' }),
    mcQ('Proteins are…', ['addition polymers', 'polyamides of amino acids', 'polyesters', 'not polymers'], 1, 'The peptide bond is an amide link.', { 0: 'confused-addition', 2: 'confused-ester', 3: 'wrong-type' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    mcQ('Why can one amino acid polymerise by itself?', ['it has a double bond', 'it carries both an acid end and an amine end', 'it is small', 'it cannot'], 1, 'Both ends on the one molecule.', { 0: 'confused-addition', 2: 'right-answer-wrong-reason', 3: 'wrong-type' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    mcQ('An all-carbon backbone with methyl side groups is…', ['a polyester', 'poly(propene)', 'nylon', 'a protein'], 1, 'Addition\u2019s signature backbone; the side group names it.', { 0: 'confused-condensation', 2: 'wrong-family', 3: 'wrong-family' }, { chip: 'PREDICT THE PRODUCT', category: 'predict-product' }),
    mcQ('Which polymer will acid hydrolysis break down?', ['poly(ethene)', 'poly(propene)', 'a polyamide', 'PVC'], 2, 'Only backbones with C–O or C–N links give water something to attack.', { 0: 'inverted', 1: 'inverted', 3: 'inverted' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    mcQ('The repeat unit of poly(chloroethene) contains…', ['one carbon', 'two carbons and one chlorine', 'two chlorines', 'oxygen'], 1, 'The monomer, opened: –CH₂–CHCl–.', { 0: 'unbalanced', 2: 'unbalanced', 3: 'wrong-family' }, { chip: 'PREDICT THE PRODUCT', category: 'predict-product', mol: molOf('1-chloroethene') }),
    mcQ('Ester link, amide link, C–C chain: which pairing is right?', ['polyester, polyamide, addition polymer', 'addition, polyester, polyamide', 'polyamide, polyester, addition', 'all interchangeable'], 0, 'The link is the label.', { 1: 'adjacent-swap', 2: 'adjacent-swap', 3: 'right-answer-wrong-reason' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    mcQ('Cling film (polyethene) survives vinegar because…', ['it is thick', 'its C–C backbone offers hydrolysis nothing to attack', 'vinegar is weak', 'polymers never react'], 1, 'Chemistry, not thickness.', { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    mcQ('Which monomer makes an addition polymer with no side groups at all?', ['propene', 'chloroethene', 'ethene', 'but-1-ene'], 2, 'Nothing hangs off –CH₂–CH₂–.', { 0: 'adjacent-swap', 1: 'adjacent-swap', 3: 'adjacent-swap' }, { chip: 'PREDICT THE PRODUCT', category: 'predict-product', mol: molOf('ethene') }),
    mcQ('n = 5000 ethene molecules polymerise. Atoms lost:', ['5000 waters', 'about 10000 hydrogens', 'none', 'one per link'], 2, 'Addition keeps the lot.', { 0: 'confused-condensation', 1: 'unbalanced', 3: 'confused-condensation' }, { chip: 'BALANCE THE BOOKS', category: 'complete-equation' }),
    mcQ('The condensation-polymer idea generalises esterification by…', ['using a catalyst', 'giving every monomer two reactive ends', 'removing the water', 'heating harder'], 1, 'Two ends is the whole trick.', { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    mcQ('Digesting dietary protein returns…', ['glucose', 'amino acids', 'fatty acids', 'alkenes'], 1, 'Hydrolysis of the amide links, all the way down.', { 0: 'wrong-family', 2: 'wrong-family', 3: 'wrong-family' }, { chip: 'PREDICT THE PRODUCT', category: 'predict-product' }),
    mcQ('Which question identifies the mechanism fastest, given a polymer structure?', ['what colour is it', 'does the backbone contain O or N links', 'how long is the chain', 'is it recyclable'], 1, 'Backbone links are the signature.', { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    mcQ('hexanedioic acid + ethane-1,2-diol polymerise. The polymer\u2019s backbone repeats…', ['amide links', 'ester links', 'double bonds', 'C–C only'], 1, 'Acid meets alcohol: ester, down the chain.', { 0: 'wrong-family', 2: 'confused-addition', 3: 'confused-addition' }, { chip: 'PREDICT THE PRODUCT', category: 'predict-product', mol: molOf('hexanedioic acid') }),
    mcQ('Poly(ethene) vs a polyester in a landfill:', ['both hydrolyse away', 'the polyester\u2019s links can hydrolyse; the polyethene persists', 'the polyethene hydrolyses first', 'neither ever changes'], 1, 'The link that can be unmade is the one that eventually is.', { 0: 'inverted', 2: 'inverted', 3: 'right-answer-wrong-reason' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    mcQ('Which is NOT a condensation polymer?', ['nylon', 'a polyester', 'protein', 'poly(propene)'], 3, 'All-carbon backbone: addition.', { 0: 'inverted', 1: 'inverted', 2: 'inverted' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    mcQ('The two-ends requirement exists because…', ['one-ended molecules are unreactive', 'a chain can only keep growing if every join leaves a free end', 'catalysts need two ends', 'water demands it'], 1, 'End-capped means finished.', { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    classifyReaction(ESTER_LINK_REVIEW(), { seed: 891, explain: 'One ester link, the polymer\u2019s unit move: condensation.' }),
    mcQ('Repeat unit –CH₂–CH(OH)– would come from the monomer…', ['ethenol (vinyl alcohol)', 'ethanol', 'ethene', 'ethanal'], 0, 'Close the bond: the OH rides on the alkene carbon.', { 1: 'wrong-family', 2: 'unbalanced', 3: 'wrong-family' }, { chip: 'PREDICT THE PRODUCT', category: 'predict-product' }),
    mcQ('Which everyday item is a polyamide?', ['plastic bag', 'nylon rope', 'PVC pipe', 'cling film'], 1, 'The name says it.', { 0: 'wrong-family', 2: 'wrong-family', 3: 'wrong-family' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    mcQ('A student calls poly(ethene) a condensation polymer "because it forms under pressure". The error:', ['polyethene is not a polymer', 'condensation refers to expelling a small molecule, not to pressure', 'pressure is never used', 'no error'], 1, 'The word names the chemistry, not the conditions.', { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    mcQ('One glucose has five OH groups and an aldehyde. Cellulose (its polymer) is built by…', ['addition', 'condensation, water out per link', 'combustion', 'substitution'], 1, 'Nature runs the same two mechanisms; this is the condensation one.', { 0: 'confused-addition', 2: 'wrong-type', 3: 'wrong-type' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    mcQ('The deepest link between R5 and this unit:', ['both use sulfuric acid', 'the ester and amide links of small molecules ARE the links of polyesters and polyamides', 'both involve alkenes', 'none'], 1, 'Polymers are the small chemistry, repeated.', { 0: 'right-answer-wrong-reason', 2: 'wrong-family', 3: 'right-answer-wrong-reason' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' })
  ),
};

// ─────────────────────────────────────────────────────────────
// R10 · Yield and atom economy (stage 10)
// ─────────────────────────────────────────────────────────────

// Computed figures, shown to one decimal — and recomputed by the suite.
const ae = (rxn) => atomEconomy(rxn).toFixed(1);
const AE_ESTER = ae(ESTER_LINK_REVIEW());
const AE_ADD = '100.0';

const R10_L1 = {
  id: 'r10-l1',
  title: 'Percentage yield',
  teaches: ['reactions'],
  ask: 5,
  steps: [
    T(
      'What you got over what was possible',
      'Stoichiometry promises a theoretical mass of product. The flask delivers less: transfers lose drops, equilibria stop short, side reactions steal material.\n\npercentage yield = actual mass ÷ theoretical mass × 100.\n\nA 62% yield of ester from 10.0 g theoretical means 6.2 g in hand. The arithmetic is easy; the marks are for keeping actual and theoretical straight.',
      { mol: molOf('ethyl ethanoate'), caption: 'Esterification is an equilibrium — one built-in reason real yields sit below 100%.' }
    ),
    {
      type: 'question',
      q: mcQ('Theoretical 8.0 g; collected 6.0 g. Percentage yield:', ['48%', '75%', '133%', '25%'], 1,
        '6.0 over 8.0: three quarters.',
        { 0: 'unbalanced', 2: 'inverted', 3: 'unbalanced' },
        { chip: 'BALANCE THE BOOKS', category: 'complete-equation' }),
    },
  ],
  pool: pool(
    mcQ('Collected 4.5 g against a theoretical 9.0 g:', ['50%', '45%', '200%', '90%'], 0, 'Half of what was possible.', { 1: 'unbalanced', 2: 'inverted', 3: 'unbalanced' }, { chip: 'BALANCE THE BOOKS', category: 'complete-equation' }),
    mcQ('A yield above 100% most likely means…', ['excellent technique', 'the product is wet or impure', 'the theory was wrong', 'a catalyst worked'], 1, 'You cannot collect more than the atoms allow — extra mass is something else in the sample.', { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    mcQ('Which does NOT lower a yield?', ['an equilibrium stopping short', 'losses in transfer', 'side reactions', 'using exactly stoichiometric amounts'], 3, 'Stoichiometric amounts are the baseline, not a loss.', { 0: 'inverted', 1: 'inverted', 2: 'inverted' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    mcQ('Theoretical yield is calculated from…', ['the actual mass', 'the limiting reactant and the equation', 'the catalyst', 'the temperature'], 1, 'The equation sets the ceiling; the limiting reactant sets which equation run.', { 0: 'inverted', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }, { chip: 'BALANCE THE BOOKS', category: 'complete-equation' }),
    mcQ('A 40% yield in step one and 50% in step two gives an overall…', ['90%', '45%', '20%', '10%'], 2, 'Yields multiply down a pathway: 0.4 × 0.5. The reason short routes win.', { 0: 'unbalanced', 1: 'unbalanced', 3: 'unbalanced' }, { chip: 'BALANCE THE BOOKS', category: 'complete-equation' })
  ),
};

const R10_L2 = {
  id: 'r10-l2',
  title: 'Atom economy',
  teaches: ['reactions'],
  ask: 5,
  steps: [
    T(
      'How much of the equation is product',
      'Yield judges the experiment; atom economy judges the reaction itself:\n\natom economy = mass of desired product ÷ total mass of all products × 100.\n\nAddition reactions score 100% — every atom that reacts ends up in the product. Condensations give away a water per join. A substitution hands a whole salt to the waste stream. Green chemistry is largely the habit of choosing high-economy routes.',
      { rxn: ADD_ETHENE_H2, caption: 'Addition: nothing wasted, 100% by construction.' }
    ),
    {
      type: 'question',
      q: mcQ(`Esterification of ethanoic acid with ethanol: the atom economy is ${AE_ESTER}%. The missing mass is…`,
        ['unreacted acid', 'the water expelled by the condensation', 'the sulfuric acid', 'measurement error'], 1,
        'The one water per join is the only atom cost — and it is the reaction\u2019s cost, not the experimenter\u2019s.',
        { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' },
        { chip: 'BALANCE THE BOOKS', category: 'complete-equation' }),
    },
  ],
  pool: pool(
    mcQ('Which reaction type has 100% atom economy by construction?', ['substitution', 'condensation', 'addition', 'combustion'], 2, 'Everything that reacts is kept.', { 0: 'adjacent-swap', 1: 'adjacent-swap', 3: 'wrong-type' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    mcQ(`Hydrogenating ethene to ethane has an atom economy of…`, ['50%', `${AE_ADD}%`, '88%', 'cannot be computed'], 1, 'Both reactants end up entirely in the one product.', { 0: 'unbalanced', 2: 'unbalanced', 3: 'right-answer-wrong-reason' }, { chip: 'BALANCE THE BOOKS', category: 'complete-equation' }),
    mcQ('Atom economy differs from yield in that…', ['they are the same', 'economy is a property of the equation; yield of the experiment', 'yield is always higher', 'economy includes catalysts'], 1, 'A perfect experimenter still cannot beat the equation.', { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    mcQ('To raise the atom economy of making a haloalkane you would…', ['improve technique', 'add HBr across an alkene instead of substituting an alcohol', 'use more solvent', 'raise temperature'], 1, 'Choose the addition route: no water expelled, no salt to bin.', { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }, { chip: 'PICK THE REAGENT', category: 'pick-reagent' }),
    mcQ('A route with high atom economy but 30% yield…', ['is green in principle, wasteful in practice — both numbers matter', 'is perfect', 'is impossible', 'wastes no atoms'], 0, 'The two numbers audit different things; a chemist wants both.', { 1: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' })
  ),
};

const R10_CP = {
  id: 'r10-cp',
  title: 'Checkpoint: the numbers',
  teaches: ['reactions'],
  checkpoint: true,
  ask: 15,
  steps: [],
  pool: pool(
    mcQ('Collected 3.0 g, theoretical 12.0 g:', ['400%', '25%', '36%', '9%'], 1, '3 over 12.', { 0: 'inverted', 2: 'unbalanced', 3: 'unbalanced' }, { chip: 'BALANCE THE BOOKS', category: 'complete-equation' }),
    mcQ('Collected 7.2 g, theoretical 9.0 g:', ['80%', '72%', '90%', '125%'], 0, '7.2 ÷ 9.0.', { 1: 'unbalanced', 2: 'unbalanced', 3: 'inverted' }, { chip: 'BALANCE THE BOOKS', category: 'complete-equation' }),
    mcQ('Theoretical 5.0 g at 64% yield gives…', ['0.64 g', '3.2 g', '6.4 g', '5.0 g'], 1, 'The fraction of the ceiling.', { 0: 'unbalanced', 2: 'unbalanced', 3: 'right-answer-wrong-reason' }, { chip: 'BALANCE THE BOOKS', category: 'complete-equation' }),
    mcQ('Two-step route, 80% then 75%: overall…', ['155%', '77.5%', '60%', '15%'], 2, 'Multiply: 0.8 × 0.75.', { 0: 'unbalanced', 1: 'unbalanced', 3: 'unbalanced' }, { chip: 'BALANCE THE BOOKS', category: 'complete-equation' }),
    mcQ('Which is a property of the equation, unchangeable by technique?', ['yield', 'atom economy', 'purity', 'losses'], 1, 'The equation\u2019s own bookkeeping.', { 0: 'inverted', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    mcQ('Addition reactions have 100% atom economy because…', ['they are fast', 'every reactant atom ends in the single product', 'they need catalysts', 'they are exothermic'], 1, 'One product, nothing expelled.', { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    mcQ(`The atom economy of esterification (${AE_ESTER}%) is below 100% because…`, ['yields are low', 'a water molecule leaves with every join', 'sulfuric acid is consumed', 'esters are volatile'], 1, 'The condensation\u2019s water is the whole gap.', { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }, { chip: 'BALANCE THE BOOKS', category: 'complete-equation' }),
    mcQ('Ranking atom economy, highest first: addition, condensation, substitution-with-salt:', ['addition > condensation > substitution', 'substitution > condensation > addition', 'condensation > addition > substitution', 'all 100%'], 0, 'Waste nothing, waste a water, waste a salt.', { 1: 'inverted', 2: 'adjacent-swap', 3: 'right-answer-wrong-reason' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    mcQ('A wet product weighed as-is inflates…', ['atom economy', 'the apparent yield', 'the theoretical mass', 'nothing'], 1, 'Extra mass that is not product.', { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }, { chip: 'BALANCE THE BOOKS', category: 'complete-equation' }),
    mcQ('The limiting reactant is the one…', ['present in the largest mass', 'that runs out first and caps the theoretical yield', 'with the highest molar mass', 'left over'], 1, 'It sets the ceiling everything is measured against.', { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'inverted' }, { chip: 'BALANCE THE BOOKS', category: 'complete-equation' }),
    mcQ('Green chemistry prefers addition routes chiefly for their…', ['speed', 'atom economy', 'colour', 'cost of catalysts'], 1, 'Waste designed out at the equation.', { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    mcQ('Which improves YIELD but not atom economy?', ['choosing an addition route', 'more careful transfers and drying', 'a different equation', 'expelling less water'], 1, 'Technique moves yield; only the equation moves economy.', { 0: 'inverted', 2: 'inverted', 3: 'inverted' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    mcQ('An equilibrium esterification stops at 66% conversion. That limits…', ['atom economy', 'the practical yield', 'the molar masses', 'the equation'], 1, 'The equation\u2019s ceiling stands; the flask stops below it.', { 0: 'inverted', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }, { chip: 'BALANCE THE BOOKS', category: 'complete-equation' }),
    mcQ('Why do longer pathways usually deliver less product?', ['atoms decay', 'yields multiply below 100% at every step', 'atom economy falls to zero', 'no reason'], 1, 'Three steps of 80% is already half gone.', { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }, { chip: 'BALANCE THE BOOKS', category: 'complete-equation' }),
    mcQ('The pair of numbers a route is judged by:', ['mass and volume', 'yield and atom economy', 'temperature and pressure', 'cost and colour'], 1, 'The experiment\u2019s number and the equation\u2019s number.', { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    mcQ('Collected 2.5 g, theoretical 2.5 g, product dry and pure:', ['100% yield — possible with care on a favourable reaction', 'impossible', '250%', 'atom economy must be 100% too'], 0, 'Rare, not forbidden.', { 1: 'right-answer-wrong-reason', 2: 'unbalanced', 3: 'right-answer-wrong-reason' }, { chip: 'BALANCE THE BOOKS', category: 'complete-equation' }),
    mcQ('Making bromoethane: ethene + HBr versus ethanol + HBr (water expelled). The greener equation is…', ['the ethanol route', 'the ethene route', 'both equal', 'neither works'], 1, 'The addition wastes nothing; the substitution posts a water to the bin.', { 0: 'inverted', 2: 'right-answer-wrong-reason', 3: 'wrong-type' }, { chip: 'PICK THE REAGENT', category: 'pick-reagent' }),
    mcQ('Atom economy uses…', ['measured masses from the flask', 'molar masses from the balanced equation', 'temperatures', 'reaction times'], 1, 'Pure bookkeeping — which is why the app can verify every figure it shows.', { 0: 'inverted', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }, { chip: 'BALANCE THE BOOKS', category: 'complete-equation' }),
    mcQ('If the desired product is the SMALL molecule (say, the water is what you want), atom economy…', ['is still the ester\u2019s', 'flips: the ester becomes the waste in the calculation', 'is 100%', 'is undefined'], 1, 'Economy is defined relative to what you wanted.', { 0: 'inverted', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }, { chip: 'BALANCE THE BOOKS', category: 'complete-equation' }),
    mcQ('Best single sentence for the examiner:', ['"my yield was low because chemistry"', '"yield audits the experiment; atom economy audits the equation"', '"both numbers are the same thing"', '"atom economy improves with stirring"'], 1, 'The distinction is the mark.', { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    mcQ('Collected 1.8 g, theoretical 6.0 g:', ['30%', '18%', '60%', '333%'], 0, '1.8 over 6.0.', { 1: 'unbalanced', 2: 'unbalanced', 3: 'inverted' }, { chip: 'BALANCE THE BOOKS', category: 'complete-equation' }),
    mcQ('Theoretical 4.0 g at 85% yield:', ['3.4 g', '4.7 g', '0.85 g', '8.5 g'], 0, 'The fraction of the ceiling.', { 1: 'inverted', 2: 'unbalanced', 3: 'unbalanced' }, { chip: 'BALANCE THE BOOKS', category: 'complete-equation' }),
    mcQ('Three steps at 90% each:', ['90%', '73%', '270%', '30%'], 1, '0.9\u00b3 \u2248 0.73.', { 0: 'unbalanced', 2: 'unbalanced', 3: 'unbalanced' }, { chip: 'BALANCE THE BOOKS', category: 'complete-equation' }),
    mcQ('Distilling the product off as it forms mostly improves…', ['atom economy', 'yield, by pulling the equilibrium forward', 'molar mass', 'nothing'], 1, 'Le Chatelier working for the experimenter.', { 0: 'inverted', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    mcQ('Which route to ethanol has the higher atom economy?', ['chloroethane + NaOH (salt expelled)', 'ethene + H₂O (nothing expelled)', 'equal', 'neither makes ethanol'], 1, 'Hydration keeps every atom; substitution posts NaCl to the bin.', { 0: 'inverted', 2: 'right-answer-wrong-reason', 3: 'wrong-type' }, { chip: 'PICK THE REAGENT', category: 'pick-reagent' }),
    mcQ('Fermentation of glucose to ethanol also makes CO₂. Its atom economy for ethanol is therefore…', ['100%', 'below 100% — the CO₂ counts as the other product', 'zero', 'not defined for biology'], 1, 'Every product that is not the target is the denominator\u2019s tax.', { 0: 'inverted', 2: 'unbalanced', 3: 'right-answer-wrong-reason' }, { chip: 'BALANCE THE BOOKS', category: 'complete-equation' }),
    mcQ('A dry, pure sample weighing more than theoretical means…', ['great yield', 'an error somewhere — the ceiling is the ceiling', 'high atom economy', 'catalysis'], 1, 'Check the weighing, the equation, or the identity.', { 0: 'inverted', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }, { chip: 'BALANCE THE BOOKS', category: 'complete-equation' }),
    mcQ('Atom economy of a reaction with ONE product:', ['depends on yield', '100% by definition', '50%', 'unknowable'], 1, 'No other product, no waste term.', { 0: 'right-answer-wrong-reason', 2: 'unbalanced', 3: 'right-answer-wrong-reason' }, { chip: 'BALANCE THE BOOKS', category: 'complete-equation' }),
    mcQ('Which pathway decision raises the OVERALL yield most reliably?', ['adding steps', 'removing a step', 'lowering each step\u2019s yield', 'longer reflux on every step'], 1, 'Fewer multiplications below one.', { 0: 'inverted', 2: 'inverted', 3: 'right-answer-wrong-reason' }, { chip: 'CLASSIFY THE REACTION', category: 'classify-reaction' }),
    mcQ('The app can verify every atom-economy figure it shows because…', ['the numbers are typed carefully', 'molar masses follow from the engine\u2019s formulas, so the suite recomputes each figure', 'yields are measured', 'the VCE data booklet is embedded'], 1, 'Arithmetic from structure — the whole thread\u2019s method, one more time.', { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' }, { chip: 'BALANCE THE BOOKS', category: 'complete-equation' })
  ),
};

// ── The units ────────────────────────────────────────────────
export const R1 = {
  id: 'r01-boiling-points',
  title: 'Boiling points and branching',
  subtitle: 'Structure predicts behaviour, starting now',
  lessons: [R1_L1, R1_L2, R1_CP],
};

export const R2 = {
  id: 'r02-first-reactions',
  title: 'The first reactions',
  subtitle: 'Burn, swap under UV, add across the double bond',
  lessons: [R2_L1, R2_L2, R2_L3, R2_L4, R2_CP],
};

export const R6 = {
  id: 'r06-solubility',
  title: 'Water, oil and hydrogen bonds',
  subtitle: 'Solubility, and arguing a property from a structure',
  lessons: [R6_L1, R6_L2, R6_CP],
};

export const R7 = {
  id: 'r07-nitrogen',
  title: 'Nitrogen reactions',
  subtitle: 'Amines made, amides linked and unlinked',
  lessons: [R7_L1, R7_L2, R7_L3, R7_CP],
};

export const R9 = {
  id: 'r09-polymers',
  title: 'Polymers',
  subtitle: 'The same links, repeated without end',
  lessons: [R9_L1, R9_L2, R9_L3, R9_CP],
};

export const R10 = {
  id: 'r10-yield-economy',
  title: 'Yield and atom economy',
  subtitle: 'The experiment\u2019s number and the equation\u2019s number',
  lessons: [R10_L1, R10_L2, R10_CP],
};
