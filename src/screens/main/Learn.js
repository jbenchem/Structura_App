// Learn tab — the learning pathway, grouped by stage.
// Locks are PROGRESSION locks, never paywall locks: the whole
// curriculum is free, units unlock by finishing earlier ones.

import React from 'react';
import { View, Text, ScrollView, Alert, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, T, R, shadow } from '../../theme';
import { Screen, Header, Pill } from '../../components/ui';
import { useApp, unitStatus } from '../../state/store';
import { STAGES } from '../../content/content';

export function Learn({ openLesson }) {
  const { state } = useApp();
  const current = state.progress.current;

  const onPressUnit = (unit, status) => {
    if (status === 'locked') {
      Alert.alert('Locked for now', 'Finish the earlier units to unlock this one — no paywall here, just the pathway.');
      return;
    }
    openLesson(unit.id);
  };

  return (
    <Screen>
      <Header title="Learn" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <Text style={[T.sub, { marginTop: 4, marginBottom: 12, fontWeight: '600' }]}>
          Your learning pathway
        </Text>

        {STAGES.map((stage) => (
          <View key={stage.id}>
            <View style={ls.stageHeader}>
              <View style={ls.stageBadge}>
                <Text style={ls.stageBadgeText}>{stage.n}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={T.h3}>{stage.title}</Text>
                <Text style={T.tiny}>{stage.blurb}</Text>
              </View>
            </View>

            {stage.units.map((u, i) => {
              const status = unitStatus(state, u.id);
              const isLast = i === stage.units.length - 1;
              const lessonsCount = u.lessons ? u.lessons.length : u.plannedLessons;
              const progressLabel =
                status === 'complete'
                  ? `${lessonsCount} / ${lessonsCount} lessons`
                  : status === 'current'
                  ? `Lesson ${current.lesson} of ${lessonsCount}`
                  : `${lessonsCount} lessons`;

              return (
                <View key={u.id} style={{ flexDirection: 'row' }}>
                  <View style={{ width: 44, alignItems: 'center', paddingTop: 12 }}>
                    <Node status={status} lesson={current.lesson} />
                    {!isLast ? <View style={ls.railLine} /> : null}
                  </View>
                  <Pressable
                    onPress={() => onPressUnit(u, status)}
                    style={[
                      ls.unitCard,
                      status === 'current' && { borderColor: C.blue, backgroundColor: C.blueSoft },
                      status === 'locked' && { opacity: 0.65 },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={T.h3}>{u.title}</Text>
                      <Text style={[T.sub, { marginTop: 2 }]}>{u.subtitle}</Text>
                      <Text style={[T.tiny, { marginTop: 6 }]}>
                        {progressLabel}
                        {!u.lessons ? ' - authoring soon' : ''}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
                      {status === 'complete' ? <Pill label="Complete" kind="complete" /> : null}
                      {status === 'current' ? <Pill label="In progress" kind="progress" /> : null}
                      {status === 'locked' ? (
                        <Ionicons name="lock-closed" size={16} color={C.faint} />
                      ) : (
                        <Ionicons name="chevron-forward" size={18} color={C.faint} />
                      )}
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}

        <View style={ls.legend}>
          <LegendItem icon={<Ionicons name="checkmark-circle" size={16} color={C.teal} />} label="Completed" />
          <LegendItem icon={<View style={ls.legendRing} />} label="In progress" />
          <LegendItem icon={<Ionicons name="lock-closed" size={14} color={C.faint} />} label="Locked" />
        </View>
      </ScrollView>
    </Screen>
  );
}

function Node({ status, lesson }) {
  if (status === 'complete') {
    return (
      <View style={[ls.node, { backgroundColor: C.teal }]}>
        <Ionicons name="checkmark" size={16} color="#FFF" />
      </View>
    );
  }
  if (status === 'current') {
    return (
      <View style={[ls.node, { backgroundColor: C.card, borderWidth: 2.5, borderColor: C.blue }]}>
        <Text style={{ color: C.blue, fontWeight: '800', fontSize: 13 }}>{lesson}</Text>
      </View>
    );
  }
  return (
    <View style={[ls.node, { backgroundColor: C.track }]}>
      <Ionicons name="lock-closed" size={13} color={C.faint} />
    </View>
  );
}

function LegendItem({ icon, label }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {icon}
      <Text style={T.tiny}>{label}</Text>
    </View>
  );
}

const ls = StyleSheet.create({
  stageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    marginBottom: 12,
  },
  stageBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: C.tealSoft,
    borderWidth: 1,
    borderColor: C.tealBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageBadgeText: { color: C.teal, fontWeight: '800', fontSize: 13 },
  node: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  railLine: { flex: 1, width: 2.5, backgroundColor: C.border, marginVertical: 4 },
  unitCard: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: R.lg,
    padding: 14,
    marginBottom: 16,
    ...shadow,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 6,
  },
  legendRing: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: C.blue,
  },
});
