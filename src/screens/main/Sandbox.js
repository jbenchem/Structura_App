// ─────────────────────────────────────────────────────────────
// Sandbox screen — the app's seam with the sandbox feature.
//
// This file owns entitlement, the app chrome (Screen/Header) and
// the two feature-level switches; everything below it lives in
// src/sandbox/ and knows nothing about the rest of Structura.
//
// `explain` is held here and passed down. Assessment contexts that
// embed DrawView directly should pass explain={false}, which
// disables every explanation surface in one place.
// ─────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Switch, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { C, R, T } from '../../theme';
import { useViewport } from '../../components/DeviceFrame';
import { Screen, Card, Header } from '../../components/ui';
import { useApp, useEntitlement, PRICE } from '../../state/store';
import { SheetOverlay } from '../../components/Overlay';
import { StaticMol } from '../../sandbox/render';
import { formatFormulas } from '../../chem/formula';
import { DrawView } from '../../sandbox/DrawView';
import { LookupView } from '../../sandbox/LookupView';

export function Sandbox({ openRedeem, onExit }) {
  const { allowed } = useEntitlement('sandbox');
  const { width } = useViewport();
  const [tab, setTab] = useState('draw');
  const [explain, setExplain] = useState(true);
  const [stereoStyle, setStereoStyle] = useState('ez');
  const [handoff, setHandoff] = useState(null);
  const [savedOpen, setSavedOpen] = useState(false);
  const { state, dispatch } = useApp();
  const saved = state.savedMolecules || [];

  if (!allowed) return <SandboxLocked openRedeem={openRedeem} />;

  return (
    <Screen style={sx.paper}>
      <View style={sx.topBar}>
        <Pressable onPress={onExit} hitSlop={10} style={sx.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.navy} />
        </Pressable>
        <Text style={sx.title}>Sandbox</Text>
        <Pressable onPress={() => setSavedOpen(true)} hitSlop={10} style={sx.savedBtn}>
          <Ionicons name="bookmark-outline" size={18} color={C.teal} />
          {saved.length ? <Text style={sx.savedCount}>{saved.length}</Text> : null}
        </Pressable>
      </View>
      <View style={sx.switchRow}>
        {[
          ['draw', 'Draw'],
          ['lookup', 'Look up'],
        ].map(([id, label]) => (
          <Pressable
            key={id}
            onPress={() => setTab(id)}
            style={[sx.tab, tab === id && sx.tabOn]}
          >
            <Text style={[sx.tabTxt, tab === id && sx.tabTxtOn]}>{label}</Text>
          </Pressable>
        ))}
        <Pressable
          onPress={() => setStereoStyle((s) => (s === 'ez' ? 'cistrans' : 'ez'))}
          style={sx.smallBtn}
        >
          <Text style={sx.smallTxt}>{stereoStyle === 'ez' ? 'E/Z' : 'cis/trans'}</Text>
        </Pressable>
        <View style={sx.explainWrap}>
          <Text style={sx.explainLabel}>Explain</Text>
          <Switch
            value={explain}
            onValueChange={setExplain}
            trackColor={{ true: C.teal, false: C.track }}
            thumbColor="#fff"
          />
        </View>
      </View>

      <SavedSheet
        visible={savedOpen}
        saved={saved}
        onClose={() => setSavedOpen(false)}
        onOpen={(m) => {
          setHandoff({ mol: m.graph, ts: Date.now() });
          setTab('draw');
          setSavedOpen(false);
        }}
        onDelete={(id) => dispatch({ type: 'deleteMolecule', id })}
      />

      {tab === 'draw' ? (
        <DrawView
          width={width}
          explain={explain}
          stereoStyle={stereoStyle}
          seed={handoff}
          onSave={(name, graph) => dispatch({ type: 'saveMolecule', name, graph })}
        />
      ) : (
        <LookupView
          width={width}
          explain={explain}
          stereoStyle={stereoStyle}
          onEditStructure={(mol) => {
            setHandoff({ mol, ts: Date.now() });
            setTab('draw');
          }}
        />
      )}
    </Screen>
  );
}

