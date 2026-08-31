// ─────────────────────────────────────────────────────────────
// Question renderers.
//
// Every question type shares one shell — category chip, prompt,
// optional subtitle, body, then a single Check answer button — so
// the presentation is identical whatever is being asked. Only the
// body changes between types.
//
// Marking is immediate and explanatory: the correct option is
// always shown, and the explanation appears whether the answer was
// right or wrong, because the explanation is the teaching.
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R, T } from '../../theme';
import { formatFormulas } from '../../chem/formula';
import { useViewport } from '../../components/DeviceFrame';
import { questionSizing, estimateHeight } from './questionSizing';
import { StaticMol } from '../../sandbox/render';
import { QuestionCanvas } from '../../sandbox/QuestionCanvas';
import { checkDrawing } from '../../chem/engineBridge';
import { tidy } from '../../sandbox/layout';
import { needsExplicitAtoms } from '../../content/questionFactory';
import { normalizeName } from '../../chem/questions';
import { ReactionCard } from '../../components/ReactionCard';
import { walkRoute, molOf } from '../../content/reactions';
import { CatalystMascot } from '../../components/mascot';
import { resampleNameParts } from '../../content/questionFactory';
import { tap } from '../../sandbox/haptics';
import { playCorrect, playIncorrect } from '../../sounds';

const NATIVE = Platform.OS !== 'web';

// The verdict slides up and fades in rather than appearing abruptly: the
// movement draws the eye down to the explanation, which is the part worth
// reading.

// ── Cat peeks out from behind the box you chose ──────────────
// After checking, the picked option (or the name field) grows a small Cat
// rising from behind its top edge: `correct` when the pick was right,
// `reassure` when it was not. The box stays in front — Cat is behind it,
// so only head and goggles show — and it rises once, on the native driver.
// It never appears on the boxes you did not choose: the reaction belongs to
// the decision, not to the screen.
function PeekMascot({ correct, right = 14 }) {
  const rise = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(rise, {
      toValue: 1,
      duration: 340,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVE,
    }).start();
  }, [rise]);
  return (
    <Animated.View
      pointerEvents="none"
      testID={correct ? 'peek-correct' : 'peek-reassure'}
      style={{
        position: 'absolute',
        right,
        top: -44,
        zIndex: 0,
        opacity: rise,
        transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [44, 0] }) }],
      }}
    >
      <CatalystMascot state={correct ? 'correct' : 'reassure'} size={64} loop={false} />
    </Animated.View>
  );
}

function Verdict({ correct, explain }) {
  const z = questionSizing(useViewport());
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVE,
    }).start();
  }, [anim]);
  return (
    <Animated.View
      style={[
        qs.verdict,
        { padding: z.verdictPad },
        correct ? qs.verdictOk : qs.verdictNo,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
        },
      ]}
    >
      <Ionicons
        name={correct ? 'checkmark-circle' : 'close-circle'}
        size={20}
        color={correct ? C.greenText : C.warn}
      />
      <View style={{ flex: 1 }}>
        <Text style={[T.body, { fontWeight: '800', color: correct ? C.greenText : C.navy }]}>
          {correct ? 'Correct' : 'Not quite'}
        </Text>
        <Text style={[T.sub, { marginTop: 3, color: C.navy, fontSize: z.verdictSize }]}>
          {formatFormulas(explain)}
        </Text>
      </View>
    </Animated.View>
  );
}

