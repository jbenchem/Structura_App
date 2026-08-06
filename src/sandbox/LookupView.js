// ─────────────────────────────────────────────────────────────
// Sandbox · Name → draw.
//
// "Build from an IUPAC name": a labelled field with a clear button
// and an explicit Build action, then a result card carrying the
// structure, its name and the zoom controls.
//
// Behaviour carried over from the prototype: accept-but-flag notes
// with a one-tap switch to the preferred name, verified synonyms,
// spelling suggestions, and refusals shown verbatim — nothing here
// guesses on the engine's behalf.
// ─────────────────────────────────────────────────────────────

import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C as T_, R } from '../theme';
import { formatFormulas } from '../chem/formula';
import { nameGraph, parseName, synonymsFor } from '../engine/index.js';
import { StaticMol } from './render';
import { TappableName } from './TappableName';
import { tap } from './haptics';

const SAMPLES = [
  'aspirin', 'caffeine', 'cis-but-2-ene', '(2R)-butan-2-ol', 'glycine',
  'naphthalene', 'oleic acid', '1-nitrophenol',
];

export function LookupView({ width, explain, stereoStyle, onEditStructure }) {
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [showCarbons, setShowCarbons] = useState(false);
  const [part, setPart] = useState(null);
  const [zoom, setZoom] = useState(1);

  const build = () => {
    tap();
    setPart(null);
    setQuery(text.trim());
  };
  const useName = (n) => {
    tap();
    setText(n);
    setQuery(n);
    setPart(null);
  };

  const r = useMemo(() => (query ? parseName(query) : null), [query]);
  const named = useMemo(
    () => (r && r.ok && r.mol ? nameGraph(r.mol, { stereoStyle }) : null),
    [r, stereoStyle]
  );
  const syn = useMemo(() => (r && r.ok ? synonymsFor(query).synonyms : []), [r, query]);

  // A name that states a configuration is asking to be read geometrically, so
  // the hydrogens on the double bond are drawn.
  const stereoAsked = /\b(cis|trans)-|\(\d*[EZ]\)/i.test(query || '') ||
    !!(named && named.ok && /\(\d*[EZ]\)/.test(named.name));

  const parts = named && named.ok ? named.parts : null;
  const highlight =
    explain && parts && part != null && parts[part] ? new Set(parts[part].atoms) : null;
  const showLocants =
    explain && part != null && parts && parts[part] &&
    (parts[part].locs || parts[part].numbered || /\d/.test(parts[part].text))
      ? named && named.locants
      : null;

  const pickAtom = (id, id2) => {
    if (!parts) return;
    let i = -1;
    if (id2 != null)
      i = parts.findIndex(
        (p) => p.atoms && p.atoms.includes(id) && p.atoms.includes(id2) && p.kind !== 'punctuation'
      );
    if (i < 0) i = parts.findIndex((p) => p.atoms && p.atoms.includes(id) && p.kind !== 'punctuation');
    if (i >= 0) setPart(i === part ? null : i);
  };

  return (
    <ScrollView
      contentContainerStyle={{ paddingVertical: 12, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* build card */}
      <View style={lv.buildCard}>
        <Text style={lv.buildTitle}>Build from an IUPAC name</Text>
        <Text style={lv.fieldLabel}>IUPAC name</Text>
        <View style={lv.inputWrap}>
          <TextInput
            style={lv.input}
            value={text}
            onChangeText={setText}
            onSubmitEditing={build}
            returnKeyType="go"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="e.g. 3-methylpent-2-ene"
            placeholderTextColor={T_.faint}
          />
          {text ? (
            <Pressable onPress={() => { setText(''); setQuery(''); }} hitSlop={8}>
              <Ionicons name="close" size={18} color={T_.sub} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          onPress={build}
          disabled={!text.trim()}
          style={[lv.buildBtn, !text.trim() && { opacity: 0.45 }]}
        >
          <Text style={lv.buildBtnTxt}>Build structure</Text>
        </Pressable>
        <Text style={lv.helper}>Enter a systematic name to generate its structure.</Text>
      </View>

      {!query ? (
        <View style={lv.chips}>
          {SAMPLES.map((s) => (
            <Pressable key={s} onPress={() => useName(s)} style={lv.chip}>
              <Text style={lv.chipTxt}>{s}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {r && r.mol ? (
        <View style={lv.card}>
          <View style={lv.cardHead}>
            <View style={[lv.badge, !r.ok && lv.badgeBad]}>
              <Ionicons
                name={r.ok ? 'checkmark-circle' : 'warning'}
                size={15}
                color={r.ok ? T_.greenText : T_.danger}
              />
              <Text style={[lv.badgeTxt, !r.ok && { color: T_.danger }]}>
                {r.ok ? 'Structure built' : 'Check this name'}
              </Text>
            </View>
            <View style={{ gap: 6 }}>
              <Pressable onPress={() => setZoom((z) => Math.min(2.2, z * 1.2))} style={lv.sq}>
                <Ionicons name="add" size={18} color={T_.teal} />
              </Pressable>
              <Pressable onPress={() => setZoom((z) => Math.max(0.6, z / 1.2))} style={lv.sq}>
                <Ionicons name="remove" size={18} color={T_.teal} />
              </Pressable>
              <Pressable onPress={() => setZoom(1)} style={lv.sq}>
                <Ionicons name="scan-outline" size={16} color={T_.teal} />
              </Pressable>
            </View>
          </View>

          <StaticMol
            mol={r.mol}
            width={Math.max(180, (width - 96) * zoom)}
            showCarbons={showCarbons}
            showStereoH={stereoAsked}
            highlight={highlight}
            locants={showLocants}
            onPickAtom={explain ? pickAtom : null}
          />

          {r.ok ? (
            <>
              <View style={{ alignItems: 'center', marginTop: 4 }}>
                <TappableName
                  parts={explain ? parts : null}
                  name={named && named.ok ? named.name : r.name}
                  active={part}
                  onPick={setPart}
                />
              </View>
              {explain && part != null && parts && parts[part] ? (
                <View style={lv.partBox}>
                  <Text style={lv.partTxt}>{parts[part].label}</Text>
                </View>
              ) : null}
              <Text style={lv.meta}>
                {formatFormulas(r.formula)} · {r.mass} g/mol
              </Text>
            </>
          ) : (
            <Text style={lv.errMsg}>{r.message}</Text>
          )}

          {r.note ? (
            <View style={[lv.note, (r.issue === 'numbering' || r.issue === 'parent') && lv.noteFlag]}>
              {r.issue === 'numbering' || r.issue === 'parent' ? (
                <Text style={lv.noteFlagTxt}>
                  {r.issue === 'numbering' ? 'check the numbering' : 'check the parent chain'}
                </Text>
              ) : null}
              <Text style={lv.noteTxt}>{r.note}</Text>
              {r.issue === 'numbering' || r.issue === 'parent' ? (
                <Pressable onPress={() => useName(r.canonical)} style={lv.fixBtn}>
                  <Text style={lv.fixTxt}>Use {r.canonical}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {r.intended ? (
            <Pressable onPress={() => useName(r.intended)} style={lv.fixBtn}>
              <Text style={lv.fixTxt}>Use {r.intended}</Text>
            </Pressable>
          ) : null}

          {syn.length > 0 ? (
            <View style={lv.synBox}>
              <Text style={lv.synLabel}>also accepted — tap to try one</Text>
              <View style={lv.synRow}>
                {syn.slice(0, 8).map((s) => (
                  <Pressable key={s.name} onPress={() => useName(s.name)} style={lv.synChip}>
                    <Text style={lv.synTxt}>{s.name}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          <View style={lv.actions}>
            <Pressable onPress={() => setShowCarbons((v) => !v)} style={lv.ghostBtn}>
              <Text style={lv.ghostTxt}>{showCarbons ? 'Hide all atoms' : 'Show all atoms'}</Text>
            </Pressable>
            {r.ok && onEditStructure ? (
              <Pressable onPress={() => onEditStructure(r.mol)} style={lv.primaryBtn}>
                <Text style={lv.primaryTxt}>Edit structure</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : r ? (
        <View style={[lv.card, { borderColor: '#F5C8C8', backgroundColor: '#FDECEC' }]}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
            <Ionicons name="warning" size={18} color={T_.danger} />
            <View style={{ flex: 1 }}>
              <Text style={lv.errTitle}>{cap(r.err)}</Text>
              <Text style={lv.errMsg}>{r.message}</Text>
            </View>
          </View>
          {r.intended ? (
            <Pressable onPress={() => useName(r.intended)} style={lv.fixBtn}>
              <Text style={lv.fixTxt}>Use {r.intended}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {explain && r && r.ok && r.steps
        ? r.steps.map(([t, b], i) => (
            <View key={i} style={{ marginTop: 12 }}>
              <Text style={lv.stepT}>{t}</Text>
              <Text style={lv.stepB}>{b}</Text>
            </View>
          ))
        : null}
    </ScrollView>
  );
}

const cap = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);

const lv = StyleSheet.create({
  buildCard: {
    backgroundColor: T_.blueSoft,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: '#D7E6FA',
    padding: 16,
  },
  buildTitle: { fontSize: 17, fontWeight: '800', color: T_.navy },
  fieldLabel: { fontSize: 12, color: T_.sub, marginTop: 12, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: T_.card,
    borderWidth: 1.5,
    borderColor: T_.teal,
    borderRadius: R.md,
    paddingHorizontal: 14,
  },
  input: { flex: 1, paddingVertical: 13, fontSize: 15.5, color: T_.navy },
  buildBtn: {
    backgroundColor: T_.teal,
    borderRadius: R.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  buildBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  helper: { fontSize: 12, color: T_.sub, marginTop: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: T_.border,
    backgroundColor: T_.card,
  },
  chipTxt: { fontSize: 12.5, fontWeight: '600', color: T_.navy },
  card: {
    marginTop: 14,
    backgroundColor: T_.card,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: T_.border,
    padding: 14,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: T_.greenSoft,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeBad: { backgroundColor: '#FDECEC' },
  badgeTxt: { fontSize: 12.5, fontWeight: '700', color: T_.greenText },
  sq: {
    width: 34,
    height: 34,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: T_.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partBox: { backgroundColor: T_.tealSoft, borderRadius: 8, padding: 10, marginTop: 8 },
  partTxt: { fontSize: 12.5, color: T_.navy, lineHeight: 18 },
  meta: { fontSize: 11.5, color: T_.sub, textAlign: 'center', marginTop: 6 },
  errTitle: { fontSize: 14, fontWeight: '800', color: T_.danger },
  errMsg: { fontSize: 13, color: T_.navy, lineHeight: 19, marginTop: 4 },
  note: { marginTop: 12, backgroundColor: T_.bg, borderRadius: 10, padding: 11 },
  noteFlag: { backgroundColor: '#FFF6E9' },
  noteFlagTxt: { fontSize: 11, fontWeight: '800', color: T_.warn, marginBottom: 3 },
  noteTxt: { fontSize: 12.5, color: T_.navy, lineHeight: 18 },
  fixBtn: {
    alignSelf: 'flex-start',
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: T_.teal,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  fixTxt: { fontSize: 12.5, fontWeight: '700', color: T_.teal },
  synBox: { marginTop: 12 },
  synLabel: { fontSize: 11, fontWeight: '700', color: T_.sub, marginBottom: 6 },
  synRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  synChip: {
    borderWidth: 1,
    borderColor: T_.border,
    backgroundColor: T_.bg,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  synTxt: { fontSize: 12, fontWeight: '600', color: T_.navy },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  ghostBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: T_.teal,
    borderRadius: R.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ghostTxt: { fontSize: 13.5, fontWeight: '700', color: T_.teal },
  primaryBtn: {
    flex: 1,
    backgroundColor: T_.teal,
    borderRadius: R.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryTxt: { fontSize: 13.5, fontWeight: '700', color: '#fff' },
  stepT: { fontSize: 12, fontWeight: '800', color: T_.navy },
  stepB: { fontSize: 12.5, color: T_.sub, lineHeight: 18, marginTop: 2 },
});
