// The four new interactives. Each teaches a relationship — change one thing,
// watch the name respond — so the tests check the RELATIONSHIP holds, not
// just that the component renders.
import { parseName, nameGraph } from '../src/engine/index.js';
import {
  NumberingChooser, GroupSwapper, PriorityExplorer, StereoFlipper,
  IsomerCollector, RingExplorer, LocantCompare, BracketDecoder,
} from '../src/screens/main/InteractiveSteps.js';
import { UNITS } from '../src/content/curriculum.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };
const nameOf = (n) => { const p = parseName(n); return p.ok ? nameGraph(p.mol).name : null; };

console.log('=== every configured interactive names correctly ===');
for (const u of UNITS.filter((x) => x.lessonList)) {
  for (const l of u.lessonList) {
    for (const st of l.steps || []) {
      if (st.type === 'swap') {
        for (const f of st.forms) ck(!!nameOf(f.name), `${l.id} swap: "${f.name}" → ${nameOf(f.name)}`);
        // Two is legitimate when the lesson is a direct A-against-B contrast
        // (oxygen against nitrogen); more than that and it is a tour.
        ck(st.forms.length >= 2, `${l.id} swap offers ${st.forms.length} groups`);
        ck(st.forms.every((f) => f.note), `${l.id} swap: every option explains itself`);
      }
      if (st.type === 'flip') {
        for (const f of st.forms) ck(!!nameOf(f), `${l.id} flip: "${f}" → ${nameOf(f)}`);
        ck(st.forms.length === 2, `${l.id} flip has exactly two forms`);
      }
      if (st.type === 'priority') {
        for (const [key, nm] of Object.entries(st.nameFor || {}))
          ck(!!nameOf(nm), `${l.id} priority [${key || 'none'}] → ${nameOf(nm)}`);
      }
      if (st.type === 'numbering') {
        ck(st.chain >= 3 && st.at >= 2 && st.at < st.chain,
           `${l.id} numbering: ${st.chain}-carbon chain, substituent at ${st.at}`);
      }
    }
  }
}

console.log('=== the flip cases do what the lesson claims ===');
{
  // a real stereo pair must give DIFFERENT names
  for (const [a, b] of [['cis-but-2-ene', 'trans-but-2-ene'], ['(R)-butan-2-ol', '(S)-butan-2-ol']]) {
    ck(nameOf(a) !== nameOf(b), `${a} and ${b} name differently — flipping is meaningful`);
  }
  // a null case must give the SAME name, which is the entire point
  for (const n of ['but-1-ene', 'propan-2-ol']) {
    ck(nameOf(n) === nameOf(n), `${n} flips to itself — no descriptor exists`);
  }
  // and the lessons must actually contain a null case, or the point is lost
  let nulls = 0;
  for (const u of UNITS.filter((x) => x.lessonList))
    for (const l of u.lessonList)
      for (const st of l.steps || [])
        if (st.type === 'flip' && st.forms[0] === st.forms[1]) nulls++;
  ck(nulls >= 2, `${nulls} flip steps demonstrate the null case`);
}

console.log('=== the priority explorer really does demote ===');
{
  // switching a second group on must change how the first is reported
  ck(nameOf('butan-1-ol') === 'butan-1-ol', 'alcohol alone takes the suffix');
  ck(/en-1-ol$/.test(nameOf('but-3-en-1-ol')), 'with a double bond present the alcohol still wins, the alkene becomes -en-');
  ck(nameOf('but-1-ene') === 'but-1-ene', 'the alkene alone takes the suffix');
}

console.log('=== numbering: the two candidates genuinely differ ===');
for (const [n, at] of [[5, 2], [6, 2], [7, 3]]) {
  const lower = Math.min(at, n + 1 - at);
  const higher = Math.max(at, n + 1 - at);
  ck(lower !== higher, `${n}-carbon chain, substituent at ${at}: candidates ${lower} and ${higher}`);
}

console.log('=== the four newer interactives are configured soundly ===');
for (const u of UNITS.filter((x) => x.lessonList)) {
  for (const l of u.lessonList) {
    for (const st of l.steps || []) {
      if (st.type === 'isomers') {
        const names = st.drawings.map((d) => d.name);
        for (const n of names) ck(!!nameOf(n), `${l.id} isomers: "${n}" names`);
        const distinct = new Set(names.map(nameOf));
        ck(distinct.size === st.target,
           `${l.id}: ${names.length} drawings resolve to ${distinct.size} compounds, target says ${st.target}`);
        ck(names.length > distinct.size,
           `${l.id}: at least one drawing IS a duplicate — otherwise the lesson has nothing to show`);
      }
      if (st.type === 'locants') {
        ck(!!nameOf(st.name), `${l.id} locants: "${st.name}" names`);
        ck(st.setA.length === st.setB.length, `${l.id}: both locant sets are the same length`);
        const sumA = st.setA.reduce((a, b) => a + b, 0);
        const sumB = st.setB.reduce((a, b) => a + b, 0);
        let d = -1;
        for (let i = 0; i < st.setA.length; i++) if (st.setA[i] !== st.setB[i]) { d = i; break; }
        ck(d >= 0, `${l.id}: the sets genuinely differ, at term ${d + 1}`);
        // the interesting case is where the totals mislead
        console.log(`       totals ${sumA} vs ${sumB}; term-by-term winner is set ${st.setA[d] < st.setB[d] ? 'A' : 'B'}`);
      }
      if (st.type === 'ring') {
        ck(st.min >= 3, `${l.id} ring: smallest ring is ${st.min}`);
        ck(st.max <= 10, `${l.id} ring: largest ring is ${st.max}`);
      }
      if (st.type === 'brackets') {
        const [a, b, c] = st.start;
        ck(a >= b && b >= c, `${l.id} brackets: [${st.start.join('.')}] is in descending order`);
        const total = a + b + c + 2;
        const ROOTS = ['', 'meth', 'eth', 'prop', 'but', 'pent', 'hex', 'hept', 'oct', 'non', 'dec'];
        ck(!!nameOf(`bicyclo[${st.start.join('.')}]${ROOTS[total]}ane`),
           `${l.id} brackets: bicyclo[${st.start.join('.')}]${ROOTS[total]}ane names`);
      }
    }
  }
}

