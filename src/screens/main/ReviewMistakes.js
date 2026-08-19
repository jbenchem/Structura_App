// ─────────────────────────────────────────────────────────────
// Review mistakes.
//
// A walkthrough, not a re-test. Each missed question is shown with its answer
// already revealed and the explanation open. Nothing here is answerable and
// nothing is counted: the lesson is finished, and re-scoring a question the
// learner has just been told the answer to would only measure short-term
// memory while inflating the record of what they can do.
// ─────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R, T } from '../../theme';
import { StaticMol } from '../../sandbox/render';
import { formatFormulas } from '../../chem/formula';
import { CATEGORY_META } from '../../content/questionFactory';
import { parseName } from '../../engine/index.js';
import { needsExplicitAtoms } from '../../content/questionFactory';
import { tap } from '../../sandbox/haptics';

// What the right answer looked like, in the shape the question used.
function AnswerBody({ q, width }) {
  if (q.type === 'mcName' || q.type === 'compareNames') {
    const options =
      q.type === 'compareNames' ? ['Yes, same compound', 'No, different compounds'] : q.options;
    return (
      <View style={{ gap: 8 }}>
        {options.map((opt, i) => {
          const right = i === q.answer;
          return (
            <View key={i} style={[rv.option, right && rv.optionRight]}>
              <View style={[rv.letter, right && rv.letterRight]}>
                <Text style={[rv.letterTxt, right && { color: '#fff' }]}>
                  {String.fromCharCode(65 + i)}
                </Text>
              </View>
              <Text style={[T.body, { flex: 1, fontWeight: right ? '800' : '500' }]}>
                {formatFormulas(String(opt))}
              </Text>
              {right ? <Ionicons name="checkmark-circle" size={20} color={C.greenText} /> : null}
            </View>
          );
        })}
      </View>
    );
  }

  if (q.type === 'mcStructure') {
    return (
      <View style={rv.grid}>
        {q.options.map((mol, i) => {
          const right = i === q.answer;
          return (
            <View key={i} style={[rv.card, right && rv.cardRight]}>
              <View style={rv.cardHead}>
                <Text style={rv.cardLetter}>{String.fromCharCode(65 + i)}</Text>
                {right ? <Ionicons name="checkmark-circle" size={18} color={C.teal} /> : null}
              </View>
              <StaticMol mol={mol} width={Math.max(110, width / 2 - 60)} showCarbons={needsExplicitAtoms(mol)} />
            </View>
          );
        })}
      </View>
    );
  }

  if (q.type === 'draw') {
    const parsed = parseName(q.name);
    return (
      <View style={{ alignItems: 'center' }}>
        {parsed.ok ? (
          <StaticMol mol={parsed.mol} width={Math.min(width - 90, 300)} showCarbons={false} />
        ) : null}
        <Text style={rv.answerLine}>{formatFormulas(q.name)}</Text>
      </View>
    );
  }

  // write, number, buildName and anything else with a plain answer
  return (
    <View style={{ alignItems: 'center' }}>
      {q.mol ? (
        <StaticMol
          mol={q.mol}
          width={Math.min(width - 90, 280)}
          showCarbons={!!q.showCarbons || needsExplicitAtoms(q.mol)}
        />
      ) : null}
      <Text style={rv.answerLine}>
        {formatFormulas(String(q.answer))}
        {q.unit ? ` ${q.unit}` : ''}
      </Text>
    </View>
  );
}

export function ReviewMistakes({ questions, width, onDone }) {
  const [i, setI] = useState(0);
  const q = questions[i];
  const last = i === questions.length - 1;
  const meta = CATEGORY_META[q.category] || { label: 'Question', icon: 'help-outline' };

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <View style={rv.top}>
        <Pressable onPress={onDone} hitSlop={10} accessibilityLabel="close review">
          <Ionicons name="close" size={24} color={C.navy} />
        </Pressable>
        <Text style={rv.topTitle}>Reviewing</Text>
        <Text style={rv.counter}>
          {i + 1} / {questions.length}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1, minHeight: 0 }}
        contentContainerStyle={{ paddingBottom: 12 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={rv.chip}>
          <Ionicons name={meta.icon} size={13} color={C.teal} />
          <Text style={rv.chipTxt}>{meta.label}</Text>
        </View>

        <Text style={rv.prompt}>{formatFormulas(q.prompt)}</Text>

        <View style={{ marginTop: 14 }}>
          <AnswerBody q={q} width={width} />
        </View>

        <View style={rv.explain}>
          <Ionicons name="information-circle-outline" size={18} color={C.teal} />
          <View style={{ flex: 1 }}>
            <Text style={rv.explainLabel}>WHY</Text>
            <Text style={rv.explainTxt}>{formatFormulas(q.explain)}</Text>
          </View>
        </View>

        <Text style={rv.note}>
          Nothing here is marked — this is a walkthrough of what you missed.
        </Text>
      </ScrollView>

      <Pressable
        style={rv.cta}
        onPress={() => {
          tap();
          if (last) onDone();
          else setI(i + 1);
        }}
      >
        <Text style={rv.ctaTxt}>{last ? 'Done' : 'Next'}</Text>
      </Pressable>
    </View>
  );
}

const rv = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  topTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: C.navy },
  counter: { fontSize: 13, fontWeight: '700', color: C.sub, width: 44, textAlign: 'right' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: C.tealSoft,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 6,
  },
  chipTxt: { fontSize: 11, fontWeight: '800', color: C.teal, letterSpacing: 0.5 },
  prompt: { fontSize: 19, fontWeight: '800', color: C.navy, marginTop: 12, lineHeight: 26 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.card,
    borderRadius: R.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    opacity: 0.6,
  },
  optionRight: { borderColor: C.green, backgroundColor: C.greenSoft, opacity: 1 },
  letter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterRight: { backgroundColor: C.green, borderColor: C.green },
  letterTxt: { fontSize: 12.5, fontWeight: '800', color: C.navy },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    width: '48%',
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.card,
    borderRadius: R.lg,
    padding: 10,
    alignItems: 'center',
    opacity: 0.55,
  },
  cardRight: { borderColor: C.teal, borderWidth: 2, opacity: 1 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  cardLetter: { fontSize: 14, fontWeight: '800', color: C.navy },
  answerLine: { fontSize: 20, fontWeight: '800', color: C.greenText, marginTop: 10, textAlign: 'center' },
  explain: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: C.tealSoft,
    borderRadius: R.md,
    padding: 13,
    marginTop: 16,
  },
  explainLabel: { fontSize: 10, fontWeight: '800', color: C.teal, letterSpacing: 0.6 },
  explainTxt: { fontSize: 13.5, color: C.navy, lineHeight: 19, marginTop: 3 },
  note: { fontSize: 12, color: C.sub, textAlign: 'center', marginTop: 14, fontStyle: 'italic' },
  cta: {
    backgroundColor: C.teal,
    borderRadius: R.md,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  ctaTxt: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
