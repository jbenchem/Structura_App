// ─────────────────────────────────────────────────────────────
// Canvas bottom dock.
//
// Five tabs — Bond · Atom · Ring · Edit · More — each revealing a
// panel above the dock. Shared by the sandbox and by question
// screens, which hide the tabs they do not need via `tabs`.
//
// Tool exclusivity (CHECKLIST 5a) is enforced HERE so every caller
// gets the same behaviour: arming a ring clears the bond type,
// picking a bond type disarms the ring tool, changing
// the element deselects, and any drawing tool cancels erase. Tools
// stay armed after use; Deselect in More stands everything down.
// ─────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import Svg, { Line, Polygon, Circle, Path } from 'react-native-svg';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { C as T_ } from '../theme';
import { C, BOND_TYPES, ELEMENTS, TEMPLATES, elColour } from './constants';
import { tap } from './haptics';

// The Edit tray as data, so its contents can be asserted rather than
// inferred from a rendered tree that is only built when the tab is open.
// Deliberately does NOT include "Add carbon": carbons are added by tapping
// the canvas by holding to draw a chain, and a second route confused the model.
export function editItems({ eraseOn, onToggleErase, onClean, canClean, onUndo, canUndo, onRedo, canRedo, onClear }) {
  return [
    {
      id: 'erase',
      label: 'Erase',
      icon: 'eraser',
      active: !!eraseOn,
      onPress: () => {
        tap();
        onToggleErase && onToggleErase();
      },
    },
    { id: 'clean', label: 'Clean', icon: 'broom', disabled: !canClean, onPress: () => canClean && onClean && onClean() },
    { id: 'undo', label: 'Undo', icon: 'arrow-undo-outline', disabled: !canUndo, onPress: () => canUndo && onUndo && onUndo() },
    { id: 'redo', label: 'Redo', icon: 'arrow-redo-outline', disabled: !canRedo, onPress: () => canRedo && onRedo && onRedo() },
    {
      id: 'clear',
      label: 'Clear',
      icon: 'trash-outline',
      onPress: () => {
        tap();
        onClear && onClear();
      },
    },
  ];
}

const TAB_META = {
  bond: { label: 'Bond', icon: 'minus' },
  atom: { label: 'Atom', icon: 'hexagon-outline' },
  ring: { label: 'Ring', icon: 'hexagon-outline' },
  edit: { label: 'Edit', icon: 'pencil-outline' },
  more: { label: 'More', icon: 'dots-horizontal' },
};

