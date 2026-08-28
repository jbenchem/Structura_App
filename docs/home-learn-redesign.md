# Home and Learn — the redesign, as implemented

From the design exploration boards (metro terrain, one-decision Home, first
two sessions). This records what shipped, and where implementation deviates
from the boards and why.

## Home: one recommended action

`src/state/heroDecision.js` is the opinion: a priority-ordered rule table,
first match wins, computed once per visit so the hero never flickers. Rules
as implemented (spec numbering kept):

1. brand-new → start the first unit
3. away ≥7 days → short mixed re-entry set
4. last lesson of the unit reached → "your checkpoint is ready"
5. supplied exam date within 28 days, ≥20 real attempts → timed practice
   (INERT until setup collects an exam date — the app never infers one)
6. every enabled unit complete → consolidation set
7. weak error class (≥10 comparable attempts, ≥4 errors, ≥35% in 30 days)
   → focused set targeting the category and the named mistake
8. recent and mid-unit → continue the exact lesson, "lesson n of m"
9. study build where the flag changed what's next → continue + one honest line
10. streak ≥2 and a fresh unit → "keep building" (never a threat)
11. otherwise → plain continue

Safeguards are tested, not aspirational (`tests/hero-decision.test.mjs`):
streak below all evidence rules; one mistake is never a diagnosis; errors
never pool across categories; demo data invisible; no shouting; no urgency
words.

Deviations from the board:
- Spec rule 2 ("checkpoint failed recently") is folded into rule 7: the
  store records lesson advancement, not checkpoint pass/fail. Recording
  outcomes is a small store addition if the distinction earns its keep.
- No invented durations ("about 6 minutes"): the app has no per-lesson
  timing data, so copy counts lessons instead. Honesty beats mimicry.
- Secondary rows are always visible for returning users rather than behind
  a "choose something else" toggle — hidden rows would break the tour's
  spotlight targets, and one extra glance costs less than a broken tour.

Also on Home: the mascot (`src/components/Mascot.js`, one SVG flask, three
poses, single 240ms entrance, no looping animation, reduce-motion honoured)
and the evidence strip (`lastSessionEvidence`: plain counts, withheld under
four answers).

## Learn: the metro terrain

`src/screens/main/learnTerrain.js` is pure geometry — stations, lanes,
elbows, offsets — tested against the real 40-unit curriculum and the
30-unit study view (`tests/learn-terrain.test.mjs`). The screen renders
rows; it decides nothing.

- Naming units: teal main line, circle checkpoints. Reaction units: coral
  side lane, diamond checkpoints. Stage completion: double-ring interchange.
- Study flag off: the route recomputes — no coral remnants, no orphan
  elbows, no empty stages (every stage keeps naming units, verified).
- Distant locked stages collapse to bands (current stage + successor always
  full), bounding mounted SVG to roughly a dozen stations. Tap a band to
  expand. Static paths per row; the only animation is the current halo.
- Locked taps open an explanation sheet (Overlay, not Modal): "Finish X to
  open Y", a button to the current unit, "Not now". Never a shake, never a
  paywall.
- Locator button scrolls to the current unit at 38% viewport height, from
  offsets the terrain computes (tested to tile exactly).

## Stage celebrations

Stage completion now celebrates ON LEARN, once, at the first genuine look at
the completed stage: fireworks over the route, a banner, and the stage
recorded in `state.celebratedStages` so revisits replay nothing
(`uncelebratedStages` is tested for exactly-once).

Deviation: per-lesson results celebrations are UNCHANGED. The board wanted
the results screen quiet before the first stage celebration; results
celebrations are shipped, liked, and covered by their own tests, so they
stay. If the double celebration on stage-completing checkpoints grates in
practice, suppressing the results one is a one-line follow-up.

## Store additions

`celebratedStages` + `markStageCelebrated`; `lastActiveAt` stamped by
logAttempt and completeLesson (feeds the re-entry rule). Both default safely
for states saved before they existed.
