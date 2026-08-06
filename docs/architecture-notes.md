# Working notes

Decisions worth not re-litigating, and traps worth not re-discovering.

## Traps already hit (do not re-discover)

**Stale closures in the canvas.** `MoleculeCanvas` memoises its PanResponder
with `[]` so handlers are created once. Every value they read therefore comes
from `live.current`, a ref mirrored on each render — including transient state
like `preview` and `moveOverride`. Reading those from render scope inside a
gesture handler silently uses the values from the first render.

**Hit radii.** An atom's touch radius must be smaller than half the bond length
or bonds become untappable, and large enough to cover the drawn label or
heteroatoms become unhittable. Both were bugs in the prototype. Current values:
`ATOM_HIT = 22`, `BOND_HIT = 14`, `TAP_SLOP = 7`.

**Safe areas.** React Native's own `SafeAreaView` does nothing on Android. Use
`react-native-safe-area-context`; `Screen` takes an `edges` prop and full-screen
overlays pass `['top', 'bottom']` so their bottom buttons clear the gesture bar.

**Browser storage.** Not available. Persistence is AsyncStorage only.

**Unicode escapes in generated source.** If generating JSX programmatically,
post-process `\uXXXX` sequences into real characters — JSX does not process them
in text nodes.

**Selection after placing an atom.** Carbon stays selected so the next tap
extends the chain; a heteroatom (O, N, Cl…) does not, because those are almost
always terminal and leaving one armed caused accidental extra bonds — and, if
the next tap landed on an existing atom, accidental rings. Rings deselect for
the same reason. Applies in both `SandboxCanvas` (tap to place) and
`CanvasSurface` (the dock's Add button).

**Self-measuring children and scroll views.** The canvas measures its own
container. Put it inside a scroll view whose height grows with its content and
you get a feedback loop — measure, render that tall, content grows, measure
again. On web it never settles and the canvas expands downwards forever.
`QuestionShell` therefore takes `scroll={false}` for canvas questions, and
`clampCanvasSize` in `sandbox/constants.js` rejects implausible or sub-pixel
measurements as a second line of defence.

**Silently-missed edits.** Twice now a string replacement has missed and left
code referencing something that no longer matched, with no error. The teach card
lost its captions this way, and the `T()` helper was discarding its options
argument entirely. `tests/lesson-steps.test.mjs` now renders each teach step and
asserts the authored caption text and the `showCarbons` flag actually reach the
tree — check output, not just that code runs.

**Atom labels.** `LIMIT` in `sandbox/constants.js` must contain every element
that can appear explicitly. It had no entry for hydrogen, and the `?? 4`
fallback gave H carbon's valence — so an explicit H with one bond was drawn as
"HH3". Any new element needs an entry, not the fallback.

Hydrogens are hidden on carbon in skeletal mode but shown on heteroatoms, which
is the standard convention: an alcohol reads OH, an amine NH2.
`tests/atom-labels.test.mjs` checks the text that actually renders rather than
the counts behind it.

**Question layout.** Every question body sits inside a scroll area with
`flexGrow: 1` and `minHeight: 0`. Both matter:

- without `minHeight: 0` a flex child will not shrink below its content height,
  so the body grows past the screen and the Check answer button — painted after
  it — lands on top of the last options
- `flexGrow: 1` means a question that fits looks identical to one that is not
  scrollable at all

`questionSizing.js` shrinks questions to fit on short screens, but its
`estimateHeight` is a design aid, **not** a correctness mechanism. An earlier
version used it to decide whether to scroll; the estimate was optimistic (real
option rows are taller than modelled) and the last option ended up hidden.
Getting the estimate wrong must cost a small scroll, never a hidden answer.

**Two-finger gestures.** The pinch handler anchors the model point that was
under the fingers when the gesture STARTED. Recomputing the anchor from the
current midpoint each frame makes the translation cancel out at constant scale,
so two fingers zoomed but never panned.

**Canvas chrome.** The drawing surface is borderless and bleeds past the screen
edges (negative horizontal margins undo the Screen padding), and the floating
dock pads itself by the bottom safe-area inset — on Android the gesture bar was
covering the tool tray.

**Framing.** `fitView` in `sandbox/constants.js` frames a molecule in the
VISIBLE part of the canvas, not the whole canvas: the dock floats over the foot
and the overlay buttons cover the top, so centring against full height leaves
the structure drifting up under the controls. Zoom is floored at 0.35 — below
that a bond renders under ten pixels — so a very large structure is framed as
far out as remains readable and then panned. The maths is pure and tested in
`tests/canvas-controls.test.mjs`.

**Display hydrogens for cis/trans.** `src/chem/displayHydrogens.js` draws the
hydrogens on the carbons of a C=C so a configuration can be read off the
picture. This is a RENDERING change, not an engine one — the engine already
reports E/Z correctly.

The constraint that shapes the design: the engine answers `unsupported` for a
graph carrying explicit hydrogens. An expanded molecule therefore must never
reach `nameGraph`, `parseName` or the checker. Expansion happens inside
`StaticMol` at the moment of drawing and is discarded immediately; callers keep
passing the real molecule, and the expanded copy is marked `__display`.
`tests/display-hydrogens.test.mjs` asserts both halves: the drawing reads cis
or trans correctly, and the expanded graph is one the engine refuses.

## Verification workflow

There is no runtime testing in the authoring environment (no device, network
often restricted), so every change is verified statically:

```bash
npm test                                   # four suites
npx esbuild App.js --bundle --loader:.js=jsx --outfile=/dev/null \
  --external:react --external:react-native --external:expo-status-bar \
  --external:@expo/vector-icons --external:react-native-svg \
  --external:@react-native-async-storage/async-storage \
  --external:react-native-safe-area-context
```

The bundle check catches broken imports and missing named exports across files,
which syntax checking alone does not.

## Authoring a unit

1. Read the unit's entry in `docs/curriculum.md` — it states the single new idea
   and the specific misconceptions to target.
2. Add target molecules with `buildTarget(elements, bonds)` in
   `src/content/curriculum.js`.
3. Write steps: `T` teach, `MC` multiple choice, `NM` name, `DR` draw. Include at
   least one error-analysis MC ("a student wrote X — what went wrong?"), which
   the curriculum doc found more diagnostic than plain naming questions.
4. Run `npm test`. `curriculum.test.mjs` will fail if any authored target is not
   actually the molecule its name claims — this is the main safety net against
   teaching something wrong.

## Deliberately deferred

- **Billing (RevenueCat).** Needs a development build, which would end the Expo
  Go workflow. Deferred until there is something to charge for.
- **Accounts and sync.** Everything is local-first. When sync arrives, the
  attempt log is the payload — which is why its schema is kept stable now.
- **Server-side code validation.** Access codes are client-side; this must
  change before launch.
- **The diagnostic quiz.** A fixed question list spanning the curriculum, run
  after enough content exists. Does double duty: places the learner, and ends
  with a one-time full mastery report as a genuine taste of Plus analytics.
