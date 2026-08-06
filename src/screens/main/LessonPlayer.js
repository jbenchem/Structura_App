// ─────────────────────────────────────────────────────────────
// Lesson player. Runs a lesson's authored steps in order:
//   teach → reading card with optional molecule
//   mc    → multiple choice with instant marking + explanation
//   name  → structure shown, type the IUPAC name
//   draw  → embedded canvas checked against the target
// Question steps log real attempts (concept / structure-to-name /
// name-to-structure) so lesson work feeds analytics like practice.
// ─────────────────────────────────────────────────────────────

import React, { useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { C, R, T, shadow } from '../../theme';
import { formatFormulas } from '../../chem/formula';
import { questionSizing } from './questionSizing';
import { useViewport } from '../../components/DeviceFrame';
import { Screen, PrimaryButton, ProgressBar } from '../../components/ui';
import { StaticMol } from '../../sandbox/render';
import { checkDrawing } from '../../chem/engineBridge';
import { QuestionCanvas } from '../../sandbox/QuestionCanvas';
import { ChainBuilder } from './ChainBuilder';
import { QuestionView } from './QuestionViews';
import { ReferenceSheet } from './ReferenceSheet';
import { SectionWipe } from '../../components/Overlay';
import { sample } from '../../content/questionFactory';
import { StructureToggle, CountAtoms, ElementExplorer } from './InteractiveSteps';
import { PeriodicTable } from '../../components/PeriodicTable';
import { normalizeName } from '../../chem/questions';
import { useApp } from '../../state/store';

// mc / name / draw teaching steps share the quiz question shape.
function toStep(st, i) {
  if (st.type === 'mc')
    return {
      type: 'question',
      q: {
        id: `teach-mc-${i}`,
        type: 'mcName',
        chip: st.chip || 'CHECK YOUR UNDERSTANDING',
        prompt: st.prompt,
        mol: st.mol,
        showCarbons: !!st.showCarbons,
        options: st.options,
        answer: st.answer,
        explain: st.explain,
      },
    };
  if (st.type === 'name')
    return {
      type: 'question',
      q: {
        id: `teach-name-${i}`,
        type: 'write',
        chip: 'WRITE THE NAME',
        prompt: 'Give the preferred IUPAC name for this structure.',
        mol: st.target,
        answer: st.name,
        explain: `This structure is ${st.name}.`,
        hint: st.hint,
      },
    };
  if (st.type === 'draw')
    return {
      type: 'question',
      q: {
        id: `teach-draw-${i}`,
        type: 'draw',
        chip: 'DRAW THE MOLECULE',
        prompt: `Draw ${st.name}.`,
        subtitle: 'Build the complete structure on the canvas.',
        name: st.name,
        answer: st.name,
        explain: `${st.name} drawn correctly.`,
        hint: st.hint,
      },
    };
  return st;
}

export function LessonPlayer({ unit, lesson, onFinish, onExit }) {
  const { dispatch } = useApp();
  const { width } = useViewport();
  const [stepIdx, setStepIdx] = useState(0);
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState({ right: 0, asked: 0 });
  const [refOpen, setRefOpen] = useState(false);
  // The wipe covers the screen, the step changes underneath it, then it wipes
  // off to reveal the quiz. `pending` is the step to move to at full coverage.
  const [wipe, setWipe] = useState(null);
  // A checkpoint is a test-out: pass it and the whole unit completes, so the
  // bar is deliberately high and stated up front.
  const PASS = 0.8;

  // Teaching steps run in order, every time. Questions are sampled from the
  // lesson's pool so repeating a lesson is not repeating the same questions.
  const questions = useMemo(
    () => (lesson.pool ? sample(lesson.pool, lesson.ask || 12) : []),
    [lesson]
  );
  // Teaching questions are rendered by the same views as the quiz, so a
  // lesson does not change shape halfway through.
  const teach = useMemo(() => (lesson.steps || []).map(toStep), [lesson]);
  const base = useMemo(
    () => [...teach, ...questions.map((q) => ({ type: 'question', q }))],
    [teach, questions]
  );

  // Wrong answers are appended once, so a missed idea comes back before the
  // lesson ends rather than being quietly dropped.
  const [retries, setRetries] = useState([]);
  const steps = useMemo(() => [...base, ...retries], [base, retries]);
  const step = steps[stepIdx];

  const logAttempt = (payload) => {
    dispatch({
      type: 'logAttempt',
      attempt: {
        unitId: unit.id,
        questionId: `${lesson.id}-s${stepIdx}`,
        topics: unit.topics,
        difficulty: unit.difficulty,
        ...payload,
      },
    });
  };

  const advance = () => {
    const next = stepIdx + 1;
    // Crossing out of the teaching steps into the questions: hold the step
    // change until the wipe has covered the screen.
    if (next === teach.length && questions.length > 0) {
      setWipe({
        label: 'Test your understanding',
        sub: `${questions.length} questions`,
        pending: next,
      });
      return;
    }
    if (next < steps.length) setStepIdx(next);
    else setFinished(true);
  };

  React.useEffect(() => {
    if (teach.length === 0 && questions.length > 0) {
      setWipe(
        lesson.checkpoint
          ? {
              label: 'Checkpoint',
              sub: `Pass ${Math.round(PASS * 100)}% to complete the unit`,
              icon: 'flash-outline',
              pending: 0,
            }
          : { label: 'Test your understanding', sub: `${questions.length} questions`, pending: 0 }
      );
    }
    // once per lesson
  }, [lesson.id]);

  const passedCheckpoint =
    lesson.checkpoint && score.asked > 0 && score.right / score.asked >= PASS;

  if (finished) {
    return (
      <Screen edges={['top', 'bottom']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <Ionicons name="checkmark-circle" size={72} color={C.green} />
          <Text style={T.h1}>Lesson complete</Text>
          <Text style={[T.sub, { textAlign: 'center' }]}>
            {lesson.title} — {unit.title}
          </Text>
          {score.asked ? (
            <Text style={[T.h3, { marginTop: 6 }]}>
              {score.right} of {score.asked} correct
            </Text>
          ) : null}
          {lesson.checkpoint ? (
            <View style={[lp.result, passedCheckpoint ? lp.resultPass : lp.resultFail]}>
              <Ionicons
                name={passedCheckpoint ? 'trophy-outline' : 'refresh-outline'}
                size={20}
                color={passedCheckpoint ? C.greenText : C.warn}
              />
              <Text style={[T.body, { flex: 1, color: C.navy }]}>
                {passedCheckpoint
                  ? `Checkpoint passed — ${unit.title} is complete and the next unit is unlocked.`
                  : `You need ${Math.ceil(PASS * 100)}% to pass the checkpoint. Work through the lessons and try again.`}
              </Text>
            </View>
          ) : null}
        </View>
        <PrimaryButton
          label="Continue"
          style={{ marginBottom: 8 }}
          onPress={() => onFinish({ checkpointPassed: !!passedCheckpoint })}
        />
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      {/* Top bar */}
      <View style={lp.top}>
        <Pressable onPress={onExit} hitSlop={10} style={{ width: 36 }}>
          <Ionicons name="close" size={24} color={C.navy} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <ProgressBar pct={(stepIdx + 1) / steps.length} height={6} />
        </View>
        <Text style={[T.tiny, { width: 40, textAlign: 'right', fontWeight: '700' }]}>
          {stepIdx + 1} / {steps.length}
        </Text>
        <Pressable
          onPress={() => setRefOpen(true)}
          hitSlop={8}
          accessibilityLabel="nomenclature reference"
          style={lp.refBtn}
        >
          <Ionicons name="book-outline" size={16} color={C.teal} />
        </Pressable>
      </View>
      <ReferenceSheet visible={refOpen} onClose={() => setRefOpen(false)} />
      {wipe ? (
        <SectionWipe
          label={wipe.label}
          sub={wipe.sub}
          icon={wipe.icon}
          width={width}
          onCover={() => {
            // fully covered: swap the content out of sight
            if (wipe.pending < steps.length) setStepIdx(wipe.pending);
          }}
          onDone={() => setWipe(null)}
        />
      ) : null}
      <Text style={[T.sub, { fontWeight: '700', marginBottom: 8 }]}>{lesson.title}</Text>

      {step.type === 'teach' ? (
        <TeachStep key={stepIdx} step={step} onContinue={advance} />
      ) : null}
      {step.type === 'build' ? (
        <ChainBuilder key={stepIdx} step={step} width={width} onContinue={advance} />
      ) : null}
      {step.type === 'toggle' ? (
        <StructureToggle key={stepIdx} step={step} width={width} onContinue={advance} />
      ) : null}
      {step.type === 'count' ? (
        <CountAtoms key={stepIdx} step={step} width={width} onContinue={advance} />
      ) : null}
      {step.type === 'elements' ? (
        <ElementExplorer key={stepIdx} step={step} width={width} onContinue={advance} />
      ) : null}
      {step.type === 'question' ? (
        <QuestionView
          key={step.q.id}
          q={step.q}
          width={width}
          last={stepIdx === steps.length - 1}
          onDone={(correct) => {
            setScore((sc) => ({ right: sc.right + (correct ? 1 : 0), asked: sc.asked + 1 }));
            // one repeat per question: enough to revisit, never a loop
            if (!correct && !step.q.id.startsWith('again-')) {
              setRetries((r) => [
                ...r,
                { type: 'question', q: { ...step.q, id: `again-${step.q.id}` } },
              ]);
            }
            logAttempt({
              qType: step.q.type === 'draw' ? 'name-to-structure' : 'concept',
              correct,
              ms: null,
              errorClass: correct ? null : 'other',
            });
            advance();
          }}
        />
      ) : null}
    </Screen>
  );
}

// ── teach ────────────────────────────────────────────────────
export function TeachStepProbe(step) {
  return TeachStep({ step, onContinue: () => {} });
}

function TeachStep({ step, onContinue }) {
  const viewport = useViewport();
  const { width } = viewport;
  const z = questionSizing(viewport);
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[lp.card, { flex: 1 }]}>
          <Text style={[T.h2, { fontSize: z.promptSize + 1 }]}>{step.title}</Text>
          <Text style={[T.body, { marginTop: 10, fontSize: z.subtitleSize + 1, lineHeight: z.promptLine }]}>
            {formatFormulas(step.body)}
          </Text>
          {step.mol ? (
            <View style={[lp.molStage, { minHeight: z.molHeight, marginTop: z.gap }]}>
              {/* showCarbons draws CH3-CH2-CH3 rather than a bare skeleton —
                  used wherever the hydrogens are the point */}
              <StaticMol mol={step.mol} width={Math.min(z.molWidth, width - 90)} showCarbons={!!step.showCarbons} />
            </View>
          ) : null}
          {step.placeholder ? (
            <View style={lp.placeholder}>
              <Ionicons name="image-outline" size={26} color={C.faint} />
              <Text style={lp.placeholderTxt}>{step.placeholder}</Text>
              <Text style={lp.placeholderTag}>illustration to be added</Text>
            </View>
          ) : null}
          {step.caption ? <Text style={lp.caption}>{formatFormulas(step.caption)}</Text> : null}
          {step.periodic ? (
            <View style={lp.tableStage}>
              <PeriodicTable cell={Math.min(34, Math.floor((width - 90) / 8) - 3)} />
              {step.periodicNote ? (
                <Text style={lp.caption}>{formatFormulas(step.periodicNote)}</Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </ScrollView>
      <PrimaryButton label="Continue" onPress={onContinue} style={{ marginBottom: 4 }} />
    </View>
  );
}

const lp = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 6, paddingBottom: 12 },
  refBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.tealBorder,
    backgroundColor: C.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    marginTop: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: C.border,
    borderRadius: R.lg,
    backgroundColor: C.bg,
    paddingVertical: 22,
    paddingHorizontal: 18,
    alignItems: 'center',
    gap: 8,
  },
  placeholderTxt: { fontSize: 13, color: C.sub, textAlign: 'center', lineHeight: 19 },
  placeholderTag: { fontSize: 10.5, fontWeight: '800', color: C.faint, letterSpacing: 0.5 },
  result: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginTop: 18,
    borderRadius: R.md,
    borderWidth: 1,
    padding: 13,
  },
  resultPass: { backgroundColor: C.greenSoft, borderColor: '#CDE9B9' },
  resultFail: { backgroundColor: '#FDF3E7', borderColor: '#F3D5B3' },
  tableStage: { alignItems: 'center', marginTop: 16 },
  molStage: { alignItems: 'center', justifyContent: 'center', marginTop: 14, minHeight: 120 },
  caption: { fontSize: 12.5, color: C.sub, textAlign: 'center', marginTop: 10, lineHeight: 18 },
  card: {
    backgroundColor: C.card,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    ...shadow,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: R.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  explain: {
    marginTop: 12,
    backgroundColor: C.tealSoft,
    borderWidth: 1,
    borderColor: C.tealBorder,
    borderRadius: R.md,
    padding: 12,
  },
  input: {
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: C.navy,
    marginTop: 12,
  },
  resultGood: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.greenSoft,
    borderWidth: 1,
    borderColor: '#CDE9B9',
    borderRadius: R.md,
    padding: 12,
    marginTop: 10,
  },
  resultBad: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: C.warnSoft,
    borderWidth: 1,
    borderColor: '#F3D5B3',
    borderRadius: R.md,
    padding: 12,
    marginTop: 10,
  },
  drawFeedback: {
    position: 'absolute',
    left: 6,
    right: 6,
    bottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: R.md,
    padding: 10,
    ...shadow,
  },
  toolRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  toolDivider: { width: 1, height: 22, backgroundColor: C.border, marginHorizontal: 2 },
  orderBtn: {
    width: 40,
    height: 36,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
