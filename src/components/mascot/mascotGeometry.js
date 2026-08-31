// ─────────────────────────────────────────────────────────────
// Catalyst Cat — geometry.
//
// Every path here is copied VERBATIM from the supplied character sheet
// (catalyst-cat-all-eight-preview.svg), which is the design authority. The
// canvas is 280 × 310; the head is 176 × 157 over an 87 × 86 torso
// (proportion lock in the sheet's metadata). Nothing is approximated from
// the raster, and nothing is redrawn — if a curve looks wrong, the sheet is
// wrong, and the fix is a new sheet.
//
// Shared parts (head, goggles, body, tail, eyes) exist ONCE and every state
// composes them; only arms, expressions, icons and particles are
// state-specific. A future proportion change touches one place.
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { Path, Circle, Ellipse, G } from 'react-native-svg';

export const CAT = {
  navy: '#102A56',
  teal: '#0A8F95',
  mint: '#E8F7F4',
  coral: '#F06C5C',
  coralSoft: '#FDE9E5',
  cream: '#FFF1D6',
  grey: '#A9B0B2',
  white: '#FFFFFF',
};

export const CANVAS = { w: 280, h: 310 };
export const VIEWBOX = '0 0 280 310';

// The sheet's two outline classes.
const OUTLINE = { stroke: CAT.navy, strokeWidth: 5.5, strokeLinecap: 'round', strokeLinejoin: 'round' };
const FINE = { stroke: CAT.navy, strokeWidth: 4, strokeLinecap: 'round', strokeLinejoin: 'round' };

// ── Shared parts ─────────────────────────────────────────────

export const HeadShell = React.memo(function HeadShell() {
  return (
    <G>
      <Path d="M58 83 L61 31 Q62 17 71 23 L100 50" fill={CAT.cream} {...OUTLINE} />
      <Path d="M214 83 L211 31 Q210 17 201 23 L172 50" fill={CAT.cream} {...OUTLINE} />
      <Path
        d="M136 42 C189 42 218 73 221 112 C224 150 199 172 163 177 C137 181 108 178 86 167 C60 155 48 136 49 114 C51 73 80 42 136 42Z"
        fill={CAT.grey}
        {...OUTLINE}
      />
      <Path
        d="M87 137 C98 126 117 127 136 136 C155 127 174 126 185 137 C194 146 190 164 174 170 C154 177 118 177 98 170 C82 164 78 146 87 137Z"
        fill={CAT.cream}
      />
      <Path d="M129 144 L143 144 L136 152Z" fill={CAT.navy} />
    </G>
  );
});

// One continuous laboratory visor: a single lens shape spanning both eyes,
// a headband arc, and side straps. It is never two spectacles.
export const Goggles = React.memo(function Goggles() {
  return (
    <G>
      <Path d="M55 87 C76 46 196 46 217 87" fill="none" {...FINE} />
      <Path
        d="M69 63 Q70 52 82 49 C101 45 119 47 130 55 Q136 60 142 55 C153 47 171 45 190 49 Q202 52 203 63 L201 78 Q200 88 190 92 C175 97 157 95 146 89 L140 84 Q136 80 132 84 L126 89 C115 95 97 97 82 92 Q72 89 71 79Z"
        fill={CAT.mint}
        {...FINE}
      />
      <Path d="M55 82 L71 76 M201 76 L217 82" fill="none" {...FINE} />
      <Path d="M82 59 Q101 50 122 57" fill="none" stroke={CAT.teal} strokeWidth={3.2} opacity={0.55} />
    </G>
  );
});

// The coat-free torso: the ONLY body the mascot has.
export const BodyCore = React.memo(function BodyCore() {
  return (
    <Path
      d="M101 169 C110 164 123 163 136 163 C149 163 162 164 171 169 C178 181 180 211 177 231 L176 246 Q175 254 167 255 H158 Q151 255 150 248 L148 235 H126 L124 248 Q123 255 116 255 H105 Q97 255 96 246 L95 232 C92 214 93 183 101 169Z"
      fill={CAT.grey}
      {...OUTLINE}
    />
  );
});

export const Tail = React.memo(function Tail() {
  return (
    <Path
      d="M174 218 C191 235 213 236 228 221 C238 211 241 196 234 187 C228 179 218 182 214 191 C211 199 217 205 209 211 C200 218 189 208 178 198Z"
      fill={CAT.grey}
      {...OUTLINE}
    />
  );
});

