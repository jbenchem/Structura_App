// ─────────────────────────────────────────────────────────────
// Semi-structural notation: every conversion checked against a molecule the
// ENGINE built from a name, so a condensed formula can never quietly
// disagree with the structure it replaces. Rings must be refused, not
// mangled, and nothing in the whole course may make the converter throw.
// ─────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs';
import { parseName } from '../src/content/questionFactory.js';
import { semiStructural, toSubscripts } from '../src/chem/semiStructural.js';
import { UNITS } from '../src/content/content.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };

console.log('=== the notation a VCE student would write ===');
{
  const cases = [
    ['ethanol', 'CH3CH2OH'],
    ['propan-1-ol', 'CH3CH2CH2OH'],
    ['propan-2-ol', 'CH3CH(OH)CH3'],
    ['methoxymethane', 'CH3OCH3'],
    ['ethanal', 'CH3CHO'],
    ['propanone', 'CH3COCH3'],
    ['pentan-2-one', 'CH3COCH2CH2CH3'],
    ['ethanoic acid', 'CH3COOH'],
    ['ethyl ethanoate', 'CH3COOCH2CH3'],
    ['ethanamide', 'CH3CONH2'],
    ['ethylamine', 'CH3CH2NH2'],
    ['propanenitrile', 'CH3CH2CN'],
    ['nitromethane', 'CH3NO2'],
    ['chloroethane', 'CH3CH2Cl'],
    ['2-methylpropane', 'CH3CH(CH3)CH3'],
    ['2,3-dimethylbutane', 'CH3CH(CH3)CH(CH3)CH3'],
    ['but-2-ene', 'CH3CH=CHCH3'],
    ['but-1-yne', 'CH\u2261CCH2CH3'],
    ['3-methylpentan-2-ol', 'CH3CH(OH)CH(CH3)CH2CH3'],
  ];
  for (const [name, want] of cases) {
    const r = parseName(name);
    const got = r && r.ok ? semiStructural(r.mol, { subscripts: false }) : null;
    ck(got === want, `${name} → ${want}${got === want ? '' : ` (got ${got})`}`);
  }
}

console.log('=== refuse over guess ===');
{
  for (const ring of ['cyclohexane', 'benzene', 'methylbenzene']) {
    const r = parseName(ring);
    if (!r || !r.ok) { ck(true, `${ring}: not parsed, nothing to convert`); continue; }
    ck(semiStructural(r.mol) === null, `${ring} is refused, so the drawing stays`);
  }
  ck(semiStructural(null) === null, 'no molecule converts to nothing, not a crash');
  ck(semiStructural({ atoms: [], bonds: [] }) === null, 'an empty molecule likewise');
}

console.log('=== subscripts ===');
{
  ck(toSubscripts('CH3CH2OH') === 'CH\u2083CH\u2082OH', 'digits after a letter become subscripts');
  ck(toSubscripts('CH3CH(CH3)CH3') === 'CH\u2083CH(CH\u2083)CH\u2083', 'inside brackets too');
  ck(toSubscripts('but-2-ene') === 'but-2-ene', 'locants in a name are left alone');
}

console.log('=== nothing in the course can make it throw ===');
{
  let seen = 0;
  let condensed = 0;
  let refused = 0;
  let bad = 0;
  for (const u of UNITS) {
    for (const l of u.lessonList || []) {
      for (const q of l.pool || []) {
        const mol = q.mol || (q.answerMol ? q.answerMol : null);
        if (!mol || !mol.atoms) continue;
        seen++;
        let out;
        try {
          out = semiStructural(mol);
        } catch (e) {
          bad++;
          if (bad === 1) console.error('    threw on', q.id, e.message);
          continue;
        }
        if (out === null) refused++;
        else {
          condensed++;
          if (/undefined|NaN|null/.test(out)) {
            bad++;
            if (bad <= 3) console.error('    malformed:', q.id, out);
          }
        }
      }
    }
  }
  ck(seen > 100, `${seen} molecules across the course were converted or refused`);
  ck(bad === 0, `no molecule throws or renders malformed (${condensed} condensed, ${refused} refused)`);
}

console.log('=== the toggle is wired where it should be ===');
{
  const rv = readFileSync(new URL('../src/sandbox/render.js', import.meta.url), 'utf8');
  ck(/displayMode === 'semi'/.test(rv), 'StaticMol reads the display mode from context');
  ck(/!onPickAtom && !locants && !labelOnly/.test(rv), 'and never condenses a molecule the student must interact with or read locants from');
  const qv = readFileSync(new URL('../src/screens/main/QuestionViews.js', import.meta.url), 'utf8');
  ck(/<DisplayModeContext.Provider value=\{notation\}>/.test(qv), 'the question shell provides the mode, so one switch converts the whole question');
  ck((qv.match(/<NotationToggle /g) || []).length === 2, 'the switch renders on both scrolling and non-scrolling questions');
  ck(/key: 'semiStructural'/.test(qv), 'and the choice is remembered in settings');
  const store = readFileSync(new URL('../src/state/store.js', import.meta.url), 'utf8');
  ck(/semiStructural: false/.test(store), 'skeletal remains the default — the course teaches the drawing first');
}

console.log(fails ? `\n${fails} FAILED\n` : '\nsemi-structural notation agrees with the structures it replaces\n');
process.exit(fails ? 1 : 0);
