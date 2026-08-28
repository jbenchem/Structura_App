// Shared UI primitives — cards, buttons, pills, option rows,
// progress bars, the mastery ring and the brand hexagon.

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Polygon, Line } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { C, R, T, shadow } from '../theme';

// ── Layout ───────────────────────────────────────────────────
// edges: which safe-area insets to apply. Main tab screens sit
// above the tab bar (which pads itself), so they default to top
// only; full-screen overlays pass ['top', 'bottom'] so their
// bottom buttons clear the home indicator / gesture bar.
export function Screen({ children, style, edges = ['top'] }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        st.screen,
        {
          paddingTop: edges.includes('top') ? Math.max(insets.top, 12) : 0,
          paddingBottom: edges.includes('bottom') ? Math.max(insets.bottom, 12) : 0,
        },
        style,
      ]}
    >
      <View style={st.screenInner}>{children}</View>
    </View>
  );
}

export function Header({ title, right }) {
  return (
    <View style={st.header}>
      <Text style={T.h2}>{title}</Text>
      <View>{right}</View>
    </View>
  );
}

// "Catalyst Plus" pill (top-right of main screens).
export function PlusPill({ isPremium, onPress }) {
  return (
    <Pressable onPress={onPress} style={st.plusPill} hitSlop={8}>
      <Ionicons name="diamond" size={12} color={C.teal} />
      <Text style={st.plusPillText}>
        {isPremium ? 'Catalyst Plus' : 'Get Plus'}
      </Text>
    </Pressable>
  );
}

// ── Surfaces ─────────────────────────────────────────────────
export function Card({ children, style, onPress, tint }) {
  const base = [
    st.card,
    tint === 'teal' && { backgroundColor: C.tealSoft, borderColor: C.tealBorder },
    tint === 'blue' && { backgroundColor: C.blueSoft, borderColor: '#CFE2FA' },
    tint === 'green' && { backgroundColor: C.greenSoft, borderColor: '#D8EDC4' },
    style,
  ];
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [base, pressed && { opacity: 0.85 }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={base}>{children}</View>;
}

export function Pill({ label, kind }) {
  const map = {
    complete: { bg: C.greenSoft, fg: C.greenText },
    progress: { bg: C.blueSoft, fg: C.blue },
    recommended: { bg: C.greenSoft, fg: C.greenText },
    plus: { bg: C.tealSoft, fg: C.teal },
    neutral: { bg: C.track, fg: C.sub },
  };
  const k = map[kind] || map.neutral;
  return (
    <View style={[st.pill, { backgroundColor: k.bg }]}>
      <Text style={[st.pillText, { color: k.fg }]}>{label}</Text>
    </View>
  );
}

// ── Buttons ──────────────────────────────────────────────────
export function PrimaryButton({ label, onPress, disabled, style }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        st.primaryBtn,
        pressed && { backgroundColor: C.tealDark },
        disabled && { backgroundColor: '#B9CDD2' },
        style,
      ]}
    >
      <Text style={st.primaryBtnText}>{label}</Text>
    </Pressable>
  );
}

export function LinkButton({ label, onPress, style, color }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={[{ alignItems: 'center' }, style]}>
      <Text style={[st.link, color && { color }]}>{label}</Text>
    </Pressable>
  );
}

// ── Selection ────────────────────────────────────────────────
// Option card with a radio on the right; selected → teal fill +
// green check, exactly like the onboarding mockups.
export function OptionCard({ icon, title, subtitle, selected, onPress, badge }) {
  return (
    <Pressable
      onPress={onPress}
      style={[st.option, selected && { backgroundColor: C.tealSoft, borderColor: C.teal }]}
    >
      {icon ? <View style={st.optionIcon}>{icon}</View> : null}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={T.h3}>{title}</Text>
          {badge ? <Pill label={badge} kind="recommended" /> : null}
        </View>
        {subtitle ? <Text style={[T.sub, { marginTop: 2 }]}>{subtitle}</Text> : null}
      </View>
      {selected ? (
        <Ionicons name="checkmark-circle" size={26} color={C.green} />
      ) : (
        <View style={st.radio} />
      )}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[st.chip, selected && { backgroundColor: C.tealSoft, borderColor: C.teal }]}
    >
      <Text style={[st.chipText, selected && { color: C.teal, fontWeight: '700' }]}>{label}</Text>
      {selected ? <Ionicons name="checkmark-circle" size={16} color={C.green} /> : null}
    </Pressable>
  );
}

