// Group shorthand (OH, NH2, NO2, CHO, COOH) must expand correctly whatever
// type the caller's atom ids are.
//
// expandSugar derived new ids with `Math.max(0, ...ids) + 1`. That works only
// for numeric ids — the drawing canvas uses strings like "k7", and Math.max
// then returns NaN, so both oxygens of a nitro group got the same id, merged
// into a single atom with three bonds, and the engine rejected a valid
// structure with a valence error. A nitro group drawn on the canvas could
// never be named.
import { nameGraph } from '../src/engine/index.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };

const chainWith = (ids, group) => ({
  atoms: [
    { id: ids[0], x: 0, y: 0, el: 'C' },
    { id: ids[1], x: 56, y: 32, el: 'C' },
    { id: ids[2], x: 112, y: 0, el: group },
  ],
  bonds: [
    { a: ids[0], b: ids[1], order: 1, stereo: null },
    { a: ids[1], b: ids[2], order: 1, stereo: null },
  ],
});

const ID_SETS = [
  ['numeric', [1, 2, 3]],
  ['numeric, high', [90, 91, 92]],
  ['canvas strings', ['k1', 'k2', 'k3']],
  ['target strings', ['t0', 't1', 't2']],
  ['mixed', [1, 'k2', 3]],
  ['strings that look numeric', ['1', '2', '3']],
];

console.log('=== every group sugar, every id type ===');
for (const [group, expect] of [
  ['NO2', 'nitroethane'],
  ['OH', 'ethanol'],
  ['NH2', 'ethan-1-amine'],
]) {
  for (const [label, ids] of ID_SETS) {
    const r = nameGraph(chainWith(ids, group));
    ck(r.ok && r.name === expect, `${group} with ${label}: ${r.ok ? r.name : '<' + r.err + '>'}`);
  }
}

console.log('=== the nitro nitrogen really does carry four bonds ===');
{
  // it is N+ with an O-, so four bonds is correct and the validator allows it
  const r = nameGraph(chainWith(['k1', 'k2', 'k3'], 'NO2'));
  ck(r.ok, 'a nitro group is accepted rather than failing valence');
  ck(r.formula === 'C2H5NO2', `formula is ${r.formula}`);
}

console.log('=== two nitro groups do not collide with each other ===');
{
  const mol = {
    atoms: [
      { id: 'k1', x: 0, y: 0, el: 'C' },
      { id: 'k2', x: 56, y: 32, el: 'C' },
      { id: 'k3', x: 112, y: 0, el: 'C' },
      { id: 'k4', x: -56, y: 32, el: 'NO2' },
      { id: 'k5', x: 168, y: 32, el: 'NO2' },
    ],
    bonds: [
      { a: 'k1', b: 'k2', order: 1, stereo: null },
      { a: 'k2', b: 'k3', order: 1, stereo: null },
      { a: 'k1', b: 'k4', order: 1, stereo: null },
      { a: 'k3', b: 'k5', order: 1, stereo: null },
    ],
  };
  const r = nameGraph(mol);
  ck(r.ok, `two nitro groups on one chain: ${r.ok ? r.name : '<' + r.err + '>'}`);
  if (r.ok) ck(/dinitro/.test(r.name), `  and both are reported: ${r.name}`);
}

console.log(fails ? `\n${fails} FAILURES` : '\ngroup shorthand expands safely for any id type');
process.exit(fails ? 1 : 0);
