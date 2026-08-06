import { splitName, buildNameFrom, branchedChain, straightChain, nameOf } from '../src/content/questionFactory.js';
let f=0; const ck=(c,m)=>{if(!c){console.error('  FAIL',m);f++}else console.log('  ok  ',m)};
const cases = [
  ['hexane', ['hex','ane']],
  ['2-methylbutane', ['2-','methyl','butane']],
  ['3-ethylpentane', ['3-','ethyl','pentane']],
  ['2,3-dimethylbutane', ['2,3-','di','methyl','butane']],
  ['2,2,4-trimethylpentane', ['2,2,4-','tri','methyl','pentane']],
];
for (const [name, want] of cases) {
  const got = splitName(name);
  ck(got && got.join('|') === want.join('|'), `${name} -> ${got ? got.join(' + ') : 'null'}`);
  if (got) ck(got.join('') === name, `${name} reassembles exactly`);
}
const q = buildNameFrom(branchedChain(4, [{at:2,size:1}]), { spares:['3-','ethyl'] });
ck(q && q.answer === '2-methylbutane', `question answer ${q && q.answer}`);
ck(q.parts.every(p => q.options.includes(p)), 'all needed parts offered');
ck(q.options.length > q.parts.length, 'plus distractors');
console.log(f?`\n${f} FAILURES`:'\nname splitting works');
process.exit(f?1:0);
