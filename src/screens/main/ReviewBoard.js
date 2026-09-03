// ─────────────────────────────────────────────────────────────
// Review your mistakes.
//
// One row per fault, grouped by the chemistry it happened on, ordered by
// how much trouble it is causing. Tapping a row opens focused practice on
// exactly that skill and family — the attempt log cannot replay the card
// that was missed (pool questions are drawn fresh each run), so the review
// is a fresh set of the same kind, which is the better lesson anyway.
//
// A clear board is a state worth showing rather than an empty list.
// ─────────────────────────────────────────────────────────────

import React, { useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R, T, S } from '../../theme';
import { Screen, Header } from '../../components/ui';
import { useApp } from '../../state/store';
import { reviewSummary, isDue } from '../../state/reviewModel';
import { SHOW_REACTIONS } from '../../config';
import { CatalystMascot } from '../../components/mascot/CatalystMascot';
import { tap } from '../../sandbox/haptics';

export function ReviewBoard({ practiceFocus, onClose }) {
  const { state } = useApp();
  const now = Date.now();
  const summary = useMemo(
    () => reviewSummary(state, { showReactions: SHOW_REACTIONS }, now),
    [state.attempts, now]
  );

  return (
    <Screen>
      <Header
        title="Review your mistakes"
        subtitle="Grouped by what went wrong, not by when"
        left={
          onClose ? (
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Back">
              <Ionicons name="arrow-back" size={22} color={C.navy} />
            </Pressable>
          ) : null
        }
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}>
        {summary.clear ? (
          <View style={rb.clear}>
            <CatalystMascot state="smile" size={96} />
            <Text style={[T.h3, { marginTop: 8 }]}>Nothing needs review</Text>
            <Text style={[T.sub, { textAlign: 'center', marginTop: 4 }]}>
              No mistake has repeated often enough to be worth a set of its own. Keep going, and
              anything that starts to slip will show up here.
            </Text>
          </View>
        ) : (
          <>
            <Text style={T.sub}>
              {summary.total} recent {summary.total === 1 ? 'mistake' : 'mistakes'} across{' '}
              {summary.groups.length} {summary.groups.length === 1 ? 'pattern' : 'patterns'}. Each set is
              six questions of the same kind — not the same questions.
            </Text>
            {summary.groups.map((g) => {
              const due = isDue(g, now);
              return (
                <Pressable
                  key={g.key}
                  onPress={() => {
                    tap();
                    practiceFocus(`${g.category}:${g.family || 'general'}`, 6, g.label);
                  }}
                  style={({ pressed }) => [rb.row, pressed && { opacity: 0.75 }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Practise ${g.label}${g.family ? ` on ${g.family}s` : ''}, ${g.misses} recent mistakes`}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[T.body, { fontWeight: '800' }]}>{g.label}</Text>
                    <Text style={T.tiny}>
                      {g.family ? `${g.family}s · ` : ''}
                      {g.misses} recent {g.misses === 1 ? 'miss' : 'misses'}
                      {g.rightSince ? ` · ${g.rightSince} right since` : ''}
                    </Text>
                  </View>
                  {due ? (
                    <View style={rb.duePill}>
                      <Text style={rb.duePillTxt}>Due</Text>
                    </View>
                  ) : null}
                  <Ionicons name="chevron-forward" size={16} color={C.faint} />
                </Pressable>
              );
            })}
            <Text style={[T.tiny, { color: C.faint, marginTop: 4 }]}>
              A pattern retires itself once you have answered three of its kind correctly since the
              last slip.
            </Text>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const rb = StyleSheet.create({
  row: { ...S.row, flexDirection: 'row', alignItems: 'center', gap: 10 },
  duePill: { ...S.pill, backgroundColor: C.tealSoft, paddingHorizontal: 9, paddingVertical: 3 },
  duePillTxt: { color: C.teal, fontWeight: '800', fontSize: 11 },
  clear: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 12 },
});
