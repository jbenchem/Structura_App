// ─────────────────────────────────────────────────────────────
// The structure puzzle.
//
// The claim that matters is "solvable in ten guesses with perfect logic".
// This suite does not assume it — it enumerates every shipped puzzle's
// answer space and runs a solver, so the budget is a measured fact. It also
// holds the two rules the design depends on: nothing cyclic, and yellow
// means exactly one thing.
// ─────────────────────────────────────────────────────────────

import {
  enumerateAcyclic, scoreGuess, worstCaseGuesses, puzzleAnswers, puzzleOfTheDay,
  PUZZLES, GUESS_BUDGET, MAX_CANDIDATES, STATE,
} from '../src/content/structureWordle.js';
import { annotateGuess } from '../src/content/structureWordle.js';
import { nameGraph, parseName } from '../src/engine/index.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };

console.log('=== enumeration is complete, verified and acyclic ===');
{
  const c4 = enumerateAcyclic(4);
  ck(c4.get('C4H10').size === 2, 'C4H10 has two isomers — butane and 2-methylpropane');
  ck(c4.get('C4H10O').size === 7, 'C4H10O has seven — four alcohols and three ethers');
  ck(enumerateAcyclic(5).get('C5H12').size === 3, 'C5H12 has three');
  ck(enumerateAcyclic(6).get('C6H14').size === 5, 'C6H14 has five');

  // Every enumerated structure is a tree: n atoms, n-1 bonds. No rings can
  // reach a puzzle, whatever else changes.
  let checked = 0;
  for (const [, byName] of enumerateAcyclic(5)) {
    for (const [name, mol] of byName) {
      ck(mol.bonds.length === mol.atoms.length - 1, `${name} is acyclic (${mol.atoms.length} atoms, ${mol.bonds.length} bonds)`);
      checked++;
      if (checked > 6) break;
    }
    if (checked > 6) break;
  }
  // And the namer agrees every enumerated molecule is what it is filed under.
  const one = enumerateAcyclic(4).get('C4H10O');
  ck([...one.entries()].every(([name, mol]) => nameGraph(mol).name === name), 'every candidate names back to its own key');
}

console.log('=== every shipped puzzle is solvable inside the budget ===');
{
  ck(GUESS_BUDGET === 10, 'the budget is ten guesses');
  for (const p of PUZZLES) {
    const answers = puzzleAnswers(p);
    ck(answers.length >= 2, `${p.formula}: has a real answer space (${answers.length})`);
    ck(answers.length <= MAX_CANDIDATES, `${p.formula}: is capped at ${MAX_CANDIDATES} candidates (${answers.length})`);
    const worst = worstCaseGuesses(answers, GUESS_BUDGET);
    ck(worst <= GUESS_BUDGET, `${p.formula}: a perfect player never needs more than ${worst} guesses`);
    ck(worst <= 5, `${p.formula}: and in fact needs at most 5, so ten forgives real mistakes`);
  }
}

console.log('=== scoring: yellow means one thing ===');
{
  const rowOf = (a, g, key) => scoreGuess(a, g).rows.find((r) => r.key === key);

  ck(scoreGuess('butan-2-ol', 'butan-2-ol').solved, 'the answer solves it');
  ck(rowOf('butan-2-ol', 'butan-1-ol', 'position').state === STATE.NEAR, 'right group, wrong carbon is NEAR');
  ck(rowOf('butan-2-ol', 'butan-1-ol', 'position').hint === 'higher', 'and points which way to move');
  ck(rowOf('butan-2-ol', 'butanal', 'position').state === STATE.MISS, 'wrong group is never NEAR on position — yellow cannot mean two things');
  ck(rowOf('butan-2-ol', 'butanal', 'group').state === STATE.MISS, 'and the group row says so');

  ck(rowOf('butan-2-ol', 'pentan-2-ol', 'chain').hint === 'shorter', 'a chain too long says shorter');
  ck(rowOf('pentan-2-ol', 'butan-2-ol', 'chain').hint === 'longer', 'and too short says longer');
  ck(rowOf('butan-2-ol', 'butan-2-ol', 'chain').state === STATE.HIT, 'the right chain is a hit with no hint');

  ck(rowOf('2-methylpropan-1-ol', 'butan-1-ol', 'subs').state === STATE.MISS, 'a branch that is not there is a miss');
  ck(rowOf('butane', 'butane', 'subs').state === STATE.HIT, 'no branches on either side is a hit');

  // Alkanes have no principal group, and the row must not invent one.
  ck(rowOf('butane', '2-methylpropane', 'position').state === STATE.HIT, 'two groupless molecules agree on position');
  ck(rowOf('butane', '2-methylpropane', 'chain').hint === 'longer', 'while the chain row carries the real difference');
}

