// Every question type must fit the screen on real phones without scrolling.
import { questionSizing, estimateHeight } from '../src/screens/main/questionSizing.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } };

// Smallest common portrait sizes upward. 320x568 is an iPhone SE 1st gen —
// if it fits there it fits anywhere current.
const DEVICES = [
  { name: 'iPhone SE (small)', width: 320, height: 568 },
  { name: 'iPhone SE (2020)', width: 375, height: 667 },
  { name: 'iPhone 13 mini', width: 375, height: 812 },
  { name: 'iPhone 15', width: 393, height: 852 },
  { name: 'Pixel 7', width: 412, height: 915 },
  { name: 'narrow android', width: 360, height: 640 },
];

const KINDS = ['mcName', 'mcStructure', 'write', 'number', 'correctName', 'buildName', 'compareNames', 'countTap'];

for (const d of DEVICES) {
  const s = questionSizing(d);
  console.log(`  ${d.name} (${d.width}x${d.height}) → ${s.band}, ${s.available}px for the question`);
  for (const kind of KINDS) {
    const est = estimateHeight(kind, s, kind === 'mcName' ? 4 : 4);
    ck(est <= s.available, `${d.name}: ${kind} needs ${Math.round(est)}px, only ${s.available} available`);
  }
}

// three-option multiple choice is common and must also fit
for (const d of DEVICES) {
  const s = questionSizing(d);
  const est = estimateHeight('mcName', s, 3);
  ck(est <= s.available, `${d.name}: 3-option mcName needs ${Math.round(est)}px of ${s.available}`);
}

// sanity: sizes must actually shrink on smaller screens
const small = questionSizing({ width: 320, height: 568 });
const big = questionSizing({ width: 412, height: 915 });
ck(small.promptSize < big.promptSize, 'prompt text shrinks on a small screen');
ck(small.molHeight < big.molHeight, 'diagrams shrink on a small screen');
ck(small.optionMin >= 44, 'touch targets stay at least 44px even when tight');
ck(small.keyMin >= 40, 'keypad keys stay usable when tight');

console.log(fails ? `\n${fails} FAILURES` : '\nevery question type fits without scrolling');
process.exit(fails ? 1 : 0);
