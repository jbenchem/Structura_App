// ─────────────────────────────────────────────────────────────
// The structure puzzle as a game — pure state, so a whole round can be
// played in the suite without a screen: submit guesses, watch the status
// move from playing to solved or to failed, and check that neither an
// unnameable drawing nor a repeat ever costs a guess.
// ─────────────────────────────────────────────────────────────

import { annotateGuess } from './structureWordle';

export function newGame(today) {
  return {
    day: today.day,
    formula: today.puzzle.formula,
    answer: today.answer,
    answers: today.answers,
    budget: today.budget,
    guesses: [],
    status: 'playing', // 'playing' | 'solved' | 'failed'
    note: null,
  };
}

export function submitGuess(game, graph) {
  if (game.status !== 'playing') return game;
  if (!graph || !graph.atoms || !graph.atoms.length) {
    return { ...game, note: 'Draw a structure first.' };
  }
  const a = annotateGuess(game.answer, graph);
  if (!a.ok) {
    // A drawing the engine cannot name is a mistake at the canvas, not a
    // wrong answer — it says so and costs nothing.
    return { ...game, note: a.reason };
  }
  if (game.guesses.some((g) => g.name === a.name)) {
    return { ...game, note: `You have already tried ${a.name}.` };
  }
  const guesses = [...game.guesses, { ...a, mol: graph }];
  const status = a.solved ? 'solved' : guesses.length >= game.budget ? 'failed' : 'playing';
  return { ...game, guesses, status, note: null };
}

export const guessesLeft = (game) => Math.max(0, game.budget - game.guesses.length);
