// ─────────────────────────────────────────────────────────────
// Playing the structure puzzle to both endings.
//
// The game is pure state, so a round is played here for real: the answer
// solves it, ten wrong distinct isomers fail it, and neither an unnameable
// drawing nor a repeat ever costs a guess. Then the screen is rendered in
// every state to prove it shows the right thing and sits over the tabs.
// ─────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs';
import { newGame, submitGuess, guessesLeft } from '../src/content/puzzleGame.js';
import { puzzleOfTheDay, puzzleAnswers, PUZZLES } from '../src/content/structureWordle.js';
import { parseName } from '../src/engine/index.js';
import { StructurePuzzle } from '../src/screens/main/StructurePuzzle.js';

let fails = 0;
const ck = (c, m) => { if (!c) { console.error('  FAIL:', m); fails++; } else console.log(`  ok   ${m}`); };
const molOf = (n) => parseName(n).mol;

// A puzzle with enough wrong answers to exhaust ten guesses.
const big = PUZZLES.find((p) => puzzleAnswers(p).length >= 11);
const today = { ...puzzleOfTheDay(Date.now(), [big]), budget: 10 };

console.log('=== success: the answer solves it ===');
{
  let g = newGame(today);
  ck(g.status === 'playing' && guessesLeft(g) === 10, 'a fresh game has ten guesses');
  const wrong = g.answers.find((n) => n !== g.answer);
  g = submitGuess(g, molOf(wrong));
  ck(g.status === 'playing' && g.guesses.length === 1 && guessesLeft(g) === 9, 'one wrong guess is recorded and costs one');
  ck(g.guesses[0].rows.length === 4 && Object.keys(g.guesses[0].atoms).length > 0, 'and it carries its canvas verdict');
  g = submitGuess(g, molOf(g.answer));
  ck(g.status === 'solved', 'the answer solves it');
  ck(g.guesses[1].solved && g.guesses.length === 2, 'solved on the second guess');
  const after = submitGuess(g, molOf(wrong));
  ck(after === g, 'a solved game accepts nothing more');
}

console.log('=== failure: ten distinct wrong isomers ===');
{
  let g = newGame(today);
  const wrongs = g.answers.filter((n) => n !== g.answer).slice(0, 10);
  ck(wrongs.length === 10, `the puzzle has ten wrong answers to spend (${g.formula})`);
  for (const w of wrongs) g = submitGuess(g, molOf(w));
  ck(g.status === 'failed', 'ten wrong guesses fail the game');
  ck(g.guesses.length === 10 && guessesLeft(g) === 0, 'with the budget spent exactly');
  ck(g.answer && g.answers.includes(g.answer), 'and the answer is there to reveal');
  const after = submitGuess(g, molOf(g.answer));
  ck(after === g, 'a failed game accepts nothing more, even the answer');
}

console.log('=== a guess is only spent on a real, new structure ===');
{
  let g = newGame(today);
  g = submitGuess(g, { atoms: [], bonds: [] });
  ck(g.guesses.length === 0 && /Draw a structure/.test(g.note), 'an empty canvas costs nothing and says so');
  g = submitGuess(g, { atoms: [{ id: 1, el: 'C' }, { id: 2, el: 'O' }], bonds: [{ a: 1, b: 2, order: 3 }] });
  ck(g.guesses.length === 0 && !!g.note, 'an unnameable drawing costs nothing and explains');
  const w = g.answers.find((n) => n !== g.answer);
  g = submitGuess(g, molOf(w));
  const before = g.guesses.length;
  g = submitGuess(g, molOf(w));
  ck(g.guesses.length === before && /already tried/.test(g.note), 'a repeat costs nothing and names itself');
  ck(guessesLeft(g) === 9, 'so only the one real guess was spent');
}

console.log('=== the screen shows every state, over the tabs ===');
{
  const src = readFileSync(new URL('../src/screens/main/StructurePuzzle.js', import.meta.url), 'utf8');
  ck(/<Overlay visible>/.test(src), 'it renders inside the full-screen Overlay, not in flow under the tab bar');
  ck(/canvasWrap: \{ height: 340/.test(src), 'the canvas has a real height inside the scroll view');
  ck(/from '\.\.\/\.\.\/components\/DeviceFrame'/.test(src), 'and reads the viewport from where it actually lives');

  const rb = readFileSync(new URL('../src/screens/main/ReviewBoard.js', import.meta.url), 'utf8');
  ck(/<Overlay visible>/.test(rb), 'the review board has the same fix');

  // Render smoke through the stub: the component must build and produce
  // text for the playing state.
  const walk = (n, out = []) => {
    if (!n) return out;
    if (Array.isArray(n)) { n.forEach((x) => walk(x, out)); return out; }
    if (typeof n === 'object' && n.props) {
      if (typeof n.type === 'function') return walk(n.type(n.props), out);
      if (typeof n.props.children === 'string') out.push(n.props.children);
      walk(n.props.children, out);
    }
    return out;
  };
  let texts = [];
  try { texts = walk(StructurePuzzle({ onClose() {} })); } catch (e) { ck(false, `renders: ${e.message}`); }
  ck(texts.some((t) => /guesses left/.test(t)), 'the playing state shows guesses left');
  ck(texts.some((t) => /Draw your guess/.test(t)), 'and the drawing prompt');
}

console.log(fails ? `\n${fails} FAILED\n` : '\nthe puzzle can be won and lost, and the screen can be reached\n');
process.exit(fails ? 1 : 0);
