// ─────────────────────────────────────────────────────────────
// Structure puzzle — the formula is given, the structure is the answer.
//
// Guesses are DRAWN, and the verdict is painted onto the drawing: green
// where a part is right, amber where the right functional group sits on the
// wrong carbon, orange where it is wrong. Every guess stays on screen, so the
// board reads as a sequence of deductions rather than a score.
//
// Colour is never the only signal — each past guess carries its verdict in
// words, which is also what a screen reader announces.
// ─────────────────────────────────────────────────────────────

import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R, T, S } from '../../theme';
import { Screen, Header } from '../../components/ui';
import { StaticMol } from '../../sandbox/render';
import { QuestionCanvas } from '../../sandbox/QuestionCanvas';
import { formatFormulas } from '../../chem/formula';
import { CatalystMascot } from '../../components/mascot/CatalystMascot';
import { puzzleOfTheDay } from '../../content/structureWordle';
import { newGame, submitGuess, guessesLeft } from '../../content/puzzleGame';
import { Overlay } from '../../components/Overlay';
import { useViewport } from '../../components/DeviceFrame';
import { tap } from '../../sandbox/haptics';

export function StructurePuzzle({ onClose }) {
  const { width } = useViewport();
  const today = useMemo(() => puzzleOfTheDay(Date.now()), []);
  const [game, setGame] = useState(() => (today ? newGame(today) : null));
  const [graph, setGraph] = useState({ atoms: [], bonds: [] });

  if (!today || !game) return null;
  const solved = game.status === 'solved';
  const over = game.status === 'failed';
  const spent = game.guesses.length;
  const { guesses, note } = game;

  const submit = () => {
    const next = submitGuess(game, graph);
    if (next !== game && next.guesses.length > game.guesses.length) {
      tap();
      setGraph({ atoms: [], bonds: [] });
    }
    setGame(next);
  };

  // Full screen, over the tabs — the same container every other overlay
  // uses. Rendered in plain flow this sat under the tab bar and could not
  // be reached.
  return (
    <Overlay visible>
    <Screen>
      <Header
        title="Structure puzzle"
        subtitle={`${formatFormulas(today.puzzle.formula)} · ${today.answers.length} possible structures`}
        left={
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Back">
            <Ionicons name="arrow-back" size={22} color={C.navy} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}>
        <View style={sp.status}>
          <Text style={[T.body, { fontWeight: '700' }]}>
            {solved
              ? `Solved in ${spent} ${spent === 1 ? 'guess' : 'guesses'}`
              : over
              ? `It was ${today.answer}`
              : `${guessesLeft(game)} guesses left`}
          </Text>
          <Text style={T.tiny}>
            Green is right · amber is the right group in the wrong place · orange is wrong
          </Text>
        </View>

        {guesses.map((g, i) => (
          <View key={i} style={sp.guess}>
            <View style={{ alignItems: 'center' }}>
              <StaticMol mol={g.mol} width={width - 90} showCarbons={false} states={g.atoms} />
            </View>
            <Text style={[T.tiny, { fontWeight: '800', color: C.navy, marginTop: 4 }]}>
              {formatFormulas(g.name)}
            </Text>
            <Text style={T.tiny} accessibilityLabel={`Guess ${i + 1}: ${g.summary}`}>
              {g.summary}
            </Text>
          </View>
        ))}

        {solved || over ? (
          <View style={sp.done}>
            <CatalystMascot state={solved ? 'celebrate' : 'reassure'} size={92} />
            <Text style={[T.h3, { marginTop: 6 }]}>
              {solved ? 'That is the one' : `The answer was ${today.answer}`}
            </Text>
            <Text style={[T.sub, { textAlign: 'center', marginTop: 4 }]}>
              A new formula appears tomorrow.
            </Text>
          </View>
        ) : (
          <>
            <Text style={[T.body, { fontWeight: '700' }]}>Draw your guess</Text>
            {/* The canvas is flex:1 inside; in a scroll view that is zero
                height unless something bounds it, so it gets a real one. */}
            <View style={sp.canvasWrap}>
              <QuestionCanvas
                graph={graph}
                setGraph={(g) => { setGraph(g); setGame((gm) => (gm.note ? { ...gm, note: null } : gm)); }}
                width={width - 40}
                emptyHint={`Draw a structure with formula ${today.puzzle.formula}`}
              />
            </View>
            {note ? <Text style={[T.tiny, { color: C.warn }]}>{note}</Text> : null}
            <Pressable
              onPress={submit}
              disabled={!graph.atoms.length}
              style={[sp.submit, !graph.atoms.length && { opacity: 0.4 }]}
              accessibilityRole="button"
            >
              <Text style={{ color: '#FFF', fontWeight: '800' }}>Submit this structure</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </Screen>
    </Overlay>
  );
}

const sp = StyleSheet.create({
  status: { ...S.cardSoft, borderRadius: R.md, padding: 12, gap: 2 },
  guess: { ...S.row, padding: 12 },
  done: { alignItems: 'center', paddingVertical: 20 },
  canvasWrap: { height: 340, borderRadius: R.md, overflow: 'hidden', borderWidth: 1.5, borderColor: C.border },
  submit: {
    backgroundColor: C.teal, borderRadius: R.md, paddingVertical: 14, alignItems: 'center',
  },
});
