// The lesson row: number badge on the left, title in the middle, then the
// score and the play control together on the right.
import { AccuracyRing } from '../src/components/AccuracyRing.js';
let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };

import { readFileSync } from 'node:fs';
const src = readFileSync('src/screens/main/Overlays.js', 'utf8');

// the ring must not be nested inside the number badge
const badge = src.slice(src.indexOf('ov.lessonNum,'), src.indexOf('<View style={{ flex: 1 }}>'));
ck(!badge.includes('AccuracyRing'), 'the ring is not inside the lesson-number badge');

// it must appear immediately before the play/refresh control
const ringAt = src.indexOf('<AccuracyRing');
const playAt = src.indexOf("name={ls === 'done' ? 'refresh-outline' : 'play'}");
ck(ringAt > 0 && playAt > ringAt, 'the ring sits just before the play control');

// and the row centres its children
const rowStyle = src.slice(src.indexOf('lessonRow: {'), src.indexOf('lessonRow: {') + 200);
ck(/alignItems: 'center'/.test(rowStyle), 'the row centres vertically');

// no step count anywhere in the row
ck(!/steps\.length\} steps/.test(src) && !/\$\{lesson\.steps\.length\} steps/.test(src),
   'the step count is gone');

// compact mode hides the "Accuracy" caption so it fits a 40px ring
const ring = AccuracyRing({ pct: 86, size: 40, stroke: 4, compact: true });
let sawLabel = false;
const walk = (n, d = 0) => {
  if (n == null || typeof n !== 'object' || d > 20) return;
  if (Array.isArray(n)) return n.forEach(x => walk(x, d + 1));
  if (n.props && n.props.children === 'Accuracy') sawLabel = true;
  if (typeof n.type === 'function') return walk(n.type(n.props || {}), d + 1);
  if (n.props && n.props.children != null) walk(n.props.children, d + 1);
};
walk(ring);
ck(!sawLabel, 'the compact ring shows the percentage only, no caption');

console.log(fails ? `\n${fails} FAILURES` : '\nthe row reads: number, title, score, play');
process.exit(fails ? 1 : 0);