// ── Shell ────────────────────────────────────────────────────
// `scroll` must be FALSE for anything that measures its own height — the
// canvas does. A self-measuring child inside a scroll container whose height
// grows with its content is a feedback loop: the child measures the parent,
// renders that tall, the content grows, layout fires again. On web, where the
// scroll container has no bounded height of its own, it never settles and the
// canvas expands downwards forever.
// What went wrong in a typed name. The engine classifies drawings; a written
// answer has no structure to inspect, so this reads the two names against each
// other. It is deliberately conservative — anything it cannot place is 'other'
// rather than a guess, because a wrong label is worse than none.
export function classifyWritten(given, answer) {
  const g = String(given || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const a = String(answer || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!g) return 'other';
  const nums = (t) => (t.match(/\d+/g) || []).join(',');
  const stereo = (t) => (t.match(/\((?:\d*[ezrs],?)+\)/g) || []).join(',');
  // The descriptor must come out BEFORE comparing the words, or its letters
  // read as part of the name: "(2E)-but-2-ene" and "(2Z)-but-2-ene" differed
  // only by an E and a Z and were reported as a chain error.
  const words = (t) => t.replace(/\((?:\d*[ezrs],?)+\)/g, '').replace(/[\d,\-()]/g, '');

  // right name, wrong configuration
  if (words(g) === words(a) && nums(g) === nums(a) && stereo(g) !== stereo(a)) return 'stereo-descriptor';
  // right skeleton and groups, wrong numbers
  if (words(g) === words(a) && nums(g) !== nums(a)) return 'locant';
  // right numbers, wrong ending — a seniority or family mistake
  if (nums(g) === nums(a) && words(g) !== words(a)) {
    const ending = (t) => (t.match(/(oic acid|oate|amide|nitrile|amine|al|one|ol|ene|yne|ane)$/) || [''])[0];
    if (ending(g) !== ending(a)) return 'suffix-seniority';
    return 'chain-selection';
  }
  return 'other';
}

export function QuestionShell({
  q,
  children,
  canCheck,
  checked,
  correct,
  onCheck,
  onContinue,
  last,
  // Scrollable by default. The sizing system shrinks a question so it fits,
  // and with flexGrow the container looks identical when it does — but the
  // estimate is only an estimate, and being wrong must mean "a small scroll"
  // rather than "the last option is hidden behind the button". Only the
  // canvas opts out, because it measures its own container.
  scroll = true,
}) {
  const z = questionSizing(useViewport());
  const needsScroll = !!scroll;
  // A canvas question needs every pixel it can get, and its header was
  // saying the same thing three times: a chip reading "draw the molecule", a
  // prompt reading "Draw propane", and a subtitle reading "Build the complete
  // structure on the canvas". The chip and prompt sit on one row and the
  // subtitle goes, which returns about 90px to the drawing area.
  const tight = !scroll;
  const head = tight ? (
    <View style={qs.headTight}>
      <View style={[qs.chip, { paddingVertical: 3, marginRight: 10 }]}>
        <Text style={[qs.chipTxt, { fontSize: z.chipSize - 0.5 }]}>{q.chip}</Text>
      </View>
      <Text
        style={[qs.prompt, { fontSize: z.promptSize - 1, lineHeight: z.promptLine - 3, marginTop: 0, flex: 1 }]}
        numberOfLines={2}
      >
        {formatFormulas(q.prompt)}
      </Text>
    </View>
  ) : (
    <>
      <View style={[qs.chip, { paddingVertical: z.chipPadV }]}>
        <Text style={[qs.chipTxt, { fontSize: z.chipSize }]}>{q.chip}</Text>
      </View>
      <Text style={[qs.prompt, { fontSize: z.promptSize, lineHeight: z.promptLine, marginTop: z.gap }]}>
        {formatFormulas(q.prompt)}
      </Text>
      {q.subtitle ? (
        <Text style={[qs.subtitle, { fontSize: z.subtitleSize }]}>{formatFormulas(q.subtitle)}</Text>
      ) : null}
    </>
  );

  return (
    // minHeight: 0 is load-bearing. A flex child will not shrink below its
    // content height without it, so the scroll area grew past the screen and
    // the Check answer button was drawn on top of the last options.
    //
    // KeyboardAvoidingView is here for the typed-answer questions: the input
    // and the Check answer button sit at the bottom, which is exactly where
    // the keyboard opens. On iOS nothing moves on its own, so the view has to
    // be told to shrink. On Android the window resizes already, so applying
    // padding as well would lift the button a keyboard's height ABOVE the
    // keyboard — hence behavior: undefined rather than a second guess.
    <KeyboardAvoidingView
      style={{ flex: 1, minHeight: 0 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {needsScroll ? (
      <ScrollView
        style={{ flex: 1, minHeight: 0 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {head}
        <View style={{ flex: 1, marginTop: 14 }}>{children}</View>
      </ScrollView>
      ) : (
      <View style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {head}
        <View style={{ flex: 1, minHeight: 0, marginTop: z.gap }}>{children}</View>
      </View>
      )}

      {/* The verdict sits ABOVE the content rather than after it. Appending it
          to the flow pushed everything upward at the exact moment the learner
          wanted to look at what they had drawn — on a canvas question it
          shifted the drawing tools out from under their thumb. Floating it
          means nothing moves. */}
      {checked ? (
        <View style={qs.verdictLayer} pointerEvents="box-none">
          <Verdict correct={correct} explain={q.explain} />
        </View>
      ) : null}

      <Pressable
        onPress={checked ? onContinue : onCheck}
        disabled={!checked && !canCheck}
        style={[qs.cta, { minHeight: z.ctaMin }, !checked && !canCheck && { opacity: 0.45 }]}
      >
        <Text style={[qs.ctaTxt, { fontSize: z.ctaSize }]}>
          {checked ? (last ? 'Finish' : correct ? 'Continue' : 'Try it again later') : 'Check answer'}
        </Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

// ── Multiple choice, text options ────────────────────────────
export function ChoiceName({ q, onDone, last }) {
  const z = questionSizing(useViewport());
  const [picked, setPicked] = useState(null);
  const [checked, setChecked] = useState(false);
  const correct = picked === q.answer;

  return (
    <QuestionShell
      q={q}
      canCheck={picked !== null}
      checked={checked}
      correct={correct}
      last={last}
      onCheck={() => {
        setChecked(true);
        correct ? playCorrect() : playIncorrect();
      }}
      onContinue={() =>
        onDone(correct, {
          // A wrong option in a reactions question IS a named mistake — the
          // other regiochemistry, the reversed reagent, the confused type —
          // so the log records WHICH mistake, not just that one happened.
          errorClass: correct ? null : (q.errorClasses && q.errorClasses[picked]) || null,
        })
      }
    >
      {q.rxn ? (
        <View style={{ marginBottom: z.gap }}>
          <ReactionCard rxn={q.rxn} width={z.molWidth + 40} />
        </View>
      ) : null}
      {q.mol ? (
        <View style={[qs.stage, { minHeight: z.molHeight, marginBottom: z.gap }]}>
          <StaticMol
            mol={q.mol}
            width={z.molWidth}
            showCarbons={!!q.showCarbons}
            highlight={q.highlight ? new Set(q.highlight) : undefined}
          />
        </View>
      ) : null}
      <View style={{ gap: z.optionGap }}>
        {q.options.map((opt, i) => {
          const isAnswer = i === q.answer;
          const isPicked = i === picked;
          const state = !checked
            ? isPicked
              ? 'picked'
              : 'idle'
            : isAnswer
            ? 'right'
            : isPicked
            ? 'wrong'
            : 'idle';
          const row = (
            <Pressable
              disabled={checked}
              onPress={() => {
                tap();
                setPicked(i);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: isPicked }}
              accessibilityLabel={formatFormulas(String(opt))}
              style={[qs.row, { paddingVertical: z.optionPadV, minHeight: z.optionMin, zIndex: 1 }, qs[`row_${state}`]]}
            >
              <View style={[qs.letter, { width: z.letter, height: z.letter, borderRadius: z.letter / 2 }, qs[`letter_${state}`]]}>
                <Text style={[qs.letterTxt, (state === 'picked' || state === 'right') && { color: '#fff' }]}>
                  {String.fromCharCode(65 + i)}
                </Text>
              </View>
              <Text style={[T.body, { flex: 1, fontWeight: '600' }]}>{formatFormulas(opt)}</Text>
              {checked && isAnswer ? <Ionicons name="checkmark-circle" size={20} color={C.greenText} /> : null}
              {checked && isPicked && !isAnswer ? <Ionicons name="close-circle" size={20} color={C.warn} /> : null}
            </Pressable>
          );
          // The picked row hosts the peek; the wrapper must not clip it.
          return (
            <View key={i} style={{ overflow: 'visible' }}>
              {checked && isPicked ? <PeekMascot correct={isAnswer} /> : null}
              {row}
            </View>
          );
        })}
      </View>
    </QuestionShell>
  );
}

// ── Multiple choice, structure options ───────────────────────
export function ChoiceStructure({ q, onDone, last }) {
  const z = questionSizing(useViewport());
  const [picked, setPicked] = useState(null);
  const [checked, setChecked] = useState(false);
  const correct = picked === q.answer;

  return (
    <QuestionShell
      q={q}
      canCheck={picked !== null}
      checked={checked}
      correct={correct}
      last={last}
      onCheck={() => {
        setChecked(true);
        correct ? playCorrect() : playIncorrect();
      }}
      onContinue={() =>
        onDone(correct, {
          errorClass: correct ? null : (q.errorClasses && q.errorClasses[picked]) || null,
        })
      }
    >
      {q.rxn ? (
        <View style={{ marginBottom: z.gap }}>
          <ReactionCard rxn={q.rxn} width={z.molWidth + 40} />
        </View>
      ) : null}
      <View style={[qs.grid, { gap: z.optionGap }]}>
        {q.options.map((mol, i) => {
          const isAnswer = i === q.answer;
          const isPicked = i === picked;
          const on = !checked ? isPicked : isAnswer;
          const card = (
            <Pressable
              disabled={checked}
              onPress={() => {
                tap();
                setPicked(i);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: isPicked }}
              accessibilityLabel={`Structure ${String.fromCharCode(65 + i)}`}
              style={[qs.card, { minHeight: z.cardMin, zIndex: 1 }, on && qs.cardOn, checked && isPicked && !isAnswer && qs.cardWrong]}
            >
              <View style={qs.cardHead}>
                <Text style={qs.cardLetter}>{String.fromCharCode(65 + i)}</Text>
                {checked && isAnswer ? (
                  <Ionicons name="checkmark-circle" size={19} color={C.teal} />
                ) : isPicked ? (
                  <View style={qs.radioOn} />
                ) : (
                  <View style={qs.radio} />
                )}
              </View>
              <StaticMol mol={mol} width={z.cardMol} showCarbons={false} />
            </Pressable>
          );
          // The grid cell keeps the card's sizing; the peek rides behind it.
          return (
            <View key={i} style={[qs.gridCell, { overflow: 'visible' }]}>
              {checked && isPicked ? <PeekMascot correct={isAnswer} right={10} /> : null}
              {card}
            </View>
          );
        })}
      </View>
    </QuestionShell>
  );
}

// ── Type the name ────────────────────────────────────────────
export function WriteName({ q, onDone, last }) {
  const z = questionSizing(useViewport());
  const [text, setText] = useState('');
  const [checked, setChecked] = useState(false);
  const correct = normalizeName(text) === normalizeName(q.answer);

  return (
    <QuestionShell
      q={q}
      canCheck={!!text.trim()}
      checked={checked}
      correct={correct}
      last={last}
      onCheck={() => {
        setChecked(true);
        correct ? playCorrect() : playIncorrect();
      }}
      onContinue={() =>
        onDone(correct, {
          // `value` here was a variable that does not exist in this
          // component — the state is `text`. It only ever evaluated on the
          // wrong-answer branch, so the crash appeared exclusively when a
          // student got one wrong and pressed the button. Hermes reports an
          // undefined identifier as "Property 'value' doesn't exist", which
          // is what made it look like a missing field rather than a typo.
          errorClass: correct ? null : classifyWritten(text, q.answer),
        })
      }
    >
      {q.rxn ? (
        <View style={{ marginBottom: z.gap }}>
          <ReactionCard rxn={q.rxn} width={z.molWidth + 40} />
        </View>
      ) : q.mol ? (
        <View style={[qs.stage, { minHeight: z.molHeight, marginBottom: z.gap }]}>
          <StaticMol mol={q.mol} width={z.molWidth} showCarbons={!!q.showCarbons} />
        </View>
      ) : null}
      <Text style={qs.fieldLabel}>IUPAC name</Text>
      <View style={{ overflow: 'visible' }}>
      {checked ? <PeekMascot correct={correct} /> : null}
      <View style={[qs.inputWrap, { minHeight: z.inputMin, zIndex: 1 }, checked && (correct ? qs.inputOk : qs.inputNo)]}>
        <TextInput
          value={text}
          onChangeText={setText}
          editable={!checked}
          placeholder="type the name"
          placeholderTextColor={C.faint}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="IUPAC name"
          style={[qs.input, { fontSize: z.inputSize }]}
        />
        {text && !checked ? (
          <Pressable onPress={() => setText('')} hitSlop={10} accessibilityLabel="clear">
            <Ionicons name="close" size={18} color={C.sub} />
          </Pressable>
        ) : null}
      </View>
      </View>
      {q.hint && !checked ? (
        <View style={qs.hint}>
          <Ionicons name="information-circle-outline" size={16} color={C.teal} />
          <Text style={[T.tiny, { flex: 1, color: C.navy }]}>{formatFormulas(q.hint)}</Text>
        </View>
      ) : null}
      {checked && !correct ? (
        <Text style={[T.body, { marginTop: 10, fontWeight: '700' }]}>
          The answer is {formatFormulas(String(q.answer))}.
        </Text>
      ) : null}
    </QuestionShell>
  );
}

// ── Numeric keypad ───────────────────────────────────────────
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0', 'clear'];

export function NumberEntry({ q, onDone, last }) {
  const z = questionSizing(useViewport());
  const [value, setValue] = useState('');
  const [checked, setChecked] = useState(false);
  const correct = Number(value) === q.answer;

  const press = (k) => {
    if (checked) return;
    tap();
    if (k === 'back') setValue((v) => v.slice(0, -1));
    else if (k === 'clear') setValue('');
    else setValue((v) => (v.length < 3 ? v + k : v));
  };

  return (
    <QuestionShell
      q={q}
      canCheck={value !== ''}
      checked={checked}
      correct={correct}
      last={last}
      onCheck={() => {
        setChecked(true);
        correct ? playCorrect() : playIncorrect();
      }}
      onContinue={() => onDone(correct)}
    >
      {q.mol ? (
        <View style={[qs.stageSmall, { marginBottom: z.gap }]}>
          <StaticMol mol={q.mol} width={Math.min(z.molWidth, 210)} showCarbons={!!q.showCarbons} />
        </View>
      ) : null}
      <View style={[qs.readout, checked && (correct ? qs.inputOk : qs.inputNo)]}>
        <Text style={[qs.readoutTxt, { fontSize: z.readoutSize }]}>{value || '—'}</Text>
      </View>
      <Text style={qs.unit}>{formatFormulas(q.unit)}</Text>
      <View style={qs.pad}>
        {KEYS.map((k) => (
          <Pressable
            key={k}
            onPress={() => press(k)}
            style={[qs.key, { minHeight: z.keyMin }]}
            accessibilityLabel={k === 'back' ? 'backspace' : k === 'clear' ? 'clear' : k}
          >
            {k === 'back' ? (
              <Ionicons name="backspace-outline" size={20} color={C.teal} />
            ) : k === 'clear' ? (
              <Text style={qs.keyTxt}>C</Text>
            ) : (
              <Text style={[qs.keyTxt, { fontSize: z.keySize }]}>{k}</Text>
            )}
          </Pressable>
        ))}
      </View>
      {checked && !correct ? (
        <Text style={[T.body, { textAlign: 'center', marginTop: 8, fontWeight: '700' }]}>
          The answer is {formatFormulas(String(q.answer))}.
        </Text>
      ) : null}
    </QuestionShell>
  );
}

// ── Draw on the canvas ───────────────────────────────────────
export function DrawAnswer({ q, onDone, last, width }) {
  const [graph, setGraph] = useState({ atoms: [], bonds: [] });
  const [checked, setChecked] = useState(false);
  const [result, setResult] = useState(null);

  const canvasRef = useRef(null);
  const check = () => {
    // Tidy on submit: the answer is judged on connectivity, so a neat
    // structure costs nothing and makes the feedback legible. tidy keeps its
    // result only when the molecule still names the same, so this cannot
    // change a right answer into a wrong one.
    const tidied = graph.atoms.length > 1 ? tidy(graph) : graph;
    setGraph(tidied);
    // Centre it too. The learner drew wherever there was room, which is
    // usually off to one side; once the answer is being read rather than
    // built, it should sit in the middle of the canvas under the verdict.
    if (canvasRef.current && canvasRef.current.fit) {
      requestAnimationFrame(() => canvasRef.current && canvasRef.current.fit());
    }
    const res = checkDrawing(tidied, q.name, { stereo: false });
    setResult(res);
    setChecked(true);
    res.correct ? playCorrect() : playIncorrect();
  };

  const banner =
    checked && result && !result.correct
      ? { kind: 'error', title: result.issue.title, message: result.issue.message, onDismiss: null }
      : null;

  return (
    <QuestionShell
      q={q}
      scroll={false}
      canCheck={graph.atoms.length > 0}
      checked={checked}
      correct={!!(result && result.correct)}
      last={last}
      onCheck={check}
      onContinue={() =>
        onDone(!!(result && result.correct), {
          // the engine already classified the fault; carry it through rather
          // than discarding it at this boundary
          errorClass: result && result.issue ? result.issue.errorClass : null,
        })
      }
    >
      <QuestionCanvas
        ref={canvasRef}
        graph={graph}
        setGraph={(g) => {
          setGraph(g);
          setChecked(false);
          setResult(null);
        }}
        width={width - 40}
        banner={banner}
      />
    </QuestionShell>
  );
}

// ── Tap every carbon ─────────────────────────────────────────
export function TapCarbons({ q, onDone, last, width }) {
  const z = questionSizing(useViewport());
  const [found, setFound] = useState(() => new Set());
  const carbons = useMemo(
    () => q.mol.atoms.filter((a) => !a.el || a.el === 'C').map((a) => a.id),
    [q.mol]
  );
  const done = found.size >= carbons.length;

  return (
    <QuestionShell
      q={q}
      canCheck={done}
      checked={done}
      correct
      last={last}
      onCheck={() => {}}
      onContinue={() => onDone(true)}
    >
      <View style={qs.stage}>
        <StaticMol
          mol={q.mol}
          width={Math.min(z.molWidth, width - 90)}
          showCarbons={false}
          highlight={found}
          onPickAtom={(id) => {
            if (!carbons.includes(id) || found.has(id)) return;
            const next = new Set(found);
            next.add(id);
            next.size >= carbons.length ? playCorrect() : tap();
            setFound(next);
          }}
        />
      </View>
      <View style={qs.pips}>
        {carbons.map((_, i) => (
          <View key={i} style={[qs.pip, i < found.size && qs.pipOn]} />
        ))}
      </View>
      <Text style={qs.counter}>
        {found.size} of {carbons.length} carbons found
      </Text>
    </QuestionShell>
  );
}


// ── Compare two names ────────────────────────────────────────
export function CompareNames({ q, onDone, last }) {
  const z = questionSizing(useViewport());
  const [picked, setPicked] = useState(null);
  const [checked, setChecked] = useState(false);
  const correct = picked === q.answer;
  const CHOICES = ['Yes, same compound', 'No, different compounds'];

  return (
    <QuestionShell
      q={q}
      canCheck={picked !== null}
      checked={checked}
      correct={correct}
      last={last}
      onCheck={() => {
        setChecked(true);
        correct ? playCorrect() : playIncorrect();
      }}
      onContinue={() => onDone(correct)}
    >
      <View style={[qs.nameCard, { minHeight: z.nameCardH }]}>
        <Text style={qs.bigName}>{q.nameA}</Text>
        <View style={qs.badge}>
          <Text style={qs.badgeTxt}>{q.labelA}</Text>
        </View>
      </View>
      <View style={qs.linker}>
        <Ionicons name="swap-vertical" size={16} color={C.teal} />
      </View>
      <View style={[qs.nameCard, { minHeight: z.nameCardH }]}>
        <Text style={qs.bigName}>{q.nameB}</Text>
        <View style={[qs.badge, { backgroundColor: C.bg }]}>
          <Text style={[qs.badgeTxt, { color: C.sub }]}>{q.labelB}</Text>
        </View>
      </View>
      {q.mol ? (
        <View style={[qs.stage, { marginTop: 12, minHeight: 90 }]}>
          <StaticMol mol={q.mol} width={Math.min(z.molWidth, 240)} showCarbons={false} />
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
        {CHOICES.map((label, i) => {
          const on = !checked ? picked === i : i === q.answer;
          return (
            <Pressable
              key={i}
              disabled={checked}
              onPress={() => {
                tap();
                setPicked(i);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: picked === i }}
              style={[qs.compareBtn, on && qs.compareOn, checked && picked === i && i !== q.answer && qs.compareWrong]}
            >
              {on && checked ? <Ionicons name="checkmark-circle" size={18} color={C.teal} /> : null}
              <Text style={[T.body, { fontWeight: '700', textAlign: 'center' }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </QuestionShell>
  );
}

// ── Build the name from its parts ────────────────────────────
export function BuildName({ q, onDone, last }) {
  const z = questionSizing(useViewport());
  // The distractor tiles are regenerated per attempt rather than fixed when
  // the question was authored. With a fixed set a learner who meets the same
  // question twice recognises the tile layout instead of reading it, and the
  // second attempt tests memory of the arrangement rather than the naming.
  const options = useMemo(
    () => resampleNameParts(q, Math.floor(Math.random() * 100000)),
    [q.id]
  );
  const [built, setBuilt] = useState([]);
  const [checked, setChecked] = useState(false);
  const assembled = built.join('');
  const correct = normalizeName(assembled) === normalizeName(q.answer);

  const used = (i) => built.includes(i);

  return (
    <QuestionShell
      q={q}
      canCheck={built.length > 0}
      checked={checked}
      correct={correct}
      last={last}
      onCheck={() => {
        setChecked(true);
        correct ? playCorrect() : playIncorrect();
      }}
      onContinue={() => onDone(correct)}
    >
      {q.mol ? (
        <View style={[qs.stage, { minHeight: 100 }]}>
          <StaticMol mol={q.mol} width={Math.min(z.molWidth, 250)} showCarbons={false} />
        </View>
      ) : null}

      <View style={qs.buildRow}>
        {built.length ? (
          built.map((part, i) => (
            <Pressable
              key={`${part}-${i}`}
              disabled={checked}
              onPress={() => setBuilt((b) => b.filter((_, k) => k !== i))}
              style={qs.builtChip}
              accessibilityLabel={`remove ${part}`}
            >
              <Text style={qs.builtTxt}>{part}</Text>
            </Pressable>
          ))
        ) : (
          <Text style={[T.sub, { paddingVertical: 8 }]}>Tap parts below to build the name</Text>
        )}
      </View>
      <Text style={qs.assembled}>{assembled || '—'}</Text>

      <Text style={[qs.fieldLabel, { marginTop: 14 }]}>Available parts</Text>
      <View style={qs.partsRow}>
        {options.map((part, i) => (
          <Pressable
            key={`${part}-${i}`}
            disabled={checked || used(part)}
            onPress={() => {
              tap();
              setBuilt((b) => [...b, part]);
            }}
            style={[qs.partChip, { minHeight: z.optionMin }, used(part) && { opacity: 0.35 }]}
            accessibilityLabel={`add ${part}`}
          >
            <Text style={qs.partTxt}>{part}</Text>
          </Pressable>
        ))}
        <Pressable onPress={() => setBuilt([])} disabled={checked} style={qs.resetChip} accessibilityLabel="reset">
          <Ionicons name="refresh" size={16} color={C.teal} />
        </Pressable>
      </View>
    </QuestionShell>
  );
}

// ── Router ───────────────────────────────────────────────────

// ── Build the pathway ────────────────────────────────────────
// The capstone question: start material at the top, target at the bottom,
// empty slots between, and a shelf of reagent tiles. Tapping a tile drops it
// into the next empty slot; tapping a filled slot lifts it back out.
//
// Every placed step derives its intermediate LIVE, through the same
// walkRoute() the test suite uses — so a wrong step is visible as a red "no
// reaction" the moment it lands, before checking, and what the student sees
// is by construction what the suite verified.
function PathwayQuestion({ q, onDone, last }) {
  const z = questionSizing(useViewport());
  const [slots, setSlots] = useState(Array(q.steps).fill(null));
  const [checked, setChecked] = useState(false);

  const walk = walkRoute(q.from, slots);
  const reached = walk.complete && walk.mols[walk.mols.length - 1] === q.to;
  const filled = slots.every((t) => t !== null);

  const place = (tile) => {
    if (checked) return;
    const at = slots.indexOf(null);
    if (at === -1) return;
    const next = [...slots];
    next[at] = tile;
    setSlots(next);
  };
  const lift = (i) => {
    if (checked) return;
    const next = [...slots];
    next[i] = null;
    setSlots(next);
  };

  const used = new Set(slots.filter(Boolean));
  const molW = Math.min(z.molWidth * 0.62, 210);

  return (
    <QuestionShell
      q={q}
      canCheck={filled}
      checked={checked}
      correct={reached}
      last={last}
      onCheck={() => {
        setChecked(true);
        reached ? playCorrect() : playIncorrect();
      }}
      onContinue={() =>
        onDone(reached, {
          // dead-end: a placed step with no reaction at all. wrong-order:
          // every step is a real reaction, but the chain lands somewhere
          // other than the target — right pieces, wrong sequence.
          errorClass: reached ? null : walk.brokeAt != null ? 'dead-end' : 'wrong-order',
        })
      }
    >
      <View style={pw.col}>
        <View style={pw.station}>
          <Text style={pw.label}>start</Text>
          <StaticMol mol={molOf(q.from)} width={molW} showCarbons={false} />
          <Text style={pw.molName}>{formatFormulas(q.from)}</Text>
        </View>

        {slots.map((tile, i) => {
          const legal = walk.brokeAt == null || i < walk.brokeAt;
          const derived = tile && legal && walk.mols[i + 1];
          return (
            <View key={i} style={pw.stepBlock}>
              <View style={pw.rail} />
              <Pressable
                onPress={() => lift(i)}
                style={[
                  pw.slot,
                  tile && (walk.brokeAt === i ? pw.slotBad : pw.slotFilled),
                ]}
              >
                <Text
                  style={[
                    pw.slotTxt,
                    tile && (walk.brokeAt === i ? pw.slotTxtBad : pw.slotTxtFilled),
                  ]}
                >
                  {tile ? formatFormulas(tile) : `step ${i + 1}`}
                </Text>
              </Pressable>
              {tile && walk.brokeAt === i ? (
                <Text style={pw.noRxn}>no reaction — tap to remove</Text>
              ) : null}
              {derived && derived !== q.to ? (
                <View style={pw.derived}>
                  <StaticMol mol={molOf(derived)} width={molW * 0.85} showCarbons={false} />
                  <Text style={pw.molName}>{formatFormulas(derived)}</Text>
                </View>
              ) : null}
              {derived === q.to && i < q.steps - 1 ? (
                <Text style={pw.noRxn}>already at the target — a step too early</Text>
              ) : null}
            </View>
          );
        })}

        <View style={pw.rail} />
        <View style={[pw.station, pw.target]}>
          <Text style={[pw.label, { color: C.teal }]}>target</Text>
          <StaticMol mol={molOf(q.to)} width={molW} showCarbons={false} />
          <Text style={pw.molName}>{formatFormulas(q.to)}</Text>
        </View>

        <View style={pw.shelf}>
          {q.tiles.map((tile) => (
            <Pressable
              key={tile}
              onPress={() => place(tile)}
              disabled={used.has(tile)}
              style={[pw.tile, used.has(tile) && pw.tileUsed]}
            >
              <Text style={[pw.tileTxt, used.has(tile) && pw.tileTxtUsed]}>
                {formatFormulas(tile)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </QuestionShell>
  );
}

const pw = StyleSheet.create({
  col: { alignItems: 'center', gap: 2 },
  station: { alignItems: 'center', gap: 2 },
  target: {
    borderWidth: 1.5,
    borderColor: C.tealBorder,
    backgroundColor: C.tealSoft,
    borderRadius: R.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  label: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, color: C.faint, textTransform: 'uppercase' },
  molName: { fontSize: 11.5, color: C.sub, fontWeight: '600' },
  rail: { width: 2, height: 14, backgroundColor: C.border, borderRadius: 1 },
  stepBlock: { alignItems: 'center', gap: 2 },
  slot: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: C.border,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 7,
    minWidth: 130,
    alignItems: 'center',
  },
  slotFilled: { borderStyle: 'solid', borderColor: C.teal, backgroundColor: C.tealSoft },
  slotBad: { borderStyle: 'solid', borderColor: C.danger, backgroundColor: '#FDECEC' },
  slotTxt: { fontSize: 12.5, fontWeight: '700', color: C.faint },
  slotTxtFilled: { color: C.teal },
  slotTxtBad: { color: C.danger },
  noRxn: { fontSize: 11, color: C.danger, fontWeight: '600' },
  derived: { alignItems: 'center', gap: 1, paddingVertical: 2 },
  shelf: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
    alignSelf: 'stretch',
  },
  tile: {
    borderWidth: 1.5,
    borderColor: C.tealBorder,
    backgroundColor: C.card,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  tileUsed: { borderColor: C.border, backgroundColor: C.bg },
  tileTxt: { fontSize: 12.5, fontWeight: '700', color: C.teal },
  tileTxtUsed: { color: C.faint },
});

export function QuestionView({ q, onDone, last, width }) {
  if (q.type === 'mcStructure') return <ChoiceStructure q={q} onDone={onDone} last={last} />;
  if (q.type === 'pathway') return <PathwayQuestion q={q} onDone={onDone} last={last} />;
  if (q.type === 'write') return <WriteName q={q} onDone={onDone} last={last} />;
  if (q.type === 'number') return <NumberEntry q={q} onDone={onDone} last={last} />;
  if (q.type === 'draw') return <DrawAnswer q={q} onDone={onDone} last={last} width={width} />;
  if (q.type === 'countTap') return <TapCarbons q={q} onDone={onDone} last={last} width={width} />;
  if (q.type === 'compareNames') return <CompareNames q={q} onDone={onDone} last={last} />;
  if (q.type === 'buildName') return <BuildName q={q} onDone={onDone} last={last} />;
  return <ChoiceName q={q} onDone={onDone} last={last} />;
}

const qs = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    backgroundColor: C.tealSoft,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipTxt: { fontSize: 11, fontWeight: '800', color: C.teal, letterSpacing: 0.6 },
  prompt: { fontSize: 21, fontWeight: '800', color: C.navy, marginTop: 12, lineHeight: 28 },
  subtitle: { fontSize: 14, color: C.sub, marginTop: 6 },
  headTight: { flexDirection: 'row', alignItems: 'center', paddingBottom: 2 },
  stage: { alignItems: 'center', justifyContent: 'center', marginBottom: 16, minHeight: 120 },
  stageSmall: { alignItems: 'center', marginBottom: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.card,
    borderRadius: R.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 56,
  },
  row_picked: { borderColor: C.teal, backgroundColor: C.tealSoft },
  row_right: { borderColor: C.green, backgroundColor: C.greenSoft },
  row_wrong: { borderColor: C.warn, backgroundColor: '#FDF3E7' },
  letter: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter_picked: { backgroundColor: C.teal, borderColor: C.teal },
  letter_right: { backgroundColor: C.green, borderColor: C.green },
  letterTxt: { fontSize: 13, fontWeight: '800', color: C.navy },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridCell: { width: '48%' },
  card: {
    
    minHeight: 150,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.card,
    borderRadius: R.lg,
    padding: 10,
    alignItems: 'center',
  },
  cardOn: { borderColor: C.teal, borderWidth: 2 },
  cardWrong: { borderColor: C.warn },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  cardLetter: { fontSize: 15, fontWeight: '800', color: C.navy },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: C.border },
  radioOn: { width: 18, height: 18, borderRadius: 9, borderWidth: 6, borderColor: C.teal },
  fieldLabel: { fontSize: 12.5, color: C.sub, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: C.teal,
    backgroundColor: C.card,
    borderRadius: R.md,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  inputOk: { borderColor: C.green, backgroundColor: C.greenSoft },
  inputNo: { borderColor: C.warn, backgroundColor: '#FDF3E7' },
  input: { flex: 1, paddingVertical: 13, fontSize: 17, color: C.navy },
  hint: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: C.bg,
    borderRadius: R.sm,
    padding: 11,
    marginTop: 10,
  },
  readout: {
    alignSelf: 'center',
    minWidth: 150,
    borderWidth: 1.5,
    borderColor: C.teal,
    borderRadius: R.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  readoutTxt: { fontSize: 30, fontWeight: '800', color: C.teal },
  unit: { fontSize: 12.5, color: C.sub, textAlign: 'center', marginTop: 6, marginBottom: 12 },
  pad: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  key: {
    width: '30%',
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: R.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.card,
  },
  keyTxt: { fontSize: 21, fontWeight: '700', color: C.navy },
  pips: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginTop: 4 },
  pip: { width: 13, height: 13, borderRadius: 7, borderWidth: 2, borderColor: C.border },
  pipOn: { backgroundColor: C.teal, borderColor: C.teal },
  counter: { fontSize: 13, fontWeight: '700', color: C.navy, textAlign: 'center', marginTop: 8 },
  nameCard: {
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: R.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  bigName: { fontSize: 20, fontWeight: '800', color: C.navy, textAlign: 'center' },
  badge: {
    marginTop: 8,
    backgroundColor: C.tealSoft,
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  badgeTxt: { fontSize: 11.5, fontWeight: '700', color: C.teal },
  linker: { alignItems: 'center', paddingVertical: 6 },
  compareBtn: {
    flex: 1,
    minHeight: 62,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.card,
    borderRadius: R.md,
    padding: 12,
  },
  compareOn: { borderColor: C.teal, backgroundColor: C.tealSoft },
  compareWrong: { borderColor: C.warn, backgroundColor: '#FDF3E7' },
  buildRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    minHeight: 54,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: C.tealBorder,
    borderRadius: R.md,
    backgroundColor: C.tealSoft,
    padding: 10,
  },
  builtChip: {
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: C.teal,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  builtTxt: { fontSize: 15, fontWeight: '700', color: C.teal },
  assembled: { fontSize: 19, fontWeight: '800', color: C.navy, textAlign: 'center', marginTop: 10 },
  partsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  partChip: {
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.card,
    borderRadius: 9,
    paddingHorizontal: 14,
    paddingVertical: 11,
    minHeight: 44,
    justifyContent: 'center',
  },
  partTxt: { fontSize: 15, fontWeight: '700', color: C.navy },
  resetChip: {
    borderWidth: 1.5,
    borderColor: C.tealBorder,
    borderRadius: 9,
    paddingHorizontal: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  // Anchored just above the call to action, across the full width, with a
  // shadow so it reads as sitting on top of the question rather than in it.
  verdictLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 66,
    paddingHorizontal: 2,
  },
  verdict: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    borderRadius: R.md,
    borderWidth: 1,
    padding: 13,
    shadowColor: '#0B2436',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  verdictOk: { backgroundColor: '#EEF8E4', borderColor: '#CDE9B9' },
  verdictNo: { backgroundColor: '#FEF6EC', borderColor: '#F3D5B3' },
  cta: {
    backgroundColor: C.teal,
    borderRadius: R.md,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 4,
    flexShrink: 0,
  },
  ctaTxt: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
