// ─────────────────────────────────────────────────────────────
// Learn as terrain — one rail, as pure geometry.
//
// The Learn screen used to be forty near-identical rows. The redesign draws
// the curriculum as a route down a single straight rail — matched to the
// reference boards after the first metro build proved busier on a real
// phone than on paper. The coral side lane and its bezier elbows are gone;
// a reaction unit is still unmistakable, but the distinction is carried by
// its diamond station and a coral accent, not by geometry. Every unit ends
// at a checkpoint station, a completed stage earns a double-ring
// interchange, and a stage's rail closes with a small hollow terminus.
//
// Everything here is a pure function of (stages, statusOf, options) → rows,
// so the layout is unit-testable without rendering a pixel, and the screen
// is a thin renderer over the result. Distant locked stages collapse into
// single bands — which is also the performance story: only the
// neighbourhood of the current position mounts full stations. One rail and
// uniform row pitch also make every offset exact, which is what the
// locator button's scroll arithmetic depends on.
// ─────────────────────────────────────────────────────────────

// Geometry constants, from the reference boards. Everything is derived from
// these, so a spacing change is one edit.
export const TERRAIN = {
  margin: 16,
  railX: 34, // the one rail's centre
  rowH: 78, // compact pitch: the plaque fills the row instead of floating in it
  stageHeaderH: 56,
  collapsedH: 56,
  nodeR: 11, // checkpoint radius; with the plaque, the tap target far exceeds 44px
  laneDX: 24, // how far the coral reaction lane sits off the main rail
  svgW: 78, // rail + lane + diamond, with breathing room
};

export const isReactionUnit = (u) => u.id.startsWith('r');

// Which stages render collapsed: anything wholly locked and beyond the
// stage after the current one, unless the user has expanded it. The current
// stage and its successor always render in full — that is the terrain the
// student is actually walking.
export function collapsedStageIds(stages, currentUnitId, expandedIds = new Set()) {
  const currentStageIdx = Math.max(
    0,
    stages.findIndex((s) => s.units.some((u) => u.id === currentUnitId))
  );
  const out = new Set();
  stages.forEach((s, i) => {
    if (i <= currentStageIdx + 1) return;
    if (expandedIds.has(s.id)) return;
    out.add(s.id);
  });
  return out;
}

// The full build: sections in render order, each with its rows and its own
// y-offset, plus the offset of the current unit for the locator button.
//
// statusOf(unitId) → 'complete' | 'current' | 'available' | 'locked'
export function buildTerrain(stages, statusOf, { currentUnitId, expandedIds } = {}) {
  const collapsed = collapsedStageIds(stages, currentUnitId, expandedIds || new Set());
  const sections = [];
  let y = 0;
  let currentOffset = 0;

  for (const stage of stages) {
    if (!stage.units.length) continue; // an empty stage does not exist visually
    const stageComplete = stage.units.every((u) => statusOf(u.id) === 'complete');

    if (collapsed.has(stage.id)) {
      sections.push({
        stage,
        collapsed: true,
        y,
        height: TERRAIN.collapsedH,
        unitCount: stage.units.length,
        rows: [],
        stageComplete,
      });
      y += TERRAIN.collapsedH;
      continue;
    }

    const rows = stage.units.map((unit, i) => {
      const reaction = isReactionUnit(unit);
      const status = statusOf(unit.id);
      const row = {
        unit,
        status,
        reaction,
        shape: reaction ? 'diamond' : 'circle',
        last: i === stage.units.length - 1,
        interchange: i === stage.units.length - 1 && stageComplete,
        yInStage: i * TERRAIN.rowH,
      };
      if (unit.id === currentUnitId) currentOffset = y + TERRAIN.stageHeaderH + row.yInStage;
      return row;
    });

    const height = TERRAIN.stageHeaderH + rows.length * TERRAIN.rowH;
    sections.push({ stage, collapsed: false, y, height, rows, stageComplete });
    y += height;
  }

  // The reference's caption — "The pathway opens one stage at a time." —
  // hangs under the first locked stations the student can see.
  const firstLocked = sections.find((sec) => !sec.collapsed && sec.rows.some((r) => r.status === 'locked'));
  if (firstLocked) firstLocked.lockCaption = true;

  return { sections, totalHeight: y, currentOffset };
}

// Stages whose completion has not yet been celebrated: the Learn screen
// plays the layered fireworks for these when it comes into view, then marks
// them so a celebration fires exactly once, on the first genuine stage
// transition — never on a revisit.
export function uncelebratedStages(stages, statusOf, celebratedIds = []) {
  return stages
    .filter((s) => s.units.length && s.units.every((u) => statusOf(u.id) === 'complete'))
    .filter((s) => !celebratedIds.includes(s.id))
    .map((s) => s.id);
}
