import { parseName, nameOf, fromEngineGraph, synonymsFor } from '../src/chem/engineBridge.js';
let fails=0; const check=(c,m)=>{if(!c){console.error('  FAIL:',m);fails++;}};
// lookup path: name -> our model -> re-name -> parts line up with our ids
for (const nm of ['aspirin','caffeine','2,2,4-trimethylpentane','propan-2-ol','ethyl ethanoate','naphthalene','glucose','(2R)-butan-2-ol']) {
  const p = parseName(nm);
  check(p.ok, `${nm} parses`);
  if (!p.ok) continue;
  const our = fromEngineGraph(p.mol);
  check(our.atoms.length === p.mol.atoms.length, `${nm}: atom count preserved`);
  check(our.atoms.every(a=>a.el && typeof a.x==='number'), `${nm}: atoms well-formed for renderer`);
  check(our.bonds.every(b=>b.id && b.a && b.b), `${nm}: bonds have ids and endpoints`);
  const named = nameOf(our);
  check(named.ok, `${nm}: re-names after conversion`);
  if (named.ok) {
    const ids = new Set(our.atoms.map(a=>a.id));
    const partAtoms = (named.parts||[]).flatMap(x=>x.atoms||[]);
    check(partAtoms.every(id=>ids.has(id)), `${nm}: part atom ids map onto our model (highlighting works)`);
    console.log(`  ${nm} -> ${named.name} (${named.formula}, ${(named.parts||[]).length} parts)`);
  }
}
const syn = synonymsFor('ethanoic acid');
check(syn && Array.isArray(syn.synonyms), 'synonyms shape');
console.log(fails?`\n${fails} FAILURES`:'\nSANDBOX PATHS OK');
process.exitCode = fails?1:0;
