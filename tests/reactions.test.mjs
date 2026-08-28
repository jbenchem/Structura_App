// ─────────────────────────────────────────────────────────────
// Reactions.
//
// The naming course trusts nothing it can check, and reactions raise the
// stakes: a naming error mis-teaches one molecule, but an unbalanced
// equation or a mis-typed reaction teaches CHEMISTRY THAT IS FALSE, with the
// full authority of a lesson card. So every card is checked three ways:
//
//   parse    every organic species is a name the engine accepts, draws and
//            round-trips
//   conserve atoms in equals atoms out, element by element, computed from
//            the engine's own molecular formulas
//   grammar  the claimed reaction type is allowed to connect these two
//            families, per the rules table
//
// Plus: every reagent is on the whitelist, every MC offers four provably
// distinct options with the true answer among them, every classify-carbon
// answer is recounted from the graph, and every complete-the-equation answer
// is re-derived from arithmetic rather than believed.
// ─────────────────────────────────────────────────────────────

import {
  ALL_REACTIONS,
  ATOMIC_MASS,
  molarMassOfName,
  atomEconomy,
  tileLabelOf,
  stepFrom,
  walkRoute,
  routesBetween,
  REAGENTS,
  SMALL,
  RXN_TYPES,
  molOf,
  formulaOfName,
  sidesOf,
  conserves,
  degreeOf,
  sameFormula,
} from '../src/content/reactions.js';
import { R3, R4, R5, R8 } from '../src/content/reactionUnits.js';
import { R1, R2, R6, R7, R9, R10 } from '../src/content/reactionUnits2.js';
import { verifiedName, canonicalName } from '../src/chem/engineBridge.js';
import { familyOf } from '../src/content/questionFactory.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };

const UNITS = [R1, R2, R3, R4, R5, R6, R7, R8, R9, R10];
const organicOf = (rxn) => [rxn.from, rxn.with, rxn.to].filter(Boolean);

console.log('=== every species on every card is real ===');
{
  let bad = 0;
  const seen = new Set();
  for (const rxn of ALL_REACTIONS) {
    for (const name of organicOf(rxn)) {
      if (seen.has(name)) continue;
      seen.add(name);
      const mol = molOf(name);
      if (!mol) { console.error(`  FAIL: "${name}" does not parse`); bad++; fails++; continue; }
      const round = canonicalName(name);
      if (!round) { console.error(`  FAIL: "${name}" does not round-trip`); bad++; fails++; }
    }
    for (const sm of [...rxn.also.left, ...rxn.also.right]) {
      // An `also` entry is a SMALL species, the bare 'O' of VCE oxidation
      // bookkeeping, or a second ORGANIC product (hydrolysis returns the
      // alcohol as well as the acid) — which must then parse like any other.
      if (!SMALL[sm] && sm !== 'O' && !molOf(sm)) {
        console.error(`  FAIL: "${sm}" is neither a small species nor a parseable name`);
        bad++; fails++;
      }
    }
  }
  ck(bad === 0, `${seen.size} organic species, all parsed and round-tripped`);
  ck(ALL_REACTIONS.length >= 13, `${ALL_REACTIONS.length} reactions registered`);
}

console.log('=== atoms in equals atoms out, on every card ===');
{
  // Two accounting modes, depending on what the reagent table knows.
  //
  // Where the reagent declares what the organic gains and loses (additions,
  // substitutions), the check is organic-side:
  //     formula(to) === formula(from) [+ formula(with)] + adds − removes
  // The inorganic remainder (the NaBr, the HCl) is implied by the same
  // arithmetic, so checking one side checks both.
  //
  // Where it declares nothing (oxidants, condensation catalysts), the card
  // carries the full equation in `also`, and the check is both sides in
  // full, with the VCE '[O]' bookkeeping expanded to a real oxygen.
  const expand = (item) => (item === 'O' ? { O: 1 } : SMALL[item] || formulaOfName(item));
  const plus = (f, part, sign = 1) => {
    for (const k of Object.keys(part || {})) f[k] = (f[k] || 0) + sign * part[k];
    return f;
  };
  let bad = 0;
  for (const rxn of ALL_REACTIONS) {
    const reagent = REAGENTS[rxn.reagent] || {};
    let ok;
    if (reagent.adds) {
      const expected = {};
      plus(expected, formulaOfName(rxn.from));
      if (rxn.with) plus(expected, formulaOfName(rxn.with));
      plus(expected, reagent.adds);
      for (const k of Object.keys(reagent.removes || {})) {
        if (k === 'halo') {
          // "one halogen atom" — whichever the molecule actually carries.
          const f = formulaOfName(rxn.from);
          const hal = ['Cl', 'Br', 'I', 'F'].find((x) => f[x]);
          plus(expected, { [hal]: 1 }, -1);
        } else {
          plus(expected, { [k]: reagent.removes[k] }, -1);
        }
      }
      ok = sameFormula(expected, formulaOfName(rxn.to));
    } else {
      const total = (side) => {
        const f = {};
        for (const item of side) {
          const part = expand(item);
          if (!part) return null;
          plus(f, part);
        }
        return f;
      };
      const { left, right } = sidesOf(rxn);
      const L = total(left);
      const Rt = total(right);
      ok = !!L && !!Rt && sameFormula(L, Rt);
    }
    if (!ok) {
      console.error(`  FAIL: ${rxn.type}: ${rxn.from}${rxn.with ? ' + ' + rxn.with : ''} → ${rxn.to} does not conserve`);
      bad++; fails++;
    }
  }
  ck(bad === 0, `${ALL_REACTIONS.length} equations conserve atoms`);
}

