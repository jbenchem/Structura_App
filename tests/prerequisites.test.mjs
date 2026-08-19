// A lesson may only ask about material it has taught, or that an earlier
// lesson in the same unit taught. Asking a hydrogen count off a skeletal
// drawing in lesson 1 — before skeletal notation exists — is the failure this
// prevents.
import { STAGES } from '../src/content/curriculum.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } };

// What a question demands of the learner, read from the question itself rather
// than trusted from a label: a skeletal drawing on screen means skeletal
// notation is required, formula wording means the formula is required.
function demands(q) {
  const out = new Set(q.needs || []);
  if (q.mol && !q.showCarbons) out.add('skeletal');
  if (q.type === 'mcStructure' || q.type === 'countTap') out.add('skeletal');
  if (q.type === 'draw') out.add('drawing');
  if (q.type === 'write' || q.type === 'correctName' || q.type === 'buildName') out.add('naming');
  const text = `${q.prompt || ''} ${q.explain || ''}`;
  if (/CnH|2n\s*\+\s*2|molecular formula/i.test(text)) out.add('formula');
  if (/\bis this molecule an alkane|what makes a hydrocarbon|what is a hydrocarbon/i.test(text)) out.add('alkane-def');
  if (/\b(alkene|alkyne|double bond|triple bond|-ene|-yne)\b/i.test(text)) out.add('unsaturation');
  // Naming forms only. Saying "chlorine forms one bond" or calling it a
  // halogen is chemistry vocabulary, not the naming concept — the giveaway is
  // the prefix form (chloro-, bromo-) or the word haloalkane.
  if (/\b(chloro|bromo|fluoro|iodo)-|haloalkane/i.test(text)) out.add('halogens');
  if (/\b(alcohol|hydroxyl|-ol\b|diol)/i.test(text)) out.add('alcohols');
  // Only questions about groups COMPETING. The words "suffix" and "prefix"
  // are basic vocabulary from unit 1 — a question saying an alcohol takes the
  // suffix is not asking about the ladder.
  if (/\b(carbonyl|aldehyde|ketone|-al\\b|-one\\b)/i.test(text)) out.add('carbonyls');
  if (/\b(carboxyl|-oic acid|carboxylic)/i.test(text)) out.add('acids');
  // 'acyl' appears inside 'carbonyl' when matched loosely; key on the
  // naming forms instead.
  // Only the ester naming forms. A loose match on "acyl" fires inside the
  // word "carbonyl", which flagged the very first carbonyl question.
  if (/\bester|-oate\b|\bacyl half\b/i.test(text)) out.add('esters');
  if (/anhydride/i.test(text)) out.add('anhydrides');
  if (/\bamine\b|amino-|\bamines\b|-NH2/i.test(text)) out.add('amines');
  if (/\bamide/i.test(text)) out.add('amides');
  if (/\bnitrile/i.test(text)) out.add('nitriles');
  if (/\bether\b|alkoxy|methoxy|ethoxy|propoxy/i.test(text)) out.add('ethers');
  if (/\bacyl (halide|chloride)|-oyl chloride/i.test(text)) out.add('acyl-halides');
  if (/structural isomer|constitutional isomer/i.test(text)) out.add('isomers');
  // Two of the SAME group, and the named amino acids. A single demoted
  // prefix such as hydroxy- is taught in the acids unit itself, so it does
  // not require the multifunctional unit.
  if (/-dial\b|-dione\b|-dioic|amino acid|\bglycine\b|\balanine\b|\bserine\b/i.test(text)) out.add('multifunctional');
  if (/\bchiral|mirror image|rectus|sinister|\bR\/S\b/i.test(text)) out.add('chirality');
  if (/\bcis\b|\btrans\b|\bE\/Z\b|zusammen|entgegen|restricted rotation/i.test(text)) out.add('stereochemistry');
  if (/\bnitro\b|nitro-|-NO2/i.test(text)) out.add('nitro');
  if (/\bcyclo|\bring\b/i.test(text)) out.add('rings');
  if (/heterocycle|pyridine|\bfuran\b|thiophene|pyrrole|pyrimidine|imidazole/i.test(text)) out.add('heterocycles');
  if (/\bbenzene|aromatic|\bphenol\b|\baniline\b|benzoic|benzaldehyde/i.test(text)) out.add('aromatics');
  if (/\b(senior|seniority|principal group|priority ladder|demoted|outrank)/i.test(text)) out.add('priority');
  if (/\broot\b|meth-|hex-|\bIUPAC name\b/i.test(text)) out.add('roots');
  // Naming a molecule assumes the roots are known, even in passing —
  // "how many hydrogens in ethane" is a roots question wearing a disguise.
  if (/\b(meth|eth|prop|but|pent|hex|hept|oct|non|dec)(ane|ene|yne|anol)\b/i.test(text)) out.add('roots');
  return out;
}

const authored = STAGES.flatMap((s) => s.units).filter((u) => u.lessons);
let checked = 0;

// Concepts carry forward across units: unit 4 may rely on unit 1's naming.
const known = new Set();
for (const u of authored) {
  for (const l of u.lessons) {
    // a lesson's own teaching is available to its own questions
    (l.teaches || []).forEach((t) => known.add(t));
    for (const q of l.pool || []) {
      checked++;
      const need = demands(q);
      const missing = [...need].filter((n) => !known.has(n));
      ck(
        missing.length === 0,
        `${l.id} / ${q.id}: needs ${missing.join(', ')} which no lesson up to here teaches — "${(q.prompt || '').slice(0, 60)}"`
      );
    }
  }
}

console.log(`checked ${checked} questions against what had been taught`);

// and every authored lesson with a pool must declare its teaching
for (const u of authored) {
  for (const l of u.lessons) {
    if (!l.pool) continue;
    ck(Array.isArray(l.teaches) && l.teaches.length > 0, `${l.id}: must declare what it teaches`);
  }
}

// A question about how many bonds an element forms must show that element in a
// structure, so the answer can be read off the drawing rather than recalled.
console.log('=== bond-count questions show a structure ===');
let shown = 0;
for (const u of authored) {
  for (const l of u.lessons) {
    for (const q of l.pool || []) {
      if (!/how many bonds does/i.test(q.prompt || '')) continue;
      shown++;
      ck(
        !!q.mol && q.mol.bonds.length > 0,
        `${l.id} / ${q.id}: "${q.prompt.slice(0, 50)}" must show a structure to count`
      );
      if (q.mol) ck(q.showCarbons === true, `${l.id} / ${q.id}: must draw every atom, or the bonds cannot be counted`);
    }
  }
}
console.log(`  ${shown} bond-count questions checked`);

console.log(fails ? `\n${fails} FAILURES` : '\nno lesson asks about anything it has not taught');
process.exit(fails ? 1 : 0);
