// ─────────────────────────────────────────────────────────────
// The mascot — a round-bottom flask with a face, from the design boards.
//
// Pure react-native-svg, ~15 nodes, no animation of its own (entrances are
// the caller's Animated.View, honouring reduced motion). It appears at
// "you are here" on the Learn terrain and beside the Home hero — small
// doses of character, never a decoration on serious feedback.
// ─────────────────────────────────────────────────────────────

import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { C } from '../theme';

const INK = '#123A4A';
const LIQ = '#7FD4CD';

// pose: 'wave' raises one arm; anything else stands neutral. More poses can
// join without callers changing.
export function Mascot({ size = 64, pose = 'wave', style }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" style={style}>
      {/* escaping bubbles */}
      <Circle cx={45} cy={9} r={2.2} stroke={C.teal} strokeWidth={1.6} fill="none" />
      <Circle cx={50} cy={15} r={1.6} stroke={C.teal} strokeWidth={1.4} fill="none" />
      <Circle cx={42} cy={15} r={1.2} stroke={C.teal} strokeWidth={1.2} fill="none" />

      {/* neck and lip */}
      <Rect x={26} y={8} width={12} height={14} rx={3} fill="#FFFFFF" stroke={INK} strokeWidth={2.5} />
      <Rect x={24} y={5} width={16} height={5} rx={2.5} fill="#FFFFFF" stroke={INK} strokeWidth={2.5} />

      {/* body */}
      <Circle cx={32} cy={39} r={19} fill="#FFFFFF" stroke={INK} strokeWidth={3} />
      {/* liquid: the lower segment of the body circle, chord at y=41 */}
      <Path d="M 13.1 41 A 18.9 18.9 0 0 0 50.9 41 Z" fill={LIQ} />

      {/* face floats above the liquid line */}
      <Circle cx={26} cy={36} r={2.1} fill={INK} />
      <Circle cx={38} cy={36} r={2.1} fill={INK} />
      <Path d="M 26.5 41.5 Q 32 45.5 37.5 41.5" stroke={INK} strokeWidth={2} strokeLinecap="round" fill="none" />

      {/* the wave */}
      {pose === 'wave' ? (
        <>
          <Path d="M 49.5 32 Q 56 28 56 21" stroke={INK} strokeWidth={2.5} strokeLinecap="round" fill="none" />
          <Circle cx={56} cy={19.5} r={2.6} fill="#FFFFFF" stroke={INK} strokeWidth={2} />
        </>
      ) : null}
    </Svg>
  );
}
