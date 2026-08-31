// ─────────────────────────────────────────────────────────────
// Catalyst Cat — state configuration. Pure data, no React.
//
// Each state lists its LAYERS (each a full 280 × 310 canvas, stacked) and
// each layer's MOTIONS. A motion is one animatable property driven by one
// progress value over one cycle: keyframes are [time 0..1, value] pairs
// transcribed from the sheet's @keyframes, the duration is the sheet's
// animation duration, and `plays` says how many cycles ('loop', or a
// count). Pivots are the sheet's fill-box transform-origins converted to
// canvas coordinates, so a wave rotates about the shoulder, not the canvas.
//
// Being data, this is what the suite tests: durations match the brief,
// the streak gap survives every frame, no state can loop the celebration.
// ─────────────────────────────────────────────────────────────

const DEG = (n) => `${n}deg`;

// Motion primitives, straight from the sheet ─────────────────
export const MOTION = {
  blink: { prop: 'scaleY', pivot: { x: 136.5, y: 124 }, duration: 5400, plays: 'loop',
    keyframes: [[0, 1], [0.43, 1], [0.45, 0.08], [0.47, 1], [1, 1]] },
  tail: { prop: 'rotate', pivot: { x: 184, y: 222 }, duration: 2900, plays: 'loop',
    keyframes: [[0, DEG(-4)], [0.5, DEG(8)], [1, DEG(-4)]] },
  breathe: { prop: 'translateY', duration: 3400, plays: 'loop',
    keyframes: [[0, 0], [0.5, -2], [1, 0]] },
  wave: { prop: 'rotate', pivot: { x: 91, y: 178 }, duration: 1700, plays: 2,
    keyframes: [[0, DEG(-10)], [0.45, DEG(16)], [1, DEG(-10)]] },
  thinkRotate: { prop: 'rotate', pivot: { x: 138, y: 151 }, duration: 3800, plays: 'loop',
    keyframes: [[0, DEG(0)], [0.45, DEG(-4)], [0.65, DEG(-4)], [1, DEG(0)]] },
  thinkLift: { prop: 'translateY', duration: 3800, plays: 'loop',
    keyframes: [[0, 0], [0.45, -2], [0.65, -2], [1, 0]] },
  gogglesLift: { prop: 'translateY', duration: 3800, plays: 'loop',
    keyframes: [[0, 0], [0.5, -3], [1, 0]] },
  bounce: { prop: 'translateY', duration: 2250, plays: 1,
    keyframes: [[0, 0], [0.34, -8], [0.56, 0], [1, 0]] },
  pawLeft: { prop: 'rotate', pivot: { x: 95, y: 182 }, duration: 2250, plays: 1,
    keyframes: [[0, DEG(0)], [0.34, DEG(-10)], [1, DEG(0)]] },
  pawRight: { prop: 'rotate', pivot: { x: 177, y: 182 }, duration: 2250, plays: 1,
    keyframes: [[0, DEG(0)], [0.34, DEG(10)], [1, DEG(0)]] },
  confettiFade: { prop: 'opacity', duration: 2250, plays: 1,
    keyframes: [[0, 0], [0.16, 0], [0.34, 1], [0.72, 0], [1, 0]] },
  confettiRiseA: { prop: 'translateY', duration: 2250, plays: 1,
    keyframes: [[0, 12], [0.16, 12], [0.72, -13], [1, -13]] },
  confettiSpinA: { prop: 'rotate', duration: 2250, plays: 1,
    keyframes: [[0, DEG(0)], [0.16, DEG(0)], [0.72, DEG(28)], [1, DEG(28)]] },
  confettiRiseB: { prop: 'translateY', duration: 2250, plays: 1, delay: 180,
    keyframes: [[0, 10], [0.16, 10], [0.72, -15], [1, -15]] },
  confettiSpinB: { prop: 'rotate', duration: 2250, plays: 1, delay: 180,
    keyframes: [[0, DEG(0)], [0.16, DEG(0)], [0.72, DEG(-24)], [1, DEG(-24)]] },
  confettiRiseC: { prop: 'translateY', duration: 2250, plays: 1, delay: 340,
    keyframes: [[0, 10], [0.16, 10], [0.72, -14], [1, -14]] },
  confettiSpinC: { prop: 'rotate', duration: 2250, plays: 1, delay: 340,
    keyframes: [[0, DEG(0)], [0.16, DEG(0)], [0.72, DEG(22)], [1, DEG(22)]] },
  point: { prop: 'rotate', pivot: { x: 181, y: 186 }, duration: 2800, plays: 2,
    keyframes: [[0, DEG(0)], [0.22, DEG(0)], [0.38, DEG(-5)], [0.54, DEG(1)], [1, DEG(0)]] },
  nodRotate: { prop: 'rotate', pivot: { x: 135, y: 181 }, duration: 3000, plays: 1,
    keyframes: [[0, DEG(0)], [0.25, DEG(0)], [0.4, DEG(3)], [0.55, DEG(-1)], [1, DEG(0)]] },
  nodDip: { prop: 'translateY', duration: 3000, plays: 1,
    keyframes: [[0, 0], [0.25, 0], [0.4, 2], [0.55, 0], [1, 0]] },
  checkScale: { prop: 'scale', pivot: { x: 218, y: 126 }, duration: 3000, plays: 1,
    keyframes: [[0, 0.94], [0.2, 0.94], [0.38, 1], [0.68, 1], [1, 0.94]] },
  checkFade: { prop: 'opacity', duration: 3000, plays: 1,
    keyframes: [[0, 0.78], [0.2, 0.78], [0.38, 1], [0.68, 1], [1, 0.78]] },
  reassure: { prop: 'translateY', duration: 3600, plays: 1,
    keyframes: [[0, 0], [0.5, -2], [1, 0]] },
  breatheOnce: { prop: 'translateY', duration: 3600, plays: 1,
    keyframes: [[0, 0], [0.5, -2], [1, 0]] },
  glance: { prop: 'translateX', duration: 4000, plays: 'loop',
    keyframes: [[0, 0], [0.24, 0], [0.38, 3], [0.58, 3], [0.72, 0], [1, 0]] },
  worryPaw: { prop: 'translateY', duration: 4000, plays: 'loop',
    keyframes: [[0, 0], [0.42, -2], [0.62, -2], [1, 0]] },
  flameHover: { prop: 'translateY', duration: 2400, plays: 'loop',
    keyframes: [[0, 0], [0.5, -2], [1, 0]] },
  flameFade: { prop: 'opacity', duration: 2400, plays: 'loop',
    keyframes: [[0, 0.75], [0.5, 1], [1, 0.75]] },
};

