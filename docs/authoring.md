# Authoring content

Everything a learner reads lives in **`src/content/curriculum.js`**. There is no
database and no CMS: content is code, which is what lets the test suite check
that every molecule you author really is the molecule its name claims.

Two rules make this safe:

1. **Run `npm test` after every content change.** The curriculum suite names
   every target you write with the engine and fails if it disagrees with your
   label. This is the guard against teaching something wrong.
2. **Never write a structure by hand as coordinates.** Use the helpers below;
   they build the graph and the engine works out the rest.

---

## Editing existing text

Find the string and change it. Nothing else needs updating.

```js
T(
  'Carbon makes four bonds',                    // ← heading
  'Every carbon atom forms exactly four…',      // ← body
  buildTarget(['C'], []),                       // ← optional diagram
  { showCarbons: true, caption: 'Methane…' }    // ← optional extras
),
```

Three things to know about the body text:

- `\n\n` makes a paragraph break; `\n` a single line break.
- Apostrophes are fine (`'it is'`), but if you use a straight `'` inside a
  single-quoted string you must escape it: `'carbon\'s'`. Easier: use
  "it is" rather than "it's", which also reads better in teaching prose.
- Avoid characters that are not plain ASCII where you can. Curly quotes and
  en-dashes are fine in strings, but plain `-` and `"` never surprise anyone.

Changing wording never breaks the tests. Changing a **name** or a **structure**
might, which is the point.

---

## The five step types

Steps run in order inside a lesson. Mix them freely.

### `T` — teach

```js
T('Heading', 'Body text.', molecule, { showCarbons: true, caption: 'Caption.' })
```

`molecule`, `showCarbons` and `caption` are all optional. `showCarbons: true`
labels every atom (`CH3-CH2-CH3`) instead of drawing a bare skeleton — use it
when the point *is* the hydrogens, and leave it off otherwise.

### `MC` — multiple choice

```js
MC(
  'Which formula fits an alkane with 5 carbons?',   // prompt
  ['C5H10', 'C5H12', 'C5H8'],                       // options
  1,                                                // index of the answer (0-based)
  'CnH(2n+2): with n = 5, hydrogens = 12.',         // explanation, shown after answering
  molecule                                          // optional diagram
)
```

The explanation appears whether they were right or wrong, so write it as
teaching, not as a verdict.

**Error-analysis items use this same type** and are worth writing often — the
curriculum doc found them more diagnostic than plain naming questions:

```js
MC(
  'A student names this molecule "hexane". What went wrong?',
  ['They stopped counting at the bend', 'Nothing — it is hexane', 'They counted a corner twice'],
  0,
  'The chain continues through the corner: seven carbons, so heptane.',
  M.heptaneBent
)
```

### `NM` — name this structure

```js
NM('2-methylbutane', M.m2butane, { hint: 'Longest chain 4 → butane; methyl on C2.' })
```

The learner types the name. Matching is tolerant of case, spacing and dash
variants. The `hint` shows only after a wrong answer.

### `DR` — draw this structure

```js
DR('2-methylbutane', M.m2butane, { hint: 'Build the four-carbon chain first.' })
```

The learner draws on the canvas; the engine checks it. Any correct drawing is
accepted regardless of orientation or atom order.

Stereochemistry is **not** assessed unless you opt in with `{ stereo: true }` —
see the note in the README about why.

### `TOGGLE` — the same molecule, two ways

```js
TOGGLE(
  'The same molecule, two ways',
  'Switch between the two views.',
  chain(4),
  'Every atom drawn: CH3-CH2-CH2-CH3.',   // caption for the full view
  'The skeleton — hydrogens implied.'      // caption for the skeletal view
)
```

The learner switches between every-atom and skeletal. Continue unlocks once they
have seen both. Use it wherever a drawing convention needs to be believed rather
than accepted.

### `COUNT` — tap every carbon

```js
COUNT('Find every carbon', 'Tap each one.', chain(5), { doneNote: 'Two ends plus three corners.' })
```

The learner taps each carbon and it lights up; Continue unlocks when all are
found, and the name is revealed. The count comes from the molecule, so you never
state a number that could fall out of sync.

