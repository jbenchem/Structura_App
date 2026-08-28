// ─────────────────────────────────────────────────────────────
// Learn as terrain — the metro line, as pure geometry.
//
// The Learn screen used to be forty near-identical rows. The redesign draws
// the curriculum as a route: naming units ride the teal main line, reaction
// units pull out into a coral side lane, every unit ends at a checkpoint
// station, and completing a stage earns a double-ring interchange.
//
// Why the metro won over the winding path and the molecule (from the design
// exploration): it survives every awkward fact of THIS curriculum. Stages
// run from one unit to twelve and stay legible; the two content types get a
// structural distinction, not just a colour; and when the study flag removes
// the ten reaction units, the route simply recomputes — no stubs, no gaps,
// no chemically misleading shapes.
//
// Everything here is a pure function of (stages, statusOf, options) → rows
// with x/y/lane/shape, so the layout is unit-testable without rendering a
// pixel, and the screen is a thin renderer over the result. Distant locked
// stages collapse into single bands — which is also the performance story:
// only the neighbourhood of the current position mounts full stations.
// ─────────────────────────────────────────────────────────────

// Geometry constants, from the design spec. Everything is derived from
// these, so a spacing change is one edit.
export const TERRAIN = {
  margin: 16,
  mainX: 48, // naming line centre
  sideX: 88, // reaction lane centre
  rowH: 104, // standard unit pitch
  stageHeaderH: 64,
  collapsedH: 56,
  nodeR: 13, // checkpoint radius; with the plaque, the tap target far exceeds 44px
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
        lane: reaction ? 'side' : 'main',
        x: reaction ? TERRAIN.sideX : TERRAIN.mainX,
        shape: reaction ? 'diamond' : 'circle',
        // The elbow: does the line change lanes entering or leaving this row?
        // Drawn per-row so scrolling never morphs a path.
        elbowIn: i > 0 && isReactionUnit(stage.units[i - 1]) !== reaction,
        elbowOut: i < stage.units.length - 1 && isReactionUnit(stage.units[i + 1]) !== reaction,
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
