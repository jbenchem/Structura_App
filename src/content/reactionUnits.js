// ─────────────────────────────────────────────────────────────
// Reactions block I — the heart of VCE Unit 4.
//
//   R3  Where alcohols come from     (classification, hydration, substitution)
//   R4  Oxidation: climbing the ladder
//   R5  Condensation and hydrolysis
//
// Placement rule, inherited from the plan: a reaction unit may only mention
// families the student can already name. All three sit in Stage 4, each
// directly after the naming unit it depends on.
//
// Every reaction below goes through RXN() and into the registry, which is
// what lets tests/reactions.test.mjs verify the lot: every name parses and
// round-trips, every equation conserves atoms, every card obeys the grammar
// of its claimed type, every reagent is on the whitelist, and every MC's
// four options are provably four different compounds.
// ─────────────────────────────────────────────────────────────

import {
  RXN,
  register,
  pathwayQ,
  tileLabelOf,
  predictProduct,
  predictProductName,
  nameProduct,
  drawProduct,
  pickReagent,
  classifyReaction,
  completeEquation,
  classifyCarbon,
} from './reactions';
import { pool } from './questionFactory';
import { molOf } from './reactions';

// Teach-step helper, same shape the naming units use: title, body, extras.
const T = (title, body, extra = {}) => ({ type: 'teach', title, body, ...extra });

// ── The reactions themselves ─────────────────────────────────
// Named constants, because most appear on several cards: taught in a teach
// step, then asked forwards, backwards and sideways in the pool.

export const R = register([
  // hydration — where alcohols come from, route 1
  RXN({ type: 'addition', from: 'ethene', reagent: 'H₂O / H₂SO₄', conditions: 'catalyst, heat', to: 'ethanol' }),
  RXN({ type: 'addition', from: 'propene', reagent: 'H₂O / H₂SO₄', conditions: 'catalyst, heat', to: 'propan-2-ol', note: 'The OH lands on the more substituted carbon.' }),
  // substitution — route 2
  RXN({ type: 'substitution', from: 'chloroethane', reagent: 'NaOH(aq)', conditions: 'warm', to: 'ethanol', also: { right: ['NaCl'] } }),
  RXN({ type: 'substitution', from: '1-bromopropane', reagent: 'NaOH(aq)', conditions: 'warm', to: 'propan-1-ol', also: { right: ['NaBr'] } }),
  // alcohols back to haloalkanes
  RXN({ type: 'substitution', from: 'ethanol', reagent: 'HBr (conc.)', conditions: 'reflux', to: 'bromoethane', also: { right: ['H₂O'] } }),
  // fermentation, the biological route (equation taught as prose, not carded)
  // oxidation
  RXN({ type: 'oxidation', from: 'propan-1-ol', reagent: 'Cr₂O₇²⁻ / H⁺', conditions: 'distil as it forms', to: 'propanal', also: { right: ['H₂O'], left: ['O'] } }),
  RXN({ type: 'oxidation', from: 'propanal', reagent: 'Cr₂O₇²⁻ / H⁺', conditions: 'excess oxidant, reflux', to: 'propanoic acid', also: { left: ['O'] } }),
  RXN({ type: 'oxidation', from: 'ethanol', reagent: 'MnO₄⁻ / H⁺', conditions: 'excess oxidant, reflux', to: 'ethanoic acid', also: { right: ['H₂O'], left: ['O', 'O'] } }),
  RXN({ type: 'oxidation', from: 'propan-2-ol', reagent: 'Cr₂O₇²⁻ / H⁺', conditions: 'warm', to: 'propan-2-one', also: { right: ['H₂O'], left: ['O'] } }),
  RXN({ type: 'oxidation', from: 'butan-2-ol', reagent: 'MnO₄⁻ / H⁺', conditions: 'warm', to: 'butan-2-one', also: { right: ['H₂O'], left: ['O'] } }),
  // esterification and hydrolysis
  RXN({ type: 'condensation', from: 'ethanoic acid', with: 'ethanol', reagent: 'H₂SO₄ (conc.)', conditions: 'reflux', to: 'ethyl ethanoate', also: { right: ['H₂O'] } }),
  RXN({ type: 'condensation', from: 'propanoic acid', with: 'methanol', reagent: 'H₂SO₄ (conc.)', conditions: 'reflux', to: 'methyl propanoate', also: { right: ['H₂O'] } }),
  RXN({ type: 'hydrolysis', from: 'ethyl ethanoate', reagent: 'H₂O / H⁺', conditions: 'reflux', to: 'ethanoic acid', also: { left: ['H₂O'], right: ['ethanol'] } }),
  // Edges added for the pathway unit: the reverse road out of propan-1-ol
  // (making the network a network rather than a line), and the butyl ladder
  // so checkpoint routes are not all two carbons long.
  RXN({ type: 'substitution', from: 'propan-1-ol', reagent: 'HBr (conc.)', conditions: 'reflux', to: '1-bromopropane', also: { right: ['H₂O'] } }),
  RXN({ type: 'oxidation', from: 'butan-1-ol', reagent: 'Cr₂O₇²⁻ / H⁺', conditions: 'distil as it forms', to: 'butanal', also: { right: ['H₂O'], left: ['O'] } }),
  RXN({ type: 'oxidation', from: 'butan-1-ol', reagent: 'MnO₄⁻ / H⁺', conditions: 'excess oxidant, reflux', to: 'butanoic acid', also: { right: ['H₂O'], left: ['O', 'O'] } }),
  RXN({ type: 'condensation', from: 'butanoic acid', with: 'ethanol', reagent: 'H₂SO₄ (conc.)', conditions: 'reflux', to: 'ethyl butanoate', also: { right: ['H₂O'] } }),
  RXN({ type: 'substitution', from: '1-chlorobutane', reagent: 'NaOH(aq)', conditions: 'warm', to: 'butan-1-ol', also: { right: ['NaCl'] } }),
  // Two edges the pathway walker proved missing: routes were authored
  // assuming them, and the walk broke exactly there. The tile convention
  // stays consistent — permanganate at reflux takes a primary alcohol the
  // whole way, dichromate with distillation is the careful single rung.
  RXN({ type: 'oxidation', from: 'propan-1-ol', reagent: 'MnO₄⁻ / H⁺', conditions: 'excess oxidant, reflux', to: 'propanoic acid', also: { right: ['H₂O'], left: ['O', 'O'] } }),
  RXN({ type: 'condensation', from: 'ethanoic acid', with: 'methanol', reagent: 'H₂SO₄ (conc.)', conditions: 'reflux', to: 'methyl ethanoate', also: { right: ['H₂O'] } }),
]);

const [
  HYDRATE_ETHENE, HYDRATE_PROPENE,
  SUB_CHLOROETHANE, SUB_BROMOPROPANE, ETHANOL_TO_BROMO,
  OX_1_ALD, OX_ALD_ACID, OX_ETHANOL_ACID, OX_2_KETONE, OX_BUTANOL_KETONE,
  ESTER_ETHYL, ESTER_METHYL, HYDROLYSE_ETHYL,
  PROPANOL_TO_BROMO, OX_BUTANOL_ALD, OX_BUTANOL_ACID, ESTER_ETHYL_BUT, SUB_CHLOROBUTANE,
  OX_PROPANOL_ACID, ESTER_METHYL_ETH,
] = R;

// ─────────────────────────────────────────────────────────────
// R3 · Where alcohols come from
// ─────────────────────────────────────────────────────────────

const R3_L1 = {
  id: 'r03-l1',
  title: 'Primary, secondary, tertiary',
  teaches: ['reactions', 'groups'],
  ask: 8,
  steps: [
    T(
      'Not every alcohol is the same kind',
      'Look at the carbon holding the [[hydroxyl]]. Count the carbons bonded to it — the carbons, not the hydrogens.\n\nOne carbon neighbour makes it a primary (1°) alcohol. Two make it secondary (2°). Three make it tertiary (3°).\n\nThis single count decides everything the alcohol can do next, which is why it comes before any reaction does.',
      { caption: 'butan-1-ol: the OH carbon touches one other carbon. Primary.', mol: molOf('butan-1-ol') }
    ),
    T(
      'The same four carbons, three different alcohols',
      'butan-1-ol, butan-2-ol and 2-methylpropan-2-ol all read C4H10O — same formula, different position, and now a different class.\n\nMove the [[hydroxyl]] inward and its carbon gains carbon neighbours: 1° at the end, 2° in the middle, 3° at a branch point.\n\nThe [[locant]] you already know how to read is also telling you the class.',
      { caption: '2-methylpropan-2-ol: the OH carbon touches three carbons. Tertiary.', mol: molOf('2-methylpropan-2-ol') }
    ),
    { type: 'question', q: classifyCarbon('butan-1-ol', 1, { seed: 3, explain: 'The C1 carbon holding the OH touches exactly one other carbon: primary.' }) },
    { type: 'question', q: classifyCarbon('butan-2-ol', 2, { seed: 5, explain: 'C2 touches C1 and C3 — two carbon neighbours: secondary.' }) },
  ],
  pool: pool(
    classifyCarbon('propan-1-ol', 1, { seed: 11, explain: 'One carbon neighbour at the chain end: primary.' }),
    classifyCarbon('propan-2-ol', 2, { seed: 12, explain: 'The middle carbon touches two others: secondary.' }),
    classifyCarbon('2-methylbutan-2-ol', 2, { seed: 13, explain: 'C2 carries the methyl as well as C1 and C3 — three carbon neighbours: tertiary.' }),
    classifyCarbon('pentan-1-ol', 1, { seed: 14, explain: 'Chain-end OH: one carbon neighbour, primary.' }),
    classifyCarbon('pentan-3-ol', 3, { seed: 15, explain: 'Dead centre of the chain: two carbon neighbours, secondary.' }),
    classifyCarbon('2-methylpropan-2-ol', 2, { seed: 16, explain: 'Three carbons around the OH carbon: tertiary. Hydrogens were never the question.' }),
    classifyCarbon('hexan-2-ol', 2, { seed: 17, explain: 'C2 touches C1 and C3: secondary.' }),
    classifyCarbon('2-methylpentan-1-ol', 1, { seed: 18, explain: 'The OH sits on C1, which touches only C2. The branch is elsewhere — primary.' })
  ),
};

