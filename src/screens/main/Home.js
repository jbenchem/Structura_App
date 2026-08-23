// Home tab — greeting, continue-learning card, quick actions,
// weekly streak. Matches mockup screen 1.

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, T } from '../../theme';
import { Screen, Header, Card, ProgressBar } from '../../components/ui';
import { useApp } from '../../state/store';
import { unitById } from '../../content/content';
import { useTourTarget } from '../../components/Spotlight';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

// JS getDay(): 0=Sun … 6=Sat → Monday-first index 0..6
function todayIndex() {
  return (new Date().getDay() + 6) % 7;
}

export function Home({ openLesson, goPractice, goSandbox }) {
  const { state } = useApp();
  const { current, daysDone } = state.progress;
  const unit = unitById(current.unitId);
  const pct = unit ? current.lesson / unit.lessons : 0;
  const name = state.user.name;
  const tIdx = todayIndex();
  const doneCount = daysDone.filter(Boolean).length;

  // Registered for the first-run tour. Home knows the names of its own parts
  // and nothing about the tour; the tour knows the names and nothing about
  // Home. Each can be rewritten without the other.
  const continueRef = useTourTarget('home.continue');
  const quickRef = useTourTarget('home.quick');
  const sandboxRef = useTourTarget('home.sandbox');

  return (
    <Screen>
      <Header title="Structura" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <Text style={[T.h1, { marginTop: 6, marginBottom: 16 }]}>
          {greeting()}
          {name ? `, ${name}` : ''}
        </Text>

        {unit ? (
          <View ref={continueRef} collapsable={false}>
          <Card tint="blue" onPress={() => openLesson(unit.id)}>
            <Text style={hs.eyebrow}>CONTINUE LEARNING</Text>
            <Text style={[T.h2, { marginTop: 6 }]}>{unit.title}</Text>
            <Text style={[T.sub, { marginTop: 2 }]}>
              Lesson {current.lesson} of {unit.lessons}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
              <ProgressBar pct={pct} style={{ flex: 1 }} />
              <Text style={[T.tiny, { fontWeight: '700' }]}>{Math.round(pct * 100)}%</Text>
            </View>
          </Card>
          </View>
        ) : null}

        <View ref={quickRef} collapsable={false} style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
          <Card tint="green" style={{ flex: 1 }} onPress={() => goPractice('name')}>
            <Ionicons name="shapes-outline" size={22} color={C.teal} />
            <Text style={[T.h3, { marginTop: 10 }]}>Name a structure</Text>
            <Ionicons name="arrow-forward" size={18} color={C.teal} style={{ marginTop: 10 }} />
          </Card>
          <Card tint="blue" style={{ flex: 1 }} onPress={() => goPractice('draw')}>
            <Ionicons name="create-outline" size={22} color={C.blue} />
            <Text style={[T.h3, { marginTop: 10 }]}>Draw a structure</Text>
            <Ionicons name="arrow-forward" size={18} color={C.blue} style={{ marginTop: 10 }} />
          </Card>
        </View>

        <View ref={sandboxRef} collapsable={false}>
        <Card tint="teal" style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }} onPress={goSandbox}>
          <Ionicons name="flask-outline" size={24} color={C.teal} />
          <View style={{ flex: 1 }}>
            <Text style={T.h3}>Sandbox</Text>
            <Text style={[T.tiny, { marginTop: 2 }]}>
              Name anything you draw, or draw anything you name
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={C.teal} />
        </Card>
        </View>

        <Card style={{ marginTop: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
            <Text style={T.h3}>This week</Text>
            <Text style={T.sub}>{doneCount} of 7 days</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {DAY_LABELS.map((d, i) => {
              const done = daysDone[i];
              const isToday = i === tIdx;
              return (
                <View key={`${d}${i}`} style={{ alignItems: 'center', gap: 6 }}>
                  <Text style={T.tiny}>{d}</Text>
                  {done ? (
                    <Ionicons name="checkmark-circle" size={28} color={C.teal} />
                  ) : (
                    <View
                      style={[
                        hs.dayDot,
                        isToday && { borderColor: C.teal, borderWidth: 2.5 },
                      ]}
                    />
                  )}
                </View>
              );
            })}
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const hs = StyleSheet.create({
  eyebrow: { fontSize: 11, fontWeight: '800', color: C.blue, letterSpacing: 0.8 },
  dayDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.card,
  },
});