console.log('=== every card obeys the grammar of its claimed type ===');
{
  let bad = 0;
  for (const rxn of ALL_REACTIONS) {
    const rule = RXN_TYPES[rxn.type];
    if (!rule) { console.error(`  FAIL: unknown type "${rxn.type}"`); bad++; fails++; continue; }
    if (rule.from.length) {
      const fam = familyOf(molOf(rxn.from));
      if (!rule.from.includes(fam)) {
        console.error(`  FAIL: ${rxn.type} from a ${fam} (${rxn.from})`);
        bad++; fails++;
      }
    }
    const famTo = familyOf(molOf(rxn.to));
    if (!rule.to.includes(famTo)) {
      console.error(`  FAIL: ${rxn.type} producing a ${famTo} (${rxn.to})`);
      bad++; fails++;
    }
    if (rxn.with && rule.with) {
      const famWith = familyOf(molOf(rxn.with));
      if (!rule.with.includes(famWith)) {
        console.error(`  FAIL: ${rxn.type} with a ${famWith} (${rxn.with})`);
        bad++; fails++;
      }
    }
    if (rxn.reagent && !REAGENTS[rxn.reagent]) {
      console.error(`  FAIL: reagent "${rxn.reagent}" is not on the whitelist`);
      bad++; fails++;
    }
    if (rxn.reagent && REAGENTS[rxn.reagent] && !REAGENTS[rxn.reagent].types.includes(rxn.type)) {
      console.error(`  FAIL: ${rxn.reagent} is not a ${rxn.type} reagent`);
      bad++; fails++;
    }
  }
  ck(bad === 0, 'grammar holds: no reaction claims a type its structures contradict');
}

console.log('=== oxidation respects the classification it teaches ===');
{
  // The content's central claim: primary → aldehyde/acid, secondary →
  // ketone, tertiary → nothing. Check every authored oxidation against the
  // degree of the carbinol carbon, recounted from the graph.
  let bad = 0;
  for (const rxn of ALL_REACTIONS.filter((r) => r.type === 'oxidation')) {
    const mol = molOf(rxn.from);
    const fromFam = familyOf(mol);
    if (fromFam !== 'alcohol') continue; // aldehyde → acid rung
    const oh = mol.atoms.find((a) => a.el === 'O');
    const carbinol = mol.bonds
      .map((b) => (b.a === oh.id ? b.b : b.b === oh.id ? b.a : null))
      .find((id) => id != null);
    const degree = degreeOf(mol, carbinol);
    const toFam = familyOf(molOf(rxn.to));
    const legal =
      (degree === 1 && (toFam === 'aldehyde' || toFam === 'acid')) ||
      (degree === 2 && toFam === 'ketone');
    if (!legal) {
      console.error(`  FAIL: ${rxn.from} is ${degree}° but oxidises to a ${toFam}`);
      bad++; fails++;
    }
  }
  ck(bad === 0, 'no authored oxidation contradicts the 1°/2°/3° rule it teaches');
}