export const Eyes = React.memo(function Eyes() {
  return (
    <G fill={CAT.navy}>
      <Ellipse cx={99} cy={124} rx={10} ry={14} />
      <Ellipse cx={174} cy={124} rx={10} ry={14} />
    </G>
  );
});

export const GroundShadow = React.memo(function GroundShadow() {
  return <Ellipse cx={136} cy={263} rx={82} ry={10} fill={CAT.navy} opacity={0.09} />;
});

// ── Neutral arms ─────────────────────────────────────────────

export const NeutralLeftArm = React.memo(function NeutralLeftArm() {
  return (
    <Path
      d="M100 178 C88 181 81 190 77 202 C73 214 77 223 85 224 C94 224 99 218 96 210 C93 203 97 194 103 189Z"
      fill={CAT.grey}
      {...OUTLINE}
    />
  );
});

export const NeutralRightArm = React.memo(function NeutralRightArm() {
  return (
    <Path
      d="M172 178 C184 181 191 190 195 202 C199 214 195 223 187 224 C178 224 173 218 176 210 C179 203 175 194 169 189Z"
      fill={CAT.grey}
      {...OUTLINE}
    />
  );
});

// ── State-specific arms ──────────────────────────────────────

export const WaveArm = React.memo(function WaveArm() {
  return (
    <G>
      <Path
        d="M101 189 C84 184 65 171 51 154 C45 147 43 138 47 131 C51 123 61 121 68 127 C74 132 75 141 82 148 C90 156 98 160 106 163Z"
        fill={CAT.grey}
        {...OUTLINE}
      />
      <Circle cx={50} cy={135} r={2} fill={CAT.navy} />
      <Circle cx={55} cy={131} r={2} fill={CAT.navy} />
      <Circle cx={60} cy={135} r={2} fill={CAT.navy} />
      <Ellipse cx={55} cy={141} rx={4} ry={3} fill={CAT.cream} />
    </G>
  );
});

// The little motion marks beside the wave, static in the sheet.
export const WaveMarks = React.memo(function WaveMarks() {
  return (
    <Path
      d="M27 110 Q18 121 22 133 M34 103 Q25 106 22 113"
      fill="none"
      stroke={CAT.teal}
      strokeWidth={3}
      strokeLinecap="round"
      opacity={0.7}
    />
  );
});

export const ThinkingArm = React.memo(function ThinkingArm() {
  return (
    <Path
      d="M101 187 C91 181 84 172 82 162 C80 154 85 148 93 147 C101 146 106 152 106 159 C106 166 111 169 117 172 C124 176 125 184 120 189 C115 194 107 193 101 187Z"
      fill={CAT.grey}
      {...OUTLINE}
    />
  );
});

export const CelebrateLeftPaw = React.memo(function CelebrateLeftPaw() {
  return (
    <G>
      <Path
        d="M101 189 C84 181 69 165 58 148 C53 140 51 132 55 126 C59 119 68 119 74 125 C79 131 80 139 87 147 C94 155 101 159 108 162Z"
        fill={CAT.grey}
        {...OUTLINE}
      />
      <Circle cx={59} cy={132} r={2} fill={CAT.navy} />
      <Circle cx={64} cy={128} r={2} fill={CAT.navy} />
      <Circle cx={69} cy={132} r={2} fill={CAT.navy} />
    </G>
  );
});

export const CelebrateRightPaw = React.memo(function CelebrateRightPaw() {
  return (
    <G>
      <Path
        d="M171 189 C188 181 203 165 214 148 C219 140 221 132 217 126 C213 119 204 119 198 125 C193 131 192 139 185 147 C178 155 171 159 164 162Z"
        fill={CAT.grey}
        {...OUTLINE}
      />
      <Circle cx={213} cy={132} r={2} fill={CAT.navy} />
      <Circle cx={208} cy={128} r={2} fill={CAT.navy} />
      <Circle cx={203} cy={132} r={2} fill={CAT.navy} />
    </G>
  );
});

export const PointArm = React.memo(function PointArm() {
  return (
    <G>
      <Path
        d="M169 177 C184 177 197 175 210 168 C217 164 225 164 229 169 C233 174 231 181 225 184 C208 192 191 195 174 193Z"
        fill={CAT.grey}
        {...OUTLINE}
      />
      <Path d="M224 168 L234 165 M225 174 L237 174" fill="none" {...FINE} />
    </G>
  );
});

