// The selectors that turn an attempt log into advice.
//
// The rule these exist to enforce: never recommend work a student has already
// done. A weakness that is improving is being fixed, and sending someone back
// to it is the commonest way an adaptive system wastes their time.
import {
  recentTrend, recencyDelta, timingProfile, recommendNext,
  weaknessShape, subcategoryStats, errorProfile,
} from '../src/state/store.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };
const DAY = 86400000;
const now = Date.now();

const at = (sub, cat, correct, daysAgo, ms = 10000, err = 'locant') => ({
  ts: now - daysAgo * DAY, subcategory: sub, category: cat, correct,
  ms, errorClass: correct ? null : err,
});
const S = (attempts, rollups = {}) => ({ attempts, rollups });

console.log('=== trend reads timestamps that were never read before ===');
{
  // recentTrend returns oldest first, so the OLDER weeks must be the weaker
  // ones for the improvement to read forwards
  const rows = [];
  for (let w = 0; w < 8; w++) {
    const daysAgo = (7 - w) * 7 + 1;      // w=0 is the oldest week
    for (let i = 0; i < 10; i++) rows.push(at('write-name:alkane', 'write-name', i < 4 + w, daysAgo));
  }
  const trend = recentTrend(S(rows));
  ck(trend.length === 8, `eight weekly points, got ${trend.length}`);
  const first = trend[0].pct, last = trend[trend.length - 1].pct;
  ck(last > first, `improvement is visible: ${Math.round(first * 100)}% → ${Math.round(last * 100)}%`);
  ck(trend.every((t) => t.pct === null || (t.pct >= 0 && t.pct <= 1)), 'every point is a fraction or null');
  ck(recentTrend(S([]))[0].pct === null, 'a week with no attempts reports null, not zero');
}

console.log('=== recency separates fixed from stuck ===');
{
  const rows = [
    // was bad, now good — being fixed
    ...Array(10).fill(0).map(() => at('draw-molecule:alkene', 'draw-molecule', false, 40)),
    ...Array(8).fill(0).map(() => at('draw-molecule:alkene', 'draw-molecule', true, 3)),
    // the same poor rate throughout — genuinely stuck, not merely low
    ...Array(10).fill(0).map((_, i) => at('numbering:general', 'numbering', i < 4, 40)),
    ...Array(8).fill(0).map((_, i) => at('numbering:general', 'numbering', i < 3, 3)),
  ];
  const d = recencyDelta(S(rows));
  const fixed = d.find((x) => x.key === 'draw-molecule:alkene');
  const stuck = d.find((x) => x.key === 'numbering:general');
  ck(fixed.direction === 'improving', `the fixed one reads as ${fixed.direction}`);
  ck(stuck.direction !== 'improving', `the stuck one reads as ${stuck.direction}`);
  ck(fixed.pct < 0.6 && fixed.recentPct > 0.9,
     `lifetime ${Math.round(fixed.pct * 100)}% hides recent ${Math.round(fixed.recentPct * 100)}%`);
}

console.log('=== the recommendation never sends you back to fixed work ===');
{
  const rows = [
    // worst by lifetime average (5/20 = 25%), but improving hard
    ...Array(12).fill(0).map(() => at('draw-molecule:alkene', 'draw-molecule', false, 40)),
    ...Array(8).fill(0).map((_, i) => at('draw-molecule:alkene', 'draw-molecule', i < 5, 3)),
    // better on average (14/30 = 47%) but flat — the same rate then as now
    ...Array(15).fill(0).map((_, i) => at('numbering:general', 'numbering', i < 7, 40)),
    ...Array(15).fill(0).map((_, i) => at('numbering:general', 'numbering', i < 7, 3)),
  ];
  const st = subcategoryStats(S(rows));
  const worstByAverage = st[0].key;
  const rec = recommendNext(S(rows));
  ck(worstByAverage === 'draw-molecule:alkene', `the lifetime-worst is ${worstByAverage}`);
  ck(rec.key === 'numbering:general',
     `but the recommendation is ${rec.key} — the one that is not improving`);
  ck(rec.direction !== 'improving', '  and it is explicitly not an improving skill');
  ck(rec.suggested >= 6 && rec.suggested <= 10, `  it asks for a finishable ${rec.suggested} questions`);
}

