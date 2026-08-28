# Catalyst


## Home and Learn

Home recommends exactly one next action, chosen by a tested decision table
over the learner's own data (docs/home-learn-redesign.md); Learn draws the
curriculum as a metro route — naming on the teal main line, reactions in a
coral side lane, checkpoints as stations, completed stages as interchanges —
from pure, tested geometry. Stage completions celebrate on the route, once.

## The name

Formerly Structura; now **Catalyst**. The rename covers every user-facing
string, comment, doc and test. Three identifiers were deliberately left
behind, because each is distribution identity rather than a name:

- `slug: "structura"` and the iOS/Android ids `au.com.structura.app` in
  `app.json` — changing these mid-beta orphans the Expo project link and, on
  a store build, makes the app a different app with no update path. Flip them
  only alongside a coordinated re-release.
- `FEEDBACK_EMAIL = feedback@structura.app` in `src/config.js` — points at a
  real mailbox; change it when a catalyst-domain mailbox exists.

The AsyncStorage key moved to `@catalyst/state:v5` WITH a one-time migration
from the old key (tested in `tests/beta-access.test.mjs`): update day is
invisible to testers. `CATALYST-BETA`/`CATALYST-TESTER` are live access
codes; the old `STRUCTURA-*` codes remain as aliases because printed codes
must keep working.


A mobile app for learning IUPAC organic nomenclature. Bidirectional throughout:
every unit teaches both structure → name and name → structure, and answers are
checked by a real chemistry engine rather than string comparison against a
stored answer.

React Native / Expo. Runs in Expo Go — no native build required.

---

## Setup

