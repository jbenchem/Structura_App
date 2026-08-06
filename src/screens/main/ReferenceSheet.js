// ─────────────────────────────────────────────────────────────
// Nomenclature reference.
//
// Opened from the question header. Two tabs: the first twenty
// chain lengths, and the seniority ladder that decides which group
// takes the suffix.
//
// Sketches are drawn from the spec in content/reference.js rather
// than being images, so they inherit the app's colours and scale
// with the text.
// ─────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import Svg, { Line, Text as SvgText, TSpan } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { C, R, T } from '../../theme';
import { SheetOverlay } from '../../components/Overlay';
import { ROOTS, LADDER, PREFIX_ONLY } from '../../content/reference';
import { PeriodicTable, ElementDetail } from '../../components/PeriodicTable';
import { bySymbol } from '../../content/periodicTable';
import { StaticMol } from '../../sandbox/render';
import { buildTarget, Cn, chainBonds } from '../../chem/questions';
import { formatFormulas } from '../../chem/formula';
import { STRUCT_FONT } from '../../sandbox/fonts';
import { tap } from '../../sandbox/haptics';

const SUB = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉' };
const sub = (s) => String(s).replace(/[0-9]/g, (d) => SUB[d]);

// ── sketch renderer ──────────────────────────────────────────
// Labels along a backbone, with an optional double-bonded atom above.
function Sketch({ spec, height = 54 }) {
  const gap = 34;
  const padX = 6;
  const baseY = spec.up ? height - 16 : height / 2 + 4;
  const width = padX * 2 + (spec.chain.length - 1) * gap + 26;
  const xOf = (i) => padX + 13 + i * gap;

  return (
    <Svg width={width} height={height}>
      {/* backbone bonds, trimmed away from the labels */}
      {spec.bonds.map((order, i) => {
        const x1 = xOf(i) + 9;
        const x2 = xOf(i + 1) - 9;
        const offs = order === 1 ? [0] : order === 2 ? [-2.6, 2.6] : [-4, 0, 4];
        return offs.map((o, k) => (
          <Line
            key={`${i}-${k}`}
            x1={x1}
            y1={baseY - 4 + o}
            x2={x2}
            y2={baseY - 4 + o}
            stroke={C.navy}
            strokeWidth={1.6}
          />
        ));
      })}

      {/* the carbonyl oxygen, drawn above its carbon */}
      {spec.up ? (
        <>
          {[-2.6, 2.6].map((o, k) => (
            <Line
              key={k}
              x1={xOf(spec.up.at) + o}
              y1={baseY - 16}
              x2={xOf(spec.up.at) + o}
              y2={20}
              stroke={C.navy}
              strokeWidth={1.6}
            />
          ))}
          <SvgText
            x={xOf(spec.up.at)}
            y={16}
            fontSize={14}
            fontWeight="700"
            fontFamily={STRUCT_FONT}
            fill="#D64545"
            textAnchor="middle"
          >
            {spec.up.label}
          </SvgText>
        </>
      ) : null}

      {/* labels */}
      {spec.chain.map((label, i) => (
        <SvgText
          key={i}
          x={xOf(i)}
          y={baseY}
          fontSize={14}
          fontWeight="700"
          fontFamily={STRUCT_FONT}
          fill={colourFor(label)}
          textAnchor="middle"
        >
          {sub(label)}
        </SvgText>
      ))}
    </Svg>
  );
}

function colourFor(label) {
  if (label.startsWith('O')) return '#D64545';
  if (label.startsWith('N')) return '#2D6FD8';
  if (label === 'Cl' || label === 'X') return '#7A3FBF';
  return C.navy;
}