const R3_L2 = {
  id: 'r03-l2',
  title: 'Making alcohols',
  teaches: ['reactions'],
  ask: 8,
  steps: [
    T(
      'Route one: add water across a double bond',
      'An [[alkene]] plus water, with an acid catalyst and heat, gains H on one carbon of the double [[bond]] and OH on the other. The double [[bond]] opens; an alcohol forms.\n\nThis is an addition reaction: two things add across the C=C, and nothing leaves.',
      { rxn: HYDRATE_ETHENE, caption: 'ethene + water → ethanol. Count the [[atoms]]: everything that went in is still there.' }
    ),
    T(
      'Route two: swap the halogen out',
      'A [[haloalkane]] warmed with aqueous hydroxide swaps its halogen for OH. The carbon chain is untouched — one group replaces another, which is what substitution means.\n\nThe halogen leaves with the sodium, as salt.',
      { rxn: SUB_CHLOROETHANE, caption: 'chloroethane + NaOH(aq) → ethanol + NaCl. Same chain, one passenger swapped.' }
    ),
    T(
      'Route three: let yeast do it',
      'Glucose fermented by yeast gives ethanol and carbon dioxide — the biological route, and where most ethanol fuel comes from.\n\nC₆H₁₂O₆ → 2 C₂H₅OH + 2 CO₂\n\nIt only ever makes ethanol. For any other alcohol, it is routes one and two.',
      { mol: molOf('ethanol'), caption: 'The one product fermentation can make. Any other alcohol is routes one and two.' }
    ),
    { type: 'question', q: classifyReaction(HYDRATE_ETHENE, { seed: 21, explain: 'The double bond opened and both new pieces stayed: addition.' }) },
    { type: 'question', q: classifyReaction(SUB_CHLOROETHANE, { seed: 22, explain: 'One group replaced another on a saturated carbon: substitution.' }) },
  ],
  pool: pool(
    predictProduct(HYDRATE_PROPENE, ['propan-1-ol', 'propane', '1-chloropropane'], {
      seed: 31,
      explain: 'Water adds across the double bond, and the OH lands on the more substituted carbon: propan-2-ol.',
      errorClasses: { 1: 'wrong-position', 2: 'wrong-reagent', 3: 'wrong-reagent' },
    }),
    predictProductName(SUB_BROMOPROPANE, ['propan-2-ol', 'propane', 'bromopropane'], {
      seed: 32,
      explain: 'Hydroxide replaces the bromine exactly where it sat: carbon 1, so propan-1-ol.',
      errorClasses: { 1: 'wrong-position', 2: 'wrong-type', 3: 'reversed' },
    }),
    pickReagent(SUB_CHLOROETHANE, ['H₂O / H₂SO₄', 'Cr₂O₇²⁻ / H⁺', 'HCl'], {
      seed: 33,
      explain: 'A haloalkane substitutes to an alcohol with aqueous hydroxide. Acidified water hydrates alkenes, and there is no double bond here.',
      errorClasses: { 1: 'wrong-reagent', 2: 'wrong-type', 3: 'reversed' },
    }),
    pickReagent(HYDRATE_ETHENE, ['NaOH(aq)', 'H₂ / Ni', 'HBr'], {
      seed: 34,
      explain: 'Adding water across a double bond needs water and an acid catalyst. Hydroxide substitutes haloalkanes — there is no halogen here to swap.',
      errorClasses: { 1: 'wrong-reagent', 2: 'wrong-reagent', 3: 'wrong-reagent' },
    }),
    completeEquation(SUB_BROMOPROPANE, ['H₂O', 'HBr', 'H₂'], {
      seed: 35,
      explain: 'The bromine left the carbon and the sodium left the hydroxide: together they are NaBr. Atoms have to go somewhere.',
    }),
    classifyReaction(HYDRATE_PROPENE, { seed: 36, explain: 'Both pieces of the water stayed on the molecule: addition.' }),
    nameProduct(SUB_CHLOROETHANE, { hint: 'The OH takes over exactly the carbon the chlorine held.' }),
    drawProduct(HYDRATE_ETHENE, { hint: 'Open the double bond; H to one carbon, OH to the other.' })
  ),
};

const R3_L3 = {
  id: 'r03-l3',
  title: 'Alcohols back to haloalkanes',
  teaches: ['reactions'],
  ask: 8,
  steps: [
    T(
      'The same road, driven backwards',
      'An alcohol refluxed with concentrated HBr swaps its OH for Br — substitution again, in the other direction. The OH leaves as water.\n\nNotice what this means: haloalkane → alcohol → haloalkane. Reactions run in networks, not lines, and later you will design routes through that network.',
      { rxn: ETHANOL_TO_BROMO, caption: 'ethanol + HBr → bromoethane + water.' }
    ),
    { type: 'question', q: classifyReaction(ETHANOL_TO_BROMO, { seed: 41, explain: 'One group swapped for another on a saturated carbon: substitution — the direction does not change the type.' }) },
    { type: 'question', q: completeEquation(ETHANOL_TO_BROMO, ['HBr', 'NaBr', 'H₂'], { seed: 42, explain: 'The OH left with the H from HBr: water.' }) },
  ],
  pool: pool(
    predictProductName(ETHANOL_TO_BROMO, ['ethane', 'ethanal', '1,2-dibromoethane'], {
      seed: 51,
      explain: 'The Br replaces the OH on the same carbon: bromoethane.',
      errorClasses: { 1: 'wrong-type', 2: 'wrong-type', 3: 'wrong-position' },
    }),
    pickReagent(ETHANOL_TO_BROMO, ['NaOH(aq)', 'Br₂', 'MnO₄⁻ / H⁺'], {
      seed: 52,
      explain: 'Concentrated HBr under reflux swaps OH for Br. Hydroxide would push the other way, and Br₂ needs a double bond to add across.',
      errorClasses: { 1: 'reversed', 2: 'wrong-reagent', 3: 'wrong-type' },
    }),
    classifyReaction(SUB_CHLOROETHANE, { seed: 53, explain: 'Substitution: the chain kept, one group traded.' }),
    classifyCarbon('ethanol', 1, { seed: 54, explain: 'One carbon neighbour: primary — remember this one, it matters enormously next lesson.' }),
    nameProduct(ETHANOL_TO_BROMO, { hint: 'Halogen prefix, same carbon count.' }),
    completeEquation(ESTER_ETHYL, ['HCl', 'H₂', 'CO₂'], {
      seed: 55,
      explain: 'Preview of next unit: when an acid and an alcohol join, the small molecule expelled is water.',
    }),
    predictProduct(SUB_CHLOROETHANE, ['chloroethane', 'ethanal', 'ethane'], {
      seed: 56,
      explain: 'The OH replaces the chlorine on the same carbon: ethanol.',
      errorClasses: { 1: 'reversed', 2: 'wrong-type', 3: 'wrong-type' },
    }),
    drawProduct(ETHANOL_TO_BROMO, { hint: 'Two carbons; the Br takes the carbon the OH held.' })
  ),
};

// ─────────────────────────────────────────────────────────────
// R4 · Oxidation: climbing the ladder
// ─────────────────────────────────────────────────────────────