### `BUILD` — interactive chain

```js
BUILD(
  'Watch the name follow the chain',
  'Add and remove carbons. The root changes; the ending does not.',
  { start: 3, min: 1, max: 10 }
)
```

The learner changes the chain length and the name updates live from the engine.
Continue stays disabled until they have actually changed something.

---

## Building molecules

### The easy way: name it

```js
MOL('nonane')
MOL('2-methylbutane')
MOL('but-2-ene')
MOL('1,2-dichloroethane')
MOL('propan-2-ol')
```

`MOL()` asks the engine for the structure, so you write the name and get a
correctly built, cleanly laid-out molecule back. Use it anywhere a molecule is
expected — teaching cards, questions, pools:

```js
T('Why chemists take a shortcut', 'Real molecules get large…', MOL('icosane'), {
  caption: 'Icosane, C20H42, drawn as a skeleton.',
})

NM('3-methylpentane', MOL('3-methylpentane'))
writeName(MOL('2-chlorobutane'))
```

It accepts anything the engine parses — trivial names (`aspirin`), alternative
spellings (`2-butene` becomes `but-2-ene`), and every chain length from meth-
to icos-.

**A name it cannot build throws immediately**, at module load, naming the
offending string:

```
MOL("flurbleane") — the engine could not build this structure.
  unsupported: The parent root wasn't recognised…
  Check the spelling, or draw it in the sandbox to find the name the engine expects.
```

So a typo fails `npm test` rather than rendering as an empty box on a phone. If
you are unsure what the engine calls something, draw it in the sandbox and read
the name off the top of the screen.

### The manual way: build the graph

Use this only where no name exists for what you want — a deliberately bent
chain, or a structure drawn a particular way.

```js
buildTarget(elements, bonds)
```

`elements` is a list of atom symbols. `bonds` is a list of `[i, j, order]`,
where `i` and `j` are **0-based indices into the element list** and `order` is
1, 2 or 3 (omit for a single bond).

```js
// butane: 4 carbons in a row
buildTarget(Cn(4), chainBonds(4))

// 2-methylbutane: a 4-carbon chain plus a methyl on the second carbon
buildTarget(Cn(5), [...chainBonds(4), [1, 4, 1]])

// but-2-ene: double bond between carbons 2 and 3
buildTarget(Cn(4), chainBonds(4, { 2: 2 }))

// propan-2-ol: an oxygen hanging off the middle carbon
buildTarget(['C', 'C', 'C', 'O'], [[0, 1], [1, 2], [1, 3]])
```

Helpers:

| Helper | What it does |
|---|---|
| `Cn(n)` | a list of `n` carbons |
| `chainBonds(n)` | single bonds joining `n` atoms in a row |
| `chainBonds(n, { 2: 2 })` | same, but the bond starting at position 2 is a double bond |
| `chain(n)` | shorthand for a plain `n`-carbon chain |
| `bentChain(n, turnAt)` | a chain drawn with a corner — same molecule, different picture |

### One surprise worth knowing

Ask the engine to name that but-2-ene target directly and it returns
**`(2E)-but-2-ene`**, not `but-2-ene`. It is not wrong: the zigzag coordinates
place the two methyls on opposite sides, which *is* E. The engine reads geometry
from the drawing.

This does not affect you when authoring. Checking is **stereo-blind** below
Stage 9, so `NM('but-2-ene', …)` and `DR('but-2-ene', …)` both work exactly as
you would expect, and a learner's zigzag is accepted. It only matters if you
write `{ stereo: true }` on a step, which you should do only in units that
actually teach E/Z or R/S — and then you must label the target with its
descriptor:

```js
DR('(2Z)-but-2-ene', M.zBut2ene, { stereo: true })
```

Reusable molecules live in the `M` object near the top of the file. Add to it
rather than repeating a `buildTarget` call:

```js
const M = {
  propane: chain(3),
  m2butane: buildTarget(Cn(5), [...chainBonds(4), [1, 4, 1]]),
  // add yours here
};
```

---

