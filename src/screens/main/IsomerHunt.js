// ─────────────────────────────────────────────────────────────
// The isomer hunt.
//
// "Draw all five isomers of C6H14" is a standard exam question that a student
// cannot mark for themselves — five drawings, and no way to know whether two
// of them are the same compound. Here the engine names each drawing as it is
// submitted, so a duplicate is caught the moment it is drawn and the learner
// is told WHY it is a duplicate: it has the same name.
//
// That feedback is the feature. A tick would teach nothing; "that is
// 2-methylpentane again, which you already have" teaches the thing the
// exercise is for.
// ─────────────────────────────────────────────────────────────

import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R, T } from '../../theme';
import { QuestionCanvas } from '../../sandbox/QuestionCanvas';
import { StaticMol } from '../../sandbox/render';
import { formatFormulas } from '../../chem/formula';
import { enumerateAlkanes, identifyIsomer } from '../../chem/isomers';
import { useViewport } from '../../components/DeviceFrame';
import { good, nope, tap } from '../../sandbox/haptics';

const EMPTY = { atoms: [], bonds: [] };

export function IsomerHunt({ step, onContinue }) {
  const n = step.carbons || 5;
  const { width } = useViewport();
  const all = useMemo(() => enumerateAlkanes(n), [n]);
  const target = all.size;

  const [graph, setGraph] = useState(EMPTY);
  const [found, setFound] = useState([]);          // names, in the order found
  const [verdict, setVerdict] = useState(null);    // last submission
  const [gaveUp, setGaveUp] = useState(false);

  const done = found.length >= target;

  const submit = () => {
    if (!graph.atoms.length) return;
    const r = identifyIsomer(graph, n, found);
    if (r.ok && !r.already) {
      good();
      setFound((f) => [...f, r.name]);
      setVerdict({ kind: 'new', name: r.name });
      setGraph(EMPTY);
    } else if (r.ok && r.already) {
      nope();
      setVerdict({ kind: 'dup', name: r.name });
    } else {
      nope();
      setVerdict({ kind: 'bad', reason: r.reason, carbons: r.carbons, name: r.name });
    }
  };

  const message = () => {
    if (!verdict) return `Draw a ${n}-carbon skeleton and submit it. Every bond is single, and you never draw the hydrogens.`;
    if (verdict.kind === 'new') return `${verdict.name} — that is a new one.`;
    if (verdict.kind === 'dup')
      return `That is ${verdict.name} again. It looks different on the page, but trace the carbons and it is the same molecule — same name, same compound.`;
    if (verdict.reason === 'wrong-size')
      return `That has ${verdict.carbons} carbons, not ${n}. An isomer must have exactly the same formula.`;
    if (verdict.reason === 'not-saturated')
      return 'That has a double or triple bond. An alkane isomer has single bonds only.';
    if (verdict.reason === 'not-hydrocarbon')
      return 'That contains something other than carbon and hydrogen, so it is not an isomer of an alkane.';
    return 'That structure could not be read. Check every carbon has four bonds.';
  };

  const missing = useMemo(
    () => [...all.keys()].filter((k) => !found.includes(k)),
    [all, found]
  );

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={ih.card}>
          <Text style={T.h2}>{step.title || `Find every isomer of C${n}H${2 * n + 2}`}</Text>
          <Text style={ih.body}>
            {formatFormulas(
              step.body ||
                `There are ${target} different compounds with the formula C${n}H${2 * n + 2}. Draw them one at a time.\n\nIf you draw the same one twice the app will tell you — which is the hard part of this question, and the part you cannot check on paper.`
            )}
          </Text>

          <View style={ih.progressRow}>
            {Array.from({ length: target }).map((_, i) => (
              <View key={i} style={[ih.pip, i < found.length && ih.pipOn]} />
            ))}
            <Text style={ih.progressTxt}>
              {found.length} of {target}
            </Text>
          </View>

          {!done ? (
            <>
              <View style={ih.canvasWrap}>
                <QuestionCanvas
                  graph={graph}
                  setGraph={(g) => {
                    setGraph(g);
                    setVerdict(null);
                  }}
                  width={width - 72}
                  emptyHint={`Draw a ${n}-carbon skeleton`}
                />
              </View>

              <Pressable
                onPress={submit}
                disabled={!graph.atoms.length}
                style={[ih.submit, !graph.atoms.length && { opacity: 0.5 }]}
              >
                <Text style={ih.submitTxt}>Submit this one</Text>
              </Pressable>
            </>
          ) : null}

          <View
            style={[
              ih.note,
              verdict && verdict.kind === 'new' && ih.noteGood,
              verdict && verdict.kind === 'dup' && ih.noteWarn,
              verdict && verdict.kind === 'bad' && ih.noteBad,
            ]}
          >
            <Ionicons
              name={
                !verdict ? 'create-outline'
                : verdict.kind === 'new' ? 'checkmark-circle-outline'
                : verdict.kind === 'dup' ? 'copy-outline'
                : 'alert-circle-outline'
              }
              size={17}
              color={
                !verdict ? C.teal
                : verdict.kind === 'new' ? C.greenText
                : verdict.kind === 'dup' ? '#8A6A12'
                : C.danger
              }
            />
            <Text style={ih.noteTxt}>{formatFormulas(message())}</Text>
          </View>

          {found.length ? (
            <>
              <Text style={ih.label}>FOUND SO FAR</Text>
              <View style={ih.foundWrap}>
                {found.map((name) => (
                  <View key={name} style={ih.foundCard}>
                    <StaticMol mol={all.get(name)} width={110} showCarbons={false} />
                    <Text style={ih.foundName}>{formatFormulas(name)}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {done ? (
            <View style={[ih.note, ih.noteGood]}>
              <Ionicons name="trophy-outline" size={17} color={C.greenText} />
              <Text style={ih.noteTxt}>
                All {target}. On paper the risk is drawing the same one twice without noticing — the
                names are what tell them apart.
              </Text>
            </View>
          ) : gaveUp ? (
            <>
              <Text style={ih.label}>THE ONES YOU HAVE NOT FOUND</Text>
              <View style={ih.foundWrap}>
                {missing.map((name) => (
                  <View key={name} style={[ih.foundCard, ih.foundCardMissed]}>
                    <StaticMol mol={all.get(name)} width={110} showCarbons={false} />
                    <Text style={ih.foundName}>{formatFormulas(name)}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <Pressable onPress={() => { tap(); setGaveUp(true); }} style={ih.giveUp}>
              <Text style={ih.giveUpTxt}>Show me the ones I am missing</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      <Pressable
        onPress={onContinue}
        disabled={!done && !gaveUp}
        style={[ih.continue, !done && !gaveUp && { opacity: 0.55 }]}
      >
        <Text style={ih.continueTxt}>
          {done ? 'Continue' : gaveUp ? 'Continue' : `${target - found.length} to go`}
        </Text>
      </Pressable>
    </View>
  );
}

const ih = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 12,
  },
  body: { fontSize: 15, color: C.sub, lineHeight: 22, marginTop: 8 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  pip: { width: 26, height: 6, borderRadius: 3, backgroundColor: C.border },
  pipOn: { backgroundColor: C.teal },
  progressTxt: { fontSize: 12.5, fontWeight: '700', color: C.sub, marginLeft: 6 },
  canvasWrap: { marginTop: 14, borderRadius: R.md, overflow: 'hidden' },
  submit: {
    backgroundColor: C.teal,
    borderRadius: R.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  submitTxt: { color: '#fff', fontSize: 15.5, fontWeight: '800' },
  note: {
    flexDirection: 'row',
    gap: 9,
    alignItems: 'flex-start',
    backgroundColor: C.tealSoft,
    borderRadius: R.md,
    padding: 12,
    marginTop: 12,
  },
  noteGood: { backgroundColor: C.greenSoft, borderWidth: 1, borderColor: C.green },
  noteWarn: { backgroundColor: '#FDF6E3', borderWidth: 1, borderColor: '#EBD9A8' },
  noteBad: { backgroundColor: '#FBE9E9', borderWidth: 1, borderColor: '#E7B7B7' },
  noteTxt: { flex: 1, fontSize: 13.5, color: C.navy, lineHeight: 19 },
  label: { fontSize: 10.5, fontWeight: '800', color: C.sub, letterSpacing: 0.6, marginTop: 16 },
  foundWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  foundCard: {
    borderWidth: 1.5,
    borderColor: C.tealBorder,
    backgroundColor: C.tealSoft,
    borderRadius: R.md,
    padding: 8,
    alignItems: 'center',
    gap: 2,
  },
  foundCardMissed: { borderColor: '#EBD9A8', backgroundColor: '#FDF6E3' },
  foundName: { fontSize: 11.5, fontWeight: '700', color: C.navy },
  giveUp: { alignSelf: 'center', paddingVertical: 14 },
  giveUpTxt: { fontSize: 13.5, fontWeight: '700', color: C.teal },
  continue: {
    backgroundColor: C.teal,
    borderRadius: R.md,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  continueTxt: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
