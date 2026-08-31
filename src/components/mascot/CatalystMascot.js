// ─────────────────────────────────────────────────────────────
// CatalystMascot — Cat, animated with core Animated only.
//
// Core Animated cannot native-drive SVG path properties, so the character
// is split into LAYERS: each layer is one full-canvas <Svg viewBox="0 0 280
// 310"> inside an absolutely positioned Animated.View, and the only things
// that ever animate are that View's transform and opacity, on the native
// driver. Path data, strokes, fills and the viewBox never change.
//
// Motions come from mascotStateConfig as keyframes over a 0→1 progress
// value: one Animated.timing per cycle, interpolated through the keyframe
// times, so the sheet's easing curves are reproduced without a library.
// Rotations pivot on the sheet's transform-origins via translate → rotate →
// translate-back around the layer's centre.
//
// Animation runs only while active, focused, foregrounded and NOT reduced
// motion; every loop is stopped and every listener removed on unmount, on
// state change, on backgrounding, and when `active` flips off. Under
// reduced motion the static frame-0 pose renders and nothing loops, blinks
// or bounces.
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Animated, Easing, AccessibilityInfo, AppState } from 'react-native';
import Svg from 'react-native-svg';
import * as Geo from './mascotGeometry';
import { STATES, MOTION, shouldAnimate } from './mascotStateConfig';

const { w: CW, h: CH } = Geo.CANVAS;

// A part name → element. "Smile:welcome" picks the smile path by key.
function renderPart(name, i) {
  const [kind, key] = name.split(':');
  if (kind === 'Smile') return <Geo.Smile key={i} d={Geo.SMILE[key]} />;
  if (kind === 'Brows') return <Geo.Brows key={i} d={Geo.BROWS[key]} />;
  const Part = Geo[kind];
  if (!Part) throw new Error(`CatalystMascot: unknown part "${name}"`);
  return <Part key={i} />;
}

// Interpolate a motion's keyframes over a progress value.
function interpolateMotion(progress, motion) {
  const inputRange = motion.keyframes.map(([t]) => t);
  const outputRange = motion.keyframes.map(([, v]) => v);
  return progress.interpolate({ inputRange, outputRange });
}

// Build the transform list for one layer from its motions. Rotations and
// scales wrap in translate-to-pivot / translate-back so they turn about the
// sheet's pivot rather than the canvas centre.
function transformsFor(motionKeys, values, k) {
  const out = [];
  let opacity = null;
  for (const key of motionKeys) {
    const m = MOTION[key];
    const v = values[key];
    if (!v) continue;
    const anim = interpolateMotion(v, m);
    if (m.prop === 'opacity') {
      opacity = anim;
      continue;
    }
    if (m.prop === 'translateX' || m.prop === 'translateY') {
      out.push({ [m.prop]: Animated.multiply(anim, k) });
      continue;
    }
    // rotate / scale / scaleY about a pivot
    const px = ((m.pivot ? m.pivot.x : CW / 2) - CW / 2) * k;
    const py = ((m.pivot ? m.pivot.y : CH / 2) - CH / 2) * k;
    out.push({ translateX: px }, { translateY: py });
    out.push({ [m.prop]: anim });
    out.push({ translateX: -px }, { translateY: -py });
  }
  return { transform: out, opacity };
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => alive && setReduced(!!v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener
      ? AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => setReduced(!!v))
      : null;
    return () => {
      alive = false;
      if (sub && sub.remove) sub.remove();
    };
  }, []);
  return reduced;
}

function useForegrounded() {
  const [fg, setFg] = useState(!AppState.currentState || AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener
      ? AppState.addEventListener('change', (s) => setFg(s === 'active'))
      : null;
    return () => sub && sub.remove && sub.remove();
  }, []);
  return fg;
}

export function CatalystMascot({
  state,
  size = 120,
  active = true,
  loop,
  mirrored = false,
  accessibilityLabel,
  onAnimationComplete,
  testID = 'catalyst-mascot',
  style,
}) {
  const config = STATES[state];
  // An invalid state is a programming error, not a silent blank — and it
  // must never render some other state's artwork.
  if (!config) throw new Error(`CatalystMascot: unknown state "${state}"`);

  const k = size / CW;
  const height = size * (CH / CW);
  const reducedMotion = useReducedMotion();
  const foregrounded = useForegrounded();
  const animate = shouldAnimate({ active, appState: foregrounded ? 'active' : 'background', reducedMotion });

  // One progress value per motion used by this state, owned by this
  // instance. Re-created when the state changes so old loops cannot leak.
  const motionKeys = useMemo(() => {
    const keys = new Set();
    const walk = (layers) => layers.forEach((l) => {
      (l.motions || []).forEach((m) => keys.add(m));
      if (l.sublayers) walk(l.sublayers);
    });
    walk(config.layers);
    return [...keys];
  }, [config]);

  const values = useMemo(
    () => Object.fromEntries(motionKeys.map((key) => [key, new Animated.Value(0)])),
    [motionKeys]
  );

  const running = useRef([]);
  const completeRef = useRef(onAnimationComplete);
  completeRef.current = onAnimationComplete;

  useEffect(() => {
    // Stop whatever the previous state left running and reset to frame 0.
    running.current.forEach((a) => a.stop && a.stop());
    running.current = [];
    motionKeys.forEach((key) => values[key].setValue(0));
    if (!animate) return undefined;

    motionKeys.forEach((key) => {
      const m = MOTION[key];
      const plays = loop === true ? 'loop' : loop === false ? 1 : m.plays;
      const cycle = Animated.timing(values[key], {
        toValue: 1,
        duration: m.duration,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      });
      const withDelay = m.delay ? Animated.sequence([Animated.delay(m.delay), cycle]) : cycle;
      const reset = Animated.timing(values[key], { toValue: 0, duration: 0, useNativeDriver: true });
      const once = Animated.sequence([withDelay, reset]);
      const anim = plays === 'loop' ? Animated.loop(once) : Animated.loop(once, { iterations: plays });
      running.current.push(anim);
      anim.start(({ finished }) => {
        // The state's designated motion reports completion, once, when it
        // actually finished (not when it was stopped by cleanup).
        if (finished && key === config.complete && completeRef.current) completeRef.current();
      });
    });

    return () => {
      running.current.forEach((a) => a.stop && a.stop());
      running.current = [];
    };
  }, [animate, config, loop, motionKeys, values]);

  const renderLayer = (layer, depth = 0) => {
    const { transform, opacity } = transformsFor(layer.motions || [], values, k);
    const styleT = [
      { position: 'absolute', left: 0, top: 0, width: size, height },
      transform.length ? { transform } : null,
      opacity ? { opacity } : null,
    ];
    return (
      <Animated.View key={layer.id} testID={layer.testID} style={styleT} pointerEvents="none">
        {layer.parts && layer.parts.length ? (
          <Svg width={size} height={height} viewBox={Geo.VIEWBOX}>
            {layer.parts.map(renderPart)}
          </Svg>
        ) : null}
        {layer.sublayers ? layer.sublayers.map((sl) => renderLayer(sl, depth + 1)) : null}
      </Animated.View>
    );
  };

  const decorative = !accessibilityLabel;
  return (
    <View
      testID={testID}
      accessible={!decorative}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'yes'}
      pointerEvents="none"
      style={[{ width: size, height, transform: mirrored ? [{ scaleX: -1 }] : undefined }, style]}
    >
      <Svg width={size} height={height} viewBox={Geo.VIEWBOX} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Geo.GroundShadow />
      </Svg>
      {config.layers.map((l) => renderLayer(l))}
    </View>
  );
}
