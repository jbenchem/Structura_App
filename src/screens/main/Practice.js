// Practice tab — build a practice set (mockup screen 3), plus the
// first live use of the entitlement layer: an "adaptive set"
// toggle that opens the paywall for free users.

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Switch, StyleSheet, Pressable, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { C, T, R, shadow } from '../../theme';
import { Screen, Header, Card, Segmented, Chip, PrimaryButton, Pill } from '../../components/ui';
import { useApp, useEntitlement, unitStatus } from '../../state/store';
import { PRACTICE_MODES, UNITS, unitById } from '../../content/content';
import { practiceTopics, practiceQuestions } from '../../content/questionFactory';
import { familyIntroUnits, classifyTopics } from '../../state/practiceGating';
import * as POOLS from '../../content/pools';

const MODE_ICONS = { name: 'shapes-outline', draw: 'create-outline', mixed: 'shuffle-outline' };

export function Practice({ startSession, prefill }) {
  const adaptive = useEntitlement('adaptivePractice');
  const { state, isPremium } = useApp();

  const [mode, setMode] = useState('name');
  // The families the curriculum actually contains, built from the pools so
  // the list cannot drift from the content. Level is gone: a VCE student and
  // a university student practising esters want the same esters, and the
  // difference is which families they have been taught, not a slider.
  const allTopics = useMemo(() => practiceTopics(POOLS), []);

  // Which unit introduces each family, and what that means for this
  // student: completed topics start selected; locked ones grey out, and
  // only Plus can reach past a lock.
  const gate = useMemo(() => {
    const introOf = familyIntroUnits(UNITS);
    return classifyTopics(
      allTopics.map((t) => t.id),
      {
        introOf,
        statusOf: (id) => unitStatus(state, id),
        completedUnits: state.progress.completedUnits || [],
        isPremium,
      }
    );
  }, [allTopics, state, isPremium]);

  // The default selection is what you've finished — ready to practise the
  // moment the tab opens, adjustable the moment you disagree.
  const [topics, setTopics] = useState(() => gate.defaults);
  const [useAdaptive, setUseAdaptive] = useState(false);

  // "Nothing selected means everything" — everything this student can
  // select. For a free user the locked families are excluded by
  // construction, so a bare Start can never serve untaught chemistry.
  const effectiveTopics = topics.length ? topics : gate.emptyMeans;

  // Home quick actions prefill the mode.
  useEffect(() => {
    if (prefill && prefill.mode) setMode(prefill.mode);
  }, [prefill]);

  const toggleTopic = (id) =>
    setTopics((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));

  const onAdaptivePress = (next) => {
    if (!adaptive.allowed) {
      Alert.alert(
        'Catalyst Plus feature',
        'Adaptive sets weight questions toward your weak skills. Redeem an access code in the Account tab to unlock Plus.'
      );
      return;
    }
    setUseAdaptive(next);
  };

  // How many questions the current selection can actually produce. A student
  // choosing "draw anhydrides" should be told there are none rather than
  // being handed a short or empty set.
  const available = useMemo(
    () => practiceQuestions(POOLS, { families: effectiveTopics, mode, count: 9999 }).length,
    [effectiveTopics, mode]
  );
  const questionCount = Math.min(20, available);

  return (
    <Screen>
      <Header title="Practice" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <Text style={[T.h1, { marginTop: 6 }]}>Build a practice set</Text>

        <Text style={ps.sectionTitle}>Choose a mode</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {PRACTICE_MODES.map((m) => {
            const selected = mode === m.id;
            return (
              <Pressable
                key={m.id}
                onPress={() => setMode(m.id)}
                style={[ps.modeCard, selected && { borderColor: C.teal, backgroundColor: C.tealSoft }]}
              >
                <Ionicons name={MODE_ICONS[m.id]} size={22} color={selected ? C.teal : C.sub} />
                <Text style={[ps.modeLabel, selected && { color: C.teal }]}>{m.label}</Text>
                <View style={[ps.modeRadio, selected && { borderColor: C.teal }]}>
                  {selected ? <View style={ps.modeRadioDot} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={[ps.sectionTitle, { flex: 1 }]}>Choose topics</Text>
          {topics.length ? (
            <Pressable onPress={() => setTopics([])} hitSlop={8}>
              <Text style={ps.clearLink}>Clear</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={[T.tiny, { marginTop: -6, marginBottom: 10 }]}>
          {topics.length
            ? `${available} question${available === 1 ? '' : 's'} available`
            : 'Nothing selected means everything — pick a few to narrow it down.'}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {allTopics.map((t) => {
            const n = mode === 'draw' ? t.draw : mode === 'name' ? t.name : t.total;
            const a = gate.access[t.id] || { locked: false, selectable: true };
            const onPress = () => {
              if (n === 0) return;
              if (!a.selectable) {
                const intro = a.unitId ? unitById(a.unitId) : null;
                Alert.alert(
                  'Not unlocked yet',
                  intro
                    ? `${t.label} arrives with ${intro.title} on your pathway. Catalyst Plus can practise ahead.`
                    : 'This topic unlocks further along your pathway.'
                );
                return;
              }
              toggleTopic(t.id);
            };
            return (
              <Chip
                key={t.id}
                label={n > 0 ? `${a.locked ? '\u{1F512} ' : ''}${t.label} · ${n}` : `${t.label} · —`}
                selected={topics.includes(t.id)}
                dim={a.locked}
                onPress={onPress}
              />
            );
          })}
        </View>

        {/* Entitlement-gated: adaptive weak-skill targeting (Plus) */}
        <Card style={{ marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <MaterialCommunityIcons name="bullseye-arrow" size={22} color={C.teal} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={T.h3}>Adaptive set</Text>
              {!adaptive.allowed ? <Pill label="Plus" kind="plus" /> : null}
            </View>
            <Text style={[T.tiny, { marginTop: 2 }]}>Weight questions toward your weak skills</Text>
          </View>
          <Switch
            value={useAdaptive && adaptive.allowed}
            onValueChange={onAdaptivePress}
            trackColor={{ true: C.teal, false: C.track }}
            thumbColor="#FFF"
          />
        </Card>

        <PrimaryButton
          label={available === 0 ? 'No questions for that combination' : `Start ${questionCount} questions`}
          style={{ marginTop: 18 }}
          disabled={available === 0}
          onPress={() =>
            startSession({ mode, topics: effectiveTopics, adaptive: useAdaptive && adaptive.allowed, questionCount })
          }
        />

        <View style={ps.footer}>
          <View style={ps.footerItem}>
            <Ionicons name="time-outline" size={18} color={C.sub} />
            <View>
              <Text style={[T.body, { fontWeight: '700' }]}>20-25 min</Text>
              <Text style={T.tiny}>Estimated time</Text>
            </View>
          </View>
          <View style={ps.footerDivider} />
          <View style={ps.footerItem}>
            <Ionicons name="list-outline" size={18} color={C.sub} />
            <View>
              <Text style={[T.body, { fontWeight: '700' }]}>{questionCount} questions</Text>
              <Text style={T.tiny}>Estimated count</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const ps = StyleSheet.create({
  sectionTitle: { ...T.h3, marginTop: 20, marginBottom: 10 },
  modeCard: {
    flex: 1,
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: R.lg,
    padding: 12,
    alignItems: 'center',
    gap: 8,
    ...shadow,
  },
  modeLabel: { fontSize: 12, fontWeight: '700', color: C.navy, textAlign: 'center' },
  modeRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeRadioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.teal },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
  },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footerDivider: { width: 1, height: 30, backgroundColor: C.border },
});
