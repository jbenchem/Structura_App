// Full-screen overlays: the unit lesson list + lesson player,
// practice sessions (draw / name / mixed), and code redemption.

import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, T, R, shadow } from '../../theme';
import { Screen, Card, PrimaryButton, LinkButton, Pill, Ring } from '../../components/ui';
import { Overlay, SheetOverlay, LoadingScreen, FadeIn } from '../../components/Overlay';
import { AccuracyRing } from '../../components/AccuracyRing';
import { useApp, unitStatus, canTestOut } from '../../state/store';
import { unitById } from '../../content/content';
import { pickDrawQuestions, pickNameQuestions, pickMixedQuestions } from '../../chem/questions';
import { DrawQuestion } from './DrawQuestion';
import { NameQuestion } from './NameQuestion';
import { LessonPlayer } from './LessonPlayer';
import { questionsMatching, practiceQuestions } from '../../content/questionFactory';
import * as POOLS from '../../content/pools';
import { formatFormulas } from '../../chem/formula';

// ── Unit overlay: lesson list → player ───────────────────────
export function LessonOverlay({ unitId, onClose, onUnitComplete }) {
  const { state, dispatch } = useApp();
  const [playing, setPlaying] = useState(null); // lesson index
  const [loading, setLoading] = useState(null); // lesson index being opened
  const unit = unitById(unitId);
  if (!unit) return null;

  const status = unitStatus(state, unit.id);
  const isCurrentUnit = state.progress.current.unitId === unit.id;
  const currentLesson = isCurrentUnit ? state.progress.current.lesson : null;

  const lessonStatus = (i) => {
    // A checkpoint is always available: passing it is an alternative to
    // working through the lessons, not only a reward for having done so.
    const lesson = unit.lessonList && unit.lessonList[i];
    if (lesson && lesson.checkpoint && canTestOut(state, unit.id)) return 'testout';
    if (status === 'complete') return 'done';
    if (state.dev && state.dev.unlockAll) return 'current';
    if (!isCurrentUnit) return 'locked';
    if (i + 1 < currentLesson) return 'done';
    if (i + 1 === currentLesson) return 'current';
    return 'locked';
  };

  const finishLesson = (i, result) => {
    const lesson = unit.lessonList && unit.lessonList[i];
    if (lesson && lesson.checkpoint && result && result.checkpointPassed) {
      // Passing the checkpoint completes the whole unit, however much of it
      // the learner actually worked through.
      dispatch({ type: 'completeUnit', unitId: unit.id });
      // The unit just closed: rather than dropping back to this lesson list
      // (now a wall of ticks), hand over to the Learn terrain — the station
      // fills, the halo advances, and a finished stage celebrates. The
      // results page has already had its moment; this is the map updating.
      if (onUnitComplete) {
        setPlaying(null);
        onUnitComplete(unit.id);
        return;
      }
    } else if (isCurrentUnit && i + 1 === currentLesson) {
      dispatch({ type: 'completeLesson' });
    }
    setPlaying(null);
  };

  // A short beat between tapping a lesson and it appearing: the tap is
  // acknowledged immediately and the lesson is introduced by name.
  const openLesson = (i) => {
    setLoading(i);
    setTimeout(() => {
      setPlaying(i);
      setLoading(null);
    }, 520);
  };

  return (
    <Overlay visible>
      {loading !== null && unit.lessonList ? (
        <LoadingScreen
          title={unit.lessonList[loading].title}
          subtitle={`${formatFormulas(unit.title)} · lesson ${loading + 1} of ${unit.lessonList.length}`}
        />
      ) : playing !== null && unit.lessonList ? (
        <FadeIn>
        <LessonPlayer
          key={unit.lessonList[playing].id}
          unit={unit}
          lesson={unit.lessonList[playing]}
          onFinish={(result) => finishLesson(playing, result)}
          onExit={() => setPlaying(null)}
        />
        </FadeIn>
      ) : (
        <FadeIn>
        <Screen edges={['top', 'bottom']}>
          <OverlayHeader title={formatFormulas(unit.title)} onClose={onClose} />
          <Text style={[T.sub, { marginBottom: 4 }]}>{formatFormulas(unit.subtitle)}</Text>
          <Text style={[T.tiny, { marginBottom: 14 }]}>
            Stage {unit.stageN} - {unit.stageTitle} - {unit.level} - difficulty {unit.difficulty}/5
          </Text>
          <ScrollView contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
            {unit.lessonList ? (
              unit.lessonList.map((lesson, i) => {
                const ls = lessonStatus(i);
                return (
                  <Pressable
                    key={lesson.id}
                    disabled={ls === 'locked'}
                    onPress={() => openLesson(i)}
                    style={[
                      ov.lessonRow,
                      ls === 'current' && { borderColor: C.blue, backgroundColor: C.blueSoft },
                      ls === 'testout' && { borderColor: C.teal, backgroundColor: C.tealSoft },
                      ls === 'locked' && { opacity: 0.55 },
                    ]}
                  >
                    <View
                      style={[
                        ov.lessonNum,
                        ls === 'done' && { backgroundColor: C.teal },
                        ls === 'current' && { backgroundColor: C.card, borderWidth: 2, borderColor: C.blue },
                        ls === 'testout' && { backgroundColor: C.teal },
                      ]}
                    >
                      {ls === 'done' ? (
                        <Ionicons name="checkmark" size={14} color="#FFF" />
                      ) : ls === 'testout' ? (
                        <Ionicons name="flash" size={13} color="#FFF" />
                      ) : ls === 'locked' ? (
                        <Ionicons name="lock-closed" size={12} color={C.faint} />
                      ) : (
                        <Text style={{ color: C.blue, fontWeight: '800', fontSize: 12 }}>{i + 1}</Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[T.body, { fontWeight: '700' }]}>{formatFormulas(lesson.title)}</Text>
                        {(state.perfectLessons || []).includes(lesson.id) ? (
                          <Ionicons name="trophy" size={14} color="#C9911F" />
                        ) : null}
                      </View>
                      {ls === 'testout' ? (
                        <Text style={T.tiny}>
                          {lesson.ask || 20} questions · 80% to pass and complete the unit
                        </Text>
                      ) : null}
                    </View>
                    {/* how the lesson went, beside the play control rather
                        than over the lesson number */}
                    {(state.lessonResults || {})[lesson.id] ? (
                      <AccuracyRing
                        pct={state.lessonResults[lesson.id].pct * 100}
                        size={40}
                        stroke={4}
                        compact
                      />
                    ) : null}
                    {ls !== 'locked' ? (
                      <Ionicons
                        name={ls === 'done' ? 'refresh-outline' : 'play'}
                        size={18}
                        color={ls === 'done' ? C.faint : C.blue}
                      />
                    ) : null}
                  </Pressable>
                );
              })
            ) : (
              <Card>
                <Text style={T.h3}>Authoring in progress</Text>
                <Text style={[T.body, { marginTop: 10 }]}>
                  This unit is structured in the curriculum but its lessons have not been written
                  yet. Units are being authored in order — Stage 1 is live now.
                </Text>
                {isCurrentUnit ? (
                  <PrimaryButton
                    label="Mark lesson complete (dev)"
                    style={{ marginTop: 16 }}
                    onPress={() => dispatch({ type: 'completeLesson' })}
                  />
                ) : null}
              </Card>
            )}
          </ScrollView>
        </Screen>
        </FadeIn>
      )}
    </Overlay>
  );
}

// ── Practice session ─────────────────────────────────────────
// A recommendation opens a FOCUSED session: a synthetic lesson whose pool is
// every question matching one skill×family. Reusing LessonPlayer rather than
// inventing a second player means the results screen, the category breakdown
// and the attempt log all behave exactly as they do in a lesson — the practice
// is indistinguishable from the real thing, because it is the real thing.
export function FocusOverlay({ focus, count = 10, title, onClose }) {
  const questions = useMemo(
    () => questionsMatching(POOLS, focus, { count, seed: Date.now() % 9973 }),
    [focus, count]
  );
  const lesson = useMemo(
    () => ({
      id: `focus-${focus}`,
      title: title || 'Focused practice',
      pool: questions,
      ask: questions.length,
      steps: [],
      checkpoint: false,
    }),
    [focus, questions, title]
  );
  const unit = { id: 'focus', title: title || 'Focused practice', topics: [], lessonList: [lesson] };

  if (!questions.length) {
    return (
      <Overlay visible>
        <Screen edges={['top', 'bottom']}>
          <Header title="Focused practice" />
          <Card>
            <Text style={T.body}>
              There are no questions for this skill yet. Try a lesson instead.
            </Text>
          </Card>
          <PrimaryButton label="Close" onPress={onClose} />
        </Screen>
      </Overlay>
    );
  }

  return (
    <Overlay visible>
      <Screen edges={['top', 'bottom']}>
        <LessonPlayer unit={unit} lesson={lesson} onFinish={onClose} onExit={onClose} />
      </Screen>
    </Overlay>
  );
}

// Practice now draws from the same curriculum pools the lessons use, filtered
// by the chosen families and mode, and plays through LessonPlayer. The old
// separate question bank had its own shape and its own molecules, which meant
// practice and lessons were two different bodies of content that happened to
// look alike.
export function PracticeOverlay({ config, onClose }) {
  const questions = useMemo(
    () =>
      practiceQuestions(POOLS, {
        families: config.topics || [],
        mode: config.mode,
        count: config.questionCount || 20,
        seed: Date.now() % 9973,
      }),
    [config]
  );
  const lesson = useMemo(
    () => ({
      id: 'practice-session',
      title: 'Practice',
      pool: questions,
      ask: questions.length,
      steps: [],
      checkpoint: false,
    }),
    [questions]
  );
  const unit = { id: 'practice', title: 'Practice', topics: [], lessonList: [lesson] };

  if (!questions.length) {
    return (
      <Overlay visible>
        <Screen edges={['top', 'bottom']}>
          <Header title="Practice" />
          <Card>
            <Text style={T.body}>No questions match that combination. Try another topic or mode.</Text>
          </Card>
          <PrimaryButton label="Close" onPress={onClose} />
        </Screen>
      </Overlay>
    );
  }

  return (
    <Overlay visible>
      <Screen edges={['top', 'bottom']}>
        <LessonPlayer unit={unit} lesson={lesson} onFinish={onClose} onExit={onClose} />
      </Screen>
    </Overlay>
  );
}

// Retained for reference while the old bank is retired.
function LegacyPracticeOverlay({ config, onClose }) {
  const questions = useMemo(() => {
    const args = { level: config.level, topics: config.topics, count: config.questionCount };
    if (config.mode === 'draw') return pickDrawQuestions(args).map((q) => ({ ...q, kind: 'draw' }));
    if (config.mode === 'name') return pickNameQuestions(args).map((q) => ({ ...q, kind: 'name' }));
    return pickMixedQuestions(args);
  }, [config]);

  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState([]);
  const [warming, setWarming] = useState(true);

  // Same brief acknowledgement as opening a lesson.
  React.useEffect(() => {
    const t = setTimeout(() => setWarming(false), 460);
    return () => clearTimeout(t);
  }, []);

  const handleNext = (result) => {
    const next = [...results, result];
    setResults(next);
    if (idx + 1 < questions.length) setIdx(idx + 1);
  };

  const done = results.length >= questions.length && questions.length > 0;
  const q = questions[idx];

  return (
    <Overlay visible>
      {warming ? (
        <LoadingScreen
          title="Building your set"
          subtitle={`${questions.length} question${questions.length === 1 ? '' : 's'} · ${config.level}`}
        />
      ) : done ? (
        <SessionSummary results={results} total={questions.length} onClose={onClose} />
      ) : !questions.length ? (
        <EmptyPool config={config} onClose={onClose} />
      ) : q.kind === 'name' ? (
        <NameQuestion
          key={q.id}
          question={q}
          index={idx}
          total={questions.length}
          onNext={handleNext}
          onExit={onClose}
        />
      ) : (
        <DrawQuestion
          key={q.id}
          question={q}
          index={idx}
          total={questions.length}
          onNext={handleNext}
          onExit={onClose}
        />
      )}
    </Overlay>
  );
}

function SessionSummary({ results, total, onClose }) {
  const correct = results.filter((r) => r.correct).length;
  return (
    <Screen edges={['top', 'bottom']}>
      <OverlayHeader title="Session complete" onClose={onClose} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 }}>
        <Ring pct={total ? correct / total : 0} size={130}>
          <Text style={[T.h2, { fontSize: 24 }]}>
            {correct}/{total}
          </Text>
        </Ring>
        <Text style={T.h2}>
          {correct === total ? 'Perfect session!' : correct / total >= 0.7 ? 'Strong work' : 'Good practice'}
        </Text>
        <Text style={[T.sub, { textAlign: 'center' }]}>
          Every attempt is logged, so your skill breakdown and{'\n'}mastery diagnosis get sharper as you go.
        </Text>
      </View>
      <PrimaryButton label="Finish" style={{ marginBottom: 8 }} onPress={onClose} />
    </Screen>
  );
}

