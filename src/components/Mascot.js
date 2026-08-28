// ─────────────────────────────────────────────────────────────
// The mascot — a round-bottom flask with a face, from the design boards.
//
// One drawing, three poses (differing only in the arm path and bubble
// count), rendered entirely in SVG so it costs nothing and matches the
// theme's teal. It enters with a single 240ms rise-and-fade driven by core
// Animated, then HOLDS STILL: no continuous bobbing, ever — a looping
// animation beside every hero card is charm on day one and noise by day
// three. Reduced-motion users get the settled state immediately.
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import { Animated, AccessibilityInfo } from 'react-native';
import Svg, { Path, Circle, Ellipse, G } from 'react-native-svg';
import { C } from '../theme';

const ARMS = {
  // A small wave, a thumbs-up-ish point, both hands up.
  wave: 'M52 44 Q62 38 64 28',
  point: 'M52 42 Q64 40 68 34',
  celebrate: 'M50 40 Q58 28 56 22 M18 40 Q10 28 12 22',
};

export function Mascot({ size = 72, pose = 'wave', style }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled?.().then((reduced) => {
      if (!mounted) return;
      if (reduced) anim.setValue(1);
      else Animated.timing(anim, { toValue: 1, duration: 240, useNativeDriver: true }).start();
    }).catch(() => anim.setValue(1));
    return () => { mounted = false; };
  }, [anim]);

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        style,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
        },
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 72 72">
        {/* neck and bulb */}
        <Path
          d="M30 12 h12 v14 c8 4 13 11 13 19 a19 19 0 0 1 -38 0 c0 -8 5 -15 13 -19 z"
          fill="#FFFFFF"
          stroke={C.navy}
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
        {/* liquid */}
        <Path
          d="M20.5 46 a15.5 15.5 0 0 0 31 0 q-8 4 -15.5 0 t-15.5 0 z"
          fill={C.teal}
          opacity={0.85}
        />
        {/* face */}
        <Circle cx={30} cy={40} r={2.2} fill={C.navy} />
        <Circle cx={42} cy={40} r={2.2} fill={C.navy} />
        <Path d="M31 46 q5 4 10 0" stroke={C.navy} strokeWidth={2} fill="none" strokeLinecap="round" />
        {/* arm(s) for the pose */}
        <Path d={ARMS[pose] || ARMS.wave} stroke={C.navy} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        {/* escaping bubbles */}
        <G fill="none" stroke={C.teal} strokeWidth={1.8}>
          <Circle cx={48} cy={12} r={2.4} />
          <Circle cx={54} cy={7} r={1.6} />
          {pose === 'celebrate' ? <Circle cx={20} cy={9} r={1.8} /> : null}
        </G>
        {/* mouth of the flask */}
        <Ellipse cx={36} cy={12} rx={7} ry={2.4} fill="#FFFFFF" stroke={C.navy} strokeWidth={2.5} />
      </Svg>
    </Animated.View>
  );
}