console.log('=== it says nothing when it knows nothing ===');
{
  ck(recommendNext(S([])) === null, 'an empty log recommends nothing');
  ck(recommendNext(S([at('a:b', 'a', false, 1)])) === null,
     'one wrong answer is not enough to recommend anything');
  const allGood = Array(20).fill(0).map(() => at('write-name:alkane', 'write-name', true, 2));
  ck(recommendNext(S(allGood)) === null, 'nothing weak means no recommendation');
}

console.log('=== when everything is improving it still offers the weakest ===');
{
  const rows = [
    ...Array(10).fill(0).map(() => at('a:x', 'a', false, 40)),
    ...Array(8).fill(0).map(() => at('a:x', 'a', true, 2)),
    ...Array(10).fill(0).map((_, i) => at('b:y', 'b', i < 2, 40)),
    ...Array(8).fill(0).map(() => at('b:y', 'b', true, 2)),
  ];
  const rec = recommendNext(S(rows));
  ck(rec !== null, 'it does not go silent just because everything is moving');
  ck(rec.onlyOption === true, '  and it flags that nothing was stalled');
}

console.log('=== timing finds effort that accuracy hides ===');
{
  const rows = [
    ...Array(8).fill(0).map(() => at('write-name:alkane', 'write-name', true, 2, 8000)),
    ...Array(8).fill(0).map(() => at('draw-molecule:alkane', 'draw-molecule', true, 2, 26000)),
  ];
  const t = timingProfile(S(rows));
  const draw = t.find((x) => x.key === 'draw-molecule:alkane');
  const write = t.find((x) => x.key === 'write-name:alkane');
  ck(draw.effortful === true, `drawing at ${draw.msRight / 1000}s is flagged effortful`);
  ck(write.effortful === false, `naming at ${write.msRight / 1000}s is not`);
  ck(draw.msRight > write.msRight, '  and both are correct, so accuracy alone would show nothing');
}

console.log('=== the shape admits when both are true ===');
{
  // drawing weak AND alkenes weak, to a similar degree
  const rows = [
    ...Array(10).fill(0).map((_, i) => at('draw-molecule:alkene', 'draw-molecule', i < 2, 5)),
    ...Array(10).fill(0).map((_, i) => at('draw-molecule:alkane', 'draw-molecule', i < 5, 5)),
    ...Array(10).fill(0).map((_, i) => at('write-name:alkene', 'write-name', i < 5, 5)),
    ...Array(10).fill(0).map((_, i) => at('write-name:alkane', 'write-name', i < 9, 5)),
  ];
  const sh = weaknessShape(S(rows));
  ck(sh !== null, 'a shape is returned');
  ck(['skill', 'family', 'both'].includes(sh.kind), `kind is ${sh.kind}`);
  ck(sh.worstSkill && sh.worstFamily, '  and both candidates are reported, whichever wins');
}

console.log('=== rolled-up history still counts ===');
{
  const rollups = {
    'write-name:alkane': {
      key: 'write-name:alkane', category: 'write-name',
      right: 80, asked: 100, errors: { locant: 15, other: 5 }, msRight: 0, nRight: 0, msWrong: 0, nWrong: 0,
    },
  };
  const st = subcategoryStats(S([at('write-name:alkane', 'write-name', true, 1)], rollups));
  const row = st.find((x) => x.key === 'write-name:alkane');
  ck(row.asked === 101 && row.right === 81, `history plus recent: ${row.right}/${row.asked}`);
  const prof = errorProfile(S([], rollups));
  ck(prof.find((p) => p.klass === 'locant').n === 15, 'rolled-up errors survive the rollup');
}

console.log(fails ? `\n${fails} FAILURES` : '\nthe advice is sound, and silent when it should be');
process.exit(fails ? 1 : 0);
