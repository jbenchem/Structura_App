# Structura

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

Scan the QR code with Expo Go. Afterwards, `npm start` is enough locally;
`npm run tunnel` is needed when the dev machine and phone are not on the same
network (Codespaces, corporate wifi).

The bootstrap step exists because Expo pins package versions to the SDK — it
generates `package.json` with `create-expo-app` rather than committing guessed
version ranges. Commit the files it generates.

## Tests

```bash
npm test              # all four suites
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

## Business model

All learning is free — every lesson, every explanation, the full curriculum.
Structura Plus (A$5.00/month) adds the sandbox, adaptive practice, exam mode and
deep analytics. New users get a 7-day trial automatically on finishing
onboarding.

Access codes grant timed Plus for school pilots and testers. **Validation is
currently client-side and must move server-side before launch** — anything in
the bundle can be extracted. Billing is not implemented; RevenueCat needs a
development build rather than Expo Go, so it is deliberately deferred.

## Status

Working: onboarding, the six-tab app, the molecule canvas, lesson player,
practice sessions (draw / name / mixed), the sandbox, entitlements and access
codes, local persistence.

Not yet: billing, accounts and sync, the post-content diagnostic quiz, units
7–38, spaced repetition, exam mode.
