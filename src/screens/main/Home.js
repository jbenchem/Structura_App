// Home tab — the version with an opinion.
//
// One recommended action, chosen by the decision engine in
// src/state/heroDecision.js from what the app actually knows, with
// everything else receding to compact secondary rows. The old four-equal-
// cards layout treated a brand-new student and a student one tap from a
// checkpoint identically; this one does not.
//
// The hero is computed ONCE per visit (memoised on mount) so it cannot
// flicker between recommendations while the student reads it — stability is
// one of the design brief's explicit safeguards, alongside: no manufactured
// urgency, no streak threats, and nothing that highlights the absence of
// data on a fresh install.

import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, T, R } from '../../theme';
import { Screen, Header } from '../../components/ui';
import { CatalystMascot } from '../../components/mascot/CatalystMascot';
import { useApp } from '../../state/store';
import { UNITS, STAGES, unitById } from '../../content/content';
import { UNITS as FULL_UNITS } from '../../content/curriculum';
import { SHOW_REACTIONS } from '../../config';
import { chooseHero, lastSessionEvidence } from '../../state/heroDecision';
import { useTourTarget } from '../../components/Spotlight';
import { formatFormulas } from '../../chem/formula';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const todayIndex = () => (new Date().getDay() + 6) % 7;


// The screen decides what Cat means; the mascot only renders it. Welcome on
// first open, a pointing guide when the hero is a recommendation, mild
// streak concern only when the hero itself is stating streak status (an
// alive streak with today undone — the existing rule's own precondition),
// idle otherwise. No competing logic: the hero engine already decided.
const GUIDE_HEROES = new Set(['checkpoint-repair', 'weak-skill', 'checkpoint-ready', 're-entry', 'exam-soon', 'consolidate', 'naming-only']);
export function mascotStateFor(hero, firstOpen) {
  if (firstOpen) return 'welcome';
  if (hero && hero.id === 'streak-build') return 'streakConcern';
  if (hero && GUIDE_HEROES.has(hero.id)) return 'guide';
  return 'idle';
}

export function Home({ openLesson, goPractice, goSandbox, goLearn }) {
  const { state } = useApp();
  const name = state.user.name;
  const firstOpen = !state.progress.completedUnits.length && !state.attempts.some((a) => !a.demo);

  // The curriculum view the engine reads: enabled units for every decision,
  // the full list only to detect that the study flag changed what's next.
  const view = useMemo(
    () => ({
      units: UNITS,
      fullUnits: FULL_UNITS,
      showReactions: SHOW_REACTIONS,
      unitById,
      stageOfUnit: (id) => STAGES.find((s) => s.units.some((u) => u.id === id)) || null,
      // Every checkpoint lesson in the enabled course, so the repair rule
      // can read lessonResults against the pass bar.
      checkpoints: UNITS.flatMap((u) =>
        (u.lessonList || [])
          .filter((l) => l.checkpoint)
          .map((l) => ({ lessonId: l.id, unitId: u.id, unitTitle: u.title }))
      ),
      todayIdx: todayIndex(),
    }),
    []
  );

  // One decision per visit. Answer a question elsewhere and come back:
  // recomputed. Sit and look at it: stable.
  const hero = useMemo(() => chooseHero(state, view), []); // eslint-disable-line react-hooks/exhaustive-deps
  const evidence = useMemo(() => lastSessionEvidence(state), []); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (dest) => {
    if (!dest) return;
    if (dest.kind === 'lesson') return openLesson(dest.unitId);
    if (dest.kind === 'practice') return goPractice(dest.mode || 'mixed');
    if (dest.kind === 'learn') return goLearn && goLearn();
    if (dest.kind === 'sandbox') return goSandbox();
  };

  const heroRef = useTourTarget('home.continue');
  const alsoRef = useTourTarget('home.quick');
  const sandboxRef = useTourTarget('home.sandbox');

  return (
    <Screen>
      <Header title="Catalyst" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <Text style={[T.h1, { marginTop: 6 }]}>
          {firstOpen ? 'Welcome to Catalyst' : `${greeting()}${name ? `, ${name}` : ''}`}
        </Text>
        <Text style={[T.sub, { marginTop: 4, marginBottom: 16 }]}>
          {firstOpen
            ? 'Learn to read, name and draw organic structures.'
            : 'Here\u2019s the best next step from your learning.'}
        </Text>

        {/* The hero: always exactly one. */}
        <Pressable ref={heroRef} onPress={() => go(hero.dest)} style={({ pressed }) => [hs.hero, pressed && hs.pressed]}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={hs.eyebrow}>{hero.eyebrow}</Text>
            <Text style={[T.h2, { marginTop: 6 }]}>{formatFormulas(hero.title)}</Text>
            <Text style={[T.sub, { marginTop: 4 }]}>{formatFormulas(hero.support)}</Text>
            <View style={hs.cta}>
              <Text style={hs.ctaText}>{hero.cta}</Text>
            </View>
          </View>
          <CatalystMascot state={mascotStateFor(hero, firstOpen)} size={112} style={{ alignSelf: 'flex-end' }} />
        </Pressable>

        {/* The quiet way out of the recommendation. On first open it is the
            only other thing on screen; afterwards the rows below take its
            place, always visible so the tour always has something to point
            at. */}
        {firstOpen ? (
          <Pressable onPress={() => goLearn && goLearn()} style={{ paddingVertical: 12 }} accessibilityRole="button">
            <Text style={hs.link}>See the full pathway</Text>
          </Pressable>
        ) : (
          <View style={{ height: 14 }} />
        )}

        {/* Everything else, as compact rows — hidden on the very first open
            so the launch screen is one decision and one link. */}
        {!firstOpen ? (
          <View ref={alsoRef}>
            <Text style={hs.sectionTitle}>Also available</Text>
            <SecondaryRow icon="locate-outline" label="Focused practice" onPress={() => goPractice('mixed')} />
            <SecondaryRow icon="book-outline" label="Browse the course" onPress={() => goLearn && goLearn()} />
            <View ref={sandboxRef}>
              <SecondaryRow icon="flask-outline" label="Open sandbox" onPress={goSandbox} />
            </View>
          </View>
        ) : null}

        {/* At most one factual insight; nothing until it is evidence. */}
        {evidence ? (
          <View style={hs.evidence}>
            <Ionicons name="stats-chart-outline" size={14} color={C.sub} />
            <Text style={[T.tiny, { color: C.sub, fontWeight: '600' }]}>{evidence}</Text>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function SecondaryRow({ icon, label, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [hs.row, pressed && hs.pressed]} accessibilityRole="button">
      <Ionicons name={icon} size={18} color={C.teal} />
      <Text style={[T.h3, { flex: 1 }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={C.faint} />
    </Pressable>
  );
}

const hs = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    backgroundColor: C.tealSoft,
    borderWidth: 1.5,
    borderColor: C.tealBorder,
    borderRadius: R.lg,
    padding: 16,
  },
  pressed: { opacity: 0.85 },
  eyebrow: { fontSize: 12, fontWeight: '800', color: C.teal },
  cta: {
    alignSelf: 'flex-start',
    backgroundColor: C.teal,
    borderRadius: R.sm,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 14,
  },
  ctaText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  link: { color: C.teal, fontWeight: '700', fontSize: 14, textDecorationLine: 'underline' },
  sectionTitle: { ...T.h3, marginTop: 2, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    borderRadius: R.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 8,
  },
  evidence: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
  },
});
