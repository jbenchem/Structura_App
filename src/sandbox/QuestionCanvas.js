// ─────────────────────────────────────────────────────────────
// QuestionCanvas — the same canvas and dock as the sandbox, in an
// assessment context.
//
// Differences, all deliberate:
//   • explain is always OFF here: no live naming, no tappable name,
//     no reasoning. The screen must not reveal the answer.
//   • the More menu loses Practice and Save.
//   • the name controls are hidden (there is no name card to hide).
//
// The parent owns the graph so it can check it; this component owns
// only the drawing.
// ─────────────────────────────────────────────────────────────

import React, { forwardRef } from 'react';
import { CanvasSurface } from './CanvasSurface';

export const QuestionCanvas = forwardRef(function QuestionCanvas(
  { graph, setGraph, banner, highlight, emptyHint },
  ref
) {
  return (
    <CanvasSurface
      ref={ref}
      embedded
      // The dock is a row beneath the canvas here, not a floating panel over
      // it, so none of the drawing area needs to be kept clear for it.
      compact
      graph={graph}
      setGraph={setGraph}
      banner={banner}
      highlight={highlight}
      onPickAtom={null}
      locants={null}
      showNameControls={false}
      dockTabs={['bond', 'atom', 'ring', 'edit', 'more']}
      moreItems={[]}
      emptyHint={
        emptyHint || {
          title: 'Draw your answer',
          body: 'Tap to place an atom, then tap again to chain onwards. Use the dock to pick bonds, elements and rings.',
        }
      }
    />
  );
});