const R4_L1 = {
  id: 'r04-l1',
  title: 'Primary alcohols oxidise twice',
  teaches: ['reactions', 'priority'],
  ask: 8,
  steps: [
    T(
      'The oxidant and the first step',
      'Warm a primary alcohol with acidified dichromate (Cr₂O₇²⁻ / H⁺) or permanganate (MnO₄⁻ / H⁺) and it oxidises: the carbon holding the OH loses hydrogens and gains a C=O. The first product is an [[aldehyde]].\n\nThe orange dichromate turns green as it works — the colour change IS the evidence.',
      { rxn: OX_1_ALD, caption: 'propan-1-ol → propanal, if you distil the aldehyde off as it forms.' }
    ),
    T(
      'Leave it in, and it climbs again',
      'An aldehyde left in the same conditions oxidises a second time, gaining an oxygen to become a [[carboxylic acid]]. So conditions decide where a primary alcohol stops:\n\ndistil the product off early → aldehyde.\nexcess oxidant, reflux → carboxylic acid.\n\nSame reagent. The apparatus is the choice.',
      { rxn: OX_ALD_ACID, caption: 'propanal → propanoic acid: the second rung of the same ladder.' }
    ),
    { type: 'question', q: classifyReaction(OX_1_ALD, { seed: 61, explain: 'Hydrogens lost, oxygen gained at the working carbon: oxidation.' }) },
    {
      type: 'question',
      q: predictProductName(OX_ETHANOL_ACID, ['ethanal', 'ethane', 'ethyl ethanoate'], {
        seed: 62,
        explain: 'Excess oxidant under reflux takes a primary alcohol all the way: ethanoic acid. Stopping at ethanal needs the aldehyde distilled off early.',
        errorClasses: { 1: 'wrong-degree', 2: 'wrong-type', 3: 'confused-condensation' },
      }),
    },
  ],
  pool: pool(
    predictProductName(OX_1_ALD, ['propanoic acid', 'propan-2-ol', 'propane'], {
      seed: 71,
      explain: 'Distilled off as it forms, the oxidation stops at the aldehyde: propanal.',
      errorClasses: { 1: 'wrong-degree', 2: 'wrong-position', 3: 'wrong-type' },
    }),
    predictProductName(OX_ETHANOL_ACID, ['ethanal', 'methanoic acid', 'ethene'], {
      seed: 72,
      explain: 'Reflux with excess oxidant climbs both rungs: ethanoic acid.',
      errorClasses: { 1: 'wrong-degree', 2: 'wrong-family', 3: 'wrong-type' },
    }),
    pickReagent(OX_1_ALD, ['NaOH(aq)', 'H₂O / H₂SO₄', 'HBr (conc.)'], {
      seed: 73,
      explain: 'Oxidation needs an oxidant: acidified dichromate or permanganate. The others substitute or add — none of them oxidises.',
      errorClasses: { 1: 'wrong-type', 2: 'wrong-type', 3: 'wrong-type' },
    }),
    classifyReaction(OX_ALD_ACID, { seed: 74, explain: 'Oxygen gained at the carbonyl carbon: oxidation, the second time in a row.' }),
    nameProduct(OX_ALD_ACID, { hint: 'The -al becomes -oic acid; the carbon count does not change.' }),
    nameProduct(OX_1_ALD, { hint: 'Primary alcohol, first rung: the -ol becomes -al.' }),
    classifyCarbon('propan-1-ol', 1, { seed: 75, explain: 'Primary — which is exactly why it has two rungs to climb.' }),
    drawProduct(OX_ETHANOL_ACID, { hint: 'Two carbons, and the working carbon ends up holding both a C=O and an OH.' })
  ),
};

const R4_L2 = {
  id: 'r04-l2',
  title: 'Secondary stops, tertiary refuses',
  teaches: ['reactions', 'priority'],
  ask: 8,
  steps: [
    T(
      'A secondary alcohol has one rung',
      'Oxidise a secondary alcohol and its OH carbon becomes a C=O — a [[ketone]]. And there it stops.\n\nGoing further would need another hydrogen on that carbon to give up, and it spent its only one. The count you did in the last unit is now doing chemistry.',
      { rxn: OX_2_KETONE, caption: 'propan-2-ol → propan-2-one. One rung, then the ladder ends.' }
    ),
    T(
      'A tertiary alcohol has none',
      'The OH carbon of a tertiary alcohol has no hydrogen at all — three carbons took its places. Acidified dichromate does nothing: the orange stays orange.\n\nThat refusal is itself a test: warm an unknown alcohol with dichromate, and no colour change means tertiary.',
      { caption: '2-methylpropan-2-ol + Cr₂O₇²⁻ / H⁺ → no reaction. The orange stays orange.', mol: molOf('2-methylpropan-2-ol') }
    ),
    {
      type: 'question',
      q: predictProductName(OX_2_KETONE, ['propanal', 'propanoic acid', 'propan-1-ol'], {
        seed: 81,
        explain: 'A secondary alcohol oxidises once, to the ketone — and a ketone cannot climb further.',
        errorClasses: { 1: 'wrong-degree', 2: 'wrong-degree', 3: 'reversed' },
      }),
    },
  ],
  pool: pool(
    predictProductName(OX_BUTANOL_KETONE, ['butanal', 'butanoic acid', 'butan-1-ol'], {
      seed: 91,
      explain: 'butan-2-ol is secondary: one rung, to butan-2-one.',
      errorClasses: { 1: 'wrong-degree', 2: 'wrong-degree', 3: 'reversed' },
    }),
    classifyCarbon('butan-2-ol', 2, { seed: 92, explain: 'Two carbon neighbours: secondary — so it oxidises exactly once.' }),
    classifyCarbon('2-methylbutan-2-ol', 2, { seed: 93, explain: 'Three carbon neighbours: tertiary — so dichromate leaves it alone.' }),
    classifyReaction(OX_2_KETONE, { seed: 94, explain: 'Hydrogens lost, C=O formed: oxidation, even though it only goes one rung.' }),
    nameProduct(OX_2_KETONE, { hint: 'The -ol becomes -one, locant kept.' }),
    nameProduct(OX_BUTANOL_KETONE, { hint: 'Secondary alcohol → ketone, same position.' }),
    predictProductName(OX_1_ALD, ['propan-2-one', 'propanoic acid', 'propene'], {
      seed: 95,
      explain: 'Primary this time — and distilled off early, so it stops at propanal. The ketone would need the OH on carbon 2.',
      errorClasses: { 1: 'wrong-position', 2: 'wrong-degree', 3: 'wrong-type' },
    }),
    drawProduct(OX_2_KETONE, { hint: 'Three carbons; the C=O sits where the OH was, on carbon 2.' })
  ),
};

const R4_L3 = {
  id: 'r04-l3',
  title: 'The whole ladder at once',
  teaches: ['reactions', 'priority'],
  ask: 8,
  steps: [
    T(
      'One decision tree',
      'Everything from the last two lessons is one small tree:\n\nPrimary → aldehyde → carboxylic acid (two rungs; conditions choose your stop).\nSecondary → ketone (one rung).\nTertiary → nothing (no rungs).\n\nClassify the carbon, and the outcome follows. That is the whole trick, and examiners test it relentlessly.',
      { rxn: OX_ETHANOL_ACID, caption: 'Cr₂O₇²⁻ / H⁺ or MnO₄⁻ / H⁺ throughout. The alcohol decides; the oxidant just pushes.' }
    ),
    {
      type: 'question',
      q: pickReagent(OX_ETHANOL_ACID, ['H₂O / H₂SO₄', 'NaOH(aq)', 'NH₃'], {
        seed: 101,
        explain: 'Only the acidified oxidants climb the ladder. Everything else on this list adds or substitutes.',
        errorClasses: { 1: 'wrong-type', 2: 'wrong-type', 3: 'wrong-type' },
      }),
    },
  ],
  pool: pool(
    predictProductName(OX_ETHANOL_ACID, ['ethanal', 'ethene', 'ethyl ethanoate'], {
      seed: 111,
      explain: 'Reflux and excess oxidant: both rungs, ethanoic acid.',
      errorClasses: { 1: 'wrong-degree', 2: 'wrong-type', 3: 'confused-condensation' },
    }),
    predictProductName(OX_2_KETONE, ['propanoic acid', 'propanal', 'propane'], {
      seed: 112,
      explain: 'Secondary: the ketone, and no further.',
      errorClasses: { 1: 'wrong-degree', 2: 'wrong-position', 3: 'wrong-type' },
    }),
    classifyCarbon('pentan-2-ol', 2, { seed: 113, explain: 'Secondary — one rung available.' }),
    classifyCarbon('2-methylpentan-2-ol', 2, { seed: 114, explain: 'Tertiary — the dichromate stays orange.' }),
    classifyReaction(OX_ETHANOL_ACID, { seed: 115, explain: 'Oxidation, both rungs in one pot.' }),
    nameProduct(OX_BUTANOL_KETONE, { hint: 'butan-2-ol is secondary; keep the locant.' }),
    completeEquation(OX_1_ALD, ['CO₂', 'H₂', 'HBr'], {
      seed: 116,
      explain: 'The two hydrogens the alcohol lost leave with the oxidant\\u2019s oxygen: water.',
    }),
    drawProduct(OX_BUTANOL_KETONE, { hint: 'Four carbons, C=O on carbon 2.' })
  ),
};

// ─────────────────────────────────────────────────────────────
// R5 · Condensation and hydrolysis
// ─────────────────────────────────────────────────────────────

