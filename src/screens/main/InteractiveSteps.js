// ─────────────────────────────────────────────────────────────
// Interactive teaching steps.
//
//   StructureToggle — the same molecule shown two ways, switched by
//     the learner. This is how "the hydrogens are still there, they
//     are just not drawn" gets understood instead of asserted.
//
//   CountAtoms — the learner taps each carbon in a skeletal drawing
//     and it lights up. Counting corners and ends by hand is the
//     skill; being told "every corner is a carbon" is not the same
//     thing as having done it.
//
// Both refuse to advance until the learner has actually interacted,
// so an interactive step cannot be skipped like a paragraph.
// ─────────────────────────────────────────────────────────────

import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R, T } from '../../theme';
import { formatFormulas } from '../../chem/formula';
import { nameGraph } from '../../engine/index.js';
import { StaticMol } from '../../sandbox/render';
import { PeriodicTable, ElementDetail } from '../../components/PeriodicTable';
import { bySymbol } from '../../content/periodicTable';
import { tap, good } from '../../sandbox/haptics';

// ── Full ↔ skeletal ──────────────────────────────────────────
export function StructureToggle({ step, width, onContinue }) {
  const [full, setFull] = useState(true);
  const [seenBoth, setSeenBoth] = useState(false);

  const show = (v) => {
    if (v === full) return;
    tap();
    setFull(v);
    setSeenBoth(true);
  };

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <ScrollView
        style={{ flex: 1, minHeight: 0 }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
      <View style={iv.card}>
        <Text style={T.h2}>{step.title}</Text>
        {step.body ? <Text style={iv.body}>{formatFormulas(step.body)}</Text> : null}

        <View style={iv.switchRow}>
          <Pressable
            onPress={() => show(true)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityState={{ selected: full }}
            accessibilityLabel="show every atom"
            style={[iv.seg, full && iv.segOn]}
          >
            <Text style={[iv.segTxt, full && iv.segTxtOn]}>Every atom</Text>
          </Pressable>
          <Pressable
            onPress={() => show(false)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityState={{ selected: !full }}
            accessibilityLabel="show the skeleton"
            style={[iv.seg, !full && iv.segOn]}
          >
            <Text style={[iv.segTxt, !full && iv.segTxtOn]}>Skeletal</Text>
          </Pressable>
        </View>

        <View style={iv.stage}>
          <StaticMol
            mol={step.mol}
            width={Math.min(width - 90, 300)}
            showCarbons={full}
          />
        </View>

        <View style={iv.captionBox}>
          <Ionicons
            name={full ? 'eye-outline' : 'eye-off-outline'}
            size={16}
            color={C.teal}
          />
          <Text style={iv.caption}>{formatFormulas(full ? step.captionFull : step.captionSkeletal)}</Text>
        </View>
      </View>
      </ScrollView>

      <Pressable
        onPress={onContinue}
        disabled={!seenBoth}
        style={[iv.continue, !seenBoth && { opacity: 0.55 }]}
      >
        <Text style={iv.continueTxt}>
          {seenBoth ? 'Continue' : 'Try both views'}
        </Text>
      </Pressable>
    </View>
  );
}

// ── Tap every carbon ─────────────────────────────────────────
export function CountAtoms({ step, width, onContinue }) {
  const [found, setFound] = useState(() => new Set());

  const carbons = useMemo(
    () => step.mol.atoms.filter((a) => !a.el || a.el === 'C').map((a) => a.id),
    [step.mol]
  );
  const total = carbons.length;
  const done = found.size >= total;

  const result = useMemo(() => nameGraph(step.mol), [step.mol]);

  const pick = (id) => {
    if (!carbons.includes(id) || found.has(id)) return;
    const next = new Set(found);
    next.add(id);
    if (next.size >= total) good();
    else tap();
    setFound(next);
  };

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <View style={iv.card}>
        <Text style={T.h2}>{step.title}</Text>
        {step.body ? <Text style={iv.body}>{formatFormulas(step.body)}</Text> : null}

        <View style={iv.stage}>
          <StaticMol
            mol={step.mol}
            width={Math.min(width - 90, 300)}
            showCarbons={false}
            highlight={found}
            onPickAtom={pick}
          />
        </View>

        <View style={iv.counterRow}>
          {Array.from({ length: total }).map((_, i) => (
            <View key={i} style={[iv.pip, i < found.size && iv.pipOn]} />
          ))}
        </View>
        <Text style={iv.countTxt}>
          {found.size} of {total} carbons found
        </Text>

        {done ? (
          <View style={iv.doneBox}>
            <Ionicons name="checkmark-circle" size={18} color={C.greenText} />
            <Text style={iv.doneTxt}>
              {total} carbons — so this is{' '}
              <Text style={{ fontWeight: '800' }}>
                {result.ok ? result.name : step.answer}
              </Text>
              .{step.doneNote ? ` ${formatFormulas(step.doneNote)}` : ''}
            </Text>
          </View>
        ) : (
          <Text style={iv.hint}>
            Tap each line end and each corner. Those are the carbons.
          </Text>
        )}
      </View>

      <Pressable
        onPress={onContinue}
        disabled={!done}
        style={[iv.continue, !done && { opacity: 0.55 }]}
      >
        <Text style={iv.continueTxt}>{done ? 'Continue' : 'Find them all to continue'}</Text>
      </Pressable>
    </View>
  );
}

// ── Explore the main group ───────────────────────────────────
// The learner taps elements and reads off how many bonds each forms. The
// point is the pattern down the columns, so the counter tracks how many
// different GROUPS have been visited rather than how many elements.
export function ElementExplorer({ step, width, onContinue }) {
  const [picked, setPicked] = useState(() => bySymbol(step.start || 'C'));
  const [groupsSeen, setGroupsSeen] = useState(() => new Set([bySymbol(step.start || 'C').group]));
  const need = step.need || 3;
  const done = groupsSeen.size >= need;

  const choose = (el) => {
    setPicked(el);
    setGroupsSeen((g) => {
      const next = new Set(g);
      next.add(el.group);
      if (next.size >= need && g.size < need) good();
      return next;
    });
  };

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <ScrollView
        style={{ flex: 1, minHeight: 0 }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={iv.card}>
          <Text style={T.h2}>{step.title}</Text>
          {step.body ? <Text style={iv.body}>{formatFormulas(step.body)}</Text> : null}

          <View style={{ alignItems: 'center', marginTop: 14 }}>
            <PeriodicTable
              selected={picked ? picked.sym : null}
              onSelect={choose}
              cell={Math.min(38, Math.floor((width - 90) / 8) - 3)}
            />
          </View>

          <ElementDetail el={picked} />

          <View style={iv.progressRow}>
            {Array.from({ length: need }).map((_, i) => (
              <View key={i} style={[iv.pip, i < groupsSeen.size && iv.pipOn]} />
            ))}
            <Text style={iv.progressTxt}>
              {groupsSeen.size} of {need} columns explored
            </Text>
          </View>
        </View>
      </ScrollView>

      <Pressable
        onPress={onContinue}
        disabled={!done}
        style={[iv.continue, !done && { opacity: 0.55 }]}
      >
        <Text style={iv.continueTxt}>
          {done ? 'Continue' : `Tap elements in ${need - groupsSeen.size} more column${need - groupsSeen.size === 1 ? '' : 's'}`}
        </Text>
      </Pressable>
    </View>
  );
}

const iv = StyleSheet.create({
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  progressTxt: { fontSize: 12, fontWeight: '700', color: C.sub, marginLeft: 6 },
  card: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
  },
  body: { fontSize: 14.5, color: C.navy, lineHeight: 22, marginTop: 10 },
  switchRow: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: C.bg,
    borderRadius: 12,
    padding: 4,
    marginTop: 16,
  },
  // 44 is the minimum comfortable touch target; at the old 9pt padding these
  // came out around 35 and were awkward to hit.
  seg: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 12,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segOn: { backgroundColor: C.teal },
  segTxt: { fontSize: 13, fontWeight: '700', color: C.sub },
  segTxtOn: { color: '#fff' },
  stage: { flex: 1, minHeight: 130, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  captionBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: C.tealSoft,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  caption: { flex: 1, fontSize: 13, color: C.navy, lineHeight: 19 },
  counterRow: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginTop: 6 },
  pip: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  pipOn: { backgroundColor: C.teal, borderColor: C.teal },
  countTxt: { fontSize: 13, fontWeight: '700', color: C.navy, textAlign: 'center', marginTop: 8 },
  hint: { fontSize: 12.5, color: C.sub, textAlign: 'center', marginTop: 8, lineHeight: 18 },
  doneBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: C.greenSoft,
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  doneTxt: { flex: 1, fontSize: 13.5, color: C.navy, lineHeight: 19 },
  continue: {
    backgroundColor: C.teal,
    borderRadius: R.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  continueTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
