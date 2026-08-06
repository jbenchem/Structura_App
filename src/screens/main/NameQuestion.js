// ─────────────────────────────────────────────────────────────
// Name question screen (structure → name) for practice sessions.
// Mirrors DrawQuestion's chrome: header with progress + bookmark,
// molecule card, input, check → feedback, attempt logging.
// ─────────────────────────────────────────────────────────────

import React, { useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet  } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R, T, shadow } from '../../theme';
import { useViewport } from '../../components/DeviceFrame';
import { Screen, PrimaryButton } from '../../components/ui';
import { StaticMol } from '../../sandbox/render';
import { ReferenceSheet } from './ReferenceSheet';
import { checkName, normalizeName } from '../../chem/questions';
import { useApp } from '../../state/store';

export function NameQuestion({ question, index, total, onNext, onExit }) {
  const { width } = useViewport();
  const { dispatch } = useApp();
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null); // 'right' | 'wrong'
  const [bookmarked, setBookmarked] = useState(false);
  const [refOpen, setRefOpen] = useState(false);
  const startTs = useRef(Date.now());

  const classify = (guess) => {
    const strip = (s) => normalizeName(s).replace(/[0-9,]/g, '');
    return strip(guess) === strip(question.name) ? 'locant' : 'other';
  };

  const check = () => {
    const ok = checkName(input, question);
    setResult(ok ? 'right' : 'wrong');
    dispatch({
      type: 'logAttempt',
      attempt: {
        unitId: null,
        questionId: question.id,
        qType: 'structure-to-name',
        topics: question.topics,
        difficulty: question.difficulty,
        correct: ok,
        ms: Date.now() - startTs.current,
        errorClass: ok ? null : classify(input),
      },
    });
  };

  return (
    <Screen edges={['top', 'bottom']}>
      {/* Header */}
      <View style={nq.header}>
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

      <ScrollView
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={nq.card}>
          <Text style={T.h3}>Name this structure</Text>
          <StaticMol mol={question.target} width={width - 90} showCarbons={false} />
        </View>

        <TextInput
          value={input}
          onChangeText={(v) => {
            setInput(v);
            if (result === 'wrong') setResult(null);
          }}
          editable={result !== 'right'}
          placeholder="Type the IUPAC name"
          placeholderTextColor={C.faint}
          autoCapitalize="none"
          autoCorrect={false}
          style={nq.input}
        />

        {result === 'right' ? (
          <View style={nq.good}>
            <Ionicons name="checkmark-circle" size={20} color={C.greenText} />
            <Text style={[T.body, { color: C.greenText, fontWeight: '700', flex: 1 }]}>
              Correct — {question.name}
            </Text>
          </View>
        ) : null}
        {result === 'wrong' ? (
          <View style={nq.bad}>
            <Ionicons name="close-circle" size={20} color={C.warn} />
            <View style={{ flex: 1 }}>
              <Text style={[T.body, { fontWeight: '700' }]}>Not quite</Text>
              <Text style={[T.sub, { marginTop: 2 }]}>
                Check locants, hyphens and commas, then try again — or reveal the answer below.
              </Text>
              <Pressable
                onPress={() => {
                  setInput(question.name);
                  setResult(null);
                }}
                hitSlop={6}
                style={{ marginTop: 8 }}
              >
                <Text style={{ color: C.teal, fontWeight: '700', fontSize: 13 }}>Reveal answer</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {result === 'right' ? (
        <PrimaryButton
          label={index + 1 < total ? 'Next question' : 'Finish session'}
          style={{ marginBottom: 4 }}
          onPress={() => onNext({ correct: true })}
        />
      ) : (
        <PrimaryButton
          label="Check name"
          style={{ marginBottom: 4 }}
          disabled={!input.trim()}
          onPress={check}
        />
      )}
    </Screen>
  );
}

const nq = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 8, paddingBottom: 12 },
  card: {
    backgroundColor: C.card,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    ...shadow,
  },
  input: {
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: C.navy,
    marginTop: 14,
  },
  good: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.greenSoft,
    borderWidth: 1,
    borderColor: '#CDE9B9',
    borderRadius: R.md,
    padding: 12,
    marginTop: 12,
  },
  bad: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: C.warnSoft,
    borderWidth: 1,
    borderColor: '#F3D5B3',
    borderRadius: R.md,
    padding: 12,
    marginTop: 12,
  },
});
