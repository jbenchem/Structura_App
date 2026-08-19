# Fixed: a substituent chain was traced through a ring

**Status:** fixed in `src/engine/name.js`. One line of logic, plus a comment.

## The fault

Draw two cyclohexane rings joined by a chain and the namer traced its longest
substituent chain straight *through* the second ring, unrolling six ring
carbons into the chain.

```
structure   two cyclohexanes + a 4-carbon chain + a methyl
            17 carbons, 2 rings, C17H32
was named   (2-methyldecyl)cyclohexane      17 carbons, 1 ring,  C17H34
now named   (4-cyclohexyl-2-methylbutyl)cyclohexane   17 carbons, 2 rings
```

The old name was a real name — just for a different compound. The formula
shown beside it is computed from the structure and so stayed correct, which is
what made the disagreement visible: `C17H32` cannot have one ring.

## The cause

`nameSubstituent` in `name.js` handles a substituent whose *attachment atom*
is in a ring, returning `cyclohexyl` and so on. A substituent that is a chain
*leading to* a ring never reached that branch: its attachment atom is an
ordinary carbon, so it fell through to the path walk — and the walk avoided
revisiting atoms but had nothing stopping it entering a ring.

## The fix

A substituent's own parent chain is acyclic. The walk now refuses to enter a
ring atom when it started outside one:

```js
const startInRing = ringAtoms.has(start);
…
if(!startInRing && ringAtoms.has(e.to)) continue;
```

The ring then presents as a branch off that chain, and `nameSubstituent`
already knew how to name it. The `startInRing` condition preserves the
existing behaviour for fused-ring substituents, which reach the same walk
deliberately.

## Verification

- The engine's own suite: **699 passed, 0 failed** — unchanged.
- **223 acyclic structures** named identically before and after, byte for byte.
- **34 ring-bearing names** round-trip stably.
- `tests/engine-rings.test.mjs` covers chain lengths 1–6 with and without a
  branch, asserts the reported molecule, and checks ordinary ring naming
  (benzene, naphthalene, bicyclo, spiro, heterocycles) is untouched.
- Only `name.js` changed; the other seven engine files are byte-identical.

## The guard stays

`verifiedName` in `src/chem/engineBridge.js` still checks that a name
describes the molecule it came from, and the sandbox still refuses rather than
showing a name it cannot stand behind. Fixing one fault does not make the
namer infallible, and a wrong name is the one error a learner cannot detect.
