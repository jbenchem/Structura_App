// Practice tab — build a practice set (mockup screen 3), plus the
// first live use of the entitlement layer: an "adaptive set"
// toggle that opens the paywall for free users.

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Switch, StyleSheet, Pressable, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { C, T, R, shadow } from '../../theme';
import { Screen, Header, Card, Segmented, Chip, PrimaryButton, Pill } from '../../components/ui';
import { useEntitlement } from '../../state/store';
import { PRACTICE_MODES, TOPICS, LEVELS } from '../../content/content';

const MODE_ICONS = { name: 'shapes-outline', draw: 'create-outline', mixed: 'shuffle-outline' };

export function Practice({ startSession, prefill }) {
  const adaptive = useEntitlement('adaptivePractice');

  const [mode, setMode] = useState('name');
  const [level, setLevel] = useState('VCE');
  const [topics, setTopics] = useState(['alkanes', 'alkenes']);
  const [useAdaptive, setUseAdaptive] = useState(false);

  // Home quick actions prefill the mode.
  useEffect(() => {
    if (prefill && prefill.mode) setMode(prefill.mode);
  }, [prefill]);

  const toggleTopic = (id) =>
    setTopics((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));

  const onAdaptivePress = (next) => {
    if (!adaptive.allowed) {
      Alert.alert(
        'Structura Plus feature',
        'Adaptive sets weight questions toward your weak skills. Redeem an access code in the Account tab to unlock Plus.'
      );
      return;
    }
    setUseAdaptive(next);
  };

  const questionCount = 20;

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

        <Text style={ps.sectionTitle}>Select level</Text>
        <Segmented options={LEVELS} value={level} onChange={setLevel} />

        <Text style={ps.sectionTitle}>Choose topics</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {TOPICS.map((t) => (
            <Chip
              key={t.id}
              label={t.label}
              selected={topics.includes(t.id)}
              onPress={() => toggleTopic(t.id)}
            />
          ))}
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
          label="Start practice"
          style={{ marginTop: 18 }}
          disabled={topics.length === 0}
          onPress={() =>
            startSession({ mode, level, topics, adaptive: useAdaptive && adaptive.allowed, questionCount })
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