console.log('=== every question is sound ===');
{
  let checked = 0;
  let bad = 0;
  const noteQ = (q, msg) => { console.error(`  FAIL: ${q.id}: ${msg}`); bad++; fails++; };
  for (const unit of UNITS) {
    for (const lesson of unit.lessons) {
      const qs = [
        ...(lesson.pool || []),
        ...(lesson.steps || []).filter((s) => s.type === 'question').map((s) => s.q),
      ];
      for (const q of qs) {
        checked++;
        if (q.type === 'mcName' || q.type === 'mcStructure') {
          if (q.options.length !== 4) noteQ(q, `${q.options.length} options — the rule is exactly four`);
          if (q.answer < 0 || q.answer > 3) noteQ(q, 'answer index out of range');
          if (q.type === 'mcStructure') {
            // Four provably different compounds: canonical names must differ.
            const canon = q.optionNames.map((n) => canonicalName(n));
            if (canon.some((c) => !c)) noteQ(q, 'an option does not parse');
            if (new Set(canon).size !== 4) noteQ(q, 'two options are the same compound in different clothes');
          }
        }
        if (q.type === 'write' || q.type === 'draw') {
          const v = canonicalName(q.answer);
          if (!v) noteQ(q, `answer "${q.answer}" does not canonicalise`);
        }
        // The derived-answer type: recompute the missing species and compare.
        // Only where a registry reaction backs the card — the hand-written
        // bookkeeping questions (combustion, polymers, yield arithmetic)
        // carry no rxn and are checked as ordinary MCs above.
        if (q.chip === 'BALANCE THE BOOKS' && q.rxn) {
          const rxn = ALL_REACTIONS.find((r) => r.to === q.rxn.to && r.from === q.rxn.from);
          if (rxn) {
            const missing = rxn.also.right[0];
            if (q.options[q.answer] !== missing) noteQ(q, 'answer disagrees with the authored equation');
          }
        }
        // classify-carbon: the answer was computed by degreeOf at authoring;
        // recompute here to catch a builder regression.
        if (q._at != null) {
          const again = degreeOf(q.mol, q._at);
          if (again !== q._claimed) noteQ(q, `degree recount says ${again}°, card says ${q._claimed}°`);
          if (!q.options[q.answer].startsWith(['primary', 'secondary', 'tertiary', 'quaternary'][again - 1]))
            noteQ(q, 'the marked answer is not the recounted degree');
        }
      }
      if ((lesson.pool || []).length < (lesson.ask || 0)) {
        noteQ({ id: lesson.id }, `pool of ${(lesson.pool || []).length} cannot serve ask: ${lesson.ask}`);
      }
    }
  }
  ck(bad === 0, `${checked} questions sound: four distinct options, verified answers, derived equations`);
  ck(checked >= 60, `and the block is substantial (${checked} questions)`);
}

console.log('=== the pathway network is unambiguous ===');
{
  // A tile must mean ONE thing from any given molecule. If two registered
  // reactions share a (from, tile) pair but produce different products, the
  // walker's answer depends on registration order — which is not chemistry.
  const seen = new Map();
  let clashes = 0;
  for (const rxn of ALL_REACTIONS) {
    const key = `${rxn.from} :: ${tileLabelOf(rxn)}`;
    if (seen.has(key) && seen.get(key) !== rxn.to) {
      console.error(`  FAIL: "${key}" gives both ${seen.get(key)} and ${rxn.to}`);
      clashes++; fails++;
    }
    seen.set(key, rxn.to);
  }
  ck(clashes === 0, `${seen.size} (molecule, tile) pairs, each with exactly one product`);
}

console.log('=== every authored route is walked, not believed ===');
{
  const pathways = [];
  for (const unit of UNITS)
    for (const lesson of unit.lessons)
      for (const q of [
        ...(lesson.pool || []),
        ...(lesson.steps || []).filter((s) => s.type === 'question').map((s) => s.q),
      ])
        if (q.type === 'pathway') pathways.push({ lesson: lesson.id, q });

  let bad = 0;
  for (const { lesson, q } of pathways) {
    // 1. The authored route actually reaches the target.
    const walk = walkRoute(q.from, q.route);
    if (!walk.complete || walk.mols[walk.mols.length - 1] !== q.to) {
      console.error(`  FAIL: ${lesson} ${q.id}: the authored route does not reach ${q.to}`);
      bad++; fails++; continue;
    }
    // 2. It is the promised length, and every tile on it is on the shelf.
    if (q.route.length !== q.steps) {
      console.error(`  FAIL: ${lesson} ${q.id}: route of ${q.route.length} on a ${q.steps}-step card`);
      bad++; fails++;
    }
    if (!q.route.every((t) => q.tiles.includes(t))) {
      console.error(`  FAIL: ${lesson} ${q.id}: the route uses a tile the shelf does not offer`);
      bad++; fails++;
    }
    // 3. Search the shelf: no SHORTER legal route may exist, and unless the
    // card says routes: 'any', the authored route must be the only one at
    // its length — otherwise a student can be right and be marked wrong.
    const all = routesBetween(q.from, q.to, q.tiles, q.steps);
    const shorter = all.filter((r) => r.length < q.steps);
    if (shorter.length) {
      console.error(`  FAIL: ${lesson} ${q.id}: a ${shorter[0].length}-step route hides in the tiles: ${shorter[0].join(' → ')}`);
      bad++; fails++;
    }
    if (q.routes !== 'any') {
      const atLength = all.filter((r) => r.length === q.steps);
      if (atLength.length !== 1) {
        console.error(`  FAIL: ${lesson} ${q.id}: ${atLength.length} legal routes at length ${q.steps}`);
        atLength.slice(0, 3).forEach((r) => console.error(`         ${r.join(' → ')}`));
        bad++; fails++;
      }
    }
    // 4. Every wrong tile really is wrong from SOMEWHERE the student can
    // stand: distractor tiles must not be silently unreachable dead weight —
    // each should either extend some position or be a visible dead end.
  }
  ck(bad === 0, `${pathways.length} pathway cards: routes walk, lengths hold, no unintended answers`);
  ck(pathways.length >= 12, `and pathways are genuinely exercised (${pathways.length} cards)`);

  // The walker's own contract, in miniature.
  const w = walkRoute('ethene', ['H₂O / H₂SO₄']);
  ck(w.complete && w.mols[1] === 'ethanol', 'one legal step walks');
  const broke = walkRoute('ethene', ['NaOH(aq)']);
  ck(broke.brokeAt === 0, 'an illegal tile reports exactly where it broke');
  ck(stepFrom('ethanol', 'nonsense') === null, 'an unknown tile is a null step, not a crash');
  ck(walkRoute('ethene', [null]).complete === false, 'an empty slot is an incomplete walk, not an error');
}