export function Segmented({ options, value, onChange }) {
  return (
    <View style={st.segWrap}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            style={[st.segBtn, active && { backgroundColor: C.teal }]}
          >
            <Text style={[st.segText, active && { color: '#FFF', fontWeight: '700' }]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Progress ─────────────────────────────────────────────────
export function ProgressBar({ pct, color, height, style }) {
  return (
    <View style={[st.barTrack, { height: height || 8 }, style]}>
      <View
        style={{
          width: `${Math.round(Math.max(0, Math.min(1, pct)) * 100)}%`,
          backgroundColor: color || C.teal,
          borderRadius: 99,
          flex: 1,
        }}
      />
    </View>
  );
}

export function Ring({ size = 108, stroke = 11, pct = 0, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, pct));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={C.green}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c * p} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>{children}</View>
    </View>
  );
}

// Onboarding top bar: back chevron + "n of 3" + progress track.
export function StepBar({ step, total, onBack }) {
  return (
    <View style={{ marginBottom: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={onBack} hitSlop={12} style={{ width: 40 }}>
          <Ionicons name="chevron-back" size={24} color={C.navy} />
        </Pressable>
        <Text style={[T.sub, { flex: 1, textAlign: 'center', fontWeight: '600' }]}>
          {step} of {total}
        </Text>
        <View style={{ width: 40 }} />
      </View>
      <ProgressBar pct={step / total} height={5} style={{ marginTop: 12, marginHorizontal: 8 }} />
    </View>
  );
}

// ── Brand + decoration ───────────────────────────────────────
export function HexLogo({ size = 34 }) {
  const pts = hexPoints(size / 2, size / 2, size / 2 - 3);
  return (
    <Svg width={size} height={size}>
      <Polygon points={pts} fill="none" stroke={C.navy} strokeWidth={3} strokeLinejoin="round" />
      <Circle cx={size / 2} cy={size / 2} r={3.5} fill={C.teal} />
    </Svg>
  );
}

function hexPoints(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

// Decorative skeletal-molecule doodle for Welcome / paywall.
export function MoleculeDoodle({ width = 260, height = 120 }) {
  const n = [
    [10, 90], [50, 60], [90, 90], [130, 60], [170, 90], [210, 55], [250, 80],
  ];
  return (
    <Svg width={width} height={height} viewBox="0 0 260 120">
      {n.slice(0, -1).map((p, i) => (
        <Line
          key={i}
          x1={p[0]} y1={p[1]} x2={n[i + 1][0]} y2={n[i + 1][1]}
          stroke={C.navy} strokeWidth={2.5} strokeLinecap="round" opacity={0.85}
        />
      ))}
      <Line x1={130} y1={60} x2={130} y2={25} stroke={C.navy} strokeWidth={2.5} strokeLinecap="round" opacity={0.85} />
      {n.map((p, i) => (
        <Circle key={`c${i}`} cx={p[0]} cy={p[1]} r={6} fill={i % 2 ? C.teal : C.navy} opacity={0.9} />
      ))}
      <Circle cx={130} cy={22} r={6} fill={C.green} />
    </Svg>
  );
}

// Small tinted icon square used in feature lists / skill rows.
export function IconBadge({ name, color, bg, size = 34 }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        backgroundColor: bg || C.tealSoft,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={name} size={size * 0.5} color={color || C.teal} />
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────
const st = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  screenInner: { flex: 1, paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingBottom: 6,
  },
  plusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.tealSoft,
    borderColor: C.tealBorder,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
  },
  plusPillText: { color: C.teal, fontWeight: '700', fontSize: 12 },
  card: {
    backgroundColor: C.card,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    ...shadow,
  },
  pill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 99, alignSelf: 'flex-start' },
  pillText: { fontSize: 11, fontWeight: '700' },
  primaryBtn: {
    backgroundColor: C.teal,
    borderRadius: R.md,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  link: { color: C.teal, fontWeight: '600', fontSize: 14 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: R.lg,
    padding: 16,
    marginBottom: 14,
    ...shadow,
  },
  optionIcon: { width: 44, alignItems: 'center' },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.border,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.card,
    borderRadius: R.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chipText: { color: C.navy, fontSize: 13, fontWeight: '600' },
  segWrap: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.md,
    padding: 4,
    gap: 4,
  },
  segBtn: { flex: 1, paddingVertical: 10, borderRadius: R.sm, alignItems: 'center' },
  segText: { color: C.sub, fontWeight: '600', fontSize: 14 },
  barTrack: { backgroundColor: C.track, borderRadius: 99, overflow: 'hidden' },
});