// Saved molecules live in app state, so they survive a restart.
function SavedSheet({ visible, saved, onClose, onOpen, onDelete }) {
  return (
    <SheetOverlay visible={visible} onClose={onClose} anchor="bottom">
      <View style={sx.sheetBackdrop}>
        <View style={sx.sheet}>
          <View style={sx.sheetHead}>
            <Text style={[T.h3, { flex: 1 }]}>Saved molecules</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={C.sub} />
            </Pressable>
          </View>
          {saved.length === 0 ? (
            <Text style={[T.sub, { paddingVertical: 22, textAlign: 'center' }]}>
              Nothing saved yet. Draw something, then choose Save from the More menu.
            </Text>
          ) : (
            <ScrollView style={{ maxHeight: 380 }}>
              {saved.map((m) => (
                <Pressable key={m.id} style={sx.savedRow} onPress={() => onOpen(m)}>
                  {/* the structure itself, so the list is scannable by shape
                      rather than by reading every name */}
                  <View style={sx.savedThumb}>
                    <StaticMol mol={m.graph} width={64} showCarbons={false} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[T.body, { fontWeight: '700' }]} numberOfLines={1}>
                      {formatFormulas(m.name)}
                    </Text>
                    <Text style={T.tiny}>{new Date(m.ts).toLocaleDateString()}</Text>
                  </View>
                  <Pressable onPress={() => onDelete(m.id)} hitSlop={8} accessibilityLabel={`delete ${m.name}`}>
                    <Ionicons name="trash-outline" size={18} color={C.danger} />
                  </Pressable>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </SheetOverlay>
  );
}

function SandboxLocked({ openRedeem }) {
  return (
    <Screen style={sx.paper}>
      <Header title="Sandbox" />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <Card style={{ marginTop: 10, alignItems: 'center', paddingVertical: 26 }}>
          <MaterialCommunityIcons name="flask-outline" size={44} color={C.teal} />
          <Text style={[T.h2, { marginTop: 12, textAlign: 'center' }]}>
            Sandbox is a Plus feature
          </Text>
          <Text style={[T.sub, { textAlign: 'center', marginTop: 8 }]}>
            Draw any structure and see it named as you build, or type any name and watch it drawn —
            with every part of the name explained.
          </Text>
        </Card>
        <Card style={{ marginTop: 14 }}>
          <Text style={[T.tiny, { fontWeight: '800' }]}>STRUCTURA PLUS</Text>
          <Text style={[T.h2, { marginTop: 6 }]}>
            {PRICE.monthly}
            <Text style={T.tiny}> {PRICE.period}</Text>
          </Text>
          <Text style={[T.sub, { marginTop: 8 }]}>
            Every lesson stays free. Plus adds the sandbox, adaptive practice, exam mode and deep
            analytics.
          </Text>
          <Pressable onPress={openRedeem} style={{ marginTop: 14 }}>
            <Text style={{ color: C.teal, fontWeight: '700', fontSize: 14 }}>
              Have an access code?
            </Text>
          </Pressable>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const sx = StyleSheet.create({
  // The sandbox is a sheet of paper, so its safe-area bands are white rather
  // than the app's off-white background — otherwise the canvas looks like a
  // panel sitting on a page instead of the page itself.
  paper: { backgroundColor: '#FFFFFF' },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 4, paddingBottom: 8 },
  backBtn: { width: 32 },
  title: { flex: 1, fontSize: 18, fontWeight: '800', color: C.navy },
  savedBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  savedCount: { fontSize: 12, fontWeight: '800', color: C.teal },
  sheetBackdrop: {},
  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 18,
    paddingBottom: 30,
  },
  sheetHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  savedThumb: {
    width: 72,
    height: 54,
    borderRadius: 8,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  switchRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 8 },
  explainWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' },
  explainLabel: { fontSize: 12.5, fontWeight: '700', color: C.teal },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: R.sm,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  tabOn: { backgroundColor: C.teal, borderColor: C.teal },
  tabTxt: { fontWeight: '700', color: C.sub, fontSize: 13 },
  tabTxtOn: { color: '#fff' },
  smallBtn: {
    paddingHorizontal: 9,
    paddingVertical: 7,
    justifyContent: 'center',
    borderRadius: R.sm,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  smallTxt: { fontSize: 11, fontWeight: '800', color: C.sub },
  explainWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  explainLabel: { fontSize: 12, fontWeight: '700', color: C.teal },
  track: {
    width: 38,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.track,
    padding: 2,
    justifyContent: 'center',
  },
  trackOn: { backgroundColor: C.teal },
  knob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' },
  knobOn: { alignSelf: 'flex-end' },
});
