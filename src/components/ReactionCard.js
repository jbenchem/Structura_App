// ─────────────────────────────────────────────────────────────
// ReactionCard — the shared visual grammar for the reactions thread.
//
// Reactant on the left, arrow in the middle carrying the reagent chip above
// it and the conditions in small text below it, product on the right — or a
// ? box where the product is the question. Small screens stack it vertically
// with the arrow pointing down, because two structures side by side on a
// 360px phone are two structures nobody can read.
//
// Everything organic is rendered by the engine from its name via StaticMol,
// which is the whole point: a reaction card cannot show a structure the
// engine cannot verify. Reagents and small species (H₂O out, HCl out) are
// text — the engine has no opinion on them, and the card does not pretend
// otherwise.
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R } from '../theme';
import { StaticMol } from '../sandbox/render';
import { formatFormulas } from '../chem/formula';
import { molOf } from '../content/reactions';

function Species({ name, width, label }) {
  const mol = molOf(name);
  if (!mol) {
    // A small species (H₂O, HCl): shown as its formula. Never reached for an
    // organic name — the suite guarantees those parse.
    return (
      <View style={rc.small}>
        <Text style={rc.smallTxt}>{formatFormulas(name)}</Text>
      </View>
    );
  }
  return (
    <View style={rc.species}>
      <StaticMol mol={mol} width={width} showCarbons={false} />
      {label ? <Text style={rc.speciesName}>{formatFormulas(name)}</Text> : null}
    </View>
  );
}

function Arrow({ reagent, conditions, vertical, missing }) {
  return (
    <View style={[rc.arrow, vertical && rc.arrowV]}>
      {reagent ? (
        <View style={rc.chip}>
          <Text style={rc.chipTxt}>{formatFormulas(reagent)}</Text>
        </View>
      ) : missing ? (
        <View style={[rc.chip, rc.chipMissing]}>
          <Text style={[rc.chipTxt, { color: C.warn }]}>?</Text>
        </View>
      ) : null}
      <Ionicons
        name={vertical ? 'arrow-down' : 'arrow-forward'}
        size={22}
        color={C.navy}
      />
      {conditions ? <Text style={rc.cond}>{formatFormulas(conditions)}</Text> : null}
    </View>
  );
}

// rxn: the record from RXN(), possibly with `to: null` (product is the
// question) or `reagent: null` (reagent is the question).
export function ReactionCard({ rxn, width = 340, labels = true }) {
  if (!rxn) return null;
  const askProduct = !rxn.to && !rxn.showProduct;
  // Two organics side by side need real width each; below ~340 the card
  // stacks. `with` (esterification's second reactant) always stacks the left
  // side internally.
  const vertical = width < 340 || !!rxn.with;
  const molW = vertical ? Math.min(width - 60, 250) : Math.floor((width - 86) / 2);

  const alsoRight = rxn.hideAlso ? [] : (rxn.also && rxn.also.right) || [];

  return (
    <View style={[rc.card, vertical ? rc.cardV : rc.cardH]}>
      <View style={vertical ? rc.sideV : rc.side}>
        <Species name={rxn.from} width={molW} label={labels} />
        {rxn.with ? (
          <>
            <Text style={rc.plus}>+</Text>
            <Species name={rxn.with} width={molW} label={labels} />
          </>
        ) : null}
      </View>

      <Arrow
        reagent={rxn.reagent}
        conditions={rxn.conditions}
        vertical={vertical}
        missing={rxn.reagent === null && rxn.showProduct}
      />

      <View style={vertical ? rc.sideV : rc.side}>
        {askProduct ? (
          <View style={[rc.unknown, { width: molW, minHeight: 84 }]}>
            <Text style={rc.unknownTxt}>?</Text>
          </View>
        ) : (
          <Species name={rxn.to} width={molW} label={labels} />
        )}
        {alsoRight.map((sm) => (
          <React.Fragment key={sm}>
            <Text style={rc.plus}>+</Text>
            <Species name={sm} width={molW} />
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

const rc = StyleSheet.create({
  card: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.md,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardH: { flexDirection: 'row', gap: 8 },
  cardV: { flexDirection: 'column', gap: 6 },
  side: { alignItems: 'center', gap: 4, flexShrink: 1 },
  sideV: { alignItems: 'center', gap: 4 },
  species: { alignItems: 'center' },
  speciesName: { fontSize: 11.5, color: C.sub, fontWeight: '600', marginTop: 2 },
  small: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  smallTxt: { fontSize: 14, fontWeight: '700', color: C.navy },
  plus: { fontSize: 16, fontWeight: '800', color: C.faint, marginVertical: 2 },
  arrow: { alignItems: 'center', gap: 3, paddingHorizontal: 4 },
  arrowV: { paddingVertical: 2 },
  chip: {
    backgroundColor: C.tealSoft,
    borderWidth: 1,
    borderColor: C.tealBorder,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  chipMissing: { backgroundColor: '#FFF4E3', borderColor: C.warn },
  chipTxt: { fontSize: 11.5, fontWeight: '800', color: C.teal },
  cond: { fontSize: 10, color: C.faint, textAlign: 'center', maxWidth: 110 },
  unknown: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: C.warn,
    borderRadius: R.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF9F0',
  },
  unknownTxt: { fontSize: 26, fontWeight: '800', color: C.warn },
});