## Question pools (the 30-per-lesson system)

A lesson has two parts:

```js
{
  id: 'u01-l4',
  title: 'The first ten names',
  pool: POOL_U1L4,   // ~30 questions, defined in src/content/pools.js
  ask: 12,           // how many are sampled per run (10-15)
  steps: [ /* teaching, shown in order, every time */ ],
}
```

`steps` teach and always run in order. `pool` questions are **sampled** — 12 of
the 30 each time — so repeating a lesson is not repeating the same questions.

### Do not write answers by hand

Questions are generated by `src/content/questionFactory.js` from a molecule the
engine names, so the answer is correct by construction. You choose the molecules
and the framing; the factory does the chemistry.

```js
import { straightChain, bentChain, mcName, writeName, countCarbons,
         countHydrogens, mcFormula, mcStructure, drawIt, tapCarbons, pool } from './questionFactory';

export const POOL_MY_LESSON = pool(
  range(1, 10).map((n) => mcName(straightChain(n), { seed: n })),   // 10 questions
  range(1, 10).map((n) => writeName(straightChain(n))),             // 10 more
  range(2, 8).map((n) => drawIt(straightChain(n)))                  // and 7
);
```

| Builder | Produces |
|---|---|
| `mcName(mol)` | four names, pick the right one |
| `mcStructure(n)` | four drawings, pick the one matching the name |
| `writeName(mol)` | type the name |
| `countCarbons(mol)` / `countHydrogens(mol)` | numeric keypad |
| `mcFormula(mol)` | pick the molecular formula |
| `drawIt(mol)` | build it on the canvas |
| `tapCarbons(mol)` | tap every carbon |
| `correctName(mol)` | a wrong name is shown; type the right one |
| `buildName(mol)` | assemble the name from shuffled parts |
| `compareNames(a, b)` | do these two names describe the same compound? |

`compareNames` is built and tested but not yet used in a pool. A genuine
"same compound, two names" pair needs an alternate locant style
(but-2-ene / 2-butene) or a retained name (isobutane), and both are ahead of
the alkane content — a pool where the answer is always "different" would teach
the pattern rather than the chemistry. Use it from the alkenes unit onwards.

`pool(...)` flattens its arguments and silently drops anything the engine could
not name, so a broken entry can never become a question with no right answer.

### Writing a concept question by hand

For questions about a rule rather than a molecule, write the object directly —
this is the only place an answer index is hand-set, so double-check it:

```js
conceptQ('c1', 'COUNT THE BONDS', 'How many bonds does a carbon atom form?',
  ['2', '3', '4', 'It varies'], 2,          // ← index 2 is '4'
  'Four, always. A carbon with five bonds is why a drawing gets rejected.',
  straightChain(5))                          // optional molecule
```

### Teaching questions look like quiz questions

`mc`, `name` and `draw` steps inside `steps` are converted to the same question
objects the pool uses, so a lesson does not change shape halfway through — same
chip, same Check answer button, same verdict card. Write them with `MC`, `NM`
and `DR` as before; the conversion is automatic.

`MC` takes an optional sixth argument, `showCarbons`. Pass `true` whenever the
question is about counting hydrogens, so the diagram shows CH3—CH2—CH3 rather
than a bare skeleton:

```js
MC('How many hydrogens does a middle carbon hold?', ['1','2','3','4'], 1,
   'Two neighbours use two bonds, so two hydrogens remain: CH2.',
   chain(3), true)
```

### Questions that describe a structure should show it

If a question says "a carbon drawn with five lines", put that carbon on screen.
`src/content/diagrams.js` holds hand-laid illustrations for exactly this,
including ones that are deliberately impossible — a five-bond carbon, a
hydrogen with two bonds, a three-bond oxygen. The renderer marks an over-bonded
atom red on its own, which is the point being made.

```js
concept('u1l1-d', 'COUNT THE BONDS', 'This carbon is drawn with five lines. What is wrong?',
  [...], 1, '…', carbonWithFiveBonds(), true)   // last arg shows every atom
```