export function CanvasDock({
  tabs = ['bond', 'atom', 'ring', 'edit', 'more'],
  // bond
  bondType,
  setBondType,
  // atom
  element,
  setElement,
  showCarbons,
  setShowCarbons,
  // ring
  ringTool,
  setRingTool,
  // edit
  eraseOn,
  onToggleErase,
  onClean,
  canClean,
  onUndo,
  canUndo,
  onRedo,
  canRedo,
  onClear,
  // more
  moreItems = [],
  // shared
  onDeselect,
}) {
  const [open, setOpen] = useState(null);

  const toggle = (id) => {
    tap();
    setOpen((o) => (o === id ? null : id));
  };

  // ── exclusivity handlers ───────────────────────────────────
  const pickBond = (id) => {
    tap();
    setBondType(id);
    setRingTool && setRingTool(null);
    eraseOn && onToggleErase && onToggleErase();
  };
  const pickElement = (e) => {
    tap();
    setElement(element === e ? 'C' : e);
    onDeselect && onDeselect();
    eraseOn && onToggleErase && onToggleErase();
  };
  const pickRing = (id) => {
    tap();
    setRingTool(ringTool === id ? null : id);
    setBondType && setBondType(null);
    eraseOn && onToggleErase && onToggleErase();
  };

  return (
    <View>
      {/* ── panel ── */}
      {open === 'bond' && (
        <Panel>
          {BOND_TYPES.map((t) => (
            <Item
              key={t.id}
              active={bondType === t.id}
              label={cap(t.hint)}
              onPress={() => pickBond(t.id)}
            >
              <BondGlyph type={t.id} active={bondType === t.id} />
            </Item>
          ))}
        </Panel>
      )}

      {open === 'atom' && (
        <Panel scroll>
          {ELEMENTS.map((e) => {
            const active = element === e;
            return (
              <Pressable
                key={e}
                onPress={() => pickElement(e)}
                style={[d.elBtn, active && d.elBtnOn]}
              >
                <Text style={[d.elTxt, { color: active ? T_.teal : elColour(e) }]}>{e}</Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => {
              tap();
              setShowCarbons(!showCarbons);
            }}
            style={[d.elBtn, showCarbons && d.elBtnOn]}
          >
            <Text style={[d.elTxt, { fontSize: 13, color: showCarbons ? T_.teal : T_.sub }]}>
              All
            </Text>
          </Pressable>
        </Panel>
      )}

      {open === 'ring' && (
        <Panel>
          {TEMPLATES.map((t) => (
            <Item
              key={t.id}
              active={ringTool === t.id}
              label={t.label}
              onPress={() => pickRing(t.id)}
            >
              <RingGlyph n={t.n} aromatic={t.aromatic} active={ringTool === t.id} />
            </Item>
          ))}
        </Panel>
      )}

      {open === 'edit' && (
        <Panel>
          {editItems({ eraseOn, onToggleErase, onClean, canClean, onUndo, canUndo, onRedo, canRedo, onClear }).map(
            (it) => (
              <Item key={it.id} active={it.active} label={it.label} disabled={it.disabled} onPress={it.onPress}>
                {it.icon === 'eraser' ? (
                  <MaterialCommunityIcons name="eraser" size={20} color={it.active ? T_.teal : T_.navy} />
                ) : it.icon === 'broom' ? (
                  <MaterialCommunityIcons name="broom" size={20} color={T_.navy} />
                ) : (
                  <Ionicons
                    name={it.icon}
                    size={19}
                    color={it.id === 'clear' ? T_.danger : T_.navy}
                  />
                )}
              </Item>
            )
          )}
        </Panel>
      )}

      {open === 'more' && moreItems.length > 0 && (
        <View style={d.morePanel}>
          <View style={d.moreGrid}>
            {moreItems.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => {
                  tap();
                  m.onPress();
                  setOpen(null);
                }}
                style={d.moreItem}
              >
                <Ionicons name={m.icon} size={17} color={T_.navy} />
                <Text style={d.moreTxt}>{m.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* ── dock ── */}
      <View style={d.dock}>
        {tabs.map((id) => {
          const meta = TAB_META[id];
          const active = open === id;
          return (
            <Pressable key={id} onPress={() => toggle(id)} style={d.tabWrap}>
              <View style={[d.tab, active && d.tabOn]}>
                <DockIcon id={id} active={active} />
                <Text style={[d.tabTxt, active && { color: T_.teal }]}>{meta.label}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ── pieces ───────────────────────────────────────────────────
function Panel({ children, scroll }) {
  if (scroll)
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={d.panel}
      >
        {children}
      </ScrollView>
    );
  return <View style={d.panel}>{children}</View>;
}

function Item({ children, label, active, onPress, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[d.item, active && d.itemOn, disabled && { opacity: 0.35 }]}
    >
      <View style={d.itemGlyph}>{children}</View>
      <Text style={[d.itemTxt, active && { color: T_.teal }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function DockIcon({ id, active }) {
  const col = active ? T_.teal : T_.navy;
  if (id === 'bond')
    return (
      <Svg width={22} height={16}>
        <Line x1={3} y1={5} x2={19} y2={5} stroke={col} strokeWidth={2} strokeLinecap="round" />
        <Line x1={3} y1={11} x2={19} y2={11} stroke={col} strokeWidth={2} strokeLinecap="round" />
      </Svg>
    );
  if (id === 'atom')
    return <Text style={{ fontSize: 16, fontWeight: '800', color: col }}>C</Text>;
  if (id === 'ring') return <RingGlyph n={6} active={active} size={20} />;
  if (id === 'edit') return <Ionicons name="pencil-outline" size={18} color={col} />;
  return <Ionicons name="ellipsis-horizontal" size={18} color={col} />;
}

function BondGlyph({ type, active }) {
  const col = active ? T_.teal : T_.navy;
  if (type === 'wedge')
    return (
      <Svg width={26} height={16}>
        <Polygon points="3,8 23,3 23,13" fill={col} />
      </Svg>
    );
  if (type === 'dash')
    return (
      <Svg width={26} height={16}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Line
            key={i}
            x1={4 + i * 4.4}
            y1={8 - (2 + i * 0.9)}
            x2={4 + i * 4.4}
            y2={8 + (2 + i * 0.9)}
            stroke={col}
            strokeWidth={1.7}
            strokeLinecap="round"
          />
        ))}
      </Svg>
    );
  const n = type === 'single' ? 1 : type === 'double' ? 2 : 3;
  const gap = 4;
  return (
    <Svg width={26} height={16}>
      {Array.from({ length: n }).map((_, i) => {
        const y = 8 + (i - (n - 1) / 2) * gap;
        return (
          <Line key={i} x1={3} y1={y} x2={23} y2={y} stroke={col} strokeWidth={2} strokeLinecap="round" />
        );
      })}
    </Svg>
  );
}

function RingGlyph({ n, aromatic, active, size = 26 }) {
  const col = active ? T_.teal : T_.navy;
  const R = size / 2 - 2;
  const c = size / 2;
  const pts = Array.from({ length: n }, (_, i) => {
    const t = -Math.PI / 2 + i * ((2 * Math.PI) / n);
    return `${(c + R * Math.cos(t)).toFixed(1)},${(c + R * Math.sin(t)).toFixed(1)}`;
  }).join(' ');
  return (
    <Svg width={size} height={size}>
      <Polygon points={pts} fill="none" stroke={col} strokeWidth={1.9} strokeLinejoin="round" />
      {aromatic && <Circle cx={c} cy={c} r={R * 0.52} fill="none" stroke={col} strokeWidth={1.6} />}
    </Svg>
  );
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const d = StyleSheet.create({
  panel: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 10,
    alignItems: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.97)',
    marginHorizontal: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T_.border,
    marginBottom: 6,
    shadowColor: '#12293E',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  item: {
    flex: 1,
    minWidth: 58,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: T_.border,
    backgroundColor: T_.card,
  },
  itemOn: { borderColor: T_.teal, backgroundColor: T_.tealSoft },
  itemGlyph: { height: 22, justifyContent: 'center' },
  itemTxt: { fontSize: 10.5, fontWeight: '700', color: T_.sub },
  elBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: T_.border,
    backgroundColor: T_.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  elBtnOn: { borderColor: T_.teal, backgroundColor: T_.tealSoft },
  elTxt: { fontSize: 16, fontWeight: '800' },
  morePanel: { alignItems: 'flex-end', paddingHorizontal: 4, paddingBottom: 8 },
  moreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: T_.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T_.border,
    padding: 6,
    shadowColor: '#12293E',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    width: 250,
  },
  moreItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  moreTxt: { fontSize: 12.5, fontWeight: '600', color: T_.navy },
  dock: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: T_.border,
    backgroundColor: 'rgba(255,255,255,0.97)',
    paddingTop: 6,
    paddingBottom: 6,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#12293E',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
    elevation: 8,
  },
  tabWrap: { flex: 1, alignItems: 'center' },
  tab: {
    alignItems: 'center',
    gap: 3,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  tabOn: { backgroundColor: T_.tealSoft, borderWidth: 1.5, borderColor: T_.teal },
  tabTxt: { fontSize: 10, fontWeight: '700', color: T_.sub },
});
