// ─────────────────────────────────────────────────────────────
// ChainBuilder — an interactive teaching element.
//
// The learner adds and removes carbons and watches the name change
// in real time. The root is highlighted in the name so the link
// between "how many carbons" and "which root" is visible rather
// than asserted, and the -ane ending is called out as the default
// every alkane carries.
//
// The name comes from the engine, exactly as everywhere else — so
// what the learner sees here is what the checker will accept.
// ─────────────────────────────────────────────────────────────

import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R, T } from '../../theme';
import { formatFormulas } from '../../chem/formula';
import { nameGraph } from '../../engine/index.js';
import { StaticMol } from '../../sandbox/render';
import { BOND } from '../../sandbox/constants';
import { tap } from '../../sandbox/haptics';

const ROOTS = ['meth', 'eth', 'prop', 'but', 'pent', 'hex', 'hept', 'oct', 'non', 'dec'];

// A plain zigzag of n carbons, laid on the same lattice the canvas uses.
function chainGraph(n) {
  const atoms = [];
  const bonds = [];
  for (let i = 0; i < n; i++) {
    atoms.push({ id: i + 1, x: i * BOND * 0.87, y: (i % 2) * BOND * 0.5 });
    if (i) bonds.push({ a: i, b: i + 1, order: 1, stereo: null });
  }
  return { atoms, bonds };
}

export function ChainBuilder({ step, width, onContinue }) {
  const min = step.min || 1;
  const max = step.max || 10;
  const [n, setN] = useState(step.start || 3);
  const [touched, setTouched] = useState(false);

  const graph = useMemo(() => chainGraph(n), [n]);
  const result = useMemo(() => nameGraph(graph), [graph]);
  const name = result.ok ? result.name : '';
  const root = ROOTS[n - 1] || '';

  const change = (d) => {
    const next = Math.max(min, Math.min(max, n + d));
    if (next === n) return;
    tap();
    setN(next);
    setTouched(true);
  };

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <View style={cb.card}>
        <Text style={T.h2}>{step.title || 'Build a chain'}</Text>
        {step.body ? <Text style={cb.body}>{formatFormulas(step.body)}</Text> : null}

        <View style={cb.stage}>
          <StaticMol mol={graph} width={Math.min(width - 90, 300)} showCarbons={false} />
        </View>

        <View style={cb.counterRow}>
          <Pressable
            onPress={() => change(-1)}
            disabled={n <= min}
            style={[cb.round, n <= min && cb.roundOff]}
          >
            <Ionicons name="remove" size={24} color={n <= min ? C.faint : C.teal} />
          </Pressable>
          <View style={cb.countBox}>
            <Text style={cb.count}>{n}</Text>
            <Text style={cb.countLabel}>carbon{n === 1 ? '' : 's'}</Text>
          </View>
          <Pressable
            onPress={() => change(1)}
            disabled={n >= max}
            style={[cb.round, n >= max && cb.roundOff]}
          >
            <Ionicons name="add" size={24} color={n >= max ? C.faint : C.teal} />
          </Pressable>
        </View>

        {/* the name, split so the root and the suffix are visibly separate */}
        <View style={cb.nameRow}>
          <Text style={cb.rootPart}>{root}</Text>
          <Text style={cb.suffixPart}>ane</Text>
        </View>
        <Text style={cb.formula}>
          {result.ok ? `${formatFormulas(result.formula)} · ${result.mass} g/mol` : ' '}
        </Text>

        <View style={cb.legend}>
          <View style={cb.legendItem}>
            <View style={[cb.swatch, { backgroundColor: C.teal }]} />
            <Text style={cb.legendTxt}>
              <Text style={{ fontWeight: '800' }}>{root}-</Text> counts the carbons
            </Text>
          </View>
          <View style={cb.legendItem}>
            <View style={[cb.swatch, { backgroundColor: C.sub }]} />
            <Text style={cb.legendTxt}>
              <Text style={{ fontWeight: '800' }}>-ane</Text> never changes here — it is the
              default ending for a chain with only single bonds
            </Text>
          </View>
        </View>
      </View>

      {onContinue ? (
        <Pressable
          onPress={onContinue}
          style={[cb.continue, !touched && { opacity: 0.55 }]}
          disabled={!touched}
        >
          <Text style={cb.continueTxt}>
            {touched ? 'Continue' : 'Try changing the chain length'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const cb = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
  },
  body: { fontSize: 14.5, color: C.navy, lineHeight: 22, marginTop: 10 },
  stage: {
    flex: 1,
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
    marginTop: 4,
  },
  round: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: C.teal,
    backgroundColor: C.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundOff: { borderColor: C.border, backgroundColor: C.bg },
  countBox: { alignItems: 'center', minWidth: 78 },
  count: { fontSize: 30, fontWeight: '800', color: C.navy },
  countLabel: { fontSize: 12, color: C.sub, marginTop: -2 },
  nameRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 18, alignItems: 'baseline' },
  rootPart: { fontSize: 30, fontWeight: '800', color: C.teal, letterSpacing: -0.4 },
  suffixPart: { fontSize: 30, fontWeight: '800', color: C.sub, letterSpacing: -0.4 },
  formula: { fontSize: 12.5, color: C.sub, textAlign: 'center', marginTop: 4 },
  legend: { gap: 8, marginTop: 16 },
  legendItem: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  swatch: { width: 10, height: 10, borderRadius: 3, marginTop: 5 },
  legendTxt: { flex: 1, fontSize: 13, color: C.navy, lineHeight: 19 },
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