Impossible diagrams carry `impossible: true`, and the tests check the flag
**both ways**: a molecule claiming to be impossible must genuinely break a
valence rule, so the flag cannot be used to wave through a real mistake.

### Bond-count questions must be readable

A question asking how many bonds an element forms has to show that element in a
structure, drawn with every atom, so the learner counts lines rather than
recalling a number. `radialMolecule('C', ['H','H','H','H'])` builds methane,
ammonia, water and the like for exactly this; the angles are spread so the
drawing passes the geometry audit.

`tests/prerequisites.test.mjs` enforces it: any question matching "how many
bonds does" must carry a molecule and set `showCarbons`.

### The periodic table

`src/content/periodicTable.js` holds the main group with each element's bond
count, the role it plays in an organic molecule, and the functional groups it
appears in. `tests/periodic.test.mjs` checks it against `LIMIT` in the canvas —
a reference that disagreed with the checker would be worse than none.

Use it in content two ways:

```js
T('Atoms join by sharing bonds', '…', mol, { periodic: true, periodicNote: '…' })
ELEMENTS_STEP('The column sets the number of bonds', '…', { start: 'C', need: 3 })
```

The first draws the table under a teaching card. The second is the interactive
step: the learner taps elements and Continue unlocks once they have explored
`need` different columns — the pattern down the columns is the point, so it
counts columns rather than elements.

### The nomenclature reference

A book icon in every question header opens `ReferenceSheet`: four tabs — the
first twenty chain lengths, the seniority ladder, the four ways to draw one
molecule (structural, semi-structural, skeletal, molecular formula), and an
interactive main-group table with each group's suffix, demoted
prefix, an example, and a drawn R-group sketch.

The data is in `src/content/reference.js`. Sketches are a spec, not images:

```js
sketch: { chain: ['R', 'C', 'OH'], bonds: [1, 1], up: { at: 1, label: 'O', order: 2 } }
```

`chain` is the labels left to right, `bonds` the order between successive
labels (one fewer entry than labels), and `up` an atom double-bonded above the
label at that index — the C=O.

`tests/reference.test.mjs` checks all twenty roots against the engine, that the
ladder is ordered acid > ester > amide > aldehyde > ketone > alcohol > amine >
alkene > alkane, and that every example name parses. A reference table that
contradicts the checker would be worse than no table.

### Formulas are subscripted automatically

Write formulas plainly in content — `CH3`, `C3H8`, `CnH(2n+2)` — and they are
rendered as CH₃, C₃H₈, CₙH₂ₙ₊₂. Do not type Unicode subscripts yourself.

The transform (`src/chem/formula.js`) deliberately leaves **locants** alone: in
this app `C2` means carbon number 2, and subscripting it would change the claim
to "two carbons". A token is only treated as a formula when it contains two or
more element symbols, so `CH3` converts and `C2` does not. Names
(`but-2-ene`, `2,2,4-trimethylpentane`) and prose (`Question 4 of 10`) are
untouched.

`tests/content-formula.test.mjs` sweeps every authored and generated string and
fails if any formula would render unsubscripted — so a new lesson cannot
introduce one by accident.

### Every unit ends with a checkpoint

Mark the last lesson `checkpoint: true` and give it a pool.

| | ordinary lesson | checkpoint |
|---|---|---|
| questions asked | 10 | **20** |
| pool | 30+ | 30+ (and at least 1.5x the ask) |
| pass mark | — | **80%** (16 of 20) |

A checkpoint can be opened even when the unit is locked — passing it completes
the whole unit and unlocks the next, which is how a learner tests out of
material they already know. Testing out of an earlier unit never drags their
position backwards.

`tests/progression.test.mjs` enforces all of it: exactly one checkpoint per
authored unit, always last, asking 20, with a pool deep enough that a retake is
substantially different, and the 80% boundary itself (16/20 passes, 15/20 does
not).

### Every teaching card needs a visual

A `teach` step must have either a molecule or a `placeholder` describing the
image that belongs there:

```js
T('Start here', 'Organic chemistry is…', null, {
  placeholder: 'Everyday things built from organic molecules — fuel, plastics, medicines.',
})
```