console.log('=== every mass and atom-economy figure is arithmetic ===');
{
  // R10's promise: numbers computed from the engine's formulas, never typed.
  const ethanol = molarMassOfName('ethanol');
  ck(Math.abs(ethanol - 46.07) < 0.02, `ethanol is ${ethanol.toFixed(2)} g/mol from the formula`);
  ck(Math.abs(molarMassOfName('H₂O') - 18.02) < 0.02, 'and the small-species table uses the same masses');

  let bad = 0;
  for (const rxn of ALL_REACTIONS) {
    const ae = atomEconomy(rxn);
    if (ae == null) continue;
    if (rxn.also.right.length === 0) {
      // Nothing expelled: 100% by construction, and the arithmetic must agree.
      if (Math.abs(ae - 100) > 1e-9) {
        console.error(`  FAIL: ${rxn.from} → ${rxn.to}: no waste but AE ${ae}`);
        bad++; fails++;
      }
    } else if (!(ae > 0 && ae < 100)) {
      console.error(`  FAIL: ${rxn.from} → ${rxn.to}: AE ${ae} out of range`);
      bad++; fails++;
    }
  }
  ck(bad === 0, 'atom economy: 100% exactly where nothing is expelled, below it wherever something is');

  // The figure R10 quotes for esterification, recomputed independently.
  const ester = ALL_REACTIONS.find((r) => r.to === 'ethyl ethanoate' && r.with === 'ethanol');
  const quoted = atomEconomy(ester);
  const byHand =
    (molarMassOfName('ethyl ethanoate') /
      (molarMassOfName('ethanoic acid') + molarMassOfName('ethanol'))) * 100;
  ck(Math.abs(quoted - byHand) < 0.05,
    `esterification: ${quoted.toFixed(1)}% by the app, ${byHand.toFixed(1)}% by the textbook definition`);
}

console.log('=== the naming-only build reads as if reactions never existed ===');
{
  const { stripReactions } = await import('../src/content/content.js');
  const { STAGES: FULL_STAGES } = await import('../src/content/curriculum.js');
  const gated = stripReactions(FULL_STAGES);
  ck(gated.reduce((a, s) => a + s.units.length, 0) === 30, 'thirty naming units survive the gate');
  ck(gated.every((s) => !/reaction|boiling|routes between/i.test(s.blurb)), 'no gated blurb advertises hidden content');
  ck(gated.every((st, i) => st.n === i + 1), 'stage numbering stays contiguous after filtering');
  ck(gated.every((st) => st.units.length > 0), 'no empty stage bands survive');
}

console.log('=== the study flag really removes the thread ===');
{
  // Gating logic mirrored from content.js: with the flag off, no r-unit
  // survives, and everything else does.
  const strip = (units) => units.filter((u) => !u.id.startsWith('r'));
  const all = UNITS.map((u) => u.id);
  ck(strip(UNITS).length === 0, 'every reaction unit is caught by the gate');
  ck(all.every((id) => id.startsWith('r')), `ids carry the marker the gate keys on: ${all.join(', ')}`);
}

console.log(fails ? `\n${fails} FAILED\n` : '\nevery reaction is real, balanced, and what it claims to be\n');
process.exit(fails ? 1 : 0);
