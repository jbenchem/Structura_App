# Catalyst — handover

A bidirectional IUPAC organic nomenclature engine, and a prototype React
Native app that exercises it.

The engine is the asset. It is plain ES modules with no dependencies, it
carries **699 automated tests**, and it can be lifted into any JavaScript
environment unchanged. The app is a working prototype: correct and complete
enough to demonstrate every engine feature, but it is a single 2,000-line file
with no persistence, and it is expected to be rebuilt rather than extended.

---

## 1. What it does

**Structure → name.** Give it a molecular graph — atoms with coordinates,
bonds with orders — and it returns the IUPAC name, molecular formula, mass,
the reasoning behind the name, and a segmentation of the name that maps each
part back to the atoms it describes.

**Name → structure.** Give it a name and it returns a drawable structure with
2D coordinates, having verified its own work by naming the result back.

**Answer checking.** Compare a drawn structure against a target name and get a
classified verdict: correct, wrong position, wrong group, wrong skeleton,
wrong stereochemistry.

Nothing is a lookup table of pre-computed answers. Every name is derived, and
every structure is built.

---

## 2. Layout

```
structura-app/
  App.js              the prototype app, single file
  INSTALL.md          how to run it
  CHECKLIST.md        manual test script, ~430 checks
  HANDOVER.md         this document
  engine/
    core.js           graph normalisation, rings, valence, formula
    groups.js         functional group perception, seniority, CIP
    stereo.js         R/S and E/Z from 2D geometry
    name.js           structure → name
    parse.js          name → structure
    compare.js        answer checking and hints
    synonyms.js       verified alternative names
    index.js          public API
    test.mjs          699 tests
    README.md         engine reference
```

The engine has **no dependencies**. `node engine/test.mjs` runs the suite.

---

## 3. Public API

```js
import {
  nameGraph, parseName, matchStructure, hintsFor, synonymsFor
} from "./engine/index.js";
```

### nameGraph(graph, opts?)

```js
nameGraph({
  atoms: [{ id, x, y, el? }],          // el omitted means carbon
  bonds: [{ a, b, order, stereo? }],   // stereo: "wedge" | "dash"
}, { stereoStyle: "ez" | "cistrans" })
```

Returns on success:

| field | meaning |
|---|---|
| `name` | the IUPAC name |
| `formula`, `mass` | Hill-order formula and molecular mass |
| `parts` | the name split into tappable segments (below) |
| `locants` | atom id → locant, for numbering the skeleton |
| `stereo` | `{ centres, doubles }` with configurations |
| `steps` | `[[title, body], …]` reasoning, for a "show me why" panel |

On failure: `{ ok:false, err, message, mol? }`. `message` is student-facing
copy meant to be displayed verbatim. `mol` is present when the structure is
drawable despite being invalid — an overloaded valence, say — so the learner
can see what their name describes.

Error codes are stable: `empty · nocarbon · element · disconnected · valence ·
malformed · impossible · ambiguous · unsupported · name-issue`.

### The `parts` array

Each entry is `{ text, kind, atoms, label, locs?, numbered? }`. Concatenating
every `text` reproduces `name` exactly — asserted by tests. `kind` is one of
`parent · substituent · suffix · stereo · unsaturation · punctuation`.

This is what drives the tap-a-name-to-highlight-the-structure feature, and it
is recursive: a complex substituent breaks into its own pieces, so
`5-(1-fluoroethyl)decane` yields separate `1-fluoro` and `ethyl` segments
pointing at 1 and 2 atoms respectively.

### parseName(name)

Returns `{ ok, mol, formula, mass, name, canonical, parts, locants, steps,
note?, issue? }`.

`issue` classifies why a given name differs from the preferred one:

- `numbering` — right groups, numbered from the wrong end
- `parent` — the wrong parent chain was chosen
- `style` — an older or trivial spelling, not a mistake

The structure is built either way. This is the basis of the
accept-but-flag behaviour.

### matchStructure(drawn, target) and hintsFor(name)

`matchStructure` returns `{ match, klass, message }` where `klass` is
`correct · correct-but-unspecified · wrong-position · wrong-group ·
wrong-skeleton · wrong-stereo · wrong-formula · empty · invalid`.

Two structures are the same molecule exactly when the engine names them
identically, so the namer doubles as the canonical form. A correct structure
drawn at any angle or position matches.

`hintsFor` returns an escalating hint sequence ending with the answer.

### synonymsFor(name)

Returns the other accepted names, **each verified by parsing it and comparing
the result** with the molecule asked about. A table entry that stopped
resolving correctly would drop out of the list rather than mislead.

---

## 4. Coverage

**Chains** to 30 carbons. Alkanes, alkenes, alkynes, haloalkanes, alcohols,
aldehydes, ketones, carboxylic acids, esters, acyl halides, anhydrides,
ethers, amines (primary, secondary, tertiary), amides including
N-substituted, nitriles, nitro compounds, thiols, sulfides.

**Substituents** including branched (`propan-2-yl`, `2-methylpropan-2-yl`),
unsaturated (`ethenyl`, `prop-2-en-1-yl`), bracketed and substituted
(`5-(1-fluoroethyl)`, `3-(3-propan-2-ylphenyl)`), and acyloxy.

**Rings.** Cycloalkanes; benzene with retained names; 20+ heterocycles from
three-membered upward; fused systems (naphthalene, anthracene, phenanthrene,
indole, quinoline, isoquinoline, benzofuran, benzothiophene, purine) with
substituents and suffix groups; `bicyclo[x.y.z]` and `spiro[x.y]` systems,
substituted and unsaturated; aza/oxa/thia replacement; von Baeyer
`tricyclo[…]` for saturated polycyclics.