// Layers per state. `parts` are geometry component names; `motions` are
// MOTION keys; `sublayers` nest (the streak icon rides inside the paw layer
// so their alignment cannot drift).
export const STATES = {
  idle: {
    complete: null,
    layers: [
      { id: 'tail', testID: 'mascot-tail', parts: ['Tail'], motions: ['tail'] },
      { id: 'body', testID: 'mascot-body', parts: ['BodyCore', 'NeutralLeftArm', 'NeutralRightArm'], motions: ['breathe'] },
      { id: 'head', testID: 'mascot-head', parts: ['HeadShell'] },
      { id: 'eyes', testID: 'mascot-eyes', parts: ['Eyes'], motions: ['blink'] },
      { id: 'goggles', testID: 'mascot-goggles', parts: ['Goggles'] },
    ],
  },
  welcome: {
    complete: 'wave',
    layers: [
      { id: 'tail', testID: 'mascot-tail', parts: ['Tail'], motions: ['tail'] },
      { id: 'body', testID: 'mascot-body', parts: ['BodyCore', 'NeutralRightArm', 'WaveMarks'] },
      { id: 'left-paw', testID: 'mascot-left-paw', parts: ['WaveArm'], motions: ['wave'] },
      { id: 'head', testID: 'mascot-head', parts: ['HeadShell', 'Smile:welcome'] },
      { id: 'eyes', testID: 'mascot-eyes', parts: ['Eyes'], motions: ['blink'] },
      { id: 'goggles', testID: 'mascot-goggles', parts: ['Goggles'] },
    ],
  },
  thinking: {
    complete: null,
    layers: [
      { id: 'tail', testID: 'mascot-tail', parts: ['Tail'], motions: ['tail'] },
      { id: 'body', testID: 'mascot-body', parts: ['BodyCore', 'NeutralRightArm', 'ThinkingArm'] },
      { id: 'head', testID: 'mascot-head', parts: ['HeadShell', 'Brows:thinking'], motions: ['thinkRotate', 'thinkLift'] },
      { id: 'eyes', testID: 'mascot-eyes', parts: ['Eyes'], motions: ['thinkRotate', 'thinkLift', 'blink'] },
      { id: 'goggles', testID: 'mascot-goggles', parts: ['Goggles'], motions: ['thinkRotate', 'thinkLift', 'gogglesLift'] },
    ],
  },
  celebrate: {
    complete: 'bounce',
    layers: [
      { id: 'confetti', testID: 'mascot-confetti', parts: [], sublayers: [
        { id: 'confetti-a', parts: ['ConfettiA'], motions: ['confettiFade', 'confettiRiseA', 'confettiSpinA'] },
        { id: 'confetti-b', parts: ['ConfettiB'], motions: ['confettiFade', 'confettiRiseB', 'confettiSpinB'] },
        { id: 'confetti-c', parts: ['ConfettiC'], motions: ['confettiFade', 'confettiRiseC', 'confettiSpinC'] },
      ] },
      { id: 'tail', testID: 'mascot-tail', parts: ['Tail'], motions: ['tail'] },
      { id: 'body', testID: 'mascot-body', parts: ['BodyCore'], motions: ['bounce'] },
      { id: 'left-paw', testID: 'mascot-left-paw', parts: ['CelebrateLeftPaw'], motions: ['bounce', 'pawLeft'] },
      { id: 'right-paw', testID: 'mascot-right-paw', parts: ['CelebrateRightPaw'], motions: ['bounce', 'pawRight'] },
      { id: 'head', testID: 'mascot-head', parts: ['HeadShell', 'HappyEyes', 'Smile:celebrate'], motions: ['bounce'] },
      { id: 'goggles', testID: 'mascot-goggles', parts: ['Goggles'], motions: ['bounce'] },
    ],
  },
  guide: {
    complete: 'point',
    layers: [
      { id: 'tail', testID: 'mascot-tail', parts: ['Tail'], motions: ['tail'] },
      { id: 'body', testID: 'mascot-body', parts: ['BodyCore', 'NeutralLeftArm'] },
      { id: 'right-paw', testID: 'mascot-right-paw', parts: ['PointArm'], motions: ['point'] },
      { id: 'head', testID: 'mascot-head', parts: ['HeadShell', 'Smile:guide'] },
      { id: 'eyes', testID: 'mascot-eyes', parts: ['Eyes'], motions: ['blink'] },
      { id: 'goggles', testID: 'mascot-goggles', parts: ['Goggles'] },
    ],
  },
  correct: {
    complete: 'nodRotate',
    layers: [
      { id: 'tail', testID: 'mascot-tail', parts: ['Tail'], motions: ['tail'] },
      { id: 'body', testID: 'mascot-body', parts: ['BodyCore', 'NeutralLeftArm', 'NeutralRightArm'] },
      { id: 'head', testID: 'mascot-head', parts: ['HeadShell', 'Smile:correct'], motions: ['nodRotate', 'nodDip'] },
      { id: 'eyes', testID: 'mascot-eyes', parts: ['Eyes'], motions: ['nodRotate', 'nodDip', 'blink'] },
      { id: 'goggles', testID: 'mascot-goggles', parts: ['Goggles'], motions: ['nodRotate', 'nodDip'] },
      { id: 'check', testID: 'mascot-check', parts: ['CheckIcon'], motions: ['checkScale', 'checkFade'] },
    ],
  },
  reassure: {
    complete: 'reassure',
    layers: [
      { id: 'tail', testID: 'mascot-tail', parts: ['Tail'], motions: ['tail'] },
      { id: 'body', testID: 'mascot-body', parts: ['BodyCore'], motions: ['breatheOnce'] },
      { id: 'right-arm', testID: 'mascot-right-paw', parts: ['NeutralRightArm'] },
      { id: 'left-paw', testID: 'mascot-left-paw', parts: ['ReassurePaw'], motions: ['reassure'] },
      { id: 'head', testID: 'mascot-head', parts: ['HeadShell', 'Brows:reassure', 'Smile:reassure'] },
      { id: 'eyes', testID: 'mascot-eyes', parts: ['Eyes'], motions: ['blink'] },
      { id: 'goggles', testID: 'mascot-goggles', parts: ['Goggles'] },
    ],
  },
  streakConcern: {
    complete: null,
    layers: [
      { id: 'tail', testID: 'mascot-tail', parts: ['Tail'] },
      { id: 'body', testID: 'mascot-body', parts: ['BodyCore', 'NeutralLeftArm'] },
      { id: 'streak-paw', testID: 'mascot-streak-paw', parts: ['StreakArm'], motions: ['worryPaw'], sublayers: [
        { id: 'streak-icon', testID: 'mascot-streak-icon', parts: ['StreakIcon'], motions: ['flameHover', 'flameFade'] },
      ] },
      { id: 'head', testID: 'mascot-head', parts: ['HeadShell', 'Brows:concern', 'Smile:concern'] },
      { id: 'eyes', testID: 'mascot-eyes', parts: ['Eyes'], motions: ['glance'] },
      { id: 'goggles', testID: 'mascot-goggles', parts: ['Goggles'] },
    ],
  },
};

export const STATE_NAMES = Object.keys(STATES);

// The single gate every animation passes through. Pure, so it is tested
// without a component: nothing moves unless all four are true.
export const shouldAnimate = ({ active, focused = true, appState = 'active', reducedMotion }) =>
  !!active && !!focused && appState === 'active' && !reducedMotion;

// Frame-0 sample of a motion — the static pose reduced motion shows.
export const restingValue = (motion) => MOTION[motion].keyframes[0][1];

// The streak gap, as arithmetic the suite can check on every frame: the icon
// rides the paw layer (shared translateY), and its own hover only ever
// moves it UP (values ≤ 0), so the gap never closes.
export const streakGapAtRest = (iconBottom, pawTop) => pawTop - iconBottom;
export const streakGapNeverCloses = () =>
  MOTION.flameHover.keyframes.every(([, v]) => v <= 0);