Requires Node 18+ and a phone with [Expo Go](https://expo.dev/go).

```bash
git clone <this repo>
cd structura
bash scripts/bootstrap.sh      # one time: generates Expo scaffolding, installs deps, runs tests
npm run tunnel                 # start Metro (use --tunnel from a Codespace)
```

Read-aloud uses `expo-speech`, which is already in `package.json` (`~14.0.8`
on SDK 54). `bootstrap.sh` installs it for fresh clones.

Scan the QR code with Expo Go. Afterwards, `npm start` is enough locally;
`npm run tunnel` is needed when the dev machine and phone are not on the same
network (Codespaces, corporate wifi).

The bootstrap step exists because Expo pins package versions to the SDK — it
generates `package.json` with `create-expo-app` rather than committing guessed
version ranges. Commit the files it generates.

## Tests

```bash
npm test              # every suite
npm run test:engine   # just the engine (699 tests, runs in under a second)
```

| Suite | What it protects |
|---|---|
| `src/engine/test.mjs` | The engine itself — naming, parsing, round-trips, stereo, geometry |
| `tests/curriculum.test.mjs` | Curriculum shape, and that every authored target *actually is* the molecule its name claims |
| `tests/bridge.test.mjs` | Answer checking, error classification, stereo-blindness, invalid drawings |
| `tests/sandbox.test.mjs` | name → structure → re-name, and that name parts map onto rendered atoms |
| `tests/sandbox-layout.test.mjs` | ring/chain builders, Clean preserving identity, NaN-transform guard |
| `tests/render-smoke.test.mjs` | every component actually executes (catches missing imports) |
| `tests/authoring-doc.test.mjs` | every molecule example in the authoring guide is what it claims |
| `tests/lesson-steps.test.mjs` | renders the real lesson player at every step of every lesson, with child components executed and SVG attributes audited for NaN |
| `tests/sandbox-layout.test.mjs` | the ported ring/chain builders and Clean, against CHECKLIST cases |
| `tests/render-smoke.test.mjs` | every sandbox component actually executes (catches unimported identifiers) |

`npm test` also runs `scripts/check-refs.mjs` first, which fails the build if a
file references something a sibling module exports but it never imports, passes a
component a prop it does not declare, or uses a React/RN/SVG name it has not
imported. That last one is not theoretical: `render.js` shipped once calling
`PanResponder.create` without importing PanResponder. It bundles cleanly and
throws only when the component renders.

**Run the engine suite before and after touching `src/engine/`.** Several fixes
during the engine's development broke something else, and the suite caught every
one.

---

## Architecture

```
App.js                     root: providers, onboarding routing, tab bar, overlays
src/
  theme.js                 design tokens
  engine/                  chemistry engine — VENDORED, DO NOT EDIT (see below)
  chem/
    engineBridge.js        the only bridge between app and engine
    model.js               editor molecule model (graph, valence, formula)
    questions.js           practice question banks
  content/
    curriculum.js          10 stages, 38 units — mirrors docs/curriculum.md
    content.js             façade + shared taxonomies (levels, topics, error classes)
  components/
    ui.js                  shared primitives
    canvas/                molecule renderer, interactive editor, static viewer
  screens/
    onboarding/            welcome → goal → level → name
    main/                  Home, Learn, Practice, Sandbox, Progress, Account,
                           LessonPlayer, DrawQuestion, NameQuestion, Overlays
  state/store.js           state, persistence, entitlement, attempt log
docs/
  curriculum.md            the pedagogical source of truth
  engine-handover.md       engine design, API, coverage, limits
  engine-checklist.md      ~430 manual UI checks
```

### The engine is vendored and canonical

`src/engine/` is a self-contained bidirectional IUPAC engine with no
dependencies. It is treated as a library: **keep it unmodified** so it can be
updated wholesale. Everything the app needs goes through
`src/chem/engineBridge.js`, which is the only file that knows both worlds.

Two design properties are worth understanding before changing anything:

1. **The namer is the canonical form.** Two structures are the same molecule
   exactly when the engine names them identically. Answer checking needs no
   graph-isomorphism code, and a correct structure drawn at any angle matches.
2. **Refusal beats a confident wrong answer.** Where the engine cannot be sure,
   it returns an error code and a student-facing message instead of guessing.
   Preserve that when surfacing errors — the student cannot catch a fluent lie.

### Stereo-blind checking (important)

The engine reads E/Z geometry from drawn coordinates, so an ordinary zigzag
but-2-ene names as `(2E)-but-2-ene`. Stereochemistry is not taught until unit
31, so marking that "wrong stereo" in Stage 3 would be a bug. Questions are
therefore checked **stereo-blind** by default; those that assess stereochemistry
opt in:

```js
checkDrawing(mol, targetName, { stereo: true })
```

`tests/bridge.test.mjs` guards this in both directions.

### Attempt logging

Every question attempt — in lessons and in practice — is logged with unit,
question id, question type, topics, difficulty, correctness, time taken and an
error class. Analytics and adaptive practice are only as good as this data and
it cannot be collected retroactively, so keep the schema stable and log from
every new question type.

---

## Sandbox is full screen

Entering the sandbox hides the tab bar and gives the canvas the whole screen.
Because the tab bar is gone, there are two ways out: the back arrow in its
header, and the Android hardware back button (wired in `App.js`, which
remembers the tab you came from). Saved molecules are held in app state and
persist across restarts — save from the dock's More menu, reopen or delete them
from the bookmark button in the sandbox header.

## Web preview

`npm run web` (or `npx expo start --web`) runs the app in a browser. On web only,
`src/components/DeviceFrame.js` wraps the app in a phone-sized frame with a
device switcher — iPhone, Small, Android, Tablet, or Full width. On a device it
is a pass-through and renders nothing of its own.

Screens size themselves with `useViewport()`, not `useWindowDimensions()`.
Inside the frame those are different numbers, and using the window would make
the canvas draw itself wider than the frame containing it. When the window is too short the frame shrinks
PROPORTIONALLY — a smaller phone, not a squashed one — so the aspect ratio a
student would see is preserved. That is done by giving the app a smaller layout
box, never a CSS transform: a transform shifts the page coordinates the canvas
hit-tests against and would put every tap in the wrong place. The maths lives in
`src/components/deviceSizes.js` (pure, so `tests/sandbox-layout.test.mjs` can
assert the ratio holds and the frame still fits the window).

Web needs three extra packages: `npx expo install react-dom react-native-web @expo/metro-runtime`.

## Overlays and transitions

`src/components/Overlay.js` replaces React Native's `<Modal>` everywhere.
A Modal renders into a separate host view — on web that is outside the app's
DOM tree, so it escaped the device frame and took over the whole browser
window. `Overlay` is an absolutely-positioned animated view that stays in the
tree. `tests/no-modal.test.mjs` fails the build if `<Modal>` is reintroduced.

A lesson announces the switch from teaching to being asked with `SectionWipe`:
a full-screen teal panel wipes in from the right, holds with the label, then
wipes off to the left. **The step changes at the moment the panel fully covers
the screen**, so the switch is never seen happening — `onCover` fires once at
coverage and the player commits the pending step there.

It fires exactly once per lesson: on crossing out of the teaching steps, or
immediately for a checkpoint, which has no teaching part and shows
"Checkpoint" with the pass mark instead. If the animation is interrupted, the
commit still runs and the panel clears rather than stranding the learner behind
it. `tests/transition.test.mjs` models the cover-then-commit contract.

Opening a lesson or starting a practice set shows `LoadingScreen` for about half
a second — a rotating hex mark plus the lesson name — then cross-fades into the
content, so a tap is acknowledged immediately and the lesson arrives introduced
rather than snapping in mid-sentence.

## Authoring content

**docs/authoring.md** is the guide: the five step types, how to build molecules,
how to add a lesson or open up one of the placeholder units, and what each test
failure means. Every code sample in it is executed by `tests/authoring-doc.test.mjs`,
so the guide cannot drift from the code.

## Curriculum

`docs/curriculum.md` is the pedagogical source of truth: 10 stages, 38 units,
with the dependency map and the ranked list of where learners actually struggle.
`src/content/curriculum.js` mirrors it; the tests assert stage themes and unit
counts match.

Authored so far: **units 1–6** (15 lessons, 54 steps). Per the doc's build
order, **units 9–13 come next** — alcohols → the priority ladder → aldehydes →
ketones → carboxylic acids — because that block is what proves the pedagogy.
Units 7–8 are mechanical backfill.

Lesson step types: `teach` (optionally with a molecule diagram and caption),
`mc` (also used for error-analysis items), `name`, `draw`, and `build` — an
interactive step where the learner adds and removes carbons and watches the
IUPAC name follow, with the root and the `-ane` ending shown as separate parts.
`build` steps are verified across their whole range by the curriculum suite. Every authored target is verified by the test suite to name back to the
name it was authored under.

---

## The reactions thread

Organic reactions and physical properties, interleaved into the naming course
per `docs/reactions-plan.md`. The full thread of `docs/reactions-plan.md` is authored: ten r-units across
stages 2–10, each placed directly after the naming content it depends on.
Properties (R1, R6), hydrocarbon reactions (R2), the alcohols → oxidation →
esterification core (R3–R5), nitrogen (R7), pathways (R8 — start and target
fixed, reagent tiles between, every placed step deriving its intermediate
live through the same walker the suite uses), polymers (R9), and yield and
atom economy (R10, every figure computed from the engine's formulas and
recomputed by the suite).

Correctness by construction, extended: every card is authored as names, so
both endpoints parse, draw and round-trip; the engine computes molecular
formulas, so `tests/reactions.test.mjs` asserts every equation conserves
atoms; and a rules table checks each card against the grammar of its claimed
type. Reagents (NaOH(aq), Cr₂O₇²⁻/H⁺…) are whitelisted text chips — the
engine asserts nothing about them, and a typo'd one fails the build.

The thread ships behind `SHOW_REACTIONS` in `src/config.js`. If the research
study measures nomenclature outcomes, study builds set it false and the
intervention is unchanged; everything stays authored and tested either way.

## Business model

All learning is free — every lesson, every explanation, the full curriculum.
Catalyst Plus (A$5.00/month) adds the sandbox, adaptive practice, exam mode and
deep analytics. New users get a 7-day trial automatically on finishing
onboarding.

Access codes grant timed Plus for school pilots and testers. **Validation is
currently client-side and must move server-side before launch** — anything in
the bundle can be extracted. Billing is not implemented; RevenueCat needs a
development build rather than Expo Go, so it is deliberately deferred.

## Narration

A speaker button on every teaching page reads it out: heading, paragraph,
caption, in the order they are laid out. Automatic reading is a setting
(Account → Reading and sound), off by default.

Nothing is recorded. `src/content/speech.js` converts any authored string into
what should be *said*, and `speechTextFor(step)` builds the page's narration
from the step's own fields — so a lesson written next month is spoken the
moment it is authored, with no audio work at all.

The written and spoken forms genuinely differ, which is why this is a module
with a test suite rather than a call to `Speech.speak(step.body)`. `CH3` is
displayed `CH₃` and must be said "C H three"; `C6H14` is "C six H fourteen",
not "C six H one four"; `CnH(2n+2)` is "C n H, two n plus two". Handed the
displayed text, engines read subscripts unpredictably and some skip them
silently. Standalone numbers are left alone — those are read correctly.

The page is spoken as one utterance. An earlier version chained one per field
and coloured each word blue as it was said; the highlighting is gone, and the
chaining went with it — it cost a round of engine start-up latency per field
and gave five chances for one to be dropped.

**Voice.** Preference order is Australian English female, then NZ, GB, US,
then any English female, then any Australian English.

The important caveat, established by reading what the module actually returns:
**no platform reports a voice's gender.** expo-speech's `Voice` is
`{ identifier, name, quality, language }` on iOS, Android and web alike. Gender
therefore has to be inferred from the name, which works on iOS ("Karen",
"Samantha") and usually on web, and not at all on Android, where Google's
voices are called `en-au-x-aua-local` and carry no signal.

So Account has a voice picker: English voices listed, accents named in full,
opaque Android ids numbered within their accent, and a play button on each
that speaks a sample line containing a formula and a locant. On Android that
picker is how a female voice actually gets chosen — the heuristic is the
convenience, not the mechanism.

## Celebrations

The end of the quiz hands over the way its start did: the section wipe covers
the last answer, the screen changes to the results underneath, and the panel
peels off. The results side of that is a `SectionWipe` with `startCovered` —
the branch swap remounts the panel, and without the flag the remount would
wipe in a second time and show the seam the wipe exists to hide.

The fireworks are the first child of the results screen, so they paint BEHIND
everything that follows: bursts fill the hero area and the gaps, and pass
behind the white cards rather than over the numbers on them. Being behind is
what lets the show run long and large without costing readability or a tap.
They hold their opening bursts until the wipe has peeled off — coloured for a
completed lesson, gold for a perfect one, with a haptic thump per burst
scheduled from the same list that drives the animation. Gold appears in
exactly two places in this app, here and on the accuracy ring at 100%, which
is what makes it read as an award rather than as a colour.

Built from plain `Animated.View` dots: no Reanimated, no Skia, nothing outside
Expo Go, and translate/opacity/scale are what the native driver can take off
the JS thread. `makeBursts()` is pure and seeded, so a burst that looks wrong
is reproducible. The whole layer is `pointerEvents="none"` — Continue stays
pressable throughout.

Both the fireworks and their vibration can be turned off in Account.

## First-run tour

After onboarding, seven spotlight cards over the Home screen. The scrim is one
SVG path with an even-odd fill: outer rectangle, inner rounded rectangle. Four
grey panels around a gap was the obvious alternative and gives square corners
that match nothing else in the app.

Screens register the things the tour points at — `useTourTarget('home.continue')`
— and the tour names targets. Neither knows anything else about the other, and
`tests/tour.test.mjs` fails if a step names a target no screen registers, which
is otherwise a silent fault: the tour does not crash, it just spotlights
nothing on a new student's first minute.

Replayable from Account → Preferences → Show the tour again.

## Status

Working: onboarding and the first-run tour, the six-tab app, the molecule
canvas, lesson player, narration of teaching pages, practice sessions
(draw / name / mixed), the full reactions thread (R1–R10), the sandbox, end-of-lesson celebrations, entitlements
and access codes, local persistence.

Not yet: billing, accounts and sync, the post-content diagnostic quiz, units
7–38, spaced repetition, exam mode.
