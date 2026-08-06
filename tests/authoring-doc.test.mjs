import { buildTarget, Cn, chainBonds } from '../src/chem/questions.js';
import { nameGraph } from '../src/engine/index.js';
import { stripStereo } from '../src/chem/engineBridge.js';
const n = (g) => { const r = nameGraph(g); return r.ok ? r.name : `<${r.err}>`; };
let bad = 0;
const ck = (got, want) => { if (got !== want) { console.error(`  FAIL: got ${got}, want ${want}`); bad++; } else console.log(`  ok  ${got}`); };
console.log('=== code samples from docs/authoring.md ===');
ck(n(buildTarget(Cn(4), chainBonds(4))), 'butane');
ck(n(buildTarget(Cn(5), [...chainBonds(4), [1, 4, 1]])), '2-methylbutane');
// the guide notes that geometry is read from coordinates, so this names as (2E)-
ck(n(buildTarget(Cn(4), chainBonds(4, { 2: 2 }))), '(2E)-but-2-ene');
// …and that checking is stereo-blind, so the plain name still matches
ck(stripStereo(n(buildTarget(Cn(4), chainBonds(4, { 2: 2 })))), 'but-2-ene');
ck(n(buildTarget(['C','C','C','O'], [[0,1],[1,2],[1,3]])), 'propan-2-ol');
console.log(bad ? `${bad} SAMPLE(S) WRONG` : 'all documented samples produce what the guide claims');
process.exit(bad ? 1 : 0);
