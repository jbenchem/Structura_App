// Categories say what SKILL a question tests; families say what it tests it
// ON. Together they make the feedback actionable: "Drawing alkenes" rather
// than "Drawing structures".
//
// Families are read from the molecule, never tagged by hand, so a question
// cannot claim to be about alkanes while showing an alkene.
import * as POOLS from '../src/content/pools.js';
import {
  familyOf, FAMILY, FAMILY_META, CATEGORY_META,
  subcategoryMeta, subcategoryKey, normaliseFamily,
} from '../src/content/questionFactory.js';
import { parseName } from '../src/engine/index.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };

console.log('=== families are read from the structure ===');
for (const [name, want] of [
  ['butane', FAMILY.ALKANE],
  ['2-methylbutane', FAMILY.BRANCHED],
  ['but-2-ene', FAMILY.ALKENE],
  ['but-1-yne', FAMILY.ALKYNE],
  ['2-chlorobutane', FAMILY.HALOALKANE],
  ['propan-2-ol', FAMILY.ALCOHOL],
  // the carbonyl bucket was split: a ketone is a ketone, not a 'carbonyl'
  ['propan-2-one', FAMILY.KETONE],
  ['butanal', FAMILY.ALDEHYDE],
  ['ethanoic acid', FAMILY.ACID],
  ['methyl ethanoate', FAMILY.ESTER],
  ['butan-1-amine', FAMILY.AMINE],
  ['methoxyethane', FAMILY.ETHER],
]) {
  const p = parseName(name);
  ck(p.ok && familyOf(p.mol) === want, `${name} → ${p.ok ? familyOf(p.mol) : p.err}`);
}
ck(familyOf(null) === FAMILY.GENERAL, 'no molecule falls back to general');

console.log('=== subcategory labels read naturally ===');
for (const [cat, fam, want] of [
  ['draw-molecule', FAMILY.ALKENE, 'Drawing alkenes'],
  ['draw-molecule', FAMILY.ALKANE, 'Drawing alkanes'],
  ['draw-molecule', FAMILY.ALCOHOL, 'Drawing alcohols'],
  ['name-structure', FAMILY.HALOALKANE, 'Naming haloalkanes'],
  ['write-name', FAMILY.ALKYNE, 'Writing alkyne names'],
  ['count-atoms', FAMILY.BRANCHED, 'Counting atoms in branched alkanes'],
]) {
  const m = subcategoryMeta(cat, fam);
  ck(m.label === want, `${cat} + ${fam} → "${m.label}"`);
  ck(!!m.icon, `  and carries an icon (${m.icon})`);
}

console.log('=== a skill with no family reads as itself ===');
{
  const m = subcategoryMeta('reading', FAMILY.GENERAL);
  ck(m.label === CATEGORY_META.reading.label, `"${m.label}" — not "Reading structure structures"`);
  // rule-based skills never split by family
  for (const cat of ['bonds', 'hydrogens', 'groups'])
    ck(
      subcategoryKey(cat, FAMILY.ALKENE) === subcategoryKey(cat, FAMILY.ALKANE),
      `${cat} does not split by family — it is about the rule`
    );
}

console.log('=== every question resolves to a labelled subcategory ===');
const seen = new Map();
let n = 0;
for (const [, pool] of Object.entries(POOLS).filter(([k]) => k.startsWith('POOL_')))
  for (const q of pool) {
    n++;
    const fam = normaliseFamily(q.category, q.family);
    const meta = subcategoryMeta(q.category, fam);
    if (!meta.label || !meta.icon) { ck(false, `${q.id}: no label or icon`); continue; }
    if (/undefined|\[object/.test(meta.label)) { ck(false, `${q.id}: broken label "${meta.label}"`); continue; }
    seen.set(meta.label, (seen.get(meta.label) || 0) + 1);
  }
ck(seen.size > 15, `${n} questions across ${seen.size} distinct subcategories`);

// a family claimed must match the molecule shown
console.log('=== a question cannot mislabel its family ===');
let mismatched = 0;
for (const [key, pool] of Object.entries(POOLS).filter(([k]) => k.startsWith('POOL_')))
  for (const q of pool) {
    if (!q.mol || !q.family) continue;
    const actual = familyOf(q.mol);
    const claimed = normaliseFamily(q.category, q.family);
    if (claimed !== FAMILY.GENERAL && claimed !== actual) {
      console.error(`  FAIL ${key}/${q.id}: claims ${claimed}, shows ${actual}`);
      mismatched++;
    }
  }
ck(mismatched === 0, `no question misstates its family (${mismatched} found)`);

console.log(fails ? `\n${fails} FAILURES` : '\ncategories and subcategories hold');
process.exit(fails ? 1 : 0);
