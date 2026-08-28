# Catalyst naming engine v4

A bidirectional IUPAC organic nomenclature engine. Plain ES modules, no
dependencies, **699 automated tests**.

```
node test.mjs        →  699 passed, 0 failed
```

## Use

```js
import { nameGraph, parseName, matchStructure, hintsFor, synonymsFor }
  from "./index.js";

nameGraph({ atoms:[{id,x,y,el?}], bonds:[{a,b,order,stereo?}] })
parseName("(2R)-butan-2-ol")
matchStructure(drawnGraph, "butan-2-ol")
synonymsFor("ethanoic acid")        // → acetic acid, vinegar
```

Full API, coverage and design notes are in `../HANDOVER.md`.

## Modules

| file | responsibility |
|---|---|
| `core.js` | graph normalisation, ring perception, valence, formula |
| `groups.js` | functional group perception, seniority ladder, CIP ranking |
| `stereo.js` | R/S from wedge and dash, E/Z from 2D geometry |
| `name.js` | structure → name, with reasoning and name segmentation |
| `parse.js` | name → structure, verified by naming the result back |
| `compare.js` | answer checking and escalating hints |
| `synonyms.js` | alternative names, each verified before it is offered |
| `index.js` | public API |

## Two rules the design rests on

**The namer is the canonical form.** Two structures are the same molecule
exactly when they name identically. No graph-isomorphism code is needed, and
answer checking cannot disagree with naming.

**The parser verifies itself.** `parseName` builds a graph, names it back, and
only returns success if the two agree. CIP logic lives in one place.

## Not supported

Substituted fused heterocycles beyond the template set; more than three fused
rings; unsaturated polycyclics other than the retained aromatics; sulfonic
acids; mixed anhydrides; cis/trans across a ring; charges and ions; chains
beyond 30 carbons.

Each refuses with a student-facing explanation rather than guessing. Cocaine
and tropane are the only structures still built by hand.