function EmptyPool({ config, onClose }) {
  return (
    <Screen edges={['top', 'bottom']}>
      <OverlayHeader title="Practice session" onClose={onClose} />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          <Pill label={config.mode} kind="plus" />
          <Pill label={config.level} kind="neutral" />
          {config.topics.map((t) => (
            <Pill key={t} label={t} kind="neutral" />
          ))}
        </View>
        <Card>
          <Text style={T.h3}>No questions for this filter yet</Text>
          <Text style={[T.body, { marginTop: 10 }]}>
            The question banks do not cover this level/topic combination yet - more questions land
            as units are authored.
          </Text>
        </Card>
        <LinkButton label="Finish session" onPress={onClose} style={{ marginTop: 20 }} />
      </ScrollView>
    </Screen>
  );
}

// ── Access-code redemption ───────────────────────────────────
export function RedeemModal({ visible, onClose }) {
  const { redeemCode } = useApp();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState(null); // {ok, msg}

  const submit = () => {
    const res = redeemCode(code);
    if (res.ok) {
      setStatus({ ok: true, msg: `${res.label} activated - ${res.days} days of Catalyst Plus.` });
    } else {
      setStatus({ ok: false, msg: res.error });
    }
  };

  const close = () => {
    setCode('');
    setStatus(null);
    onClose();
  };

  return (
    <SheetOverlay visible={visible} onClose={close}>
      <View style={ov.backdrop}>
        <View style={ov.sheet}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="key-outline" size={20} color={C.teal} />
            <Text style={[T.h2, { flex: 1 }]}>Redeem access code</Text>
            <Pressable onPress={close} hitSlop={8}>
              <Ionicons name="close" size={22} color={C.sub} />
            </Pressable>
          </View>
          <Text style={[T.sub, { marginTop: 6 }]}>
            School or tester codes unlock Catalyst Plus for a set period.
          </Text>
          <TextInput
            value={code}
            onChangeText={(v) => {
              setCode(v);
              setStatus(null);
            }}
            placeholder="e.g. SCHOOL-PILOT-2026"
            placeholderTextColor={C.faint}
            autoCapitalize="characters"
            autoCorrect={false}
            style={ov.input}
          />
          {status ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
              <Ionicons
                name={status.ok ? 'checkmark-circle' : 'alert-circle'}
                size={16}
                color={status.ok ? C.greenText : C.danger}
              />
              <Text style={[T.sub, { color: status.ok ? C.greenText : C.danger, flex: 1 }]}>
                {status.msg}
              </Text>
            </View>
          ) : null}
          {status && status.ok ? (
            <PrimaryButton label="Done" style={{ marginTop: 16 }} onPress={close} />
          ) : (
            <PrimaryButton
              label="Redeem"
              style={{ marginTop: 16 }}
              disabled={!code.trim()}
              onPress={submit}
            />
          )}
        </View>
      </View>
    </SheetOverlay>
  );
}

// ── Shared overlay header ────────────────────────────────────
function OverlayHeader({ title, onClose }) {
  return (
    <View style={ov.overlayHeader}>
      <Pressable onPress={onClose} hitSlop={12} style={{ width: 40 }}>
        <Ionicons name="chevron-down" size={26} color={C.navy} />
      </Pressable>
      <Text style={[T.h2, { flex: 1, textAlign: 'center' }]}>{title}</Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

const ov = StyleSheet.create({
  backdrop: { padding: 24 },
  sheet: {
    backgroundColor: C.card,
    borderRadius: R.xl,
    padding: 20,
    ...shadow,
  },
  input: {
    backgroundColor: C.bg,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: C.navy,
    marginTop: 14,
    letterSpacing: 1,
  },
  overlayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 14,
  },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: R.md,
    padding: 13,
    marginBottom: 10,
    ...shadow,
  },
  lessonNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.track,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
