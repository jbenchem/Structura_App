import { checkDrawing, stripStereo, canonicalName, nameOf, parseName, fromEngineGraph } from '../src/chem/engineBridge.js';
import { STAGES } from '../src/content/curriculum.js';
import { DRAW_QUESTIONS } from '../src/chem/questions.js';

let fails = 0;
const check = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } };

// Convert an authored target (our model shape) for checking
const asMol = (t) => ({ atoms: t.atoms.map(a=>({...a})), bonds: t.bonds.map(b=>({...b})) });

console.log('=== every authored curriculum target checks CORRECT against its own name ===');
const authored = STAGES.flatMap(s=>s.units).filter(u=>u.lessons);
let n=0;
for (const u of authored) for (const l of u.lessons) for (const st of l.steps) {
  if (!st.target || !st.name) continue;
  n++;
  const r = checkDrawing(asMol(st.target), st.name);
  check(r.correct, `${st.name}: expected correct, got ${r.issue && r.issue.errorClass} — "${r.issue && r.issue.message}"`);
}
console.log(`  ${n} targets verified`);

console.log('=== every practice question target (incl. alkenes — the stereo trap) ===');
for (const q of DRAW_QUESTIONS) {
  const r = checkDrawing(asMol(q.target), q.name);
  check(r.correct, `${q.name}: expected correct, got ${r.issue && r.issue.errorClass} — "${r.issue && r.issue.message}"`);
}
console.log(`  ${DRAW_QUESTIONS.length} question targets verified (no false stereo failures)`);

console.log('=== wrong answers classify correctly ===');
const cases = [
  ['3-methylpent-1-ene', '3-methylpent-2-ene', 'locant'],
  ['hexane', '3-methylpent-2-ene', 'formula'],
  ['2-methylpentane', '3-methylpentane', 'locant'],
  ['butane', 'pentane', 'chain-selection'],
  ['propan-1-ol', 'propan-2-ol', 'locant'],
  ['butanal', 'butan-2-one', 'suffix-seniority'],
];
for (const [drawnName, target, wantClass] of cases) {
  const p = parseName(drawnName);
  const mol = fromEngineGraph(p.mol);
  const r = checkDrawing(mol, target);
  check(!r.correct, `${drawnName} vs ${target}: should be wrong`);
  if (!r.correct) {
    check(r.issue.errorClass === wantClass, `${drawnName} vs ${target}: want ${wantClass}, got ${r.issue.errorClass} ("${r.issue.message}")`);
    console.log(`  ${drawnName} vs ${target} -> ${r.issue.errorClass}: "${r.issue.title}"`);
  }
}

console.log('=== drawn at any angle / atom order still correct ===');
const p1 = parseName('2-methylbutane');
const shifted = fromEngineGraph(p1.mol);
shifted.atoms = shifted.atoms.map(a=>({...a, x: a.y*1.0 + 500, y: -a.x + 300})).reverse();
check(checkDrawing(shifted, '2-methylbutane').correct, 'rotated+reordered structure should still match');
console.log('  rotation/reorder invariant OK');

console.log('=== stereo mode when explicitly assessed ===');
const e = parseName('(2E)-but-2-ene');
const z = parseName('(2Z)-but-2-ene');
check(checkDrawing(fromEngineGraph(e.mol), '(2E)-but-2-ene', {stereo:true}).correct, 'E matches E with stereo on');
const zr = checkDrawing(fromEngineGraph(z.mol), '(2E)-but-2-ene', {stereo:true});
check(!zr.correct && zr.issue.errorClass === 'stereo-descriptor', `Z vs E with stereo on -> stereo-descriptor, got ${zr.issue && zr.issue.errorClass}`);
check(checkDrawing(fromEngineGraph(z.mol), 'but-2-ene').correct, 'Z drawing accepted when stereo NOT assessed');
console.log('  stereo on/off both behave');

console.log('=== invalid drawings ===');
const bad = { atoms: [ {id:'a',el:'C',x:0,y:0}, {id:'b',el:'C',x:50,y:0}, {id:'c',el:'C',x:0,y:50}, {id:'d',el:'C',x:0,y:-50}, {id:'e',el:'C',x:-50,y:0}, {id:'f',el:'C',x:25,y:25} ],
  bonds: [ {id:'1',a:'a',b:'b',order:1},{id:'2',a:'a',b:'c',order:1},{id:'3',a:'a',b:'d',order:1},{id:'4',a:'a',b:'e',order:1},{id:'5',a:'a',b:'f',order:1} ] };
const br = checkDrawing(bad, 'pentane');
check(!br.correct && br.issue.errorClass === 'valence', `5-bond carbon -> valence, got ${br.issue && br.issue.errorClass}`);
console.log(`  valence: "${br.issue.message}"`);

const frag = { atoms:[{id:'a',el:'C',x:0,y:0},{id:'b',el:'C',x:40,y:0},{id:'c',el:'C',x:200,y:0},{id:'d',el:'C',x:240,y:0}],
  bonds:[{id:'1',a:'a',b:'b',order:1},{id:'2',a:'c',b:'d',order:1}] };
const fr = checkDrawing(frag, 'butane');
check(!fr.correct, 'fragments rejected');
console.log(`  disconnected: "${fr.issue.message}"`);

console.log('=== canonical/trivial name handling in targets ===');
check(canonicalName('acetic acid') === 'ethanoic acid', `acetic acid -> ethanoic acid, got ${canonicalName('acetic acid')}`);
const ac = parseName('acetic acid');
check(checkDrawing(fromEngineGraph(ac.mol), 'acetic acid').correct, 'trivial-named target works');
console.log('  trivial names resolve');

console.log(fails ? `\n${fails} FAILURES` : '\nALL BRIDGE CHECKS PASS');
process.exitCode = fails?1:0;
