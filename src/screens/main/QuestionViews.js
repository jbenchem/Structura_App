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
import { View, Text, Pressable, ScrollView, TextInput, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R, T } from '../../theme';
import { formatFormulas } from '../../chem/formula';
import { useViewport } from '../../components/DeviceFrame';
import { questionSizing, estimateHeight } from './questionSizing';
import { StaticMol } from '../../sandbox/render';
import { QuestionCanvas } from '../../sandbox/QuestionCanvas';
import { checkDrawing } from '../../chem/engineBridge';
import { tidy } from '../../sandbox/layout';
import { normalizeName } from '../../chem/questions';
import { tap } from '../../sandbox/haptics';
import { playCorrect, playIncorrect } from '../../sounds';

const NATIVE = Platform.OS !== 'web';

// The verdict slides up and fades in rather than appearing abruptly: the
// movement draws the eye down to the explanation, which is the part worth
// reading.
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
  const head = (
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
    <View style={{ flex: 1, minHeight: 0 }}>
      {needsScroll ? (
      <ScrollView
        style={{ flex: 1, minHeight: 0 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {head}
        <View style={{ flex: 1, marginTop: 14 }}>{children}</View>

        {checked ? <Verdict correct={correct} explain={q.explain} /> : null}
      </ScrollView>
      ) : (
      <View style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {head}
        <View style={{ flex: 1, minHeight: 0, marginTop: z.gap }}>{children}</View>
        {checked ? <Verdict correct={correct} explain={q.explain} /> : null}
      </View>
      )}

      <Pressable
        onPress={checked ? onContinue : onCheck}
        disabled={!checked && !canCheck}
        style={[qs.cta, { minHeight: z.ctaMin }, !checked && !canCheck && { opacity: 0.45 }]}
      >
        <Text style={[qs.ctaTxt, { fontSize: z.ctaSize }]}>
          {checked ? (last ? 'Finish' : correct ? 'Continue' : 'Try it again later') : 'Check answer'}
        </Text>
      </Pressable>
    </View>
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
      onContinue={() => onDone(correct)}
    >
      {q.mol ? (
        <View style={[qs.stage, { minHeight: z.molHeight, marginBottom: z.gap }]}>
          <StaticMol mol={q.mol} width={z.molWidth} showCarbons={!!q.showCarbons} />
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
          return (
            <Pressable
              key={i}
              disabled={checked}
              onPress={() => {
                tap();
                setPicked(i);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: isPicked }}
              accessibilityLabel={formatFormulas(String(opt))}
              style={[qs.row, { paddingVertical: z.optionPadV, minHeight: z.optionMin }, qs[`row_${state}`]]}
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
      onContinue={() => onDone(correct)}
    >
      <View style={[qs.grid, { gap: z.optionGap }]}>
        {q.options.map((mol, i) => {
          const isAnswer = i === q.answer;
          const isPicked = i === picked;
          const on = !checked ? isPicked : isAnswer;
          return (
            <Pressable
              key={i}
              disabled={checked}
              onPress={() => {
                tap();
                setPicked(i);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: isPicked }}
              accessibilityLabel={`Structure ${String.fromCharCode(65 + i)}`}
              style={[qs.card, { minHeight: z.cardMin }, on && qs.cardOn, checked && isPicked && !isAnswer && qs.cardWrong]}
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
      onContinue={() => onDone(correct)}
    >
      {q.mol ? (
        <View style={[qs.stage, { minHeight: z.molHeight, marginBottom: z.gap }]}>
          <StaticMol mol={q.mol} width={z.molWidth} showCarbons={!!q.showCarbons} />
        </View>
      ) : null}
      <Text style={qs.fieldLabel}>IUPAC name</Text>
      <View style={[qs.inputWrap, { minHeight: z.inputMin }, checked && (correct ? qs.inputOk : qs.inputNo)]}>
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

  const check = () => {
    // Tidy on submit: the answer is judged on connectivity, so a neat
    // structure costs nothing and makes the feedback legible. tidy keeps its
    // result only when the molecule still names the same, so this cannot
    // change a right answer into a wrong one.
    const tidied = graph.atoms.length > 1 ? tidy(graph) : graph;
    setGraph(tidied);
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
      onContinue={() => onDone(!!(result && result.correct))}
    >
      <QuestionCanvas
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
        {q.options.map((part, i) => (
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
export function QuestionView({ q, onDone, last, width }) {
  if (q.type === 'mcStructure') return <ChoiceStructure q={q} onDone={onDone} last={last} />;
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
  card: {
    width: '48%',
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
  verdict: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    borderRadius: R.md,
    borderWidth: 1,
    padding: 13,
    marginTop: 14,
  },
  verdictOk: { backgroundColor: C.greenSoft, borderColor: '#CDE9B9' },
  verdictNo: { backgroundColor: '#FDF3E7', borderColor: '#F3D5B3' },
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
