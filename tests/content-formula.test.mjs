// Any formula that appears in authored content or a generated question must
// come out subscripted once formatFormulas has run — this catches text that
// is rendered somewhere the transform was never applied.
import { STAGES } from '../src/content/curriculum.js';
import * as POOLS from '../src/content/pools.js';
import { formatFormulas } from '../src/chem/formula.js';

let fails = 0;
const RAW = /\b(?:(?:[A-Z][a-z]?[0-9]+){2,}|C[0-9]+H[0-9]+|CnH\(?2n\s*\+\s*2\)?)\b/;

const strings = [];
const push = (label, v) => { if (typeof v === 'string' && v) strings.push([label, v]); };

for (const st of STAGES) for (const u of st.units) {
  if (!u.lessons) continue;
  for (const l of u.lessons) {
    for (const s of l.steps || []) {
      push(`${l.id} body`, s.body); push(`${l.id} caption`, s.caption);
      push(`${l.id} prompt`, s.prompt); push(`${l.id} explain`, s.explain);
      push(`${l.id} captionFull`, s.captionFull); push(`${l.id} captionSkeletal`, s.captionSkeletal);
      (s.options || []).forEach((o, i) => push(`${l.id} option${i}`, o));
    }
    for (const q of l.pool || []) {
      push(`${q.id} prompt`, q.prompt); push(`${q.id} explain`, q.explain);
      push(`${q.id} hint`, q.hint); push(`${q.id} subtitle`, q.subtitle);
      (q.options || []).forEach((o, i) => { if (typeof o === 'string') push(`${q.id} option${i}`, o); });
    }
  }
}

console.log(`checking ${strings.length} authored strings`);
let converted = 0;
for (const [label, text] of strings) {
  const out = formatFormulas(text);
  if (RAW.test(out)) { console.error(`  FAIL ${label}: formula left unsubscripted -> ${out}`); fails++; }
  if (out !== text) converted++;
}
console.log(`  ${converted} strings contained formulas and were converted`);
console.log(fails ? `\n${fails} FAILURES` : '\nno unsubscripted formulas remain');
process.exit(fails ? 1 : 0);