export const ReassurePaw = React.memo(function ReassurePaw() {
  return (
    <Path
      d="M101 181 C92 181 85 188 85 197 C85 204 90 208 96 206 C103 204 106 198 113 195 C120 192 122 185 118 180 C114 175 106 177 101 181Z"
      fill={CAT.grey}
      {...OUTLINE}
    />
  );
});

// The upturned paw beneath the hovering streak icon.
export const StreakArm = React.memo(function StreakArm() {
  return (
    <G>
      <Path
        d="M169 183 C184 185 194 194 203 204 C208 209 215 210 220 207 C224 204 229 206 230 211 C232 217 227 222 220 224 C210 226 201 219 194 213 C186 207 178 205 169 204Z"
        fill={CAT.grey}
        {...OUTLINE}
      />
      <Path d="M218 211 Q224 214 229 210" fill="none" {...FINE} />
    </G>
  );
});

// ── Expressions ──────────────────────────────────────────────

export const Smile = React.memo(function Smile({ d }) {
  return <Path d={d} fill="none" {...FINE} />;
});
export const SMILE = {
  welcome: 'M124 157 Q136 168 148 157',
  celebrate: 'M121 157 Q136 171 151 157',
  guide: 'M126 158 Q136 165 146 158',
  correct: 'M122 156 Q136 170 150 156',
  reassure: 'M126 158 Q136 165 146 158',
  concern: 'M129 161 Q136 154 143 161',
};

export const Brows = React.memo(function Brows({ d }) {
  return <Path d={d} fill="none" {...FINE} />;
});
export const BROWS = {
  thinking: 'M88 101 Q99 94 110 101 M163 99 Q174 92 185 99',
  reassure: 'M88 105 Q99 99 110 104 M163 104 Q174 99 185 105',
  concern: 'M88 106 Q99 97 110 103 M163 103 Q174 97 185 106',
};

// Closed, happy eyes for the celebration.
export const HappyEyes = React.memo(function HappyEyes() {
  return (
    <G fill="none" stroke={CAT.navy} strokeWidth={5.5} strokeLinecap="round">
      <Path d="M89 125 Q99 113 109 125" />
      <Path d="M164 125 Q174 113 184 125" />
    </G>
  );
});

// ── Symbols and particles ────────────────────────────────────

export const CheckIcon = React.memo(function CheckIcon() {
  return (
    <G>
      <Circle cx={218} cy={126} r={22} fill={CAT.teal} stroke={CAT.navy} strokeWidth={4} />
      <Path d="M208 126 L215 133 L228 117" fill="none" stroke={CAT.white} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
    </G>
  );
});

// Streak circle centre (226, 179), radius 22 — its bottom edge sits at
// y = 201, above the paw's top at y ≈ 204: the gap the design insists on.
export const STREAK_ICON = { cx: 226, cy: 179, r: 22 };
export const STREAK_PAW_TOP = 204;

export const StreakIcon = React.memo(function StreakIcon() {
  return (
    <G>
      <Circle cx={226} cy={179} r={22} fill={CAT.coralSoft} stroke={CAT.coral} strokeWidth={3} />
      <Path d="M226 193 C218 191 216 184 220 178 C223 174 225 171 226 165 C232 170 237 176 236 183 C236 190 232 193 226 193Z" fill={CAT.coral} />
      <Path d="M226 189 C222 187 222 183 224 180 C226 178 227 176 227 173 C231 176 232 180 231 183 C231 187 229 189 226 189Z" fill={CAT.cream} />
    </G>
  );
});

// Three confetti groups (A, B, C) exactly as the sheet stages them.
export const ConfettiA = React.memo(function ConfettiA() {
  return <Path d="M58 88 l-8 -14" stroke={CAT.coral} strokeWidth={6} strokeLinecap="round" fill="none" />;
});
export const ConfettiB = React.memo(function ConfettiB() {
  return (
    <G>
      <Path d="M96 61 l2 -17" stroke={CAT.teal} strokeWidth={6} strokeLinecap="round" fill="none" />
      <Circle cx={228} cy={108} r={6} fill={CAT.teal} />
    </G>
  );
});
export const ConfettiC = React.memo(function ConfettiC() {
  return <Path d="M211 85 l11 -12" stroke={CAT.coral} strokeWidth={6} strokeLinecap="round" fill="none" />;
});