const R5_L1 = {
  id: 'r05-l1',
  title: 'Esterification: water out',
  teaches: ['reactions', 'groups'],
  ask: 8,
  steps: [
    T(
      'Two molecules join; water leaves',
      'A [[carboxylic acid]] and an alcohol, refluxed with a little concentrated sulfuric acid, join into an [[ester]] — and a water [[molecule]] is expelled, built from the acid\\u2019s OH and the alcohol\\u2019s H.\n\nJoining-with-a-small-[[molecule]]-out is condensation. You already know how to name the ester from its two parents; now you know where it comes from.',
      { rxn: ESTER_ETHYL, caption: 'ethanoic acid + ethanol → ethyl ethanoate + water. The name tells you the parents; the reaction is them joining.' }
    ),
    { type: 'question', q: classifyReaction(ESTER_ETHYL, { seed: 121, explain: 'Two molecules joined and water left: condensation.' }) },
    { type: 'question', q: completeEquation(ESTER_ETHYL, ['H₂', 'CO₂', 'HCl'], { seed: 122, explain: 'OH from the acid, H from the alcohol: water.' }) },
  ],
  pool: pool(
    predictProductName(ESTER_METHYL, ['propyl methanoate', 'propan-1-ol', 'propanal'], {
      seed: 131,
      explain: 'The acid gives the -oate half, the alcohol the -yl half: methyl propanoate. Reversing them names a different ester.',
      errorClasses: { 1: 'reversed', 2: 'wrong-type', 3: 'wrong-type' },
    }),
    pickReagent(ESTER_ETHYL, ['NaOH(aq)', 'Cr₂O₇²⁻ / H⁺', 'H₂ / Ni'], {
      seed: 132,
      explain: 'Esterification wants concentrated sulfuric acid and reflux. The oxidant would attack the alcohol instead.',
      errorClasses: { 1: 'wrong-reagent', 2: 'wrong-type', 3: 'wrong-type' },
    }),
    classifyReaction(ESTER_METHYL, { seed: 133, explain: 'Condensation: join, and water out.' }),
    nameProduct(ESTER_ETHYL, { hint: 'Alcohol first as -yl, acid second as -oate.' }),
    nameProduct(ESTER_METHYL, { hint: 'methanol gives methyl; propanoic acid gives propanoate.' }),
    completeEquation(ESTER_METHYL, ['H₂', 'HBr', 'CO₂'], {
      seed: 134,
      explain: 'Every esterification expels exactly one water.',
    }),
    classifyCarbon('ethanol', 1, { seed: 135, explain: 'Primary — and in an esterification, the classification does not matter: any alcohol will join.' }),
    drawProduct(ESTER_ETHYL, { hint: 'Four carbons in total: CH₃-CO-O-CH₂-CH₃.' })
  ),
};

const R5_L2 = {
  id: 'r05-l2',
  title: 'Hydrolysis: the same reaction backwards',
  teaches: ['reactions', 'groups'],
  ask: 8,
  steps: [
    T(
      'Water goes back in',
      'Reflux an [[ester]] with dilute acid and water splits it back into the carboxylic acid and the alcohol it came from. Hydrolysis — literally, splitting with water.\n\nEvery condensation has a hydrolysis running the other way. Which direction wins is a matter of conditions, not of possibility.',
      { rxn: HYDROLYSE_ETHYL, caption: 'ethyl ethanoate + water → ethanoic acid + ethanol. Read the ester\\u2019s name and you can predict both products.' }
    ),
    { type: 'question', q: classifyReaction(HYDROLYSE_ETHYL, { seed: 141, explain: 'Water split one molecule into two: hydrolysis.' }) },
  ],
  pool: pool(
    predictProductName(HYDROLYSE_ETHYL, ['ethanal', 'ethyl ethanoate', 'methanoic acid'], {
      seed: 151,
      explain: 'The -oate half becomes the acid again: ethanoic acid (with ethanol as the other product).',
      errorClasses: { 1: 'wrong-type', 2: 'reversed', 3: 'wrong-family' },
    }),
    pickReagent(HYDROLYSE_ETHYL, ['H₂SO₄ (conc.)', 'Cr₂O₇²⁻ / H⁺', 'H₂ / Ni'], {
      seed: 152,
      explain: 'Hydrolysis wants water and dilute acid. Concentrated sulfuric acid with no water pushes the other way — toward the ester.',
      errorClasses: { 1: 'reversed', 2: 'wrong-type', 3: 'wrong-type' },
    }),
    classifyReaction(ESTER_ETHYL, { seed: 153, explain: 'Condensation — the twin, running forward.' }),
    classifyReaction(HYDROLYSE_ETHYL, { seed: 154, explain: 'Hydrolysis — water in, one molecule becomes two.' }),
    completeEquation(HYDROLYSE_ETHYL, ['H₂O', 'CO₂', 'H₂'], {
      seed: 155,
      explain: 'The second product is the alcohol the ester was built from: ethanol.',
    }),
    nameProduct(HYDROLYSE_ETHYL, { hint: 'The -oate half, restored to its acid.' }),
    predictProductName(ESTER_METHYL, ['methyl ethanoate', 'ethyl propanoate', 'propan-1-ol'], {
      seed: 156,
      explain: 'propanoic acid gives propanoate, methanol gives methyl: methyl propanoate. The reversed pairing is a different ester.',
      errorClasses: { 1: 'reversed', 2: 'reversed', 3: 'wrong-type' },
    }),
    pickReagent(ESTER_METHYL, ['H₂O / H⁺', 'MnO₄⁻ / H⁺', 'NaOH(aq)'], {
      seed: 157,
      explain: 'Building the ester wants concentrated sulfuric acid; dilute acid with water would pull the equilibrium the other way.',
      errorClasses: { 1: 'reversed', 2: 'wrong-type', 3: 'wrong-reagent' },
    })
  ),
};