Placeholders render as a dashed box with the description and "illustration to be
added", so a missing image is visible rather than silently absent. The test
requires a description of real length, not a stub.

### Dev tools

Account → Developer: unlock all lessons (ignores progression locks), complete
the current unit, complete every authored unit, restart from unit 1, and a
readout of where the learner currently is.

### Questions fit the screen

Question layout is scaled to the viewport by `src/screens/main/questionSizing.js`
— three bands (tight / mid / roomy) chosen by screen height, each giving prompt
size, diagram height, option padding, keypad key height and so on. Renderers take
every size from there rather than hard-coding numbers, and the shell does NOT
scroll by default: the layout is built to fit, so a scroll view would only hide a
mistake.

Touch targets stay at least 44px even in the tight band.

`tests/question-fit.test.mjs` estimates the height of every question type on six
real device sizes, down to a 320x568 iPhone SE, and fails if anything would
overflow. If you add a question type, add it to `estimateHeight` — otherwise its
fit is never checked.

### Structures are always cleanly laid out

Every molecule shown in a question or a teaching card is laid out by `tidy`
before it is rendered — `buildTarget` and the question factory both do this at
the point of construction. The raw placement in those builders is only a
scaffold: a branch bonded back to the chain would otherwise stretch across the
whole molecule.

`tests/geometry.test.mjs` defines "not deformed" precisely and checks all 444
molecules in the app:

1. within one molecule every bond is the same length (±15% of the median)
2. no two atoms that are not bonded sit closer than 0.7 bond lengths
3. **no two bonds cross**

The third matters most and was the last to be added: atoms can all be well
spaced and the drawing still be a tangle, which is exactly how a crossed
2-methylbutane reached a lesson card. The suite also feeds itself a
deliberately crossed molecule and fails if that is *not* flagged, so a broken
detector cannot pass everything silently.

The checks are scale-independent, so they hold whatever lattice a molecule was
built at.

Bent chains (for questions about reading a drawing) turn by exactly 60° per
bond, which is what keeps a corner readable — an earlier version folded atoms
back to within half a bond length of each other.

### Structures are cleaned on submit

Checking a drawn answer runs `tidy` first, so the structure is tidied before it
is judged and the feedback is legible. This is safe because `tidy` keeps its
result only when the molecule still names the same — cleaning can never turn a
right answer into a wrong one. There is also a Clean button under the zoom
controls for tidying mid-draw.

### Wrong answers come back

A missed question is appended to the end of the run once — never more, so it
cannot loop. `tests/retry-queue.test.mjs` proves both properties.

### Sounds

`src/sounds.js` is wired at the moment an answer is marked but is a placeholder:
drop `correct.mp3` and `incorrect.mp3` into `assets/sounds/`, install
`expo-audio`, uncomment the block. Until then it falls back to haptics. See
`assets/sounds/README.md`.

### A lesson may only ask what it has taught

**`teaches` is a claim, and the checker trusts it.** If a lesson mentions an
idea in passing and tags itself as teaching it, questions on that idea will pass
the check while still feeling unearned to a learner. Tag a concept only where
the lesson actually stops and teaches it — hydrogen counting was tagged on
lesson 1 because a card mentioned CH3 in a sentence, and it took a second
report to catch. It now lives in lesson 2, where skeletal notation makes it
worth doing.


Each lesson declares `teaches: ['skeletal', 'roots', …]`, and every question
declares what it `needs`. `tests/prerequisites.test.mjs` walks the curriculum in
order and fails if a question requires a concept no lesson up to that point has
introduced.

It reads requirements from the question itself as well as the label — a
skeletal drawing on screen means skeletal notation is required, formula wording
means the formula is — so a mis-tagged question is still caught. This found
lesson 1 asking learners to read skeletal drawings and identify alkanes before
either had been taught, and lesson 4-1 asking for names that need locants from
the lesson after it.

Builders that mention a molecule by name (`countCarbons`, `countHydrogens`,
`mcFormula`) take `named: true` for that phrasing, and otherwise ask about
"this structure" — naming a molecule assumes the roots are known.

### Fixed sets for the earliest lessons

