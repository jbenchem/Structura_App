// ─────────────────────────────────────────────────────────────
// Main-group periodic table.
//
// Only the s- and p-block columns are drawn: the transition metals sit in a
// gap marked "d-block", because including them would triple the width for
// elements this course never names.
//
// Colour carries meaning. Elements that appear in the molecules being named
// are filled; the rest of the main group is outlined; the noble gases are
// muted, since they form no bonds at all.
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { C, R, T } from '../theme';
import {
  GROUPS,
  PERIODS,
  elementAt,
  BONDS_BY_GROUP,
  GROUP_NOTES,
} from '../content/periodicTable';
import { tap } from '../sandbox/haptics';

const BOND_TINT = {
  4: '#DCEFF1',
  3: '#E4EDFB',
  2: '#FBE6E6',
  1: '#F0E8FA',
  0: '#EFEFEF',
};

export function PeriodicTable({ selected, onSelect, cell = 34, showGroupNumbers = true }) {
  const gap = 3;
  return (
    <View>
      {showGroupNumbers ? (
        <View style={{ flexDirection: 'row', gap }}>
          {GROUPS.map((g) => (
            <View key={g} style={{ width: cell, alignItems: 'center' }}>
              <Text style={pt.groupNo}>{g}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {PERIODS.map((period) => (
        <View key={period} style={{ flexDirection: 'row', gap, marginBottom: gap }}>
          {GROUPS.map((group) => {
            const el = elementAt(group, period);
            // period 4 and 5 have the d-block between groups 2 and 13
            if (!el) {
              const isGap = group === 13 && period >= 4;
              return (
                <View key={group} style={{ width: cell, height: cell }}>
                  {isGap ? null : null}
                </View>
              );
            }
            const isSel = selected === el.sym;
            const tint = el.organic ? BOND_TINT[el.bonds] : 'transparent';
            const body = (
              <View
                style={[
                  pt.cell,
                  { width: cell, height: cell, backgroundColor: tint },
                  el.organic && pt.cellOrganic,
                  el.bonds === 0 && pt.cellNoble,
                  isSel && pt.cellSelected,
                ]}
              >
                <Text
                  style={[
                    pt.sym,
                    { fontSize: cell * 0.4 },
                    el.organic && { color: C.navy },
                    el.bonds === 0 && { color: C.faint },
                    isSel && { color: '#fff' },
                  ]}
                >
                  {el.sym}
                </Text>
              </View>
            );
            if (!onSelect) return <View key={group}>{body}</View>;
            return (
              <Pressable
                key={group}
                onPress={() => {
                  tap();
                  onSelect(el);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: isSel }}
                accessibilityLabel={`${el.name}, group ${el.group}`}
              >
                {body}
              </Pressable>
            );
          })}
        </View>
      ))}

      <View style={pt.legendRow}>
        <View style={[pt.swatch, { backgroundColor: BOND_TINT[4] }]} />
        <Text style={pt.legend}>used in organic structures</Text>
        <View style={[pt.swatch, { borderWidth: 1.5, borderColor: C.border }]} />
        <Text style={pt.legend}>main group</Text>
      </View>
    </View>
  );
}

// The panel shown when an element is chosen.
export function ElementDetail({ el, style }) {
  if (!el) return null;
  return (
    <View style={[pt.detail, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={[pt.detailBadge, { backgroundColor: BOND_TINT[el.bonds] }]}>
          <Text style={pt.detailSym}>{el.sym}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={T.h3}>{el.name}</Text>
          <Text style={T.tiny}>
            Group {el.group} · atomic number {el.z}
          </Text>
        </View>
        <View style={pt.bondPill}>
          <Text style={pt.bondCount}>{el.bonds}</Text>
          <Text style={pt.bondLabel}>bond{el.bonds === 1 ? '' : 's'}</Text>
        </View>
      </View>

      <Text style={pt.groupNote}>{GROUP_NOTES[el.group]}</Text>

      {el.role ? <Text style={pt.role}>{el.role}</Text> : null}

      {el.functional && el.functional.length ? (
        <View style={{ marginTop: 10 }}>
          <Text style={pt.sectionLabel}>WHERE YOU MEET IT</Text>
          <View style={pt.chipRow}>
            {el.functional.map((f) => (
              <View key={f} style={pt.chip}>
                <Text style={pt.chipTxt}>{f}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <Text style={pt.notUsed}>
          {el.bonds === 0
            ? 'A full outer shell, so it forms no bonds and never appears in these structures.'
            : 'Not used in the molecules this course names.'}
        </Text>
      )}
    </View>
  );
}

const pt = StyleSheet.create({
  groupNo: { fontSize: 9, fontWeight: '800', color: C.faint, marginBottom: 3 },
  cell: {
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellOrganic: { borderColor: C.tealBorder },
  cellNoble: { borderStyle: 'dashed' },
  cellSelected: { backgroundColor: C.teal, borderColor: C.teal },
  sym: { fontWeight: '800', color: C.sub },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  legend: { fontSize: 10.5, color: C.sub, marginRight: 6 },
  detail: {
    marginTop: 12,
    backgroundColor: C.card,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
  },
  detailBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: C.tealBorder,
  },
  detailSym: { fontSize: 19, fontWeight: '800', color: C.navy },
  bondPill: {
    alignItems: 'center',
    backgroundColor: C.tealSoft,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  bondCount: { fontSize: 20, fontWeight: '800', color: C.teal },
  bondLabel: { fontSize: 10, fontWeight: '700', color: C.teal },
  groupNote: { fontSize: 12.5, color: C.navy, lineHeight: 18, marginTop: 10 },
  role: { fontSize: 12.5, color: C.sub, lineHeight: 18, marginTop: 8 },
  sectionLabel: { fontSize: 10, fontWeight: '800', color: C.sub, letterSpacing: 0.5, marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipTxt: { fontSize: 11.5, fontWeight: '600', color: C.navy },
  notUsed: { fontSize: 12.5, color: C.sub, lineHeight: 18, marginTop: 10, fontStyle: 'italic' },
});
