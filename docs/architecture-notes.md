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

**Element colours.** `EL_COLOUR` in `sandbox/constants.js` is the single map,
used by the canvas, the structure renderer and the periodic table. Every
element with a valence entry needs its own colour: hydrogen and all four
halogens used to fall through to one violet, so chlorine and hydrogen were
indistinguishable. `tests/periodic.test.mjs` fails if any drawable element
lacks a colour or shares one.

**Collinear bonds hide atoms.** Two bonds meeting at a bare chain carbon must
not be parallel: they draw as a single long line with the carbon invisible
inside it, so a counting question on that drawing cannot be answered by
counting. `bentChain` produced exactly this where its two direction pairs met.
The geometry audit now checks it — but only for unlabelled chain carbons, since
H-C-H drawn straight across a labelled atom is correct.

**Chain geometry.** `sandbox/layout.js`'s `tidy` snaps to a SQUARE lattice, so
a chain comes out with 90° corners — a square wave, not a skeletal formula.
Anything shown to a learner is laid out by `chem/prettify.js` instead, which
names the molecule and parses the name back: the naming engine produces the
~120° geometry chemists use, and a round trip through the same name cannot
change the molecule. `tidy` remains the fallback for drawings the engine
cannot name. The geometry audit fails any chain carbon outside 100-155°.

**Hydrogens on the canvas.** A heteroatom shows its hydrogens as soon as it is
placed — drop an oxygen on a chain and it reads OH, a nitrogen NH2 — while
carbon still hides its own unless every atom is being shown. They are counted
from the four-bond rule and drawn, never added to the graph: the naming engine
answers `unsupported` for a molecule carrying explicit hydrogens, so storing
them would make every drawing unnameable.

**Locked frames.** `StaticMol` normally recomputes its scale and centre from
the molecule's own bounding box, so moving a substituent — or adding a carbon —
re-frames the drawing and the chain appears to jump even though its model
coordinates never changed. An interactive that asks the learner to watch one
thing change must hold everything else still, so the builders pass a `frame`
covering every state their controls can reach.
`tests/interactive-builders.test.mjs` compares projected SCREEN positions, not
model coordinates — the distinction is the whole point.

**The attempt log.** `state.attempts` is the durable record and the eventual
sync payload. It carries the skill x family tags (`category`, `family`,
`subcategory`) and an `errorClass` saying what kind of mistake was made.

Both were previously dropped before being written: the log knew a question was
failed but not what kind of question it was or why it went wrong. Neither can
be reconstructed afterwards, which is why they are in the schema now rather
than later.

Drawings are classified by the ENGINE — `checkDrawing` already returns
`issue.errorClass`, and the player now passes it through instead of writing a
constant. Typed answers have no structure to inspect, so `classifyWritten`
compares the two names: same words and different numbers is a locant error,
same numbers and a different ending is a seniority error, and so on. It is
deliberately conservative — anything it cannot place is `other` rather than a
guess, because a wrong label is worse than none.

`weaknessProfile` and `errorProfile` read the log. Both apply a confidence
floor: below the threshold the answer is "not enough yet", never a percentage.
One wrong answer is noise, and presenting it as a weakness sends someone to
practise the wrong thing.

**The attempt log is the durable record.** A lesson result is transient; the
log is what a sync, a dashboard or an evaluation study would read later — so
whatever is written at the time is all there will ever be.

Each attempt carries the skill and family tags (`category`, `family`,
`subcategory`) as well as an `errorClass`. The class comes from the engine
where it can — `checkDrawing` already classifies a wrong drawing precisely —
from answer shape for written answers, and otherwise from what the CATEGORY
implies: a numbering question got wrong is a locant error. Only a genuinely
unknown fault is filed as `other`.

`state/store.js` holds the only selectors that interpret the log:
`subcategoryStats`, `errorProfile`, `weakestSkill` and `weaknessShape`. The
last is the point of the two-level tags: drawing weak across every family is a
SKILL problem, alkenes weak across every skill is a CHEMISTRY problem, and the
advice differs. All of them report nothing rather than guessing when the
evidence is thin — `tests/attempt-log.test.mjs` asserts that a single wrong
answer is never enough to call something a weakness.

**Screens must be mounted in tests.** The Sandbox shipped a white screen
because `SandboxLocked` used `Header` without importing it — and since
`sandbox` is a premium feature, every non-premium user hit that path on the
first tap. Nothing caught it: the canvas was smoke-tested, the screen never
was, and the React stub returned an empty context so any screen reading app
state threw for the wrong reason.

The stub now honours `globalThis.__ctx`, and `tests/screens.test.mjs` deep-
renders every top-level screen against state mirroring `seedProgress()` —
fresh install, with saved molecules, with attempt data, and locked. The locked
paths matter most: they are the ones a developer with a dev build never sees.

`scripts/check-refs.mjs` also fails on a state setter that is called but never
declared, which is how a stale `setSaved` survived the removal of its
`useState`.

**A recommendation opens a real set.** `recommendNext` names a skill;
`questionsMatching` pulls every curriculum question tagged with that
skill×family; `FocusOverlay` wraps them in a synthetic lesson and hands it to
`LessonPlayer`. Reusing the lesson player rather than writing a second one
means the results screen, the category breakdown and the attempt log all
behave identically — the focused practice IS a lesson, so nothing downstream
needs to know the difference.

Rule-based skills (bond counts, hydrogen counts) deliberately draw from every
family: the skill is about the rule, not the molecule.

**Every test file must be registered.** Two suites were written, packaged and
shipped without ever running, because the edit meant to add them to
`run-tests.mjs` silently failed to match. The runner now fails if a
`tests/*.test.mjs` file is not in its list — a test that does not run is worse
than no test, because it reads as coverage.

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