**Stereochemistry.** R/S from wedge and dash geometry, E/Z from double-bond
geometry, both directions, on chains and rings and bridged systems.
`cis`/`trans` accepted as input and available as an output style, refused
where it has no meaning.

**Roughly 100 trivial names** — solvents, amino acids, fatty acids,
aromatics, caffeine, aspirin, glucose — plus spelling suggestions for
mistypes.

### Deliberately not supported

Each of these refuses with an explanation rather than guessing:

- Substituted fused heterocycles beyond the template set
- Ring systems of more than three rings; unsaturated polycyclics other than
  the retained aromatics
- Sulfonic acids, mixed anhydrides
- cis/trans across a ring
- Charges and ions
- Chains beyond 30 carbons

Cocaine and tropane are the only remaining **hand-built structures**. Their
von Baeyer cage with four stereocentres needs infrastructure that does not
exist yet. Everything else, caffeine and aspirin included, is derived.

---

## 5. Design decisions worth preserving

**The namer is the canonical form.** Two structures are the same molecule
when they name identically. This removes any need for graph-isomorphism code
and means answer checking is free and always consistent with naming.

**The parser verifies itself.** `parseName` builds a graph and then calls
`nameGraph` on it, comparing the result. A name is only returned as valid if
the structure it produced names back correctly. CIP logic exists in exactly
one place.

**Refusal beats a confident wrong answer.** Several of the worst bugs found
during development were fluent, plausible names for the wrong molecule: a
demoted ester silently dropped, leaving aspirin named as "benzoic acid"; a
substituent's stereo descriptor ignored so all four isomers drew identically;
a built "indole" that was actually isoindole. Wherever the engine cannot be
sure, it says so. This matters more in a teaching tool than in a chemist's
tool, because the student has no way to catch it.

**Templates, not special cases.** Fused ring systems are a data table of
perimeter templates giving element sequence, locants and junction positions.
The same table names a drawn structure and builds one from a name, so the two
directions cannot drift apart. Adding a ring system is a data row.

**Coordinates are drawing-quality.** Substituents are placed at real bond
angles, ring double bonds point inward, no carbon is drawn with its two bonds
in a straight line, and bridges arc rather than lying flat. The test suite
asserts geometry — minimum bond angles, bond-length spread, crossings,
overlaps, straight vertices — because a chemically correct structure that
looks wrong is still wrong to a learner.

---

## 6. Testing

```
cd engine && node test.mjs        →  699 passed, 0 failed
```

The suite covers naming, parsing, round-tripping, error classes, stereo,
answer checking, synonyms, name segmentation and drawing geometry. It runs in
under a second and requires nothing but Node.

`CHECKLIST.md` is the manual script for the app — around 430 checks organised
by feature, with the specific molecules that previously exposed each bug.

**When changing the engine, run the suite before and after.** Several fixes
in development broke something else, and the suite caught every one.

---

## 7. The prototype app

`App.js` demonstrates the engine. Two tabs:

**Draw** — a touch canvas. Tap to place atoms, tap two atoms to bond them,
tap a bond to change its type. A chain tool draws a zigzag by dragging; ring
templates place, attach, fuse or spiro depending on what is selected. Pinch
zoom, pan, and a Clean function that re-lays the structure on a 45° lattice
while preserving stereochemistry. The name updates live, and tapping parts of
it highlights the structure.

**Look up** — type a name, see the structure, tap parts of the name for
explanations, tap the structure to find the corresponding part of the name,
and see verified synonyms.

Also present: practice mode with classified feedback and escalating hints, an
E/Z ↔ cis/trans toggle, and an `explain` flag that disables all explanation
features — intended to be driven by lesson context so that explanations are
unavailable during assessment.

### Known gaps in the app

- **No persistence.** Saved structures are in memory and lost on refresh.
  `AsyncStorage` is the obvious fix.
- **No analytics.** Nothing is instrumented. This is needed before any
  evaluation study.
- Single file, no component structure, no tests.
- No multi-select, fragment rotation, charges, or SMILES import/export.

The interaction model is worth carrying over even if the code is not — the
gesture set has been through several rounds of correction, and
`CHECKLIST.md` records what each one should do.

---

## 8. If you rebuild the app

Keep the engine as-is and treat it as a library. The things worth preserving
from the prototype:

1. **The gesture set**, as documented in `CHECKLIST.md` §1–§8. Particularly
   the hit-testing: an atom's touch radius must be smaller than half the bond
   length or bonds become untappable, and it must match the drawn label width
   or heteroatoms become unhittable. Both were bugs.
2. **The explanation layer.** `parts` and `locants` are the engine's side of
   it; the UI need only render tappable spans and highlight atoms.
3. **The `explain` flag** threaded through as a prop, so assessment contexts
   can switch off every explanation in one place.
4. **Clean.** The layout algorithm is in `App.js` as `tidy`, `repairStereo`
   and `snapToLattice`. It is self-contained, takes and returns a graph, and
   could move into the engine.

### Suggested first tasks

- Persistence, then analytics — both are prerequisites for a study
- Extract the drawing canvas into its own component with its own tests
- Move `tidy` into the engine, where the geometry tests already live
- Photo → structure recognition, if wanted, is `image → graph` only: the
  engine already handles `graph → name`. Off-the-shelf OCSR emits MOL, which
  is nearly a 1:1 match for the engine's graph format.