A lesson's questions are either a **fixed set** — five or so that every learner
sees, with `ask` equal to the pool — or a **sampled pool** of thirty or more.
Nothing in between: a pool of eight sampled down to five gives nearly the same
questions every run while pretending to be random.

Lessons 1 to 3, before naming is introduced, use fixed sets. They cover very
little ground (bonds, reading a skeleton, what an alkane is) and a thirty-strong
pool forced increasingly contrived variations of the same two ideas. Sampled
pools start at lesson 4, where naming provides enough material to vary.

### Short runs stay representative

`sample()` draws round-robin across the kinds of question in a pool, not flat.
A pool holding twice as many hydrogen questions as bond questions would
otherwise often give five hydrogen questions in a row, so one idea gets tested
five times and the other not at all — which reads as being examined on
something the lesson barely covered. `tests/sampling.test.mjs` runs 500 samples
and fails if any run of five is all one kind.

This also means pool balance matters less than it looks: aim for coverage of
the lesson's ideas rather than an even count.

### Changing how many are asked

Set `ask` on the lesson. The suite enforces **5–10** and a pool of at least 30,
so raising `ask` above the cap or leaving a pool short fails the build. Lessons
whose content overlaps heavily (units 1–2, lessons 1 and 2) use `ask: 5`; the
rest use `ask: 10`.

### What the tests check

`tests/question-pools.test.mjs` walks every question in every pool and verifies:
the molecule really is the named one, distractors differ from the answer, option
indices are in range, numeric answers are positive integers, draw targets parse,
tap counts match the molecule, ids are unique, and each pool has 30+.
`tests/lesson-steps.test.mjs` additionally renders one of every question type in
every lesson.

## Adding a lesson

Find the unit and add an object to its `lessons` array:

```js
{
  id: 'u04-l4',                    // must be unique across the whole curriculum
  title: 'Practice: branches',
  steps: [
    T('…', '…'),
    MC('…', ['…', '…'], 0, '…'),
    NM('3-methylpentane', M.m3pentane),
  ],
},
```

The lesson count on the Learn tab updates itself.

## Adding a unit

Units 7–38 already exist as placeholders. To author one, replace its `P(...)`
entry with a full unit object:

```js
// before — a placeholder
P('u09-alcohols', 9, 'Alcohols', '-ol, -diol…', 'VCE', ['functional-groups'], 3, 4),

// after — authored
const U9 = {
  id: 'u09-alcohols',            // keep the same id
  n: 9,
  title: 'Alcohols',
  subtitle: '-ol, -diol, and beating the double bond',
  level: 'VCE',
  topics: ['functional-groups'],
  difficulty: 3,
  lessons: [ /* … */ ],
};
```

Then swap the `P(...)` call for `U9` in the `STAGES` array.

**Keep the id.** Progress is stored against unit ids, so changing one silently
resets learners who were partway through. If you must change ids, bump
`STORAGE_KEY` in `src/state/store.js` so the app resets cleanly instead of
half-matching.

---

## Verifying

```bash
npm test
```

What the curriculum suite checks, and what a failure means:

| Failure | Cause |
|---|---|
| `authored "X" but engine names "Y"` | Your structure is not the molecule you labelled it. Fix the graph, or the name. |
| `X: valence ok` fails | An atom has too many bonds — usually a bond index typo. |
| `connected` fails | Two fragments; a bond index is pointing at the wrong atom. |
| `X target checks correct` fails | The drawn answer would not be accepted. Almost always the same cause as the first row. |
| `build step: n carbons should be …` | A `BUILD` range includes a length the engine names differently. |

The suite is the reason you can author quickly: it is not possible to ship a
lesson that teaches a wrong name without the terminal telling you first.

---

## Order of work

`docs/curriculum.md` is the pedagogical source of truth — each unit's entry
states the single new idea and the specific misconceptions to target. Follow its
build order rather than unit numbers: **units 9–13 next** (alcohols → priority
ladder → aldehydes → ketones → acids), because that block is where the pedagogy
is proven. Units 7–8 are mechanical backfill and can come after.