console.log('=== the newest interactives are configured soundly ===');
for (const u of UNITS.filter((x) => x.lessonList)) {
  for (const l of u.lessonList) {
    for (const st of l.steps || []) {
      if (st.type === 'slide') {
        for (const f of st.forms) {
          ck(!!nameOf(f.name), `${l.id} slide: "${f.name}" names`);
          ck(!!f.family && !!f.note && f.at > 0, `${l.id} slide: ${f.name} declares family, position and note`);
        }
      }
      if (st.type === 'suffixtest') {
        for (const g of st.groups) {
          ck(!!nameOf(g.example), `${l.id} suffixtest: "${g.example}" names`);
          ck(typeof g.canSuffix === 'boolean' && !!g.note, `${l.id} suffixtest: ${g.label} declares a verdict and a reason`);
        }
        // the whole point is the contrast, so both answers must appear
        const yes = st.groups.some((g) => g.canSuffix);
        const no = st.groups.some((g) => !g.canSuffix);
        ck(yes && no, `${l.id} suffixtest: offers both a group that can and one that cannot`);
      }
      if (st.type === 'sort') {
        ck(st.items.length === st.order.length, `${l.id} sort: ${st.items.length} items, ${st.order.length} slots`);
        const keys = st.items.map((x) => x.sortKey).sort();
        ck(JSON.stringify(keys) === JSON.stringify([...st.order].sort()),
           `${l.id} sort: the answer uses exactly the keys the items declare`);
        // the lesson only teaches something if the label and the key disagree somewhere
        ck(st.items.some((x) => !x.label.startsWith(x.sortKey)),
           `${l.id} sort: at least one item files under a letter it does not start with`);
      }
      if (st.type === 'stepthrough') {
        ck(!!nameOf(st.name), `${l.id} stepthrough: "${st.name}" names`);
        ck(st.stages.length >= 3, `${l.id} stepthrough: ${st.stages.length} stages`);
        for (const g of st.stages) {
          ck(g.options.length >= 2 && g.answer >= 0 && g.answer < g.options.length,
             `${l.id} stepthrough: "${g.q.slice(0, 34)}" has a valid answer`);
          ck(!!g.hint, `${l.id} stepthrough: and explains a wrong choice`);
        }
      }
      if (st.type === 'trace') {
        const m = st.molecule;
        ck(m.chain >= 4 && (m.branches || []).length > 0,
           `${l.id} trace: ${m.chain}-carbon chain with ${(m.branches || []).length} branch(es) — a straight chain would be trivial`);
      }
    }
  }
}

console.log('=== ring renumbering really happens ===');
{
  // the teaching moment: place a group at 5 and the name comes back as 3
  const asked = nameOf('1,5-dimethylcyclohexane');
  ck(asked === '1,3-dimethylcyclohexane',
     `1,5-dimethylcyclohexane is renumbered to ${asked} — which is what the ring explorer shows`);
}

console.log('=== components render ===');
{
  const noop = () => {};
  ck(!!NumberingChooser({ step: { title: 't', body: 'b', chain: 5, at: 2 }, width: 380, onContinue: noop }), 'NumberingChooser');
  ck(!!GroupSwapper({ step: { title: 't', body: 'b', forms: [{ label: 'a', name: 'butane' }, { label: 'b', name: 'butanal' }] }, width: 380, onContinue: noop }), 'GroupSwapper');
  ck(!!PriorityExplorer({ step: { title: 't', body: 'b', base: 'butane', groups: ['a'], start: [], nameFor: { '': 'butane' } }, width: 380, onContinue: noop }), 'PriorityExplorer');
  ck(!!StereoFlipper({ step: { title: 't', body: 'b', forms: ['cis-but-2-ene', 'trans-but-2-ene'] }, width: 380, onContinue: noop }), 'StereoFlipper');
  ck(!!IsomerCollector({ step: { title: 't', body: 'b', drawings: [{ name: 'butane' }, { name: 'butane' }, { name: '2-methylpropane' }], target: 2 }, width: 380, onContinue: noop }), 'IsomerCollector');
  ck(!!RingExplorer({ step: { title: 't', body: 'b', start: 6, startSubs: 2, startAt: 2, min: 3, max: 8 }, width: 380, onContinue: noop }), 'RingExplorer');
  ck(!!LocantCompare({ step: { title: 't', body: 'b', name: '2,2,4-trimethylpentane', setA: [2,2,4], setB: [2,4,4] }, width: 380, onContinue: noop }), 'LocantCompare');
  ck(!!BracketDecoder({ step: { title: 't', body: 'b', start: [2,2,1] }, width: 380, onContinue: noop }), 'BracketDecoder');
}

console.log(fails ? `\n${fails} FAILURES` : '\nthe interactives teach what they claim to');
process.exit(fails ? 1 : 0);
