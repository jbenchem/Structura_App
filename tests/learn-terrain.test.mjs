// ─────────────────────────────────────────────────────────────
// Learn as terrain.
//
// The metro layout is a pure function, so it is tested against the REAL
// curriculum — all forty units — and against the study-build view with the
// reaction units gone. The claims from the design brief become assertions:
// every unit gets a station, reaction units ride the side lane, lane
// changes get elbows on both sides, the flag-off route has no coral
// remnants and no gaps, collapsed stages bound what mounts, and the
// celebration list fires once per stage, never twice.
// ─────────────────────────────────────────────────────────────

import { STAGES } from '../src/content/curriculum.js';
import {
  buildTerrain,
  collapsedStageIds,
  uncelebratedStages,
  isReactionUnit,
  TERRAIN,
} from '../src/screens/main/learnTerrain.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };

const allUnits = STAGES.flatMap((s) => s.units);
const firstUnitId = allUnits[0].id;
const namingOnly = STAGES.map((s) => ({ ...s, units: s.units.filter((u) => !isReactionUnit(u)) }));

// A status function from a simple model: everything before `currentId` is
// complete, `currentId` is current, everything after locked.
const statusUpTo = (currentId, units = allUnits) => {
  const idx = units.findIndex((u) => u.id === currentId);
  return (id) => {
    const i = units.findIndex((u) => u.id === id);
    if (i < idx) return 'complete';
    if (i === idx) return 'current';
    return 'locked';
  };
};

const expandAll = new Set(STAGES.map((s) => s.id));

console.log('=== every unit is on the map ===');
{
  const t = buildTerrain(STAGES, statusUpTo(firstUnitId), { currentUnitId: firstUnitId, expandedIds: expandAll });
  const rows = t.sections.flatMap((s) => s.rows);
  ck(rows.length === allUnits.length, `${rows.length} stations for ${allUnits.length} units, fully expanded`);
  ck(new Set(rows.map((r) => r.unit.id)).size === rows.length, 'no unit appears twice');
  const reactions = rows.filter((r) => r.reaction);
  ck(reactions.length === allUnits.filter(isReactionUnit).length, 'every reaction unit is marked');
  ck(reactions.every((r) => r.shape === 'diamond'), 'a reaction unit is a diamond station');
  ck(rows.filter((r) => !r.reaction).every((r) => r.shape === 'circle'), 'a naming unit is a circle');
  // The reference design runs ONE rail. Lanes, x-offsets and elbows were the
  // first metro build; if a row ever grows those fields again, someone is
  // reintroducing the geometry the redesign removed.
  ck(rows.every((r) => r.x === undefined && r.lane === undefined && r.elbowIn === undefined), 'one rail: no lanes, offsets or elbows on any row');
  ck(TERRAIN.railX > 0 && TERRAIN.mainX === undefined, 'the geometry constants describe a single rail');
}

console.log('=== the plaques can never print an object again ===');
{
  // The bug from the first live build: the APP-FACING stages (content.js)
  // carried the authored lesson ARRAY, and the plaque's `${lessons} lessons`
  // printed "[object Object],…" on a real phone. The raw curriculum keeps
  // its arrays by design — every content test walks them — so the pin aims
  // at exactly the export the Learn screen renders.
  const { STAGES: APP_STAGES } = await import('../src/content/content.js');
  const units = APP_STAGES.flatMap((s) => s.units);
  ck(units.length > 0, 'the app-facing stages are non-empty');
  ck(units.every((u) => typeof u.lessons === 'number'), 'every app-facing unit carries lessons as a COUNT');
  ck(units.every((u) => Array.isArray(u.lessonList) && u.lessonList.length === u.lessons), 'with the objects in lessonList, same length');
}

console.log('=== the study build recomputes the route cleanly ===');
{
  const units = namingOnly.flatMap((s) => s.units);
  const t = buildTerrain(namingOnly, statusUpTo(units[0].id, units), { currentUnitId: units[0].id, expandedIds: expandAll });
  const rows = t.sections.flatMap((s) => s.rows);
  ck(rows.length === units.length, `${rows.length} stations with reactions off`);
  ck(rows.every((r) => !r.reaction && r.shape === 'circle'), 'no coral remnants: every station is a naming circle');
  ck(t.sections.every((s) => s.rows.length > 0 || s.collapsed), 'no stage renders empty');
}

console.log('=== collapsing bounds what mounts ===');
{
  const t = buildTerrain(STAGES, statusUpTo(firstUnitId), { currentUnitId: firstUnitId, expandedIds: new Set() });
  const full = t.sections.filter((s) => !s.collapsed);
  ck(full.length === 2, `a brand-new learner mounts ${full.length} full stages (current and next), the rest are bands`);
  const mounted = full.reduce((n, s) => n + s.rows.length, 0);
  ck(mounted <= 12, `${mounted} stations mounted — the SVG budget stays small`);
  // The collapse rule never hides the terrain the learner is walking.
  const collapsed = collapsedStageIds(STAGES, firstUnitId, new Set());
  ck(!collapsed.has(STAGES[0].id) && !collapsed.has(STAGES[1].id), 'the current stage and its successor always render in full');
  // Expanding is honoured.
  const withOne = collapsedStageIds(STAGES, firstUnitId, new Set([STAGES[5].id]));
  ck(!withOne.has(STAGES[5].id), 'an expanded stage stays expanded');
}

console.log('=== offsets and the locator ===');
{
  const midUnit = allUnits[6].id;
  const t = buildTerrain(STAGES, statusUpTo(midUnit), { currentUnitId: midUnit, expandedIds: expandAll });
  ck(t.currentOffset > 0 && t.currentOffset < t.totalHeight, 'the current unit has a real offset inside the route');
  let y = 0;
  let mono = true;
  for (const s of t.sections) {
    if (s.y !== y) mono = false;
    y += s.height;
  }
  ck(mono && y === t.totalHeight, 'section offsets tile the total height exactly — scrollTo can trust them');
  ck(TERRAIN.rowH >= 44 && TERRAIN.collapsedH >= 44, 'every tap target clears 44px by construction');
}

console.log('=== a stage celebrates once, on the transition ===');
{
  const secondStageDone = STAGES[1].units[STAGES[1].units.length - 1].id;
  const afterSecond = allUnits[allUnits.findIndex((u) => u.id === secondStageDone) + 1].id;
  const st = statusUpTo(afterSecond);
  const due = uncelebratedStages(STAGES, st, []);
  ck(due.includes(STAGES[0].id) && due.includes(STAGES[1].id), 'newly completed stages are due a celebration');
  const after = uncelebratedStages(STAGES, st, due);
  ck(after.length === 0, 'and once marked, revisiting the screen replays nothing');
  ck(uncelebratedStages(STAGES, statusUpTo(firstUnitId), []).length === 0, 'an incomplete stage is never due');
}

console.log(fails ? `\n${fails} FAILED\n` : '\nthe terrain is sound in both worlds\n');
process.exit(fails ? 1 : 0);
