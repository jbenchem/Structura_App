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

import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, T, R, S } from '../../theme';
import { Screen, Header } from '../../components/ui';
import { CatalystMascot } from '../../components/mascot/CatalystMascot';
import { moleculeOfTheDay, metFamilies, dailyStatus, dayNumber } from '../../content/dailyMolecule';
import { matchTypedName } from '../../content/answerMatch';
import { StaticMol } from '../../sandbox/render';
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


// The screen decides what Kat means; the mascot only renders it. Welcome on
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
            <DailyChallenge onOpen={goSandbox} />
            <SecondaryRow icon="locate-outline" label="Focused practice" onPress={() => goPractice('mixed')} />
            <SecondaryRow icon="book-outline" label="Browse the course" onPress={() => goLearn && goLearn()} />
            <View ref={sandboxRef}>
              <SecondaryRow
              icon="flask-outline"
              label="Name anything"
              note="Draw a structure or type a name — the engine names it and explains every part."
              onPress={goSandbox}
            />
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

// One verified structure a day — and a question, not a display. It is drawn
// only from chemistry the learner has already met, there is one attempt, and
// the answer stands for the day. Getting it wrong shows the name and the
// reasoning rather than hiding it: the point is the explanation.
function DailyChallenge({ onOpen }) {
  const { state, dispatch } = useApp();
  const [text, setText] = useState('');
  const [showWork, setShowWork] = useState(false);

  const view = useMemo(() => ({ units: UNITS }), []);
  const daily = useMemo(
    () => moleculeOfTheDay(Date.now(), undefined, metFamilies(state, view)),
    [state.progress.completedUnits, view]
  );
  const status = dailyStatus(state, Date.now());
  if (!daily) return null;

  const submit = () => {
    const m = matchTypedName(daily.name, text);
    dispatch({ type: 'dailyChallengeResult', day: daily.day, correct: m.correct, given: text.trim() });
    setShowWork(true);
  };

  return (
    <View style={[hs.row, { alignItems: 'flex-start' }]}>
      <Ionicons name="today-outline" size={18} color={C.teal} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={T.h3}>Molecule of the day</Text>
        <Text style={[T.tiny, { color: C.sub, marginTop: 1 }]}>
          {status.answered ? 'Today’s answer is in.' : 'Name this structure — one attempt.'}
        </Text>

        <View style={{ alignItems: 'center', marginTop: 8 }}>
          <StaticMol mol={daily.mol} width={200} showCarbons={false} />
        </View>

        {!status.answered ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="IUPAC name"
              placeholderTextColor={C.faint}
              autoCapitalize="none"
              autoCorrect={false}
              style={hs.dailyInput}
              accessibilityLabel="Your name for the molecule of the day"
            />
            <Pressable
              onPress={submit}
              disabled={!text.trim()}
              style={[hs.dailyBtn, !text.trim() && { opacity: 0.4 }]}
              accessibilityRole="button"
            >
              <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>Check</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ marginTop: 10, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons
                name={status.correct ? 'checkmark-circle' : 'close-circle'}
                size={18}
                color={status.correct ? C.greenText : C.warn}
              />
              <Text style={[T.body, { fontWeight: '800', color: status.correct ? C.greenText : C.navy }]}>
                {status.correct ? 'Correct' : 'Not quite'}
              </Text>
            </View>
            <Text style={[T.sub]}>
              It is {formatFormulas(daily.name)}
              {status.given && !status.correct ? ` — you wrote ${status.given}.` : '.'}
            </Text>
            {showWork && daily.work ? (
              daily.work.steps.map((st, i) => (
                <View key={i} style={{ marginTop: 4 }}>
                  <Text style={[T.tiny, { fontWeight: '800', color: C.navy }]}>{st.heading}</Text>
                  <Text style={[T.tiny, { color: C.sub }]}>{formatFormulas(st.body)}</Text>
                  {st.alternative ? (
                    <Text style={[T.tiny, { color: C.teal, fontStyle: 'italic' }]}>{formatFormulas(st.alternative)}</Text>
                  ) : null}
                </View>
              ))
            ) : (
              <Pressable onPress={() => setShowWork(true)} hitSlop={6}>
                <Text style={{ color: C.teal, fontWeight: '800', fontSize: 12 }}>Show the reasoning</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

function SecondaryRow({ icon, label, note, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [hs.row, pressed && hs.pressed]} accessibilityRole="button">
      <Ionicons name={icon} size={18} color={C.teal} />
      <View style={{ flex: 1 }}>
        <Text style={T.h3}>{label}</Text>
        {note ? <Text style={[T.tiny, { color: C.sub, marginTop: 1 }]}>{note}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={C.faint} />
    </Pressable>
  );
}

const hs = StyleSheet.create({
  dailyInput: {
    flex: 1, borderWidth: 1.5, borderColor: C.border, borderRadius: R.sm,
    paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: C.navy, backgroundColor: C.card,
  },
  dailyBtn: { backgroundColor: C.teal, borderRadius: R.sm, paddingHorizontal: 14, paddingVertical: 9 },
  hero: {
    ...S.cardSoft,
    flexDirection: 'row',
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
  row: { ...S.row, flexDirection: 'row', alignItems: 'center', gap: 10 },
  evidence: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.bg,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
  },
});