const R5_L3 = {
  id: 'r05-l3',
  title: 'Boiling points across the ladder',
  teaches: ['properties', 'groups'],
  ask: 8,
  steps: [
    T(
      'Why esters smell and acids do not',
      'Boiling point tracks how [[molecules]] hold on to each other.\n\nAlkanes have only [[dispersion forces]]: weakest, lowest boiling. Aldehydes and ketones add a polar C=O: higher. Alcohols can hydrogen-bond: higher again. Carboxylic acids hydrogen-bond twice over, pairing up in twos: highest of all.\n\nEsters lost the OH when the water left — no hydrogen bonding, low boiling, and volatile enough to reach your nose. That is why esters are the smells of fruit and acids are not.',
      { mol: molOf('butanoic acid'), caption: 'butane −1° · butanal 75° · butan-1-ol 117° · butanoic acid 164°. Same carbon count, four different grips.' }
    ),
    {
      type: 'question',
      q: {
        id: 'r05-bp-1',
        type: 'mcName',
        chip: 'PREDICT THE PROPERTY',
        prompt: 'Same carbon count throughout. Which boils highest?',
        options: ['butane', 'butanal', 'butan-1-ol', 'butanoic acid'],
        answer: 3,
        explain: 'The acid hydrogen-bonds twice over and pairs into dimers — the strongest grip on this list.',
        errorClasses: { 0: 'inverted', 1: 'adjacent-swap', 2: 'adjacent-swap' },
        category: 'molecule-type',
      },
    },
  ],
  pool: pool(
    {
      id: 'r05-bp-2',
      type: 'mcName',
      chip: 'PREDICT THE PROPERTY',
      prompt: 'Which boils lowest — same four carbons each time?',
      options: ['butan-1-ol', 'butanoic acid', 'butane', 'butanal'],
      answer: 2,
      explain: 'Only dispersion forces: the alkane lets go first.',
      errorClasses: { 0: 'inverted', 1: 'inverted', 3: 'adjacent-swap' },
      category: 'molecule-type',
    },
    {
      id: 'r05-bp-3',
      type: 'mcName',
      chip: 'PREDICT THE PROPERTY',
      prompt: 'Why does butan-1-ol boil far above butanal?',
      options: [
        'It is heavier',
        'Its OH hydrogen-bonds; the aldehyde cannot donate one',
        'It has more oxygen atoms',
        'Aldehydes are unstable at high temperature',
      ],
      answer: 1,
      explain: 'Nearly the same mass and the same oxygen count. The difference is the O–H, which donates a hydrogen bond; C=O alone cannot.',
      errorClasses: { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' },
      category: 'molecule-type',
    },
    {
      id: 'r05-bp-4',
      type: 'mcName',
      chip: 'PREDICT THE PROPERTY',
      prompt: 'Ethyl ethanoate boils at 77°, well below ethanol at 78° despite being much heavier. Why?',
      options: [
        'Esters are always gases',
        'It lost the OH — nothing left to hydrogen-bond with',
        'The oxygen atoms repel each other',
        'Sulfuric acid lowers its boiling point',
      ],
      answer: 1,
      explain: 'Condensation spent the O–H making water. Without a donor, the ester falls back on weaker forces — which is also why you can smell it.',
      errorClasses: { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' },
      category: 'molecule-type',
    },
    classifyReaction(ESTER_ETHYL, { seed: 161, explain: 'Condensation — and the water it expels is the boiling point it gives away.' }),
    nameProduct(ESTER_ETHYL, { hint: 'Smells of pears; names as -yl then -oate.' }),
    {
      id: 'r05-bp-5',
      type: 'mcName',
      chip: 'PREDICT THE PROPERTY',
      prompt: 'Which dissolves most readily in water?',
      options: ['hexane', 'hexan-1-ol', 'ethanol', 'ethyl ethanoate'],
      answer: 2,
      explain: 'Hydrogen bonding to water with almost no greasy chain to drag along. hexan-1-ol has the same OH but six carbons of alkane working against it.',
      errorClasses: { 0: 'inverted', 1: 'adjacent-swap', 3: 'adjacent-swap' },
      category: 'molecule-type',
    },
    {
      id: 'r05-bp-6',
      type: 'mcName',
      chip: 'PREDICT THE PROPERTY',
      prompt: 'Two carbons each: rank ethane, ethanal, ethanol by boiling point, lowest first.',
      options: [
        'ethane < ethanal < ethanol',
        'ethanal < ethane < ethanol',
        'ethanol < ethanal < ethane',
        'ethane < ethanol < ethanal',
      ],
      answer: 0,
      explain: 'Dispersion only, then a polar C=O, then hydrogen bonding: each rung grips harder than the last.',
      errorClasses: { 1: 'adjacent-swap', 2: 'inverted', 3: 'adjacent-swap' },
      category: 'molecule-type',
    },
    {
      id: 'r05-bp-7',
      type: 'mcName',
      chip: 'PREDICT THE PROPERTY',
      prompt: 'Why do carboxylic acids boil higher than alcohols of the same size?',
      options: [
        'They are more acidic',
        'They pair into hydrogen-bonded dimers — two bonds per pair, not one',
        'The C=O makes them heavier',
        'They decompose before boiling',
      ],
      answer: 1,
      explain: 'Two acids clasp each other with TWO hydrogen bonds at once, so separating them costs roughly double. Acidity is true but is not the reason.',
      errorClasses: { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' },
      category: 'molecule-type',
    }
  ),
};


// ── Checkpoints ──────────────────────────────────────────────
// Every unit ends in one, per house structure: no teaching, a wide pool, 15
// asked. Built from the same verified builders with fresh seeds, plus the
// hand-written property questions where they belong.

const cpQ = (unitReactions, base) => {
  const qs = [];
  let seed = base;
  for (const rxn of unitReactions) {
    seed += 7;
    qs.push(classifyReaction(rxn, { seed, explain: `This one is ${rxn.type}: check what changed between the two structures.` }));
  }
  return qs;
};

const R3_CP = {
  id: 'r03-cp',
  title: 'Checkpoint: making alcohols',
  teaches: ['reactions', 'groups'],
  checkpoint: true,
  ask: 15,
  steps: [],
  pool: pool(
    classifyCarbon('propan-1-ol', 1, { seed: 201, explain: 'Chain-end OH: primary.' }),
    classifyCarbon('propan-2-ol', 2, { seed: 202, explain: 'Two carbon neighbours: secondary.' }),
    classifyCarbon('2-methylpropan-2-ol', 2, { seed: 203, explain: 'Three carbon neighbours: tertiary.' }),
    classifyCarbon('butan-2-ol', 2, { seed: 204, explain: 'Secondary.' }),
    classifyCarbon('pentan-1-ol', 1, { seed: 205, explain: 'Primary.' }),
    classifyCarbon('hexan-2-ol', 2, { seed: 206, explain: 'Secondary.' }),
    classifyCarbon('2-methylbutan-2-ol', 2, { seed: 207, explain: 'Tertiary.' }),
    predictProduct(HYDRATE_ETHENE, ['ethane', 'chloroethane', 'ethanal'], {
      seed: 211, explain: 'Water across the double bond: ethanol.',
      errorClasses: { 1: 'wrong-reagent', 2: 'wrong-reagent', 3: 'wrong-type' },
    }),
    predictProduct(HYDRATE_PROPENE, ['propan-1-ol', 'propane', '2-chloropropane'], {
      seed: 212, explain: 'The OH takes the more substituted carbon: propan-2-ol.',
      errorClasses: { 1: 'wrong-position', 2: 'wrong-reagent', 3: 'wrong-reagent' },
    }),
    predictProductName(SUB_CHLOROETHANE, ['chloroethane', 'ethanal', 'ethanoic acid'], {
      seed: 213, explain: 'OH in, Cl out: ethanol.',
      errorClasses: { 1: 'reversed', 2: 'wrong-type', 3: 'wrong-degree' },
    }),
    predictProductName(SUB_BROMOPROPANE, ['propan-2-ol', 'propane', 'propanal'], {
      seed: 214, explain: 'Substitution keeps the position: propan-1-ol.',
      errorClasses: { 1: 'wrong-position', 2: 'wrong-type', 3: 'wrong-type' },
    }),
    predictProductName(ETHANOL_TO_BROMO, ['ethane', '1,1-dibromoethane', 'ethanal'], {
      seed: 215, explain: 'Br replaces OH: bromoethane.',
      errorClasses: { 1: 'wrong-type', 2: 'wrong-position', 3: 'wrong-type' },
    }),
    pickReagent(HYDRATE_ETHENE, ['NaOH(aq)', 'HBr (conc.)', 'Cr₂O₇²⁻ / H⁺'], {
      seed: 221, explain: 'Hydration wants water with an acid catalyst.',
      errorClasses: { 1: 'wrong-reagent', 2: 'wrong-reagent', 3: 'wrong-type' },
    }),
    pickReagent(SUB_BROMOPROPANE, ['H₂O / H₂SO₄', 'HBr (conc.)', 'H₂ / Ni'], {
      seed: 222, explain: 'Aqueous hydroxide substitutes the halogen out.',
      errorClasses: { 1: 'wrong-reagent', 2: 'reversed', 3: 'wrong-type' },
    }),
    pickReagent(ETHANOL_TO_BROMO, ['NaOH(aq)', 'Br₂', 'MnO₄⁻ / H⁺'], {
      seed: 223, explain: 'Concentrated HBr swaps the OH for Br.',
      errorClasses: { 1: 'reversed', 2: 'wrong-reagent', 3: 'wrong-type' },
    }),
    completeEquation(SUB_CHLOROETHANE, ['H₂O', 'HCl', 'H₂'], { seed: 231, explain: 'Chlorine plus sodium: NaCl.' }),
    completeEquation(SUB_BROMOPROPANE, ['H₂O', 'HBr', 'CO₂'], { seed: 232, explain: 'Bromine plus sodium: NaBr.' }),
    completeEquation(ETHANOL_TO_BROMO, ['NaBr', 'H₂', 'CO₂'], { seed: 233, explain: 'The OH leaves with the acid\u2019s H: water.' }),
    ...cpQ([HYDRATE_ETHENE, HYDRATE_PROPENE, SUB_CHLOROETHANE, SUB_BROMOPROPANE, ETHANOL_TO_BROMO], 240),
    nameProduct(HYDRATE_PROPENE, { hint: 'The OH lands on carbon 2.' }),
    nameProduct(SUB_BROMOPROPANE, { hint: 'Same position, new group.' }),
    nameProduct(ETHANOL_TO_BROMO, { hint: 'halo- prefix, two carbons.' }),
    drawProduct(SUB_CHLOROETHANE, { hint: 'Two carbons with an OH on the end.' }),
    drawProduct(HYDRATE_PROPENE, { hint: 'Three carbons, OH in the middle.' }),
    drawProduct(SUB_BROMOPROPANE, { hint: 'Three carbons, OH on carbon 1.' }),
    drawProduct(HYDRATE_ETHENE, { hint: 'Two carbons and an OH.' }),
    classifyCarbon('hexan-3-ol', 3, { seed: 208, explain: 'Two carbon neighbours either side: secondary.' })
  ),
};

const R4_CP = {
  id: 'r04-cp',
  title: 'Checkpoint: the oxidation ladder',
  teaches: ['reactions', 'priority'],
  checkpoint: true,
  ask: 15,
  steps: [],
  pool: pool(
    classifyCarbon('ethanol', 1, { seed: 301, explain: 'Primary: two rungs available.' }),
    classifyCarbon('propan-2-ol', 2, { seed: 302, explain: 'Secondary: one rung.' }),
    classifyCarbon('2-methylpropan-2-ol', 2, { seed: 303, explain: 'Tertiary: no rungs.' }),
    classifyCarbon('butan-2-ol', 2, { seed: 304, explain: 'Secondary.' }),
    classifyCarbon('pentan-1-ol', 1, { seed: 305, explain: 'Primary.' }),
    classifyCarbon('2-methylbutan-2-ol', 2, { seed: 306, explain: 'Tertiary: dichromate stays orange.' }),
    predictProductName(OX_1_ALD, ['propanoic acid', 'propan-2-one', 'propene'], {
      seed: 311, explain: 'Distilled off early: the aldehyde.',
      errorClasses: { 1: 'wrong-degree', 2: 'wrong-position', 3: 'wrong-type' },
    }),
    predictProductName(OX_ALD_ACID, ['propanal', 'propan-1-ol', 'propan-2-one'], {
      seed: 312, explain: 'The aldehyde climbs to the acid.',
      errorClasses: { 1: 'reversed', 2: 'reversed', 3: 'wrong-position' },
    }),
    predictProductName(OX_ETHANOL_ACID, ['ethanal', 'ethene', 'methanol'], {
      seed: 313, explain: 'Reflux, excess oxidant: all the way to ethanoic acid.',
      errorClasses: { 1: 'wrong-degree', 2: 'wrong-type', 3: 'wrong-family' },
    }),
    predictProductName(OX_2_KETONE, ['propanal', 'propanoic acid', 'propene'], {
      seed: 314, explain: 'Secondary: the ketone, then it stops.',
      errorClasses: { 1: 'wrong-degree', 2: 'wrong-degree', 3: 'wrong-type' },
    }),
    predictProductName(OX_BUTANOL_KETONE, ['butanal', 'butanoic acid', 'butan-1-ol'], {
      seed: 315, explain: 'butan-2-one, one rung.',
      errorClasses: { 1: 'wrong-degree', 2: 'wrong-degree', 3: 'reversed' },
    }),
    pickReagent(OX_ETHANOL_ACID, ['H₂O / H₂SO₄', 'NaOH(aq)', 'HBr (conc.)'], {
      seed: 321, explain: 'Only the acidified oxidants oxidise.',
      errorClasses: { 1: 'wrong-type', 2: 'wrong-type', 3: 'wrong-type' },
    }),
    pickReagent(OX_2_KETONE, ['H₂ / Ni', 'NH₃', 'H₂SO₄ (conc.)'], {
      seed: 322, explain: 'Acidified dichromate. Nothing else on this list oxidises.',
      errorClasses: { 1: 'wrong-type', 2: 'wrong-type', 3: 'wrong-type' },
    }),
    completeEquation(OX_1_ALD, ['H₂', 'CO₂', 'HBr'], { seed: 331, explain: 'The lost hydrogens leave as water.' }),
    completeEquation(OX_2_KETONE, ['H₂', 'CO₂', 'HCl'], { seed: 332, explain: 'Water again: two hydrogens and the oxidant\u2019s oxygen.' }),
    ...cpQ([OX_1_ALD, OX_ALD_ACID, OX_ETHANOL_ACID, OX_2_KETONE, OX_BUTANOL_KETONE], 340),
    nameProduct(OX_1_ALD, { hint: '-ol to -al.' }),
    nameProduct(OX_ETHANOL_ACID, { hint: 'Both rungs: -oic acid.' }),
    nameProduct(OX_2_KETONE, { hint: '-ol to -one, locant kept.' }),
    nameProduct(OX_BUTANOL_KETONE, { hint: 'Four carbons, ketone at 2.' }),
    drawProduct(OX_1_ALD, { hint: 'Three carbons ending in a C=O with its H.' }),
    drawProduct(OX_2_KETONE, { hint: 'C=O on the middle carbon.' }),
    drawProduct(OX_ETHANOL_ACID, { hint: 'COOH on a two-carbon chain.' }),
    classifyCarbon('hexan-3-ol', 3, { seed: 307, explain: 'Secondary: one rung.' }),
    predictProduct(OX_2_KETONE, ['propan-1-ol', 'propanal', 'propanoic acid'], {
      seed: 316, explain: 'The C=O forms where the OH was: propan-2-one.',
      errorClasses: { 1: 'reversed', 2: 'wrong-position', 3: 'wrong-degree' },
    }),
    drawProduct(OX_BUTANOL_KETONE, { hint: 'Four carbons, C=O at position 2.' })
  ),
};

const R5_CP = {
  id: 'r05-cp',
  title: 'Checkpoint: esters made and unmade',
  teaches: ['reactions', 'groups', 'properties'],
  checkpoint: true,
  ask: 15,
  steps: [],
  pool: pool(
    predictProductName(ESTER_ETHYL, ['ethyl propanoate', 'methyl ethanoate', 'ethanal'], {
      seed: 401, explain: 'ethanoic acid + ethanol: ethyl ethanoate.',
      errorClasses: { 1: 'reversed', 2: 'reversed', 3: 'wrong-type' },
    }),
    predictProductName(ESTER_METHYL, ['propyl methanoate', 'methyl ethanoate', 'propanal'], {
      seed: 402, explain: 'methyl from the alcohol, propanoate from the acid.',
      errorClasses: { 1: 'reversed', 2: 'reversed', 3: 'wrong-type' },
    }),
    predictProductName(HYDROLYSE_ETHYL, ['ethanal', 'methyl ethanoate', 'ethene'], {
      seed: 403, explain: 'The acid returns: ethanoic acid, with ethanol beside it.',
      errorClasses: { 1: 'wrong-type', 2: 'reversed', 3: 'wrong-type' },
    }),
    pickReagent(ESTER_ETHYL, ['H₂O / H⁺', 'Cr₂O₇²⁻ / H⁺', 'NaOH(aq)'], {
      seed: 411, explain: 'Concentrated sulfuric acid, reflux: the ester forms.',
      errorClasses: { 1: 'reversed', 2: 'wrong-type', 3: 'wrong-reagent' },
    }),
    pickReagent(HYDROLYSE_ETHYL, ['H₂SO₄ (conc.)', 'MnO₄⁻ / H⁺', 'H₂ / Ni'], {
      seed: 412, explain: 'Dilute acid with water splits the ester.',
      errorClasses: { 1: 'reversed', 2: 'wrong-type', 3: 'wrong-type' },
    }),
    completeEquation(ESTER_ETHYL, ['H₂', 'CO₂', 'HCl'], { seed: 421, explain: 'Condensation always expels water.' }),
    completeEquation(ESTER_METHYL, ['HBr', 'H₂', 'CO₂'], { seed: 422, explain: 'Water, every time.' }),
    completeEquation(HYDROLYSE_ETHYL, ['H₂O', 'H₂', 'CO₂'], { seed: 423, explain: 'The other product is the parent alcohol: ethanol.' }),
    ...cpQ([ESTER_ETHYL, ESTER_METHYL, HYDROLYSE_ETHYL], 430),
    nameProduct(ESTER_ETHYL, { hint: '-yl then -oate.' }),
    nameProduct(ESTER_METHYL, { hint: 'The alcohol half is one carbon.' }),
    nameProduct(HYDROLYSE_ETHYL, { hint: 'The -oate half, as its acid.' }),
    drawProduct(ESTER_ETHYL, { hint: 'CH₃-CO-O-CH₂-CH₃.' }),
    {
      id: 'r05-cp-bp1',
      type: 'mcName',
      chip: 'PREDICT THE PROPERTY',
      prompt: 'Same carbon count: which boils highest?',
      options: ['pentane', 'pentanal', 'pentan-1-ol', 'pentanoic acid'],
      answer: 3,
      explain: 'The acid\u2019s paired hydrogen bonds win every time.',
      errorClasses: { 0: 'inverted', 1: 'adjacent-swap', 2: 'adjacent-swap' },
      category: 'molecule-type',
    },
    {
      id: 'r05-cp-bp2',
      type: 'mcName',
      chip: 'PREDICT THE PROPERTY',
      prompt: 'Why is ethyl ethanoate far more volatile than the acid it came from?',
      options: [
        'It is lighter',
        'Making it destroyed the O–H, so it cannot hydrogen-bond',
        'Esters repel each other',
        'The sulfuric acid is still dissolved in it',
      ],
      answer: 1,
      explain: 'The O–H went into the water that left. No donor, weak grip, easy escape — which is why you can smell it.',
      errorClasses: { 0: 'right-answer-wrong-reason', 2: 'right-answer-wrong-reason', 3: 'right-answer-wrong-reason' },
      category: 'molecule-type',
    },
    classifyCarbon('ethanol', 1, { seed: 431, explain: 'Primary — though esterification does not care.' }),
    classifyCarbon('propan-2-ol', 2, { seed: 432, explain: 'Secondary.' }),
    classifyCarbon('2-methylpropan-2-ol', 2, { seed: 433, explain: 'Tertiary.' }),
    classifyCarbon('butan-1-ol', 1, { seed: 434, explain: 'Primary.' }),
    predictProduct(ESTER_ETHYL, ['methyl propanoate', 'ethanol', 'ethanoic acid'], {
      seed: 404, explain: 'Four carbons, ester link in the middle: ethyl ethanoate.',
      errorClasses: { 1: 'reversed', 2: 'reversed', 3: 'reversed' },
    }),
    predictProduct(HYDROLYSE_ETHYL, ['ethyl ethanoate', 'ethanal', 'methanol'], {
      seed: 405, explain: 'The acid half returns: ethanoic acid.',
      errorClasses: { 1: 'reversed', 2: 'wrong-type', 3: 'wrong-family' },
    }),
    drawProduct(ESTER_METHYL, { hint: 'CH₃-O-CO-CH₂-CH₃, four carbons in all.' }),
    drawProduct(HYDROLYSE_ETHYL, { hint: 'Two carbons, COOH.' }),
    nameProduct(ESTER_METHYL, { hint: 'methyl, then the acid as -oate.' }),
    completeEquation(ESTER_ETHYL, ['NaCl', 'H₂', 'HBr'], { seed: 424, explain: 'Water out, as in every condensation.' }),
    classifyReaction(HYDROLYSE_ETHYL, { seed: 435, explain: 'Water in, one molecule becomes two: hydrolysis.' }),
    classifyReaction(ESTER_METHYL, { seed: 436, explain: 'Condensation: join, water out.' }),
    {
      id: 'r05-cp-bp3',
      type: 'mcName',
      chip: 'PREDICT THE PROPERTY',
      prompt: 'Rank by boiling point, lowest first: same two carbons each.',
      options: [
        'ethane < ethanal < ethanol < ethanoic acid',
        'ethanal < ethane < ethanol < ethanoic acid',
        'ethanoic acid < ethanol < ethanal < ethane',
        'ethane < ethanol < ethanal < ethanoic acid',
      ],
      answer: 0,
      explain: 'Dispersion, polar C=O, hydrogen bond, paired hydrogen bonds: the ladder in force form.',
      errorClasses: { 1: 'adjacent-swap', 2: 'inverted', 3: 'adjacent-swap' },
      category: 'molecule-type',
    }
  ),
};

// ── The units ────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// R8 · Reaction pathways — the capstone.
//
// Tiles are the labels of REGISTERED reactions, via tileLabelOf(), so a tile
// can only ever do what an engine-verified card says it does. The suite
// walks every authored route and searches every tile set: no shorter route
// hiding among the tiles, no unintended sibling at the same length — unless
// the card declares routes: 'any', which the design lesson does on purpose.
// ─────────────────────────────────────────────────────────────

const TILE = {
  hydrate: tileLabelOf(HYDRATE_ETHENE),
  naoh: tileLabelOf(SUB_CHLOROETHANE),
  hbr: tileLabelOf(ETHANOL_TO_BROMO),
  oxCr: tileLabelOf(OX_1_ALD),
  oxMn: tileLabelOf(OX_ETHANOL_ACID),
  estEthanol: tileLabelOf(ESTER_ETHYL),
  estMethanol: tileLabelOf(ESTER_METHYL),
  hydrolyse: tileLabelOf(HYDROLYSE_ETHYL),
};

const R8_L1 = {
  id: 'r08-l1',
  title: 'Reading a pathway',
  teaches: ['reactions', 'pathways'],
  ask: 8,
  steps: [
    T(
      'Reactions chain',
      'Every reaction you know turns one family into another. Chain them and you can build [[molecules]] to order:\n\nalkene → alcohol → carboxylic acid → ester.\n\nThat chain is the classic backbone, and it is the single most examined idea in this whole strand. Each arrow is one reaction you have already met — reading a pathway is just reading them in a row.',
      { rxn: HYDRATE_ETHENE, caption: 'Step one of the backbone: ethene hydrates to ethanol.' }
    ),
    T(
      'The same molecule, seen twice',
      'The ethanol that just formed is the starting material of the next arrow: oxidise it and the acid appears.\n\nA pathway is nothing more than this — the product of one step standing at the head of the next. Intermediates are [[molecules]] with two jobs.',
      { rxn: OX_ETHANOL_ACID, caption: 'Step two: the ethanol from step one climbs the ladder to ethanoic acid.' }
    ),
    T(
      'And the final join',
      'The acid condenses with more ethanol to give the ester. Three steps, three reactions you already knew, one designed [[molecule]].\n\nFrom here the questions run backwards too: given a target, which arrows reach it?',
      { rxn: ESTER_ETHYL, caption: 'Step three: ethanoic acid + ethanol → ethyl ethanoate. The backbone, complete.' }
    ),
    { type: 'question', q: classifyReaction(OX_ETHANOL_ACID, { seed: 501, explain: 'The middle arrow of the backbone is an oxidation.' }) },
  ],
  pool: pool(
    predictProductName(HYDRATE_ETHENE, ['ethane', 'ethanal', 'chloroethane'], {
      seed: 511, explain: 'Water across the double bond: ethanol, the first intermediate of the backbone.',
      errorClasses: { 1: 'wrong-reagent', 2: 'wrong-type', 3: 'wrong-reagent' },
    }),
    predictProductName(OX_ETHANOL_ACID, ['ethanal', 'ethene', 'ethyl ethanoate'], {
      seed: 512, explain: 'Reflux with excess oxidant: the acid, ready for the final join.',
      errorClasses: { 1: 'wrong-degree', 2: 'reversed', 3: 'confused-condensation' },
    }),
    predictProductName(ESTER_ETHYL, ['methyl ethanoate', 'ethanoic acid', 'ethanal'], {
      seed: 513, explain: 'The acid and the alcohol join: ethyl ethanoate.',
      errorClasses: { 1: 'reversed', 2: 'reversed', 3: 'wrong-type' },
    }),
    pickReagent(OX_ETHANOL_ACID, ['H₂O / H₂SO₄', 'H₂SO₄ (conc.)', 'NaOH(aq)'], {
      seed: 514, explain: 'The middle arrow needs an oxidant. The concentrated acid is step three\u2019s catalyst, not an oxidant.',
      errorClasses: { 1: 'wrong-type', 2: 'confused-condensation', 3: 'wrong-type' },
    }),
    classifyReaction(HYDRATE_ETHENE, { seed: 515, explain: 'Addition opens the backbone.' }),
    classifyReaction(ESTER_ETHYL, { seed: 516, explain: 'Condensation closes it.' }),
    nameProduct(OX_ETHANOL_ACID, { hint: 'Two carbons, -oic acid.' }),
    completeEquation(ESTER_ETHYL, ['H₂', 'HCl', 'CO₂'], { seed: 517, explain: 'The backbone\u2019s final step expels water, as every condensation does.' })
  ),
};

const R8_L2 = {
  id: 'r08-l2',
  title: 'Two steps at once',
  teaches: ['reactions', 'pathways'],
  ask: 4,
  steps: [
    T(
      'Now you place the arrows',
      'From here the question is the exam\u2019s favourite shape: here is the start, here is the target — build the route.\n\nTap a reagent tile to drop it into a step. The intermediate it makes appears as you go, so a wrong turn shows itself immediately: a tile that has no reaction from where you stand comes up red.\n\nTap a filled step to take the tile back out.',
      { rxn: SUB_CHLOROETHANE, caption: 'One of the arrows on your shelf: hydroxide swaps the halogen out.' }
    ),
    {
      type: 'question',
      q: pathwayQ({
        from: 'chloroethane', to: 'ethanoic acid', steps: 2,
        tiles: [TILE.naoh, TILE.oxMn, TILE.hbr],
        route: [TILE.naoh, TILE.oxMn],
        seedNote: 'first guided route',
        explain: 'Substitute to the alcohol first — nothing oxidises a haloalkane. Then the ladder takes the primary alcohol to the acid.',
      }),
    },
  ],
  pool: pool(
    pathwayQ({
      from: 'chloroethane', to: 'ethanoic acid', steps: 2,
      tiles: [TILE.naoh, TILE.oxMn, TILE.hbr],
      route: [TILE.naoh, TILE.oxMn],
      explain: 'Hydroxide first, oxidant second: haloalkane → alcohol → acid.',
    }),
    pathwayQ({
      from: 'ethene', to: 'ethanoic acid', steps: 2,
      tiles: [TILE.hydrate, TILE.oxMn, TILE.naoh],
      route: [TILE.hydrate, TILE.oxMn],
      explain: 'Hydrate the alkene, then oxidise. The hydroxide tile is a distractor: there is no halogen anywhere in this route.',
    }),
    pathwayQ({
      from: 'ethene', to: 'bromoethane', steps: 2,
      tiles: [TILE.hydrate, TILE.hbr, TILE.oxCr],
      route: [TILE.hydrate, TILE.hbr],
      explain: 'Through the alcohol: hydrate, then swap the OH for Br. Oxidising the alcohol instead is a dead end — nothing turns an aldehyde into a haloalkane.',
    }),
    pathwayQ({
      from: '1-bromopropane', to: 'propanal', steps: 2,
      tiles: [TILE.naoh, TILE.oxCr, TILE.hbr],
      route: [TILE.naoh, TILE.oxCr],
      explain: 'Substitute to propan-1-ol, then one careful rung of the ladder, distilling as it forms.',
    })
  ),
};

const R8_L3 = {
  id: 'r08-l3',
  title: 'Three steps and a full backbone',
  teaches: ['reactions', 'pathways'],
  ask: 4,
  steps: [
    T(
      'The full journey',
      'Three steps now. The shape of the thinking does not change — stand at the start, ask what each tile can do from where you are, and keep the target in view.\n\nWorking backwards from the target is often faster: an ester needs an acid and an alcohol; an acid needs a primary alcohol below it; and so on up the page.',
      { rxn: ESTER_ETHYL, caption: 'To end here, the step before must hand you the acid — and ethanol to join it with.' }
    ),
    {
      type: 'question',
      q: pathwayQ({
        from: 'ethene', to: 'ethyl ethanoate', steps: 3,
        tiles: [TILE.hydrate, TILE.oxMn, TILE.estEthanol, TILE.hbr],
        route: [TILE.hydrate, TILE.oxMn, TILE.estEthanol],
        explain: 'The classic backbone in full: hydrate, oxidise, esterify. The HBr tile leads off the road entirely.',
      }),
    },
  ],
  pool: pool(
    pathwayQ({
      from: 'ethene', to: 'ethyl ethanoate', steps: 3,
      tiles: [TILE.hydrate, TILE.oxMn, TILE.estEthanol, TILE.hbr],
      route: [TILE.hydrate, TILE.oxMn, TILE.estEthanol],
      explain: 'Hydrate, oxidise, esterify — the backbone.',
    }),
    pathwayQ({
      from: 'chloroethane', to: 'ethyl ethanoate', steps: 3,
      tiles: [TILE.naoh, TILE.oxMn, TILE.estEthanol, TILE.oxCr],
      route: [TILE.naoh, TILE.oxMn, TILE.estEthanol],
      explain: 'Substitute in the OH, climb to the acid, join with ethanol. The dichromate tile stalls at propanal-style half-oxidation — this route needs the acid.',
    }),
    pathwayQ({
      from: '1-bromopropane', to: 'methyl propanoate', steps: 3,
      tiles: [TILE.naoh, TILE.oxMn, TILE.estMethanol, TILE.hbr],
      route: [TILE.naoh, TILE.oxMn, TILE.estMethanol],
      explain: 'To the alcohol, up the ladder, and methanol supplies the -yl half.',
    }),
    pathwayQ({
      from: 'ethyl ethanoate', to: 'methyl ethanoate', steps: 2,
      tiles: [TILE.hydrolyse, TILE.estMethanol, TILE.hbr, TILE.oxMn],
      route: [TILE.hydrolyse, TILE.estMethanol],
      prompt: 'Swap the ester\u2019s alcohol: reach methyl ethanoate in 2 steps.',
      explain: 'Take it apart, put it back together differently: hydrolyse to the acid, then condense with methanol instead. Pathways run backwards as well as forwards.',
    })
  ),
};

const R8_CP = {
  id: 'r08-cp',
  title: 'Checkpoint: pathways',
  teaches: ['reactions', 'pathways'],
  checkpoint: true,
  ask: 15,
  steps: [],
  pool: pool(
    pathwayQ({
      from: 'ethene', to: 'ethanoic acid', steps: 2,
      tiles: [TILE.hydrate, TILE.oxMn, TILE.hbr],
      route: [TILE.hydrate, TILE.oxMn],
      explain: 'Hydrate, then oxidise.',
    }),
    pathwayQ({
      from: 'chloroethane', to: 'bromoethane', steps: 2,
      tiles: [TILE.naoh, TILE.hbr, TILE.oxCr],
      route: [TILE.naoh, TILE.hbr],
      explain: 'Through the alcohol: OH in, then Br for OH. No reaction swaps one halogen straight for another here.',
    }),
    pathwayQ({
      from: 'ethene', to: 'ethyl ethanoate', steps: 3,
      tiles: [TILE.hydrate, TILE.oxMn, TILE.estEthanol, TILE.naoh],
      route: [TILE.hydrate, TILE.oxMn, TILE.estEthanol],
      explain: 'The backbone: hydrate, oxidise, esterify.',
    }),
    pathwayQ({
      from: '1-bromopropane', to: 'propanoic acid', steps: 2,
      tiles: [TILE.naoh, TILE.oxMn, TILE.estMethanol],
      route: [TILE.naoh, TILE.oxMn],
      explain: 'Substitute, then the full climb.',
    }),
    predictProductName(PROPANOL_TO_BROMO, ['propan-2-ol', 'propane', 'propanal'], {
      seed: 601, explain: 'The OH swaps for Br at the same carbon: 1-bromopropane.',
      errorClasses: { 1: 'wrong-position', 2: 'wrong-type', 3: 'wrong-type' },
    }),
    predictProductName(OX_BUTANOL_ALD, ['butanoic acid', 'butan-2-one', 'butane'], {
      seed: 602, explain: 'Distilled off as it forms: butanal.',
      errorClasses: { 1: 'wrong-degree', 2: 'wrong-position', 3: 'wrong-type' },
    }),
    predictProductName(ESTER_ETHYL_BUT, ['butyl ethanoate', 'ethyl propanoate', 'butanal'], {
      seed: 603, explain: 'butanoic acid gives the -oate; ethanol gives the -yl: ethyl butanoate. Reversed is a different ester.',
      errorClasses: { 1: 'reversed', 2: 'wrong-family', 3: 'wrong-type' },
    }),
    pickReagent(SUB_CHLOROBUTANE, ['HBr (conc.)', 'Cr₂O₇²⁻ / H⁺', 'H₂O / H₂SO₄'], {
      seed: 604, explain: 'Aqueous hydroxide substitutes the chlorine for OH.',
      errorClasses: { 1: 'reversed', 2: 'wrong-type', 3: 'wrong-reagent' },
    }),
    classifyReaction(OX_BUTANOL_ACID, { seed: 605, explain: 'Both rungs of the ladder in one pot: oxidation.' }),
    classifyReaction(ESTER_ETHYL_BUT, { seed: 606, explain: 'Join with water out: condensation.' }),
    nameProduct(OX_BUTANOL_ACID, { hint: 'Four carbons, -oic acid.' }),
    nameProduct(SUB_CHLOROBUTANE, { hint: 'The OH takes carbon 1.' }),
    completeEquation(PROPANOL_TO_BROMO, ['NaBr', 'H₂', 'CO₂'], { seed: 607, explain: 'The OH leaves with the acid\u2019s hydrogen: water.' }),
    completeEquation(ESTER_ETHYL_BUT, ['H₂', 'HBr', 'NaCl'], { seed: 608, explain: 'Condensation: water, every time.' }),
    drawProduct(SUB_CHLOROBUTANE, { hint: 'Four carbons, OH on the end.' }),
    drawProduct(OX_BUTANOL_ALD, { hint: 'Four carbons ending in a C=O with its H.' }),
    pathwayQ({
      from: '1-chlorobutane', to: 'butanoic acid', steps: 2,
      tiles: [TILE.naoh, TILE.oxMn, TILE.hbr],
      route: [TILE.naoh, TILE.oxMn],
      explain: 'Substitute to butan-1-ol, then the full climb.',
    }),
    pathwayQ({
      from: '1-chlorobutane', to: 'ethyl butanoate', steps: 3,
      tiles: [TILE.naoh, TILE.oxMn, TILE.estEthanol, TILE.hbr],
      route: [TILE.naoh, TILE.oxMn, TILE.estEthanol],
      explain: 'The backbone on a four-carbon chain: substitute, oxidise, esterify with ethanol.',
    }),
    pathwayQ({
      from: '1-chlorobutane', to: 'butanal', steps: 2,
      tiles: [TILE.naoh, TILE.oxCr, TILE.estEthanol],
      route: [TILE.naoh, TILE.oxCr],
      explain: 'Substitute, then one careful rung — dichromate with the aldehyde distilled off.',
    }),
    pathwayQ({
      from: 'propene', to: 'propan-2-one', steps: 2,
      tiles: [tileLabelOf(HYDRATE_PROPENE), tileLabelOf(OX_2_KETONE), TILE.naoh],
      route: [tileLabelOf(HYDRATE_PROPENE), tileLabelOf(OX_2_KETONE)],
      explain: 'Hydration puts the OH on carbon 2 — secondary — so the ladder has exactly one rung: the ketone.',
    }),
    classifyReaction(PROPANOL_TO_BROMO, { seed: 611, explain: 'OH out, Br in: substitution.' }),
    classifyReaction(OX_BUTANOL_ALD, { seed: 612, explain: 'One rung up: oxidation.' }),
    classifyReaction(SUB_CHLOROBUTANE, { seed: 613, explain: 'Chlorine swapped for OH: substitution.' }),
    predictProduct(OX_BUTANOL_ACID, ['butanal', 'butan-2-one', 'butan-2-ol'], {
      seed: 614, explain: 'Reflux and excess oxidant: both rungs, butanoic acid.',
      errorClasses: { 1: 'wrong-degree', 2: 'wrong-position', 3: 'wrong-position' },
    }),
    predictProduct(SUB_CHLOROBUTANE, ['1-chlorobutane', 'butan-2-ol', 'butanal'], {
      seed: 615, explain: 'The OH takes the chlorine\u2019s carbon: butan-1-ol.',
      errorClasses: { 1: 'reversed', 2: 'wrong-position', 3: 'wrong-type' },
    }),
    pickReagent(OX_BUTANOL_ALD, ['MnO₄⁻ / H⁺', 'NaOH(aq)', 'H₂SO₄ (conc.)'], {
      seed: 616, explain: 'Dichromate with the product distilled off stops at the aldehyde; permanganate at reflux would keep going.',
      errorClasses: { 1: 'wrong-type', 2: 'wrong-type', 3: 'confused-condensation' },
    }),
    pickReagent(ESTER_ETHYL_BUT, ['H₂O / H⁺', 'Cr₂O₇²⁻ / H⁺', 'NH₃'], {
      seed: 617, explain: 'Esterification: concentrated sulfuric acid at reflux.',
      errorClasses: { 1: 'reversed', 2: 'wrong-type', 3: 'wrong-type' },
    }),
    nameProduct(OX_BUTANOL_ALD, { hint: 'Four carbons, -al.' }),
    nameProduct(ESTER_ETHYL_BUT, { hint: 'ethyl from the alcohol, butanoate from the acid.' }),
    completeEquation(SUB_CHLOROBUTANE, ['H₂O', 'HCl', 'H₂'], { seed: 618, explain: 'Chlorine and sodium leave together: NaCl.' }),
    classifyCarbon('butan-1-ol', 1, { seed: 619, explain: 'Primary: two rungs available, which is what the routes above rely on.' })
  ),
};

export const R8 = {
  id: 'r08-pathways',
  title: 'Reaction pathways',
  subtitle: 'From start material to target, step by step',
  lessons: [R8_L1, R8_L2, R8_L3, R8_CP],
};

export const R3 = {
  id: 'r03-making-alcohols',
  title: 'Where alcohols come from',
  subtitle: 'Classification, hydration, substitution',
  lessons: [R3_L1, R3_L2, R3_L3, R3_CP],
};

export const R4 = {
  id: 'r04-oxidation',
  title: 'Oxidation: climbing the ladder',
  subtitle: 'Primary twice, secondary once, tertiary never',
  lessons: [R4_L1, R4_L2, R4_L3, R4_CP],
};

export const R5 = {
  id: 'r05-esters-hydrolysis',
  title: 'Condensation and hydrolysis',
  subtitle: 'Esters made, esters unmade, and why they smell',
  lessons: [R5_L1, R5_L2, R5_L3, R5_CP],
};