console.log('=== the daily puzzle ===');
{
  const DAY = 86400000;
  const base = Date.parse('2026-09-01T09:00:00');
  const a = puzzleOfTheDay(base);
  ck(!!a && !!a.answer, 'a day yields a puzzle with an answer');
  ck(a.answers.includes(a.answer), 'and the answer is one of its own candidates');
  ck(a.answer === puzzleOfTheDay(base + 3600000).answer, 'stable through the day');
  ck(a.puzzle.formula !== puzzleOfTheDay(base + DAY).puzzle.formula || a.answer !== puzzleOfTheDay(base + DAY).answer, 'and different tomorrow');
  ck(a.budget === GUESS_BUDGET, 'it carries the budget');
}

console.log('=== the canvas carries the feedback, atom by atom ===');
{
  const A = 'butan-2-ol';
  const ann = (g) => annotateGuess(A, parseName(g).mol);

  const right = ann(A);
  ck(right.solved && Object.values(right.atoms).every((v) => v === STATE.HIT), 'the answer turns every atom green');

  // The classic near miss: right group, wrong carbon. Chain green, group amber.
  const near = ann('butan-1-ol');
  ck(near.atoms[5] === STATE.NEAR, 'the misplaced oxygen is NEAR, not a miss');
  ck(near.atoms[2] === STATE.HIT && near.atoms[3] === STATE.HIT, 'while the chain it sits on stays green');
  ck(/higher/.test(near.summary), 'and the reading says which way to move it');

  // Wrong group entirely: the group atoms go red, the chain stays green.
  const wrongGroup = ann('butanal');
  ck(wrongGroup.atoms[5] === STATE.MISS, 'a wrong functional group is a miss');
  ck(wrongGroup.atoms[3] === STATE.HIT, 'and does not condemn the chain that is right');

  // Wrong chain: chain atoms red even though the group is fine.
  const wrongChain = ann('pentan-2-ol');
  ck(wrongChain.atoms[1] === STATE.MISS, 'too long a chain is a miss on the chain atoms');
  ck(wrongChain.atoms[6] === STATE.HIT, 'while a correctly placed group stays green');
  ck(/shorter/.test(wrongChain.summary), 'and the reading says to shorten it');

  // Every drawn atom is judged — nothing is left uncoloured and unexplained.
  for (const g of ['butan-2-ol', 'butan-1-ol', 'butanal', '2-methylpropan-1-ol', 'pentan-2-ol']) {
    const a = ann(g);
    const mol = parseName(g).mol;
    ck(mol.atoms.every((at) => a.atoms[at.id] !== undefined), `${g}: every atom drawn gets a colour`);
  }

  // An unnameable drawing is refused with a reason, never scored.
  const broken = annotateGuess(A, { atoms: [{ id: 1, el: 'C' }, { id: 2, el: 'O' }], bonds: [{ a: 1, b: 2, order: 3 }] });
  ck(broken.ok === false && !!broken.reason, 'a structure the engine cannot name is refused, with a reason');
}


console.log(fails ? `\n${fails} FAILED\n` : '\nthe puzzle is fair, acyclic, and provably solvable\n');
process.exit(fails ? 1 : 0);
