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
import { LessonResults } from './LessonResults';
import { IsomerHunt } from './IsomerHunt';
import { GlossaryText } from '../../components/GlossaryText';
import { ReviewMistakes } from './ReviewMistakes';
import { sample, subcategoryKey, errorClassForCategory } from '../../content/questionFactory';
import {
  StructureToggle, CountAtoms, ElementExplorer, AlcoholBuilder, BranchBuilder,
  NumberingChooser, GroupSwapper, PriorityExplorer, StereoFlipper,
  IsomerCollector, RingExplorer, LocantCompare, BracketDecoder,
  ChainTracer, AlphaSorter, CarbonylSlider, SuffixTester, StepThrough, FormSlider,
} from './InteractiveSteps';
import { PeriodicTable } from '../../components/PeriodicTable';
import { ROOTS as ROOT_TABLE } from '../../content/reference';
import { normalizeName } from '../../chem/questions';
import { useApp, getSettings } from '../../state/store';
import { speechSegmentsFor, segmentIndexOf } from '../../content/speech';
import { useReadAloud, SpeakerButton } from '../../components/ReadAloud';

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
  const [byCategory, setByCategory] = useState({});
  const [missedQs, setMissedQs] = useState([]);
  const startedAt = React.useRef(Date.now());
  const [elapsedMs, setElapsedMs] = useState(0);
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

  // A missed question is NOT repeated inside the lesson, and reviewing it is a
  // walkthrough rather than a second attempt: the answer is shown, nothing is
  // answerable, and nothing is scored. Re-marking a question the learner has
  // just been told the answer to would measure short-term memory and inflate
  // the record of what they can do.
  const [reviewing, setReviewing] = useState(false);
  const steps = base;
  const step = steps[stepIdx];

  // Question type as the attempt log records it, so the log and the lesson
  // agree rather than each inventing a vocabulary.
  const QTYPE_OF = {
    draw: 'name-to-structure',
    write: 'structure-to-name',
    mcName: 'structure-to-name',
    mcStructure: 'name-to-structure',
    buildName: 'structure-to-name',
    number: 'concept',
    tapCarbons: 'concept',
    compareNames: 'concept',
  };

  // when the current question first appeared, so the log can carry a duration
  const shownAt = React.useRef(Date.now());
  React.useEffect(() => { shownAt.current = Date.now(); }, [stepIdx]);

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
    // A checkpoint is assessment from the first screen, so it never shows the
    // "test your understanding" interlude — it announced a change of mode that
    // had not happened.
    if (next === teach.length && questions.length > 0 && !lesson.checkpoint) {
      setWipe({
        label: 'Test your understanding',
        sub: `${questions.length} questions`,
        pending: next,
      });
      return;
    }
    if (next < steps.length) setStepIdx(next);
    else {
      setElapsedMs(Date.now() - startedAt.current);
      setFinished(true);
    }
  };

  React.useEffect(() => {
    if (questions.length > 0 && (teach.length === 0 || lesson.checkpoint)) {
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

  const perfect = score.asked > 0 && score.right === score.asked;

  React.useEffect(() => {
    if (!finished || !score.asked) return;
    dispatch({
      type: 'lessonResult',
      lessonId: lesson.id,
      right: score.right,
      asked: score.asked,
      ms: elapsedMs,
    });
    if (perfect) dispatch({ type: 'lessonPerfect', lessonId: lesson.id });
  }, [finished, perfect, lesson.id, score.right, score.asked, elapsedMs]);

  const passedCheckpoint =
    lesson.checkpoint && score.asked > 0 && score.right / score.asked >= PASS;

  if (finished && reviewing && missedQs.length) {
    return (
      <Screen edges={['top', 'bottom']}>
        <ReviewMistakes
          questions={missedQs}
          width={width}
          onDone={() => setReviewing(false)}
        />
      </Screen>
    );
  }

  if (finished) {
    const unitLessons = unit.lessonList || [];
    const doneCount = Math.min(
      unitLessons.length,
      unitLessons.findIndex((l) => l.id === lesson.id) + 1
    );
    return (
      <Screen edges={['top', 'bottom']}>
        <LessonResults
          unit={unit}
          lesson={lesson}
          score={score}
          byCategory={byCategory}
          elapsedMs={elapsedMs}
          unitProgress={{ done: doneCount, total: unitLessons.length }}
          onClose={() => onFinish({ checkpointPassed: !!passedCheckpoint })}
          onContinue={() => onFinish({ checkpointPassed: !!passedCheckpoint })}
          onReview={missedQs.length ? () => setReviewing(true) : undefined}
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
      {/* The lesson title is shown while teaching, but not while answering.
          On a drawing question it was the fourth line of chrome above the
          canvas — after the chip, the prompt and the subtitle — and the
          learner already has the context from the lesson they opened. The
          space is worth more to the canvas. */}
      {step.type === 'teach' ? (
        <Text style={[T.sub, { fontWeight: '700', marginBottom: 8 }]}>{lesson.title}</Text>
      ) : null}

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
      {step.type === 'formslider' ? (
        <FormSlider key={stepIdx} step={step} width={width} onContinue={advance} />
      ) : null}
      {step.type === 'trace' ? (
        <ChainTracer key={stepIdx} step={step} width={width} onContinue={advance} />
      ) : null}
      {step.type === 'sort' ? (
        <AlphaSorter key={stepIdx} step={step} width={width} onContinue={advance} />
      ) : null}
      {step.type === 'slide' ? (
        <CarbonylSlider key={stepIdx} step={step} width={width} onContinue={advance} />
      ) : null}
      {step.type === 'suffixtest' ? (
        <SuffixTester key={stepIdx} step={step} width={width} onContinue={advance} />
      ) : null}
      {step.type === 'stepthrough' ? (
        <StepThrough key={stepIdx} step={step} width={width} onContinue={advance} />
      ) : null}
      {step.type === 'isomerhunt' ? (
        <IsomerHunt key={stepIdx} step={step} onContinue={advance} />
      ) : null}
      {step.type === 'isomers' ? (
        <IsomerCollector key={stepIdx} step={step} width={width} onContinue={advance} />
      ) : null}
      {step.type === 'ring' ? (
        <RingExplorer key={stepIdx} step={step} width={width} onContinue={advance} />
      ) : null}
      {step.type === 'locants' ? (
        <LocantCompare key={stepIdx} step={step} width={width} onContinue={advance} />
      ) : null}
      {step.type === 'brackets' ? (
        <BracketDecoder key={stepIdx} step={step} width={width} onContinue={advance} />
      ) : null}
      {step.type === 'numbering' ? (
        <NumberingChooser key={stepIdx} step={step} width={width} onContinue={advance} />
      ) : null}
      {step.type === 'swap' ? (
        <GroupSwapper key={stepIdx} step={step} width={width} onContinue={advance} />
      ) : null}
      {step.type === 'priority' ? (
        <PriorityExplorer key={stepIdx} step={step} width={width} onContinue={advance} />
      ) : null}
      {step.type === 'flip' ? (
        <StereoFlipper key={stepIdx} step={step} width={width} onContinue={advance} />
      ) : null}
      {step.type === 'branch' ? (
        <BranchBuilder key={stepIdx} step={step} width={width} onContinue={advance} />
      ) : null}
      {step.type === 'alcohol' ? (
        <AlcoholBuilder key={stepIdx} step={step} width={width} onContinue={advance} />
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
          onDone={(correct, info) => {
            setScore((sc) => ({ right: sc.right + (correct ? 1 : 0), asked: sc.asked + 1 }));
            const cat = step.q.category || 'molecule-type';
            const sub = subcategoryKey(cat, step.q.family);
            setByCategory((m) => {
              const prev = m[cat] || { right: 0, asked: 0, subs: {} };
              const prevSub = prev.subs[sub] || { right: 0, asked: 0 };
              return {
                ...m,
                [cat]: {
                  right: prev.right + (correct ? 1 : 0),
                  asked: prev.asked + 1,
                  subs: {
                    ...prev.subs,
                    [sub]: {
                      right: prevSub.right + (correct ? 1 : 0),
                      asked: prevSub.asked + 1,
                    },
                  },
                },
              };
            });
            if (!correct) setMissedQs((r) => (r.some((x) => x.id === step.q.id) ? r : [...r, step.q]));
            // The durable record. It carries the same skill x family tags the
            // results screen uses, and the engine's own classification of what
            // went wrong — both were previously dropped, leaving a log that
            // could say a question was failed but never why.
            logAttempt({
              qType: QTYPE_OF[step.q.type] || 'concept',
              category: cat,
              family: step.q.family || null,
              subcategory: sub,
              correct,
              ms: Date.now() - shownAt.current,
              // The engine classifies a wrong drawing precisely and a written
              // answer is classified by shape. Everything else falls back to
              // what the CATEGORY implies — a numbering question got wrong is
              // a locant error — rather than to "other", which tells an
              // analysis nothing.
              errorClass: correct
                ? null
                : (info && info.errorClass) || errorClassForCategory(cat),
              chosen: info && info.chosen != null ? info.chosen : null,
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
  const { state } = useApp();
  const settings = getSettings(state);

  // Everything readable on this page, derived from the step itself. A new
  // teaching step is spoken the moment it is authored: nothing is recorded,
  // nothing is registered, and no audio is produced per lesson.
  const segments = React.useMemo(() => speechSegmentsFor(step), [step]);
  const read = useReadAloud(segments, { auto: settings.autoRead, voiceId: settings.voiceId });
  // Which segment each field is, so a paragraph can ask whether the voice is
  // currently inside it.
  const lit = (field) => read.tokenIn(segmentIndexOf(segments, field));

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[lp.card, { flex: 1 }]}>
          <View style={lp.titleRow}>
            {/* GlossaryText puts its <Text> inside a wrapper <View> so the
                definition bubble has something to position against, which
                means flex has to go on the wrapper — a flex on the text
                style would leave the heading sized to its content and
                squash the speaker button off the row. */}
            <View style={{ flex: 1 }}>
              <GlossaryText
                style={[T.h2, { fontSize: z.promptSize + 1 }]}
                highlight={lit('title')}
              >
                {step.title}
              </GlossaryText>
            </View>
            {/* Reads the page aloud, highlighting each word as it is said.
                Automatic if the student has turned that on in Account. */}
            {segments.length ? (
              <SpeakerButton speaking={read.speaking} onPress={read.toggle} />
            ) : null}
          </View>
          {/* Glossary terms are marked [[like this]] in the content: they
              render blue, bold and underlined, and tapping one opens its
              definition beneath this paragraph. Plain text is unaffected. */}
          <GlossaryText
            style={[T.body, { marginTop: 10, fontSize: z.subtitleSize + 1, lineHeight: z.promptLine }]}
            highlight={lit('body')}
          >
            {step.body}
          </GlossaryText>
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
          {step.caption ? (
            <GlossaryText style={lp.caption} highlight={lit('caption')}>
              {step.caption}
            </GlossaryText>
          ) : null}
          {step.split ? (
            <View style={lp.splitStage}>
              <View style={lp.splitWord}>
                <View style={[lp.splitBlock, { backgroundColor: C.tealSoft, borderColor: C.tealBorder }]}>
                  <Text style={[lp.splitText, { color: C.teal }]}>{step.split.root}</Text>
                </View>
                <View style={[lp.splitBlock, { backgroundColor: C.bg, borderColor: C.border }]}>
                  <Text style={[lp.splitText, { color: C.sub }]}>{step.split.suffix}</Text>
                </View>
              </View>
              <View style={lp.splitWord}>
                <Text style={[lp.splitLabel, { color: C.teal }]}>ROOT</Text>
                <Text style={[lp.splitLabel, { color: C.sub }]}>SUFFIX</Text>
              </View>
              <GlossaryText style={lp.caption} highlight={lit('split.note')}>
                {step.split.note}
              </GlossaryText>
            </View>
          ) : null}
          {step.rootTable ? (
            <View style={lp.rootTable}>
              {ROOT_TABLE.slice(0, 10).map((r) => (
                <View key={r.n} style={lp.rootRow}>
                  <Text style={lp.rootN}>{r.n}</Text>
                  <Text style={lp.rootWord}>{r.root}-</Text>
                  <Text style={lp.rootAlkane}>{r.alkane}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {step.periodic ? (
            <View style={lp.tableStage}>
              <PeriodicTable cell={Math.min(34, Math.floor((width - 90) / 8) - 3)} />
              {step.periodicNote ? (
                <GlossaryText style={lp.caption} highlight={lit('periodicNote')}>
                  {step.periodicNote}
                </GlossaryText>
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
  // The speaker sits beside the heading rather than above the paragraph, so
  // it does not push the first line of the lesson down the page.
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
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
  perfectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
    marginTop: 12,
    backgroundColor: '#FDF6E3',
    borderWidth: 1,
    borderColor: '#EBD9A8',
    borderRadius: R.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  perfectTxt: { fontSize: 13.5, fontWeight: '800', color: '#8A6A12' },
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
  splitStage: { alignItems: 'center', marginTop: 16, gap: 6 },
  splitWord: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  splitBlock: {
    borderWidth: 2,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    minWidth: 84,
    alignItems: 'center',
  },
  splitText: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  splitLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.8, minWidth: 84, textAlign: 'center' },
  rootTable: { marginTop: 16, borderTopWidth: 1, borderTopColor: C.border },
  rootRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  rootN: { width: 32, fontSize: 13.5, fontWeight: '800', color: C.navy },
  rootWord: { flex: 1, fontSize: 14.5, fontWeight: '800', color: C.teal },
  rootAlkane: { flex: 1.4, fontSize: 13.5, color: C.sub },
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
