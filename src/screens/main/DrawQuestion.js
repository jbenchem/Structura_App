// ─────────────────────────────────────────────────────────────
// Draw question (name → structure).
//
// Uses the same canvas and bottom dock as the sandbox, via
// QuestionCanvas, which forces explain off so nothing on screen
// can reveal the answer.
//
// The graph is in the engine's format, so checking hands it
// straight to the engine with no conversion.
// ─────────────────────────────────────────────────────────────

import React, { useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R, T, shadow } from '../../theme';
import { useViewport } from '../../components/DeviceFrame';
import { Screen, PrimaryButton } from '../../components/ui';
import { QuestionCanvas } from '../../sandbox/QuestionCanvas';
import { StaticMol } from '../../sandbox/render';
import { ReferenceSheet } from './ReferenceSheet';
import { checkDrawing } from '../../chem/engineBridge';
import { tidy } from '../../sandbox/layout';
import { useApp } from '../../state/store';

export function DrawQuestion({ question, index, total, onNext, onExit }) {
  const { dispatch } = useApp();
  const [graph, setGraph] = useState({ atoms: [], bonds: [] });
  const [feedback, setFeedback] = useState(null);
  const [showExplain, setShowExplain] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [refOpen, setRefOpen] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const startTs = useRef(Date.now());

  const commit = (g) => {
    setGraph(g);
    setFeedback(null);
    setShowExplain(false);
  };

  const runCheck = () => {
    // tidy first — identity-preserving, and it makes the feedback readable
    const tidied = graph.atoms.length > 1 ? tidy(graph) : graph;
    setGraph(tidied);
    // stereo assessed only where the question opts in (Stage 9+)
    const res = checkDrawing(tidied, question.name, { stereo: !!question.stereo });
    dispatch({
      type: 'logAttempt',
      attempt: {
        unitId: null,
        questionId: question.id,
        qType: 'name-to-structure',
        topics: question.topics,
        difficulty: question.difficulty,
        correct: res.correct,
        ms: Date.now() - startTs.current,
        errorClass: res.correct ? null : res.issue.errorClass,
      },
    });
    setFeedback(res);
    setShowExplain(false);
  };

  const canCheck = graph.atoms.length > 0;

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={dq.header}>
        <Pressable onPress={onExit} hitSlop={10} style={{ width: 36 }}>
          <Ionicons name="arrow-back" size={22} color={C.navy} />
        </Pressable>
        <Text style={[T.sub, { flex: 1, textAlign: 'center', fontWeight: '700' }]}>
          Question {index + 1} of {total}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable
            onPress={() => setRefOpen(true)}
            hitSlop={8}
            accessibilityLabel="nomenclature reference"
          >
            <Ionicons name="book-outline" size={20} color={C.teal} />
          </Pressable>
          <Pressable onPress={() => setBookmarked((b) => !b)} hitSlop={8}>
            <Ionicons
              name={bookmarked ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={bookmarked ? C.teal : C.navy}
            />
          </Pressable>
        </View>
      </View>
      <ReferenceSheet visible={refOpen} onClose={() => setRefOpen(false)} />

      <Pressable style={dq.prompt} onPress={() => setPromptOpen((o) => !o)}>
        <Text style={[T.h3, { flex: 1 }]}>Draw {question.name}</Text>
        <Ionicons name={promptOpen ? 'chevron-up' : 'chevron-down'} size={18} color={C.sub} />
      </Pressable>
      {promptOpen ? (
        <Text style={[T.sub, { marginBottom: 8 }]}>
          Build the structure, then tap Check structure. Topics: {question.topics.join(', ')} —
          difficulty {question.difficulty}/5.
        </Text>
      ) : null}

      <View style={{ flex: 1, marginTop: 6 }}>
        <QuestionCanvas graph={graph} setGraph={commit} />

        {feedback && !feedback.correct ? (
          <View style={dq.feedback}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <Ionicons name="warning" size={20} color={C.warn} />
              <View style={{ flex: 1 }}>
                <Text style={T.h3}>{feedback.issue.title}</Text>
                <Text style={[T.sub, { marginTop: 4 }]}>{feedback.issue.message}</Text>
              </View>
              {graph.atoms.length ? (
                <View style={{ width: 66 }}>
                  <StaticMol mol={graph} width={66} showCarbons={false} />
                </View>
              ) : null}
              <Pressable onPress={() => setFeedback(null)} hitSlop={8}>
                <Ionicons name="close" size={18} color={C.sub} />
              </Pressable>
            </View>
            {showExplain ? (
              <Text style={[T.sub, { marginTop: 10, color: C.navy }]}>
                {feedback.issue.explanation}
              </Text>
            ) : null}
            <Pressable style={dq.explainBtn} onPress={() => setShowExplain((s) => !s)}>
              <Text style={{ color: C.teal, fontWeight: '700', fontSize: 13 }}>
                {showExplain ? 'Hide explanation' : 'Show explanation'}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {feedback && feedback.correct ? (
          <View style={[dq.feedback, { borderColor: '#CDE9B9', backgroundColor: C.greenSoft }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="checkmark-circle" size={22} color={C.greenText} />
              <View style={{ flex: 1 }}>
                <Text style={[T.h3, { color: C.greenText }]}>Correct structure</Text>
                <Text style={[T.sub, { marginTop: 2 }]}>That is {question.name}.</Text>
              </View>
            </View>
            <PrimaryButton
              label={index + 1 < total ? 'Next question' : 'Finish session'}
              style={{ marginTop: 12, paddingVertical: 12 }}
              onPress={() => onNext({ correct: true })}
            />
          </View>
        ) : null}
      </View>

      <PrimaryButton
        label="Check structure"
        style={{ marginTop: 8, marginBottom: 4 }}
        disabled={!canCheck}
        onPress={runCheck}
      />
    </Screen>
  );
}

const dq = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 8, paddingBottom: 10 },
  prompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 4,
    ...shadow,
  },
  feedback: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: R.lg,
    padding: 14,
    ...shadow,
    elevation: 6,
  },
  explainBtn: {
    alignSelf: 'flex-start',
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: C.teal,
    borderRadius: R.sm,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
});
