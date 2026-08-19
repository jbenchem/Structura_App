// ─────────────────────────────────────────────────────────────
// AccuracyRing and LessonBadge.
//
// The ring is used twice at different sizes: large on the results screen, and
// small beside each lesson in the unit list so a learner can see at a glance
// how a lesson went. A perfect score turns it gold, which is the only place
// gold appears — so it reads as an award rather than a colour.
//
// The badge is generated from the unit's topic: the molecule drawn inside it
// is a real structure for that family, not an illustration.
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { C, T } from '../theme';
import { StaticMol } from '../sandbox/render';
import { TOPIC_MOLECULE } from '../content/lessonIcons';

export const GOLD = '#C9911F';

export function AccuracyRing({ pct, size = 132, stroke = 12, label = 'Accuracy', compact = false }) {
  const value = Math.max(0, Math.min(100, Math.round(pct)));
  const perfect = value === 100;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  // A ring that reads zero is indistinguishable from one that was never
  // attempted, so a sliver is always shown.
  const shown = value === 0 ? 0.02 : value / 100;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.border} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={perfect ? GOLD : C.teal}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference * shown} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text
        style={[
          ar.value,
          { fontSize: size * 0.26, color: perfect ? GOLD : C.navy },
        ]}
      >
        {value}%
      </Text>
      {!compact && label ? <Text style={ar.label}>{label}</Text> : null}
    </View>
  );
}

// The hero mark on the results screen: a representative molecule for the unit's
// family, in a tinted disc, with a tick.
export function LessonBadge({ topic, size = 132, done = true }) {
  const spec = TOPIC_MOLECULE[topic] || TOPIC_MOLECULE.alkanes;
  return (
    <View style={{ width: size, height: size }}>
      <View style={[lb.disc, { width: size, height: size, borderRadius: size / 2, backgroundColor: spec.tint }]}>
        {/* StaticMol fits the molecule inside its own box with padding, so a
            width smaller than the disc left the structure looking lost in it.
            Overdrawing and clipping to the circle fills the mark properly. */}
        <StaticMol mol={spec.mol} width={size * 1.35} showCarbons={!!spec.showCarbons} />
      </View>
      {done ? (
        <View style={lb.tick}>
          <Ionicons name="checkmark" size={16} color="#fff" />
        </View>
      ) : null}
    </View>
  );
}

const ar = StyleSheet.create({
  value: { fontWeight: '800', letterSpacing: -0.5 },
  label: { fontSize: 12.5, color: C.sub, marginTop: 2 },
});

const lb = StyleSheet.create({
  disc: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  tick: {
    position: 'absolute',
    right: 0,
    bottom: 6,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.teal,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: C.bg,
  },
});