// ── the sheet ────────────────────────────────────────────────
export function ReferenceSheet({ visible, onClose }) {
  const [tabId, setTabId] = useState('roots');
  const [element, setElement] = useState(() => bySymbol('C'));

  return (
    <SheetOverlay visible={visible} onClose={onClose} anchor="bottom">
      <View style={rs.sheet}>
        <View style={rs.head}>
          <Text style={[T.h3, { flex: 1 }]}>Nomenclature reference</Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="close reference">
            <Ionicons name="close" size={22} color={C.sub} />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={rs.tabs}
        >
          {[
            ['roots', 'Chain lengths'],
            ['ladder', 'Naming priority'],
            ['forms', 'Ways to draw'],
            ['elements', 'Elements'],
          ].map(([id, label]) => (
            <Pressable
              key={id}
              onPress={() => {
                tap();
                setTabId(id);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: tabId === id }}
              style={[rs.tab, tabId === id && rs.tabOn]}
            >
              <Text style={[rs.tabTxt, tabId === id && { color: '#fff' }]}>{label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView style={{ maxHeight: 430 }} showsVerticalScrollIndicator={false}>
          {tabId === 'roots' ? <RootsTable /> : null}
          {tabId === 'ladder' ? <LadderTable /> : null}
          {tabId === 'forms' ? <FormsTable /> : null}
          {tabId === 'elements' ? (
            <ElementsTable selected={element} onSelect={setElement} />
          ) : null}
        </ScrollView>
      </View>
    </SheetOverlay>
  );
}

function RootsTable() {
  return (
    <View style={{ paddingBottom: 10 }}>
      <Text style={rs.note}>
        The root counts the carbons in the parent chain. The first four are historical names; from
        pent- onwards they are the Greek numbers.
      </Text>
      <View style={rs.rowHead}>
        <Text style={[rs.cellN, rs.headTxt]}>C</Text>
        <Text style={[rs.cell, rs.headTxt]}>Root</Text>
        <Text style={[rs.cell, rs.headTxt]}>Alkane</Text>
      </View>
      {ROOTS.map((r) => (
        <View key={r.n} style={rs.row}>
          <Text style={rs.cellN}>{r.n}</Text>
          <Text style={[rs.cell, { fontWeight: '700', color: C.teal }]}>{r.root}-</Text>
          <Text style={rs.cell}>{r.alkane}</Text>
        </View>
      ))}
    </View>
  );
}

function LadderTable() {
  return (
    <View style={{ paddingBottom: 10 }}>
      <Text style={rs.note}>
        Highest group present wins: it takes the suffix and the lowest locant. Everything below it
        is demoted to its prefix.
      </Text>
      {LADDER.map((g) => (
        <View key={g.rank} style={rs.gRow}>
          <View style={rs.rank}>
            <Text style={rs.rankTxt}>{g.rank}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={rs.gName}>{g.group}</Text>
            <View style={rs.affixes}>
              <View style={rs.affixPill}>
                <Text style={rs.affixTxt}>{g.suffix}</Text>
              </View>
              {g.prefix !== '—' ? (
                <View style={[rs.affixPill, rs.prefixPill]}>
                  <Text style={[rs.affixTxt, { color: C.sub }]}>{g.prefix}</Text>
                </View>
              ) : null}
            </View>
            <Text style={rs.eg}>e.g. {g.example}</Text>
          </View>
          <Sketch spec={g.sketch} />
        </View>
      ))}

      <Text style={[rs.note, { marginTop: 14 }]}>
        These have no suffix form, so they are always cited as a prefix — they can never be the
        principal group.
      </Text>
      {PREFIX_ONLY.map((g) => (
        <View key={g.group} style={rs.gRow}>
          <View style={[rs.rank, rs.rankMuted]}>
            <Ionicons name="remove" size={13} color={C.sub} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={rs.gName}>{g.group}</Text>
            <View style={rs.affixes}>
              <View style={[rs.affixPill, rs.prefixPill]}>
                <Text style={[rs.affixTxt, { color: C.sub }]}>{g.prefix}</Text>
              </View>
            </View>
            <Text style={rs.eg}>e.g. {g.example}</Text>
          </View>
          <Sketch spec={g.sketch} />
        </View>
      ))}
    </View>
  );
}

// ── Ways to draw the same molecule ───────────────────────────
// One molecule, four notations. Learners meet all of these in textbooks and
// exams, and the commonest confusion is thinking they are different compounds.
const FORMS_MOL = buildTarget(Cn(3), chainBonds(3));

const FORMS = [
  {
    id: 'structural',
    name: 'Structural formula',
    note: 'Every atom and every bond drawn. Unambiguous, but slow to draw and hard to read once the molecule grows.',
    render: 'full',
  },
  {
    id: 'semi',
    name: 'Semi-structural (condensed)',
    note: 'Atoms grouped per carbon, bonds between groups implied. The usual way to write a molecule in a sentence.',
    text: 'CH3CH2CH3   or   CH3-CH2-CH3',
  },
  {
    id: 'skeletal',
    name: 'Skeletal formula',
    note: 'Only the carbon-carbon bonds drawn. Every line end and corner is a carbon; hydrogens on carbon are implied. What you draw on the canvas.',
    render: 'skeletal',
  },
  {
    id: 'molecular',
    name: 'Molecular formula',
    note: 'Just the atom counts. Says nothing about how they are joined, so different molecules can share one.',
    text: 'C3H8',
  },
];

function FormsTable() {
  return (
    <View style={{ paddingBottom: 10 }}>
      <Text style={rs.note}>
        The same molecule — propane — written four ways. They describe one compound, not four; only the
        amount of detail changes.
      </Text>
      {FORMS.map((f) => (
        <View key={f.id} style={rs.formRow}>
          <Text style={rs.formName}>{f.name}</Text>
          <View style={rs.formStage}>
            {f.render ? (
              <StaticMol mol={FORMS_MOL} width={200} showCarbons={f.render === 'full'} />
            ) : (
              <Text style={rs.formText}>{formatFormulas(f.text)}</Text>
            )}
          </View>
          <Text style={rs.formNote}>{f.note}</Text>
        </View>
      ))}
      <Text style={rs.note}>
        A molecular formula is the only one of the four that can be ambiguous: C3H8 has just one
        possible structure, but C4H10 has two.
      </Text>
    </View>
  );
}

// ── Main-group elements ──────────────────────────────────────
function ElementsTable({ selected, onSelect }) {
  return (
    <View style={{ paddingBottom: 10 }}>
      <Text style={rs.note}>
        Tap an element to see how many bonds it forms and where it turns up. The number of bonds is
        set by the column, and it is the rule every structure in this course obeys.
      </Text>
      <View style={{ alignItems: 'center' }}>
        <PeriodicTable selected={selected ? selected.sym : null} onSelect={onSelect} cell={34} />
      </View>
      <ElementDetail el={selected} />
    </View>
  );
}

const rs = StyleSheet.create({
  formRow: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingVertical: 14,
  },
  formName: { fontSize: 14.5, fontWeight: '800', color: C.navy },
  formStage: { alignItems: 'center', justifyContent: 'center', minHeight: 74, marginTop: 8 },
  formText: { fontSize: 17, fontWeight: '700', color: C.navy, letterSpacing: 0.3 },
  formNote: { fontSize: 12.5, color: C.sub, lineHeight: 18, marginTop: 8 },
  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 18,
    paddingBottom: 28,
  },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  tabs: { flexDirection: 'row', gap: 6, backgroundColor: C.bg, borderRadius: 12, padding: 4, marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  tabOn: { backgroundColor: C.teal },
  tabTxt: { fontSize: 13, fontWeight: '700', color: C.sub },
  note: { fontSize: 12.5, color: C.sub, lineHeight: 18, marginBottom: 12 },
  rowHead: { flexDirection: 'row', paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: C.border },
  headTxt: { fontSize: 11, fontWeight: '800', color: C.sub, letterSpacing: 0.5 },
  row: { flexDirection: 'row', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.border },
  cellN: { width: 34, fontSize: 13, fontWeight: '700', color: C.navy },
  cell: { flex: 1, fontSize: 13.5, color: C.navy },
  gRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  rank: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.tealSoft,
    borderWidth: 1,
    borderColor: C.tealBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankMuted: { backgroundColor: C.bg, borderColor: C.border },
  rankTxt: { fontSize: 12, fontWeight: '800', color: C.teal },
  gName: { fontSize: 14.5, fontWeight: '700', color: C.navy },
  affixes: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 5 },
  affixPill: {
    backgroundColor: C.tealSoft,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  prefixPill: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  affixTxt: { fontSize: 11.5, fontWeight: '700', color: C.teal },
  eg: { fontSize: 11.5, color: C.sub, marginTop: 4 },
});
