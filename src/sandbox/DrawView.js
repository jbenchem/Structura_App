// ─────────────────────────────────────────────────────────────
// Sandbox · Draw → name.
//
// The canvas, its chrome and the bottom dock all live in
// CanvasSurface; this view adds the naming card above it and
// decides what the engine result means.
//
// `explain` gates every explanation: the tappable name, the part
// label, locant numbering, atom picking and the reasoning panel.
// ─────────────────────────────────────────────────────────────

import React, { useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { C as T_, R } from '../theme';
import { formatFormulas } from '../chem/formula';
import { nameGraph } from '../engine/index.js';
import { CanvasSurface } from './CanvasSurface';
import { TappableName } from './TappableName';
import { PRACTICE } from './constants';
import { bump } from './haptics';

export function DrawView({ width, explain, stereoStyle, seed, onSave }) {
  const [graph, setGraph] = useState({ atoms: [], bonds: [] });
  const [part, setPart] = useState(null);
  const [nameHidden, setNameHidden] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [saved, setSaved] = useState([]);
  const [dismissed, setDismissed] = useState(false);
  const surface = useRef(null);
  const seedTs = useRef(null);

  // A structure handed over from Look up ("Edit structure") loads once.
  if (seed && seed.ts !== seedTs.current) {
    seedTs.current = seed.ts;
    if (seed.mol) setGraph({ atoms: seed.mol.atoms.map((a) => ({ ...a })), bonds: seed.mol.bonds.map((b) => ({ ...b })) });
  }

  const commit = (g) => {
    setGraph(g);
    setPart(null);
    setDismissed(false);
  };

  const result = useMemo(
    () => (graph.atoms.length ? nameGraph(graph, { stereoStyle }) : null),
    [graph, stereoStyle]
  );
  const parts = result && result.ok ? result.parts : null;
  const highlight =
    explain && parts && part != null && parts[part] ? new Set(parts[part].atoms) : null;
  const showLocants =
    explain && part != null && parts && parts[part] &&
    (parts[part].locs || parts[part].numbered || /\d/.test(parts[part].text))
      ? result && result.locants
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

  // The engine's refusal is shown as-is, in the banner slot.
  const banner =
    result && !result.ok && !dismissed
      ? {
          kind: 'error',
          title: cap(result.err),
          message: result.message,
          onDismiss: () => setDismissed(true),
        }
      : null;


  return (
    <View style={{ flex: 1 }}>
      {!nameHidden && result && result.ok ? (
        <View style={dv.nameCard}>
          <TappableName
            parts={explain ? parts : null}
            name={result.name}
            active={part}
            onPick={setPart}
            size={17}
          />
          {explain && part != null && parts && parts[part] ? (
            <View style={dv.partBox}>
              <Text style={dv.partTxt}>{parts[part].label}</Text>
            </View>
          ) : null}
          <View style={dv.metaRow}>
            <Text style={dv.meta}>
              {formatFormulas(result.formula)} · {result.mass} g/mol
            </Text>
            {explain ? (
              <Pressable onPress={() => setExpanded((v) => !v)} hitSlop={6}>
                <Text style={dv.link}>{expanded ? 'hide reasoning' : 'why this name?'}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      {explain && expanded && result?.ok ? (
        <ScrollView style={dv.steps} contentContainerStyle={{ padding: 12 }}>
          {result.steps.map(([t, b], i) => (
            <View key={i} style={{ marginBottom: 10 }}>
              <Text style={dv.stepT}>{t}</Text>
              <Text style={dv.stepB}>{b}</Text>
            </View>
          ))}
        </ScrollView>
      ) : null}

      <CanvasSurface
        ref={surface}
        graph={graph}
        setGraph={commit}
        banner={banner}
        highlight={highlight}
        onPickAtom={explain ? pickAtom : null}
        locants={showLocants}
        nameHidden={nameHidden}
        onToggleName={() => setNameHidden((v) => !v)}
        emptyHint={{
          title: 'Draw a molecule',
          body:
            'Tap to place an atom, then tap again to chain onwards. Arm a ring or the chain tool from the dock. Pinch to zoom, drag empty space to pan.',
        }}
        moreItems={[
          {
            id: 'practice',
            label: 'Practice',
            icon: 'create-outline',
            onPress: () => {
              bump();
              const p = PRACTICE[Math.floor(Math.random() * PRACTICE.length)];
              setSaved((s) => s);
              alertPractice(p);
            },
          },
          {
            id: 'save',
            label: 'Save',
            icon: 'bookmark-outline',
            onPress: () => {
              if (!graph.atoms.length) return;
              const name = result && result.ok ? result.name : 'unnamed structure';
              if (onSave) onSave(name, graph);
              setSaved((s) => [{ name, graph }, ...s.filter((x) => x.name !== name)].slice(0, 12));
            },
          },
        ]}
      />

      {saved.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={dv.savedRow}>
          {saved.map((s, i) => (
            <Pressable
              key={i}
              style={dv.savedChip}
              onPress={() => commit(s.graph)}
              onLongPress={() => setSaved((x) => x.filter((_, j) => j !== i))}
            >
              <Text style={dv.savedTxt} numberOfLines={1}>
                {s.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

// Practice lives in the app's own Practice tab; from here it is a pointer.
function alertPractice(name) {
  const { Alert } = require('react-native');
  Alert.alert('Try drawing this', name, [{ text: 'OK' }]);
}

const cap = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);

const dv = StyleSheet.create({
  nameCard: {
    backgroundColor: T_.card,
    borderWidth: 1,
    borderColor: T_.border,
    borderRadius: R.md,
    padding: 12,
    marginBottom: 8,
  },
  partBox: { backgroundColor: T_.tealSoft, borderRadius: 8, padding: 9, marginTop: 8 },
  partTxt: { fontSize: 12.5, color: T_.navy, lineHeight: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  meta: { fontSize: 11.5, color: T_.sub },
  link: { fontSize: 12, fontWeight: '700', color: T_.teal },
  steps: { maxHeight: 150, backgroundColor: T_.card, borderRadius: R.md, borderWidth: 1, borderColor: T_.border, marginBottom: 8 },
  stepT: { fontSize: 12, fontWeight: '800', color: T_.navy },
  stepB: { fontSize: 12.5, color: T_.sub, lineHeight: 18, marginTop: 2 },
  savedRow: { gap: 8, paddingVertical: 8 },
  savedChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T_.border,
    backgroundColor: T_.card,
    maxWidth: 160,
  },
  savedTxt: { fontSize: 12, fontWeight: '600', color: T_.navy },
});
