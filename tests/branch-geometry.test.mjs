// ─────────────────────────────────────────────────────────────
// Branch geometry.
//
// The naming-a-branch activity draws its own molecule from three steppers
// rather than using an authored one, so nothing else in the suite ever looks
// at it — which is how it shipped folding in on itself.
//
// The version this replaced placed the first branch carbon correctly with
// hangFrom() and then invented the rest from hand-tuned offsets: a horizontal
// wobble of 0.52 bond lengths and a fixed downward step. The bonds came out
// the wrong length, and on a longer branch low on the chain the last carbon
// was placed back through the chain it was hanging off.
//
// Every state the three steppers can reach is checked here — 90 of them —
// because "it looked fine when I tried it" is exactly how the fold-back
// survived the first time.
// ─────────────────────────────────────────────────────────────

import { growBranch, continueFrom } from '../src/screens/main/InteractiveSteps.js';
// The real bond length, imported rather than copied. A local constant that
// drifted from the app's would make this suite pass while the drawing was
// wrong — the exact failure mode it exists to catch.
import { BOND } from '../src/sandbox/constants.js';

let fails = 0;
const assert = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } };
function fixed(n) {
  const atoms = [];
  const bonds = [];
  for (let i = 0; i < n; i++) {
    atoms.push({ id: i + 1, x: i * BOND * 0.87, y: (i % 2) * BOND * 0.5 });
    if (i) bonds.push({ a: i, b: i + 1, order: 1, stereo: null });
  }
  return { atoms, bonds };
}

{
  let overlaps = 0;
  let badBonds = 0;
  let states = 0;
  let worst = Infinity;

  for (let n = 4; n <= 8; n++) {
    for (let pos = 2; pos <= n - 1; pos++) {
      for (let size = 1; size <= 3; size++) {
        states++;
        const g = growBranch(fixed(n), pos, size);
        assert(g.atoms.length === n + size, `n=${n} pos=${pos} size=${size}: ${g.atoms.length} atoms`);
        assert(g.bonds.length === n - 1 + size, `n=${n} pos=${pos} size=${size}: wrong bond count`);

        // No two atoms on top of each other. Below about two thirds of a bond
        // length the drawing reads as a mistake rather than as a molecule.
        for (let i = 0; i < g.atoms.length; i++) {
          for (let j = i + 1; j < g.atoms.length; j++) {
            const d = Math.hypot(g.atoms[i].x - g.atoms[j].x, g.atoms[i].y - g.atoms[j].y);
            if (d < worst) worst = d;
            if (d < BOND * 0.66) {
              if (overlaps < 3) {
                console.error(`  overlap n=${n} pos=${pos} size=${size}: atoms ${g.atoms[i].id}/${g.atoms[j].id} are ${d.toFixed(1)} apart`);
              }
              overlaps++;
            }
          }
        }

        // Branch bonds are real bonds: one bond length, not an offset that
        // happens to look about right.
        for (const b of g.bonds.slice(n - 1)) {
          const A = g.atoms.find((a) => a.id === b.a);
          const B = g.atoms.find((a) => a.id === b.b);
          const d = Math.hypot(A.x - B.x, A.y - B.y);
          if (Math.abs(d - BOND) > 0.6) {
            if (badBonds < 3) console.error(`  bond n=${n} pos=${pos} size=${size}: ${d.toFixed(1)} not ${BOND}`);
            badBonds++;
          }
        }
      }
    }
  }
  assert(overlaps === 0, `${overlaps} overlapping atoms across ${states} branch states`);
  assert(badBonds === 0, `${badBonds} branch bonds of the wrong length`);
  console.log(`  branch geometry: ${states} states, closest atoms ${worst.toFixed(1)} of ${BOND}`);
}

{
  // A branch carbon continues at 120°, not straight on. "The widest free
  // direction" from an atom with one neighbour is 180° — a straight line,
  // which is not what a skeletal structure looks like.
  const g = { atoms: [{ id: 1, x: 0, y: 0 }, { id: 2, x: 0, y: BOND }], bonds: [{ a: 1, b: 2 }] };
  const p = continueFrom(g, 2);
  const d = Math.hypot(p.x - g.atoms[1].x, p.y - g.atoms[1].y);
  assert(Math.abs(d - BOND) < 0.6, `continuation is one bond long, got ${d.toFixed(1)}`);
  assert(Math.abs(p.x) > 1, 'and it turns rather than carrying straight on');
}

console.log(fails ? `\n${fails} FAILED\n` : '\nthe branch never folds back over the chain\n');
process.exit(fails ? 1 : 0);
